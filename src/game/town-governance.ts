import type { GameIconKey } from '@/game/icon-atlas';
import { TOWN_VILLAGERS } from '@/game/town-villagers';
import type { Season } from '@/game/types';
import {
  VILLAGER_ROLE_ROW,
  type VillagerRoleKey,
} from '@/game/villager-atlas';

export type OfficeHolder =
  | 'PLAYER'
  | 'AI_BARNABY'
  | 'AI_STERLING'
  | 'AI_VESPER';

export type WinterPolicy =
  | 'FULL_CUSHION'
  | 'TARGETED_ESSENTIALS'
  | 'MODERATE_RELIEF'
  | 'AUSTERITY';

export type ArmyUnitKey =
  | 'shieldguard'
  | 'axeman'
  | 'archer'
  | 'rogue'
  | 'ram'
  | 'mystic'
  | 'apothecary';

export interface ArmyUnitSpec {
  readonly key: ArmyUnitKey;
  readonly name: string;
  readonly roleSummary: string;
  readonly villagerRole: VillagerRoleKey;
  readonly roleRow: number;
  readonly iconKey: GameIconKey;
  readonly coinCost: number;
  readonly fishStewCost: number;
  readonly hp: number;
  readonly dps: number;
  readonly moveSpeed: number;
  readonly attackRange: number;
  readonly targetPriority: 'DEFENSE' | 'LOOT' | 'ANY' | 'ALLY_HEAL';
  readonly lootCarryMult: number;
}

export interface WarbandSlot {
  readonly unitKey: ArmyUnitKey;
  readonly count: number;
}

export interface WarBountyContract {
  readonly id: string;
  readonly targetTownId: string;
  readonly targetTownName: string;
  readonly rewardCoins: number;
  readonly approvalBonusPct: number;
  readonly completed: boolean;
}

export interface TownGovernanceState {
  readonly officeHolder: OfficeHolder;
  readonly taxRatePct: number; // 5..18
  readonly winterPolicy: WinterPolicy;
  readonly townTreasuryFc: number;
  readonly approvalPct: number; // 0..100
  readonly authorityRank: number;
  readonly raidsWon: number;
  readonly reliefDonations: number;
  readonly electionCount: number;
  readonly warband: readonly WarbandSlot[];
  readonly activeBounty: WarBountyContract;
}

export interface RaidCommandRules {
  readonly mode: 'OFFICIAL_MARSHAL' | 'PRIVATEER';
  readonly modeLabel: string;
  readonly maxArmyCount: number;
  readonly trainingDiscountPct: number;
  readonly playerLootSharePct: number;
  readonly treasuryTributePct: number;
}

export interface ElectionBallotResult {
  readonly winner: OfficeHolder;
  readonly playerVotes: number;
  readonly rivalVotes: number;
  readonly rivalCandidate: OfficeHolder;
  readonly playerWon: boolean;
  readonly headline: string;
  readonly sampleQuotes: readonly string[];
}

export const OFFICE_HOLDER_META: Record<
  OfficeHolder,
  { readonly name: string; readonly title: string; readonly roleRow: number }
> = {
  PLAYER: {
    name: 'Koda (You)',
    title: 'Elected Mayor & Town Marshal',
    roleRow: VILLAGER_ROLE_ROW.hero,
  },
  AI_BARNABY: {
    name: 'Mayor Barnaby',
    title: 'Pragmatic Bureaucrat (AI Mayor)',
    roleRow: VILLAGER_ROLE_ROW.mayor,
  },
  AI_STERLING: {
    name: 'Lord Sterling',
    title: 'Landlord Oligarch (AI Mayor)',
    roleRow: VILLAGER_ROLE_ROW.landlord,
  },
  AI_VESPER: {
    name: 'Elder Vesper',
    title: 'Frost Cult Sovereign (AI Mayor)',
    roleRow: VILLAGER_ROLE_ROW.cultist,
  },
};

