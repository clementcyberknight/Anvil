import {
  Canvas,
  Circle,
  Fill,
  Group,
  Image as SkiaImage,
  Rect,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  computeRaidOutcomeSummary,
  createRaidBattleState,
  deployRaidUnit,
  RAID_ARENA_HEIGHT,
  RAID_ARENA_WIDTH,
  type RaidBattleState,
  type RaidOutcomeSummary,
  type RivalTownBlueprint,
  stepRaidBattle,
  type TacticalOrderKey,
  triggerTacticalOrder,
} from '@/game/raid-engine';
import { TOWN_ATLAS_FRAMES, TOWN_ATLAS_HEIGHT, TOWN_ATLAS_WIDTH } from '@/game/town-atlas';
import {
  ARMY_UNIT_SPECS,
  type ArmyUnitKey,
  type OfficeHolder,
  type WarbandSlot,
} from '@/game/town-governance';
import {
  VILLAGER_ATLAS_HEIGHT,
  VILLAGER_ATLAS_WIDTH,
  VILLAGER_CELL_SIZE,
  VILLAGER_FRAMES_PER_DIR,
} from '@/game/villager-atlas';

interface RivalRaidScreenProps {
  readonly town: RivalTownBlueprint;
  readonly warband: readonly WarbandSlot[];
  readonly officeHolder: OfficeHolder;
  readonly onFinishRaid: (summary: RaidOutcomeSummary) => void;
  readonly onRetreat: () => void;
}

const TACTICAL_ORDERS: readonly {
  readonly key: TacticalOrderKey;
  readonly label: string;
}[] = [
  { key: 'rallyHorn', label: 'Rally Horn (+30% DPS)' },
  { key: 'fishStewDrop', label: 'Stew Drop (+38% HP)' },
  { key: 'frostMistPotion', label: 'Frost Veil (5s Cloak)' },
];

