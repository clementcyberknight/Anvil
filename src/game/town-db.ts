import * as SQLite from 'expo-sqlite';
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv';

import {
  type CropKind,
  getEconomyItem,
  INITIAL_POUCH_ENTRIES,
  type PouchEntry,
  STARTING_CAPITAL_FC,
  type ValleyPlantedCrop,
} from '@/game/economy-engine';
import { ICON_ATLAS_FRAMES, type GameIconKey } from '@/game/icon-atlas';
import {
  createStarterBuildings,
  createStarterCrops,
  createStarterOres,
  createStarterTrees,
  YETI_SPAWN_TILE,
} from '@/game/map-data';
import {
  type ArmyUnitKey,
  createDefaultGovernanceState,
  type OfficeHolder,
  type TownGovernanceState,
  type WarbandSlot,
  type WinterPolicy,
} from '@/game/town-governance';
import type {
  BuildingEntity,
  BuildingKind,
  CropEntity,
  CropState,
  InventoryCounts,
  OreNodeEntity,
  Season,
  TileCoord,
  TreeEntity,
} from '@/game/types';
import {
  BLOCK_GRID_SIZE,
  type BuildingFacing,
  createStarterValleyTrees,
  type DynamicPatchKind,
  isBlockBlockedForSoil,
  isTileBlockedForLandEdit,
  type StoredValleyBuilding,
  type TownBuildingSpriteKey,
  VALLEY_BLOCK_COLS,
  VALLEY_BLOCK_ROWS,
  VALLEY_STARTER_BUILDINGS,
  VALLEY_TILE_COLS,
  VALLEY_TILE_ROWS,
  type ValleyPlantedTree,
} from '@/game/valley-zones';
import { sessionStorage } from '@/lib/storage';

const TOWN_KEYS = {
  coins: 'town.v4.coins',
  treasury: 'town.v4.treasury',
  wood: 'town.v4.wood',
  planks: 'town.v4.planks',
  firewood: 'town.v4.firewood',
  pineSaplings: 'town.v4.pineSaplings',
  stone: 'town.v4.stone',
  ironOre: 'town.v4.ironOre',
  fish: 'town.v4.fish',
  maizeSeeds: 'town.v4.maizeSeeds',
  maize: 'town.v4.maize',
  flour: 'town.v4.flour',
  bread: 'town.v4.bread',
  toolTier: 'town.v4.toolTier',
  season: 'town.v4.season',
  seasonEpochMs: 'town.v5.seasonEpochMs',
  founderCoins: 'town.v5.founderCoins',
  pouchEntries: 'town.v5.pouchEntries',
  governanceState: 'town.v5.governanceState',
  yetiX: 'town.v4.yetiX',
  yetiY: 'town.v4.yetiY',
  seeded: 'town.seeded.v4',
  townId: 'town.v6.townId',
  townName: 'town.v6.name',
  townSeed: 'town.v6.seed',
  townStarted: 'town.v6.started',
  cleanResetV6: 'town.v6.cleanResetDone',
  officeHolderNpcId: 'town.v6.officeHolderNpcId',
  officeHolderName: 'town.v6.officeHolderName',
} as const;

const LOCAL_TOWN_SQLITE_TABLES: readonly string[] = [
  'town_trees',
  'town_crops',
  'town_buildings',
  'town_ores',
  'town_land_blocks',
  'town_valley_trees',
  'town_valley_buildings',
  'town_valley_crops',
  'town_valley_tiles',
];

function shouldClearLocalKeyOnReset(key: string): boolean {
  if (key === TOWN_KEYS.cleanResetV6) {
    return false;
  }

  return (
    key.startsWith('town.') ||
    key.startsWith('bank.') ||
    key.startsWith('npc.') ||
    key.startsWith('mp.v1.seq.') ||
    key === 'mp.v1.outbox' ||
    key === 'mp.v1.streamQueue' ||
    key === 'mp.v1.visitingTownId' ||
    key === 'mp.v1.homeTownId'
  );
}

/**
 * Wipes all local SQLite world entities and stale town/bank/sync MMKV keys,
 * returning the local client to a clean pre-founding state.
 */
export function resetAllLocalTownData(): void {
  const db = getTownDb();

  db.withTransactionSync(() => {
    for (let i = 0; i < LOCAL_TOWN_SQLITE_TABLES.length; i += 1) {
      db.execSync(`DELETE FROM ${LOCAL_TOWN_SQLITE_TABLES[i]};`);
    }
  });

  const keys = sessionStorage.getAllKeys();

  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i];

    if (shouldClearLocalKeyOnReset(k)) {
      sessionStorage.remove(k);
    }
  }

  sessionStorage.set(TOWN_KEYS.townStarted, false);
}

/**
 * Performs a one-time clean database wipe after upgrading to custom-named towns.
 */
export function ensureFreshLocalCleanStateOnce(): void {
  const alreadyCleaned = sessionStorage.getBoolean(TOWN_KEYS.cleanResetV6) ?? false;

  if (alreadyCleaned) {
    return;
  }

  resetAllLocalTownData();
  sessionStorage.set(TOWN_KEYS.cleanResetV6, true);
}

export function loadActiveHomeTownId(): string {
  const saved = sessionStorage.getString(TOWN_KEYS.townId);

  if (saved !== undefined && saved.trim().length > 0) {
    return saved.trim();
  }

  const mpHome = sessionStorage.getString('mp.v1.homeTownId');

  if (mpHome !== undefined && mpHome.trim().length > 0) {
    return mpHome.trim();
  }

  return 'town_1';
}

export function loadTownName(): string {
  const saved = sessionStorage.getString(TOWN_KEYS.townName);

  if (saved !== undefined && saved.trim().length > 0) {
    return saved.trim();
  }

  return 'New Anvil Town';
}

