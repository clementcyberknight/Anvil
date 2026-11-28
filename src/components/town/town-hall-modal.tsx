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

import { WOOD_THEME } from '@/components/town/wood-theme';
import { getPouchQty, type PouchEntry } from '@/game/economy-engine';
import {
  type GameIconKey,
  ICON_ATLAS_FRAMES,
  ICON_ATLAS_HEIGHT,
  ICON_ATLAS_WIDTH,
  ICON_CELL_SIZE,
} from '@/game/icon-atlas';
import { RIVAL_TOWNS, type RivalTownBlueprint } from '@/game/raid-engine';
import {
  ARMY_UNIT_SPECS,
  type ArmyUnitKey,
  canHoldSummerElection,
  computeProjectedApproval,
  type ElectionBallotResult,
  getRaidCommandRules,
  getTotalWarbandCount,
  getUnitTrainingCoinCost,
  OFFICE_HOLDER_META,
  pickRivalCandidate,
  type TownGovernanceState,
  type WinterPolicy,
} from '@/game/town-governance';
import type { Season } from '@/game/types';
import {
  RESIDENTIAL_COTTAGE_COST_FC,
  RESIDENTS_PER_RESIDENTIAL_BUILDING,
} from '@/game/valley-zones';
import {
  VILLAGER_ATLAS_HEIGHT,
  VILLAGER_ATLAS_WIDTH,
  VILLAGER_CELL_SIZE,
} from '@/game/villager-atlas';
import {
  backendItemToClientIcon,
  cancelInterTownOrder,
  type DirectoryTownSummary,
  fetchInterTownOrders,
  fetchTownsDirectory,
  fulfillInterTownOrder,
  type InterTownMarketOrder,
  loadStoredAccountMeta,
  postInterTownOrder,
} from '@/lib/anvil-live-sync';

interface TownHallModalProps {
  readonly visible: boolean;
  readonly season: Season;
  readonly seasonCycleNumber: number;
  readonly residentialCount: number;
  readonly populationCount: number;
  readonly populationCap: number;
  readonly coins: number;
  readonly pouchEntries: readonly PouchEntry[];
  readonly governance: TownGovernanceState;
  readonly lastElection: ElectionBallotResult | null;
  readonly initialTab?: TownHallTab;
  readonly liveConnected?: boolean;
  readonly activeTownId?: string;
  readonly lastSeq?: number;
  readonly outboxCount?: number;
  readonly onClose: () => void;
  readonly onChangeTaxRate: (delta: number) => void;
  readonly onChangeWinterPolicy: (policy: WinterPolicy) => void;
  readonly onBuildResidentialCottage: () => void;
  readonly onRunElection: () => void;
  readonly onDonateRelief: () => void;
  readonly onTrainUnit: (unitKey: ArmyUnitKey) => void;
  readonly onLaunchRaid: (town: RivalTownBlueprint) => void;
  readonly onSwitchVisitedTown?: (townId: string) => void;
  readonly onEscrowListed?: (itemId: GameIconKey, qty: number) => void;
  readonly onEscrowCancelledRefund?: (itemId: GameIconKey, qty: number) => void;
  readonly onEscrowPurchased?: (
    itemId: GameIconKey,
    qty: number,
    totalCostFc: number
  ) => void;
}

export type TownHallTab = 'POLICY' | 'ELECTION' | 'WAR_ROOM' | 'INTER_TOWN';

const WINTER_POLICIES: readonly {
  readonly key: WinterPolicy;
  readonly label: string;
  readonly hint: string;
}[] = [
  { key: 'FULL_CUSHION', label: 'Full Cushion', hint: '90% Winter subsidy · +16% Approval' },
  { key: 'TARGETED_ESSENTIALS', label: 'Essentials Only', hint: 'Fish Stew & Firewood · +8% Approval' },
  { key: 'MODERATE_RELIEF', label: 'Moderate Relief', hint: '35% cushion · Low Treasury drain' },
  { key: 'AUSTERITY', label: 'Austerity', hint: '0% subsidy · Citizens absorb 2× spike' },
];

