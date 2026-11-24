// Auto-generated & maintained world geometry for the 5,600-block 800s Alpine Valley.

export type DynamicPatchKind = "PATH" | "PLANTING";

export type TownBuildingSpriteKey =
  | "townHall"
  | "bank"
  | "blacksmith"
  | "tradePost"
  | "yetiLodge"
  | "cottage"
  | "bakery"
  | "windmill"
  | "sawmill"
  | "builderShop"
  | "yakBarn"
  | "cheeseCellar"
  | "fishingPier"
  | "smokehouse";

export interface ValleyZoneRect {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ValleyLakeZone extends ValleyZoneRect {
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
}

export type BuildingFacing = 0 | 1 | 2 | 3;

export interface ValleyBuildingPlacement {
  readonly id: string;
  readonly spriteKey: TownBuildingSpriteKey;
  readonly blockX: number;
  readonly blockY: number;
  readonly drawWidth: number;
  readonly facing?: BuildingFacing;
}

export interface StoredValleyBuilding {
  readonly id: string;
  readonly spriteKey: TownBuildingSpriteKey;
  readonly blockX: number;
  readonly blockY: number;
  readonly drawWidth: number;
  readonly facing: BuildingFacing;
}

export const VALLEY_BUILDING_LABELS = {
  townHall: 'Town Hall',
  bank: 'Town Bank & Treasury',
  blacksmith: 'Yeti Blacksmith',
  tradePost: 'Market Trade Post',
  yetiLodge: 'Yeti Lodge',
  cottage: 'Citizen Cottage',
  bakery: 'Cozy Bakery',
  windmill: 'Windmill Cottage',
  sawmill: 'Cozy Sawmill',
  builderShop: 'Builder Workshop',
  yakBarn: 'Yak Barn',
  cheeseCellar: 'Alpine Cheese Cellar',
  fishingPier: 'Lakeside Fishing Pier',
  smokehouse: 'Medieval Smokehouse',
} as const satisfies Record<TownBuildingSpriteKey, string>;

export interface ValleyStreetSegment {
  readonly id: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly width: number;
}

export interface ValleyStreetProp {
  readonly id: string;
  readonly spriteKey: "stoneWell" | "streetLantern" | "signpost";
  readonly x: number;
  readonly y: number;
  readonly drawWidth: number;
  readonly glowRadius?: number;
}

export interface ValleyPlantedTree {
  readonly id: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly plantedAtMs: number;
  readonly matureAtMs: number;
}

/**
 * 200x Scale Strict 4x4 Grid-Per-Block Architecture:
 * - Every Land Block is strictly a 4x4 grid of 84x84px tiles (336x336px per block).
 * - Playable Town = 56 blocks wide x 100 blocks tall = 5,600 blocks (89,600 tiles).
 * - Framed by a 3-block (1008px) Pine Forest perimeter on all 4 sides.
 * - Viewport-culled renderer draws ONLY visible screen + 5 blocks buffer on all sides.
 */
export const BLOCK_GRID_SIZE = 4;
export const VALLEY_TILE_PX = 84;
export const VALLEY_BLOCK_PX = 336;
export const VALLEY_BLOCK_COLS = 56;
export const VALLEY_BLOCK_ROWS = 100;
export const VALLEY_TILE_COLS = 224;
export const VALLEY_TILE_ROWS = 400;
export const VALLEY_BORDER_BLOCKS = 3;
export const VALLEY_CULL_BUFFER_BLOCKS = 5;

export const VALLEY_BORDER_X = 1008;
export const VALLEY_BORDER_Y = 1008;
export const VALLEY_WORLD_WIDTH = 20832;
export const VALLEY_WORLD_HEIGHT = 35616;

// Starting focus centered right on the bustling 800s Town Square & Fishing Lake
export const VALLEY_SPAWN_FOCUS_X = VALLEY_BORDER_X + 27.5 * VALLEY_BLOCK_PX;
export const VALLEY_SPAWN_FOCUS_Y = VALLEY_BORDER_Y + 49.6 * VALLEY_BLOCK_PX;

export const VALLEY_TREE_GROW_MS = 24_000;
export const VALLEY_TREE_STAGE_THRESHOLDS: readonly number[] = [0.3, 0.65, 1];

export const VALLEY_PLAYABLE_BOUNDS: ValleyZoneRect = {
  id: "playable_valley",
  x: VALLEY_BORDER_X,
  y: VALLEY_BORDER_Y,
  width: VALLEY_BLOCK_COLS * VALLEY_BLOCK_PX,
  height: VALLEY_BLOCK_ROWS * VALLEY_BLOCK_PX,
};

export const VALLEY_LAKE_ZONE: ValleyLakeZone = {
  id: "fishing_lake",
  tileX: 108,
  tileY: 192,
  tileW: 8,
  tileH: 4,
  x: 10118,
  y: 17136,
  width: 596,
  height: 336,
};

/**
 * Full 800s Alpine Village Layout arranged naturally around the Fishing Lake & Town Plaza.
 * Sorted back-to-front by blockY so 2.5D roofs overlap cleanly.
 */
export const VALLEY_STARTER_BUILDINGS: readonly ValleyBuildingPlacement[] = [
  // Row 46: Civic Crown (Town Hall & Bank Treasury overlooking the lake)
  {
    id: "bld_town_hall",
    spriteKey: "townHall",
    blockX: 27,
    blockY: 46,
    drawWidth: 382,
  },
  { id: "bld_bank", spriteKey: "bank", blockX: 28, blockY: 46, drawWidth: 356 },

  // Row 47: North-West Residential Edge
  {
    id: "bld_cottage_nw",
    spriteKey: "cottage",
    blockX: 25,
    blockY: 47,
    drawWidth: 306,
  },

  // Row 48: Timber & Lakefront Row (Sawmill on West, Fishing Pier anchored on East shore)
  {
    id: "bld_sawmill",
    spriteKey: "sawmill",
    blockX: 25,
    blockY: 48,
    drawWidth: 342,
  },
  {
    id: "bld_fishing_pier",
    spriteKey: "fishingPier",
    blockX: 29,
    blockY: 48,
    drawWidth: 352,
  },

  // Row 49: Main Street North (Builder, Windmill, Trade Post, Cozy Bakery, Smokehouse)
  {
    id: "bld_builder",
    spriteKey: "builderShop",
    blockX: 25,
    blockY: 49,
    drawWidth: 336,
  },
  {
    id: "bld_windmill",
    spriteKey: "windmill",
    blockX: 26,
    blockY: 49,
    drawWidth: 320,
  },
  {
    id: "bld_trade_post",
    spriteKey: "tradePost",
    blockX: 27,
    blockY: 49,
    drawWidth: 344,
  },
  {
    id: "bld_bakery",
    spriteKey: "bakery",
    blockX: 28,
    blockY: 49,
    drawWidth: 330,
  },
  {
    id: "bld_smokehouse",
    spriteKey: "smokehouse",
    blockX: 29,
    blockY: 49,
    drawWidth: 330,
  },

  // Row 50: East Village Cottage (Central Row 50 stays open as Main Village Street & Plaza)
  {
    id: "bld_cottage_east",
    spriteKey: "cottage",
    blockX: 30,
    blockY: 50,
    drawWidth: 306,
  },

  // Row 51: South Craft, Home & Ranch Row (Cottage, Blacksmith, Yeti Lodge, Cheese Cellar, Yak Barn)
  {
    id: "bld_cottage_sw",
    spriteKey: "cottage",
    blockX: 25,
    blockY: 51,
    drawWidth: 306,
  },
  {
    id: "bld_blacksmith",
    spriteKey: "blacksmith",
    blockX: 26,
    blockY: 51,
    drawWidth: 348,
  },
  {
    id: "bld_yeti_lodge",
    spriteKey: "yetiLodge",
    blockX: 27,
    blockY: 51,
    drawWidth: 340,
  },
  {
    id: "bld_cheese_cellar",
    spriteKey: "cheeseCellar",
    blockX: 28,
    blockY: 51,
    drawWidth: 318,
  },
  {
    id: "bld_yak_barn",
    spriteKey: "yakBarn",
    blockX: 29,
    blockY: 51,
    drawWidth: 350,
  },
];

function blockCenterX(blockX: number): number {
  return VALLEY_BORDER_X + (blockX + 0.5) * VALLEY_BLOCK_PX;
}

function blockCenterY(blockY: number): number {
  return VALLEY_BORDER_Y + (blockY + 0.5) * VALLEY_BLOCK_PX;
}

/**
 * Connected 800s Village Street Network linking every shop, home, dock, and civic landmark.
 */
export const VALLEY_STREET_SEGMENTS: readonly ValleyStreetSegment[] = [
  // Main East-West Village Boulevard across Row 50
  {
    id: "street_main_ew",
    x1: blockCenterX(24.7),
    y1: blockCenterY(50),
    x2: blockCenterX(30.1),
    y2: blockCenterY(50),
    width: 112,
  },
  // North Civic Avenue (Town Hall & Bank down to Lakefront Promenade)
  {
    id: "street_civic_ns",
    x1: blockCenterX(27.5),
    y1: blockCenterY(46.8),
    x2: blockCenterX(27.5),
    y2: blockCenterY(47.6),
    width: 104,
  },
  // Lakefront Promenade running across Row 47 (above lake)
  {
    id: "street_lake_north",
    x1: blockCenterX(25.5),
    y1: blockCenterY(47.4),
    x2: blockCenterX(29.3),
    y2: blockCenterY(47.4),
    width: 84,
  },
  // West Artisan Lane (Sawmill -> Builder -> Windmill -> Blacksmith)
  {
    id: "street_west_lane",
    x1: blockCenterX(25.9),
    y1: blockCenterY(47.4),
    x2: blockCenterX(25.9),
    y2: blockCenterY(51.4),
    width: 86,
  },
  // East Harbor & Ranch Lane (Fishing Pier -> Smokehouse -> Yak Barn)
  {
    id: "street_east_lane",
    x1: blockCenterX(29.0),
    y1: blockCenterY(47.4),
    x2: blockCenterX(29.0),
    y2: blockCenterY(51.4),
    width: 86,
  },
  // South Village Farm Road extending south from Central Plaza into open farmland
  {
    id: "street_south_farm",
    x1: blockCenterX(27.5),
    y1: blockCenterY(50),
    x2: blockCenterX(27.5),
    y2: blockCenterY(53.2),
    width: 96,
  },
];

export const VALLEY_PLAZA_CENTER = {
  x: blockCenterX(27.5),
  y: blockCenterY(50),
  rx: 155,
  ry: 118,
} as const;

/**
 * Hand-placed 800s street realism props lining the cobblestone avenues & Town Plaza:
 * - Central Stone Well in the heart of the Plaza roundabout
 * - 8 glowing Iron & Oak Street Lanterns with warm candlelight halos
 * - 3 Wooden Crossroads Signposts with barrels & crates
 */
export const VALLEY_STREET_PROPS: readonly ValleyStreetProp[] = [
  // Town Plaza Centerpiece Well
  {
    id: "prop_plaza_well",
    spriteKey: "stoneWell",
    x: blockCenterX(27.5),
    y: blockCenterY(50.02),
    drawWidth: 164,
  },
  // 8 Glowing Street Lanterns framing the Plaza, Civic Row, & Craft Lanes
  {
    id: "lamp_plaza_nw",
    spriteKey: "streetLantern",
    x: blockCenterX(26.74),
    y: blockCenterY(49.78),
    drawWidth: 56,
    glowRadius: 54,
  },
  {
    id: "lamp_plaza_ne",
    spriteKey: "streetLantern",
    x: blockCenterX(28.26),
    y: blockCenterY(49.78),
    drawWidth: 56,
    glowRadius: 54,
  },
  {
    id: "lamp_plaza_sw",
    spriteKey: "streetLantern",
    x: blockCenterX(26.74),
    y: blockCenterY(50.34),
    drawWidth: 56,
    glowRadius: 54,
  },
  {
    id: "lamp_plaza_se",
    spriteKey: "streetLantern",
    x: blockCenterX(28.26),
    y: blockCenterY(50.34),
    drawWidth: 56,
    glowRadius: 54,
  },
  {
    id: "lamp_west_craft",
    spriteKey: "streetLantern",
    x: blockCenterX(25.68),
    y: blockCenterY(48.92),
    drawWidth: 54,
    glowRadius: 50,
  },
  {
    id: "lamp_east_harbor",
    spriteKey: "streetLantern",
    x: blockCenterX(29.24),
    y: blockCenterY(48.92),
    drawWidth: 54,
    glowRadius: 50,
  },
  {
    id: "lamp_civic_promenade",
    spriteKey: "streetLantern",
    x: blockCenterX(27.5),
    y: blockCenterY(47.24),
    drawWidth: 56,
    glowRadius: 54,
  },
  {
    id: "lamp_south_farm_gate",
    spriteKey: "streetLantern",
    x: blockCenterX(27.84),
    y: blockCenterY(52.2),
    drawWidth: 54,
    glowRadius: 50,
  },
  // 3 Wooden Crossroads Signposts with Barrels & Crates
  {
    id: "sign_plaza_south",
    spriteKey: "signpost",
    x: blockCenterX(27.08),
    y: blockCenterY(50.56),
    drawWidth: 88,
  },
  {
    id: "sign_west_junction",
    spriteKey: "signpost",
    x: blockCenterX(25.54),
    y: blockCenterY(50.32),
    drawWidth: 86,
  },
  {
    id: "sign_east_junction",
    spriteKey: "signpost",
    x: blockCenterX(29.42),
    y: blockCenterY(50.32),
    drawWidth: 86,
  },
];

interface StarterTreeSeed {
  readonly tileX: number;
  readonly tileY: number;
  readonly growthRatio: number;
}

// Scenic starter pine trees framing the 800s village (mix of Mature, Young & Growing Saplings)
const STARTER_VALLEY_TREES: readonly StarterTreeSeed[] = [
  { tileX: 98, tileY: 185, growthRatio: 1 },
  { tileX: 105, tileY: 183, growthRatio: 1 },
  { tileX: 117, tileY: 184, growthRatio: 0.72 },
  { tileX: 121, tileY: 187, growthRatio: 1 },
  { tileX: 97, tileY: 193, growthRatio: 0.85 },
  { tileX: 96, tileY: 201, growthRatio: 1 },
  { tileX: 123, tileY: 195, growthRatio: 1 },
  { tileX: 125, tileY: 203, growthRatio: 0.45 },
  { tileX: 97, tileY: 209, growthRatio: 1 },
  { tileX: 102, tileY: 211, growthRatio: 0.25 },
  { tileX: 119, tileY: 210, growthRatio: 1 },
  { tileX: 123, tileY: 212, growthRatio: 0.7 },
  { tileX: 107, tileY: 214, growthRatio: 0.2 },
  { tileX: 114, tileY: 214, growthRatio: 0.55 },
];

export function createStarterValleyTrees(nowMs: number): ValleyPlantedTree[] {
  const trees: ValleyPlantedTree[] = [];

  for (let i = 0; i < STARTER_VALLEY_TREES.length; i += 1) {
    const seed = STARTER_VALLEY_TREES[i];
    const elapsed = Math.round(VALLEY_TREE_GROW_MS * seed.growthRatio);
    const plantedAtMs = nowMs - elapsed;

    trees.push({
      id: `vtree_${seed.tileX}_${seed.tileY}`,
      tileX: seed.tileX,
      tileY: seed.tileY,
      plantedAtMs,
      matureAtMs: plantedAtMs + VALLEY_TREE_GROW_MS,
    });
  }

  return trees;
}

export function getTreeGrowthProgress(
  tree: ValleyPlantedTree,
  nowMs: number,
): number {
  const span = tree.matureAtMs - tree.plantedAtMs;

  if (span <= 0) {
    return 1;
  }

  const ratio = (nowMs - tree.plantedAtMs) / span;

  if (ratio <= 0) {
    return 0;
  }

  if (ratio >= 1) {
    return 1;
  }

  return ratio;
}

export function computeNextValleyTreeWakeupMs(
  trees: readonly ValleyPlantedTree[],
  nowMs: number,
): number | null {
  let earliestMs: number | null = null;

  for (let i = 0; i < trees.length; i += 1) {
    const t = trees[i];

    if (nowMs >= t.matureAtMs) {
      continue;
    }

    const span = t.matureAtMs - t.plantedAtMs;

    for (let s = 0; s < VALLEY_TREE_STAGE_THRESHOLDS.length; s += 1) {
      const targetMs =
        t.plantedAtMs + Math.ceil(span * VALLEY_TREE_STAGE_THRESHOLDS[s]);

      if (targetMs > nowMs && (earliestMs === null || targetMs < earliestMs)) {
        earliestMs = targetMs;
      }
    }
  }

  return earliestMs;
}

export function isLakeTile(tx: number, ty: number): boolean {
  return (
    tx >= VALLEY_LAKE_ZONE.tileX &&
    tx < VALLEY_LAKE_ZONE.tileX + VALLEY_LAKE_ZONE.tileW &&
    ty >= VALLEY_LAKE_ZONE.tileY &&
    ty < VALLEY_LAKE_ZONE.tileY + VALLEY_LAKE_ZONE.tileH
  );
}

export function isBlockOverlappingLake(
  blockX: number,
  blockY: number,
): boolean {
  const blockMinX = VALLEY_BORDER_X + blockX * VALLEY_BLOCK_PX;
  const blockMaxX = blockMinX + VALLEY_BLOCK_PX;
  const blockMinY = VALLEY_BORDER_Y + blockY * VALLEY_BLOCK_PX;
  const blockMaxY = blockMinY + VALLEY_BLOCK_PX;

  const lakeMinX = VALLEY_LAKE_ZONE.x;
  const lakeMaxX = VALLEY_LAKE_ZONE.x + VALLEY_LAKE_ZONE.width;
  const lakeMinY = VALLEY_LAKE_ZONE.y;
  const lakeMaxY = VALLEY_LAKE_ZONE.y + VALLEY_LAKE_ZONE.height;

  return (
    blockMinX < lakeMaxX &&
    blockMaxX > lakeMinX &&
    blockMinY < lakeMaxY &&
    blockMaxY > lakeMinY
  );
}

export function isBlockOccupiedByBuilding(
  blockX: number,
  blockY: number,
  buildings: readonly ValleyBuildingPlacement[] = VALLEY_STARTER_BUILDINGS,
  ignoreBuildingId?: string
): boolean {
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];

