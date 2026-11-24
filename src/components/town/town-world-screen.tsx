import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BuildingEditBar } from '@/components/town/building-edit-bar';
import { HeroPouchHud } from '@/components/town/hero-pouch-hud';
import { TownMapCanvas } from '@/components/town/town-map-canvas';
import { VillagerFocusCard } from '@/components/town/villager-focus-card';
import {
  computeSeasonalClockState,
  deleteLandPatch,
  deleteValleyTree,
  deleteValleyTreesInBlock,
  loadInventory,
  loadLandPatches,
  loadOrInitSeasonEpochMs,
  loadValleyBuildings,
  loadValleyTrees,
  type StoredLandPatch,
  upsertLandPatch,
  upsertValleyBuilding,
  upsertValleyTree,
} from '@/game/town-db';
import { TOWN_STREET_NODES, TOWN_VILLAGERS } from '@/game/town-villagers';
import type { InventoryCounts } from '@/game/types';
import {
  BLOCK_GRID_SIZE,
  canPlaceBuildingOnBlock,
  computeNextValleyTreeWakeupMs,
  getTreeGrowthProgress,
  isBlockBlockedForSoil,
  type StoredValleyBuilding,
  VALLEY_TREE_GROW_MS,
  type ValleyPlantedTree,
} from '@/game/valley-zones';

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

export function TownWorldScreen() {
  const [seasonEpochMs] = useState<number>(() => loadOrInitSeasonEpochMs());

  const [inventory] = useState<InventoryCounts>(() => loadInventory());

  const [buildings, setBuildings] = useState<StoredValleyBuilding[]>(() =>
    loadValleyBuildings()
  );

  const [editingBuilding, setEditingBuilding] =
    useState<StoredValleyBuilding | null>(null);

  const [placedPatches, setPlacedPatches] = useState<StoredLandPatch[]>(() =>
    loadLandPatches()
  );

  const [plantedTrees, setPlantedTrees] = useState<ValleyPlantedTree[]>(() =>
    loadValleyTrees()
  );

  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [focusedVillagerIndex, setFocusedVillagerIndex] = useState<
    number | null
  >(null);

  const seasonalClock = computeSeasonalClockState(seasonEpochMs, nowMs);
  const season = seasonalClock.season;

  // Refresh the 72-hour seasonal countdown once per minute (zero 60fps overhead)
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Zero-polling exact wakeup timer: re-renders only when a growing pine tree hits its next stage
  useEffect(() => {
    const nextWakeupMs = computeNextValleyTreeWakeupMs(plantedTrees, nowMs);

    if (nextWakeupMs === null) {
      return;
    }

    const delayMs = Math.max(50, nextWakeupMs - Date.now() + 25);

    const timer = setTimeout(() => {
      setNowMs(Date.now());
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [plantedTrees, nowMs]);

  /**
   * Direct contextual interaction on any playable 4x4 block:
   * 1. Tap an existing Mature Pine Tree -> harvest/chop it.
   * 2. Tap an uncleared snow/grass 4x4 block -> clear snow to reveal organic Loamy Soil.
   * 3. Tap any of the 16 (4x4) sub-tiles inside cleared Loamy Soil -> plant a growing Pine Tree!
   */
  const handleTileTap = (
    blockX: number,
    blockY: number,
    tileX: number,
    tileY: number
  ): void => {
    const currentNow = Date.now();

    // 1. Check if the user tapped an existing planted tree on this tile
    const existingTree = plantedTrees.find(
      (t) => t.tileX === tileX && t.tileY === tileY
    );

    if (existingTree !== undefined) {
      const progress = getTreeGrowthProgress(existingTree, currentNow);

      if (progress >= 1) {
        deleteValleyTree(existingTree.id);
        setPlantedTrees((prev) => prev.filter((t) => t.id !== existingTree.id));
        setNowMs(currentNow);
        triggerMediumHaptic();
      }

      return;
    }

    if (isBlockBlockedForSoil(blockX, blockY, buildings)) {
      return;
    }

    const isSoilCleared = placedPatches.some(
      (p) => p.blockX === blockX && p.blockY === blockY && p.kind === 'PLANTING'
    );

    // 2. If block is still covered in snow/grass, clear it into organic Loamy Soil
    if (!isSoilCleared) {
      const newPatch: StoredLandPatch = {
        blockX,
        blockY,
        kind: 'PLANTING',
      };

      upsertLandPatch(newPatch);
      setPlacedPatches((prev) => {
        const next: StoredLandPatch[] = [];

        for (let i = 0; i < prev.length; i += 1) {
          const item = prev[i];

          if (item.blockX !== blockX || item.blockY !== blockY) {
            next.push(item);
          }
        }

        next.push(newPatch);

        return next;
      });
      triggerMediumHaptic();

      return;
    }

    // 3. Block is already cleared Loamy Soil -> plant a fresh Pine Sapling on this exact tile!
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
  };

  /**
   * Long-press any building to enter Move & Rotate mode.
   * Long-press a cleared 4x4 soil block (with no building) to restore it back to snow/grass.
   */
  const handleBlockLongPress = (blockX: number, blockY: number): void => {
    const tappedBuilding = buildings.find(
      (b) => b.blockX === blockX && b.blockY === blockY
    );

    if (tappedBuilding !== undefined) {
      setFocusedVillagerIndex(null);
      setEditingBuilding({ ...tappedBuilding });
      triggerMediumHaptic();

      return;
    }

    const exists = placedPatches.some(
      (p) => p.blockX === blockX && p.blockY === blockY
    );

    if (!exists) {
      return;
    }

    const minTx = blockX * BLOCK_GRID_SIZE;
    const maxTx = minTx + BLOCK_GRID_SIZE - 1;
    const minTy = blockY * BLOCK_GRID_SIZE;
    const maxTy = minTy + BLOCK_GRID_SIZE - 1;

    deleteLandPatch(blockX, blockY);
    deleteValleyTreesInBlock(blockX, blockY);

    setPlacedPatches((prev) =>
      prev.filter((p) => p.blockX !== blockX || p.blockY !== blockY)
    );
    setPlantedTrees((prev) =>
      prev.filter(
        (t) =>
          t.tileX < minTx ||
          t.tileX > maxTx ||
          t.tileY < minTy ||
          t.tileY > maxTy
      )
    );
    triggerLightHaptic();
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

    upsertValleyBuilding(committed);
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
    }
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
        placedPatches={placedPatches}
        plantedTrees={plantedTrees}
        focusedVillagerIndex={focusedVillagerIndex}
        onSelectVillager={handleSelectVillager}
        onMoveEditingBuilding={handleMoveEditingBuilding}
        onTileTap={handleTileTap}
        onBlockLongPress={handleBlockLongPress}
      />
      <HeroPouchHud
        seasonalClock={seasonalClock}
        inventory={inventory}
        citizenCount={TOWN_VILLAGERS.length}
        buildingCount={buildings.length}
        visible={editingBuilding === null && focusedVillager === null}
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
          onClose={() => {
            setFocusedVillagerIndex(null);
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
});
