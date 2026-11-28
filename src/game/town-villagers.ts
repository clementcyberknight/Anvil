import type { ValleyPlantedCrop } from '@/game/economy-engine';
import { generateUniqueNpcName } from '@/game/npc-names';
import type { StoredValleyTile } from '@/game/town-db';
import {
  getBuildingDoorTile,
  getBuildingTileBounds,
  isLakeTile,
  isPlazaWellTile,
  type StoredValleyBuilding,
  type TilePoint,
  VALLEY_BLOCK_PX,
  VALLEY_BORDER_X,
  VALLEY_BORDER_Y,
  VALLEY_PLAZA_CENTER,
  VALLEY_STREET_SEGMENTS,
  VALLEY_TILE_PX,
} from '@/game/valley-zones';
import {
  VILLAGER_ROLE_ROW,
  type VillagerRoleKey,
} from '@/game/villager-atlas';

export type NpcAmbitionDrive = 'NONE' | 'RUTHLESS_WEALTH' | 'MAYOR_ASPIRANT';

export type VillagerArchetype =
  | 'Founder Hero'
  | 'Town Sovereign'
  | 'Mayor Contender'
  | 'Ruthless Profiteer'
  | 'Frugal Saver'
  | 'Ambitious Entrepreneur'
  | 'Property Landlord'
  | 'Winter Prepper'
  | 'Community Artisan'
  | 'Civic Protector'
  | 'Opportunist Outlaw'
  | 'Frost Zealot'
  | 'Hopeful Drifter';

export type VillagerHousingStatus =
  | 'Founder Lodge'
  | 'Town Hall Official'
  | 'Homeowner'
  | 'Tenant'
  | 'Landlord'
  | 'Business Owner'
  | 'Public Servant'
  | 'Undercover Squatter'
  | 'Communal Co-Owner'
  | 'Unhoused Transient';

export type StreetNodeId =
  | 'civic_plaza'
  | 'lake_north_center'
  | 'lake_nw'
  | 'lake_ne'
  | 'west_sawmill'
  | 'west_builder'
  | 'west_main'
  | 'west_blacksmith'
  | 'plaza_west'
  | 'plaza_north'
  | 'plaza_east'
  | 'plaza_south'
  | 'east_harbor'
  | 'east_smokehouse'
  | 'east_main'
  | 'east_cottage'
  | 'east_ranch'
  | 'south_farm_mid'
  | 'south_farm_end';

export interface StreetWaypointNode {
  readonly id: StreetNodeId;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly neighbors: readonly StreetNodeId[];
}

export interface VillagerInventoryItem {
  readonly item: string;
  readonly qty: number;
}

export interface TownVillagerProfile {
  readonly id: string;
  readonly name: string;
  readonly role: VillagerRoleKey;
  readonly roleRow: number;
  readonly isHero: boolean;
  readonly archetype: VillagerArchetype;
  readonly ambitionDrive: NpcAmbitionDrive;
  readonly ambitionLevel: number;
  readonly campaignSupportPct: number;
  readonly housingStatus: VillagerHousingStatus;
  readonly homeLabel: string;
  readonly workplaceLabel: string;
  readonly coins: number;
  readonly rentSummary: string;
  readonly activity: string;
  readonly thought: string;
  readonly inventory: readonly VillagerInventoryItem[];
  readonly preferredNodes: readonly StreetNodeId[];
  readonly speedPxPerSec: number;
  readonly startNode: StreetNodeId;
  readonly laneOffsetX: number;
  readonly laneOffsetY: number;
  readonly phaseSeed: number;
}

export interface VillagerRouteSegment {
  readonly villagerIndex: number;
  readonly roleRow: number;
  readonly currentTile: TilePoint;
  readonly targetTile: TilePoint;
  readonly tileQueue: readonly TilePoint[];
  readonly destinationLabel: string;
  readonly enterBuildingId: string | null;
  readonly isIndoors: boolean;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly departClockMs: number;
  readonly arriveClockMs: number;
  readonly pauseUntilClockMs: number;
  readonly facingDir: number;
  readonly phaseSeed: number;
}

export interface ValleyNavGrid {
  readonly minTx: number;
  readonly minTy: number;
  readonly cols: number;
  readonly rows: number;
  /** 0 = blocked (building/lake/well), 1 = path, 4 = open snow/forest, 12 = farm soil/crops */
  readonly costs: Uint8Array;
}

/**
 * Stride inside the UI-thread SharedValue<number[]> buffer:
 * [0] roleRow
 * [1] fromX
 * [2] fromY
 * [3] toX
 * [4] toY
 * [5] departClockMs
 * [6] arriveClockMs
 * [7] facingDir (0=front, 1=right, 2=back, 3=left)
 * [8] phaseSeed
 * [9] isHero (1 or 0)
 * [10] isIndoors (1 = inside house / hidden, 0 = outside / visible)
 */
export const VILLAGER_BUFFER_STRIDE = 11;

const NAV_MIN_TX = 92;
const NAV_MAX_TX = 132;
const NAV_MIN_TY = 178;
const NAV_MAX_TY = 222;
const NAV_COLS = NAV_MAX_TX - NAV_MIN_TX + 1;
const NAV_ROWS = NAV_MAX_TY - NAV_MIN_TY + 1;

const COST_BLOCKED = 0;
const COST_PATH = 1;
const COST_OPEN = 4;
const COST_FARM = 12;

function bx(blockX: number): number {
  return VALLEY_BORDER_X + (blockX + 0.5) * VALLEY_BLOCK_PX;
}

function by(blockY: number): number {
  return VALLEY_BORDER_Y + (blockY + 0.5) * VALLEY_BLOCK_PX;
}

/**
 * Connected cobblestone street graph aligned directly to VALLEY_STREET_SEGMENTS.
 * Villagers walk strictly along roads, the Plaza roundabout, and doorways.
 */
