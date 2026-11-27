import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WOOD_THEME } from '@/components/town/wood-theme';
import type { TownVillagerProfile } from '@/game/town-villagers';
import { VILLAGER_ROLE_LABEL, type VillagerRoleKey } from '@/game/villager-atlas';
import type { LiveVillagerOverlay } from '@/lib/anvil-live-sync';

interface VillagerFocusCardProps {
  readonly villager: TownVillagerProfile;
  readonly currentLocationLabel: string;
  readonly liveOverlay?: LiveVillagerOverlay;
  readonly isGeneratingPersona?: boolean;
  readonly onGenerateAiPersona?: () => void;
  readonly onClose: () => void;
}

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

export function VillagerFocusCard({
  villager,
  currentLocationLabel,
  liveOverlay,
  isGeneratingPersona = false,
  onGenerateAiPersona,
  onClose,
}: VillagerFocusCardProps) {
  const accentColor = getRoleAccentColor(villager.role);
  const roleLabel = VILLAGER_ROLE_LABEL[villager.role];
  const activeThought = liveOverlay?.thought ?? villager.thought;
  const activeCoins = liveOverlay?.coinsAfter ?? villager.coins;
  const activeActivity = liveOverlay?.actionType ?? villager.activity;
  const persona = liveOverlay?.persona ?? null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText} numberOfLines={1}>
                {villager.name}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
            </View>
            <Text style={styles.subMeta} numberOfLines={1}>
              {villager.archetype} · {villager.housingStatus}
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

        {liveOverlay?.speech !== null && liveOverlay?.speech !== undefined && (
          <View style={styles.speechBubble}>
            <Text style={styles.speechText}>💬 “{liveOverlay.speech}”</Text>
          </View>
        )}

        <View style={styles.thoughtBox}>
          <Text style={styles.thoughtText}>“{activeThought}”</Text>
        </View>

        {persona !== null && (
          <View style={styles.personaBox}>
            <View style={styles.personaHeader}>
              <Text style={styles.personaBadge}>
                {persona.source === 'AI_GENERATED'
                  ? `✨ AI PERSONA v${persona.version}`
                  : '📜 SEED PERSONA'}
              </Text>
              <Text style={styles.personaStance}>{persona.politicalStance}</Text>
            </View>
            <Text style={styles.personaBackstory} numberOfLines={2}>
              {persona.backstory}
            </Text>
            <Text style={styles.personaVoice} numberOfLines={1}>
              Voice: {persona.voiceStyle}
            </Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>WALLET</Text>
            <Text style={styles.statValue}>{activeCoins} FC</Text>
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

        <Text style={styles.rentLine} numberOfLines={1}>
          {villager.rentSummary} · {activeActivity}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.inventoryRow}>
            {villager.inventory.map((entry) => (
              <View key={entry.item} style={styles.invPill}>
                <Text style={styles.invPillText}>
                  {entry.item} ×{entry.qty}
                </Text>
              </View>
            ))}
          </View>

          {onGenerateAiPersona !== undefined && (
            <Pressable
              disabled={isGeneratingPersona}
              onPress={onGenerateAiPersona}
              style={[
                styles.evolveBtn,
                isGeneratingPersona && styles.evolveBtnDisabled,
              ]}
            >
              <Text style={styles.evolveBtnText}>
                {isGeneratingPersona ? 'Synthesizing…' : '✨ AI Persona'}
              </Text>
            </Pressable>
          )}
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
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: WOOD_THEME.sheetBg,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: WOOD_THEME.sheetBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    shadowColor: '#2E1A0B',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  nameText: {
    color: WOOD_THEME.inkHeading,
    fontSize: 17,
    fontWeight: '800',
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: WOOD_THEME.closeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  thoughtBox: {
    backgroundColor: WOOD_THEME.cardBg,
    borderLeftWidth: 3.5,
    borderLeftColor: WOOD_THEME.sheetInnerBorder,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  thoughtText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12.5,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  speechBubble: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#D97706',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  speechText: {
    color: WOOD_THEME.inkHeading,
    fontSize: 12.5,
    fontWeight: '800',
  },
  personaBox: {
    backgroundColor: WOOD_THEME.cardBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 3,
  },
  personaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personaBadge: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
  },
  personaStance: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  personaBackstory: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  personaVoice: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 10.5,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  evolveBtn: {
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.ctaGoldBorder,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  evolveBtnDisabled: {
    opacity: 0.55,
  },
  evolveBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11,
    fontWeight: '800',
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
    paddingVertical: 7,
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
  rentLine: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  inventoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  invPill: {
    backgroundColor: WOOD_THEME.badgeGoldBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  invPillText: {
    color: WOOD_THEME.badgeGoldText,
    fontSize: 11,
    fontWeight: '700',
  },
});
