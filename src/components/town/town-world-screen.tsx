import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BuildingEditBar } from '@/components/town/building-edit-bar';
import { HeroPouchHud } from '@/components/town/hero-pouch-hud';
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
import {
  adjustPouchItem,
  applyCraftRecipe,
  CRAFT_RECIPES,
  CROP_DEFINITIONS,
  type CropKind,
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
  deleteLandPatch,
  deleteValleyCrop,
  deleteValleyCropsInBlock,
  deleteValleyTree,
  deleteValleyTreesInBlock,
  loadFounderCoins,
  loadLandPatches,
  loadOrInitSeasonEpochMs,
  loadPouchEntries,
  loadTownGovernance,
  loadValleyBuildings,
  loadValleyCrops,
  loadValleyTrees,
  saveFounderCoins,
  savePouchEntries,
  saveTownGovernance,
  type StoredLandPatch,
  upsertLandPatch,
  upsertValleyBuilding,
  upsertValleyCrop,
  upsertValleyTree,
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
import { TOWN_STREET_NODES, TOWN_VILLAGERS } from '@/game/town-villagers';
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

  const [placedPatches, setPlacedPatches] = useState<StoredLandPatch[]>(() =>
    loadLandPatches()
  );

  const [plantedTrees, setPlantedTrees] = useState<ValleyPlantedTree[]>(() =>
    loadValleyTrees()
  );

  const [plantedCrops, setPlantedCrops] = useState<ValleyPlantedCrop[]>(() =>
    loadValleyCrops()
  );

  const [selectedSeed, setSelectedSeed] = useState<CropKind | 'pine'>('turnip');
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

  // Refresh the 72-hour seasonal countdown once per minute (zero 60fps overhead)
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Zero-polling exact wakeup timer for trees, crops, and resource node respawns
  useEffect(() => {
    const nextWakeupMs = computeNextWorldWakeupMs(
      plantedTrees,
      plantedCrops,
      nodeCooldowns,
      nowMs
    );

    if (nextWakeupMs === null) {
      return;
    }

    const delayMs = Math.max(50, nextWakeupMs - Date.now() + 25);

    const timer = setTimeout(() => {
      const freshNow = Date.now();

      setNowMs(freshNow);
      setNodeCooldowns((prev) => prev.filter((c) => c.readyAtMs > freshNow));
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [plantedTrees, plantedCrops, nodeCooldowns, nowMs]);

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
   * Direct contextual interaction on any playable 4x4 block:
   * 1. Tap a Mature/Withered Crop -> harvest into Pouch (or clear frost-damaged crop).
   * 2. Tap a Mature Pine Tree -> chop for +2 Pine Logs.
   * 3. Tap uncleared snow/grass -> clear into organic Loamy Soil.
   * 4. Tap cleared Loamy Soil -> plant currently equipped Seed (Snow Turnip, Pine, Maize, etc.).
   */
  const handleTileTap = (
    blockX: number,
    blockY: number,
    tileX: number,
    tileY: number
  ): void => {
    const currentNow = Date.now();

    // 1. Check planted crop on this tile
    const existingCrop = plantedCrops.find(
      (c) => c.tileX === tileX && c.tileY === tileY
    );

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

    // 2. Check planted pine tree on this tile
    const existingTree = plantedTrees.find(
      (t) => t.tileX === tileX && t.tileY === tileY
    );

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

    if (isBlockBlockedForSoil(blockX, blockY, buildings)) {
      return;
    }

    const isSoilCleared = placedPatches.some(
      (p) => p.blockX === blockX && p.blockY === blockY && p.kind === 'PLANTING'
    );

    // 3. Clear snow/grass into organic Loamy Soil
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
      showToast('Cleared Loamy Soil (tap again to plant)');

      return;
    }

    // 4. Plant equipped seed onto cleared Loamy Soil
    if (selectedSeed === 'pine') {
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

    const cropDef = CROP_DEFINITIONS[selectedSeed];
    const seedQty = getPouchQty(pouchEntries, cropDef.seedItemId);

    if (seedQty <= 0) {
      showToast(`No ${cropDef.name} seeds — buy more in Pouch!`);

      return;
    }

    const newCrop: ValleyPlantedCrop = {
      id: `vcrop_${tileX}_${tileY}`,
      tileX,
      tileY,
      cropKind: selectedSeed,
      plantedAtMs: currentNow,
      matureAtMs: currentNow + cropDef.growDurationMs,
    };

    commitPouch(adjustPouchItem(pouchEntries, cropDef.seedItemId, -1));
    upsertValleyCrop(newCrop);
    setPlantedCrops((prev) => [...prev, newCrop]);
    setNowMs(currentNow);
    triggerLightHaptic();

    if (season === 'WINTER' && !cropDef.winterHardy) {
      showToast(`Warning: ${cropDef.name} withers in Dead Winter!`);
    } else {
      showToast(`Planted ${cropDef.name}`);
    }
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
    deleteValleyCropsInBlock(blockX, blockY);

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
    setPlantedCrops((prev) =>
      prev.filter(
        (c) =>
          c.tileX < minTx ||
          c.tileX > maxTx ||
          c.tileY < minTy ||
          c.tileY > maxTy
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
        placedPatches={placedPatches}
        plantedTrees={plantedTrees}
        plantedCrops={plantedCrops}
        nodeCooldowns={nodeCooldowns}
        focusedVillagerIndex={focusedVillagerIndex}
        onSelectVillager={handleSelectVillager}
        onMoveEditingBuilding={handleMoveEditingBuilding}
        onHarvestWorldNode={handleHarvestWorldNode}
        onOpenTownHall={() => {
          handleOpenTownHall('POLICY');
        }}
        onTileTap={handleTileTap}
        onBlockLongPress={handleBlockLongPress}
      />

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
        selectedSeed={selectedSeed}
        citizenCount={TOWN_VILLAGERS.length}
        buildingCount={buildings.length}
        visible={
          editingBuilding === null &&
          focusedVillager === null &&
          !townHallOpen &&
          activeRaidTown === null
        }
        onSelectSeed={setSelectedSeed}
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
          onClose={() => {
            setFocusedVillagerIndex(null);
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
          onClose={() => {
            setTownHallOpen(false);
          }}
          onChangeTaxRate={handleChangeTaxRate}
          onChangeWinterPolicy={handleChangeWinterPolicy}
          onRunElection={handleRunElection}
          onDonateRelief={handleDonateRelief}
          onTrainUnit={handleTrainUnit}
          onLaunchRaid={handleLaunchRaid}
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
    backgroundColor: 'rgba(10, 14, 24, 0.88)',
    borderWidth: 1.5,
    borderColor: '#40A7FC',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
