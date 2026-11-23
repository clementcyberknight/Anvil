import { VALLEY_MAP_HEIGHT, VALLEY_MAP_WIDTH } from '@/game/town-atlas';
import type {
  BuildingBlueprint,
  BuildingEntity,
  BuildingKind,
  CitizenRequest,
  CropEntity,
  FencePlacement,
  OreNodeEntity,
  ScreenPoint,
  Season,
  SubsidyPolicy,
  TerrainType,
  TileCoord,
  TreeEntity,
} from '@/game/types';

export const MAP_COLS = 20;
export const MAP_ROWS = 20;
export const MAP_TOTAL_TILES = MAP_COLS * MAP_ROWS;

// Native 1.2x world projection of the 1672x941 painted valley map
export const WORLD_SCALE = 1.2;
export const WORLD_WIDTH = Math.round(VALLEY_MAP_WIDTH * WORLD_SCALE);
export const WORLD_HEIGHT = Math.round(VALLEY_MAP_HEIGHT * WORLD_SCALE);

// 2:1 Isometric diamond geometry calibrated to the central valley clearing
export const ISO_TILE_W = 114;
export const ISO_TILE_H = 57;
export const ISO_HALF_W = ISO_TILE_W / 2;
export const ISO_HALF_H = ISO_TILE_H / 2;
export const ISO_ORIGIN_X = WORLD_WIDTH / 2;
export const ISO_ORIGIN_Y = 175;

export const YETI_SPAWN_TILE: TileCoord = { gx: 9, gy: 9 };

export const TREE_GROW_DURATION_MS = 22_000;
export const MAIZE_GROW_DURATION_MS = 16_000;
export const ORE_RESPAWN_DURATION_MS = 20_000;
export const WATER_SPEEDUP_FACTOR = 0.7;

const TREE_STAGE_THRESHOLDS: readonly number[] = [0.35, 0.75, 1];
const CROP_STAGE_THRESHOLDS: readonly number[] = [0.35, 0.72, 1];

export const TERRAIN_CODE = {
  VILLAGE_GRASS: 0,
  VILLAGE_PATH: 1,
  FARM_SOIL: 2,
  PINE_FOREST: 3,
  WATER_LAKE: 4,
  MOUNTAIN_ROCK: 5,
} as const;

const CODE_TO_TERRAIN: readonly TerrainType[] = [
  'VILLAGE_GRASS',
  'VILLAGE_PATH',
  'FARM_SOIL',
  'PINE_FOREST',
  'WATER_LAKE',
  'MOUNTAIN_ROCK',
];

export const BUILDING_SPECS = {
  TOWN_HALL: {
    kind: 'TOWN_HALL',
    label: 'Town Hall',
    width: 2,
    height: 2,
    woodCost: 0,
    stoneCost: 0,
    coinCost: 0,
    accentColor: '#40A7FC',
    roofColor: '#1E293B',
    wallColor: '#F8FAFC',
  },
  WINDMILL: {
    kind: 'WINDMILL',
    label: 'Windmill Cottage',
    width: 2,
    height: 2,
    woodCost: 5,
    stoneCost: 2,
    coinCost: 40,
    accentColor: '#C0CEF5',
    roofColor: '#2563EB',
    wallColor: '#FFFBEB',
  },
  BAKERY: {
    kind: 'BAKERY',
    label: 'Cozy Bakery',
    width: 2,
    height: 2,
    woodCost: 6,
    stoneCost: 3,
    coinCost: 60,
    accentColor: '#40A7FC',
    roofColor: '#B45309',
    wallColor: '#FEF3C7',
  },
  SAWMILL: {
    kind: 'SAWMILL',
    label: 'Sawmill',
    width: 2,
    height: 2,
    woodCost: 6,
    stoneCost: 2,
    coinCost: 50,
    accentColor: '#10B981',
    roofColor: '#065F46',
    wallColor: '#ECFDF5',
  },
  BLACKSMITH: {
    kind: 'BLACKSMITH',
    label: 'Anvil Forge',
    width: 2,
    height: 2,
    woodCost: 5,
    stoneCost: 5,
    coinCost: 80,
    accentColor: '#40A7FC',
    roofColor: '#0F172A',
    wallColor: '#E2E8F0',
  },
  STORAGE_CHEST: {
    kind: 'STORAGE_CHEST',
    label: 'Storage Chest',
    width: 1,
    height: 1,
    woodCost: 3,
    stoneCost: 0,
    coinCost: 20,
    accentColor: '#92400E',
    roofColor: '#78350F',
    wallColor: '#D97706',
  },
} as const satisfies Record<BuildingKind, BuildingBlueprint>;

