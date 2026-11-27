import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BuildingEditBar } from '@/components/town/building-edit-bar';
import { type HeldTool, HeroPouchHud } from '@/components/town/hero-pouch-hud';
import { RivalRaidScreen } from '@/components/town/rival-raid-screen';
import {
  TownHallModal,
  type TownHallTab,
} from '@/components/town/town-hall-modal';
import {
  type NodeCooldownEntry,
  TownMapCanvas,
} from '@/components/town/town-map-canvas';
import { VillagerFocusCard } from '@/components/town/villager-focus-card';
import { WOOD_THEME } from '@/components/town/wood-theme';
import {
  adjustPouchItem,
  applyCraftRecipe,
  CRAFT_RECIPES,
  CROP_DEFINITIONS,
  getCropGrowthProgress,
  getEconomyItem,
  getPouchQty,
  harvestWorldNode,
  type PouchEntry,
  VALLEY_WORLD_NODES,
  type ValleyPlantedCrop,
} from '@/game/economy-engine';
import type { GameIconKey } from '@/game/icon-atlas';
import type {
  RaidOutcomeSummary,
  RivalTownBlueprint,
} from '@/game/raid-engine';
import {
  computeSeasonalClockState,
  deleteValleyCrop,
  deleteValleyCropAtTile,
  deleteValleyTile,
  deleteValleyTree,
  loadFounderCoins,
  loadOrInitSeasonEpochMs,
  loadPouchEntries,
  loadTownGovernance,
  loadValleyBuildings,
  loadValleyCrops,
  loadValleyTiles,
  loadValleyTrees,
  saveFounderCoins,
  savePouchEntries,
  saveTownGovernance,
  type StoredValleyTile,
  upsertValleyBuilding,
  upsertValleyCrop,
  upsertValleyTile,
  upsertValleyTree,
  WINTER_SOIL_REFREEZE_MS,
} from '@/game/town-db';
import {
  type ArmyUnitKey,
  computeProjectedApproval,
  type ElectionBallotResult,
  getArmyUnitSpec,
  getRaidCommandRules,
  getTotalWarbandCount,
  getUnitTrainingCoinCost,
  runTownElection,
  type TownGovernanceState,
  type WarbandSlot,
  type WinterPolicy,
} from '@/game/town-governance';
import {
  type StreetNodeId,
  TOWN_STREET_NODES,
  TOWN_VILLAGERS,
} from '@/game/town-villagers';
import {
  AnvilMultiplexedSyncClient,
  clientIconToBackendItem,
  fetchVillagerPersonaFromBackend,
  generateLiveAiPersonaOnBackend,
  type LiveVillagerOverlay,
  loadLastTownSeq,
  loadOutboxQueue,
  loadStoredAccountMeta,
} from '@/lib/anvil-live-sync';
import {
  canPlaceBuildingOnBlock,
  computeNextValleyTreeWakeupMs,
  getBuildingTileBounds,
  getTreeGrowthProgress,
  isTileBlockedForLandEdit,
  type StoredValleyBuilding,
  VALLEY_TREE_GROW_MS,
  type ValleyPlantedTree,
} from '@/game/valley-zones';

const CROP_STAGE_THRESHOLDS: readonly number[] = [0.18, 0.55, 1];

