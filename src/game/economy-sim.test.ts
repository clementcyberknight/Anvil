import { describe, expect, test } from 'bun:test';

import {
  buildItemsMap,
  buildMiningDepths,
  buildRaidTiers,
  computeMiningEvPerHour,
  computeRaidEvPerHour,
  type EconomyTier,
  MAYOR_TAX_DEFAULT,
  occupationNetPerHour,
  type PricingItemId,
  RAID_UNVAULTED_LOOT_PCT,
  RAID_WAR_ATTRITION_SINK,
  STARTING_CAPITAL_FC,
} from '../../config/economy-model';
import {
  ECONOMY_MINING_DEPTHS,
  ECONOMY_OCCUPATIONS,
  ECONOMY_PRICING_ITEMS,
  ECONOMY_RAID_TIERS,
} from '../../config/economy-pricing';
import { runEconomySimulation, SeededRng } from './economy-sim';

describe('Anvil Quantitative Economy & Anti-Exploit Suite', () => {
  test('1. No NPC round-trip arbitrage (bid < ask with >= 25% spread)', () => {
    for (let i = 0; i < ECONOMY_PRICING_ITEMS.length; i += 1) {
      const item = ECONOMY_PRICING_ITEMS[i];

      expect(item.npcSellPrice).toBeLessThan(item.npcBuyPrice);

      const spread = 1 - item.npcSellPrice / item.npcBuyPrice;

      expect(spread).toBeGreaterThanOrEqual(0.25);
    }
  });

  test('2. No single-hop crafted ingredient arbitrage', () => {
    const items = buildItemsMap();

    for (let i = 0; i < ECONOMY_PRICING_ITEMS.length; i += 1) {
      const item = ECONOMY_PRICING_ITEMS[i];

      if (item.recipe.length === 0) {
        continue;
      }

      let ingredientBuyTotal = 0;

      for (let j = 0; j < item.recipe.length; j += 1) {
        const input = item.recipe[j];
        const dep = items.get(input.itemId);

        expect(dep).toBeDefined();

        if (dep !== undefined) {
          ingredientBuyTotal += dep.npcBuyPrice * input.qty;
        }
      }

      expect(item.npcSellPrice).toBeLessThanOrEqual(ingredientBuyTotal);
    }
  });

  test('3. Multi-hop recursive raw ingredient craft arbitrage is impossible', () => {
    const items = buildItemsMap();

    const rawBuyCost = (id: PricingItemId): number => {
      const spec = items.get(id);

      if (spec === undefined) {
        throw new Error(`Missing item: ${id}`);
      }

      if (spec.recipe.length === 0) {
        return spec.npcBuyPrice;
      }

      let sum = 0;

      for (let i = 0; i < spec.recipe.length; i += 1) {
        const input = spec.recipe[i];

        sum += rawBuyCost(input.itemId) * input.qty;
      }

      return sum;
    };

    for (let i = 0; i < ECONOMY_PRICING_ITEMS.length; i += 1) {
      const item = ECONOMY_PRICING_ITEMS[i];

      if (item.recipe.length === 0) {
        continue;
      }

      const baseCost = rawBuyCost(item.id);

      expect(item.npcSellPrice).toBeLessThanOrEqual(baseCost);
    }
  });

  test('4. All Winter-subsidizable essentials are local-subsidy bound', () => {
    const items = buildItemsMap();

    const essentials: readonly PricingItemId[] = [
      'lake_trout',
      'snow_turnip',
      'firewood',
      'fish_stew',
      'artisan_bread',
      'warmth_tea',
    ];

    for (let i = 0; i < essentials.length; i += 1) {
      const spec = items.get(essentials[i]);

      expect(spec).toBeDefined();
      expect(spec?.localSubsidyBound).toBe(true);
    }
  });

  test('5. Rival town raid collusion cannot print currency', () => {
    const raids = buildRaidTiers();

    for (let i = 0; i < raids.length; i += 1) {
      const r = raids[i];
      const seized = r.targetUnvaultedPoolFc * RAID_UNVAULTED_LOOT_PCT;
      const attrition = seized * RAID_WAR_ATTRITION_SINK;

      const attackerNet =
        seized - attrition - r.armyGearCostFc - r.rationsCostSummerFc;

      const defenderNet = -seized;
      const combinedDelta = attackerNet + defenderNet;

      expect(combinedDelta).toBeLessThan(0);
    }
  });

  test('6. Mining drop probabilities sum to exactly 1.0 at every depth', () => {
    const depths = buildMiningDepths();

    for (let i = 0; i < depths.length; i += 1) {
      const depth = depths[i];
      let totalProb = 0;

      for (let j = 0; j < depth.drops.length; j += 1) {
        totalProb += depth.drops[j].probability;
      }

      expect(Math.abs(totalProb - 1)).toBeLessThan(1e-9);
    }
  });

  test('7. Occupation vs. Mining vs. Raid EV/hour parity within [0.85x, 1.20x]', () => {
    const items = buildItemsMap();
    const tiers: readonly EconomyTier[] = [1, 2, 3, 4];

    expect(ECONOMY_OCCUPATIONS.length).toBeGreaterThanOrEqual(17);

    for (let i = 0; i < tiers.length; i += 1) {
      const tier = tiers[i];
      const baseOccEv = occupationNetPerHour(tier, 0.12, MAYOR_TAX_DEFAULT);

      const depth = ECONOMY_MINING_DEPTHS.find((d) => d.tier === tier);

      expect(depth).toBeDefined();

      if (depth !== undefined) {
        const mineMetrics = computeMiningEvPerHour(depth, items);
        const mineRatio = mineMetrics.netPostTaxFcPerHour / baseOccEv;

        expect(mineRatio).toBeGreaterThanOrEqual(0.85);
        expect(mineRatio).toBeLessThanOrEqual(1.2);
      }

      const raid = ECONOMY_RAID_TIERS.find((r) => r.tier === tier);

      expect(raid).toBeDefined();

      if (raid !== undefined) {
        const mayorEv = computeRaidEvPerHour(raid, 'SUMMER', true);
        const privEv = computeRaidEvPerHour(raid, 'SUMMER', false);
        const mayorRatio = mayorEv.evPerHour / baseOccEv;
        const privRatio = privEv.evPerHour / baseOccEv;

        expect(mayorRatio).toBeGreaterThanOrEqual(0.85);
        expect(mayorRatio).toBeLessThanOrEqual(1.2);
        expect(privRatio).toBeGreaterThanOrEqual(0.85);
        expect(privRatio).toBeLessThanOrEqual(1.2);
      }
    }
  });

  test('8. Zero soft-lock under worst-case 5th-percentile Act I Winter RNG', () => {
    const items = buildItemsMap();
    const depth1 = buildMiningDepths()[0];
    const rng = new SeededRng(1337);
    const trout = items.get('lake_trout');
    const stew = items.get('fish_stew');
    const wood = items.get('firewood');

    expect(trout).toBeDefined();
    expect(stew).toBeDefined();
    expect(wood).toBeDefined();

    if (trout === undefined || stew === undefined || wood === undefined) {
      return;
    }

    const minBalances: number[] = [];

    for (let p = 0; p < 500; p += 1) {
      let coins = STARTING_CAPITAL_FC;
      let minC = coins;

      for (let day = 0; day < 3; day += 1) {
        let earned = 0;
        const attempts = Math.floor(depth1.attemptsPerHour / 2);

        for (let a = 0; a < attempts; a += 1) {
          const roll = rng.next();
          let acc = 0;

          for (let d = 0; d < depth1.drops.length; d += 1) {
            const drop = depth1.drops[d];

            acc += drop.probability;

            if (roll <= acc) {
              const dropSpec = items.get(drop.itemId);

              if (dropSpec !== undefined) {
                earned += dropSpec.npcSellPrice;
              }

              break;
            }
          }
        }

        // Deterministic 15-min ice-fishing fallback (2 Lake Trout sold at instant bid)
        earned += 2 * trout.npcSellPrice;

        const upkeep = depth1.upkeepFcPerHour * 0.5;
        const survival = stew.refPrice + wood.refPrice;

        coins = coins + earned - upkeep - survival * 0.5;

        if (coins < minC) {
          minC = coins;
        }
      }

      minBalances.push(minC);
    }

    minBalances.sort((a, b) => a - b);

    const p5Min = minBalances[Math.floor(minBalances.length * 0.05)];

    expect(p5Min).toBeGreaterThan(40);
  });

  test('9. Adversarial stress test: 50% Hoarder shock avoids deflationary death spiral', () => {
    const res = runEconomySimulation({
      nPlayers: 500,
      days: 180,
      seed: 99,
      snapshotDays: [1, 7, 30, 90, 180],
      archetypeMix: {
        casual: 0.25,
        grinder: 0.1,
        trader: 0.1,
        hoarder: 0.5,
        raider: 0.05,
      },
    });

    const day180 = res.snapshots.get(180);

    expect(day180).toBeDefined();

    if (day180 !== undefined) {
      expect(day180.cpiIndex).toBeGreaterThanOrEqual(0.88);
      expect(day180.avgCoinsByArchetype.casual).toBeGreaterThan(
        STARTING_CAPITAL_FC * 2
      );
    }
  });

  test('10. Adversarial stress test: 60% Hardcore Grinder surge stays inside inflation bounds', () => {
    const res = runEconomySimulation({
      nPlayers: 500,
      days: 180,
      seed: 101,
      snapshotDays: [1, 7, 30, 90, 180],
      archetypeMix: {
        casual: 0.15,
        grinder: 0.6,
        trader: 0.1,
        hoarder: 0.05,
        raider: 0.1,
      },
    });

    expect(res.day30ToDay90MonthlyInflationPct).toBeLessThanOrEqual(4.5);
    expect(res.avgFaucetToSinkDay30To365).toBeLessThanOrEqual(1.08);
  });

  test('11. Multi-scale 365-day simulation (1x, 10x, 100x) equilibrium & scale invariance', () => {
    const res1x = runEconomySimulation({ nPlayers: 100, days: 365, seed: 42 });
    const res10x = runEconomySimulation({ nPlayers: 1_000, days: 365, seed: 43 });
    const res100x = runEconomySimulation({ nPlayers: 10_000, days: 365, seed: 44 });

    const runs = [res1x, res10x, res100x];

    for (let i = 0; i < runs.length; i += 1) {
      const res = runs[i];

      expect(res.day30ToDay90MonthlyInflationPct).toBeGreaterThanOrEqual(-1.5);
      expect(res.day30ToDay90MonthlyInflationPct).toBeLessThanOrEqual(4.5);
      expect(res.day90ToDay365MonthlyInflationPct).toBeGreaterThanOrEqual(-1.0);
      expect(res.day90ToDay365MonthlyInflationPct).toBeLessThanOrEqual(3.5);
      expect(res.avgFaucetToSinkDay30To365).toBeGreaterThanOrEqual(0.95);
      expect(res.avgFaucetToSinkDay30To365).toBeLessThanOrEqual(1.06);
      expect(res.finalGini).toBeGreaterThanOrEqual(0.12);
      expect(res.finalGini).toBeLessThanOrEqual(0.58);
      expect(res.worst5PctSurvivalCoinsDay7).toBeGreaterThanOrEqual(50);
      expect(res.medianHoursToMidgame).toBeGreaterThanOrEqual(12);
      expect(res.medianHoursToMidgame).toBeLessThanOrEqual(45);
      expect(res.medianHoursToEndgame).toBeGreaterThanOrEqual(70);
      expect(res.medianHoursToEndgame).toBeLessThanOrEqual(190);
    }

    const snap1x = res1x.snapshots.get(365);
    const snap10x = res10x.snapshots.get(365);
    const snap100x = res100x.snapshots.get(365);

    expect(snap1x).toBeDefined();
    expect(snap10x).toBeDefined();
    expect(snap100x).toBeDefined();

    if (
      snap1x !== undefined &&
      snap10x !== undefined &&
      snap100x !== undefined
    ) {
      const scaled = [
        { snap: snap10x, res: res10x },
        { snap: snap100x, res: res100x },
      ];

      for (let i = 0; i < scaled.length; i += 1) {
        const { snap, res } = scaled[i];

        const mDiff =
          Math.abs(snap.perCapitaMoney - snap1x.perCapitaMoney) /
          snap1x.perCapitaMoney;

        const cpiDiff =
          Math.abs(snap.cpiIndex - snap1x.cpiIndex) / snap1x.cpiIndex;

        const fsDiff =
          Math.abs(res.avgFaucetToSinkDay30To365 - res1x.avgFaucetToSinkDay30To365) /
          res1x.avgFaucetToSinkDay30To365;

        expect(mDiff).toBeLessThanOrEqual(0.06);
        expect(cpiDiff).toBeLessThanOrEqual(0.03);
        expect(fsDiff).toBeLessThanOrEqual(0.03);
      }
    }
  });
});
