import {
  buildEconomyProductionConfig,
  buildItemsMap,
  type EconomyProductionConfig,
  type MiningDepthSummary,
  type OccupationSpec,
  type PricingItemId,
  type PricingItemSpec,
  type RaidTierSummary,
} from './economy-model';

export const ECONOMY_PRODUCTION_CONFIG: EconomyProductionConfig =
  buildEconomyProductionConfig();

export const ECONOMY_ITEMS_MAP: ReadonlyMap<PricingItemId, PricingItemSpec> =
  buildItemsMap();

export const ECONOMY_PRICING_ITEMS: readonly PricingItemSpec[] =
  ECONOMY_PRODUCTION_CONFIG.items;

export const ECONOMY_OCCUPATIONS: readonly OccupationSpec[] =
  ECONOMY_PRODUCTION_CONFIG.occupations;

export const ECONOMY_MINING_DEPTHS: readonly MiningDepthSummary[] =
  ECONOMY_PRODUCTION_CONFIG.miningDepths;

export const ECONOMY_RAID_TIERS: readonly RaidTierSummary[] =
  ECONOMY_PRODUCTION_CONFIG.raidTiers;

export function getPricingItemById(id: PricingItemId): PricingItemSpec {
  const item = ECONOMY_ITEMS_MAP.get(id);

  if (item === undefined) {
    throw new Error(`Unknown economy pricing item: ${id}`);
  }

  return item;
}