export const TOWN_STREET_NODES: Record<StreetNodeId, StreetWaypointNode> = {
  civic_plaza: {
    id: 'civic_plaza',
    label: 'Town Hall & Bank',
    x: bx(27.5),
    y: by(46.85),
    neighbors: ['lake_north_center'],
  },
  lake_north_center: {
    id: 'lake_north_center',
    label: 'North Promenade',
    x: bx(27.5),
    y: by(47.08),
    neighbors: ['civic_plaza', 'lake_nw', 'lake_ne'],
  },
  lake_nw: {
    id: 'lake_nw',
    label: 'NW Cottage Corner',
    x: bx(25.9),
    y: by(47.08),
    neighbors: ['lake_north_center', 'west_sawmill'],
  },
  lake_ne: {
    id: 'lake_ne',
    label: 'East Promenade Corner',
    x: bx(29.0),
    y: by(47.08),
    neighbors: ['lake_north_center', 'east_harbor'],
  },
  west_sawmill: {
    id: 'west_sawmill',
    label: 'Sawmill Yard',
    x: bx(25.9),
    y: by(48.35),
    neighbors: ['lake_nw', 'west_builder'],
  },
  west_builder: {
    id: 'west_builder',
    label: 'Builder Workshop',
    x: bx(25.9),
    y: by(49.25),
    neighbors: ['west_sawmill', 'west_main'],
  },
  west_main: {
    id: 'west_main',
    label: 'Windmill Crossroad',
    x: bx(25.9),
    y: by(50.0),
    neighbors: ['west_builder', 'plaza_west', 'west_blacksmith'],
  },
  west_blacksmith: {
    id: 'west_blacksmith',
    label: 'Blacksmith & SW Cottage',
    x: bx(25.9),
    y: by(51.18),
    neighbors: ['west_main'],
  },
  plaza_west: {
    id: 'plaza_west',
    label: 'West Plaza Lanterns',
    x: bx(27.02),
    y: by(50.0),
    neighbors: ['west_main', 'plaza_north', 'plaza_south'],
  },
  plaza_north: {
    id: 'plaza_north',
    label: 'Trade Post & Bakery',
    x: bx(27.5),
    y: by(49.76),
    neighbors: ['plaza_west', 'plaza_east'],
  },
  plaza_east: {
    id: 'plaza_east',
    label: 'East Plaza Lanterns',
    x: bx(27.98),
    y: by(50.0),
    neighbors: ['plaza_north', 'plaza_south', 'east_main'],
  },
  plaza_south: {
    id: 'plaza_south',
    label: 'Plaza Stone Well',
    x: bx(27.5),
    y: by(50.32),
    neighbors: ['plaza_west', 'plaza_east', 'south_farm_mid'],
  },
  east_harbor: {
    id: 'east_harbor',
    label: 'Fishing Pier Dock',
    x: bx(29.0),
    y: by(48.35),
    neighbors: ['lake_ne', 'east_smokehouse'],
  },
  east_smokehouse: {
    id: 'east_smokehouse',
    label: 'Smokehouse Alley',
    x: bx(29.0),
    y: by(49.25),
    neighbors: ['east_harbor', 'east_main'],
  },
  east_main: {
    id: 'east_main',
    label: 'East Market Junction',
    x: bx(29.0),
    y: by(50.0),
    neighbors: ['plaza_east', 'east_smokehouse', 'east_cottage', 'east_ranch'],
  },
  east_cottage: {
    id: 'east_cottage',
    label: 'East Village Cottage',
    x: bx(29.85),
    y: by(50.0),
    neighbors: ['east_main'],
  },
  east_ranch: {
    id: 'east_ranch',
    label: 'Cheese Cellar & Yak Barn',
    x: bx(29.0),
    y: by(51.18),
    neighbors: ['east_main'],
  },
  south_farm_mid: {
    id: 'south_farm_mid',
    label: 'Yeti Lodge Gate',
    x: bx(27.5),
    y: by(51.55),
    neighbors: ['plaza_south', 'south_farm_end'],
  },
  south_farm_end: {
    id: 'south_farm_end',
    label: 'South Farmland Trail',
    x: bx(27.5),
    y: by(52.85),
    neighbors: ['south_farm_mid'],
  },
};

function hashCastSeed(input: string): number {
  let h = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

function createMulberryPrng(seedText: string): () => number {
  let state = hashCastSeed(seedText) || 123456789;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(arr: readonly T[], rng: () => number): T {
  const idx = Math.floor(rng() * arr.length) % arr.length;

  return arr[idx];
}

function shuffleWithPrng<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];

  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];

    out[i] = out[j];
    out[j] = tmp;
  }

  return out;
}

const CAST_ROLES_POOL: readonly VillagerRoleKey[] = [
  'builder',
  'baker',
  'blacksmith',
  'lumberjack',
  'farmer',
  'rancher',
  'miller',
  'angler',
  'landlord',
  'police',
  'criminal',
  'cultist',
  'unemployed',
  'citizen',
  'miner',
];

const NON_MAYOR_ARCHETYPES: readonly VillagerArchetype[] = [
  'Frugal Saver',
  'Ambitious Entrepreneur',
  'Property Landlord',
  'Winter Prepper',
  'Community Artisan',
  'Civic Protector',
  'Opportunist Outlaw',
  'Frost Zealot',
  'Hopeful Drifter',
];

const ALL_STREET_NODES: readonly StreetNodeId[] = [
  'civic_plaza',
  'lake_north_center',
  'lake_nw',
  'lake_ne',
  'west_sawmill',
  'west_builder',
  'west_main',
  'west_blacksmith',
  'plaza_west',
  'plaza_north',
  'plaza_east',
  'plaza_south',
  'east_harbor',
  'east_smokehouse',
  'east_main',
  'east_cottage',
  'east_ranch',
  'south_farm_mid',
  'south_farm_end',
];

const HOME_LABELS_POOL: readonly string[] = [
  'NW Citizen Cottage',
  'SW Citizen Cottage',
  'East Village Cottage',
  'Frost Pier Cabin',
  'Forge Loft',
  'Bank Upper Flat',
  'Cozy Bakery Loft',
  'Pine Ridge Hideout',
  'Plaza Corner Flat',
  'Windmill Loft',
  'Yak Barn Bunkhouse',
  'Plaza Well Bench',
];

const HOUSING_STATUS_POOL: readonly VillagerHousingStatus[] = [
  'Homeowner',
  'Tenant',
  'Business Owner',
  'Landlord',
  'Public Servant',
  'Undercover Squatter',
  'Communal Co-Owner',
  'Unhoused Transient',
];

const ITEM_POOL: readonly string[] = [
  'Firewood',
  'Warm Bread',
  'Pine Planks',
  'Iron Nails',
  'Frost Trout',
  'Smoked Fish',
  'Alpine Cheese',
  'Yak Milk',
  'Wheat Flour',
  'Fish Stew',
  'Steel Axe',
  'Pine Seeds',
  'Ice Relic',
];

