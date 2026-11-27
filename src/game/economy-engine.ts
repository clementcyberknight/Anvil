import type { GameIconKey } from '@/game/icon-atlas';
import type { ResourceNodeKey } from '@/game/resource-atlas';
import type { Season } from '@/game/types';
import {
  VALLEY_BLOCK_PX,
  VALLEY_BORDER_X,
  VALLEY_BORDER_Y,
} from '@/game/valley-zones';

/**
 * Anchored directly to our verified Quantitative Economy (config/economy-pricing.ts & config/anvil-economy-config.json):
 *   - Base Economic Unit U_0 = 120 FC / active hour (2.0 FC / min)
 *   - Starting Capital C_0   = 180 FC (verified 0% soft-lock at 5th-percentile Act I RNG)
 *   - NPC Ask (+20%) / NPC Bid (-28%), recursively clamped so multi-hop craft arbitrage = 0
 */
export const STARTING_CAPITAL_FC = 180;
export const BASE_LABOR_HOUR_FC = 120;

export type EconomyItemCategory =
  | 'seed'
  | 'raw'
  | 'ore'
  | 'intermediate'
  | 'food'
  | 'gear'
  | 'luxury';

export interface EconomyItemSpec {
  readonly id: GameIconKey;
  readonly name: string;
  readonly category: EconomyItemCategory;
  readonly tier: 1 | 2 | 3 | 4;
  readonly refPrice: number;
  readonly npcBuyPrice: number;
  readonly npcSellPrice: number;
  readonly winterMaxMult: number;
  readonly localSubsidyBound: boolean;
}

export interface CraftIngredient {
  readonly itemId: GameIconKey;
  readonly qty: number;
}

export interface CraftRecipeSpec {
  readonly id: string;
  readonly name: string;
  readonly outputItemId: GameIconKey;
  readonly outputQty: number;
  readonly stationLabel: string;
  readonly ingredients: readonly CraftIngredient[];
}

export interface PouchEntry {
  readonly itemId: GameIconKey;
  readonly qty: number;
}

export type CropKind = 'turnip' | 'maize' | 'wheat' | 'potato' | 'pumpkin';

export interface CropDefinition {
  readonly kind: CropKind;
  readonly name: string;
  readonly seedItemId: GameIconKey;
  readonly harvestItemId: GameIconKey;
  readonly harvestQty: number;
  readonly growDurationMs: number;
  readonly winterHardy: boolean;
}

export interface ValleyPlantedCrop {
  readonly id: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly cropKind: CropKind;
  readonly plantedAtMs: number;
  readonly matureAtMs: number;
}

export interface WorldResourceNode {
  readonly id: string;
  readonly spriteKey: ResourceNodeKey;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly drawSize: number;
  readonly kind: 'FISH_HOLE' | 'DEADFALL' | 'MINE_L1' | 'MINE_L2' | 'MINE_L3' | 'MINE_L4' | 'FORAGE';
  readonly respawnMs: number;
}

export interface GatherOutcome {
  readonly itemId: GameIconKey;
  readonly itemName: string;
  readonly qty: number;
  readonly bonusCoins: number;
}

/**
 * Verified zero-arbitrage item catalog synchronized with config/anvil-economy-config.json.
 */