export const FARM_FENCES: readonly FencePlacement[] = [
  { id: 'fence_ne_1', gx: 5, gy: 7.34, axis: 'LEFT' },
  { id: 'fence_ne_2', gx: 6, gy: 7.34, axis: 'LEFT' },
  { id: 'fence_ne_3', gx: 7, gy: 7.34, axis: 'LEFT' },
  { id: 'fence_nw_1', gx: 4.34, gy: 8, axis: 'RIGHT' },
  { id: 'fence_nw_2', gx: 4.34, gy: 9, axis: 'RIGHT' },
  { id: 'fence_nw_3', gx: 4.34, gy: 10, axis: 'RIGHT' },
];

export const CITIZEN_REQUEST_POOL: readonly CitizenRequest[] = [
  {
    id: 'req_mabel_bread',
    citizenName: 'Mabel',
    occupation: 'Baker',
    itemKey: 'bread',
    itemLabel: 'Artisan Loaf Bread',
    quantity: 2,
    baseRewardCoins: 76,
  },
  {
    id: 'req_nora_maize',
    citizenName: 'Nora',
    occupation: 'Miller',
    itemKey: 'maize',
    itemLabel: 'Maize',
    quantity: 3,
    baseRewardCoins: 34,
  },
  {
    id: 'req_torg_wood',
    citizenName: 'Torg',
    occupation: 'Lumberjack',
    itemKey: 'wood',
    itemLabel: 'Pine Wood',
    quantity: 4,
    baseRewardCoins: 36,
  },
];

export function isoToScreen(gx: number, gy: number): ScreenPoint {
  return {
    x: ISO_ORIGIN_X + (gx - gy) * ISO_HALF_W,
    y: ISO_ORIGIN_Y + (gx + gy) * ISO_HALF_H,
  };
}

export function screenToIso(worldX: number, worldY: number): TileCoord {
  const dx = (worldX - ISO_ORIGIN_X) / ISO_HALF_W;
  const dy = (worldY - ISO_ORIGIN_Y) / ISO_HALF_H;

  return {
    gx: Math.round((dx + dy) * 0.5),
    gy: Math.round((dy - dx) * 0.5),
  };
}

export function isPointInPond(worldX: number, worldY: number): boolean {
  return worldX >= 450 && worldX <= 1340 && worldY >= 0 && worldY <= 215;
}

export function toTileKey(gx: number, gy: number): number {
  return gy * MAP_COLS + gx;
}

function computeTerrainCode(gx: number, gy: number): number {
  if (gx <= 0 || gy <= 0 || gx >= MAP_COLS - 1 || gy >= MAP_ROWS - 1) {
    return TERRAIN_CODE.MOUNTAIN_ROCK;
  }

  // Painted border forests & snow cliffs outside the playable valley oval
  if (gx + gy <= 4 || gx + gy >= 31) {
    return TERRAIN_CODE.MOUNTAIN_ROCK;
  }

  if (Math.abs(gx - gy) >= 11) {
    return TERRAIN_CODE.MOUNTAIN_ROCK;
  }

  if (gx >= 5 && gx <= 7 && gy >= 8 && gy <= 10) {
    return TERRAIN_CODE.FARM_SOIL;
  }

  if (gx <= 4 || gx >= 13) {
    return TERRAIN_CODE.PINE_FOREST;
  }

  return TERRAIN_CODE.VILLAGE_GRASS;
}

export const TERRAIN_BUFFER: Uint8Array = (() => {
  const buf = new Uint8Array(MAP_TOTAL_TILES);

  for (let gy = 0; gy < MAP_ROWS; gy += 1) {
    for (let gx = 0; gx < MAP_COLS; gx += 1) {
      buf[gy * MAP_COLS + gx] = computeTerrainCode(gx, gy);
    }
  }

  return buf;
})();

export function getTerrainCodeAt(gx: number, gy: number): number {
  if (gx < 0 || gx >= MAP_COLS || gy < 0 || gy >= MAP_ROWS) {
    return TERRAIN_CODE.MOUNTAIN_ROCK;
  }

  return TERRAIN_BUFFER[gy * MAP_COLS + gx];
}

