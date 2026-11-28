import {
  Canvas,
  Image as SkiaImage,
  Skia,
  type SkImage,
  useImage,
} from '@shopify/react-native-skia';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WOOD_THEME } from '@/components/town/wood-theme';
import {
  loadVillagerCreditReport,
  loadVillagerWalletCoins,
} from '@/game/credit-bank';
import { getEconomyItem } from '@/game/economy-engine';
import {
  type GameIconKey,
  ICON_ATLAS_FRAMES,
  ICON_ATLAS_HEIGHT,
  ICON_ATLAS_WIDTH,
  ICON_CELL_SIZE,
} from '@/game/icon-atlas';
import type {
  TownVillagerProfile,
  VillagerInventoryItem,
} from '@/game/town-villagers';
import {
  VILLAGER_ATLAS_HEIGHT,
  VILLAGER_ATLAS_WIDTH,
  VILLAGER_CELL_SIZE,
  VILLAGER_ROLE_LABEL,
  type VillagerRoleKey,
} from '@/game/villager-atlas';
import type { LiveVillagerOverlay } from '@/lib/anvil-live-sync';

interface VillagerFocusCardProps {
  readonly villager: TownVillagerProfile;
  readonly currentLocationLabel: string;
  readonly liveOverlay?: LiveVillagerOverlay;
  readonly inventoryItems: readonly VillagerInventoryItem[];
  readonly onOpenChat: () => void;
  readonly onOpenBank?: () => void;
  readonly onClose: () => void;
}

type CardViewMode = 'PROFILE' | 'POUCH';

function getRoleAccentColor(role: VillagerRoleKey): string {
  switch (role) {
    case 'hero':
      return '#2563EB';
    case 'mayor':
      return '#B45309';
    case 'police':
      return '#1D4ED8';
    case 'criminal':
      return '#B91C1C';
    case 'cultist':
      return '#6D28D9';
    case 'unemployed':
      return '#6B5B4B';
    case 'landlord':
      return '#9F1239';
    case 'banker':
      return '#0F766E';
    default:
      return '#7C4A21';
  }
}

function getCleanRoleTitle(role: VillagerRoleKey): string {
  if (role === 'mayor') {
    return 'Town Mayor';
  }

  return VILLAGER_ROLE_LABEL[role];
}

export function resolveVillagerItemIcon(label: string): GameIconKey {
  const clean = label.trim().toLowerCase();

  switch (clean) {
    case 'fish stew':
    case 'hot fish stew':
      return 'fishStew';
    case 'smoked fish':
      return 'smokedFish';
    case 'firewood':
    case 'split firewood':
      return 'firewood';
    case 'pine log':
    case 'pine logs':
      return 'pineLog';
    case 'pine planks':
      return 'pinePlanks';
    case 'lake trout':
    case 'frost trout':
      return 'lakeTrout';
    case 'frost carp':
      return 'frostCarp';
    case 'snow turnip':
      return 'snowTurnip';
    case 'maize':
    case 'maize cob':
      return 'maizeCob';
    case 'wheat':
    case 'wheat sheaf':
    case 'wheat sheaves':
      return 'wheatSheaf';
    case 'flour':
    case 'wheat flour':
    case 'flour sack':
    case 'grain sack':
      return 'flourSack';
    case 'artisan bread':
    case 'warm bread':
    case 'crusty bread':
    case 'stolen bread':
    case 'bread':
      return 'artisanBread';
    case 'yak milk':
      return 'yakMilk';
    case 'alpine cheese':
      return 'alpineCheese';
    case 'warmth tea':
      return 'warmthTea';
    case 'pine seeds':
    case 'pinecone seed':
      return 'seedPinecone';
    case 'iron nails':
      return 'ironNails';
    case 'steel axe':
      return 'battleAxe';
    case 'mallet':
      return 'builderHammer';
    case 'tax decree':
      return 'mayorCrown';
    case 'blueprints':
    case 'loan deeds':
    case 'land deeds':
      return 'ballotBox';
    case 'gold ledger':
      return 'goldIngot';
    case 'house keys':
      return 'forgeTongs';
    case 'brass lantern':
    case 'frost lantern':
      return 'iceCrystal';
    case 'watch whistle':
      return 'rallyHorn';
    case 'pilfered coins':
      return 'frostCoin';
    case 'ice relic':
      return 'ancientRelic';
    case 'travel bindle':
      return 'founderPouch';
    case 'raw stone':
      return 'rawStone';
    case 'coal chunk':
      return 'coalChunk';
    case 'copper ore':
      return 'copperOre';
    case 'iron ore':
      return 'ironOre';
    case 'iron ingot':
      return 'ironIngot';
    case 'silver ore':
      return 'silverOre';
    case 'gold ore':
      return 'goldOre';
    default:
      return 'founderPouch';
  }
}