export const ECONOMY_ITEMS: readonly EconomyItemSpec[] = [
  // Seeds
  { id: 'seedTurnip', name: 'Snow Turnip Seeds', category: 'seed', tier: 1, refPrice: 4, npcBuyPrice: 5, npcSellPrice: 2, winterMaxMult: 1.6, localSubsidyBound: false },
  { id: 'seedMaize', name: 'Maize Seeds', category: 'seed', tier: 1, refPrice: 3, npcBuyPrice: 4, npcSellPrice: 2, winterMaxMult: 1.4, localSubsidyBound: false },
  { id: 'seedWheat', name: 'Wheat Seeds', category: 'seed', tier: 1, refPrice: 3, npcBuyPrice: 4, npcSellPrice: 2, winterMaxMult: 1.4, localSubsidyBound: false },
  { id: 'seedPotato', name: 'Frost Potato Seeds', category: 'seed', tier: 1, refPrice: 4, npcBuyPrice: 5, npcSellPrice: 2, winterMaxMult: 1.5, localSubsidyBound: false },
  { id: 'seedPumpkin', name: 'Pumpkin Seeds', category: 'seed', tier: 1, refPrice: 5, npcBuyPrice: 6, npcSellPrice: 3, winterMaxMult: 1.5, localSubsidyBound: false },
  { id: 'seedPinecone', name: 'Pinecone Seed', category: 'seed', tier: 1, refPrice: 3, npcBuyPrice: 4, npcSellPrice: 2, winterMaxMult: 1.3, localSubsidyBound: false },

  // Act I & Core Raw Goods
  { id: 'lakeTrout', name: 'Lake Trout', category: 'raw', tier: 1, refPrice: 7, npcBuyPrice: 9, npcSellPrice: 5, winterMaxMult: 1.65, localSubsidyBound: true },
  { id: 'frostCarp', name: 'Frost Carp', category: 'raw', tier: 2, refPrice: 18.9, npcBuyPrice: 23, npcSellPrice: 13, winterMaxMult: 1.85, localSubsidyBound: false },
  { id: 'pineLog', name: 'Pine Log', category: 'raw', tier: 1, refPrice: 6, npcBuyPrice: 8, npcSellPrice: 4, winterMaxMult: 1.75, localSubsidyBound: false },
  { id: 'snowTurnip', name: 'Snow Turnip', category: 'raw', tier: 1, refPrice: 6.4, npcBuyPrice: 8, npcSellPrice: 4, winterMaxMult: 1.6, localSubsidyBound: true },
  { id: 'maizeCob', name: 'Maize Cob', category: 'raw', tier: 1, refPrice: 7, npcBuyPrice: 9, npcSellPrice: 5, winterMaxMult: 2.0, localSubsidyBound: false },
  { id: 'wheatSheaf', name: 'Wheat Sheaf', category: 'raw', tier: 1, refPrice: 7, npcBuyPrice: 9, npcSellPrice: 5, winterMaxMult: 2.0, localSubsidyBound: false },
  { id: 'frostPotato', name: 'Frost Potato', category: 'raw', tier: 1, refPrice: 7.6, npcBuyPrice: 10, npcSellPrice: 5, winterMaxMult: 1.8, localSubsidyBound: false },
  { id: 'alpinePumpkin', name: 'Alpine Pumpkin', category: 'raw', tier: 1, refPrice: 11, npcBuyPrice: 14, npcSellPrice: 7, winterMaxMult: 1.9, localSubsidyBound: false },
  { id: 'forestMushroom', name: 'Forest Mushrooms', category: 'raw', tier: 1, refPrice: 6.4, npcBuyPrice: 8, npcSellPrice: 4, winterMaxMult: 1.55, localSubsidyBound: false },
  { id: 'frostMint', name: 'Frost Mint', category: 'raw', tier: 2, refPrice: 13.7, npcBuyPrice: 17, npcSellPrice: 9, winterMaxMult: 1.8, localSubsidyBound: false },
  { id: 'mountainBerries', name: 'Mountain Berries', category: 'raw', tier: 1, refPrice: 8, npcBuyPrice: 10, npcSellPrice: 5, winterMaxMult: 1.9, localSubsidyBound: false },

  // Mineable Ores, Diamonds & Crystals (L1 -> L4)
  { id: 'rawStone', name: 'Raw Stone', category: 'ore', tier: 1, refPrice: 3.6, npcBuyPrice: 5, npcSellPrice: 2, winterMaxMult: 1.4, localSubsidyBound: false },
  { id: 'coalChunk', name: 'Coal Chunk', category: 'ore', tier: 1, refPrice: 5.2, npcBuyPrice: 7, npcSellPrice: 3, winterMaxMult: 1.85, localSubsidyBound: false },
  { id: 'copperOre', name: 'Copper Ore', category: 'ore', tier: 1, refPrice: 7.6, npcBuyPrice: 10, npcSellPrice: 5, winterMaxMult: 1.6, localSubsidyBound: false },
  { id: 'ironOre', name: 'Iron Ore', category: 'ore', tier: 2, refPrice: 10.6, npcBuyPrice: 13, npcSellPrice: 7, winterMaxMult: 1.7, localSubsidyBound: false },
  { id: 'silverOre', name: 'Silver Ore', category: 'ore', tier: 3, refPrice: 14.6, npcBuyPrice: 18, npcSellPrice: 10, winterMaxMult: 1.7, localSubsidyBound: false },
  { id: 'goldOre', name: 'Gold Ore', category: 'ore', tier: 3, refPrice: 21.2, npcBuyPrice: 26, npcSellPrice: 15, winterMaxMult: 1.75, localSubsidyBound: false },
  { id: 'rawDiamond', name: 'Uncut Diamond', category: 'ore', tier: 4, refPrice: 30.7, npcBuyPrice: 37, npcSellPrice: 22, winterMaxMult: 1.75, localSubsidyBound: false },
  { id: 'iceCrystal', name: 'Glacier Crystal', category: 'ore', tier: 4, refPrice: 36.6, npcBuyPrice: 44, npcSellPrice: 26, winterMaxMult: 2.0, localSubsidyBound: false },
  { id: 'ancientRelic', name: 'Ancient Yeti Relic', category: 'luxury', tier: 4, refPrice: 56.0, npcBuyPrice: 68, npcSellPrice: 40, winterMaxMult: 1.5, localSubsidyBound: false },

  // Intermediates & Processed Goods
  { id: 'firewood', name: 'Split Firewood', category: 'intermediate', tier: 1, refPrice: 9.0, npcBuyPrice: 11, npcSellPrice: 6, winterMaxMult: 2.0, localSubsidyBound: true },
  { id: 'pinePlanks', name: 'Pine Planks', category: 'intermediate', tier: 1, refPrice: 16.4, npcBuyPrice: 20, npcSellPrice: 11, winterMaxMult: 1.75, localSubsidyBound: false },
  { id: 'flourSack', name: 'Fine Flour', category: 'intermediate', tier: 2, refPrice: 21.4, npcBuyPrice: 26, npcSellPrice: 15, winterMaxMult: 2.0, localSubsidyBound: false },
  { id: 'ironIngot', name: 'Iron Ingot', category: 'intermediate', tier: 2, refPrice: 36.1, npcBuyPrice: 44, npcSellPrice: 25, winterMaxMult: 1.75, localSubsidyBound: false },
  { id: 'goldIngot', name: 'Gold Ingot', category: 'intermediate', tier: 4, refPrice: 73.7, npcBuyPrice: 89, npcSellPrice: 53, winterMaxMult: 1.75, localSubsidyBound: false },

  // Foods & Consumables (Cheapest Act I survival = Fish Stew!)
  { id: 'fishStew', name: 'Hot Fish Stew', category: 'food', tier: 1, refPrice: 20.0, npcBuyPrice: 24, npcSellPrice: 14, winterMaxMult: 1.8, localSubsidyBound: true },
  { id: 'smokedFish', name: 'Smoked Glacier Fish', category: 'food', tier: 2, refPrice: 29.9, npcBuyPrice: 36, npcSellPrice: 21, winterMaxMult: 2.0, localSubsidyBound: false },
  { id: 'mushroomSoup', name: 'Mushroom Soup', category: 'food', tier: 1, refPrice: 22.0, npcBuyPrice: 27, npcSellPrice: 15, winterMaxMult: 1.75, localSubsidyBound: true },
  { id: 'artisanBread', name: 'Artisan Bread', category: 'food', tier: 2, refPrice: 37.9, npcBuyPrice: 46, npcSellPrice: 26, winterMaxMult: 2.0, localSubsidyBound: true },
  { id: 'warmthTea', name: 'Winter Warmth Tea', category: 'food', tier: 2, refPrice: 29.6, npcBuyPrice: 36, npcSellPrice: 21, winterMaxMult: 2.0, localSubsidyBound: true },
];