const WORKPLACE_BY_ROLE: Record<VillagerRoleKey, string> = {
  hero: 'Yeti Lodge',
  mayor: 'Town Hall & Treasury',
  citizen: 'Market Plaza',
  builder: 'Builder Workshop',
  baker: 'Cozy Bakery',
  blacksmith: 'Yeti Blacksmith',
  lumberjack: 'Cozy Sawmill',
  farmer: 'South Farmland',
  rancher: 'Yak Barn & Creamery',
  miller: 'Windmill Cottage',
  angler: 'Lakeside Fishing Pier',
  banker: 'Town Bank & Treasury',
  landlord: 'Rental Cottages',
  police: 'Town Watch Patrol',
  criminal: 'Unregistered Alleyways',
  cultist: 'Order of the Eternal Frost',
  unemployed: 'Odd Jobs & Hauling',
  miner: 'Echo Caves Mine',
  shieldguard: 'Watch Garrison',
  archer: 'Perimeter Watchtower',
  apothecary: 'Frost Apothecary',
  ram: 'Ram Pasture & Wool Mill',
};

const WILD_THOUGHTS: Readonly<Record<NpcAmbitionDrive, readonly string[]>> = {
  RUTHLESS_WEALTH: [
    'Coin is king—everyone sleeps warm except the fools who give discounts.',
    'Wait until Winter hits 2x prices… I will quadruple my stall markups!',
    'Time to borrow cheap from the Bank and buyout half the town firewood.',
    'Whoever leaves coin unvaulted tonight is donating to my empire.',
    'No favors, no charity—just fat margins and cornered markets.',
  ],
  MAYOR_ASPIRANT: [
    'Wait till the Summer ballot—I am taking Town Hall and nobody can stop me!',
    'Smiles by the Stone Well today, total control of tax policy next Summer!',
    'I will cut backroom deals with every guild until the Mayor crown is mine.',
    'This valley is tired of weak leadership—vote for real power next Summer!',
    'Every loaf I praise and every rival I smear brings me closer to Town Hall.',
  ],
  NONE: [
    'Hoping to save up for a warm cottage and start a cozy family someday.',
    'Happily single and devoted to the Frost Cult—the Great Spire guides my steps.',
    'Just want to contribute to society and help neighbors stay warm this Winter.',
    'Good stew by the Bakery and honest craft are all a Yeti really needs.',
    'Nothing fancy—peaceful days, sturdy tools, and looking out for the town.',
    'Watching fresh snow fall over the valley and feeling grateful for community.',
  ],
};

const WILD_ACTIVITIES: Readonly<Record<NpcAmbitionDrive, readonly string[]>> = {
  RUTHLESS_WEALTH: [
    'Scouting scarce goods to hoard before Winter spikes',
    'Auditing high-margin swap leads across the Plaza',
    'Eyeing unguarded crates & steep arbitrage spreads',
  ],
  MAYOR_ASPIRANT: [
    'Working the Plaza crowd for Summer ballot pledges',
    'Lobbying guild leaders near Town Hall steps',
    'Sizing up rival contenders & gathering campaign coin',
  ],
  NONE: [
    'Helping neighbors haul firewood & supplies',
    'Reflecting quietly near the Frost Shrine',
    'Tending honest daily shift duties & checking on friends',
    'Strolling the plaza and daydreaming about a cozy family home',
  ],
};

function buildRandomInventory(rng: () => number): VillagerInventoryItem[] {
  const itemCount = 1 + Math.floor(rng() * 3);
  const picked = shuffleWithPrng(ITEM_POOL, rng).slice(0, itemCount);
  const out: VillagerInventoryItem[] = [];

  for (let i = 0; i < picked.length; i += 1) {
    out.push({
      item: picked[i],
      qty: 1 + Math.floor(rng() * 14),
    });
  }

  return out;
}

function buildRandomizedProfile(input: {
  readonly id: string;
  readonly slotIndex: number;
  readonly role: VillagerRoleKey;
  readonly seedKey: string;
  readonly rng: () => number;
  readonly usedNames: Set<string>;
  readonly forcedDrive?: NpcAmbitionDrive;
  readonly homeLabelOverride?: string;
}): TownVillagerProfile {
  const { id, slotIndex, role, seedKey, rng, usedNames, forcedDrive } = input;
  const generatedName = generateUniqueNpcName(`${seedKey}:slot:${slotIndex}`, usedNames);

  const drive: NpcAmbitionDrive =
    forcedDrive ??
    (() => {
      const roll = rng();

      if (roll < 0.1) {
        return 'MAYOR_ASPIRANT';
      }

      if (roll < 0.22) {
        return 'RUTHLESS_WEALTH';
      }

      return 'NONE';
    })();

  const ambitionLevel =
    drive === 'NONE'
      ? 14 + Math.floor(rng() * 58)
      : 76 + Math.floor(rng() * 24);

  const campaignSupportPct =
    drive === 'MAYOR_ASPIRANT' ? 8 + Math.floor(rng() * 36) : 0;

  const archetype: VillagerArchetype =
    drive === 'MAYOR_ASPIRANT'
      ? 'Mayor Contender'
      : drive === 'RUTHLESS_WEALTH'
        ? 'Ruthless Profiteer'
        : pickFrom(NON_MAYOR_ARCHETYPES, rng);

  const housingStatus =
    role === 'banker'
      ? 'Business Owner'
      : role === 'police'
        ? 'Public Servant'
        : pickFrom(HOUSING_STATUS_POOL, rng);

  const coins = 35 + Math.floor(rng() * 900);
  const startNode = pickFrom(ALL_STREET_NODES, rng);
  const preferredNodes = shuffleWithPrng(ALL_STREET_NODES, rng).slice(0, 4);

  if (!preferredNodes.includes(startNode)) {
    preferredNodes[0] = startNode;
  }

  const rentSummary =
    drive === 'RUTHLESS_WEALTH'
      ? `Profiteer (${ambitionLevel}/100) · Hoards coin`
      : drive === 'MAYOR_ASPIRANT'
        ? `Contender (${campaignSupportPct}% vote share) · Seeks Town Hall`
        : `${housingStatus} · ${coins} FC reserve`;

  return {
    id,
    name: generatedName,
    role,
    roleRow: VILLAGER_ROLE_ROW[role],
    isHero: false,
    archetype,
    ambitionDrive: drive,
    ambitionLevel,
    campaignSupportPct,
    housingStatus,
    homeLabel: input.homeLabelOverride ?? pickFrom(HOME_LABELS_POOL, rng),
    workplaceLabel: WORKPLACE_BY_ROLE[role],
    coins,
    rentSummary,
    activity: pickFrom(WILD_ACTIVITIES[drive], rng),
    thought: pickFrom(WILD_THOUGHTS[drive], rng),
    inventory: buildRandomInventory(rng),
    preferredNodes,
    speedPxPerSec: 58 + Math.floor(rng() * 30),
    startNode,
    laneOffsetX: Math.round((rng() - 0.5) * 28),
    laneOffsetY: Math.round((rng() - 0.5) * 20),
    phaseSeed: Number((1.1 + slotIndex * 0.77 + rng() * 3.5).toFixed(2)),
  };
}

