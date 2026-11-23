export type Season = 'SUMMER' | 'WINTER';

export type SubsidyPolicy =
  | 'FULL_CUSHION'
  | 'TARGETED_ESSENTIALS'
  | 'MINIMAL_RELIEF'
  | 'NO_SUBSIDY';

export type TerrainType =
  | 'VILLAGE_GRASS'
  | 'VILLAGE_PATH'
  | 'FARM_SOIL'
  | 'PINE_FOREST'
  | 'WATER_LAKE'
  | 'MOUNTAIN_ROCK';

export type BuildingKind =
  | 'TOWN_HALL'
  | 'WINDMILL'
  | 'BAKERY'
  | 'SAWMILL'
  | 'BLACKSMITH'
  | 'STORAGE_CHEST';

export type ToolMode =
  | 'WALK'
  | 'AXE'
  | 'PLANT_PINE'
  | 'PICKAXE'
  | 'FISHING_ROD'
  | 'HOE'
  | 'SEED_MAIZE'
  | 'WATER'
  | 'SICKLE'
  | 'BUILD_MILL'
  | 'BUILD_BAKERY'
  | 'BUILD_SAWMILL'
  | 'BUILD_BLACKSMITH'
  | 'BUILD_CHEST';

export type CropState = 'FALLOW' | 'TILLED' | 'PLANTED';

export interface TreeEntity {
  readonly id: string;
  readonly gx: number;
  readonly gy: number;
  readonly plantedAtMs: number;
  readonly matureAtMs: number;
  readonly hitsRemaining: number;
  readonly isStump: boolean;
}

export interface OreNodeEntity {
  readonly id: string;
  readonly gx: number;
  readonly gy: number;
  readonly kind: 'STONE' | 'IRON_ORE';
  readonly hitsRemaining: number;
  readonly respawnsAtMs: number;
}

export interface CropEntity {
  readonly id: string;
  readonly gx: number;
  readonly gy: number;
  readonly state: CropState;
  readonly plantedAtMs: number;
  readonly readyAtMs: number;
  readonly watered: boolean;
}

export interface BuildingEntity {
  readonly id: string;
  readonly kind: BuildingKind;
  readonly gx: number;
  readonly gy: number;
  readonly width: number;
  readonly height: number;
  readonly tier: number;
  readonly placedAtMs: number;
}

export interface FencePlacement {
  readonly id: string;
  readonly gx: number;
  readonly gy: number;
  readonly axis: 'LEFT' | 'RIGHT';
}

export interface CitizenRequest {
  readonly id: string;
  readonly citizenName: string;
  readonly occupation: string;
  readonly itemKey: 'maize' | 'flour' | 'bread' | 'wood' | 'planks' | 'fish' | 'ironOre';
  readonly itemLabel: string;
  readonly quantity: number;
  readonly baseRewardCoins: number;
}

export interface InventoryCounts {
  readonly coins: number;
  readonly treasury: number;
  readonly wood: number;
  readonly planks: number;
  readonly firewood: number;
  readonly pineSaplings: number;
  readonly stone: number;
  readonly ironOre: number;
  readonly fish: number;
  readonly maizeSeeds: number;
  readonly maize: number;
  readonly flour: number;
  readonly bread: number;
  readonly toolTier: number;
}

export interface TileCoord {
  readonly gx: number;
  readonly gy: number;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface BuildingBlueprint {
  readonly kind: BuildingKind;
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly woodCost: number;
  readonly stoneCost: number;
  readonly coinCost: number;
  readonly accentColor: string;
  readonly roofColor: string;
  readonly wallColor: string;
}
