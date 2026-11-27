import {
  Canvas,
  Image as SkiaImage,
  Skia,
  type SkImage,
  useImage,
} from '@shopify/react-native-skia';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { TownHallTab } from '@/components/town/town-hall-modal';
import { WOOD_THEME } from '@/components/town/wood-theme';
import {
  canCraftRecipe,
  CRAFT_RECIPES,
  CROP_DEFINITIONS,
  type CropKind,
  getEconomyItem,
  getPouchQty,
  type PouchEntry,
} from '@/game/economy-engine';
import {
  type GameIconKey,
  ICON_ATLAS_FRAMES,
  ICON_ATLAS_HEIGHT,
  ICON_ATLAS_WIDTH,
  ICON_CELL_SIZE,
} from '@/game/icon-atlas';
import type { SeasonalClockState } from '@/game/town-db';
import {
  computeProjectedApproval,
  getRaidCommandRules,
  getTotalWarbandCount,
  OFFICE_HOLDER_META,
  type TownGovernanceState,
} from '@/game/town-governance';
import {
  VILLAGER_ATLAS_HEIGHT,
  VILLAGER_ATLAS_WIDTH,
  VILLAGER_CELL_SIZE,
  VILLAGER_ROLE_ROW,
} from '@/game/villager-atlas';

export type HeldTool =
  | { readonly kind: 'HAND' }
  | { readonly kind: 'HOE' }
  | { readonly kind: 'SHOVEL' }
  | { readonly kind: 'BROOM' }
  | { readonly kind: 'SEED'; readonly seed: CropKind | 'pine' };

interface HeroPouchHudProps {
  readonly seasonalClock: SeasonalClockState;
  readonly coins: number;
  readonly pouchEntries: readonly PouchEntry[];
  readonly governance: TownGovernanceState;
  readonly heldTool: HeldTool;
  readonly citizenCount: number;
  readonly buildingCount: number;
  readonly walletShortAddress: string | null;
  readonly liveConnected: boolean;
  readonly visible: boolean;
  readonly onSelectHeldTool: (tool: HeldTool) => void;
  readonly onCraftRecipe: (recipeId: string) => void;
  readonly onSellItem: (itemId: GameIconKey) => void;
  readonly onBuySeed: (seedItemId: GameIconKey) => void;
  readonly onOpenTownHall: (tab: TownHallTab) => void;
  readonly onOpenWalletSettings: () => void;
}

type ActiveModal = 'NONE' | 'PROFILE' | 'POUCH';

type ProfileTab = 'FOUNDER' | 'SEASON' | 'STATS';

type PouchTab = 'ITEMS' | 'CRAFT' | 'SEEDS';

interface SeedChoiceOption {
  readonly seedKey: CropKind | 'pine';
  readonly seedItemId: GameIconKey;
  readonly label: string;
  readonly winterHardy: boolean;
  readonly hint: string;
}