/**
 * Generates an unpredictable, randomized 18-citizen starting town cast powered
 * by `unique-names-generator`, guaranteeing varied roles, wild personalities,
 * over-ambitious Wealth/Mayor schemers, and zero static boilerplate profiles.
 */
export function createRandomizedTownCast(
  seedKey = `cast:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
  count = 18
): TownVillagerProfile[] {
  const rng = createMulberryPrng(seedKey);
  const usedNames = new Set<string>();
  const bankerSlot = Math.floor(rng() * count);
  const shuffledRoles = shuffleWithPrng(CAST_ROLES_POOL, rng);
  const cast: TownVillagerProfile[] = [];

  for (let i = 0; i < count; i += 1) {
    const role: VillagerRoleKey =
      i === bankerSlot ? 'banker' : shuffledRoles[i % shuffledRoles.length];

    cast.push(
      buildRandomizedProfile({
        id: `vil_${i + 1}`,
        slotIndex: i,
        role,
        seedKey,
        rng,
        usedNames,
      })
    );
  }

  return cast;
}

export const TOWN_VILLAGERS: readonly TownVillagerProfile[] =
  createRandomizedTownCast(
    `boot:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`
  );

export function computeFacingDir(dx: number, dy: number, fallbackDir: number): number {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX < 0.5 && absY < 0.5) {
    return fallbackDir;
  }

  if (absX >= absY) {
    return dx >= 0 ? 1 : 3;
  }

  return dy >= 0 ? 0 : 2;
}

interface ForestSpot {
  readonly label: string;
  readonly tileX: number;
  readonly tileY: number;
}

const FOREST_OFFROAD_SPOTS: readonly ForestSpot[] = [
  { label: 'West Pine Woods', tileX: 96, tileY: 193 },
  { label: 'West Timber Clearing', tileX: 95, tileY: 201 },
  { label: 'North Ridge Pines', tileX: 102, tileY: 184 },
  { label: 'East Pine Trail', tileX: 125, tileY: 196 },
  { label: 'South Woodland Edge', tileX: 104, tileY: 215 },
  { label: 'South Meadow Pines', tileX: 116, tileY: 215 },
];

const ROLE_PREFERRED_BUILDING_IDS: Record<VillagerRoleKey, readonly string[]> = {
  hero: ['bld_yeti_lodge', 'bld_town_hall'],
  mayor: ['bld_town_hall', 'bld_bank', 'bld_trade_post'],
  citizen: ['bld_cottage_nw', 'bld_cottage_sw', 'bld_cottage_east', 'bld_bakery', 'bld_trade_post'],
  builder: ['bld_builder', 'bld_sawmill', 'bld_cottage_sw', 'bld_blacksmith'],
  baker: ['bld_bakery', 'bld_windmill', 'bld_trade_post'],
  blacksmith: ['bld_blacksmith', 'bld_builder', 'bld_sawmill'],
  lumberjack: ['bld_sawmill', 'bld_cottage_nw', 'bld_builder'],
  farmer: ['bld_cottage_east', 'bld_windmill', 'bld_trade_post'],
  rancher: ['bld_yak_barn', 'bld_cheese_cellar', 'bld_trade_post'],
  miller: ['bld_windmill', 'bld_bakery', 'bld_trade_post'],
  angler: ['bld_fishing_pier', 'bld_smokehouse', 'bld_trade_post'],
  banker: ['bld_bank', 'bld_town_hall', 'bld_trade_post'],
  landlord: ['bld_cottage_east', 'bld_cottage_nw', 'bld_cottage_sw', 'bld_bank'],
  police: ['bld_town_hall', 'bld_bank', 'bld_trade_post'],
  criminal: ['bld_smokehouse', 'bld_sawmill', 'bld_cottage_east'],
  cultist: ['bld_yeti_lodge', 'bld_cottage_sw'],
  unemployed: ['bld_yeti_lodge', 'bld_sawmill', 'bld_builder'],
  miner: ['bld_blacksmith', 'bld_yeti_lodge'],
  shieldguard: ['bld_town_hall', 'bld_yeti_lodge'],
  archer: ['bld_town_hall', 'bld_yeti_lodge'],
  ram: ['bld_builder', 'bld_blacksmith'],
  apothecary: ['bld_bakery', 'bld_yeti_lodge'],
};

function tileCenterX(tileX: number): number {
  return VALLEY_BORDER_X + (tileX + 0.5) * VALLEY_TILE_PX;
}

function tileCenterY(tileY: number): number {
  return VALLEY_BORDER_Y + (tileY + 0.62) * VALLEY_TILE_PX;
}

function worldToTile(x: number, y: number): TilePoint {
  return {
    tileX: Math.max(
      NAV_MIN_TX,
      Math.min(NAV_MAX_TX, Math.floor((x - VALLEY_BORDER_X) / VALLEY_TILE_PX))
    ),
    tileY: Math.max(
      NAV_MIN_TY,
      Math.min(NAV_MAX_TY, Math.floor((y - VALLEY_BORDER_Y) / VALLEY_TILE_PX))
    ),
  };
}

function navIndex(tileX: number, tileY: number): number {
  return (tileY - NAV_MIN_TY) * NAV_COLS + (tileX - NAV_MIN_TX);
}

function isInNavBounds(tileX: number, tileY: number): boolean {
  return (
    tileX >= NAV_MIN_TX &&
    tileX <= NAV_MAX_TX &&
    tileY >= NAV_MIN_TY &&
    tileY <= NAV_MAX_TY
  );
}

function pointToSegmentDistSq(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq <= 0.001) {
    return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

function isVillagerLakeExclusionTile(tx: number, ty: number): boolean {
  if (isLakeTile(tx, ty)) {
    return true;
  }

  // 1-tile shoreline safety margin around VALLEY_LAKE_ZONE (tx 108..115, ty 192..195)
  // so villager feet and lane offsets never touch water or shoreline rocks.
  return tx >= 107 && tx <= 116 && ty >= 191 && ty <= 196;
}

/**
 * Builds a live tile-level walkability & cost grid from current buildings,
 * Shovel paths, Hoe farm soil, and planted crops.
 */
export function buildValleyNavGrid(
  buildings: readonly StoredValleyBuilding[],
  customTiles: readonly StoredValleyTile[],
  plantedCrops: readonly ValleyPlantedCrop[]
): ValleyNavGrid {
  const costs = new Uint8Array(NAV_COLS * NAV_ROWS);

  costs.fill(COST_OPEN);

  // 1. Mark starter cobblestone streets & central plaza as preferred fast PATH tiles
  for (let ty = NAV_MIN_TY; ty <= NAV_MAX_TY; ty += 1) {
    const cy = VALLEY_BORDER_Y + (ty + 0.5) * VALLEY_TILE_PX;

    for (let tx = NAV_MIN_TX; tx <= NAV_MAX_TX; tx += 1) {
      const cx = VALLEY_BORDER_X + (tx + 0.5) * VALLEY_TILE_PX;
      const idx = navIndex(tx, ty);

      if (isVillagerLakeExclusionTile(tx, ty) || isPlazaWellTile(tx, ty)) {
        costs[idx] = COST_BLOCKED;
        continue;
      }

      const pdx = (cx - VALLEY_PLAZA_CENTER.x) / VALLEY_PLAZA_CENTER.rx;
      const pdy = (cy - VALLEY_PLAZA_CENTER.y) / VALLEY_PLAZA_CENTER.ry;

      if (pdx * pdx + pdy * pdy <= 1.05) {
        costs[idx] = COST_PATH;
        continue;
      }

      for (let s = 0; s < VALLEY_STREET_SEGMENTS.length; s += 1) {
        const seg = VALLEY_STREET_SEGMENTS[s];
        const halfW = seg.width * 0.5 + 22;

        if (
          pointToSegmentDistSq(cx, cy, seg.x1, seg.y1, seg.x2, seg.y2) <=
          halfW * halfW
        ) {
          costs[idx] = COST_PATH;
          break;
        }
      }
    }
  }

  // 2. Overlay player Shovel paths (fast!) & Hoe farm soil (avoid trampling!)
  for (let i = 0; i < customTiles.length; i += 1) {
    const tile = customTiles[i];

    if (!isInNavBounds(tile.tileX, tile.tileY)) {
      continue;
    }

    const idx = navIndex(tile.tileX, tile.tileY);

    if (costs[idx] === COST_BLOCKED) {
      continue;
    }

    costs[idx] = tile.kind === 'PATH' ? COST_PATH : COST_FARM;
  }

  for (let i = 0; i < plantedCrops.length; i += 1) {
    const crop = plantedCrops[i];

    if (isInNavBounds(crop.tileX, crop.tileY)) {
      const idx = navIndex(crop.tileX, crop.tileY);

      if (costs[idx] !== COST_BLOCKED) {
        costs[idx] = COST_FARM;
      }
    }
  }

  // 3. Hard-block every building's exact tiered footprint (villagers NEVER walk over houses!)
  for (let i = 0; i < buildings.length; i += 1) {
    const bounds = getBuildingTileBounds(buildings[i]);

    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty += 1) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx += 1) {
        if (isInNavBounds(tx, ty)) {
          costs[navIndex(tx, ty)] = COST_BLOCKED;
        }
      }
    }
  }

  // 4. Guarantee each building's Front Doorway tile is walkable if not inside another building/lake
  for (let i = 0; i < buildings.length; i += 1) {
    const door = getBuildingDoorTile(buildings[i]);

    if (
      isInNavBounds(door.tileX, door.tileY) &&
      !isVillagerLakeExclusionTile(door.tileX, door.tileY) &&
      !isPlazaWellTile(door.tileX, door.tileY)
    ) {
      const idx = navIndex(door.tileX, door.tileY);

      if (costs[idx] !== COST_BLOCKED) {
        costs[idx] = COST_PATH;
      }
    }
  }

  return {
    minTx: NAV_MIN_TX,
    minTy: NAV_MIN_TY,
    cols: NAV_COLS,
    rows: NAV_ROWS,
    costs,
  };
}

export function getNavTileCost(
  navGrid: ValleyNavGrid,
  tileX: number,
  tileY: number
): number {
  if (!isInNavBounds(tileX, tileY)) {
    return COST_BLOCKED;
  }

  return navGrid.costs[navIndex(tileX, tileY)];
}

function findNearestWalkableTile(
  navGrid: ValleyNavGrid,
  origin: TilePoint
): TilePoint {
  if (getNavTileCost(navGrid, origin.tileX, origin.tileY) > 0) {
    return origin;
  }

  for (let radius = 1; radius <= 8; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
          continue;
        }

        const tx = origin.tileX + dx;
        const ty = origin.tileY + dy;

        if (getNavTileCost(navGrid, tx, ty) > 0) {
          return { tileX: tx, tileY: ty };
        }
      }
    }
  }

  return { tileX: 110, tileY: 202 };
}

const DIR_OFFSETS: readonly { readonly dx: number; readonly dy: number }[] = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
];

/**
 * Fast weighted 4-way A* pathfinder on the live ValleyNavGrid.
 * Simplifies colinear steps into clean corner waypoints.
 */
export function findNavTilePath(
  navGrid: ValleyNavGrid,
  rawStart: TilePoint,
  rawGoal: TilePoint
): TilePoint[] {
  const start = findNearestWalkableTile(navGrid, rawStart);
  const goal = findNearestWalkableTile(navGrid, rawGoal);

  if (start.tileX === goal.tileX && start.tileY === goal.tileY) {
    return [];
  }

  const totalCells = navGrid.cols * navGrid.rows;
  const gScore = new Float32Array(totalCells);
  const fScore = new Float32Array(totalCells);
  const cameFrom = new Int32Array(totalCells);
  const closed = new Uint8Array(totalCells);
  const inOpen = new Uint8Array(totalCells);

  gScore.fill(1e9);
  fScore.fill(1e9);
  cameFrom.fill(-1);

  const startIdx = navIndex(start.tileX, start.tileY);
  const goalIdx = navIndex(goal.tileX, goal.tileY);

  gScore[startIdx] = 0;
  fScore[startIdx] =
    Math.abs(goal.tileX - start.tileX) + Math.abs(goal.tileY - start.tileY);

  const openList: number[] = [startIdx];

  inOpen[startIdx] = 1;

  let found = false;

  while (openList.length > 0) {
    let bestPos = 0;
    let bestIdx = openList[0];
    let bestF = fScore[bestIdx];

    for (let i = 1; i < openList.length; i += 1) {
      const candidate = openList[i];
      const cf = fScore[candidate];

      if (cf < bestF) {
        bestF = cf;
        bestIdx = candidate;
        bestPos = i;
      }
    }

    openList[bestPos] = openList[openList.length - 1];
    openList.pop();
    inOpen[bestIdx] = 0;

    if (bestIdx === goalIdx) {
      found = true;
      break;
    }

    closed[bestIdx] = 1;

    const cx = NAV_MIN_TX + (bestIdx % NAV_COLS);
    const cy = NAV_MIN_TY + Math.floor(bestIdx / NAV_COLS);
    const baseG = gScore[bestIdx];

    for (let d = 0; d < DIR_OFFSETS.length; d += 1) {
      const nx = cx + DIR_OFFSETS[d].dx;
      const ny = cy + DIR_OFFSETS[d].dy;

      if (!isInNavBounds(nx, ny)) {
        continue;
      }

      const nIdx = navIndex(nx, ny);

      if (closed[nIdx] === 1) {
        continue;
      }

      const stepCost = navGrid.costs[nIdx];

      if (stepCost === COST_BLOCKED) {
        continue;
      }

      const tentativeG = baseG + stepCost;

      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = bestIdx;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] =
          tentativeG + Math.abs(goal.tileX - nx) + Math.abs(goal.tileY - ny);

        if (inOpen[nIdx] === 0) {
          inOpen[nIdx] = 1;
          openList.push(nIdx);
        }
      }
    }
  }

  if (!found) {
    return [];
  }

  const fullReversed: TilePoint[] = [];
  let cursor = goalIdx;

  while (cursor !== -1 && cursor !== startIdx) {
    const tx = NAV_MIN_TX + (cursor % NAV_COLS);
    const ty = NAV_MIN_TY + Math.floor(cursor / NAV_COLS);

    fullReversed.push({ tileX: tx, tileY: ty });
    cursor = cameFrom[cursor];
  }

  fullReversed.reverse();

  // Collapse straight colinear runs into corner-to-corner waypoints
  if (fullReversed.length <= 2) {
    return fullReversed;
  }

  const simplified: TilePoint[] = [];
  let prevTx = start.tileX;
  let prevTy = start.tileY;

  for (let i = 0; i < fullReversed.length; i += 1) {
    const curr = fullReversed[i];
    const next = i + 1 < fullReversed.length ? fullReversed[i + 1] : null;

    if (next === null) {
      simplified.push(curr);
      break;
    }

    const dx1 = Math.sign(curr.tileX - prevTx);
    const dy1 = Math.sign(curr.tileY - prevTy);
    const dx2 = Math.sign(next.tileX - curr.tileX);
    const dy2 = Math.sign(next.tileY - curr.tileY);

    if (dx1 !== dx2 || dy1 !== dy2) {
      simplified.push(curr);
    }

    prevTx = curr.tileX;
    prevTy = curr.tileY;
  }

  return simplified;
}

interface VillagerDestination {
  readonly tile: TilePoint;
  readonly label: string;
  readonly enterBuildingId: string | null;
}

function pickNextVillagerDestination(
  profile: TownVillagerProfile,
  currentTile: TilePoint,
  buildings: readonly StoredValleyBuilding[],
  navGrid: ValleyNavGrid,
  stepCounter: number
): VillagerDestination {
  const hash = Math.abs(
    Math.floor(Math.sin(stepCounter * 19.37 + profile.phaseSeed * 43.13) * 10000)
  );

  const roll = hash % 10;

  // 1. 45% chance: Walk to a home/workplace Front Doorway and ENTER the house!
  if (roll < 5 && buildings.length > 0) {
    const prefIds = ROLE_PREFERRED_BUILDING_IDS[profile.role];
    const pickedId = prefIds[hash % prefIds.length];

    const targetBld =
      buildings.find((b) => b.id === pickedId) ??
      buildings[hash % buildings.length];

    const doorTile = findNearestWalkableTile(
      navGrid,
      getBuildingDoorTile(targetBld)
    );

    if (
      doorTile.tileX !== currentTile.tileX ||
      doorTile.tileY !== currentTile.tileY
    ) {
      return {
        tile: doorTile,
        label: `Inside ${profile.workplaceLabel}`,
        enterBuildingId: targetBld.id,
      };
    }
  }

  // 2. 25% chance: Venture off-road into the surrounding Pine Forest!
  if (roll >= 5 && roll < 8) {
    const spot = FOREST_OFFROAD_SPOTS[hash % FOREST_OFFROAD_SPOTS.length];

    const safeTile = findNearestWalkableTile(navGrid, {
      tileX: spot.tileX,
      tileY: spot.tileY,
    });

    return {
      tile: safeTile,
      label: spot.label,
      enterBuildingId: null,
    };
  }

  // 3. Otherwise: Stroll along town streets / plaza
  const choices = profile.preferredNodes;
  const nodeId = choices[hash % choices.length];
  const wp = TOWN_STREET_NODES[nodeId];
  const safeTile = findNearestWalkableTile(navGrid, worldToTile(wp.x, wp.y));

  return {
    tile: safeTile,
    label: wp.label,
    enterBuildingId: null,
  };
}

function computeSegmentDurationMs(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  baseSpeedPxPerSec: number,
  navGrid: ValleyNavGrid,
  targetTile: TilePoint
): number {
  const dist = Math.hypot(toX - fromX, toY - fromY);
  const cost = getNavTileCost(navGrid, targetTile.tileX, targetTile.tileY);
  const speedMult = cost === COST_PATH ? 1.35 : cost === COST_FARM ? 0.72 : 0.9;
  const effectiveSpeed = Math.max(30, baseSpeedPxPerSec * speedMult);

  return Math.max(450, Math.round((dist / effectiveSpeed) * 1000));
}

export const MAX_TOWN_VILLAGERS = 64;

/**
 * Generates the live citizen roster tied directly to residential building count:
 * Every residential Cottage built beyond the 4 starter homes brings +4 new citizens into town,
 * each with randomized personality, coins, ambition, and `unique-names-generator` name.
 */
export function buildResidentialTownVillagers(
  residentialBuildingCount: number,
  starterResidentialCount: number,
  residentsPerBuilding: number,
  resolveProfile?: (v: TownVillagerProfile) => TownVillagerProfile,
  starterCast: readonly TownVillagerProfile[] = TOWN_VILLAGERS,
  seedKey = 'expansion'
): TownVillagerProfile[] {
  const extraBuildings = Math.max(
    0,
    residentialBuildingCount - starterResidentialCount
  );

  const extraCount = Math.min(
    MAX_TOWN_VILLAGERS - starterCast.length,
    extraBuildings * residentsPerBuilding
  );

  const out: TownVillagerProfile[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < starterCast.length; i += 1) {
    const base = starterCast[i];
    const resolved = resolveProfile !== undefined ? resolveProfile(base) : base;

    usedNames.add(resolved.name.toLowerCase());
    out.push(resolved);
  }

  const rng = createMulberryPrng(`${seedKey}:res:${residentialBuildingCount}`);

  for (let i = 0; i < extraCount; i += 1) {
    const role = pickFrom(CAST_ROLES_POOL, rng);
    const cottageNum = Math.floor(i / residentsPerBuilding) + 1;

    const settlerBase = buildRandomizedProfile({
      id: `vil_res_${i + 1}`,
      slotIndex: starterCast.length + i,
      role,
      seedKey: `${seedKey}:res`,
      rng,
      usedNames,
      homeLabelOverride: `New Cottage #${cottageNum}`,
    });

    out.push(
      resolveProfile !== undefined ? resolveProfile(settlerBase) : settlerBase
    );
  }

  return out;
}