export function getEconomyItem(id: GameIconKey): EconomyItemSpec | null {
  for (let i = 0; i < ECONOMY_ITEMS.length; i += 1) {
    if (ECONOMY_ITEMS[i].id === id) {
      return ECONOMY_ITEMS[i];
    }
  }

  return null;
}

export const CRAFT_RECIPES: readonly CraftRecipeSpec[] = [
  {
    id: 'craft_fish_stew',
    name: 'Hot Fish Stew',
    outputItemId: 'fishStew',
    outputQty: 1,
    stationLabel: 'Stew Cauldron (Act I)',
    ingredients: [
      { itemId: 'lakeTrout', qty: 1 },
      { itemId: 'firewood', qty: 1 },
    ],
  },
  {
    id: 'craft_firewood',
    name: 'Split Firewood',
    outputItemId: 'firewood',
    outputQty: 2,
    stationLabel: 'Sawmill Block',
    ingredients: [{ itemId: 'pineLog', qty: 1 }],
  },
  {
    id: 'craft_pine_planks',
    name: 'Pine Planks',
    outputItemId: 'pinePlanks',
    outputQty: 1,
    stationLabel: 'Sawmill',
    ingredients: [{ itemId: 'pineLog', qty: 2 }],
  },
  {
    id: 'craft_smoked_fish',
    name: 'Smoked Glacier Fish',
    outputItemId: 'smokedFish',
    outputQty: 1,
    stationLabel: 'Smokehouse',
    ingredients: [
      { itemId: 'lakeTrout', qty: 2 },
      { itemId: 'firewood', qty: 1 },
    ],
  },
  {
    id: 'craft_mushroom_soup',
    name: 'Mushroom Soup',
    outputItemId: 'mushroomSoup',
    outputQty: 1,
    stationLabel: 'Tavern Hearth',
    ingredients: [
      { itemId: 'forestMushroom', qty: 2 },
      { itemId: 'firewood', qty: 1 },
    ],
  },
  {
    id: 'craft_iron_ingot',
    name: 'Iron Ingot',
    outputItemId: 'ironIngot',
    outputQty: 1,
    stationLabel: 'Blast Furnace',
    ingredients: [
      { itemId: 'ironOre', qty: 2 },
      { itemId: 'coalChunk', qty: 1 },
    ],
  },
  {
    id: 'craft_gold_ingot',
    name: 'Gold Ingot',
    outputItemId: 'goldIngot',
    outputQty: 1,
    stationLabel: 'Blast Furnace',
    ingredients: [
      { itemId: 'goldOre', qty: 2 },
      { itemId: 'coalChunk', qty: 2 },
    ],
  },
  {
    id: 'craft_flour',
    name: 'Fine Flour',
    outputItemId: 'flourSack',
    outputQty: 1,
    stationLabel: 'Windmill',
    ingredients: [{ itemId: 'wheatSheaf', qty: 2 }],
  },
  {
    id: 'craft_bread',
    name: 'Artisan Bread',
    outputItemId: 'artisanBread',
    outputQty: 1,
    stationLabel: 'Cozy Bakery',
    ingredients: [
      { itemId: 'flourSack', qty: 1 },
      { itemId: 'firewood', qty: 1 },
    ],
  },
  {
    id: 'craft_warmth_tea',
    name: 'Winter Warmth Tea',
    outputItemId: 'warmthTea',
    outputQty: 1,
    stationLabel: 'Apothecary',
    ingredients: [
      { itemId: 'frostMint', qty: 1 },
      { itemId: 'firewood', qty: 1 },
    ],
  },
];

