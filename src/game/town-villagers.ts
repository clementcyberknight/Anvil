import type { ValleyPlantedCrop } from '@/game/economy-engine';
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

export type VillagerArchetype =
  | 'Founder Hero'
  | 'Town Sovereign'
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
    label: 'Lakefront Promenade',
    x: bx(27.5),
    y: by(47.42),
    neighbors: ['civic_plaza', 'lake_nw', 'lake_ne'],
  },
  lake_nw: {
    id: 'lake_nw',
    label: 'NW Cottage Corner',
    x: bx(25.9),
    y: by(47.42),
    neighbors: ['lake_north_center', 'west_sawmill'],
  },
  lake_ne: {
    id: 'lake_ne',
    label: 'Harbor Pier Overlook',
    x: bx(29.0),
    y: by(47.42),
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

export const TOWN_VILLAGERS: readonly TownVillagerProfile[] = [
  {
    id: 'vil_mayor',
    name: 'Mayor Barnaby',
    role: 'mayor',
    roleRow: VILLAGER_ROLE_ROW.mayor,
    isHero: false,
    archetype: 'Town Sovereign',
    housingStatus: 'Town Hall Official',
    homeLabel: 'Town Hall',
    workplaceLabel: 'Town Hall & Treasury',
    coins: 1450,
    rentSummary: 'Treasury: 1,450 FC · Tax 10%',
    activity: 'Managing First Freeze fish & firewood rations',
    thought: '72 hours till the pass thaws—Fish Stew & Firewood keep us alive!',
    inventory: [
      { item: 'Tax Decree', qty: 1 },
      { item: 'Fish Stew', qty: 2 },
    ],
    preferredNodes: [
      'civic_plaza',
      'lake_north_center',
      'plaza_north',
      'plaza_south',
    ],
    speedPxPerSec: 68,
    startNode: 'civic_plaza',
    laneOffsetX: -12,
    laneOffsetY: 4,
    phaseSeed: 1.4,
  },
  {
    id: 'vil_builder_1',
    name: 'Hector',
    role: 'builder',
    roleRow: VILLAGER_ROLE_ROW.builder,
    isHero: false,
    archetype: 'Ambitious Entrepreneur',
    housingStatus: 'Business Owner',
    homeLabel: 'Builder Workshop',
    workplaceLabel: 'Builder Shop',
    coins: 410,
    rentSummary: 'Owns Builder Shop · +90 FC/job',
    activity: 'Hauling timber for new cottages',
    thought: 'Need 6 more iron nails from the Blacksmith before framing!',
    inventory: [
      { item: 'Pine Planks', qty: 12 },
      { item: 'Blueprints', qty: 2 },
      { item: 'Iron Nails', qty: 18 },
    ],
    preferredNodes: [
      'west_builder',
      'west_sawmill',
      'west_blacksmith',
      'plaza_west',
      'east_cottage',
    ],
    speedPxPerSec: 74,
    startNode: 'west_builder',
    laneOffsetX: 10,
    laneOffsetY: -6,
    phaseSeed: 2.2,
  },
  {
    id: 'vil_builder_2',
    name: 'Bram',
    role: 'builder',
    roleRow: VILLAGER_ROLE_ROW.builder,
    isHero: false,
    archetype: 'Frugal Saver',
    housingStatus: 'Tenant',
    homeLabel: 'SW Citizen Cottage',
    workplaceLabel: 'Builder Crew',
    coins: 185,
    rentSummary: 'Pays 24 FC rent · Saving for home',
    activity: 'Surveying plots near South Farm',
    thought: 'Two more construction contracts and I can buy my own cottage.',
    inventory: [
      { item: 'Pine Planks', qty: 6 },
      { item: 'Mallet', qty: 1 },
    ],
    preferredNodes: [
      'west_builder',
      'west_blacksmith',
      'plaza_south',
      'south_farm_mid',
    ],
    speedPxPerSec: 76,
    startNode: 'west_main',
    laneOffsetX: -14,
    laneOffsetY: 8,
    phaseSeed: 3.1,
  },
  {
    id: 'vil_baker',
    name: 'Mabel',
    role: 'baker',
    roleRow: VILLAGER_ROLE_ROW.baker,
    isHero: false,
    archetype: 'Community Artisan',
    housingStatus: 'Business Owner',
    homeLabel: 'Cozy Bakery Loft',
    workplaceLabel: 'Cozy Bakery',
    coins: 328,
    rentSummary: 'Owns Bakery · 10% business tax',
    activity: 'Picking up fresh flour from Windmill',
    thought: 'Loaves sell out fast whenever snow starts falling!',
    inventory: [
      { item: 'Warm Bread', qty: 14 },
      { item: 'Wheat Flour', qty: 5 },
    ],
    preferredNodes: [
      'plaza_north',
      'west_main',
      'plaza_east',
      'east_ranch',
    ],
    speedPxPerSec: 72,
    startNode: 'plaza_north',
    laneOffsetX: 14,
    laneOffsetY: 6,
    phaseSeed: 4.0,
  },
  {
    id: 'vil_blacksmith',
    name: 'Torin',
    role: 'blacksmith',
    roleRow: VILLAGER_ROLE_ROW.blacksmith,
    isHero: false,
    archetype: 'Winter Prepper',
    housingStatus: 'Homeowner',
    homeLabel: 'Forge Quarters',
    workplaceLabel: 'Yeti Blacksmith',
    coins: 390,
    rentSummary: 'Owns Forge · 0 FC rent',
    activity: 'Delivering forged nails & axes',
    thought: 'Stockpiling coal and firewood early before Winter 2x hits.',
    inventory: [
      { item: 'Iron Nails', qty: 24 },
      { item: 'Steel Axe', qty: 2 },
      { item: 'Firewood', qty: 9 },
    ],
    preferredNodes: [
      'west_blacksmith',
      'west_builder',
      'west_sawmill',
      'plaza_west',
    ],
    speedPxPerSec: 70,
    startNode: 'west_blacksmith',
    laneOffsetX: 12,
    laneOffsetY: -4,
    phaseSeed: 4.8,
  },
  {
    id: 'vil_lumberjack',
    name: 'Gunnar',
    role: 'lumberjack',
    roleRow: VILLAGER_ROLE_ROW.lumberjack,
    isHero: false,
    archetype: 'Winter Prepper',
    housingStatus: 'Homeowner',
    homeLabel: 'NW Citizen Cottage',
    workplaceLabel: 'Cozy Sawmill',
    coins: 295,
    rentSummary: 'Homeowner · Sells Firewood',
    activity: 'Hauling freshly split pine logs',
    thought: 'Everyone begs for firewood once the blizzard rolls in.',
    inventory: [
      { item: 'Firewood', qty: 18 },
      { item: 'Pine Planks', qty: 10 },
    ],
    preferredNodes: [
      'west_sawmill',
      'lake_nw',
      'west_builder',
      'plaza_west',
    ],
    speedPxPerSec: 73,
    startNode: 'west_sawmill',
    laneOffsetX: -12,
    laneOffsetY: -8,
    phaseSeed: 5.5,
  },
  {
    id: 'vil_farmer',
    name: 'Pip',
    role: 'farmer',
    roleRow: VILLAGER_ROLE_ROW.farmer,
    isHero: false,
    archetype: 'Frugal Saver',
    housingStatus: 'Tenant',
    homeLabel: 'East Village Cottage',
    workplaceLabel: 'South Farmland',
    coins: 152,
    rentSummary: 'Tenant · 22 FC/cycle',
    activity: 'Carrying grain toward the Windmill',
    thought: 'Cleared loamy soil grows pine and grain twice as fast!',
    inventory: [
      { item: 'Wheat Sheaves', qty: 11 },
      { item: 'Pine Seeds', qty: 6 },
    ],
    preferredNodes: [
      'south_farm_end',
      'south_farm_mid',
      'plaza_south',
      'west_main',
    ],
    speedPxPerSec: 75,
    startNode: 'south_farm_end',
    laneOffsetX: 12,
    laneOffsetY: 0,
    phaseSeed: 6.2,
  },
  {
    id: 'vil_rancher',
    name: 'Freya',
    role: 'rancher',
    roleRow: VILLAGER_ROLE_ROW.rancher,
    isHero: false,
    archetype: 'Community Artisan',
    housingStatus: 'Business Owner',
    homeLabel: 'Yak Barn Loft',
    workplaceLabel: 'Yak Barn & Creamery',
    coins: 344,
    rentSummary: 'Owns Yak Barn · Steady dairy trade',
    activity: 'Delivering yak milk to Cheese Cellar',
    thought: 'Aged alpine cheese trades for a fortune at the Market Hall.',
    inventory: [
      { item: 'Yak Milk', qty: 8 },
      { item: 'Alpine Cheese', qty: 6 },
    ],
    preferredNodes: [
      'east_ranch',
      'east_main',
      'plaza_east',
      'plaza_north',
    ],
    speedPxPerSec: 71,
    startNode: 'east_ranch',
    laneOffsetX: -10,
    laneOffsetY: 6,
    phaseSeed: 7.0,
  },
  {
    id: 'vil_miller',
    name: 'Orson',
    role: 'miller',
    roleRow: VILLAGER_ROLE_ROW.miller,
    isHero: false,
    archetype: 'Frugal Saver',
    housingStatus: 'Homeowner',
    homeLabel: 'Windmill Cottage',
    workplaceLabel: 'Windmill Cottage',
    coins: 260,
    rentSummary: 'Homeowner · Supplies Bakery',
    activity: 'Delivering flour sacks to Bakery',
    thought: 'Good breeze off the frozen lake keeps the millstones turning.',
    inventory: [
      { item: 'Wheat Flour', qty: 15 },
      { item: 'Grain Sack', qty: 4 },
    ],
    preferredNodes: [
      'west_main',
      'plaza_west',
      'plaza_north',
      'south_farm_mid',
    ],
    speedPxPerSec: 69,
    startNode: 'plaza_west',
    laneOffsetX: 6,
    laneOffsetY: 12,
    phaseSeed: 7.9,
  },
  {
    id: 'vil_angler',
    name: 'Finn',
    role: 'angler',
    roleRow: VILLAGER_ROLE_ROW.angler,
    isHero: false,
    archetype: 'Community Artisan',
    housingStatus: 'Homeowner',
    homeLabel: 'Fishing Pier Cabin',
    workplaceLabel: 'Lakeside Fishing Pier',
    coins: 274,
    rentSummary: 'Homeowner · Fresh lake trout',
    activity: 'Bringing fresh trout to Smokehouse',
    thought: 'Ice trout are biting right near the east dock today!',
    inventory: [
      { item: 'Frost Trout', qty: 9 },
      { item: 'Smoked Fish', qty: 4 },
    ],
    preferredNodes: [
      'east_harbor',
      'east_smokehouse',
      'lake_ne',
      'plaza_east',
    ],
    speedPxPerSec: 72,
    startNode: 'east_harbor',
    laneOffsetX: 12,
    laneOffsetY: -6,
    phaseSeed: 8.6,
  },
  {
    id: 'vil_banker',
    name: 'Alistair',
    role: 'banker',
    roleRow: VILLAGER_ROLE_ROW.banker,
    isHero: false,
    archetype: 'Ambitious Entrepreneur',
    housingStatus: 'Business Owner',
    homeLabel: 'Bank Upper Flat',
    workplaceLabel: 'Town Bank & Treasury',
    coins: 720,
    rentSummary: 'Manages loans & Market exchange',
    activity: 'Auditing Market Hall trade ledgers',
    thought: 'Three citizens applied for cottage construction loans this week.',
    inventory: [
      { item: 'Gold Ledger', qty: 1 },
      { item: 'Loan Deeds', qty: 3 },
    ],
    preferredNodes: [
      'civic_plaza',
      'lake_north_center',
      'lake_ne',
      'east_main',
      'plaza_north',
    ],
    speedPxPerSec: 70,
    startNode: 'lake_north_center',
    laneOffsetX: 14,
    laneOffsetY: -6,
    phaseSeed: 9.3,
  },
  {
    id: 'vil_landlord',
    name: 'Lord Sterling',
    role: 'landlord',
    roleRow: VILLAGER_ROLE_ROW.landlord,
    isHero: false,
    archetype: 'Property Landlord',
    housingStatus: 'Landlord',
    homeLabel: 'East Village Cottage',
    workplaceLabel: '3 Rental Cottages',
    coins: 890,
    rentSummary: 'Collects +72 FC/cycle · 12% prop. tax',
    activity: 'Collecting rent & eyeing open 4×4 plots',
    thought: 'Hiring Hector to build a 4th rental cottage near the Plaza.',
    inventory: [
      { item: 'House Keys', qty: 3 },
      { item: 'Land Deeds', qty: 2 },
    ],
    preferredNodes: [
      'east_cottage',
      'east_main',
      'plaza_east',
      'west_builder',
      'lake_nw',
      'civic_plaza',
    ],
    speedPxPerSec: 66,
    startNode: 'east_cottage',
    laneOffsetX: 0,
    laneOffsetY: 10,
    phaseSeed: 10.1,
  },
  {
    id: 'vil_police',
    name: 'Officer Vane',
    role: 'police',
    roleRow: VILLAGER_ROLE_ROW.police,
    isHero: false,
    archetype: 'Civic Protector',
    housingStatus: 'Public Servant',
    homeLabel: 'Town Hall Watchroom',
    workplaceLabel: 'Town Watch Patrol',
    coins: 215,
    rentSummary: 'Treasury salary: +35 FC/cycle',
    activity: 'Patrolling Bank & Market streets',
    thought: 'Spotted a hooded rogue snooping near the Smokehouse alley...',
    inventory: [
      { item: 'Brass Lantern', qty: 1 },
      { item: 'Watch Whistle', qty: 1 },
    ],
    preferredNodes: [
      'plaza_north',
      'civic_plaza',
      'east_smokehouse',
      'east_main',
      'plaza_south',
      'west_main',
    ],
    speedPxPerSec: 80,
    startNode: 'plaza_east',
    laneOffsetX: -8,
    laneOffsetY: -10,
    phaseSeed: 11.0,
  },
  {
    id: 'vil_criminal',
    name: 'Sly Rusk',
    role: 'criminal',
    roleRow: VILLAGER_ROLE_ROW.criminal,
    isHero: false,
    archetype: 'Opportunist Outlaw',
    housingStatus: 'Undercover Squatter',
    homeLabel: 'Pine Edge Hideout',
    workplaceLabel: 'Unregistered Alleyways',
    coins: 142,
    rentSummary: '0 FC rent · Avoids Guard patrol',
    activity: 'Scouting unguarded firewood stacks',
    thought: 'Keep clear of Officer Vane’s lantern around the Bank...',
    inventory: [
      { item: 'Pilfered Coins', qty: 42 },
      { item: 'Stolen Bread', qty: 2 },
    ],
    preferredNodes: [
      'lake_nw',
      'west_sawmill',
      'west_blacksmith',
      'east_smokehouse',
      'east_cottage',
    ],
    speedPxPerSec: 84,
    startNode: 'east_smokehouse',
    laneOffsetX: -16,
    laneOffsetY: 6,
    phaseSeed: 11.8,
  },
  {
    id: 'vil_cultist',
    name: 'Elder Vesper',
    role: 'cultist',
    roleRow: VILLAGER_ROLE_ROW.cultist,
    isHero: false,
    archetype: 'Frost Zealot',
    housingStatus: 'Communal Co-Owner',
    homeLabel: 'Hidden Frost Shrine Fund',
    workplaceLabel: 'Order of the Eternal Frost',
    coins: 168,
    rentSummary: 'Tithes 30% to Shrine Pool (310 FC)',
    activity: 'Whispering prophecies at the Stone Well',
    thought: 'When Winter doubles the bread price, the weary will listen.',
    inventory: [
      { item: 'Frost Lantern', qty: 1 },
      { item: 'Ice Relic', qty: 2 },
    ],
    preferredNodes: [
      'plaza_south',
      'south_farm_end',
      'lake_nw',
      'lake_ne',
    ],
    speedPxPerSec: 64,
    startNode: 'plaza_south',
    laneOffsetX: -14,
    laneOffsetY: -8,
    phaseSeed: 12.6,
  },
  {
    id: 'vil_unemployed',
    name: 'Toby',
    role: 'unemployed',
    roleRow: VILLAGER_ROLE_ROW.unemployed,
    isHero: false,
    archetype: 'Hopeful Drifter',
    housingStatus: 'Unhoused Transient',
    homeLabel: 'Plaza Stone Well Bench',
    workplaceLabel: 'Seeking Day-Labor',
    coins: 18,
    rentSummary: '0 FC rent · Needs 22 FC for Cottage',
    activity: 'Looking for plank-hauling shifts',
    thought: 'Hope Hector or the Sawmill has odd work before dark...',
    inventory: [
      { item: 'Travel Bindle', qty: 1 },
      { item: 'Crusty Bread', qty: 1 },
    ],
    preferredNodes: [
      'plaza_south',
      'plaza_west',
      'west_builder',
      'west_sawmill',
    ],
    speedPxPerSec: 60,
    startNode: 'plaza_south',
    laneOffsetX: 16,
    laneOffsetY: 10,
    phaseSeed: 13.4,
  },
  {
    id: 'vil_citizen_1',
    name: 'Nora',
    role: 'citizen',
    roleRow: VILLAGER_ROLE_ROW.citizen,
    isHero: false,
    archetype: 'Frugal Saver',
    housingStatus: 'Tenant',
    homeLabel: 'NW Citizen Cottage',
    workplaceLabel: 'Market Helper',
    coins: 196,
    rentSummary: 'Tenant · 22 FC/cycle',
    activity: 'Shopping for bread & cheese',
    thought: 'Comparing Bakery prices before Winter sets in.',
    inventory: [
      { item: 'Warm Bread', qty: 3 },
      { item: 'Alpine Cheese', qty: 2 },
    ],
    preferredNodes: [
      'lake_nw',
      'lake_north_center',
      'plaza_north',
      'plaza_east',
    ],
    speedPxPerSec: 74,
    startNode: 'lake_nw',
    laneOffsetX: 10,
    laneOffsetY: 8,
    phaseSeed: 14.2,
  },
  {
    id: 'vil_citizen_2',
    name: 'Bramble',
    role: 'citizen',
    roleRow: VILLAGER_ROLE_ROW.citizen,
    isHero: false,
    archetype: 'Community Artisan',
    housingStatus: 'Tenant',
    homeLabel: 'SW Citizen Cottage',
    workplaceLabel: 'Plaza Porter',
    coins: 210,
    rentSummary: 'Tenant · 24 FC/cycle',
    activity: 'Chatting with neighbors by the Well',
    thought: 'The new street lanterns make evening walks feel so cozy!',
    inventory: [
      { item: 'Smoked Fish', qty: 2 },
      { item: 'Firewood', qty: 4 },
    ],
    preferredNodes: [
      'plaza_west',
      'plaza_south',
      'east_main',
      'east_ranch',
    ],
    speedPxPerSec: 72,
    startNode: 'east_main',
    laneOffsetX: -12,
    laneOffsetY: -10,
    phaseSeed: 15.0,
  },
];

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

      if (isLakeTile(tx, ty) || isPlazaWellTile(tx, ty)) {
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
      !isLakeTile(door.tileX, door.tileY) &&
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

export function createInitialVillagerRoutes(
  buildings: readonly StoredValleyBuilding[],
  navGrid: ValleyNavGrid
): VillagerRouteSegment[] {
  const routes: VillagerRouteSegment[] = [];

  for (let i = 0; i < TOWN_VILLAGERS.length; i += 1) {
    const profile = TOWN_VILLAGERS[i];
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
  navGrid: ValleyNavGrid
): VillagerRouteSegment {
  const profile = TOWN_VILLAGERS[seg.villagerIndex];
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
  stepCounter: number
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
    const profile = TOWN_VILLAGERS[seg.villagerIndex];

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
  routes: readonly VillagerRouteSegment[]
): number[] {
  const out: number[] = [];

  for (let i = 0; i < routes.length; i += 1) {
    const r = routes[i];

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
      TOWN_VILLAGERS[r.villagerIndex].isHero ? 1 : 0,
      r.isIndoors ? 1 : 0
    );
  }

  return out;
}