export function createInitialVillagerRoutes(
  buildings: readonly StoredValleyBuilding[],
  navGrid: ValleyNavGrid,
  villagers: readonly TownVillagerProfile[] = TOWN_VILLAGERS
): VillagerRouteSegment[] {
  const routes: VillagerRouteSegment[] = [];

  for (let i = 0; i < villagers.length; i += 1) {
    const profile = villagers[i];
    const startWp = TOWN_STREET_NODES[profile.startNode];

    const startTile = findNearestWalkableTile(
      navGrid,
      worldToTile(startWp.x, startWp.y)
    );

    const dest = pickNextVillagerDestination(
      profile,
      startTile,
      buildings,
      navGrid,
      i + 1
    );

    const tileQueue = findNavTilePath(navGrid, startTile, dest.tile);
    const firstTile = tileQueue.length > 0 ? tileQueue[0] : startTile;
    const fromX = tileCenterX(startTile.tileX) + profile.laneOffsetX * 0.45;
    const fromY = tileCenterY(startTile.tileY) + profile.laneOffsetY * 0.45;
    const toX = tileCenterX(firstTile.tileX) + profile.laneOffsetX * 0.45;
    const toY = tileCenterY(firstTile.tileY) + profile.laneOffsetY * 0.45;

    const durationMs = computeSegmentDurationMs(
      fromX,
      fromY,
      toX,
      toY,
      profile.speedPxPerSec,
      navGrid,
      firstTile
    );

    const staggerMs = (i % 5) * 260;

    routes.push({
      villagerIndex: i,
      roleRow: profile.roleRow,
      currentTile: startTile,
      targetTile: firstTile,
      tileQueue: tileQueue.slice(1),
      destinationLabel: dest.label,
      enterBuildingId: dest.enterBuildingId,
      isIndoors: false,
      fromX,
      fromY,
      toX,
      toY,
      departClockMs: staggerMs,
      arriveClockMs: staggerMs + durationMs,
      pauseUntilClockMs: staggerMs + durationMs,
      facingDir: computeFacingDir(toX - fromX, toY - fromY, 0),
      phaseSeed: profile.phaseSeed,
    });
  }

  return routes;
}