export const CROP_DEFINITIONS: Record<CropKind, CropDefinition> = {
  turnip: {
    kind: 'turnip',
    name: 'Snow Turnip',
    seedItemId: 'seedTurnip',
    harvestItemId: 'snowTurnip',
    harvestQty: 2,
    growDurationMs: 28_000,
    winterHardy: true,
  },
  maize: {
    kind: 'maize',
    name: 'Maize',
    seedItemId: 'seedMaize',
    harvestItemId: 'maizeCob',
    harvestQty: 2,
    growDurationMs: 32_000,
    winterHardy: false,
  },
  wheat: {
    kind: 'wheat',
    name: 'Wheat',
    seedItemId: 'seedWheat',
    harvestItemId: 'wheatSheaf',
    harvestQty: 2,
    growDurationMs: 30_000,
    winterHardy: false,
  },
  potato: {
    kind: 'potato',
    name: 'Frost Potato',
    seedItemId: 'seedPotato',
    harvestItemId: 'frostPotato',
    harvestQty: 2,
    growDurationMs: 30_000,
    winterHardy: false,
  },
  pumpkin: {
    kind: 'pumpkin',
    name: 'Alpine Pumpkin',
    seedItemId: 'seedPumpkin',
    harvestItemId: 'alpinePumpkin',
    harvestQty: 1,
    growDurationMs: 40_000,
    winterHardy: false,
  },
};