export function getTerrainAt(gx: number, gy: number): TerrainType {
  const code = getTerrainCodeAt(gx, gy);

  return CODE_TO_TERRAIN[code] ?? 'MOUNTAIN_ROCK';
}

export function isTerrainWalkable(terrain: TerrainType, season: Season): boolean {
  if (terrain === 'MOUNTAIN_ROCK') {
    return false;
  }

  if (terrain === 'WATER_LAKE') {
    return season === 'WINTER';
  }

  return true;
}

export function isTerrainBuildable(terrain: TerrainType): boolean {
  return terrain === 'VILLAGE_GRASS' || terrain === 'PINE_FOREST';
}

export interface SpatialWorldIndex {
  readonly occupancy: Uint8Array;
  readonly treeByTile: ReadonlyMap<number, TreeEntity>;
  readonly cropByTile: ReadonlyMap<number, CropEntity>;
  readonly buildingByTile: ReadonlyMap<number, BuildingEntity>;
  readonly oreByTile: ReadonlyMap<number, OreNodeEntity>;
}

export function buildSpatialIndex(
  trees: readonly TreeEntity[],
  crops: readonly CropEntity[],
  buildings: readonly BuildingEntity[],
  ores: readonly OreNodeEntity[]
): SpatialWorldIndex {
  const occupancy = new Uint8Array(MAP_TOTAL_TILES);
  const treeByTile = new Map<number, TreeEntity>();
  const cropByTile = new Map<number, CropEntity>();
  const buildingByTile = new Map<number, BuildingEntity>();
  const oreByTile = new Map<number, OreNodeEntity>();

  for (let i = 0; i < trees.length; i += 1) {
    const tree = trees[i];

    if (tree.gx >= 0 && tree.gx < MAP_COLS && tree.gy >= 0 && tree.gy < MAP_ROWS) {
      const key = tree.gy * MAP_COLS + tree.gx;

      occupancy[key] = 1;
      treeByTile.set(key, tree);
    }
  }

  for (let i = 0; i < crops.length; i += 1) {
    const crop = crops[i];

    if (crop.gx >= 0 && crop.gx < MAP_COLS && crop.gy >= 0 && crop.gy < MAP_ROWS) {
      const key = crop.gy * MAP_COLS + crop.gx;

      occupancy[key] = 2;
      cropByTile.set(key, crop);
    }
  }

  for (let i = 0; i < buildings.length; i += 1) {
    const bld = buildings[i];

    for (let dy = 0; dy < bld.height; dy += 1) {
      for (let dx = 0; dx < bld.width; dx += 1) {
        const tx = bld.gx + dx;
        const ty = bld.gy + dy;

        if (tx >= 0 && tx < MAP_COLS && ty >= 0 && ty < MAP_ROWS) {
          const key = ty * MAP_COLS + tx;

          occupancy[key] = 3;
          buildingByTile.set(key, bld);
        }
      }
    }
  }

  for (let i = 0; i < ores.length; i += 1) {
    const ore = ores[i];

    if (ore.gx >= 0 && ore.gx < MAP_COLS && ore.gy >= 0 && ore.gy < MAP_ROWS) {
      const key = ore.gy * MAP_COLS + ore.gx;

      occupancy[key] = 4;
      oreByTile.set(key, ore);
    }
  }

  return {
    occupancy,
    treeByTile,
    cropByTile,
    buildingByTile,
    oreByTile,
  };
}

export function canPlaceBuilding(
  gx: number,
  gy: number,
  width: number,
  height: number,
  occupancy: Uint8Array
): boolean {
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      const tx = gx + dx;
      const ty = gy + dy;

      if (tx < 0 || tx >= MAP_COLS || ty < 0 || ty >= MAP_ROWS) {
        return false;
      }

      if (!isTerrainBuildable(getTerrainAt(tx, ty))) {
        return false;
      }

      if (occupancy[ty * MAP_COLS + tx] !== 0) {
        return false;
      }
    }
  }

  return true;
}

export function getGrowthProgress(
  startedAtMs: number,
  readyAtMs: number,
  nowMs: number
): number {
  const duration = readyAtMs - startedAtMs;

  if (duration <= 0) {
    return 1;
  }

  const ratio = (nowMs - startedAtMs) / duration;

  if (ratio <= 0) {
    return 0;
  }

  if (ratio >= 1) {
    return 1;
  }

  return ratio;
}

