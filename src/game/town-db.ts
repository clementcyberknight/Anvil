import * as SQLite from 'expo-sqlite';

import {
  createStarterBuildings,
  createStarterCrops,
  createStarterOres,
  createStarterTrees,
  YETI_SPAWN_TILE,
} from '@/game/map-data';
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
  type DynamicPatchKind,
  isBlockOverlappingLake,
  VALLEY_BLOCK_COLS,
  VALLEY_BLOCK_ROWS,
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
  yetiX: 'town.v4.yetiX',
  yetiY: 'town.v4.yetiY',
  seeded: 'town.seeded.v4',
} as const;

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

export function loadSeason(): Season {
  const stored = sessionStorage.getString(TOWN_KEYS.season);

  return stored === 'SUMMER' ? 'SUMMER' : 'WINTER';
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

    if (outOfBounds || isBlockOverlappingLake(r.block_x, r.block_y)) {
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
