import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TownVillagerProfile } from '@/game/town-villagers';
import { VILLAGER_ROLE_LABEL, type VillagerRoleKey } from '@/game/villager-atlas';

interface VillagerFocusCardProps {
  readonly villager: TownVillagerProfile;
  readonly currentLocationLabel: string;
  readonly onClose: () => void;
}

function getRoleAccentColor(role: VillagerRoleKey): string {
  switch (role) {
    case 'hero':
      return '#40A7FC';
    case 'mayor':
      return '#D97706';
    case 'police':
      return '#2563EB';
    case 'criminal':
      return '#DC2626';
    case 'cultist':
      return '#7C3AED';
    case 'unemployed':
      return '#64748B';
    case 'landlord':
      return '#9F1239';
    case 'banker':
      return '#0F766E';
    default:
      return '#0284C7';
  }
}

export function VillagerFocusCard({
  villager,
  currentLocationLabel,
  onClose,
}: VillagerFocusCardProps) {
  const accentColor = getRoleAccentColor(villager.role);
  const roleLabel = VILLAGER_ROLE_LABEL[villager.role];

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

        <View style={styles.thoughtBox}>
          <Text style={styles.thoughtText}>“{villager.thought}”</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statLabel}>WALLET</Text>
            <Text style={styles.statValue}>{villager.coins} FC</Text>
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
          {villager.rentSummary} · {villager.activity}
        </Text>

        <View style={styles.inventoryRow}>
          {villager.inventory.map((entry) => (
            <View key={entry.item} style={styles.invPill}>
              <Text style={styles.invPillText}>
                {entry.item} ×{entry.qty}
              </Text>
            </View>
          ))}
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
    backgroundColor: 'rgba(10, 14, 24, 0.92)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(192, 206, 245, 0.28)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
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
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  subMeta: {
    color: '#C0CEF5',
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  thoughtBox: {
    backgroundColor: 'rgba(64, 167, 252, 0.13)',
    borderLeftWidth: 3,
    borderLeftColor: '#40A7FC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  thoughtText: {
    color: '#E8F2FF',
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCell: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 2,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  rentLine: {
    color: '#CBD5E1',
    fontSize: 11.5,
  },
  inventoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  invPill: {
    backgroundColor: 'rgba(192, 206, 245, 0.14)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  invPillText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
});
