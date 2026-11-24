import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  type StoredValleyBuilding,
  VALLEY_BUILDING_LABELS,
} from '@/game/valley-zones';

interface BuildingEditBarProps {
  readonly draft: StoredValleyBuilding;
  readonly isPlacementValid: boolean;
  readonly onRotate: () => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function BuildingEditBar({
  draft,
  isPlacementValid,
  onRotate,
  onConfirm,
  onCancel,
}: BuildingEditBarProps) {
  const buildingLabel = VALLEY_BUILDING_LABELS[draft.spriteKey];
  const facingLabel = draft.facing === 1 ? 'Facing Left' : 'Facing Right';

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.bar}>
        <View style={styles.infoRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.titleText} numberOfLines={1}>
              {buildingLabel}
            </Text>
            <Text
              style={[
                styles.statusText,
                !isPlacementValid && styles.invalidText,
              ]}
              numberOfLines={1}
            >
              {isPlacementValid
                ? `${facingLabel} · Tap any 4×4 block to move`
                : 'Blocked — tap an open 4×4 block'}
            </Text>
          </View>
          <View style={styles.coordChip}>
            <Text style={styles.coordText}>
              {draft.blockX}, {draft.blockY}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel moving building"
            onPress={onCancel}
            style={[styles.btn, styles.cancelBtn]}
          >
            <Text style={styles.cancelBtnText}>✕ Cancel</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rotate building"
            onPress={onRotate}
            style={[styles.btn, styles.rotateBtn]}
          >
            <Text style={styles.rotateBtnText}>↻ Flip</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm building placement"
            disabled={!isPlacementValid}
            onPress={onConfirm}
            style={[
              styles.btn,
              styles.confirmBtn,
              !isPlacementValid && styles.confirmBtnDisabled,
            ]}
          >
            <Text
              style={[
                styles.confirmBtnText,
                !isPlacementValid && styles.confirmBtnTextDisabled,
              ]}
            >
              ✓ Place
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 20,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: 'rgba(10, 14, 24, 0.94)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(64, 167, 252, 0.45)',
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 11,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusText: {
    color: '#C0CEF5',
    fontSize: 12,
    fontWeight: '500',
  },
  invalidText: {
    color: '#FCA5A5',
  },
  coordChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coordText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  rotateBtn: {
    backgroundColor: '#C0CEF5',
  },
  rotateBtnText: {
    color: '#0A0A0A',
    fontSize: 13.5,
    fontWeight: '800',
  },
  confirmBtn: {
    backgroundColor: '#40A7FC',
  },
  confirmBtnDisabled: {
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
  },
  confirmBtnText: {
    color: '#0A0A0A',
    fontSize: 13.5,
    fontWeight: '800',
  },
  confirmBtnTextDisabled: {
    color: '#94A3B8',
  },
});