const SEED_OPTIONS: readonly SeedChoiceOption[] = [
  {
    seedKey: 'turnip',
    seedItemId: 'seedTurnip',
    label: 'Snow Turnip',
    winterHardy: true,
    hint: 'Winter-hardy! Grows in 28s',
  },
  {
    seedKey: 'pine',
    seedItemId: 'seedPinecone',
    label: 'Pine Sapling',
    winterHardy: true,
    hint: 'All-season timber (24s)',
  },
  {
    seedKey: 'maize',
    seedItemId: 'seedMaize',
    label: 'Maize',
    winterHardy: false,
    hint: 'Summer crop (withers in Winter)',
  },
  {
    seedKey: 'wheat',
    seedItemId: 'seedWheat',
    label: 'Wheat',
    winterHardy: false,
    hint: 'Summer crop for Flour & Bread',
  },
  {
    seedKey: 'potato',
    seedItemId: 'seedPotato',
    label: 'Frost Potato',
    winterHardy: false,
    hint: 'Summer root crop (30s)',
  },
  {
    seedKey: 'pumpkin',
    seedItemId: 'seedPumpkin',
    label: 'Alpine Pumpkin',
    winterHardy: false,
    hint: 'High-value Summer crop (40s)',
  },
];

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function YetiAtlasPortrait({
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

function GameAtlasIcon({
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

interface HeldToolDisplay {
  readonly iconKey: GameIconKey;
  readonly pillLabel: string;
}

function resolveHeldToolDisplay(
  tool: HeldTool,
  pouchEntries: readonly PouchEntry[]
): HeldToolDisplay {
  if (tool.kind === 'HOE') {
    return { iconKey: 'copperHoe', pillLabel: 'Hoe' };
  }

  if (tool.kind === 'SHOVEL') {
    return { iconKey: 'ironShovel', pillLabel: 'Path' };
  }

  if (tool.kind === 'BROOM') {
    return { iconKey: 'clearBroom', pillLabel: 'Clear' };
  }

  if (tool.kind === 'SEED') {
    if (tool.seed === 'pine') {
      const qty = getPouchQty(pouchEntries, 'seedPinecone');

      return { iconKey: 'seedPinecone', pillLabel: `Pine ×${qty}` };
    }

    const def = CROP_DEFINITIONS[tool.seed];
    const qty = getPouchQty(pouchEntries, def.seedItemId);
    const shortName = def.name.split(' ')[0];

    return { iconKey: def.seedItemId, pillLabel: `${shortName} ×${qty}` };
  }

  return { iconKey: 'yetiHand', pillLabel: 'Hand' };
}

export function HeroPouchHud({
  seasonalClock,
  coins,
  pouchEntries,
  governance,
  heldTool,
  citizenCount,
  buildingCount,
  walletShortAddress,
  liveConnected,
  visible,
  onSelectHeldTool,
  onCraftRecipe,
  onSellItem,
  onBuySeed,
  onOpenTownHall,
  onOpenWalletSettings,
}: HeroPouchHudProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>('NONE');
  const [toolDrawerOpen, setToolDrawerOpen] = useState<boolean>(false);
  const [profileTab, setProfileTab] = useState<ProfileTab>('FOUNDER');
  const [pouchTab, setPouchTab] = useState<PouchTab>('ITEMS');

  const villagersAtlas = useImage(
    require('@/assets/villager-asset/compiled/villagers-atlas.webp')
  );

  const iconsAtlas = useImage(
    require('@/assets/resource-asset/compiled/icons-atlas.webp')
  );

  if (!visible) {
    return null;
  }

  const countdownLabel = formatCountdown(seasonalClock.remainingMs);
  const isFirstFreeze = seasonalClock.season === 'WINTER';
  const isPlayerMayor = governance.officeHolder === 'PLAYER';
  const holderMeta = OFFICE_HOLDER_META[governance.officeHolder];
  const commandRules = getRaidCommandRules(governance.officeHolder);
  const totalArmy = getTotalWarbandCount(governance.warband);

  const liveApproval = isPlayerMayor
    ? computeProjectedApproval(governance, seasonalClock.season)
    : governance.approvalPct;

  const heldDisplay = resolveHeldToolDisplay(heldTool, pouchEntries);

  const activeSeedLabel =
    heldTool.kind === 'SEED'
      ? heldTool.seed === 'pine'
        ? 'Pine Sapling'
        : CROP_DEFINITIONS[heldTool.seed].name
      : 'None (equip below)';

  return (
    <>
      {/* Top-Right Compact Settings & Sui Wallet Pill */}
      <View style={styles.topRightSettingsWrap} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Sui Wallet and Settings"
          onPress={() => {
            setToolDrawerOpen(false);
            onOpenWalletSettings();
          }}
          style={styles.walletSettingsPill}
        >
          <View
            style={[
              styles.walletLiveDot,
              liveConnected
                ? styles.walletLiveDotOnline
                : styles.walletLiveDotOffline,
            ]}
          />
          <Text style={styles.walletSettingsText}>
            {walletShortAddress !== null ? walletShortAddress : 'Wallet'} · ⚙
          </Text>
        </Pressable>
      </View>

      {/* Wooden Quick-Equip Tool & Seed Drawer popped open beside the Held-Item Floater */}
      {toolDrawerOpen && (
        <View style={styles.toolDrawerWrap} pointerEvents="box-none">
          <View style={styles.toolDrawer}>
            <View style={styles.toolDrawerHeader}>
              <Text style={styles.toolDrawerTitle}>Holding Tool</Text>
              <Pressable
                onPress={() => {
                  setToolDrawerOpen(false);
                }}
                style={styles.toolDrawerClose}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.toolGrid}>
              {(
                [
                  { kind: 'HAND', icon: 'yetiHand', label: 'Hand' },
                  { kind: 'HOE', icon: 'copperHoe', label: 'Hoe (Farm)' },
                  { kind: 'SHOVEL', icon: 'ironShovel', label: 'Shovel (Path)' },
                  { kind: 'BROOM', icon: 'clearBroom', label: 'Clear' },
                ] as const
              ).map((t) => {
                const active = heldTool.kind === t.kind;

                return (
                  <Pressable
                    key={t.kind}
                    onPress={() => {
                      onSelectHeldTool({ kind: t.kind });
                      setToolDrawerOpen(false);
                    }}
                    style={[
                      styles.toolChoiceBtn,
                      active && styles.toolChoiceActive,
                    ]}
                  >
                    <GameAtlasIcon
                      atlas={iconsAtlas}
                      iconKey={t.icon}
                      size={30}
                    />
                    <Text style={styles.toolChoiceText}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.toolSectionLabel}>PLANT SEEDS</Text>
            <View style={styles.seedChipRow}>
              {SEED_OPTIONS.map((opt) => {
                const qty = getPouchQty(pouchEntries, opt.seedItemId);

                const active =
                  heldTool.kind === 'SEED' && heldTool.seed === opt.seedKey;

                return (
                  <Pressable
                    key={opt.seedKey}
                    onPress={() => {
                      onSelectHeldTool({ kind: 'SEED', seed: opt.seedKey });
                      setToolDrawerOpen(false);
                    }}
                    style={[
                      styles.seedQuickChip,
                      active && styles.toolChoiceActive,
                    ]}
                  >
                    <GameAtlasIcon
                      atlas={iconsAtlas}
                      iconKey={opt.seedItemId}
                      size={24}
                    />
                    <Text style={styles.seedQuickText}>
                      {opt.label.split(' ')[0]} ×{qty}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Clean bottom-right floating dock: uniform Pouch-style wooden floaters */}
      <View style={styles.floatingDock} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Founder Yeti Profile"
          onPress={() => {
            setToolDrawerOpen(false);
            setActiveModal('PROFILE');
          }}
          style={styles.dockFloater}
        >
          <View style={styles.heroPortraitClip}>
            <YetiAtlasPortrait
              atlas={villagersAtlas}
              roleRow={VILLAGER_ROLE_ROW.hero}
              size={50}
            />
          </View>
          <View
            style={[
              styles.floatPill,
              !isPlayerMayor && styles.floatPillPrivateer,
            ]}
          >
            <Text
              style={[
                styles.floatPillText,
                !isPlayerMayor && styles.floatPillTextPrivateer,
              ]}
            >
              {isPlayerMayor ? 'Mayor' : 'Warlord'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Founder Pouch Inventory"
          onPress={() => {
            setToolDrawerOpen(false);
            setActiveModal('POUCH');
          }}
          style={styles.dockFloater}
        >
          <GameAtlasIcon atlas={iconsAtlas} iconKey="founderPouch" size={46} />
          <View style={styles.floatPill}>
            <Text style={styles.floatPillText}>{coins}</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Town Hall and War Room"
          onPress={() => {
            setToolDrawerOpen(false);
            onOpenTownHall('POLICY');
          }}
          style={styles.dockFloater}
        >
          <GameAtlasIcon
            atlas={iconsAtlas}
            iconKey={isPlayerMayor ? 'mayorCrown' : 'raidAxesShield'}
            size={42}
          />
          <View style={styles.floatPill}>
            <Text style={styles.floatPillText}>{totalArmy}</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch Held Tool or Seed"
          onPress={() => {
            setToolDrawerOpen((prev) => !prev);
          }}
          style={[
            styles.dockFloater,
            toolDrawerOpen && styles.dockFloaterActive,
          ]}
        >
          <GameAtlasIcon
            atlas={iconsAtlas}
            iconKey={heldDisplay.iconKey}
            size={42}
          />
          <View style={styles.floatPill}>
            <Text style={styles.floatPillText} numberOfLines={1}>
              {heldDisplay.pillLabel}
            </Text>
          </View>
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
                  Town Hall
                </Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.profileBody}
            >
              <View style={styles.identityCard}>
                <View style={styles.profileAvatarBox}>
                  <YetiAtlasPortrait
                    atlas={villagersAtlas}
                    roleRow={VILLAGER_ROLE_ROW.hero}
                    size={74}
                  />
                </View>
                <View style={styles.identityInfo}>
                  <Text style={styles.founderName}>Koda · Founder Yeti</Text>
                  <Text style={styles.founderSub}>
                    {commandRules.modeLabel} · Rank #{governance.authorityRank}
                  </Text>
                  <View style={styles.coinChip}>
                    <GameAtlasIcon
                      atlas={iconsAtlas}
                      iconKey="frostCoin"
                      size={18}
                    />
                    <Text style={styles.coinChipText}>
                      {coins} Frost Coins
                    </Text>
                  </View>
                </View>
              </View>

              {profileTab === 'FOUNDER' && (
                <View style={styles.rankGrid}>
                  <View style={styles.rankCard}>
                    <Text style={styles.rankLabel}>APPROVAL</Text>
                    <Text style={styles.rankValue}>{liveApproval}%</Text>
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
                    {isFirstFreeze ? 'DEAD WINTER (ACT I)' : 'SUMMER THAW'}
                  </Text>
                  <Text style={styles.seasonTimer}>
                    {countdownLabel} until{' '}
                    {seasonalClock.nextSeason === 'SUMMER'
                      ? 'First Great Thaw'
                      : 'Next Blizzard'}
                  </Text>
                  <Text style={styles.seasonDesc}>
                    {isFirstFreeze
                      ? 'Tap the Ice-Fishing Hole, Pine Deadfall, Mushrooms, and North Ridge Ore Veins. Plant Winter-hardy Snow Turnips on cleared soil — Maize & Wheat wait for Summer.'
                      : 'The mountain pass has thawed! Maize, Wheat, Potatoes, and Alpine Pumpkins thrive across cleared valley soil.'}
                  </Text>
                </View>
              )}

              {profileTab === 'STATS' && (
                <View style={styles.seasonCard}>
                  <Text style={styles.seasonBadge}>
                    INCUMBENT: {holderMeta.name.toUpperCase()}
                  </Text>
                  <Text style={styles.seasonTimer}>
                    {governance.townTreasuryFc} FC Treasury ·{' '}
                    {governance.taxRatePct}% Tax
                  </Text>
                  <Text style={styles.seasonDesc}>
                    Warband Ready: {totalArmy}/{commandRules.maxArmyCount} Yetis
                    · Raids Won: {governance.raidsWon}
                  </Text>
                </View>
              )}

              <View style={styles.quickActionRow}>
                <Pressable
                  onPress={() => {
                    setActiveModal('NONE');
                    onOpenTownHall('POLICY');
                  }}
                  style={styles.quickBtn}
                >
                  <GameAtlasIcon
                    atlas={iconsAtlas}
                    iconKey="mayorCrown"
                    size={18}
                  />
                  <Text style={styles.quickBtnText}>Town Hall</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setActiveModal('NONE');
                    onOpenTownHall('WAR_ROOM');
                  }}
                  style={[styles.quickBtn, styles.quickBtnWar]}
                >
                  <GameAtlasIcon
                    atlas={iconsAtlas}
                    iconKey="raidAxesShield"
                    size={18}
                  />
                  <Text style={styles.quickBtnWarText}>War Room</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => {
                  setActiveModal('NONE');
                  onOpenWalletSettings();
                }}
                style={styles.walletProfileBtn}
              >
                <Text style={styles.walletProfileBtnText}>
                  ⚙ Settings · Sui Wallet (
                  {walletShortAddress !== null ? walletShortAddress : 'Setup'})
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* INTERACTIVE FOUNDER POUCH: ITEMS+SELL / CRAFT / SEEDS */}
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
                <GameAtlasIcon
                  atlas={iconsAtlas}
                  iconKey="founderPouch"
                  size={24}
                />
                <Text style={styles.pouchHeaderTitle}>Founder Pouch</Text>
                <View style={styles.seasonMiniPill}>
                  <Text style={styles.seasonMiniText}>{coins} FC</Text>
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

            <View style={styles.tabRow}>
              {(
                [
                  { key: 'ITEMS', label: 'Items & Sell' },
                  { key: 'CRAFT', label: 'Craft' },
                  { key: 'SEEDS', label: 'Seeds' },
                ] as const
              ).map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => {
                    setPouchTab(t.key);
                  }}
                  style={[
                    styles.tabPill,
                    pouchTab === t.key && styles.tabPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabPillText,
                      pouchTab === t.key && styles.tabPillTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pouchScrollBody}
            >
              {pouchTab === 'ITEMS' && (
                <>
                  {pouchEntries.length === 0 ? (
                    <Text style={styles.emptyNotice}>
                      Pouch is empty — tap the Ice-Fishing Hole, Deadfall Logs,
                      or North Ridge Ore Veins to gather!
                    </Text>
                  ) : (
                    pouchEntries.map((entry) => {
                      const spec = getEconomyItem(entry.itemId);

                      if (spec === null) {
                        return null;
                      }

                      return (
                        <View key={entry.itemId} style={styles.listRow}>
                          <View style={styles.itemThumb}>
                            <GameAtlasIcon
                              atlas={iconsAtlas}
                              iconKey={entry.itemId}
                              size={36}
                            />
                          </View>
                          <View style={styles.flexOne}>
                            <Text style={styles.rowTitle}>
                              {spec.name} ×{entry.qty}
                            </Text>
                            <Text style={styles.rowSub}>
                              Tier {spec.tier} · Trade Bid {spec.npcSellPrice}{' '}
                              FC
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => {
                              onSellItem(entry.itemId);
                            }}
                            style={styles.sellBtn}
                          >
                            <Text style={styles.sellBtnText}>
                              Sell +{spec.npcSellPrice} FC
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </>
              )}

              {pouchTab === 'CRAFT' &&
                CRAFT_RECIPES.map((recipe) => {
                  const craftable = canCraftRecipe(pouchEntries, recipe);
                  const outSpec = getEconomyItem(recipe.outputItemId);

                  const ingSummary = recipe.ingredients
                    .map((ing) => {
                      const s = getEconomyItem(ing.itemId);
                      const have = getPouchQty(pouchEntries, ing.itemId);

                      return `${have}/${ing.qty} ${s !== null ? s.name : ing.itemId}`;
                    })
                    .join(' · ');

                  return (
                    <View key={recipe.id} style={styles.listRow}>
                      <View style={styles.itemThumb}>
                        <GameAtlasIcon
                          atlas={iconsAtlas}
                          iconKey={recipe.outputItemId}
                          size={36}
                        />
                      </View>
                      <View style={styles.flexOne}>
                        <Text style={styles.rowTitle}>
                          {recipe.name} ×{recipe.outputQty}
                        </Text>
                        <Text style={styles.rowSub}>{ingSummary}</Text>
                        <Text style={styles.rowStation}>
                          {recipe.stationLabel}
                          {outSpec !== null
                            ? ` · Sells ${outSpec.npcSellPrice} FC`
                            : ''}
                        </Text>
                      </View>
                      <Pressable
                        disabled={!craftable}
                        onPress={() => {
                          onCraftRecipe(recipe.id);
                        }}
                        style={[
                          styles.craftBtn,
                          !craftable && styles.btnDisabled,
                        ]}
                      >
                        <Text style={styles.craftBtnText}>Craft</Text>
                      </Pressable>
                    </View>
                  );
                })}

              {pouchTab === 'SEEDS' && (
                <>
                  <Text style={styles.seedBanner}>
                    Holding Seed: {activeSeedLabel}. Till 1×1 soil with the Hoe,
                    then tap tilled soil while holding a Seed!
                  </Text>
                  {SEED_OPTIONS.map((opt) => {
                    const spec = getEconomyItem(opt.seedItemId);
                    const qty = getPouchQty(pouchEntries, opt.seedItemId);
                    const buyPrice = spec !== null ? spec.npcBuyPrice : 5;

                    const isSelected =
                      heldTool.kind === 'SEED' && heldTool.seed === opt.seedKey;

                    return (
                      <View
                        key={opt.seedKey}
                        style={[
                          styles.listRow,
                          isSelected && styles.seedRowSelected,
                        ]}
                      >
                        <View style={styles.itemThumb}>
                          <GameAtlasIcon
                            atlas={iconsAtlas}
                            iconKey={opt.seedItemId}
                            size={36}
                          />
                        </View>
                        <View style={styles.flexOne}>
                          <Text style={styles.rowTitle}>
                            {opt.label} ({qty} owned)
                          </Text>
                          <Text style={styles.rowSub}>{opt.hint}</Text>
                        </View>
                        <View style={styles.seedActionCol}>
                          <Pressable
                            onPress={() => {
                              onSelectHeldTool({
                                kind: 'SEED',
                                seed: opt.seedKey,
                              });
                              setActiveModal('NONE');
                            }}
                            style={[
                              styles.selectSeedBtn,
                              isSelected && styles.selectSeedBtnActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.selectSeedText,
                                isSelected && styles.selectSeedTextActive,
                              ]}
                            >
                              {isSelected ? 'Holding' : 'Hold'}
                            </Text>
                          </Pressable>
                          <Pressable
                            disabled={coins < buyPrice}
                            onPress={() => {
                              onBuySeed(opt.seedItemId);
                            }}
                            style={[
                              styles.buySeedBtn,
                              coins < buyPrice && styles.btnDisabled,
                            ]}
                          >
                            <Text style={styles.buySeedText}>
                              Buy {buyPrice} FC
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>
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
    gap: 14,
  },
  dockFloater: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: WOOD_THEME.dockBg,
    borderWidth: 2,
    borderColor: WOOD_THEME.dockBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.38,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dockFloaterActive: {
    borderColor: WOOD_THEME.ctaGoldBg,
    borderWidth: 2.5,
  },
  toolDrawerWrap: {
    position: 'absolute',
    right: 84,
    bottom: 20,
    left: 14,
    alignItems: 'flex-end',
  },
  toolDrawer: {
    width: '100%',
    maxWidth: 276,
    backgroundColor: WOOD_THEME.sheetBg,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: WOOD_THEME.sheetBorder,
    padding: 12,
    gap: 8,
    shadowColor: '#2E1A0B',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  toolDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolDrawerTitle: {
    color: WOOD_THEME.inkHeading,
    fontSize: 14,
    fontWeight: '800',
  },
  toolDrawerClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.closeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  toolChoiceBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WOOD_THEME.cardBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  toolChoiceActive: {
    borderColor: WOOD_THEME.sheetInnerBorder,
    backgroundColor: WOOD_THEME.cardHighlightBg,
  },
  toolChoiceText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
  },
  toolSectionLabel: {
    color: WOOD_THEME.inkMuted,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  seedChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  seedQuickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WOOD_THEME.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  seedQuickText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  heroPortraitClip: {
    width: 52,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatPill: {
    position: 'absolute',
    bottom: -7,
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderRadius: 999,
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: WOOD_THEME.inkPrimary,
  },
  floatPillPrivateer: {
    backgroundColor: WOOD_THEME.ctaDangerBg,
  },
  floatPillText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 10,
    fontWeight: '900',
  },
  floatPillTextPrivateer: {
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: WOOD_THEME.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 24,
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
    gap: 6,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
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
    fontSize: 11.5,
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
    backgroundColor: WOOD_THEME.cardMutedBg,
    borderWidth: 2.5,
    borderColor: WOOD_THEME.sheetInnerBorder,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  quickActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.ctaGoldBorder,
    borderRadius: 12,
    paddingVertical: 11,
  },
  quickBtnWar: {
    backgroundColor: WOOD_THEME.ctaWoodBg,
    borderColor: WOOD_THEME.sheetBorder,
  },
  quickBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  quickBtnWarText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 13,
    fontWeight: '800',
  },
  pouchSheet: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '86%',
    backgroundColor: '#F5ECD8',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#8B5A2B',
    padding: 15,
    gap: 10,
  },
  pouchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pouchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pouchHeaderTitle: {
    color: '#4A2C14',
    fontSize: 17,
    fontWeight: '800',
  },
  seasonMiniPill: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  seasonMiniText: {
    color: '#78350F',
    fontSize: 11,
    fontWeight: '800',
  },
  pouchCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#8B4513',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pouchScrollBody: {
    gap: 8,
    paddingBottom: 6,
  },
  emptyNotice: {
    color: '#7A5434',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF9EC',
    borderRadius: 14,
    padding: 9,
    borderWidth: 1,
    borderColor: '#DEC9A4',
  },
  seedRowSelected: {
    borderColor: WOOD_THEME.sheetInnerBorder,
    borderWidth: 2,
    backgroundColor: WOOD_THEME.cardHighlightBg,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3E8D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexOne: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: '#2E1A0B',
    fontSize: 13.5,
    fontWeight: '800',
  },
  rowSub: {
    color: '#7C5836',
    fontSize: 11,
    fontWeight: '600',
  },
  rowStation: {
    color: WOOD_THEME.sheetBorder,
    fontSize: 10.5,
    fontWeight: '700',
  },
  sellBtn: {
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sellBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  craftBtn: {
    backgroundColor: WOOD_THEME.ctaGreenBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  craftBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  seedBanner: {
    color: WOOD_THEME.inkHeading,
    fontSize: 11.5,
    fontWeight: '700',
    backgroundColor: WOOD_THEME.badgeGoldBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 10,
    padding: 9,
  },
  seedActionCol: {
    gap: 5,
    alignItems: 'flex-end',
  },
  selectSeedBtn: {
    backgroundColor: WOOD_THEME.tabInactiveBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selectSeedBtnActive: {
    backgroundColor: WOOD_THEME.ctaWoodBg,
  },
  selectSeedText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 10.5,
    fontWeight: '800',
  },
  selectSeedTextActive: {
    color: WOOD_THEME.inkOnDark,
  },
  buySeedBtn: {
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  buySeedText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 10.5,
    fontWeight: '800',
  },
  topRightSettingsWrap: {
    position: 'absolute',
    top: 44,
    right: 14,
  },
  walletSettingsPill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: WOOD_THEME.dockBg,
    borderWidth: 2,
    borderColor: WOOD_THEME.dockBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  walletLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  walletLiveDotOnline: {
    backgroundColor: '#22C55E',
  },
  walletLiveDotOffline: {
    backgroundColor: '#F59E0B',
  },
  walletSettingsText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 11.5,
    fontWeight: '800',
  },
  walletProfileBtn: {
    minHeight: 44,
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  walletProfileBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
});
