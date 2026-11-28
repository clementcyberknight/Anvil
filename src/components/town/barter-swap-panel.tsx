import {
  Canvas,
  Image as SkiaImage,
  Skia,
  type SkImage,
  useImage,
} from '@shopify/react-native-skia';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { WOOD_THEME } from '@/components/town/wood-theme';
import {
  type GameIconKey,
  ICON_ATLAS_FRAMES,
  ICON_ATLAS_HEIGHT,
  ICON_ATLAS_WIDTH,
  ICON_CELL_SIZE,
} from '@/game/icon-atlas';

/** One tradable "token" in the swap: a pouch item or Frost Coins. */
export interface SwapAsset {
  readonly id: string;
  readonly kind: 'ITEM' | 'COINS';
  readonly label: string;
  readonly iconKey: GameIconKey;
  readonly available: number;
  readonly unitValueFc: number;
}

export interface SwapProposal {
  readonly give: SwapAsset;
  readonly giveQty: number;
  readonly receive: SwapAsset;
  readonly receiveQty: number;
  readonly giveValueFc: number;
  readonly receiveValueFc: number;
}

interface BarterSwapPanelProps {
  readonly villagerName: string;
  readonly playerAssets: readonly SwapAsset[];
  readonly villagerAssets: readonly SwapAsset[];
  readonly isSubmitting: boolean;
  readonly onPropose: (proposal: SwapProposal) => void;
}

type PickerSide = 'NONE' | 'GIVE' | 'RECEIVE';

function SwapAtlasIcon({
  atlas,
  iconKey,
  size,
}: {
  readonly atlas: SkImage | null;
  readonly iconKey: GameIconKey;
  readonly size: number;
}) {
  if (atlas === null) {
    return <View style={{ width: size, height: size }} />;
  }

  const frame = ICON_ATLAS_FRAMES[iconKey];
  const scale = size / ICON_CELL_SIZE;
  const clipRect = Skia.XYWHRect(0, 0, size, size);

  return (
    <Canvas style={{ width: size, height: size }}>
      <SkiaImage
        image={atlas}
        x={-frame.x * scale}
        y={-frame.y * scale}
        width={ICON_ATLAS_WIDTH * scale}
        height={ICON_ATLAS_HEIGHT * scale}
        clip={clipRect}
      />
    </Canvas>
  );
}

function clampQty(raw: number, available: number): number {
  if (!Number.isFinite(raw)) {
    return 0;
  }

  return Math.max(0, Math.min(available, Math.floor(raw)));
}

function findAsset(
  list: readonly SwapAsset[],
  id: string | null
): SwapAsset | null {
  if (id === null) {
    return null;
  }

  for (let i = 0; i < list.length; i += 1) {
    if (list[i].id === id) {
      return list[i];
    }
  }

  return null;
}

