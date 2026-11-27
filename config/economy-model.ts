/**
 * Anvil Quantitative Game Economy Model (Phases 1 & 2)
 * ----------------------------------------------------
 * Zero-guesswork mathematical specification anchored strictly to:
 *   Base Economic Unit U_0 = 120 FC / active hour (VPM_0 = 2.0 FC / active minute)
 * for Tier-1 baseline labor across Anvil's 72h Winter (2x) <-> 72h Summer (1x) cycle.
 */

export const BASE_LABOR_HOUR_FC = 120;
export const VPM_BASE = BASE_LABOR_HOUR_FC / 60;
export const TIER_EXPONENT = 0.78;
export const SKILL_BONUS_PER_LEVEL = 0.04;

export const SEASON_DURATION_HOURS = 72;
export const SEASON_DURATION_DAYS = 3;

// Starting capital derived from Act I worst-case survival runway:
//   3 Fish Stew (42) + 4 Firewood (40) + 1 Tool Repair Kit (28)
// + 1 Shelter/Bunkroom Reserve (40) + 5th-percentile RNG buffer (30) = 180 FC (= 1.5h T1 labor)
export const STARTING_CAPITAL_FC = 180;

// Bid-Ask Spreads (strictly prevent NPC round-trip and buy-craft-dump arbitrage)
export const NPC_ASK_MARKUP = 0.2;
export const NPC_BID_DISCOUNT = 0.28;

// Tax & Tariff Corridors
export const MAYOR_TAX_MIN = 0.05;
export const MAYOR_TAX_DEFAULT = 0.1;
export const MAYOR_TAX_MAX = 0.18;

export const MARKET_FEE_MIN = 0.04;
export const MARKET_FEE_DEFAULT = 0.06;
export const MARKET_FEE_MAX = 0.12;

export interface WealthTaxBracket {
  readonly maxFc: number | null;
  readonly dailyRate: number;
}

// Progressive Daily Wealth / Property Upkeep Tax Brackets (anti-hoarder velocity control)
export const WEALTH_TAX_BRACKETS: readonly WealthTaxBracket[] = [
  { maxFc: 1_500, dailyRate: 0.0 },
  { maxFc: 8_000, dailyRate: 0.0035 },
  { maxFc: 30_000, dailyRate: 0.0085 },
  { maxFc: null, dailyRate: 0.016 },
];

// Rival Town Raid Guardrails (Clash-style economic raids — zero coin printing)
export const RAID_UNVAULTED_LOOT_PCT = 0.15;
export const RAID_WAR_ATTRITION_SINK = 0.15;
export const RAID_PEACE_SHIELD_HOURS = 12;
export const RAID_SAME_TARGET_COOLDOWN_HOURS = 72;

export type EconomyTier = 1 | 2 | 3 | 4;

export type SimSeason = 'WINTER' | 'SUMMER';

export type PricingItemCategory =
  | 'raw'
  | 'seed'
  | 'ore'
  | 'food'
  | 'intermediate'
  | 'gear'
  | 'luxury';

export type PricingItemId =
  | 'seed_maize'
  | 'seed_wheat'
  | 'seed_turnip'
  | 'seed_potato'
  | 'seed_pine'
  | 'lake_trout'
  | 'frost_carp'
  | 'pine_log'
  | 'oak_log'
  | 'maize_cob'
  | 'wheat_sheaf'
  | 'snow_turnip'
  | 'frost_potato'
  | 'mountain_berries'
  | 'forest_mushroom'
  | 'frost_mint'
  | 'yak_milk'
  | 'yak_wool'
  | 'raw_stone'
  | 'coal_chunk'
  | 'copper_ore'
  | 'iron_ore'
  | 'silver_ore'
  | 'gold_ore'
  | 'raw_diamond'
  | 'ice_crystal'
  | 'ancient_relic'
  | 'firewood'
  | 'pine_planks'
  | 'flour_sack'
  | 'iron_ingot'
  | 'gold_ingot'
  | 'steel_ingot'
  | 'iron_nails'
  | 'wool_cloth'
  | 'fish_stew'
  | 'smoked_fish'
  | 'artisan_bread'
  | 'alpine_cheese'
  | 'warmth_tea'
  | 'healing_salve'
  | 'repair_kit'
  | 'iron_axe'
  | 'kite_shield'
  | 'winter_coat'
  | 'yeti_crown';