export function advanceVillagerRoute(
  seg: VillagerRouteSegment,
  nowClockMs: number,
  stepCounter: number,
  buildings: readonly StoredValleyBuilding[],
  navGrid: ValleyNavGrid,
  villagers: readonly TownVillagerProfile[] = TOWN_VILLAGERS
): VillagerRouteSegment {
  const profile = villagers[seg.villagerIndex] ?? TOWN_VILLAGERS[0];
  const arrivedTile = seg.targetTile;

  // Still walking along a multi-hop A* path? Advance to next corner (re-checking collision!)
  if (seg.tileQueue.length > 0) {
    const nextTile = seg.tileQueue[0];

    if (getNavTileCost(navGrid, nextTile.tileX, nextTile.tileY) !== COST_BLOCKED) {
      const fromX = seg.toX;
      const fromY = seg.toY;
      const toX = tileCenterX(nextTile.tileX) + profile.laneOffsetX * 0.45;
      const toY = tileCenterY(nextTile.tileY) + profile.laneOffsetY * 0.45;

      const durationMs = computeSegmentDurationMs(
        fromX,
        fromY,
        toX,
        toY,
        profile.speedPxPerSec,
        navGrid,
        nextTile
      );

      return {
        ...seg,
        currentTile: arrivedTile,
        targetTile: nextTile,
        tileQueue: seg.tileQueue.slice(1),
        isIndoors: false,
        fromX,
        fromY,
        toX,
        toY,
        departClockMs: nowClockMs,
        arriveClockMs: nowClockMs + durationMs,
        pauseUntilClockMs: nowClockMs + durationMs,
        facingDir: computeFacingDir(toX - fromX, toY - fromY, seg.facingDir),
      };
    }
  }

  if (nowClockMs < seg.pauseUntilClockMs) {
    return seg;
  }

  // Reached final destination: if at a house Front Doorway, STEP INSIDE & DISAPPEAR!
  if (seg.pauseUntilClockMs === seg.arriveClockMs) {
    const isEnteringHouse = seg.enterBuildingId !== null;

    const stayMs = isEnteringHouse
      ? 4500 +
        Math.abs(Math.floor(Math.sin(stepCounter * 13.7 + seg.phaseSeed * 9.3) * 4500))
      : 1600 +
        Math.abs(Math.floor(Math.sin(stepCounter * 11.3 + seg.phaseSeed * 7.1) * 2200));

    return {
      ...seg,
      currentTile: arrivedTile,
      tileQueue: [],
      isIndoors: isEnteringHouse,
      fromX: seg.toX,
      fromY: seg.toY,
      departClockMs: nowClockMs,
      arriveClockMs: nowClockMs,
      pauseUntilClockMs: nowClockMs + stayMs,
      facingDir: 0,
    };
  }

  // Stay/pause finished: if indoors, REAPPEAR right at the Front Doorway and walk out!
  let startTile = arrivedTile;

  if (seg.isIndoors && seg.enterBuildingId !== null) {
    const homeBld = buildings.find((b) => b.id === seg.enterBuildingId);

    if (homeBld !== undefined) {
      startTile = findNearestWalkableTile(navGrid, getBuildingDoorTile(homeBld));
    }
  } else {
    startTile = findNearestWalkableTile(navGrid, arrivedTile);
  }

  const dest = pickNextVillagerDestination(
    profile,
    startTile,
    buildings,
    navGrid,
    stepCounter
  );

  const nextPath = findNavTilePath(navGrid, startTile, dest.tile);
  const firstTile = nextPath.length > 0 ? nextPath[0] : startTile;
  const fromX = tileCenterX(startTile.tileX) + profile.laneOffsetX * 0.45;
  const fromY = tileCenterY(startTile.tileY) + profile.laneOffsetY * 0.45;
  const toX = tileCenterX(firstTile.tileX) + profile.laneOffsetX * 0.45;
  const toY = tileCenterY(firstTile.tileY) + profile.laneOffsetY * 0.45;

  const durationMs = computeSegmentDurationMs(
    fromX,
    fromY,
    toX,
    toY,
    profile.speedPxPerSec,
    navGrid,
    firstTile
  );

  return {
    villagerIndex: seg.villagerIndex,
    roleRow: seg.roleRow,
    currentTile: startTile,
    targetTile: firstTile,
    tileQueue: nextPath.slice(1),
    destinationLabel: dest.label,
    enterBuildingId: dest.enterBuildingId,
    isIndoors: false,
    fromX,
    fromY,
    toX,
    toY,
    departClockMs: nowClockMs,
    arriveClockMs: nowClockMs + durationMs,
    pauseUntilClockMs: nowClockMs + durationMs,
    facingDir: computeFacingDir(toX - fromX, toY - fromY, 0),
    phaseSeed: seg.phaseSeed,
  };
}

