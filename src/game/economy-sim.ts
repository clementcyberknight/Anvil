/**
 * Anvil Multi-Scale Agent-Based Macroeconomic Simulator (Phase 3)
 * ---------------------------------------------------------------
 * Simulates 1x (100), 10x (1,000), and 100x (10,000) player populations over
 * Day 1, Day 30, Day 90, and Day 365 across 5 simultaneous player archetypes:
 *   1. Casual Player        (45%, 0.55 hrs/day, deterministic occupation)
 *   2. Hardcore Grinder     (20%, 3.10 hrs/day, optimized mining + crafting)
 *   3. Market Arbitrageur   (15%, 1.60 hrs/day, attacks spreads & seasonal swings)
 *   4. Hoarder              (12%, 1.05 hrs/day, minimizes spending, drags velocity)
 *   5. Warlord / Raider     ( 8%, 2.00 hrs/day, Clash-style rival town raids)
 *
 * Includes a scale-invariant PI macroeconomic stabilizer operating strictly on
 * per-capita ratios (m = M/N, F/S ratio) so 1x, 10x, and 100x scales preserve
 * identical inflation, wealth distribution, and faucet/sink equilibrium.
 */

import {
  buildItemsMap,
  buildMiningDepths,
  buildRaidTiers,
  computeDailyWealthTax,
  computeMiningEvPerHour,
  type EconomyTier,
  MARKET_FEE_DEFAULT,
  MARKET_FEE_MAX,
  MARKET_FEE_MIN,
  MAYOR_TAX_DEFAULT,
  MAYOR_TAX_MAX,
  MAYOR_TAX_MIN,
  occupationGrossPerHour,
  RAID_UNVAULTED_LOOT_PCT,
  RAID_WAR_ATTRITION_SINK,
  type RaidTierSpec,
  SEASON_DURATION_DAYS,
  type SimSeason,
  STARTING_CAPITAL_FC,
} from '../../config/economy-model';

export type ArchetypeKey = 'casual' | 'grinder' | 'trader' | 'hoarder' | 'raider';

export interface ArchetypeMix {
  readonly casual: number;
  readonly grinder: number;
  readonly trader: number;
  readonly hoarder: number;
  readonly raider: number;
}

export interface ArchetypeAverages {
  readonly casual: number;
  readonly grinder: number;
  readonly trader: number;
  readonly hoarder: number;
  readonly raider: number;
}

interface SimAgent {
  readonly archetype: ArchetypeKey;
  tier: EconomyTier;
  skillLevel: number;
  coins: number;
  cumulativeEarned: number;
  hoursPlayed: number;
  readonly dailyHours: number;
  readonly hoardRatio: number;
  shieldUntilDay: number;
  midgameDay: number;
  endgameDay: number;
}

export interface DaySnapshot {
  readonly day: number;
  readonly season: SimSeason;
  readonly population: number;
  readonly totalMoneySupply: number;
  readonly perCapitaMoney: number;
  readonly cpiIndex: number;
  readonly monthlyInflationPct: number;
  readonly faucetToSinkRatio: number;
  readonly giniCoefficient: number;
  readonly moneyVelocity: number;
  readonly mayorTaxRate: number;
  readonly marketFeeRate: number;
  readonly avgCoinsByArchetype: ArchetypeAverages;
}

export interface SimulationOptions {
  readonly nPlayers?: number;
  readonly days?: number;
  readonly seed?: number;
  readonly snapshotDays?: readonly number[];
  readonly archetypeMix?: ArchetypeMix;
}

export interface SimulationResult {
  readonly population: number;
  readonly days: number;
  readonly snapshots: ReadonlyMap<number, DaySnapshot>;
  readonly day30ToDay90MonthlyInflationPct: number;
  readonly day90ToDay365MonthlyInflationPct: number;
  readonly avgFaucetToSinkDay30To365: number;
  readonly finalGini: number;
  readonly medianHoursToMidgame: number;
  readonly medianHoursToEndgame: number;
  readonly arbitrageExploitProfitTotal: number;
  readonly worst5PctSurvivalCoinsDay7: number;
}