export interface OccupationSpec {
  readonly id: string;
  readonly name: string;
  readonly tier: EconomyTier;
  readonly upkeepRatio: number;
  readonly grossFcPerHour: number;
  readonly netFcPerHourBase: number;
  readonly actUnlocked: 1 | 2 | 3 | 4;
}

export interface RecipeInput {
  readonly itemId: PricingItemId;
  readonly qty: number;
}

export interface PricingItemSpec {
  readonly id: PricingItemId;
  readonly name: string;
  readonly category: PricingItemCategory;
  readonly tier: EconomyTier;
  readonly laborMinutes: number;
  readonly refPrice: number;
  readonly npcBuyPrice: number;
  readonly npcSellPrice: number;
  readonly winterMaxMult: number;
  readonly localSubsidyBound: boolean;
  readonly recipe: readonly RecipeInput[];
  readonly craftFuelCost: number;
}

export interface MiningDropSpec {
  readonly itemId: PricingItemId;
  readonly probability: number;
}

export interface MiningDepthSpec {
  readonly depth: EconomyTier;
  readonly name: string;
  readonly tier: EconomyTier;
  readonly attemptsPerHour: number;
  readonly upkeepFcPerHour: number;
  readonly drops: readonly MiningDropSpec[];
}

export interface RaidTierSpec {
  readonly tier: EconomyTier;
  readonly name: string;
  readonly raidsPerHour: number;
  readonly baseWinProb: number;
  readonly targetUnvaultedPoolFc: number;
  readonly armyGearCostFc: number;
  readonly rationsCostSummerFc: number;
  readonly lossPenaltyFc: number;
}

export interface MiningEvMetrics {
  readonly grossEvFcPerHour: number;
  readonly netPreTaxFcPerHour: number;
  readonly netPostTaxFcPerHour: number;
}

export interface RaidEvMetrics {
  readonly evPerRaid: number;
  readonly evPerHour: number;
}

export interface MiningDepthSummary extends MiningDepthSpec, MiningEvMetrics {}

export interface RaidTierSummary extends RaidTierSpec {
  readonly unvaultedLootPct: number;
  readonly warAttritionSinkPct: number;
  readonly evHrSummerMayor: number;
  readonly evHrSummerPrivateer: number;
  readonly evHrWinterMayor: number;
  readonly evPerRaidSummerMayor: number;
}

