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
  VILLAGER_ATLAS_HEIGHT,
  VILLAGER_ATLAS_WIDTH,
  VILLAGER_CELL_SIZE,
} from '@/game/villager-atlas';

interface TownHallModalProps {
  readonly visible: boolean;
  readonly season: Season;
  readonly coins: number;
  readonly pouchEntries: readonly PouchEntry[];
  readonly governance: TownGovernanceState;
  readonly lastElection: ElectionBallotResult | null;
  readonly initialTab?: TownHallTab;
  readonly onClose: () => void;
  readonly onChangeTaxRate: (delta: number) => void;
  readonly onChangeWinterPolicy: (policy: WinterPolicy) => void;
  readonly onRunElection: () => void;
  readonly onDonateRelief: () => void;
  readonly onTrainUnit: (unitKey: ArmyUnitKey) => void;
  readonly onLaunchRaid: (town: RivalTownBlueprint) => void;
}

export type TownHallTab = 'POLICY' | 'ELECTION' | 'WAR_ROOM';

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
  coins,
  pouchEntries,
  governance,
  lastElection,
  initialTab = 'POLICY',
  onClose,
  onChangeTaxRate,
  onChangeWinterPolicy,
  onRunElection,
  onDonateRelief,
  onTrainUnit,
  onLaunchRaid,
}: TownHallModalProps) {
  const [activeTab, setActiveTab] = useState<TownHallTab>(initialTab);

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
                { key: 'POLICY', label: 'Mayor Policy', icon: 'mayorCrown' },
                { key: 'ELECTION', label: 'Election', icon: 'ballotBox' },
                { key: 'WAR_ROOM', label: 'War Room', icon: 'raidAxesShield' },
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setActiveTab(tab.key);
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
                    Top Challenger: {rivalMeta.name} ({rivalMeta.title})
                  </Text>
                  <Pressable onPress={onRunElection} style={styles.primaryBtn}>
                    <AtlasIcon
                      atlas={iconsAtlas}
                      iconKey="ballotBox"
                      size={20}
                    />
                    <Text style={styles.primaryBtnText}>
                      {isPlayerMayor
                        ? 'Hold Town Hall Election Vote'
                        : 'Trigger Snap Recall Election'}
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 10, 18, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    backgroundColor: '#0E1525',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#40A7FC',
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
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    color: '#C0CEF5',
    fontSize: 11.5,
    fontWeight: '600',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabBtnActive: {
    backgroundColor: '#40A7FC',
  },
  tabLabel: {
    color: '#C0CEF5',
    fontSize: 11.5,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#0A0A0A',
  },
  body: {
    gap: 12,
    paddingBottom: 8,
  },
  incumbentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(192, 206, 245, 0.1)',
    borderRadius: 16,
    padding: 12,
  },
  portraitCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(64, 167, 252, 0.25)',
    borderWidth: 2,
    borderColor: '#40A7FC',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexOne: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },
  cardSub: {
    color: '#C0CEF5',
    fontSize: 12,
    fontWeight: '600',
  },
  metaLine: {
    color: '#FDE68A',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(192, 206, 245, 0.16)',
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sectionHint: {
    color: '#94A3B8',
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
    backgroundColor: '#C0CEF5',
  },
  stepBtnText: {
    color: '#0A0A0A',
    fontWeight: '800',
    fontSize: 13,
  },
  taxDisplay: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  policyRow: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  policyRowActive: {
    backgroundColor: 'rgba(64, 167, 252, 0.2)',
    borderColor: '#40A7FC',
  },
  policyLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  policyHint: {
    color: '#C0CEF5',
    fontSize: 11,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    backgroundColor: '#40A7FC',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  resultHeadline: {
    color: '#FDE68A',
    fontSize: 13,
    fontWeight: '700',
  },
  quoteLine: {
    color: '#CBD5E1',
    fontSize: 11.5,
  },
  warHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warCoins: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '800',
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  unitIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(192,206,245,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  unitName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  unitSub: {
    color: '#94A3B8',
    fontSize: 10.5,
  },
  trainBtn: {
    backgroundColor: '#C0CEF5',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  trainBtnText: {
    color: '#0A0A0A',
    fontSize: 11,
    fontWeight: '800',
  },
  rivalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  rivalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bountyTag: {
    backgroundColor: '#D97706',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  bountyTagText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  lootLine: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  raidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF4444',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  raidBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