const DEFAULT_ARCHETYPE_MIX: ArchetypeMix = {
  casual: 0.45,
  grinder: 0.2,
  trader: 0.15,
  hoarder: 0.12,
  raider: 0.08,
};

const DEFAULT_SNAPSHOT_DAYS: readonly number[] = [1, 7, 30, 90, 180, 365];

const MIDGAME_CUMULATIVE_FC = 4_000;
const ENDGAME_CUMULATIVE_FC = 35_000;

export class SeededRng {
  private state: number;
  private spareGaussian: number | null = null;

  constructor(seed: number) {
    this.state = seed >>> 0;

    if (this.state === 0) {
      this.state = 0x9e3779b9;
    }
  }

  /** Deterministic float in [0, 1) via Mulberry32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  }

  nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** Deterministic Gaussian via Box-Muller transform. */
  nextGaussian(mean: number, stdDev: number): number {
    if (this.spareGaussian !== null) {
      const val = this.spareGaussian;

      this.spareGaussian = null;

      return mean + val * stdDev;
    }

    let u1 = this.next();

    while (u1 <= 1e-12) {
      u1 = this.next();
    }

    const u2 = this.next();
    const mag = Math.sqrt(-2 * Math.log(u1));
    const z0 = mag * Math.cos(2 * Math.PI * u2);
    const z1 = mag * Math.sin(2 * Math.PI * u2);

    this.spareGaussian = z1;

    return mean + z0 * stdDev;
  }
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

/**
 * Exact Gini coefficient in [0, 1] in O(n log n).
 */
export function computeGini(values: readonly number[]): number {
  const n = values.length;

  if (n === 0) {
    return 0;
  }

  const sorted: number[] = [];

  for (let i = 0; i < n; i += 1) {
    sorted.push(Math.max(0, values[i]));
  }

  sorted.sort((a, b) => a - b);

  let total = 0;

  for (let i = 0; i < n; i += 1) {
    total += sorted[i];
  }

  if (total <= 1e-9) {
    return 0;
  }

  let weightedSum = 0;

  for (let i = 0; i < n; i += 1) {
    weightedSum += (i + 1) * sorted[i];
  }

  return (2 * weightedSum) / (n * total) - (n + 1) / n;
}

/**
 * Smooth bounded equilibrium liquidity target m*(t) per active player,
 * aligned with player tier-progression half-life (26 days).
 */
export function targetPerCapitaMoney(day: number): number {
  return STARTING_CAPITAL_FC + 2_820 * (1 - Math.exp(-day / 26));
}

function spawnPopulation(
  nPlayers: number,
  seed: number,
  archetypeMix: ArchetypeMix
): SimAgent[] {
  const rng = new SeededRng(seed);
  const agents: SimAgent[] = [];

  const casualCount = Math.round(nPlayers * archetypeMix.casual);
  const grinderCount = Math.round(nPlayers * archetypeMix.grinder);
  const traderCount = Math.round(nPlayers * archetypeMix.trader);
  const hoarderCount = Math.round(nPlayers * archetypeMix.hoarder);

  const raiderCount = Math.max(
    0,
    nPlayers - (casualCount + grinderCount + traderCount + hoarderCount)
  );

  const groups: readonly {
    readonly archetype: ArchetypeKey;
    readonly count: number;
    readonly meanHours: number;
    readonly hoardRatio: number;
  }[] = [
    { archetype: 'casual', count: casualCount, meanHours: 0.55, hoardRatio: 0.3 },
    { archetype: 'grinder', count: grinderCount, meanHours: 3.1, hoardRatio: 0.22 },
    { archetype: 'trader', count: traderCount, meanHours: 1.6, hoardRatio: 0.4 },
    { archetype: 'hoarder', count: hoarderCount, meanHours: 1.05, hoardRatio: 0.9 },
    { archetype: 'raider', count: raiderCount, meanHours: 2.0, hoardRatio: 0.25 },
  ];

  for (let g = 0; g < groups.length; g += 1) {
    const group = groups[g];

    for (let i = 0; i < group.count; i += 1) {
      const h = Math.max(
        0.25,
        rng.nextGaussian(group.meanHours, group.meanHours * 0.18)
      );

      agents.push({
        archetype: group.archetype,
        tier: 1,
        skillLevel: 1,
        coins: STARTING_CAPITAL_FC,
        cumulativeEarned: STARTING_CAPITAL_FC,
        hoursPlayed: 0,
        dailyHours: h,
        hoardRatio: group.hoardRatio,
        shieldUntilDay: 0,
        midgameDay: -1,
        endgameDay: -1,
      });
    }
  }

  return agents;
}

function resolveTier(hoursPlayed: number): EconomyTier {
  if (hoursPlayed >= 85) {
    return 4;
  }

  if (hoursPlayed >= 32) {
    return 3;
  }

  if (hoursPlayed >= 9) {
    return 2;
  }

  return 1;
}

export function runEconomySimulation(
  options: SimulationOptions = {}
): SimulationResult {
  const nPlayers = options.nPlayers ?? 100;
  const days = options.days ?? 365;
  const seed = options.seed ?? 42;
  const snapshotDays = new Set<number>(options.snapshotDays ?? DEFAULT_SNAPSHOT_DAYS);
  const archetypeMix = options.archetypeMix ?? DEFAULT_ARCHETYPE_MIX;

  const rng = new SeededRng(seed);
  const items = buildItemsMap();
  const depths = buildMiningDepths();
  const raids = buildRaidTiers();
  const agents = spawnPopulation(nPlayers, seed, archetypeMix);

  const miningGrossByTier = new Map<EconomyTier, number>();
  const miningUpkeepByTier = new Map<EconomyTier, number>();

  for (let i = 0; i < depths.length; i += 1) {
    const depth = depths[i];
    const metrics = computeMiningEvPerHour(depth, items);

    miningGrossByTier.set(depth.tier, metrics.grossEvFcPerHour);
    miningUpkeepByTier.set(depth.tier, depth.upkeepFcPerHour);
  }

  const raidByTier = new Map<EconomyTier, RaidTierSpec>();

  for (let i = 0; i < raids.length; i += 1) {
    raidByTier.set(raids[i].tier, raids[i]);
  }

  let mayorTax = MAYOR_TAX_DEFAULT;
  let marketFee = MARKET_FEE_DEFAULT;
  let cpi = 1.0;

  const cpiHistory = new Map<number, number>();

  cpiHistory.set(0, 1.0);

  const snapshots = new Map<number, DaySnapshot>();
  const faucetSinkRatios: number[] = [];
  let arbitrageProfitTotal = 0;
  const day7CasualCoins: number[] = [];

  for (let day = 1; day <= days; day += 1) {
    const cycleIdx = Math.floor((day - 1) / SEASON_DURATION_DAYS);
    const season: SimSeason = cycleIdx % 2 === 0 ? 'WINTER' : 'SUMMER';
    const isWinter = season === 'WINTER';

    let dayFaucets = 0;
    let daySinks = 0;
    let dayTxVolume = 0;
    const n = agents.length;

    let totalCoinsStart = 0;

    for (let i = 0; i < n; i += 1) {
      totalCoinsStart += agents[i].coins;
    }

    const currentMPerCapita = totalCoinsStart / n;
    const targetM = targetPerCapitaMoney(day);
    const liquidityGap = (currentMPerCapita - targetM) / Math.max(targetM, 1);

    mayorTax = Math.max(
      MAYOR_TAX_MIN,
      Math.min(MAYOR_TAX_MAX, MAYOR_TAX_DEFAULT + liquidityGap * 0.08)
    );
    marketFee = Math.max(
      MARKET_FEE_MIN,
      Math.min(MARKET_FEE_MAX, MARKET_FEE_DEFAULT + liquidityGap * 0.07)
    );

    const sinkBoost = Math.max(0.75, Math.min(1.55, 1 + liquidityGap * 0.55));
    const faucetMod = Math.max(0.86, Math.min(1.12, 1 - liquidityGap * 0.14));

    for (let idx = 0; idx < n; idx += 1) {
      const ag = agents[idx];
      const h = ag.dailyHours;

      ag.hoursPlayed += h;
      ag.skillLevel = Math.min(10, 1 + ag.hoursPlayed / 18);
      ag.tier = resolveTier(ag.hoursPlayed);

      const skillInt = Math.floor(ag.skillLevel);
      let grossEarned = 0;
      let directUpkeep = 0;

      if (ag.archetype === 'casual') {
        grossEarned =
          h * occupationGrossPerHour(ag.tier, skillInt) * 0.95 * faucetMod;
        directUpkeep = grossEarned * 0.11;
      } else if (ag.archetype === 'grinder') {
        const mineH = h * 0.65;
        const craftH = h * 0.35;
        const rngMult = Math.max(0.45, Math.min(1.65, rng.nextGaussian(1, 0.22)));
        const tierMineGross = miningGrossByTier.get(ag.tier) ?? 0;
        const tierMineUpkeep = miningUpkeepByTier.get(ag.tier) ?? 0;
        const mineGross = mineH * tierMineGross * rngMult * faucetMod;
        const mineUpkeep = mineH * tierMineUpkeep;

        const craftGross =
          craftH * occupationGrossPerHour(ag.tier, skillInt) * faucetMod;

        const craftUpkeep = craftGross * 0.13;

        grossEarned = mineGross + craftGross;
        directUpkeep = mineUpkeep + craftUpkeep;
      } else if (ag.archetype === 'trader') {
        grossEarned =
          h * occupationGrossPerHour(ag.tier, skillInt) * 0.85 * faucetMod;
        directUpkeep = grossEarned * 0.1;

        const tradeCapital = Math.min(ag.coins * 0.3, 400 * ag.tier);

        if (tradeCapital > 20) {
          dayTxVolume += tradeCapital;

          const grossEdge = isWinter ? 0.13 : 0.05;
          const feeDrag = marketFee + mayorTax * 0.5;
          const netArb = tradeCapital * (grossEdge - feeDrag);
          const feeBurned = tradeCapital * feeDrag;

          daySinks += feeBurned;

          if (netArb > 0) {
            ag.coins += netArb;
            ag.cumulativeEarned += netArb;
            arbitrageProfitTotal += netArb;
          } else {
            ag.coins = Math.max(0, ag.coins + netArb);
          }
        }
      } else if (ag.archetype === 'hoarder') {
        grossEarned =
          h * occupationGrossPerHour(ag.tier, skillInt) * 0.9 * faucetMod;
        directUpkeep = grossEarned * 0.1;
      } else {
        const laborH = h * 0.5;
        const raidH = h * 0.5;

        grossEarned =
          laborH * occupationGrossPerHour(ag.tier, skillInt) * faucetMod;
        directUpkeep = grossEarned * 0.11;

        const spec = raidByTier.get(ag.tier);

        if (spec !== undefined) {
          const nRaids = Math.max(1, Math.round(raidH * spec.raidsPerHour));
          const seasonRationMult = isWinter ? 1.65 : 1.0;

          for (let r = 0; r < nRaids; r += 1) {
            let victimIdx = rng.nextInt(n);

            if (victimIdx === idx) {
              victimIdx = (idx + 1) % n;
            }

            const victim = agents[victimIdx];

            const raidCost =
              spec.armyGearCostFc +
              spec.rationsCostSummerFc * seasonRationMult;

            if (ag.coins < raidCost + 20) {
              break;
            }

            ag.coins -= raidCost;
            daySinks += raidCost;
            dayTxVolume += raidCost;

            if (rng.next() < spec.baseWinProb && victim.shieldUntilDay < day) {
              const seized = victim.coins * RAID_UNVAULTED_LOOT_PCT;
              const attritionBurned = seized * RAID_WAR_ATTRITION_SINK;
              const lootGained = seized - attritionBurned;

              victim.coins -= seized;
              victim.shieldUntilDay = day;
              ag.coins += lootGained;
              ag.cumulativeEarned += lootGained;
              daySinks += attritionBurned;
              dayTxVolume += seized;
            } else {
              const lossCost = Math.min(ag.coins, spec.lossPenaltyFc);

              ag.coins -= lossCost;
              daySinks += lossCost;
            }
          }
        }
      }

      const taxPaid = grossEarned * mayorTax;
      const taxBurned = taxPaid * 0.78;
      const netEarned = Math.max(0, grossEarned - directUpkeep - taxPaid);

      ag.coins += netEarned;
      ag.cumulativeEarned += netEarned;
      dayFaucets += Math.max(0, grossEarned - (taxPaid - taxBurned));
      daySinks += directUpkeep + taxBurned;
      dayTxVolume += grossEarned;

      // Survival consumables & Winter heating fuel burn
      const baseLivingCost =
        (isWinter ? 18 : 10) * (1 + 0.35 * (ag.tier - 1));

      const livingSpend = Math.min(ag.coins * 0.35, baseLivingCost);

      ag.coins -= livingSpend;
      daySinks += livingSpend;
      dayTxVolume += livingSpend;

      // Voluntary upgrades, defenses, cottages & Grand Yeti Monument sinks
      const discretionaryBudget = Math.max(0, ag.coins - STARTING_CAPITAL_FC * 0.9);
      const tierSinkMult = 1 + 0.22 * (ag.tier - 1);

      const investRate =
        (1 - ag.hoardRatio) * 0.115 * tierSinkMult * sinkBoost;

      const upgradeSpend = discretionaryBudget * Math.min(0.45, investRate);

      ag.coins -= upgradeSpend;
      daySinks += upgradeSpend;
      dayTxVolume += upgradeSpend;

      // Progressive wealth/property upkeep tax (anti-hoarder sink)
      const rawWealthTax = computeDailyWealthTax(ag.coins) * sinkBoost;
      const wealthTax = Math.min(ag.coins, rawWealthTax);

      ag.coins -= wealthTax;
      daySinks += wealthTax;

      if (ag.midgameDay < 0 && ag.cumulativeEarned >= MIDGAME_CUMULATIVE_FC) {
        ag.midgameDay = day;
      }

      if (ag.endgameDay < 0 && ag.cumulativeEarned >= ENDGAME_CUMULATIVE_FC) {
        ag.endgameDay = day;
      }

      if (day === 7 && ag.archetype === 'casual') {
        day7CasualCoins.push(ag.coins);
      }
    }

    let totalM = 0;

    for (let i = 0; i < n; i += 1) {
      totalM += agents[i].coins;
    }

    const perCapitaM = totalM / n;
    const fsRatio = dayFaucets / Math.max(daySinks, 1e-6);
    const velocity = dayTxVolume / Math.max(totalM, 1);

    const seasonalCpiPulse = isWinter ? 1.015 : 0.992;
    const liquidityRatio = perCapitaM / Math.max(targetM, 1);
    const cpiTarget = liquidityRatio ** 0.35 * seasonalCpiPulse;

    cpi = cpi * 0.9 + cpiTarget * 0.1;
    cpiHistory.set(day, cpi);

    if (day >= 30) {
      faucetSinkRatios.push(fsRatio);
    }

    if (snapshotDays.has(day)) {
      const prevDay = Math.max(0, day - 30);
      const prevCpi = cpiHistory.get(prevDay) ?? 1.0;
      const monthlyInflPct = (cpi / prevCpi - 1) * 100;

      let casualSum = 0;
      let casualN = 0;
      let grinderSum = 0;
      let grinderN = 0;
      let traderSum = 0;
      let traderN = 0;
      let hoarderSum = 0;
      let hoarderN = 0;
      let raiderSum = 0;
      let raiderN = 0;
      const allCoins: number[] = [];

      for (let i = 0; i < n; i += 1) {
        const a = agents[i];

        allCoins.push(a.coins);

        if (a.archetype === 'casual') {
          casualSum += a.coins;
          casualN += 1;
        } else if (a.archetype === 'grinder') {
          grinderSum += a.coins;
          grinderN += 1;
        } else if (a.archetype === 'trader') {
          traderSum += a.coins;
          traderN += 1;
        } else if (a.archetype === 'hoarder') {
          hoarderSum += a.coins;
          hoarderN += 1;
        } else {
          raiderSum += a.coins;
          raiderN += 1;
        }
      }

      snapshots.set(day, {
        day,
        season,
        population: n,
        totalMoneySupply: roundTo(totalM, 2),
        perCapitaMoney: roundTo(perCapitaM, 2),
        cpiIndex: roundTo(cpi, 4),
        monthlyInflationPct: roundTo(monthlyInflPct, 2),
        faucetToSinkRatio: roundTo(fsRatio, 3),
        giniCoefficient: roundTo(computeGini(allCoins), 3),
        moneyVelocity: roundTo(velocity, 3),
        mayorTaxRate: roundTo(mayorTax, 4),
        marketFeeRate: roundTo(marketFee, 4),
        avgCoinsByArchetype: {
          casual: casualN > 0 ? roundTo(casualSum / casualN, 2) : 0,
          grinder: grinderN > 0 ? roundTo(grinderSum / grinderN, 2) : 0,
          trader: traderN > 0 ? roundTo(traderSum / traderN, 2) : 0,
          hoarder: hoarderN > 0 ? roundTo(hoarderSum / hoarderN, 2) : 0,
          raider: raiderN > 0 ? roundTo(raiderSum / raiderN, 2) : 0,
        },
      });
    }
  }

  const cpi30 = cpiHistory.get(30) ?? 1.0;
  const cpi90 = cpiHistory.get(90) ?? cpi;
  const cpi365 = cpiHistory.get(365) ?? cpi;

  const mInfl30To90 =
    days >= 90 ? ((cpi90 / cpi30) ** (30 / 60) - 1) * 100 : 0;

  const mInfl90To365 =
    days >= 365 ? ((cpi365 / cpi90) ** (30 / 275) - 1) * 100 : 0;

  const midHours: number[] = [];
  const endHours: number[] = [];

  for (let i = 0; i < agents.length; i += 1) {
    const a = agents[i];

    if (a.midgameDay > 0) {
      midHours.push(a.midgameDay * a.dailyHours);
    }

    if (a.endgameDay > 0) {
      endHours.push(a.endgameDay * a.dailyHours);
    }
  }

  midHours.sort((a, b) => a - b);
  endHours.sort((a, b) => a - b);

  const medMid =
    midHours.length > 0
      ? roundTo(midHours[Math.floor(midHours.length / 2)], 1)
      : -1;

  const medEnd =
    endHours.length > 0
      ? roundTo(endHours[Math.floor(endHours.length / 2)], 1)
      : -1;

  day7CasualCoins.sort((a, b) => a - b);

  const p5Idx = Math.max(0, Math.floor(day7CasualCoins.length * 0.05));

  const worst5Pct =
    day7CasualCoins.length > 0 ? roundTo(day7CasualCoins[p5Idx], 2) : 0;

  let fsSum = 0;

  for (let i = 0; i < faucetSinkRatios.length; i += 1) {
    fsSum += faucetSinkRatios[i];
  }

  const finalSnap = snapshots.get(days);

  return {
    population: nPlayers,
    days,
    snapshots,
    day30ToDay90MonthlyInflationPct: roundTo(mInfl30To90, 2),
    day90ToDay365MonthlyInflationPct: roundTo(mInfl90To365, 2),
    avgFaucetToSinkDay30To365: roundTo(
      fsSum / Math.max(faucetSinkRatios.length, 1),
      3
    ),
    finalGini: finalSnap !== undefined ? finalSnap.giniCoefficient : 0,
    medianHoursToMidgame: medMid,
    medianHoursToEndgame: medEnd,
    arbitrageExploitProfitTotal: roundTo(arbitrageProfitTotal, 2),
    worst5PctSurvivalCoinsDay7: worst5Pct,
  };
}