export function RivalRaidScreen({
  town,
  warband,
  officeHolder,
  onFinishRaid,
  onRetreat,
}: RivalRaidScreenProps) {
  const { width, height } = useWindowDimensions();

  const townAtlas = useImage(
    require('@/assets/game_asset/compiled/town-atlas.webp')
  );

  const villagersAtlas = useImage(
    require('@/assets/villager-asset/compiled/villagers-atlas.webp')
  );

  const [battle, setBattle] = useState<RaidBattleState>(() =>
    createRaidBattleState(town, warband, officeHolder)
  );

  const [selectedUnit, setSelectedUnit] = useState<ArmyUnitKey>(() => {
    const firstAvailable = warband.find((s) => s.count > 0);

    return firstAvailable !== undefined ? firstAvailable.unitKey : 'shieldguard';
  });

  const isBattleRunning = !battle.finished;

  useEffect(() => {
    if (!isBattleRunning) {
      return;
    }

    const interval = setInterval(() => {
      setBattle((prev) => stepRaidBattle(prev, 0.05));
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [isBattleRunning]);

  const arenaHeightPx = Math.max(360, height - 210);
  const scale = Math.min(width / RAID_ARENA_WIDTH, arenaHeightPx / RAID_ARENA_HEIGHT);
  const offsetX = (width - RAID_ARENA_WIDTH * scale) * 0.5;
  const offsetY = (arenaHeightPx - RAID_ARENA_HEIGHT * scale) * 0.5;

  const outcome = battle.finished ? computeRaidOutcomeSummary(battle) : null;

  return (
    <Modal visible transparent={false} animationType="slide">
      <View style={styles.root}>
        {/* Top Raid HUD */}
        <View style={styles.topHud}>
          <View>
            <Text style={styles.townName}>{battle.town.name}</Text>
            <Text style={styles.subText}>
              {battle.destructionPct}% Destroyed · {'★'.repeat(battle.stars)}
              {'☆'.repeat(3 - battle.stars)}
            </Text>
          </View>
          <View style={styles.timerBox}>
            <Text style={styles.timerText}>
              {Math.ceil(battle.remainingSec)}s
            </Text>
            <Text style={styles.lootText}>+{battle.seizedCoins} FC</Text>
          </View>
          <Pressable onPress={onRetreat} style={styles.retreatBtn}>
            <Text style={styles.retreatText}>Retreat</Text>
          </Pressable>
        </View>

        {/* Interactive Skia Raid Arena */}
        <Pressable
          style={[styles.arenaTouch, { height: arenaHeightPx }]}
          onPress={(ev) => {
            if (battle.finished) {
              return;
            }

            const worldX = (ev.nativeEvent.locationX - offsetX) / scale;
            const worldY = (ev.nativeEvent.locationY - offsetY) / scale;

            setBattle((prev) =>
              deployRaidUnit(prev, selectedUnit, worldX, worldY)
            );
          }}
        >
          <Canvas style={styles.canvas}>
            <Fill color="#DCEBFF" />
            <Group
              transform={[
                { translateX: offsetX },
                { translateY: offsetY },
                { scale },
              ]}
            >
              {/* Deployable Snow Perimeter Highlight */}
              <Rect
                x={24}
                y={24}
                width={RAID_ARENA_WIDTH - 48}
                height={RAID_ARENA_HEIGHT - 48}
                color="rgba(64, 167, 252, 0.08)"
              />

              {/* Rival Buildings (flip to constructionScaffold when HP hits 0!) */}
              {townAtlas !== null &&
                battle.buildings.map((bld) => {
                  const key =
                    bld.hp <= 0 ? 'constructionScaffold' : bld.spriteKey;

                  const frame = TOWN_ATLAS_FRAMES[key];
                  const drawScale = bld.drawWidth / frame.width;
                  const drawH = frame.height * drawScale;
                  const dstX = bld.x - bld.drawWidth * frame.anchorX;
                  const dstY = bld.y - drawH * frame.anchorY;
                  const hpRatio = Math.max(0, bld.hp / bld.maxHp);

                  return (
                    <Group key={bld.id}>
                      <SkiaImage
                        image={townAtlas}
                        x={dstX - frame.x * drawScale}
                        y={dstY - frame.y * drawScale}
                        width={TOWN_ATLAS_WIDTH * drawScale}
                        height={TOWN_ATLAS_HEIGHT * drawScale}
                        clip={Skia.XYWHRect(dstX, dstY, bld.drawWidth, drawH)}
                      />
                      {bld.hp > 0 && (
                        <>
                          <Rect
                            x={bld.x - 42}
                            y={dstY - 12}
                            width={84}
                            height={8}
                            color="rgba(15, 23, 42, 0.75)"
                          />
                          <Rect
                            x={bld.x - 40}
                            y={dstY - 10}
                            width={80 * hpRatio}
                            height={4}
                            color={bld.isDefense ? '#EF4444' : '#22C55E'}
                          />
                        </>
                      )}
                    </Group>
                  );
                })}

              {/* Attacking Yeti Army + Defending Town Guards */}
              {villagersAtlas !== null &&
                battle.units.map((u) => {
                  const animFrame = u.isMoving
                    ? Math.floor(u.walkPhase) % VILLAGER_FRAMES_PER_DIR
                    : 0;

                  const sx =
                    (u.facingDir * VILLAGER_FRAMES_PER_DIR + animFrame) *
                    VILLAGER_CELL_SIZE;

                  const sy = u.roleRow * VILLAGER_CELL_SIZE;
                  const drawSize = 72;
                  const sc = drawSize / VILLAGER_CELL_SIZE;
                  const dstX = u.x - drawSize * 0.5;
                  const dstY = u.y - drawSize * 0.88;
                  const hpRatio = Math.max(0, u.hp / u.maxHp);

                  return (
                    <Group key={u.id}>
                      <SkiaImage
                        image={villagersAtlas}
                        x={dstX - sx * sc}
                        y={dstY - sy * sc}
                        width={VILLAGER_ATLAS_WIDTH * sc}
                        height={VILLAGER_ATLAS_HEIGHT * sc}
                        clip={Skia.XYWHRect(dstX, dstY, drawSize, drawSize)}
                      />
                      <Rect
                        x={u.x - 18}
                        y={dstY - 6}
                        width={36}
                        height={5}
                        color="rgba(15, 23, 42, 0.75)"
                      />
                      <Rect
                        x={u.x - 17}
                        y={dstY - 5}
                        width={34 * hpRatio}
                        height={3}
                        color={u.side === 'ATTACKER' ? '#40A7FC' : '#F97316'}
                      />
                    </Group>
                  );
                })}

              {/* Live Watchtower / Catapult / Archer Projectiles */}
              {battle.projectiles.map((p) => {
                const cx = p.fromX + (p.toX - p.fromX) * p.progress;
                const cy = p.fromY + (p.toY - p.fromY) * p.progress;

                return <Circle key={p.id} cx={cx} cy={cy} r={8} color={p.color} />;
              })}

              {battle.mistRemainingSec > 0 && (
                <Fill color="rgba(147, 197, 253, 0.25)" />
              )}
            </Group>
          </Canvas>

          {!battle.finished && (
            <View style={styles.deployHint}>
              <Text style={styles.deployHintText}>
                Tap anywhere on the snow to deploy selected Yetis
              </Text>
            </View>
          )}
        </Pressable>

        {/* Bottom Warband Deployment Tray + Off-Map Tactical Orders */}
        <View style={styles.bottomTray}>
          <View style={styles.orderRow}>
            {TACTICAL_ORDERS.map((ord) => {
              const used = battle.ordersUsed.includes(ord.key);

              return (
                <Pressable
                  key={ord.key}
                  disabled={used || battle.finished}
                  onPress={() => {
                    setBattle((prev) => triggerTacticalOrder(prev, ord.key));
                  }}
                  style={[styles.orderBtn, used && styles.orderUsed]}
                >
                  <Text style={styles.orderBtnText}>{ord.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.unitTrayRow}>
            {ARMY_UNIT_SPECS.map((spec) => {
              const slot = battle.deployReserve.find(
                (s) => s.unitKey === spec.key
              );

              const count = slot !== undefined ? slot.count : 0;
              const isSelected = selectedUnit === spec.key;

              return (
                <Pressable
                  key={spec.key}
                  disabled={count <= 0}
                  onPress={() => {
                    setSelectedUnit(spec.key);
                  }}
                  style={[
                    styles.unitChip,
                    isSelected && styles.unitChipActive,
                    count <= 0 && styles.unitChipEmpty,
                  ]}
                >
                  <Text style={styles.unitChipName} numberOfLines={1}>
                    {spec.name.split(' ')[0]}
                  </Text>
                  <Text style={styles.unitChipQty}>×{count}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Raid Victory / Result Overlay */}
        {outcome !== null && (
          <View style={styles.resultOverlay}>
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>
                {outcome.won ? 'RAID VICTORY!' : 'RAID REPELLED'}
              </Text>
              <Text style={styles.resultStars}>
                {'★'.repeat(outcome.stars)}
                {'☆'.repeat(3 - outcome.stars)} · {outcome.destructionPct}%
              </Text>
              <Text style={styles.resultLine}>
                Founder Spoils: +{outcome.playerCoinsEarned} FC
                {outcome.treasuryTributeCoins > 0
                  ? ` (+${outcome.treasuryTributeCoins} FC Treasury)`
                  : ''}
              </Text>
              <Text style={styles.resultLine}>
                Plundered: +{outcome.fishEarned} Lake Trout · +
                {outcome.firewoodEarned} Firewood
              </Text>
              <Text style={styles.resultLine}>
                Authority Rank: {outcome.authorityDelta >= 0 ? '+' : ''}
                {outcome.authorityDelta}
              </Text>
              <Pressable
                onPress={() => {
                  onFinishRaid(outcome);
                }}
                style={styles.claimBtn}
              >
                <Text style={styles.claimBtnText}>Return to Valley</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0F1C',
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 34,
    paddingBottom: 10,
    backgroundColor: '#0E1525',
  },
  townName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  subText: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '700',
  },
  timerBox: {
    alignItems: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  lootText: {
    color: '#4ADE80',
    fontSize: 11.5,
    fontWeight: '800',
  },
  retreatBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retreatText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '800',
  },
  arenaTouch: {
    width: '100%',
  },
  canvas: {
    flex: 1,
  },
  deployHint: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 14, 24, 0.78)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  deployHintText: {
    color: '#E2E8F0',
    fontSize: 11.5,
    fontWeight: '600',
  },
  bottomTray: {
    flex: 1,
    backgroundColor: '#0E1525',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    justifyContent: 'center',
  },
  orderRow: {
    flexDirection: 'row',
    gap: 6,
  },
  orderBtn: {
    flex: 1,
    backgroundColor: '#40A7FC',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  orderUsed: {
    opacity: 0.35,
  },
  orderBtnText: {
    color: '#0A0A0A',
    fontSize: 10.5,
    fontWeight: '800',
  },
  unitTrayRow: {
    flexDirection: 'row',
    gap: 5,
  },
  unitChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 8,
    alignItems: 'center',
  },
  unitChipActive: {
    borderColor: '#40A7FC',
    backgroundColor: 'rgba(64, 167, 252, 0.22)',
  },
  unitChipEmpty: {
    opacity: 0.35,
  },
  unitChipName: {
    color: '#E2E8F0',
    fontSize: 9.5,
    fontWeight: '700',
  },
  unitChipQty: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '900',
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(6, 10, 18, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  resultCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0E1525',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#F5C451',
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  resultStars: {
    color: '#FACC15',
    fontSize: 22,
    fontWeight: '800',
  },
  resultLine: {
    color: '#E2E8F0',
    fontSize: 13.5,
    fontWeight: '600',
  },
  claimBtn: {
    marginTop: 10,
    backgroundColor: '#40A7FC',
    borderRadius: 12,
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  claimBtnText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '900',
  },
});