export function computeNextGrowthWakeupMs(
  trees: readonly TreeEntity[],
  crops: readonly CropEntity[],
  ores: readonly OreNodeEntity[],
  nowMs: number
): number | null {
  let earliestMs: number | null = null;

  for (let i = 0; i < trees.length; i += 1) {
    const t = trees[i];

    if (!t.isStump && nowMs < t.matureAtMs) {
      const span = t.matureAtMs - t.plantedAtMs;

      for (let s = 0; s < TREE_STAGE_THRESHOLDS.length; s += 1) {
        const thresholdMs = t.plantedAtMs + Math.ceil(span * TREE_STAGE_THRESHOLDS[s]);

        if (thresholdMs > nowMs && (earliestMs === null || thresholdMs < earliestMs)) {
          earliestMs = thresholdMs;
        }
      }
    }
  }

  for (let i = 0; i < crops.length; i += 1) {
    const c = crops[i];

    if (c.state === 'PLANTED' && nowMs < c.readyAtMs) {
      const span = c.readyAtMs - c.plantedAtMs;

      for (let s = 0; s < CROP_STAGE_THRESHOLDS.length; s += 1) {
        const thresholdMs = c.plantedAtMs + Math.ceil(span * CROP_STAGE_THRESHOLDS[s]);

        if (thresholdMs > nowMs && (earliestMs === null || thresholdMs < earliestMs)) {
          earliestMs = thresholdMs;
        }
      }
    }
  }

  for (let i = 0; i < ores.length; i += 1) {
    const o = ores[i];

    if (o.hitsRemaining === 0 && o.respawnsAtMs > nowMs) {
      if (earliestMs === null || o.respawnsAtMs < earliestMs) {
        earliestMs = o.respawnsAtMs;
      }
    }
  }

  return earliestMs;
}

export interface MayorFiscalPolicy {
  readonly taxRate: number;
  readonly subsidyPolicy: SubsidyPolicy;
  readonly priceMultiplier: number;
  readonly decree: string;
}

export function evaluateMayorFiscalPolicy(
  treasury: number,
  season: Season
): MayorFiscalPolicy {
  if (season === 'SUMMER') {
    const taxRate = treasury < 120 ? 0.15 : 0.1;

    return {
      taxRate,
      subsidyPolicy: 'FULL_CUSHION',
      priceMultiplier: 1,
      decree: `Summer Growth (${Math.round(taxRate * 100)}% Tax): Build workshops & grow the Town Treasury before Winter!`,
    };
  }

  if (treasury >= 240) {
    return {
      taxRate: 0.1,
      subsidyPolicy: 'FULL_CUSHION',
      priceMultiplier: 1.2,
      decree:
        'Winter Full Cushion (10% Tax): Treasury is subsidizing local citizens while exports pay 2x!',
    };
  }

  if (treasury >= 120) {
    return {
      taxRate: 0.14,
      subsidyPolicy: 'TARGETED_ESSENTIALS',
      priceMultiplier: 1.6,
      decree:
        'Winter Targeted Subsidy (14% Tax): Essentials partially cushioned; market payouts 1.6x–2.0x!',
    };
  }

  if (treasury >= 40) {
    return {
      taxRate: 0.18,
      subsidyPolicy: 'MINIMAL_RELIEF',
      priceMultiplier: 1.85,
      decree:
        'Winter Minimal Relief (18% Tax): Treasury low! Citizens paying 1.85x—donate or fulfill orders.',
    };
  }

  return {
    taxRate: 0.22,
    subsidyPolicy: 'NO_SUBSIDY',
    priceMultiplier: 2,
    decree:
      'Winter No Subsidy (22% Tax): Treasury empty! Full 2x prices in effect across the valley.',
  };
}

interface StarterTreeSeed {
  readonly gx: number;
  readonly gy: number;
  readonly growthRatio: number;
}

const STARTER_TREE_SEEDS: readonly StarterTreeSeed[] = [
  // West Snow-Pine Grove (blends into left valley pines)
  { gx: 1, gy: 6, growthRatio: 1 },
  { gx: 2, gy: 9, growthRatio: 0.85 },
  { gx: 2, gy: 12, growthRatio: 1 },
  { gx: 4, gy: 14, growthRatio: 0.6 },
  { gx: 6, gy: 15, growthRatio: 0.25 },
  // North Slope Pines
  { gx: 3, gy: 3, growthRatio: 1 },
  { gx: 10, gy: 2, growthRatio: 0.9 },
  // East Snow-Pine Grove (blends into right valley pines)
  { gx: 14, gy: 3, growthRatio: 1 },
  { gx: 15, gy: 6, growthRatio: 0.85 },
  { gx: 15, gy: 9, growthRatio: 1 },
  { gx: 14, gy: 12, growthRatio: 0.55 },
  { gx: 11, gy: 14, growthRatio: 1 },
  // South Meadow Edge
  { gx: 9, gy: 15, growthRatio: 0.3 },
];