export const INITIAL_POUCH_ENTRIES: readonly PouchEntry[] = [
  { itemId: 'lakeTrout', qty: 3 },
  { itemId: 'fishStew', qty: 2 },
  { itemId: 'firewood', qty: 5 },
  { itemId: 'pineLog', qty: 4 },
  { itemId: 'seedTurnip', qty: 4 },
  { itemId: 'seedPinecone', qty: 4 },
];

export function getPouchQty(
  entries: readonly PouchEntry[],
  itemId: GameIconKey
): number {
  for (let i = 0; i < entries.length; i += 1) {
    if (entries[i].itemId === itemId) {
      return entries[i].qty;
    }
  }

  return 0;
}

export function adjustPouchItem(
  entries: readonly PouchEntry[],
  itemId: GameIconKey,
  delta: number
): PouchEntry[] {
  const next: PouchEntry[] = [];
  let found = false;

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];

    if (entry.itemId === itemId) {
      found = true;
      const updated = Math.max(0, entry.qty + delta);

      if (updated > 0) {
        next.push({ itemId, qty: updated });
      }
    } else if (entry.qty > 0) {
      next.push(entry);
    }
  }

  if (!found && delta > 0) {
    next.push({ itemId, qty: delta });
  }

  return next;
}

export function canCraftRecipe(
  entries: readonly PouchEntry[],
  recipe: CraftRecipeSpec
): boolean {
  for (let i = 0; i < recipe.ingredients.length; i += 1) {
    const ing = recipe.ingredients[i];

    if (getPouchQty(entries, ing.itemId) < ing.qty) {
      return false;
    }
  }

  return true;
}

export function applyCraftRecipe(
  entries: readonly PouchEntry[],
  recipe: CraftRecipeSpec
): PouchEntry[] | null {
  if (!canCraftRecipe(entries, recipe)) {
    return null;
  }

  let next = [...entries];

  for (let i = 0; i < recipe.ingredients.length; i += 1) {
    const ing = recipe.ingredients[i];

    next = adjustPouchItem(next, ing.itemId, -ing.qty);
  }

  return adjustPouchItem(next, recipe.outputItemId, recipe.outputQty);
}

export function getCropGrowthProgress(
  crop: ValleyPlantedCrop,
  nowMs: number
): number {
  const span = Math.max(1, crop.matureAtMs - crop.plantedAtMs);

  return Math.max(0, Math.min(1, (nowMs - crop.plantedAtMs) / span));
}

export function resolveCropSpriteKey(
  crop: ValleyPlantedCrop,
  season: Season,
  nowMs: number
): ResourceNodeKey {
  const def = CROP_DEFINITIONS[crop.cropKind];

  if (season === 'WINTER' && !def.winterHardy) {
    return 'cropWithered';
  }

  const progress = getCropGrowthProgress(crop, nowMs);

  if (progress < 0.18) {
    return 'cropSeedMound';
  }

  if (crop.cropKind === 'turnip') {
    if (progress < 0.55) {
      return 'turnipStage1';
    }

    if (progress < 1) {
      return 'turnipStage2';
    }

    return 'cropSnowTurnip';
  }

  if (crop.cropKind === 'maize') {
    if (progress < 0.55) {
      return 'maizeStage1';
    }

    if (progress < 1) {
      return 'maizeStage2';
    }

    return 'maizeStage3';
  }

  if (crop.cropKind === 'wheat') {
    if (progress < 0.55) {
      return 'wheatStage1';
    }

    if (progress < 1) {
      return 'wheatStage2';
    }

    return 'wheatStage3';
  }

  if (crop.cropKind === 'potato') {
    if (progress < 0.55) {
      return 'potatoStage1';
    }

    if (progress < 1) {
      return 'potatoStage2';
    }

    return 'potatoStage3';
  }

  if (progress < 0.55) {
    return 'pumpkinStage1';
  }

  if (progress < 1) {
    return 'pumpkinStage2';
  }

  return 'pumpkinStage3';
}