function triggerLightHaptic(): void {
  if (process.env.EXPO_OS === 'web') {
    return;
  }

  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function triggerMediumHaptic(): void {
  if (process.env.EXPO_OS === 'web') {
    return;
  }

  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

function computeNextWorldWakeupMs(
  trees: readonly ValleyPlantedTree[],
  crops: readonly ValleyPlantedCrop[],
  tiles: readonly StoredValleyTile[],
  cooldowns: readonly NodeCooldownEntry[],
  nowMs: number
): number | null {
  let nextMs = computeNextValleyTreeWakeupMs(trees, nowMs);

  for (let i = 0; i < crops.length; i += 1) {
    const crop = crops[i];
    const span = crop.matureAtMs - crop.plantedAtMs;

    if (span <= 0) {
      continue;
    }

    for (let s = 0; s < CROP_STAGE_THRESHOLDS.length; s += 1) {
      const stageMs = crop.plantedAtMs + span * CROP_STAGE_THRESHOLDS[s];

      if (stageMs > nowMs && (nextMs === null || stageMs < nextMs)) {
        nextMs = stageMs;
      }
    }
  }

  for (let i = 0; i < tiles.length; i += 1) {
    const tile = tiles[i];

    if (tile.kind !== 'FARM_SOIL' || tile.refreezeAtMs === null) {
      continue;
    }

    const warnAt = tile.refreezeAtMs - 25_000;

    if (warnAt > nowMs && (nextMs === null || warnAt < nextMs)) {
      nextMs = warnAt;
    }

    if (tile.refreezeAtMs > nowMs && (nextMs === null || tile.refreezeAtMs < nextMs)) {
      nextMs = tile.refreezeAtMs;
    }
  }

  for (let i = 0; i < cooldowns.length; i += 1) {
    const readyAt = cooldowns[i].readyAtMs;

    if (readyAt > nowMs && (nextMs === null || readyAt < nextMs)) {
      nextMs = readyAt;
    }
  }

  return nextMs;
}

export function TownWorldScreen() {
  const [seasonEpochMs] = useState<number>(() => loadOrInitSeasonEpochMs());
  const [coins, setCoins] = useState<number>(() => loadFounderCoins());

  const [pouchEntries, setPouchEntries] = useState<PouchEntry[]>(() =>
    loadPouchEntries()
  );

  const [governance, setGovernance] = useState<TownGovernanceState>(() =>
    loadTownGovernance()
  );

  const [buildings, setBuildings] = useState<StoredValleyBuilding[]>(() =>
    loadValleyBuildings()
  );

  const [editingBuilding, setEditingBuilding] =
    useState<StoredValleyBuilding | null>(null);

  const [valleyTiles, setValleyTiles] = useState<StoredValleyTile[]>(() =>
    loadValleyTiles(buildings)
  );

  const [plantedTrees, setPlantedTrees] = useState<ValleyPlantedTree[]>(() =>
    loadValleyTrees()
  );

  const [plantedCrops, setPlantedCrops] = useState<ValleyPlantedCrop[]>(() =>
    loadValleyCrops()
  );

  const [heldTool, setHeldTool] = useState<HeldTool>({ kind: 'HAND' });
  const [nodeCooldowns, setNodeCooldowns] = useState<NodeCooldownEntry[]>([]);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [focusedVillagerIndex, setFocusedVillagerIndex] = useState<
    number | null
  >(null);

  const [townHallOpen, setTownHallOpen] = useState<boolean>(false);
  const [townHallTab, setTownHallTab] = useState<TownHallTab>('POLICY');

  const [lastElection, setLastElection] =
    useState<ElectionBallotResult | null>(null);

  const [activeRaidTown, setActiveRaidTown] =
    useState<RivalTownBlueprint | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [liveConnected, setLiveConnected] = useState<boolean>(false);

  const [activeTownId, setActiveTownId] = useState<string>(
    () => loadStoredAccountMeta().visitingTownId
  );

  const [lastSeq, setLastSeq] = useState<number>(() =>
    loadLastTownSeq(loadStoredAccountMeta().visitingTownId)
  );

  const [outboxCount, setOutboxCount] = useState<number>(
    () => loadOutboxQueue().length
  );

  const [focusedOverlay, setFocusedOverlay] = useState<
    LiveVillagerOverlay | undefined
  >(undefined);

  const [isGeneratingPersona, setIsGeneratingPersona] =
    useState<boolean>(false);

  const liveIntentBridgeRef = useRef<
    | ((
        villagerIndex: number,
        targetNodeId: StreetNodeId,
        isIndoors: boolean,
        durationMs: number
      ) => void)
    | null
  >(null);

  const syncClientRef = useRef<AnvilMultiplexedSyncClient | null>(null);

  const seasonalClock = computeSeasonalClockState(seasonEpochMs, nowMs);
  const season = seasonalClock.season;

  const showToast = (msg: string): void => {
    setToastMessage(msg);

    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Multiplexed Zero-Rerender Native WebSocket + MMKV Outbox Sync Client
  useEffect(() => {
    const initialCoins = loadFounderCoins();

    const client = new AnvilMultiplexedSyncClient({
      onDirectCanvasIntent: (villagerIndex, targetNode, isIndoors, durationMs) => {
        liveIntentBridgeRef.current?.(
          villagerIndex,
          targetNode,
          isIndoors,
          durationMs
        );
      },
      onConnectionChange: (connected, townId, seq, queued) => {
        setLiveConnected(connected);
        setActiveTownId(townId);
        setLastSeq(seq);
        setOutboxCount(queued);
      },
      onSaleSettled: (itemName, qty, netCoinsEarnedFc, buyerName) => {
        setCoins((prev) => {
          const updated = prev + netCoinsEarnedFc;

          saveFounderCoins(updated);

          return updated;
        });
        triggerMediumHaptic();
        showToast(
          `💰 ${buyerName} bought ${qty}× ${itemName} (+${netCoinsEarnedFc} FC)!`
        );
      },
      onTownTreasurySync: (treasuryFc, taxRatePct) => {
        setGovernance((prev) => {
          if (
            prev.townTreasuryFc === treasuryFc &&
            prev.taxRatePct === taxRatePct
          ) {
            return prev;
          }

          const next = {
            ...prev,
            townTreasuryFc: treasuryFc,
            taxRatePct,
          };

          saveTownGovernance(next);

          return next;
        });
      },
    });

    syncClientRef.current = client;
    void client.start(initialCoins);

    return () => {
      client.stop();
      syncClientRef.current = null;
    };
  }, []);

  // Refresh the 72-hour seasonal countdown once per minute (zero 60fps overhead)
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Zero-polling exact wakeup timer for trees, crops, Winter soil refreeze & node respawns
  useEffect(() => {
    const nextWakeupMs = computeNextWorldWakeupMs(
      plantedTrees,
      plantedCrops,
      valleyTiles,
      nodeCooldowns,
      nowMs
    );

    if (nextWakeupMs === null) {
      return;
    }

    const delayMs = Math.max(50, nextWakeupMs - Date.now() + 25);

    const timer = setTimeout(() => {
      const freshNow = Date.now();
      const expiredKeys = new Set<string>();

      for (let i = 0; i < valleyTiles.length; i += 1) {
        const tile = valleyTiles[i];

        if (
          tile.kind === 'FARM_SOIL' &&
          tile.refreezeAtMs !== null &&
          tile.refreezeAtMs <= freshNow
        ) {
          deleteValleyTile(tile.tileX, tile.tileY);
          deleteValleyCropAtTile(tile.tileX, tile.tileY);
          expiredKeys.add(`${tile.tileX}_${tile.tileY}`);
        }
      }

      if (expiredKeys.size > 0) {
        setValleyTiles((prev) =>
          prev.filter((t) => !expiredKeys.has(`${t.tileX}_${t.tileY}`))
        );
        setPlantedCrops((prev) =>
          prev.filter((c) => !expiredKeys.has(`${c.tileX}_${c.tileY}`))
        );
      }

      setNowMs(freshNow);
      setNodeCooldowns((prev) => prev.filter((c) => c.readyAtMs > freshNow));
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [plantedTrees, plantedCrops, valleyTiles, nodeCooldowns, nowMs]);

  const commitCoins = (nextCoins: number): void => {
    const safe = Math.max(0, Math.round(nextCoins));

    saveFounderCoins(safe);
    setCoins(safe);
  };

  const commitPouch = (nextEntries: PouchEntry[]): void => {
    savePouchEntries(nextEntries);
    setPouchEntries(nextEntries);
  };

  const commitGovernance = (nextGov: TownGovernanceState): void => {
    saveTownGovernance(nextGov);
    setGovernance(nextGov);
  };

  const handleHarvestWorldNode = (nodeId: string): void => {
    const node = VALLEY_WORLD_NODES.find((n) => n.id === nodeId);

    if (node === undefined) {
      return;
    }

    const currentNow = Date.now();
    const existingCd = nodeCooldowns.find((c) => c.id === nodeId);

    if (existingCd !== undefined && existingCd.readyAtMs > currentNow) {
      const waitSec = Math.ceil((existingCd.readyAtMs - currentNow) / 1000);

      showToast(`${node.label} regenerating (${waitSec}s)`);

      return;
    }

    const outcome = harvestWorldNode(node, Math.random());
    const nextPouch = adjustPouchItem(pouchEntries, outcome.itemId, outcome.qty);

    commitPouch(nextPouch);

    if (outcome.bonusCoins > 0) {
      commitCoins(coins + outcome.bonusCoins);
    }

    const backendItem = clientIconToBackendItem(outcome.itemId);

    if (backendItem !== null) {
      syncClientRef.current?.dispatchOptimisticCommand({
        cmdId: `harv_${nodeId}_${currentNow}`,
        kind: 'HARVEST_GAIN',
        itemId: backendItem,
        qtyDelta: outcome.qty,
        coinsDelta: outcome.bonusCoins,
      });
    }

    setNodeCooldowns((prev) => {
      const next: NodeCooldownEntry[] = [];

      for (let i = 0; i < prev.length; i += 1) {
        if (prev[i].id !== nodeId && prev[i].readyAtMs > currentNow) {
          next.push(prev[i]);
        }
      }

      next.push({ id: nodeId, readyAtMs: currentNow + node.respawnMs });

      return next;
    });
    setNowMs(currentNow);
    triggerMediumHaptic();
    showToast(`+${outcome.qty} ${outcome.itemName}`);
  };

  const handleCraftRecipe = (recipeId: string): void => {
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);

    if (recipe === undefined) {
      return;
    }

    const nextPouch = applyCraftRecipe(pouchEntries, recipe);

    if (nextPouch === null) {
      showToast('Missing ingredients for craft');

      return;
    }

    commitPouch(nextPouch);
    triggerMediumHaptic();
    showToast(`Crafted +${recipe.outputQty} ${recipe.name}!`);
  };

  const handleSellItem = (itemId: GameIconKey): void => {
    const spec = getEconomyItem(itemId);

    if (spec === null || getPouchQty(pouchEntries, itemId) <= 0) {
      return;
    }

    const nextPouch = adjustPouchItem(pouchEntries, itemId, -1);

    commitPouch(nextPouch);
    commitCoins(coins + spec.npcSellPrice);
    const backendSellId = clientIconToBackendItem(itemId);

    if (backendSellId !== null) {
      syncClientRef.current?.dispatchOptimisticCommand({
        cmdId: `sell_${itemId}_${Date.now()}`,
        kind: 'LOCAL_SELL',
        itemId: backendSellId,
        qtyDelta: -1,
        coinsDelta: spec.npcSellPrice,
      });
    }

    triggerLightHaptic();
    showToast(`Sold ${spec.name} (+${spec.npcSellPrice} FC)`);
  };

  const handleBuySeed = (seedItemId: GameIconKey): void => {
    const spec = getEconomyItem(seedItemId);

    if (spec === null || coins < spec.npcBuyPrice) {
      showToast('Not enough Frost Coins');

      return;
    }

    commitCoins(coins - spec.npcBuyPrice);
    commitPouch(adjustPouchItem(pouchEntries, seedItemId, 1));
    const backendSeedId = clientIconToBackendItem(seedItemId);

    if (backendSeedId !== null) {
      syncClientRef.current?.dispatchOptimisticCommand({
        cmdId: `buy_${seedItemId}_${Date.now()}`,
        kind: 'LOCAL_BUY',
        itemId: backendSeedId,
        qtyDelta: 1,
        coinsDelta: -spec.npcBuyPrice,
      });
    }

    triggerLightHaptic();
    showToast(`Bought +1 ${spec.name}`);
  };

  const handleOpenTownHall = (tab: TownHallTab = 'POLICY'): void => {
    setFocusedVillagerIndex(null);
    setEditingBuilding(null);
    setTownHallTab(tab);
    setTownHallOpen(true);
    triggerLightHaptic();
  };

  /**
   * Tool-driven 1x1 tile interaction (no accidental digging in Hand mode!):
   * - BROOM: clears any 1x1 soil, path, or crop back to natural snow/grass.
   * - HOE: tills 1x1 Farm Soil (refreezes back to snow in Dead Winter after 90s).
   * - SHOVEL: lays permanent 1x1 Village Path (never refreezes; speeds up villagers).
   * - SEED: plants the held Seed onto tilled Farm Soil (or Pine Sapling on open ground).
   * - HAND (default): safely harvests mature crops / chops mature trees without modifying land.
   */
  const handleTileTap = (
    _blockX: number,
    _blockY: number,
    tileX: number,
    tileY: number
  ): void => {
    const currentNow = Date.now();

    const existingCrop = plantedCrops.find(
      (c) => c.tileX === tileX && c.tileY === tileY
    );

    const existingTree = plantedTrees.find(
      (t) => t.tileX === tileX && t.tileY === tileY
    );

    const existingTile = valleyTiles.find(
      (t) => t.tileX === tileX && t.tileY === tileY
    );

    // 1. BROOM: cleanly clear any 1x1 tile, path, or crop back to natural snow/grass
    if (heldTool.kind === 'BROOM') {
      if (existingCrop !== undefined) {
        deleteValleyCrop(existingCrop.id);
        setPlantedCrops((prev) => prev.filter((c) => c.id !== existingCrop.id));
      }

      if (existingTile !== undefined) {
        deleteValleyTile(tileX, tileY);
        setValleyTiles((prev) =>
          prev.filter((t) => t.tileX !== tileX || t.tileY !== tileY)
        );
        triggerLightHaptic();
        showToast(
          existingTile.kind === 'PATH'
            ? 'Removed Path square'
            : 'Cleared Farm Soil back to snow'
        );

        return;
      }

      if (existingCrop !== undefined) {
        triggerLightHaptic();
        showToast('Cleared crop square');
      }

      return;
    }

    // 2. Always allow harvesting mature/withered crops & mature trees when tapped
    if (existingCrop !== undefined) {
      const def = CROP_DEFINITIONS[existingCrop.cropKind];

      if (season === 'WINTER' && !def.winterHardy) {
        deleteValleyCrop(existingCrop.id);
        setPlantedCrops((prev) => prev.filter((c) => c.id !== existingCrop.id));
        triggerLightHaptic();
        showToast(`Cleared frost-withered ${def.name} (grows in Summer)`);

        return;
      }

      const progress = getCropGrowthProgress(existingCrop, currentNow);

      if (progress >= 1) {
        deleteValleyCrop(existingCrop.id);
        setPlantedCrops((prev) => prev.filter((c) => c.id !== existingCrop.id));
        commitPouch(
          adjustPouchItem(pouchEntries, def.harvestItemId, def.harvestQty)
        );
        setNowMs(currentNow);
        triggerMediumHaptic();
        showToast(`Harvested +${def.harvestQty} ${def.name}!`);
      } else {
        showToast(`Growing ${def.name} (${Math.round(progress * 100)}%)`);
      }

      return;
    }

    if (existingTree !== undefined) {
      const progress = getTreeGrowthProgress(existingTree, currentNow);

      if (progress >= 1) {
        deleteValleyTree(existingTree.id);
        setPlantedTrees((prev) => prev.filter((t) => t.id !== existingTree.id));
        commitPouch(adjustPouchItem(pouchEntries, 'pineLog', 2));
        setNowMs(currentNow);
        triggerMediumHaptic();
        showToast('Chopped Pine Tree (+2 Pine Log)');
      }

      return;
    }

    // 3. Default HAND mode: never accidentally digs or alters empty snow/grass
    if (heldTool.kind === 'HAND') {
      return;
    }

    if (isTileBlockedForLandEdit(tileX, tileY, buildings)) {
      showToast('Space is occupied by a building, lake, or plaza well');

      return;
    }

    // 4. HOE: till 1x1 Farm Soil (Winter soil refreezes back to snow after 90s!)
    if (heldTool.kind === 'HOE') {
      const nextTile: StoredValleyTile = {
        tileX,
        tileY,
        kind: 'FARM_SOIL',
        createdAtMs: currentNow,
        refreezeAtMs:
          season === 'WINTER' ? currentNow + WINTER_SOIL_REFREEZE_MS : null,
      };

      upsertValleyTile(nextTile);
      setValleyTiles((prev) => {
        const next: StoredValleyTile[] = [];

        for (let i = 0; i < prev.length; i += 1) {
          if (prev[i].tileX !== tileX || prev[i].tileY !== tileY) {
            next.push(prev[i]);
          }
        }

        next.push(nextTile);

        return next;
      });
      setNowMs(currentNow);
      triggerMediumHaptic();
      showToast(
        season === 'WINTER'
          ? 'Tilled Farm Soil (snow reclaims it in 90s!)'
          : 'Tilled Farm Soil square'
      );

      return;
    }

    // 5. SHOVEL: lay permanent 1x1 Village Path (never refreezes in Winter!)
    if (heldTool.kind === 'SHOVEL') {
      const nextTile: StoredValleyTile = {
        tileX,
        tileY,
        kind: 'PATH',
        createdAtMs: currentNow,
        refreezeAtMs: null,
      };

      upsertValleyTile(nextTile);
      setValleyTiles((prev) => {
        const next: StoredValleyTile[] = [];

        for (let i = 0; i < prev.length; i += 1) {
          if (prev[i].tileX !== tileX || prev[i].tileY !== tileY) {
            next.push(prev[i]);
          }
        }

        next.push(nextTile);

        return next;
      });
      triggerMediumHaptic();
      showToast('Laid Permanent Village Path (+35% citizen speed)');

      return;
    }

    // 6. SEED: plant the currently held Seed!
    if (heldTool.seed === 'pine') {
      const coneQty = getPouchQty(pouchEntries, 'seedPinecone');

      if (coneQty > 0) {
        commitPouch(adjustPouchItem(pouchEntries, 'seedPinecone', -1));
      }

      const newTree: ValleyPlantedTree = {
        id: `vtree_${tileX}_${tileY}`,
        tileX,
        tileY,
        plantedAtMs: currentNow,
        matureAtMs: currentNow + VALLEY_TREE_GROW_MS,
      };

      upsertValleyTree(newTree);
      setPlantedTrees((prev) => [...prev, newTree]);
      setNowMs(currentNow);
      triggerLightHaptic();
      showToast('Planted Pine Sapling');

      return;
    }

    const isTilledSoil =
      existingTile !== undefined &&
      existingTile.kind === 'FARM_SOIL' &&
      (existingTile.refreezeAtMs === null ||
        existingTile.refreezeAtMs > currentNow);

    if (!isTilledSoil) {
      showToast('Equip the Hoe first to till a 1×1 Farm Soil square!');

      return;
    }

    const cropDef = CROP_DEFINITIONS[heldTool.seed];
    const seedQty = getPouchQty(pouchEntries, cropDef.seedItemId);

    if (seedQty <= 0) {
      showToast(`No ${cropDef.name} seeds — buy more in Pouch!`);

      return;
    }

    const newCrop: ValleyPlantedCrop = {
      id: `vcrop_${tileX}_${tileY}`,
      tileX,
      tileY,
      cropKind: heldTool.seed,
      plantedAtMs: currentNow,
      matureAtMs: currentNow + cropDef.growDurationMs,
    };

    commitPouch(adjustPouchItem(pouchEntries, cropDef.seedItemId, -1));
    upsertValleyCrop(newCrop);
    setPlantedCrops((prev) => [...prev, newCrop]);
    setNowMs(currentNow);
    triggerLightHaptic();

    if (season === 'WINTER' && !cropDef.winterHardy) {
      showToast(`Warning: ${cropDef.name} freezes in Dead Winter!`);
    } else {
      showToast(`Planted ${cropDef.name}`);
    }
  };

  /**
   * Long-press any building to enter Move & Rotate mode.
   */
  const handleBlockLongPress = (blockX: number, blockY: number): void => {
    const tappedBuilding = buildings.find(
      (b) => b.blockX === blockX && b.blockY === blockY
    );

    if (tappedBuilding !== undefined) {
      setFocusedVillagerIndex(null);
      setEditingBuilding({ ...tappedBuilding });
      triggerMediumHaptic();
    }
  };

  const handleMoveEditingBuilding = (blockX: number, blockY: number): void => {
    setEditingBuilding((prev) => {
      if (prev === null) {
        return null;
      }

      if (prev.blockX === blockX && prev.blockY === blockY) {
        return prev;
      }

      return { ...prev, blockX, blockY };
    });
    triggerLightHaptic();
  };

  const handleRotateEditingBuilding = (): void => {
    setEditingBuilding((prev) => {
      if (prev === null) {
        return null;
      }

      return { ...prev, facing: prev.facing === 1 ? 0 : 1 };
    });
    triggerLightHaptic();
  };

  const isEditPlacementValid =
    editingBuilding !== null &&
    canPlaceBuildingOnBlock(
      editingBuilding.blockX,
      editingBuilding.blockY,
      buildings,
      editingBuilding.id
    );

  const handleConfirmEditingBuilding = (): void => {
    if (editingBuilding === null || !isEditPlacementValid) {
      return;
    }

    const committed = editingBuilding;
    const bounds = getBuildingTileBounds(committed);

    upsertValleyBuilding(committed);

    for (let ty = bounds.minTy; ty <= bounds.maxTy; ty += 1) {
      for (let tx = bounds.minTx; tx <= bounds.maxTx; tx += 1) {
        deleteValleyTile(tx, ty);
        deleteValleyCropAtTile(tx, ty);
      }
    }

    setValleyTiles((prev) =>
      prev.filter(
        (t) =>
          t.tileX < bounds.minTx ||
          t.tileX > bounds.maxTx ||
          t.tileY < bounds.minTy ||
          t.tileY > bounds.maxTy
      )
    );
    setPlantedCrops((prev) =>
      prev.filter(
        (c) =>
          c.tileX < bounds.minTx ||
          c.tileX > bounds.maxTx ||
          c.tileY < bounds.minTy ||
          c.tileY > bounds.maxTy
      )
    );
    setBuildings((prev) => {
      const next: StoredValleyBuilding[] = [];

      for (let i = 0; i < prev.length; i += 1) {
        const item = prev[i];

        next.push(item.id === committed.id ? committed : item);
      }

      return next;
    });
    setEditingBuilding(null);
    triggerMediumHaptic();
  };

  const handleCancelEditingBuilding = (): void => {
    setEditingBuilding(null);
    triggerLightHaptic();
  };

  const handleSelectVillager = (villagerIndex: number | null): void => {
    setFocusedVillagerIndex(villagerIndex);

    if (villagerIndex !== null) {
      setEditingBuilding(null);
      triggerLightHaptic();

      const existingOverlay =
        syncClientRef.current?.getVillagerOverlay(villagerIndex);

      setFocusedOverlay(existingOverlay);

      const townPrefix = syncClientRef.current?.currentTownId ?? activeTownId;

      const backendNpcId =
        existingOverlay?.backendNpcId ??
        `${townPrefix}_npc_${villagerIndex + 1}`;

      if (existingOverlay?.persona === null || existingOverlay === undefined) {
        void fetchVillagerPersonaFromBackend(backendNpcId).then((persona) => {
          if (persona !== null && syncClientRef.current !== null) {
            syncClientRef.current.setVillagerPersona(villagerIndex, persona);
            setFocusedOverlay(
              syncClientRef.current.getVillagerOverlay(villagerIndex)
            );
          }
        });
      }
    } else {
      setFocusedOverlay(undefined);
    }
  };

  const handleGenerateFocusedAiPersona = (): void => {
    if (focusedVillagerIndex === null || isGeneratingPersona) {
      return;
    }

    const idx = focusedVillagerIndex;
    const townPrefix = syncClientRef.current?.currentTownId ?? activeTownId;

    const backendNpcId =
      focusedOverlay?.backendNpcId ?? `${townPrefix}_npc_${idx + 1}`;

    setIsGeneratingPersona(true);
    void generateLiveAiPersonaOnBackend(backendNpcId)
      .then((persona) => {
        if (persona !== null && syncClientRef.current !== null) {
          syncClientRef.current.setVillagerPersona(idx, persona);
          setFocusedOverlay(syncClientRef.current.getVillagerOverlay(idx));
          triggerMediumHaptic();
          showToast(`✨ Synthesized AI Persona v${persona.version}!`);
        } else {
          showToast('Backend offline — using local valley persona');
        }
      })
      .finally(() => {
        setIsGeneratingPersona(false);
      });
  };

  const handleSwitchVisitedTown = (nextTownId: string): void => {
    syncClientRef.current?.switchTown(nextTownId);
    setActiveTownId(nextTownId);
    triggerMediumHaptic();
    showToast(
      nextTownId === loadStoredAccountMeta().homeTownId
        ? 'Returned to Home Valley'
        : `🧭 Visited ${nextTownId} (1-frame hop)`
    );
  };

  const handleChangeTaxRate = (delta: number): void => {
    const nextTax = Math.max(5, Math.min(18, governance.taxRatePct + delta));
    const draft: TownGovernanceState = { ...governance, taxRatePct: nextTax };

    commitGovernance({
      ...draft,
      approvalPct: computeProjectedApproval(draft, season),
    });
    triggerLightHaptic();
  };

  const handleChangeWinterPolicy = (policy: WinterPolicy): void => {
    const draft: TownGovernanceState = { ...governance, winterPolicy: policy };

    commitGovernance({
      ...draft,
      approvalPct: computeProjectedApproval(draft, season),
    });
    triggerLightHaptic();
  };

  const handleDonateRelief = (): void => {
    const stewQty = getPouchQty(pouchEntries, 'fishStew');
    const woodQty = getPouchQty(pouchEntries, 'firewood');

    if (stewQty >= 1) {
      commitPouch(adjustPouchItem(pouchEntries, 'fishStew', -1));
    } else if (woodQty >= 2) {
      commitPouch(adjustPouchItem(pouchEntries, 'firewood', -2));
    } else {
      showToast('Need 1 Fish Stew or 2 Firewood to donate');

      return;
    }

    const nextApproval = Math.min(98, governance.approvalPct + 10);

    commitGovernance({
      ...governance,
      approvalPct: nextApproval,
      reliefDonations: governance.reliefDonations + 1,
    });
    triggerMediumHaptic();
    showToast(`Relief donated! Citizen approval → ${nextApproval}%`);
  };

  const handleRunElection = (): void => {
    const result = runTownElection(governance, season);

    setLastElection(result);
    commitGovernance({
      ...governance,
      officeHolder: result.winner,
      electionCount: governance.electionCount + 1,
      taxRatePct:
        result.winner === 'AI_STERLING'
          ? 15
          : result.winner === 'AI_BARNABY'
            ? 10
            : governance.taxRatePct,
      winterPolicy:
        result.winner === 'AI_VESPER'
          ? 'AUSTERITY'
          : result.winner === 'AI_BARNABY'
            ? 'TARGETED_ESSENTIALS'
            : governance.winterPolicy,
    });
    triggerMediumHaptic();
    showToast(result.headline);
  };

  const handleTrainUnit = (unitKey: ArmyUnitKey): void => {
    const spec = getArmyUnitSpec(unitKey);
    const rules = getRaidCommandRules(governance.officeHolder);
    const totalArmy = getTotalWarbandCount(governance.warband);
    const costFc = getUnitTrainingCoinCost(spec, governance.officeHolder);
    const stewQty = getPouchQty(pouchEntries, 'fishStew');

    if (
      totalArmy >= rules.maxArmyCount ||
      coins < costFc ||
      stewQty < spec.fishStewCost
    ) {
      return;
    }

    commitCoins(coins - costFc);

    if (spec.fishStewCost > 0) {
      commitPouch(adjustPouchItem(pouchEntries, 'fishStew', -spec.fishStewCost));
    }

    const nextWarband: WarbandSlot[] = [];
    let updated = false;

    for (let i = 0; i < governance.warband.length; i += 1) {
      const slot = governance.warband[i];

      if (slot.unitKey === unitKey) {
        nextWarband.push({ unitKey, count: slot.count + 1 });
        updated = true;
      } else {
        nextWarband.push(slot);
      }
    }

    if (!updated) {
      nextWarband.push({ unitKey, count: 1 });
    }

    commitGovernance({ ...governance, warband: nextWarband });
    triggerLightHaptic();
    showToast(`Trained +1 ${spec.name}`);
  };

  const handleLaunchRaid = (town: RivalTownBlueprint): void => {
    setTownHallOpen(false);
    setActiveRaidTown(town);
    triggerMediumHaptic();
  };

  const handleFinishRaid = (summary: RaidOutcomeSummary): void => {
    const bountyHit =
      summary.won &&
      activeRaidTown !== null &&
      !governance.activeBounty.completed &&
      governance.activeBounty.targetTownId === activeRaidTown.id;

    const bountyCoins = bountyHit ? governance.activeBounty.rewardCoins : 0;

    const bountyApproval = bountyHit
      ? governance.activeBounty.approvalBonusPct
      : 0;

    commitCoins(coins + summary.playerCoinsEarned + bountyCoins);

    let nextPouch = [...pouchEntries];

    if (summary.fishEarned > 0) {
      nextPouch = adjustPouchItem(nextPouch, 'lakeTrout', summary.fishEarned);
    }

    if (summary.firewoodEarned > 0) {
      nextPouch = adjustPouchItem(
        nextPouch,
        'firewood',
        summary.firewoodEarned
      );
    }

    commitPouch(nextPouch);

    commitGovernance({
      ...governance,
      townTreasuryFc: governance.townTreasuryFc + summary.treasuryTributeCoins,
      authorityRank: Math.max(0, governance.authorityRank + summary.authorityDelta),
      raidsWon: governance.raidsWon + (summary.won ? 1 : 0),
      approvalPct: Math.min(98, governance.approvalPct + bountyApproval),
      activeBounty: bountyHit
        ? { ...governance.activeBounty, completed: true }
        : governance.activeBounty,
    });

    setActiveRaidTown(null);
    triggerMediumHaptic();
    showToast(
      bountyHit
        ? `Bounty Claimed! +${summary.playerCoinsEarned + bountyCoins} FC & +${bountyApproval}% Approval`
        : `Raid Spoils: +${summary.playerCoinsEarned} FC`
    );
  };

  const focusedVillager =
    focusedVillagerIndex !== null
      ? (TOWN_VILLAGERS[focusedVillagerIndex] ?? null)
      : null;

  const focusedLocationLabel =
    focusedVillager !== null
      ? TOWN_STREET_NODES[focusedVillager.startNode].label
      : '';

  return (
    <View
      style={[
        styles.root,
        season === 'WINTER' ? styles.winterBg : styles.summerBg,
      ]}
    >
      <TownMapCanvas
        season={season}
        nowMs={nowMs}
        buildings={buildings}
        editingBuilding={editingBuilding}
        isEditPlacementValid={isEditPlacementValid}
        valleyTiles={valleyTiles}
        plantedTrees={plantedTrees}
        plantedCrops={plantedCrops}
        nodeCooldowns={nodeCooldowns}
        focusedVillagerIndex={focusedVillagerIndex}
        liveIntentBridgeRef={liveIntentBridgeRef}
        onSelectVillager={handleSelectVillager}
        onMoveEditingBuilding={handleMoveEditingBuilding}
        onHarvestWorldNode={handleHarvestWorldNode}
        onOpenTownHall={() => {
          handleOpenTownHall('POLICY');
        }}
        onTileTap={handleTileTap}
        onBlockLongPress={handleBlockLongPress}
      />

      {activeTownId !== loadStoredAccountMeta().homeTownId && (
        <View style={styles.visitingBannerWrap} pointerEvents="box-none">
          <Pressable
            onPress={() => {
              handleSwitchVisitedTown(loadStoredAccountMeta().homeTownId);
            }}
            style={styles.visitingPill}
          >
            <Text style={styles.visitingPillText}>
              🧭 Visiting {activeTownId} · Tap to Return Home
            </Text>
          </Pressable>
        </View>
      )}

      {toastMessage !== null && (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={styles.toastPill}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      <HeroPouchHud
        seasonalClock={seasonalClock}
        coins={coins}
        pouchEntries={pouchEntries}
        governance={governance}
        heldTool={heldTool}
        citizenCount={TOWN_VILLAGERS.length}
        buildingCount={buildings.length}
        visible={
          editingBuilding === null &&
          focusedVillager === null &&
          !townHallOpen &&
          activeRaidTown === null
        }
        onSelectHeldTool={setHeldTool}
        onCraftRecipe={handleCraftRecipe}
        onSellItem={handleSellItem}
        onBuySeed={handleBuySeed}
        onOpenTownHall={handleOpenTownHall}
      />

      {editingBuilding !== null && (
        <BuildingEditBar
          draft={editingBuilding}
          isPlacementValid={isEditPlacementValid}
          onRotate={handleRotateEditingBuilding}
          onConfirm={handleConfirmEditingBuilding}
          onCancel={handleCancelEditingBuilding}
        />
      )}

      {editingBuilding === null && focusedVillager !== null && (
        <VillagerFocusCard
          villager={focusedVillager}
          currentLocationLabel={focusedLocationLabel}
          liveOverlay={focusedOverlay}
          isGeneratingPersona={isGeneratingPersona}
          onGenerateAiPersona={handleGenerateFocusedAiPersona}
          onClose={() => {
            setFocusedVillagerIndex(null);
            setFocusedOverlay(undefined);
          }}
        />
      )}

      {townHallOpen && (
        <TownHallModal
          key={townHallTab}
          visible
          season={season}
          coins={coins}
          pouchEntries={pouchEntries}
          governance={governance}
          lastElection={lastElection}
          initialTab={townHallTab}
          liveConnected={liveConnected}
          activeTownId={activeTownId}
          lastSeq={lastSeq}
          outboxCount={outboxCount}
          onClose={() => {
            setTownHallOpen(false);
          }}
          onChangeTaxRate={handleChangeTaxRate}
          onChangeWinterPolicy={handleChangeWinterPolicy}
          onRunElection={handleRunElection}
          onDonateRelief={handleDonateRelief}
          onTrainUnit={handleTrainUnit}
          onLaunchRaid={handleLaunchRaid}
          onSwitchVisitedTown={handleSwitchVisitedTown}
          onEscrowListed={(itemId, qty) => {
            commitPouch(adjustPouchItem(pouchEntries, itemId, -qty));
            triggerMediumHaptic();
            showToast(`Listed ${qty}× to Inter-Town Escrow!`);
          }}
          onEscrowCancelledRefund={(itemId, qty) => {
            commitPouch(adjustPouchItem(pouchEntries, itemId, qty));
            triggerLightHaptic();
            showToast(`Escrow cancelled — refunded +${qty}× to Pouch`);
          }}
          onEscrowPurchased={(itemId, qty, totalCostFc) => {
            commitCoins(coins - totalCostFc);
            commitPouch(adjustPouchItem(pouchEntries, itemId, qty));
            triggerMediumHaptic();
            showToast(`Bought +${qty}× from Inter-Town Market!`);
          }}
        />
      )}

      {activeRaidTown !== null && (
        <RivalRaidScreen
          key={activeRaidTown.id}
          town={activeRaidTown}
          warband={governance.warband}
          officeHolder={governance.officeHolder}
          onFinishRaid={handleFinishRaid}
          onRetreat={() => {
            setActiveRaidTown(null);
            showToast('Warband retreated to Frostpeak Valley');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  winterBg: {
    backgroundColor: '#EBF4FF',
  },
  summerBg: {
    backgroundColor: '#76A63E',
  },
  toastWrap: {
    position: 'absolute',
    top: 46,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  toastPill: {
    backgroundColor: WOOD_THEME.toastBg,
    borderWidth: 2.5,
    borderColor: WOOD_THEME.toastBorder,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#2E1A0B',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  visitingBannerWrap: {
    position: 'absolute',
    top: 46,
    left: 14,
  },
  visitingPill: {
    backgroundColor: WOOD_THEME.sheetBg,
    borderWidth: 2,
    borderColor: WOOD_THEME.sheetBorder,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    elevation: 5,
  },
  visitingPillText: {
    color: WOOD_THEME.inkHeading,
    fontSize: 11.5,
    fontWeight: '800',
  },
});