/**
 * Re-routes any villager whose active destination or current segment became
 * blocked after a player moved a building or reshaped tiles.
 */
export function rerouteBlockedVillagers(
  routes: readonly VillagerRouteSegment[],
  buildings: readonly StoredValleyBuilding[],
  navGrid: ValleyNavGrid,
  nowClockMs: number,
  stepCounter: number,
  villagers: readonly TownVillagerProfile[] = TOWN_VILLAGERS
): VillagerRouteSegment[] {
  const next: VillagerRouteSegment[] = [];

  for (let i = 0; i < routes.length; i += 1) {
    const seg = routes[i];

    if (seg.isIndoors) {
      next.push(seg);
      continue;
    }

    const duration = seg.arriveClockMs - seg.departClockMs;

    const t =
      duration > 1
        ? Math.max(0, Math.min(1, (nowClockMs - seg.departClockMs) / duration))
        : 1;

    const curX = seg.fromX + (seg.toX - seg.fromX) * t;
    const curY = seg.fromY + (seg.toY - seg.fromY) * t;
    const curTile = worldToTile(curX, curY);

    const isBlocked =
      getNavTileCost(navGrid, curTile.tileX, curTile.tileY) === COST_BLOCKED ||
      getNavTileCost(navGrid, seg.targetTile.tileX, seg.targetTile.tileY) ===
        COST_BLOCKED;

    if (!isBlocked) {
      next.push(seg);
      continue;
    }

    const safeTile = findNearestWalkableTile(navGrid, curTile);
    const profile = villagers[seg.villagerIndex] ?? TOWN_VILLAGERS[0];

    const dest = pickNextVillagerDestination(
      profile,
      safeTile,
      buildings,
      navGrid,
      stepCounter + i
    );

    const path = findNavTilePath(navGrid, safeTile, dest.tile);
    const firstTile = path.length > 0 ? path[0] : safeTile;
    const fromX = tileCenterX(safeTile.tileX);
    const fromY = tileCenterY(safeTile.tileY);
    const toX = tileCenterX(firstTile.tileX);
    const toY = tileCenterY(firstTile.tileY);

    const dur = computeSegmentDurationMs(
      fromX,
      fromY,
      toX,
      toY,
      profile.speedPxPerSec,
      navGrid,
      firstTile
    );

    next.push({
      ...seg,
      currentTile: safeTile,
      targetTile: firstTile,
      tileQueue: path.slice(1),
      destinationLabel: dest.label,
      enterBuildingId: dest.enterBuildingId,
      isIndoors: false,
      fromX,
      fromY,
      toX,
      toY,
      departClockMs: nowClockMs,
      arriveClockMs: nowClockMs + dur,
      pauseUntilClockMs: nowClockMs + dur,
      facingDir: computeFacingDir(toX - fromX, toY - fromY, 0),
    });
  }

  return next;
}