function AtlasIcon({
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
  const clip = Skia.XYWHRect(0, 0, size, size);

  return (
    <Canvas style={{ width: size, height: size }}>
      <SkiaImage
        image={atlas}
        x={-frame.x * scale}
        y={-frame.y * scale}
        width={ICON_ATLAS_WIDTH * scale}
        height={ICON_ATLAS_HEIGHT * scale}
        clip={clip}
      />
    </Canvas>
  );
}

function YetiPortrait({
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
  const clip = Skia.XYWHRect(0, 0, size, size);

  return (
    <Canvas style={{ width: size, height: size }}>
      <SkiaImage
        image={atlas}
        x={0}
        y={-roleRow * VILLAGER_CELL_SIZE * scale}
        width={VILLAGER_ATLAS_WIDTH * scale}
        height={VILLAGER_ATLAS_HEIGHT * scale}
        clip={clip}
      />
    </Canvas>
  );
}

export function TownHallModal({
  visible,
  season,
  seasonCycleNumber,
  residentialCount,
  populationCount,
  populationCap,
  coins,
  pouchEntries,
  governance,
  lastElection,
  initialTab = 'POLICY',
  liveConnected = false,
  activeTownId = 'town_1',
  onClose,
  onChangeTaxRate,
  onChangeWinterPolicy,
  onBuildResidentialCottage,
  onRunElection,
  onDonateRelief,
  onTrainUnit,
  onLaunchRaid,
  onSwitchVisitedTown,
  onEscrowListed,
  onEscrowCancelledRefund,
  onEscrowPurchased,
}: TownHallModalProps) {
  const [activeTab, setActiveTab] = useState<TownHallTab>(initialTab);

  const [directoryTowns, setDirectoryTowns] = useState<DirectoryTownSummary[]>(
    []
  );

  const [marketOrders, setMarketOrders] = useState<InterTownMarketOrder[]>([]);
  const [isSyncLoading, setIsSyncLoading] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isMutatingOrder, setIsMutatingOrder] = useState<boolean>(false);

  const accountMeta = loadStoredAccountMeta();

  const refreshInterTownHub = async (): Promise<void> => {
    setIsSyncLoading(true);
    setSyncError(null);

    try {
      const [townsRes, ordersRes] = await Promise.all([
        fetchTownsDirectory(),
        fetchInterTownOrders(),
      ]);

      setDirectoryTowns(townsRes);
      setMarketOrders(ordersRes);
    } catch {
      setSyncError(
        'Backend unreachable — playing locally with MMKV Outbox protection.'
      );
    } finally {
      setIsSyncLoading(false);
    }
  };

  const iconsAtlas = useImage(
    require('@/assets/resource-asset/compiled/icons-atlas.webp')
  );

  const villagersAtlas = useImage(
    require('@/assets/villager-asset/compiled/villagers-atlas.webp')
  );

  const isPlayerMayor = governance.officeHolder === 'PLAYER';
  const holderMeta = OFFICE_HOLDER_META[governance.officeHolder];
  const rivalKey = pickRivalCandidate(governance);
  const rivalMeta = OFFICE_HOLDER_META[rivalKey];
  const commandRules = getRaidCommandRules(governance.officeHolder);
  const totalArmy = getTotalWarbandCount(governance.warband);
  const fishStewQty = getPouchQty(pouchEntries, 'fishStew');
  const firewoodQty = getPouchQty(pouchEntries, 'firewood');

  const liveApproval = isPlayerMayor
    ? computeProjectedApproval(governance, season)
    : governance.approvalPct;

  const canDonateRelief = fishStewQty >= 1 || firewoodQty >= 2;
  const canBuildCottage = coins >= RESIDENTIAL_COTTAGE_COST_FC;

  const electionWindow = canHoldSummerElection(
    season,
    seasonCycleNumber,
    governance.lastElectionCycle
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <AtlasIcon atlas={iconsAtlas} iconKey="mayorCrown" size={26} />
              <View>
                <Text style={styles.headerTitle}>Town Hall & War Room</Text>
                <Text style={styles.headerSub}>
                  {commandRules.modeLabel} · Authority #{governance.authorityRank}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            {(
              [
                { key: 'POLICY', label: 'Policy', icon: 'mayorCrown' },
                { key: 'ELECTION', label: 'Vote', icon: 'ballotBox' },
                { key: 'WAR_ROOM', label: 'War', icon: 'raidAxesShield' },
                { key: 'INTER_TOWN', label: 'World', icon: 'fishStew' },
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setActiveTab(tab.key);

                  if (tab.key === 'INTER_TOWN') {
                    void refreshInterTownHub();
                  }
                }}
                style={[
                  styles.tabBtn,
                  activeTab === tab.key && styles.tabBtnActive,
                ]}
              >
                <AtlasIcon atlas={iconsAtlas} iconKey={tab.icon} size={18} />
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.key && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {activeTab === 'POLICY' && (
              <>
                <View style={styles.incumbentCard}>
                  <View style={styles.portraitCircle}>
                    <YetiPortrait
                      atlas={villagersAtlas}
                      roleRow={holderMeta.roleRow}
                      size={56}
                    />
                  </View>
                  <View style={styles.flexOne}>
                    <Text style={styles.cardTitle}>{holderMeta.name}</Text>
                    <Text style={styles.cardSub}>{holderMeta.title}</Text>
                    <Text style={styles.metaLine}>
                      Treasury: {governance.townTreasuryFc} FC · Approval:{' '}
                      {liveApproval}%
                    </Text>
                  </View>
                </View>

                {isPlayerMayor ? (
                  <>
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>
                        TOWN BUSINESS TAX ({governance.taxRatePct}%)
                      </Text>
                      <Text style={styles.sectionHint}>
                        Fair taxes (6–11%) build approval. Taxes ≥14% trigger
                        Lord Sterling to challenge you!
                      </Text>
                      <View style={styles.stepperRow}>
                        <Pressable
                          onPress={() => {
                            onChangeTaxRate(-2);
                          }}
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>− 2%</Text>
                        </Pressable>
                        <Text style={styles.taxDisplay}>
                          {governance.taxRatePct}%
                        </Text>
                        <Pressable
                          onPress={() => {
                            onChangeTaxRate(2);
                          }}
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>+ 2%</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>
                        WINTER 2× SUBSIDY DECREE
                      </Text>
                      {WINTER_POLICIES.map((p) => (
                        <Pressable
                          key={p.key}
                          onPress={() => {
                            onChangeWinterPolicy(p.key);
                          }}
                          style={[
                            styles.policyRow,
                            governance.winterPolicy === p.key &&
                              styles.policyRowActive,
                          ]}
                        >
                          <Text style={styles.policyLabel}>{p.label}</Text>
                          <Text style={styles.policyHint}>{p.hint}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>
                        HOUSING & CITIZEN GROWTH ({populationCount}/{populationCap})
                      </Text>
                      <Text style={styles.sectionHint}>
                        Residential Buildings: {residentialCount}. Each new
                        Citizen Cottage adds +{RESIDENTS_PER_RESIDENTIAL_BUILDING}{' '}
                        new citizens to your town.
                      </Text>
                      <Pressable
                        disabled={!canBuildCottage}
                        onPress={onBuildResidentialCottage}
                        style={[
                          styles.primaryBtn,
                          !canBuildCottage && styles.btnDisabled,
                        ]}
                      >
                        <Text style={styles.primaryBtnText}>
                          Build Citizen Cottage ({RESIDENTIAL_COTTAGE_COST_FC}{' '}
                          FC → +{RESIDENTS_PER_RESIDENTIAL_BUILDING} Citizens)
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      OPPOSITION CAMPAIGN (AI MAYOR IN OFFICE)
                    </Text>
                    <Text style={styles.sectionHint}>
                      {holderMeta.name} sets taxes at {governance.taxRatePct}% (
                      {governance.winterPolicy}). You still command your private
                      Warband in the War Room — donate supplies or complete War
                      Bounties to reach 60% approval for a Snap Recall!
                    </Text>
                    <Pressable
                      disabled={!canDonateRelief}
                      onPress={onDonateRelief}
                      style={[
                        styles.primaryBtn,
                        !canDonateRelief && styles.btnDisabled,
                      ]}
                    >
                      <Text style={styles.primaryBtnText}>
                        Donate 1 Fish Stew / 2 Firewood (+10% Approval)
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {activeTab === 'ELECTION' && (
              <>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>
                    LIVE CITIZEN APPROVAL: {liveApproval}%
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${liveApproval}%`,
                          backgroundColor:
                            liveApproval >= 55 ? '#22C55E' : '#F59E0B',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.sectionHint}>
                    Current Sole Mayor: {holderMeta.name} · Top Challenger:{' '}
                    {rivalMeta.name}
                  </Text>
                  <Text style={styles.sectionHint}>
                    {electionWindow.allowed
                      ? 'Summer Election polls are open!'
                      : (electionWindow.reason ??
                        'Elections are held every Summer.')}
                  </Text>
                  <Pressable
                    disabled={!electionWindow.allowed}
                    onPress={onRunElection}
                    style={[
                      styles.primaryBtn,
                      !electionWindow.allowed && styles.btnDisabled,
                    ]}
                  >
                    <AtlasIcon
                      atlas={iconsAtlas}
                      iconKey="ballotBox"
                      size={20}
                    />
                    <Text style={styles.primaryBtnText}>
                      {electionWindow.allowed
                        ? 'Hold Summer Election Vote'
                        : season === 'WINTER'
                          ? 'Elections Open in Summer'
                          : 'Next Election Next Summer'}
                    </Text>
                  </Pressable>
                </View>

                {lastElection !== null && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      LAST BALLOT RESULT ({lastElection.playerVotes}–
                      {lastElection.rivalVotes})
                    </Text>
                    <Text style={styles.resultHeadline}>
                      {lastElection.headline}
                    </Text>
                    {lastElection.sampleQuotes.map((q) => (
                      <Text key={q} style={styles.quoteLine}>
                        • {q}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            )}

            {activeTab === 'WAR_ROOM' && (
              <>
                <View style={styles.sectionCard}>
                  <View style={styles.warHeaderRow}>
                    <Text style={styles.sectionTitle}>
                      YETI WARBAND ({totalArmy}/{commandRules.maxArmyCount})
                    </Text>
                    <Text style={styles.warCoins}>
                      {coins} FC · {fishStewQty} Stew
                    </Text>
                  </View>
                  <Text style={styles.sectionHint}>
                    {isPlayerMayor
                      ? 'Official Marshal: −25% Treasury gear subsidy · 80% personal loot / 20% Treasury tribute.'
                      : 'Privateer Warlord: Full private gear cost · 86% personal loot kept!'}
                  </Text>

                  {ARMY_UNIT_SPECS.map((u) => {
                    const slot = governance.warband.find(
                      (s) => s.unitKey === u.key
                    );

                    const count = slot !== undefined ? slot.count : 0;

                    const costFc = getUnitTrainingCoinCost(
                      u,
                      governance.officeHolder
                    );

                    const canAfford =
                      totalArmy < commandRules.maxArmyCount &&
                      coins >= costFc &&
                      fishStewQty >= u.fishStewCost;

                    return (
                      <View key={u.key} style={styles.unitRow}>
                        <View style={styles.unitIconBox}>
                          <YetiPortrait
                            atlas={villagersAtlas}
                            roleRow={u.roleRow}
                            size={40}
                          />
                        </View>
                        <View style={styles.flexOne}>
                          <Text style={styles.unitName}>
                            {u.name} ×{count}
                          </Text>
                          <Text style={styles.unitSub}>{u.roleSummary}</Text>
                        </View>
                        <Pressable
                          disabled={!canAfford}
                          onPress={() => {
                            onTrainUnit(u.key);
                          }}
                          style={[
                            styles.trainBtn,
                            !canAfford && styles.btnDisabled,
                          ]}
                        >
                          <Text style={styles.trainBtnText}>
                            +{costFc}FC
                            {u.fishStewCost > 0 ? ' +1🍲' : ''}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>
                    SCOUT & RAID RIVAL TOWNS (15% UNVAULTED LOOT)
                  </Text>
                  {RIVAL_TOWNS.map((town) => {
                    const isBounty =
                      !governance.activeBounty.completed &&
                      governance.activeBounty.targetTownId === town.id;

                    return (
                      <View key={town.id} style={styles.rivalCard}>
                        <View style={styles.flexOne}>
                          <View style={styles.rivalNameRow}>
                            <Text style={styles.unitName}>{town.name}</Text>
                            {isBounty && (
                              <View style={styles.bountyTag}>
                                <Text style={styles.bountyTagText}>
                                  BOUNTY +{governance.activeBounty.rewardCoins}
                                  FC
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.unitSub}>{town.subtitle}</Text>
                          <Text style={styles.lootLine}>
                            Loot Pool: ~{town.totalLootCoins} FC ·{' '}
                            {town.totalLootFish} Fish · {town.totalLootFirewood}{' '}
                            Firewood
                          </Text>
                        </View>
                        <Pressable
                          disabled={totalArmy <= 0}
                          onPress={() => {
                            onLaunchRaid(town);
                          }}
                          style={[
                            styles.raidBtn,
                            totalArmy <= 0 && styles.btnDisabled,
                          ]}
                        >
                          <AtlasIcon
                            atlas={iconsAtlas}
                            iconKey="raidAxesShield"
                            size={18}
                          />
                          <Text style={styles.raidBtnText}>Raid</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {activeTab === 'INTER_TOWN' && (
              <>
                <View style={styles.sectionCard}>
                  <View style={styles.warHeaderRow}>
                    <Text style={styles.sectionTitle}>
                      {liveConnected ? '🟢 VALLEY NETWORK' : '🟠 OFFLINE'}
                    </Text>
                    <Pressable
                      disabled={isSyncLoading}
                      onPress={() => {
                        void refreshInterTownHub();
                      }}
                      style={styles.trainBtn}
                    >
                      <Text style={styles.trainBtnText}>
                        {isSyncLoading ? 'Syncing…' : 'Refresh'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.sectionHint}>
                    {accountMeta.displayName} · Trade surplus goods with other
                    valleys or visit neighboring towns.
                  </Text>
                  {syncError !== null && (
                    <Text style={styles.syncWarnText}>{syncError}</Text>
                  )}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>
                    POST POUCH SURPLUS TO INTER-TOWN ESCROW
                  </Text>
                  <View style={styles.escrowQuickRow}>
                    <Pressable
                      disabled={firewoodQty < 2 || isMutatingOrder}
                      onPress={() => {
                        setIsMutatingOrder(true);
                        void postInterTownOrder('firewood', 2, 10)
                          .then((created) => {
                            onEscrowListed?.('firewood', 2);
                            setMarketOrders((prev) => [created, ...prev]);
                          })
                          .catch((err: Error) => {
                            setSyncError(err.message);
                          })
                          .finally(() => {
                            setIsMutatingOrder(false);
                          });
                      }}
                      style={[
                        styles.stepBtn,
                        styles.flexOneBtn,
                        (firewoodQty < 2 || isMutatingOrder) &&
                          styles.btnDisabled,
                      ]}
                    >
                      <Text style={styles.stepBtnText}>
                        List 2× Firewood (20 FC)
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={fishStewQty < 1 || isMutatingOrder}
                      onPress={() => {
                        setIsMutatingOrder(true);
                        void postInterTownOrder('fish_stew', 1, 24)
                          .then((created) => {
                            onEscrowListed?.('fishStew', 1);
                            setMarketOrders((prev) => [created, ...prev]);
                          })
                          .catch((err: Error) => {
                            setSyncError(err.message);
                          })
                          .finally(() => {
                            setIsMutatingOrder(false);
                          });
                      }}
                      style={[
                        styles.stepBtn,
                        styles.flexOneBtn,
                        (fishStewQty < 1 || isMutatingOrder) &&
                          styles.btnDisabled,
                      ]}
                    >
                      <Text style={styles.stepBtnText}>
                        List 1× Fish Stew (24 FC)
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>
                    OPEN INTER-TOWN ESCROW ORDERS ({marketOrders.length})
                  </Text>
                  {isSyncLoading && marketOrders.length === 0 ? (
                    <Text style={styles.sectionHint}>
                      Loading global valley order book…
                    </Text>
                  ) : marketOrders.length === 0 ? (
                    <Text style={styles.sectionHint}>
                      No open inter-town orders right now. List firewood or hot
                      stew above so Winter valleys can buy from you!
                    </Text>
                  ) : (
                    marketOrders.map((ord) => {
                      const isOwn =
                        ord.sellerAccountId === accountMeta.accountId;

                      const clientIcon = backendItemToClientIcon(ord.itemId);

                      const canBuy =
                        !isOwn &&
                        coins >= ord.totalPriceFc &&
                        !isMutatingOrder;

                      return (
                        <View key={ord.orderId} style={styles.unitRow}>
                          <View style={styles.unitIconBox}>
                            <AtlasIcon
                              atlas={iconsAtlas}
                              iconKey={clientIcon}
                              size={28}
                            />
                          </View>
                          <View style={styles.flexOne}>
                            <Text style={styles.unitName}>
                              {ord.itemName} ×{ord.qty} ({ord.totalPriceFc} FC)
                            </Text>
                            <Text style={styles.unitSub}>
                              {ord.sellerDisplayName} · {ord.sellerTownId}
                            </Text>
                          </View>
                          {isOwn ? (
                            <Pressable
                              disabled={isMutatingOrder}
                              onPress={() => {
                                setIsMutatingOrder(true);
                                void cancelInterTownOrder(ord.orderId)
                                  .then(() => {
                                    onEscrowCancelledRefund?.(
                                      clientIcon,
                                      ord.qty
                                    );
                                    setMarketOrders((prev) =>
                                      prev.filter(
                                        (x) => x.orderId !== ord.orderId
                                      )
                                    );
                                  })
                                  .catch((err: Error) => {
                                    setSyncError(err.message);
                                  })
                                  .finally(() => {
                                    setIsMutatingOrder(false);
                                  });
                              }}
                              style={styles.stepBtn}
                            >
                              <Text style={styles.trainBtnText}>Cancel</Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              disabled={!canBuy}
                              onPress={() => {
                                setIsMutatingOrder(true);
                                void fulfillInterTownOrder(ord.orderId)
                                  .then((res) => {
                                    onEscrowPurchased?.(
                                      clientIcon,
                                      res.order.qty,
                                      res.order.totalPriceFc
                                    );
                                    setMarketOrders((prev) =>
                                      prev.filter(
                                        (x) => x.orderId !== ord.orderId
                                      )
                                    );
                                  })
                                  .catch((err: Error) => {
                                    setSyncError(err.message);
                                  })
                                  .finally(() => {
                                    setIsMutatingOrder(false);
                                  });
                              }}
                              style={[
                                styles.trainBtn,
                                !canBuy && styles.btnDisabled,
                              ]}
                            >
                              <Text style={styles.trainBtnText}>
                                Buy {ord.totalPriceFc}FC
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>VISIT OTHER VALLEYS</Text>
                  {directoryTowns.length === 0 ? (
                    <Text style={styles.sectionHint}>
                      Tap Refresh when connected to browse active multiplayer
                      valleys.
                    </Text>
                  ) : (
                    directoryTowns.slice(0, 6).map((t) => {
                      const isCurrent = t.id === activeTownId;

                      return (
                        <View key={t.id} style={styles.rivalCard}>
                          <View style={styles.flexOne}>
                            <Text style={styles.unitName}>
                              {t.season === 'WINTER' ? '❄️' : '☀️'} {t.name}
                            </Text>
                            <Text style={styles.unitSub}>
                              Tax {Math.round(t.taxRatePct * 100)}% · Treasury{' '}
                              {t.treasuryFc} FC · Visitors {t.visitorCount}
                            </Text>
                          </View>
                          <Pressable
                            disabled={isCurrent}
                            onPress={() => {
                              onSwitchVisitedTown?.(t.id);
                              onClose();
                            }}
                            style={[
                              styles.trainBtn,
                              isCurrent && styles.btnDisabled,
                            ]}
                          >
                            <Text style={styles.trainBtnText}>
                              {isCurrent ? 'Here' : 'Visit'}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: WOOD_THEME.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    backgroundColor: WOOD_THEME.sheetBg,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: WOOD_THEME.sheetBorder,
    padding: 15,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: WOOD_THEME.inkHeading,
    fontSize: 17.5,
    fontWeight: '800',
  },
  headerSub: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: WOOD_THEME.closeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.tabInactiveBg,
  },
  tabBtnActive: {
    backgroundColor: WOOD_THEME.tabActiveBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.tabActiveBorder,
  },
  tabLabel: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: WOOD_THEME.inkPrimary,
    fontWeight: '800',
  },
  body: {
    gap: 12,
    paddingBottom: 8,
  },
  incumbentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: WOOD_THEME.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    padding: 12,
  },
  portraitCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: WOOD_THEME.cardMutedBg,
    borderWidth: 2,
    borderColor: WOOD_THEME.sheetInnerBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexOne: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 15.5,
    fontWeight: '800',
  },
  cardSub: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  metaLine: {
    color: WOOD_THEME.badgeGoldText,
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: WOOD_THEME.cardBg,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
  },
  sectionTitle: {
    color: WOOD_THEME.inkHeading,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHint: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
    lineHeight: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  stepBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
  },
  stepBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontWeight: '800',
    fontSize: 13,
  },
  taxDisplay: {
    color: WOOD_THEME.inkHeading,
    fontSize: 22,
    fontWeight: '900',
  },
  policyRow: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.cardMutedBg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  policyRowActive: {
    backgroundColor: WOOD_THEME.cardHighlightBg,
    borderColor: WOOD_THEME.sheetInnerBorder,
  },
  policyLabel: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  policyHint: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: WOOD_THEME.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.ctaGoldBorder,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  primaryBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  resultHeadline: {
    color: WOOD_THEME.inkHeading,
    fontSize: 13,
    fontWeight: '800',
  },
  quoteLine: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  warHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warCoins: {
    color: WOOD_THEME.badgeGoldText,
    fontSize: 12,
    fontWeight: '800',
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: WOOD_THEME.cardBorder,
  },
  unitIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.cardMutedBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  unitName: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  unitSub: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 10.5,
    fontWeight: '600',
  },
  trainBtn: {
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  trainBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  rivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: WOOD_THEME.cardMutedBg,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
  },
  rivalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bountyTag: {
    backgroundColor: WOOD_THEME.badgeGoldBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.badgeGoldBorder,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  bountyTagText: {
    color: WOOD_THEME.badgeGoldText,
    fontSize: 9.5,
    fontWeight: '800',
  },
  lootLine: {
    color: WOOD_THEME.inkHeading,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  raidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: WOOD_THEME.ctaDangerBg,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  raidBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  syncWarnText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  escrowQuickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flexOneBtn: {
    flex: 1,
    alignItems: 'center',
  },
});