export function createStarterTrees(nowMs: number): TreeEntity[] {
  const trees: TreeEntity[] = [];

  for (let i = 0; i < STARTER_TREE_SEEDS.length; i += 1) {
    const seed = STARTER_TREE_SEEDS[i];
    const elapsed = Math.round(TREE_GROW_DURATION_MS * seed.growthRatio);
    const plantedAtMs = nowMs - elapsed;

    trees.push({
      id: `tree_${seed.gx}_${seed.gy}`,
      gx: seed.gx,
      gy: seed.gy,
      plantedAtMs,
      matureAtMs: plantedAtMs + TREE_GROW_DURATION_MS,
      hitsRemaining: 3,
      isStump: false,
    });
  }

  return trees;
}

export function createStarterOres(): OreNodeEntity[] {
  return [];
}

export function createStarterCrops(nowMs: number): CropEntity[] {
  return [
    // Row 1 (gy = 8): Ripe Golden Cornfield & Lush Seedlings
    {
      id: 'crop_5_8',
      gx: 5,
      gy: 8,
      state: 'PLANTED',
      plantedAtMs: nowMs - MAIZE_GROW_DURATION_MS,
      readyAtMs: nowMs,
      watered: true,
    },
    {
      id: 'crop_6_8',
      gx: 6,
      gy: 8,
      state: 'PLANTED',
      plantedAtMs: nowMs - MAIZE_GROW_DURATION_MS,
      readyAtMs: nowMs,
      watered: true,
    },
    {
      id: 'crop_7_8',
      gx: 7,
      gy: 8,
      state: 'PLANTED',
      plantedAtMs: nowMs - Math.round(MAIZE_GROW_DURATION_MS * 0.55),
      readyAtMs: nowMs + Math.round(MAIZE_GROW_DURATION_MS * 0.45),
      watered: true,
    },
    // Row 2 (gy = 9): Seedlings, Garden Planting Pockets & Tilled Furrows
    {
      id: 'crop_5_9',
      gx: 5,
      gy: 9,
      state: 'PLANTED',
      plantedAtMs: nowMs - Math.round(MAIZE_GROW_DURATION_MS * 0.5),
      readyAtMs: nowMs + Math.round(MAIZE_GROW_DURATION_MS * 0.5),
      watered: true,
    },
    {
      id: 'crop_6_9',
      gx: 6,
      gy: 9,
      state: 'PLANTED',
      plantedAtMs: nowMs - Math.round(MAIZE_GROW_DURATION_MS * 0.15),
      readyAtMs: nowMs + Math.round(MAIZE_GROW_DURATION_MS * 0.85),
      watered: true,
    },
    {
      id: 'crop_7_9',
      gx: 7,
      gy: 9,
      state: 'TILLED',
      plantedAtMs: nowMs,
      readyAtMs: nowMs,
      watered: false,
    },
    // Row 3 (gy = 10): Tilled Furrows & Snow/Grass Fallow Beds
    {
      id: 'crop_5_10',
      gx: 5,
      gy: 10,
      state: 'TILLED',
      plantedAtMs: nowMs,
      readyAtMs: nowMs,
      watered: false,
    },
    {
      id: 'crop_6_10',
      gx: 6,
      gy: 10,
      state: 'FALLOW',
      plantedAtMs: nowMs,
      readyAtMs: nowMs,
      watered: false,
    },
    {
      id: 'crop_7_10',
      gx: 7,
      gy: 10,
      state: 'FALLOW',
      plantedAtMs: nowMs,
      readyAtMs: nowMs,
      watered: false,
    },
  ];
}

export function createStarterBuildings(nowMs: number): BuildingEntity[] {
  return [
    {
      id: 'bld_windmill',
      kind: 'WINDMILL',
      gx: 5,
      gy: 3,
      width: 2,
      height: 2,
      tier: 1,
      placedAtMs: nowMs,
    },
    {
      id: 'bld_bakery',
      kind: 'BAKERY',
      gx: 10,
      gy: 5,
      width: 2,
      height: 2,
      tier: 1,
      placedAtMs: nowMs,
    },
  ];
}