export function packVillagerRoutesToFlatBuffer(
  routes: readonly VillagerRouteSegment[],
  villagers: readonly TownVillagerProfile[] = TOWN_VILLAGERS
): number[] {
  const out: number[] = [];

  for (let i = 0; i < routes.length; i += 1) {
    const r = routes[i];
    const profile = villagers[r.villagerIndex];

    out.push(
      r.roleRow,
      r.fromX,
      r.fromY,
      r.toX,
      r.toY,
      r.departClockMs,
      r.arriveClockMs,
      r.facingDir,
      r.phaseSeed,
      profile !== undefined && profile.isHero ? 1 : 0,
      r.isIndoors ? 1 : 0
    );
  }

  return out;
}

/**
 * Routes a live WebSocket `NPC_INTENT` strictly along the A* `ValleyNavGrid`
 * so remote server intents walk around the lake and buildings instead of cutting across water.
 */
export function routeVillagerToNodeWithAStar(
  prev: VillagerRouteSegment,
  targetNodeId: StreetNodeId,
  isIndoors: boolean,
  navGrid: ValleyNavGrid,
  nowClockMs: number,
  villagers: readonly TownVillagerProfile[] = TOWN_VILLAGERS
): VillagerRouteSegment {
  const profile = villagers[prev.villagerIndex] ?? TOWN_VILLAGERS[0];
  const prevDur = prev.arriveClockMs - prev.departClockMs;

  const progress =
    prevDur > 1
      ? Math.max(0, Math.min(1, (nowClockMs - prev.departClockMs) / prevDur))
      : 1;

  const curX = prev.fromX + (prev.toX - prev.fromX) * progress;
  const curY = prev.fromY + (prev.toY - prev.fromY) * progress;
  const startTile = findNearestWalkableTile(navGrid, worldToTile(curX, curY));
  const destNode = TOWN_STREET_NODES[targetNodeId];

  const goalTile = findNearestWalkableTile(
    navGrid,
    worldToTile(destNode.x, destNode.y)
  );

  const path = findNavTilePath(navGrid, startTile, goalTile);
  const firstTile = path.length > 0 ? path[0] : startTile;
  const safeFromX = tileCenterX(startTile.tileX) + profile.laneOffsetX * 0.35;
  const safeFromY = tileCenterY(startTile.tileY) + profile.laneOffsetY * 0.35;
  const toX = tileCenterX(firstTile.tileX) + profile.laneOffsetX * 0.35;
  const toY = tileCenterY(firstTile.tileY) + profile.laneOffsetY * 0.35;

  const legDurationMs = computeSegmentDurationMs(
    safeFromX,
    safeFromY,
    toX,
    toY,
    profile.speedPxPerSec,
    navGrid,
    firstTile
  );

  return {
    ...prev,
    currentTile: startTile,
    targetTile: firstTile,
    tileQueue: path.slice(1),
    destinationLabel: destNode.label,
    enterBuildingId: null,
    isIndoors,
    fromX: safeFromX,
    fromY: safeFromY,
    toX,
    toY,
    departClockMs: nowClockMs,
    arriveClockMs: nowClockMs + legDurationMs,
    pauseUntilClockMs: nowClockMs + legDurationMs,
    facingDir: computeFacingDir(toX - safeFromX, toY - safeFromY, prev.facingDir),
  };
}