export function saveTownName(townName: string): void {
  const clean = townName.trim().slice(0, 48);

  if (clean.length === 0) {
    return;
  }

  sessionStorage.set(TOWN_KEYS.townName, clean);
}

export function loadTownRosterSeed(): string {
  const saved = sessionStorage.getString(TOWN_KEYS.townSeed);

  if (saved !== undefined && saved.trim().length > 0) {
    return saved.trim();
  }

  const freshSeed = `${loadActiveHomeTownId()}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.set(TOWN_KEYS.townSeed, freshSeed);

  return freshSeed;
}

export interface StartedTownResult {
  readonly townId: string;
  readonly townName: string;
}

/**
 * Cleans stale local world data, assigns a fresh unique town ID + player-chosen name,
 * seeds fresh starter entities, and marks the town started.
 */
export function startNamedTown(townName: string): StartedTownResult {
  const cleanName = townName.trim().slice(0, 48) || 'Frosthaven';
  resetAllLocalTownData();

  const newTownId = `town_${Date.now().toString(36)}`;
  const freshRosterSeed = `${newTownId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;

  sessionStorage.set(TOWN_KEYS.cleanResetV6, true);
  sessionStorage.set(TOWN_KEYS.townId, newTownId);
  sessionStorage.set(TOWN_KEYS.townSeed, freshRosterSeed);
  sessionStorage.set('mp.v1.homeTownId', newTownId);
  sessionStorage.set('mp.v1.visitingTownId', newTownId);
  sessionStorage.set(TOWN_KEYS.townName, cleanName);

  ensureTownSeeded();
  sessionStorage.set(TOWN_KEYS.townStarted, true);

  return {
    townId: newTownId,
    townName: cleanName,
  };
}

export function useTownSetupStatus() {
  ensureFreshLocalCleanStateOnce();

  const [storedStarted] = useMMKVBoolean(TOWN_KEYS.townStarted, sessionStorage);
  const [storedName] = useMMKVString(TOWN_KEYS.townName, sessionStorage);
  const [storedTownId] = useMMKVString(TOWN_KEYS.townId, sessionStorage);

  const hasStartedTown = storedStarted ?? false;

  const townName =
    storedName !== undefined && storedName.trim().length > 0
      ? storedName.trim()
      : 'New Anvil Town';

  const activeTownId =
    storedTownId !== undefined && storedTownId.trim().length > 0
      ? storedTownId.trim()
      : 'town_1';

  return {
    hasStartedTown,
    townName,
    activeTownId,
    foundTown: startNamedTown,
    renameTown: saveTownName,
    resetTown: resetAllLocalTownData,
  };
}

const DEFAULT_INVENTORY: InventoryCounts = {
  coins: 200,
  treasury: 160,
  wood: 12,
  planks: 4,
  firewood: 4,
  pineSaplings: 6,
  stone: 6,
  ironOre: 2,
  fish: 2,
  maizeSeeds: 8,
  maize: 4,
  flour: 0,
  bread: 0,
  toolTier: 1,
};

interface TreeRow {
  readonly id: string;
  readonly gx: number;
  readonly gy: number;
  readonly planted_at_ms: number;
  readonly mature_at_ms: number;
  readonly hits_remaining: number;
  readonly is_stump: number;
}

interface CropRow {
  readonly id: string;
  readonly gx: number;
  readonly gy: number;
  readonly state: string;
  readonly planted_at_ms: number;
  readonly ready_at_ms: number;
  readonly watered: number;
}

interface BuildingRow {
  readonly id: string;
  readonly kind: string;
  readonly gx: number;
  readonly gy: number;
  readonly width: number;
  readonly height: number;
  readonly tier: number;
  readonly placed_at_ms: number;
}

interface OreRow {
  readonly id: string;
  readonly gx: number;
  readonly gy: number;
  readonly kind: string;
  readonly hits_remaining: number;
  readonly respawns_at_ms: number;
}

interface LandPatchRow {
  readonly block_key: string;
  readonly block_x: number;
  readonly block_y: number;
  readonly kind: string;
}

interface ValleyTreeRow {
  readonly id: string;
  readonly tile_x: number;
  readonly tile_y: number;
  readonly planted_at_ms: number;
  readonly mature_at_ms: number;
}

interface ValleyBuildingRow {
  readonly id: string;
  readonly sprite_key: string;
  readonly block_x: number;
  readonly block_y: number;
  readonly draw_width: number;
  readonly facing: number;
}

interface ValleyCropRow {
  readonly id: string;
  readonly tile_x: number;
  readonly tile_y: number;
  readonly crop_kind: string;
  readonly planted_at_ms: number;
  readonly mature_at_ms: number;
}

export type ValleyTileKind = 'FARM_SOIL' | 'PATH';

export interface StoredValleyTile {
  readonly tileX: number;
  readonly tileY: number;
  readonly kind: ValleyTileKind;
  readonly createdAtMs: number;
  readonly refreezeAtMs: number | null;
}

interface ValleyTileRow {
  readonly tile_key: string;
  readonly tile_x: number;
  readonly tile_y: number;
  readonly kind: string;
  readonly created_at_ms: number;
  readonly refreeze_at_ms: number | null;
}

/**
 * In Dead Winter, Hoe-tilled Farm Soil freezes back into snow after 90 seconds
 * (removing any unharvested crop on it). Shovel-laid Paths never refreeze.
 */
export const WINTER_SOIL_REFREEZE_MS = 90_000;

export interface StoredLandPatch {
  readonly blockX: number;
  readonly blockY: number;
  readonly kind: DynamicPatchKind;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

function getTownDb(): SQLite.SQLiteDatabase {
  if (dbInstance !== null) {
    return dbInstance;
  }

  const db = SQLite.openDatabaseSync('anvil-town-v4.db');

  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS town_trees (
      id TEXT PRIMARY KEY NOT NULL,
      gx INTEGER NOT NULL,
      gy INTEGER NOT NULL,
      planted_at_ms INTEGER NOT NULL,
      mature_at_ms INTEGER NOT NULL,
      hits_remaining INTEGER NOT NULL,
      is_stump INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_town_trees_coords ON town_trees (gx, gy);

    CREATE TABLE IF NOT EXISTS town_crops (
      id TEXT PRIMARY KEY NOT NULL,
      gx INTEGER NOT NULL,
      gy INTEGER NOT NULL,
      state TEXT NOT NULL,
      planted_at_ms INTEGER NOT NULL,
      ready_at_ms INTEGER NOT NULL,
      watered INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_town_crops_coords ON town_crops (gx, gy);

    CREATE TABLE IF NOT EXISTS town_buildings (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      gx INTEGER NOT NULL,
      gy INTEGER NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      tier INTEGER NOT NULL DEFAULT 1,
      placed_at_ms INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_town_buildings_coords ON town_buildings (gx, gy);

    CREATE TABLE IF NOT EXISTS town_ores (
      id TEXT PRIMARY KEY NOT NULL,
      gx INTEGER NOT NULL,
      gy INTEGER NOT NULL,
      kind TEXT NOT NULL,
      hits_remaining INTEGER NOT NULL,
      respawns_at_ms INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_town_ores_coords ON town_ores (gx, gy);

    CREATE TABLE IF NOT EXISTS town_land_blocks (
      block_key TEXT PRIMARY KEY NOT NULL,
      block_x INTEGER NOT NULL,
      block_y INTEGER NOT NULL,
      kind TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS town_valley_trees (
      id TEXT PRIMARY KEY NOT NULL,
      tile_x INTEGER NOT NULL,
      tile_y INTEGER NOT NULL,
      planted_at_ms INTEGER NOT NULL,
      mature_at_ms INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_town_valley_trees_coords
      ON town_valley_trees (tile_x, tile_y);

    CREATE TABLE IF NOT EXISTS town_valley_buildings (
      id TEXT PRIMARY KEY NOT NULL,
      sprite_key TEXT NOT NULL,
      block_x INTEGER NOT NULL,
      block_y INTEGER NOT NULL,
      draw_width INTEGER NOT NULL,
      facing INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_town_valley_buildings_coords
      ON town_valley_buildings (block_x, block_y);

    CREATE TABLE IF NOT EXISTS town_valley_crops (
      id TEXT PRIMARY KEY NOT NULL,
      tile_x INTEGER NOT NULL,
      tile_y INTEGER NOT NULL,
      crop_kind TEXT NOT NULL,
      planted_at_ms INTEGER NOT NULL,
      mature_at_ms INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_town_valley_crops_coords
      ON town_valley_crops (tile_x, tile_y);

    CREATE TABLE IF NOT EXISTS town_valley_tiles (
      tile_key TEXT PRIMARY KEY NOT NULL,
      tile_x INTEGER NOT NULL,
      tile_y INTEGER NOT NULL,
      kind TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL,
      refreeze_at_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_town_valley_tiles_coords
      ON town_valley_tiles (tile_x, tile_y);
  `);

  dbInstance = db;

  return db;
}

function parseBuildingKind(raw: string): BuildingKind {
  switch (raw) {
    case 'WINDMILL':
      return 'WINDMILL';
    case 'BAKERY':
      return 'BAKERY';
    case 'SAWMILL':
      return 'SAWMILL';
    case 'BLACKSMITH':
      return 'BLACKSMITH';
    case 'STORAGE_CHEST':
      return 'STORAGE_CHEST';
    default:
      return 'TOWN_HALL';
  }
}

function parseCropState(raw: string): CropState {
  if (raw === 'PLANTED') {
    return 'PLANTED';
  }

  if (raw === 'TILLED') {
    return 'TILLED';
  }

  return 'FALLOW';
}

export function ensureTownSeeded(): void {
  const db = getTownDb();
  const alreadySeeded = sessionStorage.getBoolean(TOWN_KEYS.seeded) ?? false;

  if (alreadySeeded) {
    return;
  }

  const nowMs = Date.now();
  const starterTrees = createStarterTrees(nowMs);
  const starterCrops = createStarterCrops(nowMs);
  const starterBuildings = createStarterBuildings(nowMs);
  const starterOres = createStarterOres();

  db.withTransactionSync(() => {
    db.execSync(
      'DELETE FROM town_trees; DELETE FROM town_crops; DELETE FROM town_buildings; DELETE FROM town_ores;'
    );

    for (let i = 0; i < starterTrees.length; i += 1) {
      const t = starterTrees[i];

      db.runSync(
        `INSERT OR REPLACE INTO town_trees (id, gx, gy, planted_at_ms, mature_at_ms, hits_remaining, is_stump)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        t.id,
        t.gx,
        t.gy,
        t.plantedAtMs,
        t.matureAtMs,
        t.hitsRemaining,
        t.isStump ? 1 : 0
      );
    }

    for (let i = 0; i < starterCrops.length; i += 1) {
      const c = starterCrops[i];

      db.runSync(
        `INSERT OR REPLACE INTO town_crops (id, gx, gy, state, planted_at_ms, ready_at_ms, watered)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        c.id,
        c.gx,
        c.gy,
        c.state,
        c.plantedAtMs,
        c.readyAtMs,
        c.watered ? 1 : 0
      );
    }

    for (let i = 0; i < starterBuildings.length; i += 1) {
      const b = starterBuildings[i];

      db.runSync(
        `INSERT OR REPLACE INTO town_buildings (id, kind, gx, gy, width, height, tier, placed_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        b.id,
        b.kind,
        b.gx,
        b.gy,
        b.width,
        b.height,
        b.tier,
        b.placedAtMs
      );
    }

    for (let i = 0; i < starterOres.length; i += 1) {
      const o = starterOres[i];

      db.runSync(
        `INSERT OR REPLACE INTO town_ores (id, gx, gy, kind, hits_remaining, respawns_at_ms)
         VALUES (?, ?, ?, ?, ?, ?)`,
        o.id,
        o.gx,
        o.gy,
        o.kind,
        o.hitsRemaining,
        o.respawnsAtMs
      );
    }
  });

  saveInventory(DEFAULT_INVENTORY);
  saveSeason('WINTER');
  saveYetiPosition(YETI_SPAWN_TILE);
  sessionStorage.set(TOWN_KEYS.seeded, true);
}

export function loadInventory(): InventoryCounts {
  return {
    coins: sessionStorage.getNumber(TOWN_KEYS.coins) ?? DEFAULT_INVENTORY.coins,
    treasury: sessionStorage.getNumber(TOWN_KEYS.treasury) ?? DEFAULT_INVENTORY.treasury,
    wood: sessionStorage.getNumber(TOWN_KEYS.wood) ?? DEFAULT_INVENTORY.wood,
    planks: sessionStorage.getNumber(TOWN_KEYS.planks) ?? DEFAULT_INVENTORY.planks,
    firewood: sessionStorage.getNumber(TOWN_KEYS.firewood) ?? DEFAULT_INVENTORY.firewood,
    pineSaplings:
      sessionStorage.getNumber(TOWN_KEYS.pineSaplings) ?? DEFAULT_INVENTORY.pineSaplings,
    stone: sessionStorage.getNumber(TOWN_KEYS.stone) ?? DEFAULT_INVENTORY.stone,
    ironOre: sessionStorage.getNumber(TOWN_KEYS.ironOre) ?? DEFAULT_INVENTORY.ironOre,
    fish: sessionStorage.getNumber(TOWN_KEYS.fish) ?? DEFAULT_INVENTORY.fish,
    maizeSeeds: sessionStorage.getNumber(TOWN_KEYS.maizeSeeds) ?? DEFAULT_INVENTORY.maizeSeeds,
    maize: sessionStorage.getNumber(TOWN_KEYS.maize) ?? DEFAULT_INVENTORY.maize,
    flour: sessionStorage.getNumber(TOWN_KEYS.flour) ?? DEFAULT_INVENTORY.flour,
    bread: sessionStorage.getNumber(TOWN_KEYS.bread) ?? DEFAULT_INVENTORY.bread,
    toolTier: sessionStorage.getNumber(TOWN_KEYS.toolTier) ?? DEFAULT_INVENTORY.toolTier,
  };
}

export function saveInventory(inv: InventoryCounts): void {
  sessionStorage.set(TOWN_KEYS.coins, inv.coins);
  sessionStorage.set(TOWN_KEYS.treasury, inv.treasury);
  sessionStorage.set(TOWN_KEYS.wood, inv.wood);
  sessionStorage.set(TOWN_KEYS.planks, inv.planks);
  sessionStorage.set(TOWN_KEYS.firewood, inv.firewood);
  sessionStorage.set(TOWN_KEYS.pineSaplings, inv.pineSaplings);
  sessionStorage.set(TOWN_KEYS.stone, inv.stone);
  sessionStorage.set(TOWN_KEYS.ironOre, inv.ironOre);
  sessionStorage.set(TOWN_KEYS.fish, inv.fish);
  sessionStorage.set(TOWN_KEYS.maizeSeeds, inv.maizeSeeds);
  sessionStorage.set(TOWN_KEYS.maize, inv.maize);
  sessionStorage.set(TOWN_KEYS.flour, inv.flour);
  sessionStorage.set(TOWN_KEYS.bread, inv.bread);
  sessionStorage.set(TOWN_KEYS.toolTier, inv.toolTier);
}

export const SEASON_DURATION_HOURS = 72;
export const SEASON_DURATION_MS = SEASON_DURATION_HOURS * 60 * 60 * 1000;

export interface SeasonalClockState {
  readonly season: Season;
  readonly cycleNumber: number;
  readonly remainingMs: number;
  readonly nextSeason: Season;
}

export function loadOrInitSeasonEpochMs(nowMs: number = Date.now()): number {
  const existing = sessionStorage.getNumber(TOWN_KEYS.seasonEpochMs);

  if (existing !== undefined && existing > 0) {
    return existing;
  }

  sessionStorage.set(TOWN_KEYS.seasonEpochMs, nowMs);

  return nowMs;
}

export function computeSeasonalClockState(
  epochMs: number,
  nowMs: number
): SeasonalClockState {
  const elapsedMs = Math.max(0, nowMs - epochMs);
  const cycleIndex = Math.floor(elapsedMs / SEASON_DURATION_MS);
  const season: Season = cycleIndex % 2 === 0 ? 'WINTER' : 'SUMMER';
  const nextSeason: Season = season === 'WINTER' ? 'SUMMER' : 'WINTER';
  const remainingMs = SEASON_DURATION_MS - (elapsedMs % SEASON_DURATION_MS);

  return {
    season,
    cycleNumber: cycleIndex + 1,
    remainingMs,
    nextSeason,
  };
}

export function loadSeason(): Season {
  const epochMs = loadOrInitSeasonEpochMs();

  return computeSeasonalClockState(epochMs, Date.now()).season;
}

export function saveSeason(season: Season): void {
  sessionStorage.set(TOWN_KEYS.season, season);
}

export function loadYetiPosition(): TileCoord {
  return {
    gx: sessionStorage.getNumber(TOWN_KEYS.yetiX) ?? YETI_SPAWN_TILE.gx,
    gy: sessionStorage.getNumber(TOWN_KEYS.yetiY) ?? YETI_SPAWN_TILE.gy,
  };
}

export function saveYetiPosition(pos: TileCoord): void {
  sessionStorage.set(TOWN_KEYS.yetiX, pos.gx);
  sessionStorage.set(TOWN_KEYS.yetiY, pos.gy);
}

export interface TownWorldSnapshot {
  readonly trees: TreeEntity[];
  readonly crops: CropEntity[];
  readonly buildings: BuildingEntity[];
  readonly ores: OreNodeEntity[];
}

export function loadTownWorld(): TownWorldSnapshot {
  ensureTownSeeded();

  const db = getTownDb();
  const treeRows = db.getAllSync<TreeRow>('SELECT * FROM town_trees');
  const cropRows = db.getAllSync<CropRow>('SELECT * FROM town_crops');
  const buildingRows = db.getAllSync<BuildingRow>('SELECT * FROM town_buildings');
  const oreRows = db.getAllSync<OreRow>('SELECT * FROM town_ores');

  const trees: TreeEntity[] = [];

  for (let i = 0; i < treeRows.length; i += 1) {
    const r = treeRows[i];

    trees.push({
      id: r.id,
      gx: r.gx,
      gy: r.gy,
      plantedAtMs: r.planted_at_ms,
      matureAtMs: r.mature_at_ms,
      hitsRemaining: r.hits_remaining,
      isStump: r.is_stump === 1,
    });
  }

  const crops: CropEntity[] = [];

  for (let i = 0; i < cropRows.length; i += 1) {
    const r = cropRows[i];

    crops.push({
      id: r.id,
      gx: r.gx,
      gy: r.gy,
      state: parseCropState(r.state),
      plantedAtMs: r.planted_at_ms,
      readyAtMs: r.ready_at_ms,
      watered: r.watered === 1,
    });
  }

  const buildings: BuildingEntity[] = [];

  for (let i = 0; i < buildingRows.length; i += 1) {
    const r = buildingRows[i];

    buildings.push({
      id: r.id,
      kind: parseBuildingKind(r.kind),
      gx: r.gx,
      gy: r.gy,
      width: r.width,
      height: r.height,
      tier: r.tier,
      placedAtMs: r.placed_at_ms,
    });
  }

  const ores: OreNodeEntity[] = [];

  for (let i = 0; i < oreRows.length; i += 1) {
    const r = oreRows[i];

    ores.push({
      id: r.id,
      gx: r.gx,
      gy: r.gy,
      kind: r.kind === 'IRON_ORE' ? 'IRON_ORE' : 'STONE',
      hitsRemaining: r.hits_remaining,
      respawnsAtMs: r.respawns_at_ms,
    });
  }

  return { trees, crops, buildings, ores };
}

export function upsertTree(tree: TreeEntity): void {
  const db = getTownDb();

  db.runSync(
    `INSERT OR REPLACE INTO town_trees (id, gx, gy, planted_at_ms, mature_at_ms, hits_remaining, is_stump)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    tree.id,
    tree.gx,
    tree.gy,
    tree.plantedAtMs,
    tree.matureAtMs,
    tree.hitsRemaining,
    tree.isStump ? 1 : 0
  );
}

export function deleteTree(id: string): void {
  const db = getTownDb();

  db.runSync('DELETE FROM town_trees WHERE id = ?', id);
}

export function upsertCrop(crop: CropEntity): void {
  const db = getTownDb();

  db.runSync(
    `INSERT OR REPLACE INTO town_crops (id, gx, gy, state, planted_at_ms, ready_at_ms, watered)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    crop.id,
    crop.gx,
    crop.gy,
    crop.state,
    crop.plantedAtMs,
    crop.readyAtMs,
    crop.watered ? 1 : 0
  );
}

export function upsertBuilding(building: BuildingEntity): void {
  const db = getTownDb();

  db.runSync(
    `INSERT OR REPLACE INTO town_buildings (id, kind, gx, gy, width, height, tier, placed_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    building.id,
    building.kind,
    building.gx,
    building.gy,
    building.width,
    building.height,
    building.tier,
    building.placedAtMs
  );
}

export function upsertOreNode(ore: OreNodeEntity): void {
  const db = getTownDb();

  db.runSync(
    `INSERT OR REPLACE INTO town_ores (id, gx, gy, kind, hits_remaining, respawns_at_ms)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ore.id,
    ore.gx,
    ore.gy,
    ore.kind,
    ore.hitsRemaining,
    ore.respawnsAtMs
  );
}

export function loadLandPatches(): StoredLandPatch[] {
  const db = getTownDb();
  const rows = db.getAllSync<LandPatchRow>('SELECT * FROM town_land_blocks');
  const patches: StoredLandPatch[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];

    const outOfBounds =
      r.block_x < 0 ||
      r.block_x >= VALLEY_BLOCK_COLS ||
      r.block_y < 0 ||
      r.block_y >= VALLEY_BLOCK_ROWS;

    if (outOfBounds || isBlockBlockedForSoil(r.block_x, r.block_y)) {
      db.runSync(
        'DELETE FROM town_land_blocks WHERE block_key = ?',
        r.block_key
      );
      continue;
    }

    patches.push({
      blockX: r.block_x,
      blockY: r.block_y,
      kind: r.kind === 'PATH' ? 'PATH' : 'PLANTING',
    });
  }

  return patches;
}

export function upsertLandPatch(patch: StoredLandPatch): void {
  const db = getTownDb();
  const key = `${patch.blockX}_${patch.blockY}`;

  db.runSync(
    `INSERT OR REPLACE INTO town_land_blocks (block_key, block_x, block_y, kind)
     VALUES (?, ?, ?, ?)`,
    key,
    patch.blockX,
    patch.blockY,
    patch.kind
  );
}

export function deleteLandPatch(blockX: number, blockY: number): void {
  const db = getTownDb();
  const key = `${blockX}_${blockY}`;

  db.runSync('DELETE FROM town_land_blocks WHERE block_key = ?', key);
}

export function loadValleyTiles(
  buildings: readonly StoredValleyBuilding[]
): StoredValleyTile[] {
  const db = getTownDb();
  const rows = db.getAllSync<ValleyTileRow>('SELECT * FROM town_valley_tiles');
  const tiles: StoredValleyTile[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];

    const outOfBounds =
      r.tile_x < 0 ||
      r.tile_x >= VALLEY_TILE_COLS ||
      r.tile_y < 0 ||
      r.tile_y >= VALLEY_TILE_ROWS;

    if (outOfBounds || isTileBlockedForLandEdit(r.tile_x, r.tile_y, buildings)) {
      db.runSync(
        'DELETE FROM town_valley_tiles WHERE tile_key = ?',
        r.tile_key
      );
      continue;
    }

    tiles.push({
      tileX: r.tile_x,
      tileY: r.tile_y,
      kind: r.kind === 'PATH' ? 'PATH' : 'FARM_SOIL',
      createdAtMs: r.created_at_ms,
      refreezeAtMs: r.refreeze_at_ms,
    });
  }

  return tiles;
}

export function upsertValleyTile(tile: StoredValleyTile): void {
  const db = getTownDb();
  const key = `${tile.tileX}_${tile.tileY}`;

  db.runSync(
    `INSERT OR REPLACE INTO town_valley_tiles
       (tile_key, tile_x, tile_y, kind, created_at_ms, refreeze_at_ms)
     VALUES (?, ?, ?, ?, ?, ?)`,
    key,
    tile.tileX,
    tile.tileY,
    tile.kind,
    tile.createdAtMs,
    tile.refreezeAtMs
  );
}

export function deleteValleyTile(tileX: number, tileY: number): void {
  const db = getTownDb();
  const key = `${tileX}_${tileY}`;

  db.runSync('DELETE FROM town_valley_tiles WHERE tile_key = ?', key);
}

export function deleteValleyCropAtTile(tileX: number, tileY: number): void {
  const db = getTownDb();

  db.runSync(
    'DELETE FROM town_valley_crops WHERE tile_x = ? AND tile_y = ?',
    tileX,
    tileY
  );
}

const VALLEY_TREES_SEEDED_KEY = 'town.valleyTrees.seeded.v1';

export function loadValleyTrees(): ValleyPlantedTree[] {
  const db = getTownDb();
  const seeded = sessionStorage.getBoolean(VALLEY_TREES_SEEDED_KEY) ?? false;

  if (!seeded) {
    const starter = createStarterValleyTrees(Date.now());

    db.withTransactionSync(() => {
      for (let i = 0; i < starter.length; i += 1) {
        const t = starter[i];

        db.runSync(
          `INSERT OR REPLACE INTO town_valley_trees (id, tile_x, tile_y, planted_at_ms, mature_at_ms)
           VALUES (?, ?, ?, ?, ?)`,
          t.id,
          t.tileX,
          t.tileY,
          t.plantedAtMs,
          t.matureAtMs
        );
      }
    });

    sessionStorage.set(VALLEY_TREES_SEEDED_KEY, true);
  }

  const rows = db.getAllSync<ValleyTreeRow>('SELECT * FROM town_valley_trees');
  const trees: ValleyPlantedTree[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];

    trees.push({
      id: r.id,
      tileX: r.tile_x,
      tileY: r.tile_y,
      plantedAtMs: r.planted_at_ms,
      matureAtMs: r.mature_at_ms,
    });
  }

  return trees;
}

export function upsertValleyTree(tree: ValleyPlantedTree): void {
  const db = getTownDb();

  db.runSync(
    `INSERT OR REPLACE INTO town_valley_trees (id, tile_x, tile_y, planted_at_ms, mature_at_ms)
     VALUES (?, ?, ?, ?, ?)`,
    tree.id,
    tree.tileX,
    tree.tileY,
    tree.plantedAtMs,
    tree.matureAtMs
  );
}

export function deleteValleyTree(id: string): void {
  const db = getTownDb();

  db.runSync('DELETE FROM town_valley_trees WHERE id = ?', id);
}

export function deleteValleyTreesInBlock(blockX: number, blockY: number): void {
  const db = getTownDb();
  const minTx = blockX * BLOCK_GRID_SIZE;
  const maxTx = minTx + BLOCK_GRID_SIZE - 1;
  const minTy = blockY * BLOCK_GRID_SIZE;
  const maxTy = minTy + BLOCK_GRID_SIZE - 1;

  db.runSync(
    `DELETE FROM town_valley_trees
     WHERE tile_x >= ? AND tile_x <= ? AND tile_y >= ? AND tile_y <= ?`,
    minTx,
    maxTx,
    minTy,
    maxTy
  );
}

const VALLEY_BUILDINGS_SEEDED_KEY = 'town.valleyBuildings.seeded.v1';

function parseValleyBuildingSpriteKey(raw: string): TownBuildingSpriteKey {
  switch (raw) {
    case 'townHall':
    case 'bank':
    case 'blacksmith':
    case 'tradePost':
    case 'yetiLodge':
    case 'cottage':
    case 'bakery':
    case 'windmill':
    case 'sawmill':
    case 'builderShop':
    case 'yakBarn':
    case 'cheeseCellar':
    case 'fishingPier':
    case 'smokehouse':
      return raw;
    default:
      return 'cottage';
  }
}

function parseBuildingFacing(raw: number): BuildingFacing {
  if (raw === 1) {
    return 1;
  }

  if (raw === 2) {
    return 2;
  }

  if (raw === 3) {
    return 3;
  }

  return 0;
}

export function loadValleyBuildings(): StoredValleyBuilding[] {
  const db = getTownDb();
  const seeded = sessionStorage.getBoolean(VALLEY_BUILDINGS_SEEDED_KEY) ?? false;

  if (!seeded) {
    db.withTransactionSync(() => {
      for (let i = 0; i < VALLEY_STARTER_BUILDINGS.length; i += 1) {
        const b = VALLEY_STARTER_BUILDINGS[i];

        db.runSync(
          `INSERT OR REPLACE INTO town_valley_buildings
             (id, sprite_key, block_x, block_y, draw_width, facing)
           VALUES (?, ?, ?, ?, ?, ?)`,
          b.id,
          b.spriteKey,
          b.blockX,
          b.blockY,
          b.drawWidth,
          b.facing ?? 0
        );
      }
    });

    sessionStorage.set(VALLEY_BUILDINGS_SEEDED_KEY, true);
  }

  const rows = db.getAllSync<ValleyBuildingRow>(
    'SELECT * FROM town_valley_buildings'
  );

  const buildings: StoredValleyBuilding[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];

    buildings.push({
      id: r.id,
      spriteKey: parseValleyBuildingSpriteKey(r.sprite_key),
      blockX: r.block_x,
      blockY: r.block_y,
      drawWidth: r.draw_width,
      facing: parseBuildingFacing(r.facing),
    });
  }

  return buildings;
}

export function upsertValleyBuilding(building: StoredValleyBuilding): void {
  const db = getTownDb();

  db.runSync(
    `INSERT OR REPLACE INTO town_valley_buildings
       (id, sprite_key, block_x, block_y, draw_width, facing)
     VALUES (?, ?, ?, ?, ?, ?)`,
    building.id,
    building.spriteKey,
    building.blockX,
    building.blockY,
    building.drawWidth,
    building.facing
  );
}

function parseCropKind(raw: string): CropKind {
  switch (raw) {
    case 'maize':
      return 'maize';
    case 'wheat':
      return 'wheat';
    case 'potato':
      return 'potato';
    case 'pumpkin':
      return 'pumpkin';
    default:
      return 'turnip';
  }
}

export function loadValleyCrops(): ValleyPlantedCrop[] {
  const db = getTownDb();
  const rows = db.getAllSync<ValleyCropRow>('SELECT * FROM town_valley_crops');
  const crops: ValleyPlantedCrop[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];

    crops.push({
      id: r.id,
      tileX: r.tile_x,
      tileY: r.tile_y,
      cropKind: parseCropKind(r.crop_kind),
      plantedAtMs: r.planted_at_ms,
      matureAtMs: r.mature_at_ms,
    });
  }

  return crops;
}

export function upsertValleyCrop(crop: ValleyPlantedCrop): void {
  const db = getTownDb();

  db.runSync(
    `INSERT OR REPLACE INTO town_valley_crops
       (id, tile_x, tile_y, crop_kind, planted_at_ms, mature_at_ms)
     VALUES (?, ?, ?, ?, ?, ?)`,
    crop.id,
    crop.tileX,
    crop.tileY,
    crop.cropKind,
    crop.plantedAtMs,
    crop.matureAtMs
  );
}

export function deleteValleyCrop(id: string): void {
  const db = getTownDb();

  db.runSync('DELETE FROM town_valley_crops WHERE id = ?', id);
}

export function deleteValleyCropsInBlock(blockX: number, blockY: number): void {
  const db = getTownDb();
  const minTx = blockX * BLOCK_GRID_SIZE;
  const maxTx = minTx + BLOCK_GRID_SIZE - 1;
  const minTy = blockY * BLOCK_GRID_SIZE;
  const maxTy = minTy + BLOCK_GRID_SIZE - 1;

  db.runSync(
    `DELETE FROM town_valley_crops
     WHERE tile_x >= ? AND tile_x <= ? AND tile_y >= ? AND tile_y <= ?`,
    minTx,
    maxTx,
    minTy,
    maxTy
  );
}

export function loadFounderCoins(): number {
  const saved = sessionStorage.getNumber(TOWN_KEYS.founderCoins);

  if (saved !== undefined && Number.isFinite(saved) && saved >= 0) {
    return Math.round(saved);
  }

  sessionStorage.set(TOWN_KEYS.founderCoins, STARTING_CAPITAL_FC);

  return STARTING_CAPITAL_FC;
}

export function saveFounderCoins(coins: number): void {
  sessionStorage.set(TOWN_KEYS.founderCoins, Math.max(0, Math.round(coins)));
}

function isValidGameIconKey(raw: string): raw is GameIconKey {
  return raw in ICON_ATLAS_FRAMES;
}

export function loadPouchEntries(): PouchEntry[] {
  const raw = sessionStorage.getString(TOWN_KEYS.pouchEntries);

  if (raw === undefined || raw.length === 0) {
    return [...INITIAL_POUCH_ENTRIES];
  }

  const parsed: PouchEntry[] = [];
  const pairs = raw.split(';');

  for (let i = 0; i < pairs.length; i += 1) {
    const part = pairs[i];

    if (part.length === 0) {
      continue;
    }

    const [key, qtyStr] = part.split(':');
    const qty = Number(qtyStr);

    if (
      key !== undefined &&
      isValidGameIconKey(key) &&
      getEconomyItem(key) !== null &&
      Number.isFinite(qty) &&
      qty > 0
    ) {
      parsed.push({ itemId: key, qty: Math.floor(qty) });
    }
  }

  return parsed.length > 0 ? parsed : [...INITIAL_POUCH_ENTRIES];
}

export function savePouchEntries(entries: readonly PouchEntry[]): void {
  const parts: string[] = [];

  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];

    if (e.qty > 0) {
      parts.push(`${e.itemId}:${Math.floor(e.qty)}`);
    }
  }

  sessionStorage.set(TOWN_KEYS.pouchEntries, parts.join(';'));
}

function parseOfficeHolder(raw: string): OfficeHolder {
  switch (raw) {
    case 'NPC_MAYOR':
      return 'NPC_MAYOR';
    case 'AI_BARNABY':
      return 'AI_BARNABY';
    case 'AI_STERLING':
      return 'AI_STERLING';
    case 'AI_VESPER':
      return 'AI_VESPER';
    default:
      return 'PLAYER';
  }
}

function parseWinterPolicy(raw: string): WinterPolicy {
  switch (raw) {
    case 'FULL_CUSHION':
      return 'FULL_CUSHION';
    case 'MODERATE_RELIEF':
      return 'MODERATE_RELIEF';
    case 'AUSTERITY':
      return 'AUSTERITY';
    default:
      return 'TARGETED_ESSENTIALS';
  }
}

function parseArmyUnitKey(raw: string): ArmyUnitKey | null {
  switch (raw) {
    case 'shieldguard':
    case 'axeman':
    case 'archer':
    case 'rogue':
    case 'ram':
    case 'mystic':
    case 'apothecary':
      return raw;
    default:
      return null;
  }
}

export function loadTownGovernance(): TownGovernanceState {
  const raw = sessionStorage.getString(TOWN_KEYS.governanceState);
  const fallback = createDefaultGovernanceState();

  if (raw === undefined || raw.length === 0) {
    return fallback;
  }

  const fields = raw.split('|');

  if (fields.length < 10) {
    return fallback;
  }

  const officeHolder = parseOfficeHolder(fields[0]);
  const taxRatePct = Math.max(5, Math.min(18, Number(fields[1]) || 10));
  const winterPolicy = parseWinterPolicy(fields[2]);
  const townTreasuryFc = Math.max(0, Math.round(Number(fields[3]) || 620));
  const approvalPct = Math.max(0, Math.min(100, Math.round(Number(fields[4]) || 64)));
  const authorityRank = Math.max(0, Math.round(Number(fields[5]) || 100));
  const raidsWon = Math.max(0, Math.round(Number(fields[6]) || 0));
  const reliefDonations = Math.max(0, Math.round(Number(fields[7]) || 0));
  const electionCount = Math.max(0, Math.round(Number(fields[8]) || 0));
  const bountyDone = fields[9] === '1';

  const lastElectionCycle =
    fields[11] !== undefined && fields[11].length > 0
      ? Math.round(Number(fields[11]))
      : -1;

  const warband: WarbandSlot[] = [];
  const wbRaw = fields[10] ?? '';

  if (wbRaw.length > 0) {
    const tokens = wbRaw.split(',');

    for (let i = 0; i < tokens.length; i += 1) {
      const [k, cntStr] = tokens[i].split(':');
      const unitKey = k !== undefined ? parseArmyUnitKey(k) : null;
      const count = Math.max(0, Math.floor(Number(cntStr) || 0));

      if (unitKey !== null && count > 0) {
        warband.push({ unitKey, count });
      }
    }
  }

  const storedNpcId = sessionStorage.getString(TOWN_KEYS.officeHolderNpcId);
  const storedHolderName = sessionStorage.getString(TOWN_KEYS.officeHolderName);

  const officeHolderNpcId =
    officeHolder === 'PLAYER'
      ? null
      : storedNpcId !== undefined && storedNpcId.trim().length > 0
        ? storedNpcId.trim()
        : null;

  const officeHolderName =
    officeHolder === 'PLAYER'
      ? 'Koda (You)'
      : storedHolderName !== undefined && storedHolderName.trim().length > 0
        ? storedHolderName.trim()
        : fallback.officeHolderName;

  return {
    officeHolder,
    officeHolderNpcId,
    officeHolderName,
    taxRatePct,
    winterPolicy,
    townTreasuryFc,
    approvalPct,
    authorityRank,
    raidsWon,
    reliefDonations,
    electionCount,
    lastElectionCycle: Number.isFinite(lastElectionCycle)
      ? lastElectionCycle
      : -1,
    warband: warband.length > 0 ? warband : fallback.warband,
    activeBounty: {
      ...fallback.activeBounty,
      completed: bountyDone,
    },
  };
}

export function saveTownGovernance(state: TownGovernanceState): void {
  const wbParts: string[] = [];

  for (let i = 0; i < state.warband.length; i += 1) {
    const slot = state.warband[i];

    if (slot.count > 0) {
      wbParts.push(`${slot.unitKey}:${slot.count}`);
    }
  }

  const encoded = [
    state.officeHolder,
    String(state.taxRatePct),
    state.winterPolicy,
    String(Math.round(state.townTreasuryFc)),
    String(Math.round(state.approvalPct)),
    String(Math.round(state.authorityRank)),
    String(state.raidsWon),
    String(state.reliefDonations),
    String(state.electionCount),
    state.activeBounty.completed ? '1' : '0',
    wbParts.join(','),
    String(state.lastElectionCycle),
  ].join('|');

  sessionStorage.set(TOWN_KEYS.governanceState, encoded);

  if (state.officeHolderNpcId) {
    sessionStorage.set(TOWN_KEYS.officeHolderNpcId, state.officeHolderNpcId);
  } else {
    sessionStorage.remove(TOWN_KEYS.officeHolderNpcId);
  }

  sessionStorage.set(TOWN_KEYS.officeHolderName, state.officeHolderName);
}