export const ARMY_UNIT_SPECS: readonly ArmyUnitSpec[] = [
  {
    key: 'shieldguard',
    name: 'Shieldguard',
    roleSummary: 'Heavy Tank · Draws Watchtower fire',
    villagerRole: 'shieldguard',
    roleRow: VILLAGER_ROLE_ROW.shieldguard,
    iconKey: 'kiteShield',
    coinCost: 24,
    fishStewCost: 1,
    hp: 260,
    dps: 18,
    moveSpeed: 58,
    attackRange: 34,
    targetPriority: 'DEFENSE',
    lootCarryMult: 1,
  },
  {
    key: 'axeman',
    name: 'Battle-Axeman',
    roleSummary: 'Melee Bruiser · High building DPS',
    villagerRole: 'lumberjack',
    roleRow: VILLAGER_ROLE_ROW.lumberjack,
    iconKey: 'battleAxe',
    coinCost: 20,
    fishStewCost: 1,
    hp: 155,
    dps: 34,
    moveSpeed: 74,
    attackRange: 34,
    targetPriority: 'ANY',
    lootCarryMult: 1,
  },
  {
    key: 'archer',
    name: 'Ice-Archer',
    roleSummary: 'Ranged DPS · Snipes towers & guards',
    villagerRole: 'archer',
    roleRow: VILLAGER_ROLE_ROW.archer,
    iconKey: 'iceCrystal',
    coinCost: 22,
    fishStewCost: 1,
    hp: 105,
    dps: 28,
    moveSpeed: 72,
    attackRange: 145,
    targetPriority: 'DEFENSE',
    lootCarryMult: 1,
  },
  {
    key: 'rogue',
    name: 'Raider Rogue',
    roleSummary: '1.6× Speed · 2× Loot from Trade Post',
    villagerRole: 'criminal',
    roleRow: VILLAGER_ROLE_ROW.criminal,
    iconKey: 'frostCoin',
    coinCost: 18,
    fishStewCost: 0,
    hp: 95,
    dps: 24,
    moveSpeed: 112,
    attackRange: 32,
    targetPriority: 'LOOT',
    lootCarryMult: 2,
  },
  {
    key: 'ram',
    name: 'Timber Ram Sapper',
    roleSummary: '3× Damage to Watchtowers & Catapults',
    villagerRole: 'ram',
    roleRow: VILLAGER_ROLE_ROW.ram,
    iconKey: 'anvilBreaker',
    coinCost: 34,
    fishStewCost: 1,
    hp: 210,
    dps: 54,
    moveSpeed: 64,
    attackRange: 36,
    targetPriority: 'DEFENSE',
    lootCarryMult: 1,
  },
  {
    key: 'mystic',
    name: 'Frost Mystic',
    roleSummary: 'Slows enemy Watchtowers by 30%',
    villagerRole: 'cultist',
    roleRow: VILLAGER_ROLE_ROW.cultist,
    iconKey: 'frostMistPotion',
    coinCost: 30,
    fishStewCost: 1,
    hp: 120,
    dps: 22,
    moveSpeed: 68,
    attackRange: 130,
    targetPriority: 'DEFENSE',
    lootCarryMult: 1,
  },
  {
    key: 'apothecary',
    name: 'Field Apothecary',
    roleSummary: 'Heals wounded Yetis mid-raid',
    villagerRole: 'apothecary',
    roleRow: VILLAGER_ROLE_ROW.apothecary,
    iconKey: 'healingSalve',
    coinCost: 28,
    fishStewCost: 1,
    hp: 115,
    dps: 26,
    moveSpeed: 70,
    attackRange: 125,
    targetPriority: 'ALLY_HEAL',
    lootCarryMult: 1,
  },
];

export function getArmyUnitSpec(key: ArmyUnitKey): ArmyUnitSpec {
  for (let i = 0; i < ARMY_UNIT_SPECS.length; i += 1) {
    if (ARMY_UNIT_SPECS[i].key === key) {
      return ARMY_UNIT_SPECS[i];
    }
  }

  return ARMY_UNIT_SPECS[0];
}

export function createDefaultGovernanceState(): TownGovernanceState {
  return {
    officeHolder: 'PLAYER',
    taxRatePct: 10,
    winterPolicy: 'TARGETED_ESSENTIALS',
    townTreasuryFc: 620,
    approvalPct: 64,
    authorityRank: 100,
    raidsWon: 0,
    reliefDonations: 0,
    electionCount: 0,
    warband: [
      { unitKey: 'shieldguard', count: 2 },
      { unitKey: 'axeman', count: 2 },
      { unitKey: 'archer', count: 2 },
      { unitKey: 'rogue', count: 2 },
    ],
    activeBounty: {
      id: 'bounty_ironcrag_1',
      targetTownId: 'rival_ironcrag',
      targetTownName: 'Ironcrag Hold',
      rewardCoins: 140,
      approvalBonusPct: 15,
      completed: false,
    },
  };
}

/**
 * Dual-Power War Command rules synced directly with economy-sim/economy_model.py:
 *   - Elected Mayor: 100% Barracks Cap (16), -25% Treasury gear subsidy, 80% personal / 20% Treasury
 *   - Privateer (Voted Out): 75% Warband Cap (12), full gear cost, 86% personal (14% smuggling tariff)
 */