    if (
      b.id !== ignoreBuildingId &&
      b.blockX === blockX &&
      b.blockY === blockY
    ) {
      return true;
    }
  }

  return false;
}

export function isBlockBlockedForSoil(
  blockX: number,
  blockY: number,
  buildings: readonly ValleyBuildingPlacement[] = VALLEY_STARTER_BUILDINGS
): boolean {
  if (
    isBlockOverlappingLake(blockX, blockY) ||
    isBlockOccupiedByBuilding(blockX, blockY, buildings)
  ) {
    return true;
  }

  // Keep Central Village Plaza (Row 50, Cols 27 & 28) clean as open main street
  if (blockY === 50 && (blockX === 27 || blockX === 28)) {
    return true;
  }

  return false;
}

export function canPlaceBuildingOnBlock(
  blockX: number,
  blockY: number,
  buildings: readonly ValleyBuildingPlacement[],
  movingBuildingId: string
): boolean {
  if (
    blockX < 0 ||
    blockX >= VALLEY_BLOCK_COLS ||
    blockY < 0 ||
    blockY >= VALLEY_BLOCK_ROWS
  ) {
    return false;
  }

  if (isBlockOverlappingLake(blockX, blockY)) {
    return false;
  }

  // Keep Central Village Plaza Stone Well open for streets & citizens
  if (blockY === 50 && (blockX === 27 || blockX === 28)) {
    return false;
  }

  return !isBlockOccupiedByBuilding(blockX, blockY, buildings, movingBuildingId);
}