function VillagerFaceAvatar({
  atlas,
  roleRow,
  size,
}: {
  readonly atlas: SkImage | null;
  readonly roleRow: number;
  readonly size: number;
}) {
  if (atlas === null) {
    return <View style={{ width: size, height: size }} />;
  }

  const scale = size / VILLAGER_CELL_SIZE;
  const clipRect = Skia.XYWHRect(0, 0, size, size);

  return (
    <Canvas style={{ width: size, height: size }}>
      <SkiaImage
        image={atlas}
        x={0}
        y={-roleRow * VILLAGER_CELL_SIZE * scale}
        width={VILLAGER_ATLAS_WIDTH * scale}
        height={VILLAGER_ATLAS_HEIGHT * scale}
        clip={clipRect}
      />
    </Canvas>
  );
}

function PouchAtlasIcon({
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

export function VillagerFocusCard({
  villager,
  currentLocationLabel,
  liveOverlay,
  inventoryItems,
  onOpenChat,
  onOpenBank,
  onClose,
}: VillagerFocusCardProps) {
  const [viewMode, setViewMode] = useState<CardViewMode>('PROFILE');

  const villagersAtlas = useImage(
    require('@/assets/villager-asset/compiled/villagers-atlas.webp')
  );

  const iconsAtlas = useImage(
    require('@/assets/resource-asset/compiled/icons-atlas.webp')
  );

  const accentColor = getRoleAccentColor(villager.role);
  const cleanTitle = getCleanRoleTitle(villager.role);

  const hasMatchingRolePersona =
    liveOverlay?.persona !== null &&
    liveOverlay?.persona !== undefined &&
    liveOverlay.persona.role === villager.role;

  const personalText =
    hasMatchingRolePersona && liveOverlay?.persona !== null
      ? liveOverlay.persona.backstory
      : villager.thought;

  const walletCoins = loadVillagerWalletCoins(
    villager,
    liveOverlay?.coinsAfter
  );

  const creditReport = loadVillagerCreditReport(
    villager,
    liveOverlay?.coinsAfter
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.card}>
        {viewMode === 'PROFILE' ? (
          <>
            <View style={styles.headerRow}>
              <View style={styles.avatarFrame}>
                <VillagerFaceAvatar
                  atlas={villagersAtlas}
                  roleRow={villager.roleRow}
                  size={52}
                />
              </View>

              <View style={styles.titleBlock}>
                <View style={styles.nameRow}>
                  <Text style={styles.nameText} numberOfLines={1}>
                    {villager.name}
                  </Text>
                  <View
                    style={[styles.roleBadge, { backgroundColor: accentColor }]}
                  >
                    <Text style={styles.roleBadgeText}>{cleanTitle}</Text>
                  </View>
                </View>
                <Text style={styles.subMeta} numberOfLines={1}>
                  {villager.archetype}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close citizen card"
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={10}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.personalText} numberOfLines={2}>
              {personalText}
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>WALLET</Text>
                <Text style={styles.statValue}>{walletCoins} FC</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>HOME</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {villager.homeLabel}
                </Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>HEADING TO</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {currentLocationLabel}
                </Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => {
                  setViewMode('POUCH');
                }}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.secondaryBtnText}>View Inventory</Text>
              </Pressable>

              {villager.role === 'banker' && onOpenBank !== undefined && (
                <Pressable
                  onPress={onOpenBank}
                  style={({ pressed }) => [
                    styles.bankBtn,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>Bank</Text>
                </Pressable>
              )}

              <Pressable
                onPress={onOpenChat}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text style={styles.primaryBtnText}>Chat</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.pouchHeader}>
              <View style={styles.pouchTitleRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to citizen profile"
                  onPress={() => {
                    setViewMode('PROFILE');
                  }}
                  style={styles.backBtn}
                  hitSlop={8}
                >
                  <Text style={styles.backBtnText}>←</Text>
                </Pressable>
                <PouchAtlasIcon
                  atlas={iconsAtlas}
                  iconKey="founderPouch"
                  size={24}
                />
                <Text style={styles.pouchHeaderTitle} numberOfLines={1}>
                  {villager.name}’s Pouch
                </Text>
                <View style={styles.coinMiniPill}>
                  <Text style={styles.coinMiniText}>{walletCoins} FC</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close NPC pouch"
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={10}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.creditBanner}>
              <Text style={styles.creditBannerText}>
                Credit Score {creditReport.score} ({creditReport.tier}) · Saved{' '}
                {creditReport.ledger.savingsFc} FC
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.pouchScrollFrame}
              contentContainerStyle={styles.pouchScrollBody}
            >
              {inventoryItems.length === 0 ? (
                <Text style={styles.emptyNotice}>
                  {villager.name}’s pouch is currently empty.
                </Text>
              ) : (
                inventoryItems.map((entry) => {
                  const iconKey = resolveVillagerItemIcon(entry.item);
                  const spec = getEconomyItem(iconKey);

                  const subtitle =
                    spec !== null && iconKey !== 'founderPouch'
                      ? `Tier ${spec.tier} · Value ${spec.npcSellPrice} FC`
                      : 'Personal Belonging';

                  return (
                    <View key={entry.item} style={styles.listRow}>
                      <View style={styles.itemThumb}>
                        <PouchAtlasIcon
                          atlas={iconsAtlas}
                          iconKey={iconKey}
                          size={36}
                        />
                      </View>
                      <View style={styles.flexOne}>
                        <Text style={styles.rowTitle}>
                          {entry.item} ×{entry.qty}
                        </Text>
                        <Text style={styles.rowSub}>{subtitle}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </>
        )}
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
  card: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: WOOD_THEME.sheetBg,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: WOOD_THEME.sheetBorder,
    padding: 15,
    gap: 11,
    shadowColor: '#2E1A0B',
    shadowOpacity: 0.26,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  avatarFrame: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: WOOD_THEME.cardBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  nameText: {
    color: WOOD_THEME.inkHeading,
    fontSize: 17,
    fontWeight: '900',
  },
  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  roleBadgeText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 10.5,
    fontWeight: '800',
  },
  subMeta: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: WOOD_THEME.closeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  personalText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12.5,
    lineHeight: 17.5,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCell: {
    flex: 1,
    backgroundColor: WOOD_THEME.cardBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 8,
    gap: 2,
  },
  statLabel: {
    color: WOOD_THEME.inkMuted,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statValue: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  bankBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.ctaWoodBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 12.5,
    fontWeight: '800',
  },
  btnPressed: {
    transform: [{ scale: 0.96 }],
  },
  pouchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  pouchTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  pouchHeaderTitle: {
    color: WOOD_THEME.inkHeading,
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
  coinMiniPill: {
    backgroundColor: WOOD_THEME.badgeGoldBg,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: WOOD_THEME.badgeGoldBorder,
  },
  coinMiniText: {
    color: WOOD_THEME.badgeGoldText,
    fontSize: 11,
    fontWeight: '800',
  },
  creditBanner: {
    backgroundColor: WOOD_THEME.sheetDeepBg,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  creditBannerText: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  pouchScrollFrame: {
    maxHeight: 280,
  },
  pouchScrollBody: {
    gap: 8,
    paddingBottom: 2,
  },
  emptyNotice: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: WOOD_THEME.cardBg,
    borderRadius: 14,
    padding: 9,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.cardMutedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexOne: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 13.5,
    fontWeight: '800',
  },
  rowSub: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
});
