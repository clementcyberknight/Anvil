import {
  Canvas,
  Image as SkiaImage,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SeasonalClockState } from '@/game/town-db';
import type { InventoryCounts } from '@/game/types';
import {
  VILLAGER_ATLAS_HEIGHT,
  VILLAGER_ATLAS_WIDTH,
  VILLAGER_CELL_SIZE,
  VILLAGER_ROLE_ROW,
} from '@/game/villager-atlas';

interface HeroPouchHudProps {
  readonly seasonalClock: SeasonalClockState;
  readonly inventory: InventoryCounts;
  readonly citizenCount: number;
  readonly buildingCount: number;
  readonly visible: boolean;
}

type ActiveModal = 'NONE' | 'PROFILE' | 'POUCH';

type ProfileTab = 'FOUNDER' | 'SEASON' | 'STATS';

interface PouchSlotItem {
  readonly id: string;
  readonly emoji: string;
  readonly label: string;
  readonly qty: number;
  readonly accent: string;
}

interface EquipmentSlotItem {
  readonly id: string;
  readonly emoji: string;
  readonly label: string;
  readonly equipped: boolean;
  readonly unlocked: boolean;
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function YetiAtlasPortrait({
  roleRow,
  size,
}: {
  readonly roleRow: number;
  readonly size: number;
}) {
  const atlas = useImage(
    require('@/assets/villager-asset/compiled/villagers-atlas.webp')
  );

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

export function HeroPouchHud({
  seasonalClock,
  inventory,
  citizenCount,
  buildingCount,
  visible,
}: HeroPouchHudProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>('NONE');
  const [profileTab, setProfileTab] = useState<ProfileTab>('FOUNDER');

  if (!visible) {
    return null;
  }

  const countdownLabel = formatCountdown(seasonalClock.remainingMs);
  const isFirstFreeze = seasonalClock.season === 'WINTER';

  const pouchItems: readonly (PouchSlotItem | null)[] = [
    {
      id: 'fish',
      emoji: '🐟',
      label: 'Lake Trout',
      qty: Math.max(4, inventory.fish),
      accent: '#E0F2FE',
    },
    {
      id: 'stew',
      emoji: '🍲',
      label: 'Fish Stew',
      qty: 2,
      accent: '#FEF3C7',
    },
    {
      id: 'firewood',
      emoji: '🪵',
      label: 'Firewood',
      qty: Math.max(6, inventory.firewood),
      accent: '#FFEDD5',
    },
    {
      id: 'logs',
      emoji: '🌲',
      label: 'Pine Logs',
      qty: Math.max(5, inventory.wood),
      accent: '#DCFCE7',
    },
    {
      id: 'coins',
      emoji: '🪙',
      label: 'Frost Coins',
      qty: inventory.coins,
      accent: '#FDE68A',
    },
    null,
    null,
    null,
  ];

  const equipmentItems: readonly (EquipmentSlotItem | null)[] = [
    {
      id: 'rod',
      emoji: '🎣',
      label: 'Fishing Rod',
      equipped: true,
      unlocked: true,
    },
    {
      id: 'axe',
      emoji: '🪓',
      label: 'Hatchet',
      equipped: true,
      unlocked: true,
    },
    {
      id: 'knife',
      emoji: '🔪',
      label: 'Fillet Knife',
      equipped: true,
      unlocked: true,
    },
    {
      id: 'coat',
      emoji: '🧥',
      label: 'Founder Coat',
      equipped: true,
      unlocked: true,
    },
    null,
    null,
    null,
    null,
  ];

  return (
    <>
      {/* Floating Main Character Portrait + Leather Pouch directly below it */}
      <View style={styles.floatingDock} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Founder Yeti Profile"
          onPress={() => {
            setActiveModal('PROFILE');
          }}
          style={styles.heroFrame}
        >
          <View style={styles.heroPortraitClip}>
            <YetiAtlasPortrait roleRow={VILLAGER_ROLE_ROW.hero} size={58} />
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>1</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Founder Pouch Inventory"
          onPress={() => {
            setActiveModal('POUCH');
          }}
          style={styles.pouchButton}
        >
          <View style={styles.pouchFlap} />
          <View style={styles.pouchBuckle} />
          <Text style={styles.pouchLabel}>POUCH</Text>
        </Pressable>
      </View>

      {/* FOUNDER PROFILE MODAL */}
      <Modal
        visible={activeModal === 'PROFILE'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setActiveModal('NONE');
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.profileSheet}>
            <View style={styles.profileHeader}>
              <Text style={styles.profileHeaderTitle}>Founder Profile</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close profile"
                onPress={() => {
                  setActiveModal('NONE');
                }}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.tabRow}>
              <Pressable
                onPress={() => {
                  setProfileTab('FOUNDER');
                }}
                style={[
                  styles.tabPill,
                  profileTab === 'FOUNDER' && styles.tabPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    profileTab === 'FOUNDER' && styles.tabPillTextActive,
                  ]}
                >
                  Founder
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setProfileTab('SEASON');
                }}
                style={[
                  styles.tabPill,
                  profileTab === 'SEASON' && styles.tabPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    profileTab === 'SEASON' && styles.tabPillTextActive,
                  ]}
                >
                  72h Season
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setProfileTab('STATS');
                }}
                style={[
                  styles.tabPill,
                  profileTab === 'STATS' && styles.tabPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    profileTab === 'STATS' && styles.tabPillTextActive,
                  ]}
                >
                  Valley Stats
                </Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.profileBody}
            >
              <View style={styles.identityCard}>
                <View style={styles.profileAvatarBox}>
                  <YetiAtlasPortrait roleRow={VILLAGER_ROLE_ROW.hero} size={74} />
                </View>
                <View style={styles.identityInfo}>
                  <Text style={styles.founderName}>Koda · Founder Yeti</Text>
                  <Text style={styles.founderSub}>
                    Frostpeak Valley · Act I Pioneer
                  </Text>
                  <View style={styles.coinChip}>
                    <Text style={styles.coinChipText}>
                      🪙 {inventory.coins} Frost Coins
                    </Text>
                  </View>
                </View>
              </View>

              {profileTab === 'FOUNDER' && (
                <View style={styles.rankGrid}>
                  <View style={styles.rankCard}>
                    <Text style={styles.rankLabel}>VALLEY RANK</Text>
                    <Text style={styles.rankValue}>Tier 1</Text>
                  </View>
                  <View style={styles.rankCard}>
                    <Text style={styles.rankLabel}>CITIZENS</Text>
                    <Text style={styles.rankValue}>{citizenCount}</Text>
                  </View>
                  <View style={styles.rankCard}>
                    <Text style={styles.rankLabel}>STRUCTURES</Text>
                    <Text style={styles.rankValue}>{buildingCount}</Text>
                  </View>
                </View>
              )}

              {profileTab === 'SEASON' && (
                <View style={styles.seasonCard}>
                  <Text style={styles.seasonBadge}>
                    {isFirstFreeze ? '❄️ DEAD WINTER (ACT I)' : '☀️ SUMMER THAW'}
                  </Text>
                  <Text style={styles.seasonTimer}>
                    {countdownLabel} until{' '}
                    {seasonalClock.nextSeason === 'SUMMER'
                      ? 'First Great Thaw'
                      : 'Next Blizzard'}
                  </Text>
                  <Text style={styles.seasonDesc}>
                    {isFirstFreeze
                      ? 'Mountain passes are snowed shut for 72 hours. No Maize or southern crops exist yet — survive on Ice-Hole Fish, Fish Stew, Firewood, and Timber.'
                      : 'The mountain pass has thawed! Southern caravans now bring Maize, Wheat, and Yaks for the next 72 hours.'}
                  </Text>
                </View>
              )}

              {profileTab === 'STATS' && (
                <View style={styles.seasonCard}>
                  <Text style={styles.seasonBadge}>🏛️ TOWN TREASURY</Text>
                  <Text style={styles.seasonTimer}>
                    {inventory.treasury} FC Vault
                  </Text>
                  <Text style={styles.seasonDesc}>
                    AI Mayor Barnaby taxes trade at 10% to fund Town Guards and
                    Winter essentials subsidies.
                  </Text>
                </View>
              )}

              <View style={styles.storyGuideRow}>
                <View style={styles.storyBubble}>
                  <Text style={styles.storyTitle}>
                    {isFirstFreeze ? 'ACT I · THE FIRST FREEZE' : 'ACT II · THE FIRST THAW'}
                  </Text>
                  <Text style={styles.storyText}>
                    {isFirstFreeze
                      ? 'Ground is frozen solid for 72h. Pull Lake Trout for cheap Fish Stew and chop Pine Logs so Hector can frame warm timber rooms.'
                      : 'Summer is here! Clear thawed soil and trade Smoked Fish for the valley’s very first Maize & Wheat seeds.'}
                  </Text>
                </View>
                <View style={styles.guideAvatar}>
                  <YetiAtlasPortrait roleRow={VILLAGER_ROLE_ROW.mayor} size={58} />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FOUNDER POUCH & EQUIPMENT MODAL */}
      <Modal
        visible={activeModal === 'POUCH'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setActiveModal('NONE');
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pouchSheet}>
            <View style={styles.pouchHeader}>
              <View style={styles.pouchTitleRow}>
                <Text style={styles.pouchHeaderTitle}>Founder Pouch</Text>
                <View style={styles.seasonMiniPill}>
                  <Text style={styles.seasonMiniText}>
                    {isFirstFreeze ? '❄️' : '☀️'} {countdownLabel}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close pouch"
                onPress={() => {
                  setActiveModal('NONE');
                }}
                style={styles.pouchCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.slotGrid}>
              {pouchItems.map((slot, index) => (
                <View
                  key={slot !== null ? slot.id : `empty_pouch_${index}`}
                  style={[
                    styles.itemSlot,
                    slot !== null && { backgroundColor: slot.accent },
                    slot === null && styles.emptySlot,
                  ]}
                >
                  {slot !== null && (
                    <>
                      <Text style={styles.slotEmoji}>{slot.emoji}</Text>
                      <Text style={styles.slotName} numberOfLines={1}>
                        {slot.label}
                      </Text>
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyBadgeText}>{slot.qty}</Text>
                      </View>
                    </>
                  )}
                </View>
              ))}
            </View>

            <Text style={styles.sectionHeading}>EQUIPMENT</Text>

            <View style={styles.slotGrid}>
              {equipmentItems.map((gear, index) => (
                <View
                  key={gear !== null ? gear.id : `empty_gear_${index}`}
                  style={[
                    styles.equipSlot,
                    gear === null && styles.emptySlot,
                  ]}
                >
                  {gear !== null && (
                    <>
                      {gear.equipped && <View style={styles.equippedCorner} />}
                      <Text style={styles.slotEmoji}>{gear.emoji}</Text>
                      <Text style={styles.equipName} numberOfLines={1}>
                        {gear.label}
                      </Text>
                    </>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.storyGuideRow}>
              <View style={styles.storyBubble}>
                <Text style={styles.storyTitle}>CHEAPEST WINTER SURVIVAL</Text>
                <Text style={styles.storyText}>
                  No Maize grows until the 72h Summer Thaw. Fish & hot Fish Stew
                  are your cheapest food to feed arriving Yetis and earn Frost
                  Coins.
                </Text>
              </View>
              <View style={styles.guideAvatar}>
                <YetiAtlasPortrait roleRow={VILLAGER_ROLE_ROW.mayor} size={56} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingDock: {
    position: 'absolute',
    right: 14,
    bottom: 20,
    alignItems: 'center',
    gap: 10,
  },
  heroFrame: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(10, 14, 24, 0.88)',
    borderWidth: 2.5,
    borderColor: '#40A7FC',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  heroPortraitClip: {
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(192, 206, 245, 0.22)',
  },
  levelBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0A0A0A',
    borderWidth: 1.5,
    borderColor: '#C0CEF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  pouchButton: {
    width: 58,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#A85D26',
    borderWidth: 2.5,
    borderColor: '#4A2511',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pouchFlap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 22,
    backgroundColor: '#C67432',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomWidth: 2,
    borderColor: '#5C2F16',
  },
  pouchBuckle: {
    position: 'absolute',
    top: 15,
    width: 14,
    height: 11,
    borderRadius: 3,
    backgroundColor: '#F5C451',
    borderWidth: 1.5,
    borderColor: '#5C2F16',
  },
  pouchLabel: {
    color: '#FFF7ED',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 10, 18, 0.68)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  profileSheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '86%',
    backgroundColor: '#F5ECD8',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#8B5A2B',
    padding: 16,
    gap: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileHeaderTitle: {
    color: '#4A2C14',
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E7D8BA',
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1.5,
    borderColor: '#C5923E',
  },
  tabPillText: {
    color: '#7A5434',
    fontSize: 12.5,
    fontWeight: '700',
  },
  tabPillTextActive: {
    color: '#3F230D',
  },
  profileBody: {
    gap: 12,
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF9EC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DEC9A4',
  },
  profileAvatarBox: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#DCEBFA',
    borderWidth: 2,
    borderColor: '#40A7FC',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: {
    flex: 1,
    gap: 4,
  },
  founderName: {
    color: '#2E1A0B',
    fontSize: 16,
    fontWeight: '800',
  },
  founderSub: {
    color: '#7C5836',
    fontSize: 12,
    fontWeight: '600',
  },
  coinChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  coinChipText: {
    color: '#78350F',
    fontSize: 12,
    fontWeight: '700',
  },
  rankGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  rankCard: {
    flex: 1,
    backgroundColor: '#FFF9EC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#DEC9A4',
  },
  rankLabel: {
    color: '#8C6746',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rankValue: {
    color: '#2E1A0B',
    fontSize: 17,
    fontWeight: '800',
  },
  seasonCard: {
    backgroundColor: '#FFF9EC',
    borderRadius: 14,
    padding: 13,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DEC9A4',
  },
  seasonBadge: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  seasonTimer: {
    color: '#2E1A0B',
    fontSize: 16,
    fontWeight: '800',
  },
  seasonDesc: {
    color: '#644428',
    fontSize: 12.5,
    lineHeight: 18,
  },
  pouchSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#3B2314',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#8B4A1E',
    padding: 15,
    gap: 12,
  },
  pouchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pouchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pouchHeaderTitle: {
    color: '#FFF7ED',
    fontSize: 17,
    fontWeight: '800',
  },
  seasonMiniPill: {
    backgroundColor: 'rgba(64, 167, 252, 0.24)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(192, 206, 245, 0.45)',
  },
  seasonMiniText: {
    color: '#E0F2FE',
    fontSize: 11,
    fontWeight: '700',
  },
  pouchCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6B3414',
    borderWidth: 1.5,
    borderColor: '#C67432',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemSlot: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C0CEF5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  equipSlot: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#1E1410',
    borderWidth: 2,
    borderColor: '#40A7FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    overflow: 'hidden',
  },
  emptySlot: {
    backgroundColor: '#26160D',
    borderColor: '#54331E',
  },
  equippedCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: '#22C55E',
    borderBottomLeftRadius: 8,
  },
  slotEmoji: {
    fontSize: 22,
  },
  slotName: {
    color: '#1E293B',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
  },
  equipName: {
    color: '#E2E8F0',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
  },
  qtyBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  qtyBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  sectionHeading: {
    color: '#E5C69E',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  storyGuideRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 2,
  },
  storyBubble: {
    flex: 1,
    backgroundColor: '#FFFDF7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#DEC9A4',
    gap: 3,
  },
  storyTitle: {
    color: '#9A3412',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  storyText: {
    color: '#334155',
    fontSize: 11.5,
    lineHeight: 16,
  },
  guideAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(192, 206, 245, 0.25)',
    borderWidth: 2,
    borderColor: '#F5C451',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
