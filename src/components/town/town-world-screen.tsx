import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TownMapCanvas } from '@/components/town/town-map-canvas';
import {
  deleteLandPatch,
  loadLandPatches,
  loadSeason,
  saveSeason,
  type StoredLandPatch,
  upsertLandPatch,
} from '@/game/town-db';
import type { Season } from '@/game/types';
import { isBlockOverlappingLake } from '@/game/valley-zones';

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
  const [season, setSeason] = useState<Season>(() => loadSeason());

  const [placedPatches, setPlacedPatches] = useState<StoredLandPatch[]>(() =>
    loadLandPatches()
  );

  const handleToggleSeason = (): void => {
    const nextSeason: Season = season === 'WINTER' ? 'SUMMER' : 'WINTER';

    setSeason(nextSeason);
    saveSeason(nextSeason);
    triggerLightHaptic();
  };

  /**
   * Tap any playable 4x4 block (outside the Fishing Lake) to clear the snow/grass
   * and reveal rich Cartoon Loamy Soil ready for planting.
   */
  const handleBlockTap = (blockX: number, blockY: number): void => {
    if (isBlockOverlappingLake(blockX, blockY)) {
      return;
    }

    const alreadyCleared = placedPatches.some(
      (p) => p.blockX === blockX && p.blockY === blockY && p.kind === 'PLANTING'
    );

    if (alreadyCleared) {
      return;
    }

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
  };

  /**
   * Long-press a cleared 4x4 soil block to restore it back to natural snow/grass.
   */
  const handleBlockLongPress = (blockX: number, blockY: number): void => {
    const exists = placedPatches.some(
      (p) => p.blockX === blockX && p.blockY === blockY
    );

    if (!exists) {
      return;
    }

    deleteLandPatch(blockX, blockY);
    setPlacedPatches((prev) =>
      prev.filter((p) => p.blockX !== blockX || p.blockY !== blockY)
    );
    triggerLightHaptic();
  };

  return (
    <View
      style={[
        styles.root,
        season === 'WINTER' ? styles.winterBg : styles.summerBg,
      ]}
    >
      <TownMapCanvas
        season={season}
        placedPatches={placedPatches}
        onBlockTap={handleBlockTap}
        onBlockLongPress={handleBlockLongPress}
        onToggleSeason={handleToggleSeason}
      />
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
