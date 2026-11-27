import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WOOD_THEME } from '@/components/town/wood-theme';
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
    backgroundColor: WOOD_THEME.sheetBg,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: WOOD_THEME.sheetBorder,
    paddingHorizontal: 15,
    paddingVertical: 13,
    gap: 11,
    shadowColor: '#2E1A0B',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
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
    color: WOOD_THEME.inkHeading,
    fontSize: 16.5,
    fontWeight: '800',
  },
  statusText: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  invalidText: {
    color: WOOD_THEME.ctaDangerText,
    fontWeight: '700',
  },
  coordChip: {
    backgroundColor: WOOD_THEME.badgeGoldBg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: WOOD_THEME.badgeGoldBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coordText: {
    color: WOOD_THEME.badgeGoldText,
    fontSize: 11,
    fontWeight: '800',
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
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
  },
  cancelBtnText: {
    color: WOOD_THEME.inkHeading,
    fontSize: 13,
    fontWeight: '800',
  },
  rotateBtn: {
    backgroundColor: WOOD_THEME.ctaWoodBg,
  },
  rotateBtnText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 13.5,
    fontWeight: '800',
  },
  confirmBtn: {
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.ctaGoldBorder,
  },
  confirmBtnDisabled: {
    backgroundColor: WOOD_THEME.tabInactiveBg,
    borderColor: WOOD_THEME.cardBorder,
  },
  confirmBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 13.5,
    fontWeight: '800',
  },
  confirmBtnTextDisabled: {
    color: WOOD_THEME.inkMuted,
  },
});