function bx(blockX: number): number {
  return VALLEY_BORDER_X + (blockX + 0.5) * VALLEY_BLOCK_PX;
}

function by(blockY: number): number {
  return VALLEY_BORDER_Y + (blockY + 0.5) * VALLEY_BLOCK_PX;
}

/**
 * Interactive world harvestable nodes placed naturally around the Lake, Forest,
 * and North/East rocky ridge so Act I players can immediately Fish, Chop Deadfall,
 * Forage Mushrooms/Frost Mint, and Mine Stone/Coal/Copper/Iron/Gold/Diamonds!
 */
export const VALLEY_WORLD_NODES: readonly WorldResourceNode[] = [
  // Act I Ice-Fishing Hole right on the Fishing Lake
  {
    id: 'world_ice_hole_1',
    spriteKey: 'nodeIceHole',
    label: 'Ice-Fishing Hole',
    x: bx(27.85),
    y: by(48.12),
    drawSize: 112,
    kind: 'FISH_HOLE',
    respawnMs: 8_000,
  },
  // Act I Fallen Pine Deadfall Logs near West Sawmill Woods
  {
    id: 'world_deadfall_1',
    spriteKey: 'nodePineDeadfall',
    label: 'Pine Deadfall Logs',
    x: bx(24.3),
    y: by(48.4),
    drawSize: 108,
    kind: 'DEADFALL',
    respawnMs: 10_000,
  },
  {
    id: 'world_deadfall_2',
    spriteKey: 'nodePineDeadfall',
    label: 'Pine Deadfall Logs',
    x: bx(24.3),
    y: by(49.7),
    drawSize: 108,
    kind: 'DEADFALL',
    respawnMs: 10_000,
  },
  // Forest Foraging: Mushrooms, Frost Mint & Wild Berry Bush
  {
    id: 'world_mushrooms_1',
    spriteKey: 'nodeMushrooms',
    label: 'Forest Mushrooms',
    x: bx(24.35),
    y: by(51.1),
    drawSize: 94,
    kind: 'FORAGE',
    respawnMs: 12_000,
  },
  {
    id: 'world_frost_mint_1',
    spriteKey: 'nodeFrostMint',
    label: 'Frost Mint Patch',
    x: bx(26.15),
    y: by(46.25),
    drawSize: 94,
    kind: 'FORAGE',
    respawnMs: 14_000,
  },
  {
    id: 'world_berry_bush_1',
    spriteKey: 'nodeBerryBush',
    label: 'Wild Berry Bush',
    x: bx(30.45),
    y: by(48.95),
    drawSize: 98,
    kind: 'FORAGE',
    respawnMs: 14_000,
  },
  // Rocky North/East Mining Ridge (L1 Stone/Coal/Copper -> L4 Gold/Diamond/Crystal)
  {
    id: 'world_mine_stone',
    spriteKey: 'nodeStone',
    label: 'Quarry Stone (L1)',
    x: bx(29.75),
    y: by(46.45),
    drawSize: 102,
    kind: 'MINE_L1',
    respawnMs: 10_000,
  },
  {
    id: 'world_mine_coal',
    spriteKey: 'nodeCoal',
    label: 'Coal Outcrop (L1)',
    x: bx(30.45),
    y: by(46.75),
    drawSize: 102,
    kind: 'MINE_L1',
    respawnMs: 10_000,
  },
  {
    id: 'world_mine_copper',
    spriteKey: 'nodeCopper',
    label: 'Copper Vein (L1)',
    x: bx(29.85),
    y: by(47.25),
    drawSize: 102,
    kind: 'MINE_L1',
    respawnMs: 12_000,
  },
  {
    id: 'world_mine_iron',
    spriteKey: 'nodeIron',
    label: 'Iron Ore Vein (L2)',
    x: bx(30.65),
    y: by(47.55),
    drawSize: 106,
    kind: 'MINE_L2',
    respawnMs: 14_000,
  },
  {
    id: 'world_mine_gold',
    spriteKey: 'nodeGold',
    label: 'Gold Ore Vein (L3)',
    x: bx(30.95),
    y: by(46.25),
    drawSize: 108,
    kind: 'MINE_L3',
    respawnMs: 18_000,
  },
  {
    id: 'world_mine_diamond',
    spriteKey: 'nodeDiamond',
    label: 'Diamond Vein (L4)',
    x: bx(31.45),
    y: by(46.95),
    drawSize: 112,
    kind: 'MINE_L4',
    respawnMs: 22_000,
  },
  {
    id: 'world_mine_crystal',
    spriteKey: 'nodeIceCrystal',
    label: 'Glacier Crystal (L4)',
    x: bx(26.45),
    y: by(48.18),
    drawSize: 104,
    kind: 'MINE_L4',
    respawnMs: 22_000,
  },
];

