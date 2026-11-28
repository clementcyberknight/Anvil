import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { WOOD_THEME } from '@/components/town/wood-theme';
import type { IncomingNpcApproachPayload } from '@/lib/anvil-live-sync';

interface IncomingNpcBannerProps {
  readonly incoming: IncomingNpcApproachPayload;
  readonly onReply: (incoming: IncomingNpcApproachPayload) => void;
  readonly onDismiss: () => void;
}

function formatRoleLabel(raw: string): string {
  return raw
    .toLowerCase()
    .split('_')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');
}

function formatItemId(raw: string | null): string {
  if (raw === null || raw.length === 0) {
    return 'Supplies';
  }

  return raw
    .split('_')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');
}

/**
 * Floating non-blocking on-screen banner displayed whenever an autonomous AI NPC
 * walks up to talk to the player or posts a citizen request directly to them.
 */
export function IncomingNpcBanner({
  incoming,
  onReply,
  onDismiss,
}: IncomingNpcBannerProps) {
  const isRequest = incoming.requestKind !== 'CHAT';

  const badgeText =
    incoming.requestKind === 'ITEM_REQUEST'
      ? '📦 CITIZEN REQUEST'
      : incoming.requestKind === 'COIN_REQUEST'
        ? '💰 FUND REQUEST'
        : '💬 APPROACHING YOU';

  const requestSummary =
    incoming.requestKind === 'ITEM_REQUEST'
      ? `Needs ${incoming.requestQty}× ${formatItemId(incoming.requestItemId)}${incoming.rewardFc > 0 ? ` · Reward ${incoming.rewardFc} FC` : ''}`
      : incoming.requestKind === 'COIN_REQUEST'
        ? `Asking for ${incoming.requestCoinsFc} FC`
        : null;

  return (
    <Animated.View
      entering={FadeInUp.duration(240)}
      exiting={FadeOutUp.duration(180)}
      pointerEvents="box-none"
      style={styles.wrap}
    >
      <View style={[styles.card, isRequest && styles.cardRequest]}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.badge, isRequest && styles.badgeRequest]}>
              {badgeText}
            </Text>
            <Text style={styles.nameText} numberOfLines={1}>
              {incoming.npcName}{' '}
              <Text style={styles.roleText}>
                · {formatRoleLabel(incoming.npcRole)}
              </Text>
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Dismiss citizen message"
            onPress={onDismiss}
            style={styles.closeBtn}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.messageText} numberOfLines={3}>
          “{incoming.message}”
        </Text>

        {requestSummary !== null && (
          <View style={styles.requestPill}>
            <Text style={styles.requestPillText}>{requestSummary}</Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => {
              onReply(incoming);
            }}
            style={styles.replyBtn}
          >
            <Text style={styles.replyBtnText}>
              {isRequest ? 'Respond / Trade' : 'Reply in Chat'}
            </Text>
          </Pressable>

          <Pressable onPress={onDismiss} style={styles.laterBtn}>
            <Text style={styles.laterBtnText}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 92,
    left: 14,
    right: 14,
    zIndex: 40,
  },
  card: {
    backgroundColor: WOOD_THEME.sheetBg,
    borderWidth: 2.5,
    borderColor: '#40A7FC',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#0A0A0A',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    gap: 8,
  },
  cardRequest: {
    borderColor: '#F59E0B',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  badge: {
    color: '#0284C7',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  badgeRequest: {
    color: '#B45309',
  },
  nameText: {
    color: WOOD_THEME.inkHeading,
    fontSize: 15,
    fontWeight: '900',
  },
  roleText: {
    color: WOOD_THEME.inkMuted,
    fontSize: 12.5,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(60, 40, 20, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: WOOD_THEME.inkHeading,
    fontSize: 13,
    fontWeight: '900',
  },
  messageText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 13.5,
    fontWeight: '600',
    lineHeight: 19,
  },
  requestPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  requestPillText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  replyBtn: {
    flex: 1,
    backgroundColor: '#40A7FC',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  laterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(60, 40, 20, 0.08)',
  },
  laterBtnText: {
    color: WOOD_THEME.inkMuted,
    fontSize: 12.5,
    fontWeight: '800',
  },
});
