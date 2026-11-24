import {
  VALLEY_BLOCK_PX,
  VALLEY_BORDER_X,
  VALLEY_BORDER_Y,
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
  readonly currentNode: StreetNodeId;
  readonly targetNode: StreetNodeId;
  readonly pathQueue: readonly StreetNodeId[];
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
 */
export const VILLAGER_BUFFER_STRIDE = 10;

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

/**
 * Deterministic BFS shortest path along cobblestone street waypoints.
 */
export function findStreetPath(
  fromId: StreetNodeId,
  toId: StreetNodeId
): StreetNodeId[] {
  if (fromId === toId) {
    return [];
  }

  const queue: StreetNodeId[] = [fromId];
  const visited = new Set<StreetNodeId>([fromId]);
  const parentMap = new Map<StreetNodeId, StreetNodeId>();
  let head = 0;

  while (head < queue.length) {
    const curr = queue[head];

    head += 1;

    if (curr === toId) {
      break;
    }

    const neighbors = TOWN_STREET_NODES[curr].neighbors;

    for (let i = 0; i < neighbors.length; i += 1) {
      const next = neighbors[i];

      if (!visited.has(next)) {
        visited.add(next);
        parentMap.set(next, curr);
        queue.push(next);
      }
    }
  }

  if (!visited.has(toId)) {
    return [];
  }

  const reversed: StreetNodeId[] = [];
  let cursor: StreetNodeId | undefined = toId;

  while (cursor !== undefined && cursor !== fromId) {
    reversed.push(cursor);
    cursor = parentMap.get(cursor);
  }

  reversed.reverse();

  return reversed;
}

function pickNextDestination(
  profile: TownVillagerProfile,
  currentNode: StreetNodeId,
  stepCounter: number
): StreetNodeId {
  const choices = profile.preferredNodes;

  if (choices.length <= 1) {
    return currentNode;
  }

  const hash = Math.abs(
    Math.floor(Math.sin(stepCounter * 19.37 + profile.phaseSeed * 43.13) * 10000)
  );

  let idx = hash % choices.length;

  if (choices[idx] === currentNode) {
    idx = (idx + 1) % choices.length;
  }

  return choices[idx];
}

export function createInitialVillagerRoutes(): VillagerRouteSegment[] {
  const routes: VillagerRouteSegment[] = [];

  for (let i = 0; i < TOWN_VILLAGERS.length; i += 1) {
    const profile = TOWN_VILLAGERS[i];
    const startWaypoint = TOWN_STREET_NODES[profile.startNode];
    const destId = pickNextDestination(profile, profile.startNode, i + 1);
    const pathQueue = findStreetPath(profile.startNode, destId);
    const nextNodeId = pathQueue.length > 0 ? pathQueue[0] : profile.startNode;
    const nextWaypoint = TOWN_STREET_NODES[nextNodeId];

    const fromX = startWaypoint.x + profile.laneOffsetX;
    const fromY = startWaypoint.y + profile.laneOffsetY;
    const toX = nextWaypoint.x + profile.laneOffsetX;
    const toY = nextWaypoint.y + profile.laneOffsetY;
    const dist = Math.hypot(toX - fromX, toY - fromY);
    const durationMs = Math.max(900, Math.round((dist / profile.speedPxPerSec) * 1000));
    const staggerMs = (i % 5) * 280;

    routes.push({
      villagerIndex: i,
      roleRow: profile.roleRow,
      currentNode: profile.startNode,
      targetNode: nextNodeId,
      pathQueue: pathQueue.slice(1),
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
  stepCounter: number
): VillagerRouteSegment {
  const profile = TOWN_VILLAGERS[seg.villagerIndex];
  const arrivedNode = seg.targetNode;

  // Still walking along a multi-hop street path? Continue immediately to the next corner!
  if (seg.pathQueue.length > 0) {
    const nextNodeId = seg.pathQueue[0];
    const fromX = seg.toX;
    const fromY = seg.toY;
    const nextWp = TOWN_STREET_NODES[nextNodeId];
    const toX = nextWp.x + profile.laneOffsetX;
    const toY = nextWp.y + profile.laneOffsetY;
    const dist = Math.hypot(toX - fromX, toY - fromY);
    const durationMs = Math.max(800, Math.round((dist / profile.speedPxPerSec) * 1000));

    return {
      villagerIndex: seg.villagerIndex,
      roleRow: seg.roleRow,
      currentNode: arrivedNode,
      targetNode: nextNodeId,
      pathQueue: seg.pathQueue.slice(1),
      fromX,
      fromY,
      toX,
      toY,
      departClockMs: nowClockMs,
      arriveClockMs: nowClockMs + durationMs,
      pauseUntilClockMs: nowClockMs + durationMs,
      facingDir: computeFacingDir(toX - fromX, toY - fromY, seg.facingDir),
      phaseSeed: seg.phaseSeed,
    };
  }

  // Reached final destination: if not paused yet, pause briefly (1.8–4.0s) like chatting/shopping
  if (nowClockMs < seg.pauseUntilClockMs) {
    return seg;
  }

  if (seg.pauseUntilClockMs === seg.arriveClockMs) {
    const pauseMs =
      1800 +
      Math.abs(Math.floor(Math.sin(stepCounter * 11.3 + seg.phaseSeed * 7.1) * 2200));

    return {
      ...seg,
      fromX: seg.toX,
      fromY: seg.toY,
      departClockMs: nowClockMs,
      arriveClockMs: nowClockMs,
      pauseUntilClockMs: nowClockMs + pauseMs,
      facingDir: 0,
    };
  }

  // Pause finished: pick a fresh town destination and walk there via cobblestone streets
  const destId = pickNextDestination(profile, arrivedNode, stepCounter);
  const nextPath = findStreetPath(arrivedNode, destId);
  const nextNodeId = nextPath.length > 0 ? nextPath[0] : arrivedNode;
  const fromX = seg.toX;
  const fromY = seg.toY;
  const nextWp = TOWN_STREET_NODES[nextNodeId];
  const toX = nextWp.x + profile.laneOffsetX;
  const toY = nextWp.y + profile.laneOffsetY;
  const dist = Math.hypot(toX - fromX, toY - fromY);
  const durationMs = Math.max(900, Math.round((dist / profile.speedPxPerSec) * 1000));

  return {
    villagerIndex: seg.villagerIndex,
    roleRow: seg.roleRow,
    currentNode: arrivedNode,
    targetNode: nextNodeId,
    pathQueue: nextPath.slice(1),
    fromX,
    fromY,
    toX,
    toY,
    departClockMs: nowClockMs,
    arriveClockMs: nowClockMs + durationMs,
    pauseUntilClockMs: nowClockMs + durationMs,
    facingDir: computeFacingDir(toX - fromX, toY - fromY, seg.facingDir),
    phaseSeed: seg.phaseSeed,
  };
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
      TOWN_VILLAGERS[r.villagerIndex].isHero ? 1 : 0
    );
  }

  return out;
}