export interface EconomyProductionConfig {
  readonly meta: {
    readonly game: string;
    readonly currency: string;
    readonly baseLaborHourFc: number;
    readonly vpmBaseFc: number;
    readonly tierExponent: number;
    readonly startingCapitalFc: number;
    readonly seasonDurationHours: number;
    readonly npcAskMarkup: number;
    readonly npcBidDiscount: number;
  };
  readonly taxation: {
    readonly mayorTaxBounds: {
      readonly min: number;
      readonly default: number;
      readonly max: number;
    };
    readonly marketFeeBounds: {
      readonly min: number;
      readonly default: number;
      readonly max: number;
    };
    readonly wealthUpkeepBracketsDaily: readonly WealthTaxBracket[];
  };
  readonly occupations: readonly OccupationSpec[];
  readonly items: readonly PricingItemSpec[];
  readonly miningDepths: readonly MiningDepthSummary[];
  readonly raidTiers: readonly RaidTierSummary[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * S(T, s) = U_0 * T^0.78 * (1 + 0.04 * (s - 1))
 */
export function occupationGrossPerHour(
  tier: EconomyTier,
  skillLevel = 1
): number {
  const effectiveLevel = Math.max(0, skillLevel - 1);

  return (
    BASE_LABOR_HOUR_FC *
    tier ** TIER_EXPONENT *
    (1 + SKILL_BONUS_PER_LEVEL * effectiveLevel)
  );
}

/**
 * EV_occ(T) = W_gross(T, s) * (1 - c_upkeep) * (1 - tau)
 */
export function occupationNetPerHour(
  tier: EconomyTier,
  upkeepRatio = 0.12,
  taxRate = MAYOR_TAX_DEFAULT,
  skillLevel = 1
): number {
  const gross = occupationGrossPerHour(tier, skillLevel);

  return gross * (1 - upkeepRatio) * (1 - taxRate);
}

export interface BidAskSpread {
  readonly ask: number;
  readonly bid: number;
}

/**
 * Derive integer (npcBuyPrice, npcSellPrice) strictly enforcing bid < ask.
 */
export function computeBidAsk(refPrice: number): BidAskSpread {
  const ask = Math.max(2, Math.ceil(refPrice * (1 + NPC_ASK_MARKUP)));
  const rawBid = Math.max(1, Math.floor(refPrice * (1 - NPC_BID_DISCOUNT)));
  const bid = rawBid >= ask ? Math.max(1, ask - 1) : rawBid;

  return { ask, bid };
}

/**
 * Progressive marginal wealth/property upkeep sink.
 */
export function computeDailyWealthTax(liquidCoins: number): number {
  if (liquidCoins <= 0) {
    return 0;
  }

  let tax = 0;
  let prevBound = 0;

  for (let i = 0; i < WEALTH_TAX_BRACKETS.length; i += 1) {
    const bracket = WEALTH_TAX_BRACKETS[i];

    if (liquidCoins <= prevBound) {
      break;
    }

    const upper = bracket.maxFc ?? Number.POSITIVE_INFINITY;
    const taxable = Math.min(liquidCoins, upper) - prevBound;

    tax += taxable * bracket.dailyRate;
    prevBound = upper;
  }

  return tax;
}

interface RawOccupationRow {
  readonly id: string;
  readonly name: string;
  readonly tier: EconomyTier;
  readonly upkeepRatio: number;
  readonly actUnlocked: 1 | 2 | 3 | 4;
}

const RAW_OCCUPATIONS: readonly RawOccupationRow[] = [
  { id: 'occ_ice_angler', name: 'Lake & Ice Angler', tier: 1, upkeepRatio: 0.1, actUnlocked: 1 },
  { id: 'occ_lumberjack', name: 'Pine Lumberjack', tier: 1, upkeepRatio: 0.11, actUnlocked: 1 },
  { id: 'occ_drifter_labor', name: 'Day-Labor Porter', tier: 1, upkeepRatio: 0.08, actUnlocked: 1 },
  { id: 'occ_farmer', name: 'Valley Crop Farmer', tier: 1, upkeepRatio: 0.12, actUnlocked: 2 },
  { id: 'occ_smokehouse', name: 'Fish Smoker & Stew Chef', tier: 2, upkeepRatio: 0.13, actUnlocked: 1 },
  { id: 'occ_sawyer', name: 'Sawmill Operator', tier: 2, upkeepRatio: 0.12, actUnlocked: 1 },
  { id: 'occ_miller', name: 'Windmill Miller', tier: 2, upkeepRatio: 0.12, actUnlocked: 2 },
  { id: 'occ_baker', name: 'Cozy Baker', tier: 2, upkeepRatio: 0.13, actUnlocked: 2 },
  { id: 'occ_rancher', name: 'Yak Rancher & Dairy', tier: 2, upkeepRatio: 0.12, actUnlocked: 2 },
  { id: 'occ_town_guard', name: 'Town Watch Guard', tier: 2, upkeepRatio: 0.1, actUnlocked: 2 },
  { id: 'occ_blacksmith', name: 'Yeti Blacksmith', tier: 3, upkeepRatio: 0.14, actUnlocked: 2 },
  { id: 'occ_builder', name: 'Master Builder Crew', tier: 3, upkeepRatio: 0.12, actUnlocked: 1 },
  { id: 'occ_apothecary', name: 'Apothecary & Tailor', tier: 3, upkeepRatio: 0.14, actUnlocked: 3 },
  { id: 'occ_banker', name: 'Town Banker & Broker', tier: 3, upkeepRatio: 0.1, actUnlocked: 2 },
  { id: 'occ_master_smelter', name: 'Deep Blast Smelter', tier: 4, upkeepRatio: 0.15, actUnlocked: 3 },
  { id: 'occ_jeweler', name: 'Alpine Gem & Crown Jeweler', tier: 4, upkeepRatio: 0.15, actUnlocked: 4 },
  { id: 'occ_greenhouse', name: 'Sun-Glass Agronomist', tier: 4, upkeepRatio: 0.15, actUnlocked: 4 },
];

export function buildOccupations(): OccupationSpec[] {
  const out: OccupationSpec[] = [];

  for (let i = 0; i < RAW_OCCUPATIONS.length; i += 1) {
    const row = RAW_OCCUPATIONS[i];
    const gross = round2(occupationGrossPerHour(row.tier, 1));

    const net = round2(
      occupationNetPerHour(row.tier, row.upkeepRatio, MAYOR_TAX_DEFAULT, 1)
    );

    out.push({
      id: row.id,
      name: row.name,
      tier: row.tier,
      upkeepRatio: row.upkeepRatio,
      grossFcPerHour: gross,
      netFcPerHourBase: net,
      actUnlocked: row.actUnlocked,
    });
  }

  return out;
}

/**
 * Every item's reference price is derived from Labor-Time Equivalence:
 *   - Raw & Ore items: refPrice = laborMinutes * VPM_tier
 *   - Crafted items:   refPrice = sum(ingredientRef) + craftMinutes * VPM_tier + fuelCost
 * And npcSellPrice is strictly clamped <= min(directIngredientAskSum, recursiveRawAskSum)
 * so single-hop and multi-hop buy-craft-dump loops can NEVER print coins.
 */
export function buildItemsMap(): Map<PricingItemId, PricingItemSpec> {
  const items = new Map<PricingItemId, PricingItemSpec>();

  const requireItem = (id: PricingItemId): PricingItemSpec => {
    const found = items.get(id);

    if (found === undefined) {
      throw new Error(`Missing item dependency in pricing table: ${id}`);
    }

    return found;
  };

  const addRaw = (
    id: PricingItemId,
    name: string,
    category: PricingItemCategory,
    tier: EconomyTier,
    laborMinutes: number,
    winterMaxMult: number,
    localSubsidyBound = false
  ): void => {
    const vpm = occupationGrossPerHour(tier) / 60;
    const refPrice = round2(laborMinutes * vpm);
    const { ask, bid } = computeBidAsk(refPrice);

    items.set(id, {
      id,
      name,
      category,
      tier,
      laborMinutes,
      refPrice,
      npcBuyPrice: ask,
      npcSellPrice: bid,
      winterMaxMult,
      localSubsidyBound,
      recipe: [],
      craftFuelCost: 0,
    });
  };

  const recursiveRawAskCost = (key: PricingItemId): number => {
    const spec = requireItem(key);

    if (spec.recipe.length === 0) {
      return spec.npcBuyPrice;
    }

    let total = 0;

    for (let i = 0; i < spec.recipe.length; i += 1) {
      const input = spec.recipe[i];

      total += recursiveRawAskCost(input.itemId) * input.qty;
    }

    return total;
  };

  const addCrafted = (
    id: PricingItemId,
    name: string,
    category: PricingItemCategory,
    tier: EconomyTier,
    craftMinutes: number,
    recipe: readonly RecipeInput[],
    winterMaxMult: number,
    fuelCost = 0,
    localSubsidyBound = false
  ): void => {
    const vpm = occupationGrossPerHour(tier) / 60;
    let ingRefSum = 0;
    let ingAskSum = 0;
    let rawBaseAskSum = 0;

    for (let i = 0; i < recipe.length; i += 1) {
      const input = recipe[i];
      const dep = requireItem(input.itemId);

      ingRefSum += dep.refPrice * input.qty;
      ingAskSum += dep.npcBuyPrice * input.qty;
      rawBaseAskSum += recursiveRawAskCost(input.itemId) * input.qty;
    }

    const refPrice = round2(ingRefSum + craftMinutes * vpm + fuelCost);
    const spread = computeBidAsk(refPrice);
    let ask = spread.ask;
    let bid = spread.bid;

    const maxSafeBid = Math.min(ingAskSum, rawBaseAskSum);

    if (bid > maxSafeBid) {
      bid = Math.max(1, Math.floor(maxSafeBid));
    }

    if (bid >= ask) {
      ask = bid + 2;
    }

    items.set(id, {
      id,
      name,
      category,
      tier,
      laborMinutes: craftMinutes,
      refPrice,
      npcBuyPrice: ask,
      npcSellPrice: bid,
      winterMaxMult,
      localSubsidyBound,
      recipe,
      craftFuelCost: fuelCost,
    });
  };

  // --- SEEDS ---
  addRaw('seed_maize', 'Maize Seeds', 'seed', 1, 1.5, 1.4);
  addRaw('seed_wheat', 'Wheat Seeds', 'seed', 1, 1.5, 1.4);
  addRaw('seed_turnip', 'Snow Turnip Seeds', 'seed', 1, 2.0, 1.6);
  addRaw('seed_potato', 'Frost Potato Seeds', 'seed', 1, 2.0, 1.5);
  addRaw('seed_pine', 'Pinecone Seed', 'seed', 1, 1.5, 1.3);

  // --- RAW FORESTRY, FISH & FARM PRODUCE ---
  addRaw('lake_trout', 'Lake Trout', 'raw', 1, 3.5, 1.65, true);
  addRaw('frost_carp', 'Frost Carp', 'raw', 2, 5.5, 1.85);
  addRaw('pine_log', 'Pine Log', 'raw', 1, 3.0, 1.75);
  addRaw('oak_log', 'Hardwood Oak Log', 'raw', 2, 4.5, 1.75);
  addRaw('maize_cob', 'Maize Cob', 'raw', 1, 3.5, 2.0);
  addRaw('wheat_sheaf', 'Wheat Sheaf', 'raw', 1, 3.5, 2.0);
  addRaw('snow_turnip', 'Snow Turnip', 'raw', 1, 3.2, 1.6, true);
  addRaw('frost_potato', 'Frost Potato', 'raw', 1, 3.8, 1.8);
  addRaw('mountain_berries', 'Mountain Berries', 'raw', 1, 4.0, 1.9);
  addRaw('forest_mushroom', 'Forest Mushrooms', 'raw', 1, 3.2, 1.55);
  addRaw('frost_mint', 'Frost Mint', 'raw', 2, 4.0, 1.8);
  addRaw('yak_milk', 'Yak Milk', 'raw', 2, 3.5, 1.85);
  addRaw('yak_wool', 'Yak Wool', 'raw', 2, 4.0, 1.9);

  // --- MINEABLE ORES, GEMS & CRYSTALS (Anchored to Cave EV Parity) ---
  addRaw('raw_stone', 'Raw Stone', 'ore', 1, 1.8, 1.4);
  addRaw('coal_chunk', 'Coal Chunk', 'ore', 1, 2.6, 1.85);
  addRaw('copper_ore', 'Copper Ore', 'ore', 1, 3.8, 1.6);
  addRaw('iron_ore', 'Iron Ore', 'ore', 2, 3.1, 1.7);
  addRaw('silver_ore', 'Silver Ore', 'ore', 3, 3.1, 1.7);
  addRaw('gold_ore', 'Gold Ore', 'ore', 3, 4.5, 1.75);
  addRaw('raw_diamond', 'Uncut Diamond', 'ore', 4, 5.2, 1.75);
  addRaw('ice_crystal', 'Glacier Ice Crystal', 'ore', 4, 6.2, 2.0);
  addRaw('ancient_relic', 'Ancient Yeti Relic', 'luxury', 4, 9.5, 1.5);

  // --- PROCESSED INTERMEDIATES ---
  addCrafted('firewood', 'Split Firewood', 'intermediate', 1, 1.5, [{ itemId: 'pine_log', qty: 1 }], 2.0, 0, true);
  addCrafted('pine_planks', 'Pine Planks', 'intermediate', 1, 2.2, [{ itemId: 'pine_log', qty: 2 }], 1.75, 0);
  addCrafted('flour_sack', 'Fine Flour', 'intermediate', 2, 2.0, [{ itemId: 'wheat_sheaf', qty: 2 }], 2.0, 0.5);
  addCrafted('iron_ingot', 'Iron Ingot', 'intermediate', 2, 2.5, [{ itemId: 'iron_ore', qty: 2 }, { itemId: 'coal_chunk', qty: 1 }], 1.75, 1.0);
  addCrafted('gold_ingot', 'Gold Ingot', 'intermediate', 4, 3.2, [{ itemId: 'gold_ore', qty: 2 }, { itemId: 'coal_chunk', qty: 2 }], 1.75, 2.0);
  addCrafted('steel_ingot', 'Tempered Steel Ingot', 'intermediate', 3, 3.0, [{ itemId: 'iron_ingot', qty: 2 }, { itemId: 'coal_chunk', qty: 2 }], 1.85, 2.0);
  addCrafted('iron_nails', 'Box of Iron Nails', 'intermediate', 2, 1.5, [{ itemId: 'iron_ingot', qty: 1 }], 1.7, 0.5);
  addCrafted('wool_cloth', 'Heavy Wool Cloth', 'intermediate', 2, 2.5, [{ itemId: 'yak_wool', qty: 2 }], 1.95, 0);

  // --- CONSUMABLE FOODS & TONICS ---
  addCrafted('fish_stew', 'Hot Fish Stew', 'food', 1, 2.0, [{ itemId: 'lake_trout', qty: 1 }, { itemId: 'firewood', qty: 1 }], 1.8, 0, true);
  addCrafted('smoked_fish', 'Smoked Glacier Fish', 'food', 2, 2.0, [{ itemId: 'lake_trout', qty: 2 }, { itemId: 'firewood', qty: 1 }], 2.0, 0);
  addCrafted('artisan_bread', 'Artisan Loaf Bread', 'food', 2, 2.2, [{ itemId: 'flour_sack', qty: 1 }, { itemId: 'firewood', qty: 1 }], 2.0, 0, true);
  addCrafted('alpine_cheese', 'Aged Alpine Cheese', 'food', 2, 2.5, [{ itemId: 'yak_milk', qty: 2 }], 1.9, 0);
  addCrafted('warmth_tea', 'Winter Warmth Tea', 'food', 2, 2.0, [{ itemId: 'frost_mint', qty: 1 }, { itemId: 'firewood', qty: 1 }], 2.0, 0, true);
  addCrafted('healing_salve', 'Healing Salve', 'food', 3, 2.5, [{ itemId: 'frost_mint', qty: 1 }, { itemId: 'forest_mushroom', qty: 2 }], 1.85, 0);

  // --- GEAR, TOOLS & LUXURY ---
  addCrafted('repair_kit', 'Tool Repair Kit', 'gear', 2, 1.8, [{ itemId: 'iron_ingot', qty: 1 }, { itemId: 'pine_planks', qty: 1 }], 1.65, 0);
  addCrafted('iron_axe', 'Iron Battle Axe', 'gear', 3, 3.0, [{ itemId: 'iron_ingot', qty: 2 }, { itemId: 'pine_planks', qty: 1 }], 1.75, 1.5);
  addCrafted('kite_shield', 'Alpine Kite Shield', 'gear', 3, 3.2, [{ itemId: 'iron_ingot', qty: 2 }, { itemId: 'wool_cloth', qty: 1 }], 1.8, 1.5);
  addCrafted('winter_coat', 'Heavy Winter Coat', 'gear', 3, 3.5, [{ itemId: 'wool_cloth', qty: 2 }], 2.0, 0);
  addCrafted('yeti_crown', 'Sovereign Yeti Crown', 'luxury', 4, 8.0, [{ itemId: 'gold_ingot', qty: 3 }, { itemId: 'raw_diamond', qty: 2 }, { itemId: 'ice_crystal', qty: 1 }], 1.6, 5.0);

  return items;
}

export function buildMiningDepths(): readonly MiningDepthSpec[] {
  return [
    {
      depth: 1,
      name: 'Surface Quarry (L1)',
      tier: 1,
      attemptsPerHour: 28,
      upkeepFcPerHour: 24,
      drops: [
        { itemId: 'raw_stone', probability: 0.5 },
        { itemId: 'coal_chunk', probability: 0.28 },
        { itemId: 'copper_ore', probability: 0.19 },
        { itemId: 'iron_ore', probability: 0.03 },
      ],
    },
    {
      depth: 2,
      name: 'Echo Caves Mid (L2)',
      tier: 2,
      attemptsPerHour: 28,
      upkeepFcPerHour: 42,
      drops: [
        { itemId: 'raw_stone', probability: 0.18 },
        { itemId: 'coal_chunk', probability: 0.26 },
        { itemId: 'copper_ore', probability: 0.22 },
        { itemId: 'iron_ore', probability: 0.29 },
        { itemId: 'silver_ore', probability: 0.05 },
      ],
    },
    {
      depth: 3,
      name: 'Deep Veins (L3)',
      tier: 3,
      attemptsPerHour: 26,
      upkeepFcPerHour: 66,
      drops: [
        { itemId: 'coal_chunk', probability: 0.18 },
        { itemId: 'iron_ore', probability: 0.34 },
        { itemId: 'silver_ore', probability: 0.28 },
        { itemId: 'gold_ore', probability: 0.16 },
        { itemId: 'raw_diamond', probability: 0.04 },
      ],
    },
    {
      depth: 4,
      name: 'Deep Shaft & Glacier Cavern (L4)',
      tier: 4,
      attemptsPerHour: 22,
      upkeepFcPerHour: 92,
      drops: [
        { itemId: 'iron_ore', probability: 0.28 },
        { itemId: 'silver_ore', probability: 0.26 },
        { itemId: 'gold_ore', probability: 0.24 },
        { itemId: 'raw_diamond', probability: 0.12 },
        { itemId: 'ice_crystal', probability: 0.08 },
        { itemId: 'ancient_relic', probability: 0.02 },
      ],
    },
  ];
}

/**
 * EV_mine = A * sum(P_i * V_i) - C_upkeep
 */
export function computeMiningEvPerHour(
  depth: MiningDepthSpec,
  items: ReadonlyMap<PricingItemId, PricingItemSpec>,
  taxRate = MAYOR_TAX_DEFAULT,
  marketFee = MARKET_FEE_DEFAULT
): MiningEvMetrics {
  let evPerAttempt = 0;

  for (let i = 0; i < depth.drops.length; i += 1) {
    const drop = depth.drops[i];
    const spec = items.get(drop.itemId);

    if (spec !== undefined) {
      evPerAttempt += drop.probability * spec.refPrice;
    }
  }

  const grossHr = depth.attemptsPerHour * evPerAttempt;
  const netPreTax = grossHr - depth.upkeepFcPerHour;
  const effectiveKeep = 1 - (taxRate * 0.6 + marketFee * 0.4);
  const netPostTax = Math.max(0, grossHr * effectiveKeep - depth.upkeepFcPerHour);

  return {
    grossEvFcPerHour: round2(grossHr),
    netPreTaxFcPerHour: round2(netPreTax),
    netPostTaxFcPerHour: round2(netPostTax),
  };
}

export function buildRaidTiers(): readonly RaidTierSpec[] {
  return [
    {
      tier: 1,
      name: 'Border Skirmish (Town L1-3)',
      raidsPerHour: 2.5,
      baseWinProb: 0.62,
      targetUnvaultedPoolFc: 990,
      armyGearCostFc: 14,
      rationsCostSummerFc: 7,
      lossPenaltyFc: 14,
    },
    {
      tier: 2,
      name: 'Village Raid (Town L4-6)',
      raidsPerHour: 2.5,
      baseWinProb: 0.62,
      targetUnvaultedPoolFc: 1_690,
      armyGearCostFc: 24,
      rationsCostSummerFc: 12,
      lossPenaltyFc: 24,
    },
    {
      tier: 3,
      name: 'Guild Stronghold Raid (Town L7-9)',
      raidsPerHour: 2.2,
      baseWinProb: 0.6,
      targetUnvaultedPoolFc: 2_700,
      armyGearCostFc: 38,
      rationsCostSummerFc: 18,
      lossPenaltyFc: 38,
    },
    {
      tier: 4,
      name: 'Sovereign Valley Siege (Town L10+)',
      raidsPerHour: 2.0,
      baseWinProb: 0.58,
      targetUnvaultedPoolFc: 3_950,
      armyGearCostFc: 56,
      rationsCostSummerFc: 25,
      lossPenaltyFc: 56,
    },
  ];
}

/**
 * EV_loot = raidsHr * [
 *   (P_win * R_loot * (1 - attrition) * lootShare)
 *   - (P_loss * C_loss)
 *   - C_army * (1 - subsidy)
 *   - C_rations * seasonMult
 * ]
 */
export function computeRaidEvPerHour(
  raid: RaidTierSpec,
  season: SimSeason = 'SUMMER',
  isMayor = true
): RaidEvMetrics {
  const rawSeized = raid.targetUnvaultedPoolFc * RAID_UNVAULTED_LOOT_PCT;
  const netAfterAttrition = rawSeized * (1 - RAID_WAR_ATTRITION_SINK);
  const lootShare = isMayor ? 0.8 : 0.86;
  const gearMult = isMayor ? 0.75 : 1.0;
  const seasonRationMult = season === 'WINTER' ? 1.65 : 1.0;
  const pWin = raid.baseWinProb;
  const pLoss = 1 - pWin;

  const evRaid =
    pWin * netAfterAttrition * lootShare -
    pLoss * raid.lossPenaltyFc -
    raid.armyGearCostFc * gearMult -
    raid.rationsCostSummerFc * seasonRationMult;

  return {
    evPerRaid: round2(evRaid),
    evPerHour: round2(evRaid * raid.raidsPerHour),
  };
}

export function buildEconomyProductionConfig(): EconomyProductionConfig {
  const occupations = buildOccupations();
  const itemsMap = buildItemsMap();
  const items = Array.from(itemsMap.values());
  const depths = buildMiningDepths();
  const raids = buildRaidTiers();

  const miningDepths: MiningDepthSummary[] = [];

  for (let i = 0; i < depths.length; i += 1) {
    const depth = depths[i];
    const metrics = computeMiningEvPerHour(depth, itemsMap);

    miningDepths.push({
      ...depth,
      ...metrics,
    });
  }

  const raidTiers: RaidTierSummary[] = [];

  for (let i = 0; i < raids.length; i += 1) {
    const raid = raids[i];
    const summerMayor = computeRaidEvPerHour(raid, 'SUMMER', true);
    const summerPriv = computeRaidEvPerHour(raid, 'SUMMER', false);
    const winterMayor = computeRaidEvPerHour(raid, 'WINTER', true);

    raidTiers.push({
      ...raid,
      unvaultedLootPct: RAID_UNVAULTED_LOOT_PCT,
      warAttritionSinkPct: RAID_WAR_ATTRITION_SINK,
      evHrSummerMayor: summerMayor.evPerHour,
      evHrSummerPrivateer: summerPriv.evPerHour,
      evHrWinterMayor: winterMayor.evPerHour,
      evPerRaidSummerMayor: summerMayor.evPerRaid,
    });
  }

  return {
    meta: {
      game: 'Anvil',
      currency: 'Frost Coins (FC)',
      baseLaborHourFc: BASE_LABOR_HOUR_FC,
      vpmBaseFc: VPM_BASE,
      tierExponent: TIER_EXPONENT,
      startingCapitalFc: STARTING_CAPITAL_FC,
      seasonDurationHours: SEASON_DURATION_HOURS,
      npcAskMarkup: NPC_ASK_MARKUP,
      npcBidDiscount: NPC_BID_DISCOUNT,
    },
    taxation: {
      mayorTaxBounds: {
        min: MAYOR_TAX_MIN,
        default: MAYOR_TAX_DEFAULT,
        max: MAYOR_TAX_MAX,
      },
      marketFeeBounds: {
        min: MARKET_FEE_MIN,
        default: MARKET_FEE_DEFAULT,
        max: MARKET_FEE_MAX,
      },
      wealthUpkeepBracketsDaily: WEALTH_TAX_BRACKETS,
    },
    occupations,
    items,
    miningDepths,
    raidTiers,
  };
}