interface WeightedDrop {
  readonly itemId: GameIconKey;
  readonly prob: number;
}

const MINE_L1_TABLE: readonly WeightedDrop[] = [
  { itemId: 'rawStone', prob: 0.5 },
  { itemId: 'coalChunk', prob: 0.28 },
  { itemId: 'copperOre', prob: 0.19 },
  { itemId: 'ironOre', prob: 0.03 },
];

const MINE_L2_TABLE: readonly WeightedDrop[] = [
  { itemId: 'rawStone', prob: 0.18 },
  { itemId: 'coalChunk', prob: 0.26 },
  { itemId: 'copperOre', prob: 0.22 },
  { itemId: 'ironOre', prob: 0.29 },
  { itemId: 'silverOre', prob: 0.05 },
];

const MINE_L3_TABLE: readonly WeightedDrop[] = [
  { itemId: 'coalChunk', prob: 0.18 },
  { itemId: 'ironOre', prob: 0.34 },
  { itemId: 'silverOre', prob: 0.28 },
  { itemId: 'goldOre', prob: 0.16 },
  { itemId: 'rawDiamond', prob: 0.04 },
];

const MINE_L4_TABLE: readonly WeightedDrop[] = [
  { itemId: 'ironOre', prob: 0.28 },
  { itemId: 'silverOre', prob: 0.26 },
  { itemId: 'goldOre', prob: 0.24 },
  { itemId: 'rawDiamond', prob: 0.12 },
  { itemId: 'iceCrystal', prob: 0.08 },
  { itemId: 'ancientRelic', prob: 0.02 },
];

function pickWeighted(table: readonly WeightedDrop[], roll: number): GameIconKey {
  let acc = 0;

  for (let i = 0; i < table.length; i += 1) {
    acc += table[i].prob;

    if (roll <= acc) {
      return table[i].itemId;
    }
  }

  return table[table.length - 1].itemId;
}

export function harvestWorldNode(
  node: WorldResourceNode,
  roll: number
): GatherOutcome {
  if (node.kind === 'FISH_HOLE') {
    const isCarp = roll > 0.82;
    const itemId: GameIconKey = isCarp ? 'frostCarp' : 'lakeTrout';

    return {
      itemId,
      itemName: isCarp ? 'Frost Carp' : 'Lake Trout',
      qty: 1,
      bonusCoins: 0,
    };
  }

  if (node.kind === 'DEADFALL') {
    return {
      itemId: 'pineLog',
      itemName: 'Pine Log',
      qty: 2,
      bonusCoins: 0,
    };
  }

  if (node.kind === 'FORAGE') {
    if (node.spriteKey === 'nodeFrostMint') {
      return { itemId: 'frostMint', itemName: 'Frost Mint', qty: 1, bonusCoins: 0 };
    }

    if (node.spriteKey === 'nodeBerryBush') {
      return {
        itemId: 'mountainBerries',
        itemName: 'Mountain Berries',
        qty: 2,
        bonusCoins: 0,
      };
    }

    return {
      itemId: 'forestMushroom',
      itemName: 'Forest Mushrooms',
      qty: 2,
      bonusCoins: 0,
    };
  }

  const table =
    node.kind === 'MINE_L4'
      ? MINE_L4_TABLE
      : node.kind === 'MINE_L3'
        ? MINE_L3_TABLE
        : node.kind === 'MINE_L2'
          ? MINE_L2_TABLE
          : MINE_L1_TABLE;

  const pickedId = pickWeighted(table, roll);
  const spec = getEconomyItem(pickedId);

  return {
    itemId: pickedId,
    itemName: spec !== null ? spec.name : pickedId,
    qty: 1,
    bonusCoins: 0,
  };
}