export function getRaidCommandRules(officeHolder: OfficeHolder): RaidCommandRules {
  if (officeHolder === 'PLAYER') {
    return {
      mode: 'OFFICIAL_MARSHAL',
      modeLabel: 'Official Town Marshal',
      maxArmyCount: 16,
      trainingDiscountPct: 25,
      playerLootSharePct: 80,
      treasuryTributePct: 20,
    };
  }

  return {
    mode: 'PRIVATEER',
    modeLabel: 'Privateer Warlord',
    maxArmyCount: 12,
    trainingDiscountPct: 0,
    playerLootSharePct: 86,
    treasuryTributePct: 0,
  };
}

export function getTotalWarbandCount(warband: readonly WarbandSlot[]): number {
  let total = 0;

  for (let i = 0; i < warband.length; i += 1) {
    total += warband[i].count;
  }

  return total;
}

export function getUnitTrainingCoinCost(
  unit: ArmyUnitSpec,
  officeHolder: OfficeHolder
): number {
  const rules = getRaidCommandRules(officeHolder);

  return Math.max(
    8,
    Math.round(unit.coinCost * (1 - rules.trainingDiscountPct / 100))
  );
}

export function computeProjectedApproval(
  gov: TownGovernanceState,
  season: Season
): number {
  // Tax fairness pillar: 10% is neutral; >12% hurts fast, <=8% boosts approval
  const taxScore = 62 + (10 - gov.taxRatePct) * 3.8;

  // Winter survival pillar
  let policyBonus = 0;

  if (season === 'WINTER') {
    if (gov.winterPolicy === 'FULL_CUSHION') policyBonus = 16;
    else if (gov.winterPolicy === 'TARGETED_ESSENTIALS') policyBonus = 8;
    else if (gov.winterPolicy === 'MODERATE_RELIEF') policyBonus = -4;
    else policyBonus = -20;
  } else {
    policyBonus = gov.winterPolicy === 'AUSTERITY' ? -4 : 6;
  }

  const raidPrideBonus = Math.min(18, gov.raidsWon * 5);
  const reliefBonus = Math.min(26, gov.reliefDonations * 9);

  return Math.max(
    10,
    Math.min(98, Math.round(taxScore + policyBonus + raidPrideBonus + reliefBonus))
  );
}

export function pickRivalCandidate(gov: TownGovernanceState): OfficeHolder {
  if (gov.approvalPct < 45 && gov.winterPolicy === 'AUSTERITY') {
    return 'AI_VESPER';
  }

  if (gov.taxRatePct >= 14) {
    return 'AI_STERLING';
  }

  return 'AI_BARNABY';
}

/**
 * Deterministic Town Hall Election: every autonomous Yeti citizen casts a real ballot!
 */
export function runTownElection(
  gov: TownGovernanceState,
  season: Season
): ElectionBallotResult {
  const rival = pickRivalCandidate(gov);

  const effectiveApproval =
    gov.officeHolder === 'PLAYER'
      ? computeProjectedApproval(gov, season)
      : gov.approvalPct;

  let playerVotes = 0;
  let rivalVotes = 0;
  const quotes: string[] = [];

  for (let i = 0; i < TOWN_VILLAGERS.length; i += 1) {
    const citizen = TOWN_VILLAGERS[i];
    let bias = 0;

    if (citizen.archetype === 'Property Landlord' && gov.taxRatePct >= 13) {
      bias -= 18;
    }

    if (
      (citizen.archetype === 'Hopeful Drifter' ||
        citizen.archetype === 'Frugal Saver') &&
      season === 'WINTER' &&
      gov.winterPolicy === 'AUSTERITY'
    ) {
      bias -= 22;
    }

    if (citizen.archetype === 'Frost Zealot' && rival === 'AI_VESPER') {
      bias -= 28;
    }

    if (citizen.archetype === 'Civic Protector' && gov.raidsWon > 0) {
      bias += 14;
    }

    const citizenScore = effectiveApproval + bias + ((i % 5) - 2) * 4;

    if (citizenScore >= 52) {
      playerVotes += 1;

      if (quotes.length < 3) {
        quotes.push(`${citizen.name} (${citizen.archetype}): Voted for Koda!`);
      }
    } else {
      rivalVotes += 1;

      if (quotes.length < 3) {
        quotes.push(
          `${citizen.name} (${citizen.archetype}): Voted for ${OFFICE_HOLDER_META[rival].name}.`
        );
      }
    }
  }

  const playerWon = playerVotes >= rivalVotes;
  const winner: OfficeHolder = playerWon ? 'PLAYER' : rival;

  const headline = playerWon
    ? `Koda wins Town Hall (${playerVotes}–${rivalVotes})! Full Official Marshal powers active.`
    : `${OFFICE_HOLDER_META[rival].name} wins Town Hall (${rivalVotes}–${playerVotes})! You now command as Privateer Warlord.`;

  return {
    winner,
    playerVotes,
    rivalVotes,
    rivalCandidate: rival,
    playerWon,
    headline,
    sampleQuotes: quotes,
  };
}