function SwapLeg({
  title,
  balanceLabel,
  asset,
  qty,
  atlas,
  pickerOpen,
  assets,
  onTogglePicker,
  onSelectAsset,
  onChangeQty,
}: {
  readonly title: string;
  readonly balanceLabel: string;
  readonly asset: SwapAsset | null;
  readonly qty: number;
  readonly atlas: SkImage | null;
  readonly pickerOpen: boolean;
  readonly assets: readonly SwapAsset[];
  readonly onTogglePicker: () => void;
  readonly onSelectAsset: (id: string) => void;
  readonly onChangeQty: (next: number) => void;
}) {
  const available = asset?.available ?? 0;
  const valueFc = asset !== null ? Math.round(asset.unitValueFc * qty) : 0;

  return (
    <View style={styles.legCard}>
      <View style={styles.legHeaderRow}>
        <Text style={styles.legTitle}>{title}</Text>
        <Text style={styles.legBalance} numberOfLines={1}>
          {asset !== null ? `${balanceLabel}: ${available}` : balanceLabel}
        </Text>
      </View>

      <View style={styles.legMainRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose what ${title.toLowerCase()}`}
          onPress={onTogglePicker}
          style={({ pressed }) => [
            styles.tokenPill,
            pickerOpen && styles.tokenPillOpen,
            pressed && styles.pressed,
          ]}
        >
          {asset !== null ? (
            <SwapAtlasIcon atlas={atlas} iconKey={asset.iconKey} size={26} />
          ) : null}
          <Text style={styles.tokenPillText} numberOfLines={1}>
            {asset !== null ? asset.label : 'Select'}
          </Text>
          <Text style={styles.tokenChevron}>{pickerOpen ? '▴' : '▾'}</Text>
        </Pressable>

        <View style={styles.qtyCluster}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease amount"
            disabled={asset === null || qty <= 0}
            onPress={() => {
              onChangeQty(qty - 1);
            }}
            style={[styles.stepBtn, (asset === null || qty <= 0) && styles.disabled]}
            hitSlop={6}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </Pressable>
          <TextInput
            value={String(qty)}
            editable={asset !== null}
            keyboardType="number-pad"
            selectTextOnFocus
            onChangeText={(text) => {
              const digits = text.replace(/[^0-9]/g, '');

              onChangeQty(digits.length === 0 ? 0 : Number(digits));
            }}
            style={styles.qtyInput}
            maxLength={6}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase amount"
            disabled={asset === null || qty >= available}
            onPress={() => {
              onChangeQty(qty + 1);
            }}
            style={[
              styles.stepBtn,
              (asset === null || qty >= available) && styles.disabled,
            ]}
            hitSlop={6}
          >
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.legFooterRow}>
        <Text style={styles.valueText}>≈ {valueFc} FC</Text>
        {asset !== null && available > 0 && (
          <Pressable
            onPress={() => {
              onChangeQty(available);
            }}
            hitSlop={6}
          >
            <Text style={styles.maxText}>MAX</Text>
          </Pressable>
        )}
      </View>

      {pickerOpen && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickerRow}
          keyboardShouldPersistTaps="handled"
        >
          {assets.length === 0 ? (
            <Text style={styles.emptyPickerText}>Nothing to trade</Text>
          ) : (
            assets.map((a) => {
              const active = asset !== null && asset.id === a.id;

              return (
                <Pressable
                  key={a.id}
                  onPress={() => {
                    onSelectAsset(a.id);
                  }}
                  style={[styles.pickerChip, active && styles.pickerChipActive]}
                >
                  <SwapAtlasIcon atlas={atlas} iconKey={a.iconKey} size={22} />
                  <Text style={styles.pickerChipText} numberOfLines={1}>
                    {a.label} ×{a.available}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

export function BarterSwapPanel({
  villagerName,
  playerAssets,
  villagerAssets,
  isSubmitting,
  onPropose,
}: BarterSwapPanelProps) {
  const iconsAtlas = useImage(
    require('@/assets/resource-asset/compiled/icons-atlas.webp')
  );

  const [giveId, setGiveId] = useState<string | null>(
    () => playerAssets[0]?.id ?? null
  );

  const [receiveId, setReceiveId] = useState<string | null>(
    () => villagerAssets[0]?.id ?? null
  );

  const [giveQty, setGiveQty] = useState<number>(() =>
    playerAssets.length > 0 ? 1 : 0
  );

  const [receiveQty, setReceiveQty] = useState<number>(() =>
    villagerAssets.length > 0 ? 1 : 0
  );

  const [pickerSide, setPickerSide] = useState<PickerSide>('NONE');

  const giveAsset = findAsset(playerAssets, giveId);
  const receiveAsset = findAsset(villagerAssets, receiveId);
  const safeGiveQty = giveAsset !== null ? clampQty(giveQty, giveAsset.available) : 0;

  const safeReceiveQty =
    receiveAsset !== null ? clampQty(receiveQty, receiveAsset.available) : 0;

  const giveValueFc =
    giveAsset !== null ? Math.round(giveAsset.unitValueFc * safeGiveQty) : 0;

  const receiveValueFc =
    receiveAsset !== null
      ? Math.round(receiveAsset.unitValueFc * safeReceiveQty)
      : 0;

  const bothCoins =
    giveAsset !== null &&
    receiveAsset !== null &&
    giveAsset.kind === 'COINS' &&
    receiveAsset.kind === 'COINS';

  const canPropose =
    !isSubmitting &&
    giveAsset !== null &&
    receiveAsset !== null &&
    safeGiveQty > 0 &&
    safeReceiveQty > 0 &&
    !bothCoins;

  const fairnessPct =
    receiveValueFc > 0 ? Math.round((giveValueFc / receiveValueFc) * 100) : 0;

  const fairnessLabel =
    receiveValueFc <= 0
      ? ''
      : fairnessPct >= 100
        ? 'Generous offer'
        : fairnessPct >= 85
          ? 'Fair offer'
          : 'Lowball — may be declined';

  const swapSides = (): void => {
    // Sides are owned by different parties, so "flip" maps each asset to its counterpart by label.
    const nextGive =
      receiveAsset !== null
        ? (playerAssets.find((a) => a.label === receiveAsset.label) ?? null)
        : null;

    const nextReceive =
      giveAsset !== null
        ? (villagerAssets.find((a) => a.label === giveAsset.label) ?? null)
        : null;

    if (nextGive !== null) {
      setGiveId(nextGive.id);
      setGiveQty(Math.min(nextGive.available, Math.max(1, safeReceiveQty)));
    }

    if (nextReceive !== null) {
      setReceiveId(nextReceive.id);
      setReceiveQty(Math.min(nextReceive.available, Math.max(1, safeGiveQty)));
    }

    setPickerSide('NONE');
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.panelLabel}>SWAP WITH {villagerName.toUpperCase()}</Text>

      <SwapLeg
        title="You give"
        balanceLabel="You have"
        asset={giveAsset}
        qty={safeGiveQty}
        atlas={iconsAtlas}
        pickerOpen={pickerSide === 'GIVE'}
        assets={playerAssets}
        onTogglePicker={() => {
          setPickerSide((prev) => (prev === 'GIVE' ? 'NONE' : 'GIVE'));
        }}
        onSelectAsset={(id) => {
          const picked = findAsset(playerAssets, id);

          setGiveId(id);
          setGiveQty(picked !== null && picked.available > 0 ? 1 : 0);
          setPickerSide('NONE');
        }}
        onChangeQty={(next) => {
          setGiveQty(clampQty(next, giveAsset?.available ?? 0));
        }}
      />

      <View style={styles.flipRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Flip swap direction"
          onPress={swapSides}
          style={({ pressed }) => [styles.flipBtn, pressed && styles.pressed]}
          hitSlop={8}
        >
          <Text style={styles.flipBtnText}>⇅</Text>
        </Pressable>
      </View>

      <SwapLeg
        title="You receive"
        balanceLabel={`${villagerName} has`}
        asset={receiveAsset}
        qty={safeReceiveQty}
        atlas={iconsAtlas}
        pickerOpen={pickerSide === 'RECEIVE'}
        assets={villagerAssets}
        onTogglePicker={() => {
          setPickerSide((prev) => (prev === 'RECEIVE' ? 'NONE' : 'RECEIVE'));
        }}
        onSelectAsset={(id) => {
          const picked = findAsset(villagerAssets, id);

          setReceiveId(id);
          setReceiveQty(picked !== null && picked.available > 0 ? 1 : 0);
          setPickerSide('NONE');
        }}
        onChangeQty={(next) => {
          setReceiveQty(clampQty(next, receiveAsset?.available ?? 0));
        }}
      />

      {receiveValueFc > 0 && giveValueFc > 0 && (
        <View style={styles.rateRow}>
          <Text style={styles.rateText} numberOfLines={1}>
            {giveValueFc} FC ⇄ {receiveValueFc} FC
          </Text>
          <Text
            style={[
              styles.fairnessText,
              fairnessPct < 85 && styles.fairnessLow,
            ]}
          >
            {fairnessLabel}
          </Text>
        </View>
      )}

      {bothCoins && (
        <Text style={styles.warnText}>Pick at least one item to swap.</Text>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={!canPropose}
        onPress={() => {
          if (giveAsset === null || receiveAsset === null) {
            return;
          }

          onPropose({
            give: giveAsset,
            giveQty: safeGiveQty,
            receive: receiveAsset,
            receiveQty: safeReceiveQty,
            giveValueFc,
            receiveValueFc,
          });
        }}
        style={({ pressed }) => [
          styles.proposeBtn,
          !canPropose && styles.disabled,
          pressed && canPropose && styles.pressed,
        ]}
      >
        <Text style={styles.proposeBtnText}>
          {isSubmitting ? `${villagerName} is reviewing…` : 'Propose Swap'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: WOOD_THEME.cardBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  panelLabel: {
    color: WOOD_THEME.inkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  legCard: {
    backgroundColor: WOOD_THEME.sheetBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  legHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  legTitle: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  legBalance: {
    color: WOOD_THEME.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  legMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenPill: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WOOD_THEME.cardBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 999,
    paddingLeft: 6,
    paddingRight: 10,
  },
  tokenPillOpen: {
    borderColor: WOOD_THEME.tabActiveBorder,
  },
  tokenPillText: {
    flex: 1,
    color: WOOD_THEME.inkPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  tokenChevron: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  qtyCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  qtyInput: {
    minWidth: 46,
    height: 36,
    textAlign: 'center',
    color: WOOD_THEME.inkHeading,
    fontSize: 17,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  legFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueText: {
    color: WOOD_THEME.inkMuted,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  maxText: {
    color: WOOD_THEME.badgeGoldText,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pickerRow: {
    gap: 6,
    paddingVertical: 2,
  },
  pickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    backgroundColor: WOOD_THEME.cardBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 999,
    paddingLeft: 5,
    paddingRight: 10,
  },
  pickerChipActive: {
    backgroundColor: WOOD_THEME.tabActiveBg,
    borderColor: WOOD_THEME.tabActiveBorder,
  },
  pickerChipText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  emptyPickerText: {
    color: WOOD_THEME.inkMuted,
    fontSize: 11.5,
    paddingVertical: 8,
  },
  flipRow: {
    alignItems: 'center',
    marginVertical: -12,
    zIndex: 2,
  },
  flipBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WOOD_THEME.ctaWoodBg,
    borderWidth: 3,
    borderColor: WOOD_THEME.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipBtnText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 15,
    fontWeight: '900',
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: 8,
  },
  rateText: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  fairnessText: {
    color: WOOD_THEME.ctaGreenBg,
    fontSize: 11,
    fontWeight: '800',
  },
  fairnessLow: {
    color: WOOD_THEME.ctaDangerBg,
  },
  warnText: {
    color: WOOD_THEME.ctaDangerBg,
    fontSize: 11.5,
    fontWeight: '700',
  },
  proposeBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.ctaGoldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposeBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
