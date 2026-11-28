import {
  Canvas,
  Image as SkiaImage,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  BarterSwapPanel,
  type SwapAsset,
  type SwapProposal,
} from '@/components/town/barter-swap-panel';
import { WOOD_THEME } from '@/components/town/wood-theme';
import {
  loadPlayerCreditReport,
  loadVillagerCreditReport,
} from '@/game/credit-bank';
import { getEconomyItem, type PouchEntry } from '@/game/economy-engine';
import type { GameIconKey } from '@/game/icon-atlas';
import type {
  TownVillagerProfile,
  VillagerInventoryItem,
} from '@/game/town-villagers';
import {
  VILLAGER_ATLAS_HEIGHT,
  VILLAGER_ATLAS_WIDTH,
  VILLAGER_CELL_SIZE,
} from '@/game/villager-atlas';
import {
  type ProposedBarterInput,
  sendVillagerChatMessage,
  type VillagerChatHistoryLine,
  type VillagerChatOffer,
} from '@/lib/anvil-live-sync';

type BarterOffer = Extract<VillagerChatOffer, { kind: 'BARTER_PROPOSAL' }>;

const COIN_ASSET_ID = '__frost_coins__';

function formatBarterLeg(
  itemName: string | null,
  itemQty: number,
  coinsFc: number
): string {
  const parts: string[] = [];

  if (itemName !== null && itemQty > 0) {
    parts.push(`${itemQty}× ${itemName}`);
  }

  if (coinsFc > 0) {
    parts.push(`${coinsFc} FC`);
  }

  return parts.length > 0 ? parts.join(' + ') : 'nothing';
}

interface ChatBubbleEntry {
  readonly id: string;
  readonly sender: 'player' | 'npc' | 'system';
  readonly text: string;
  readonly offer: VillagerChatOffer;
  readonly offerSettled: boolean;
}

export interface ChatEconomicDelta {
  readonly playerCoinsDelta: number;
  readonly villagerCoinsDelta: number;
  readonly playerItemGain: {
    readonly itemId: GameIconKey;
    readonly qty: number;
  } | null;
  readonly playerItemGive: {
    readonly itemId: GameIconKey;
    readonly qty: number;
  } | null;
  readonly villagerItemDelta: {
    readonly item: string;
    readonly qtyDelta: number;
  } | null;
  readonly villagerItemGain: {
    readonly item: string;
    readonly qty: number;
  } | null;
  readonly summaryToast: string;
}

interface VillagerChatModalProps {
  readonly visible: boolean;
  readonly villager: TownVillagerProfile;
  readonly backendNpcId: string;
  readonly villagerPersonality: string;
  readonly villagerCoins: number;
  readonly villagerInventory: readonly VillagerInventoryItem[];
  readonly playerCoins: number;
  readonly playerPouch: readonly PouchEntry[];
  readonly initialNpcMessage?: string;
  readonly onApplyEconomicDelta: (delta: ChatEconomicDelta) => void;
  readonly onOpenBank?: () => void;
  readonly onClose: () => void;
}

export function mapItemLabelToGameIcon(label: string): GameIconKey | null {
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
    case 'fresh bread':
      return 'artisanBread';
    case 'yak milk':
      return 'yakMilk';
    case 'alpine cheese':
      return 'alpineCheese';
    case 'pine seeds':
      return 'seedPinecone';
    case 'iron nails':
      return 'ironNails';
    case 'warmth tea':
    case 'herbal tea':
      return 'warmthTea';
    case 'frost potato':
      return 'frostPotato';
    case 'mountain berries':
      return 'mountainBerries';
    case 'forest mushroom':
      return 'forestMushroom';
    case 'raw stone':
      return 'rawStone';
    case 'coal':
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
    case 'gold ingot':
      return 'goldIngot';
    default:
      return null;
  }
}

function ChatAvatar({
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

export function VillagerChatModal({
  visible,
  villager,
  backendNpcId,
  villagerPersonality,
  villagerCoins,
  villagerInventory,
  playerCoins,
  playerPouch,
  initialNpcMessage,
  onApplyEconomicDelta,
  onOpenBank,
  onClose,
}: VillagerChatModalProps) {
  const [messages, setMessages] = useState<ChatBubbleEntry[]>(() => [
    {
      id: 'welcome_1',
      sender: 'npc',
      text:
        initialNpcMessage !== undefined && initialNpcMessage.trim().length > 0
          ? initialNpcMessage.trim()
          : `Hey there! What brings you over, neighbor?`,
      offer: { kind: 'NONE' },
      offerSettled: false,
    },
  ]);

  const [draft, setDraft] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [customCoinsDraft, setCustomCoinsDraft] = useState<string>('');

  const [drawerMode, setDrawerMode] = useState<'NONE' | 'SEND_COINS' | 'BARTER'>(
    'NONE'
  );

  const playerCarryList = playerPouch.flatMap((p) => {
    const spec = getEconomyItem(p.itemId);

    if (spec === null || p.qty <= 0) {
      return [];
    }

    return [
      {
        item: spec.name,
        qty: p.qty,
        itemId: p.itemId,
        unitValueFc: Math.max(1, spec.refPrice),
      },
    ];
  });

  const playerSwapAssets: SwapAsset[] = [];

  for (let i = 0; i < playerCarryList.length; i += 1) {
    const c = playerCarryList[i];

    playerSwapAssets.push({
      id: `p_${c.itemId}`,
      kind: 'ITEM',
      label: c.item,
      iconKey: c.itemId,
      available: c.qty,
      unitValueFc: c.unitValueFc,
    });
  }

  if (playerCoins > 0) {
    playerSwapAssets.push({
      id: COIN_ASSET_ID,
      kind: 'COINS',
      label: 'Frost Coins',
      iconKey: 'frostCoin',
      available: playerCoins,
      unitValueFc: 1,
    });
  }

  const villagerSwapAssets: SwapAsset[] = [];

  for (let i = 0; i < villagerInventory.length; i += 1) {
    const v = villagerInventory[i];
    const icon = mapItemLabelToGameIcon(v.item);

    if (icon === null || v.qty <= 0) {
      continue;
    }

    const spec = getEconomyItem(icon);

    villagerSwapAssets.push({
      id: `v_${v.item}`,
      kind: 'ITEM',
      label: v.item,
      iconKey: icon,
      available: v.qty,
      unitValueFc: spec !== null ? Math.max(1, spec.refPrice) : 5,
    });
  }

  if (villagerCoins > 0) {
    villagerSwapAssets.push({
      id: COIN_ASSET_ID,
      kind: 'COINS',
      label: 'Frost Coins',
      iconKey: 'frostCoin',
      available: villagerCoins,
      unitValueFc: 1,
    });
  }

  const pushSystemNote = (text: string): void => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys_${Date.now()}_${prev.length}`,
        sender: 'system',
        text,
        offer: { kind: 'NONE' },
        offerSettled: true,
      },
    ]);
  };

  /** Settles a swap atomically on both sides; returns a visible error instead of failing silently. */
  const executeBarterOffer = (offer: BarterOffer): string | null => {
    if (playerCoins < offer.playerGivesCoinsFc) {
      return `You need ${offer.playerGivesCoinsFc} FC but only have ${playerCoins} FC.`;
    }

    if (villagerCoins < offer.npcGivesCoinsFc) {
      return `${villager.name} only has ${villagerCoins} FC right now.`;
    }

    const giveIcon =
      offer.playerGivesItem !== null
        ? mapItemLabelToGameIcon(offer.playerGivesItem)
        : null;

    if (offer.playerGivesQty > 0 && giveIcon === null) {
      return `${offer.playerGivesItem ?? 'That item'} can't be traded from your pouch.`;
    }

    if (giveIcon !== null && offer.playerGivesQty > 0) {
      const owned = playerPouch.find((p) => p.itemId === giveIcon)?.qty ?? 0;

      if (owned < offer.playerGivesQty) {
        return `You only have ${owned}× ${offer.playerGivesItem ?? 'that item'}.`;
      }
    }

    const gainIcon =
      offer.npcGivesItem !== null ? mapItemLabelToGameIcon(offer.npcGivesItem) : null;

    if (offer.npcGivesQty > 0 && gainIcon === null) {
      return `${offer.npcGivesItem ?? 'That item'} can't be added to your pouch.`;
    }

    if (offer.npcGivesItem !== null && offer.npcGivesQty > 0) {
      const target = offer.npcGivesItem.toLowerCase();

      const held =
        villagerInventory.find((v) => v.item.toLowerCase() === target)?.qty ?? 0;

      if (held < offer.npcGivesQty) {
        return `${villager.name} only has ${held}× ${offer.npcGivesItem} left.`;
      }
    }

    const netPlayerCoins = offer.npcGivesCoinsFc - offer.playerGivesCoinsFc;

    onApplyEconomicDelta({
      playerCoinsDelta: netPlayerCoins,
      villagerCoinsDelta: -netPlayerCoins,
      playerItemGain:
        gainIcon !== null && offer.npcGivesQty > 0
          ? { itemId: gainIcon, qty: offer.npcGivesQty }
          : null,
      playerItemGive:
        giveIcon !== null && offer.playerGivesQty > 0
          ? { itemId: giveIcon, qty: offer.playerGivesQty }
          : null,
      villagerItemDelta:
        offer.npcGivesItem !== null && offer.npcGivesQty > 0
          ? { item: offer.npcGivesItem, qtyDelta: -offer.npcGivesQty }
          : null,
      villagerItemGain:
        offer.playerGivesItem !== null && offer.playerGivesQty > 0
          ? { item: offer.playerGivesItem, qty: offer.playerGivesQty }
          : null,
      summaryToast: `Swapped with ${villager.name}!`,
    });

    return null;
  };

  const describeSwap = (offer: BarterOffer): string =>
    `you gave ${formatBarterLeg(offer.playerGivesItem, offer.playerGivesQty, offer.playerGivesCoinsFc)} and received ${formatBarterLeg(offer.npcGivesItem, offer.npcGivesQty, offer.npcGivesCoinsFc)}`;

  const dispatchMessage = async (
    rawText: string,
    proposedBarter?: ProposedBarterInput,
    pendingSwap?: BarterOffer
  ): Promise<void> => {
    const clean = rawText.trim();

    if (clean.length === 0 || isSending) {
      return;
    }

    const userMsg: ChatBubbleEntry = {
      id: `u_${Date.now()}`,
      sender: 'player',
      text: clean,
      offer: { kind: 'NONE' },
      offerSettled: true,
    };

    const historyLines: VillagerChatHistoryLine[] = [];

    for (let i = Math.max(0, messages.length - 8); i < messages.length; i += 1) {
      const m = messages[i];

      if (m.sender === 'player' || m.sender === 'npc') {
        historyLines.push({ sender: m.sender, text: m.text.slice(0, 280) });
      }
    }

    setMessages((prev) => [...prev, userMsg]);

    if (proposedBarter === undefined) {
      setDraft('');
    }

    setIsSending(true);

    const playerReport = loadPlayerCreditReport(playerCoins);
    const villagerReport = loadVillagerCreditReport(villager, villagerCoins);

    const response = await sendVillagerChatMessage({
      backendNpcId,
      villagerName: villager.name,
      villagerRole: villager.role,
      villagerPersonality,
      villagerCoins,
      villagerCreditScore: villagerReport.score,
      villagerInventory,
      playerCoins,
      playerCreditScore: playerReport.score,
      playerInventory: playerCarryList.map((c) => ({
        item: c.item,
        qty: c.qty,
      })),
      playerMessage: clean,
      history: historyLines,
      proposedBarter,
    });

    setIsSending(false);

    const npcReply: ChatBubbleEntry = {
      id: `n_${Date.now()}`,
      sender: 'npc',
      text: response.reply,
      offer: response.offer,
      offerSettled: response.offer.kind === 'NONE',
    };

    setMessages((prev) => [...prev, npcReply]);

    if (pendingSwap === undefined) {
      return;
    }

    if (response.barterDecision === 'ACCEPT') {
      const err = executeBarterOffer(pendingSwap);

      if (err !== null) {
        pushSystemNote(`Swap couldn't complete: ${err}`);

        return;
      }

      pushSystemNote(`Swap completed — ${describeSwap(pendingSwap)}.`);
      setDrawerMode('NONE');

      return;
    }

    if (response.barterDecision === 'COUNTER') {
      setDrawerMode('NONE');
    }
  };

  const handleProposeSwap = (proposal: SwapProposal): void => {
    const giveIsCoins = proposal.give.kind === 'COINS';
    const receiveIsCoins = proposal.receive.kind === 'COINS';

    const offer: BarterOffer = {
      kind: 'BARTER_PROPOSAL',
      playerGivesItem: giveIsCoins ? null : proposal.give.label,
      playerGivesQty: giveIsCoins ? 0 : proposal.giveQty,
      playerGivesCoinsFc: giveIsCoins ? proposal.giveQty : 0,
      npcGivesItem: receiveIsCoins ? null : proposal.receive.label,
      npcGivesQty: receiveIsCoins ? 0 : proposal.receiveQty,
      npcGivesCoinsFc: receiveIsCoins ? proposal.receiveQty : 0,
    };

    const wire: ProposedBarterInput = {
      playerGivesItem: offer.playerGivesItem,
      playerGivesQty: offer.playerGivesQty,
      playerGivesCoinsFc: offer.playerGivesCoinsFc,
      npcGivesItem: offer.npcGivesItem,
      npcGivesQty: offer.npcGivesQty,
      npcGivesCoinsFc: offer.npcGivesCoinsFc,
      playerOfferValueFc: proposal.giveValueFc,
      npcAskValueFc: proposal.receiveValueFc,
    };

    const text = `Want to swap? I'll give ${formatBarterLeg(offer.playerGivesItem, offer.playerGivesQty, offer.playerGivesCoinsFc)} for your ${formatBarterLeg(offer.npcGivesItem, offer.npcGivesQty, offer.npcGivesCoinsFc)}.`;

    void dispatchMessage(text, wire, offer);
  };

  const markOfferSettled = (bubbleId: string, systemNote: string): void => {
    setMessages((prev) => {
      const next: ChatBubbleEntry[] = [];

      for (let i = 0; i < prev.length; i += 1) {
        const entry = prev[i];

        if (entry.id === bubbleId) {
          next.push({ ...entry, offerSettled: true });
        } else {
          next.push(entry);
        }
      }

      next.push({
        id: `sys_${Date.now()}`,
        sender: 'system',
        text: systemNote,
        offer: { kind: 'NONE' },
        offerSettled: true,
      });

      return next;
    });
  };

  const handleSendPlayerCoins = (amountFc: number): void => {
    if (playerCoins < amountFc || amountFc <= 0) {
      return;
    }

    onApplyEconomicDelta({
      playerCoinsDelta: -amountFc,
      villagerCoinsDelta: amountFc,
      playerItemGain: null,
      playerItemGive: null,
      villagerItemDelta: null,
      villagerItemGain: null,
      summaryToast: `Sent ${amountFc} FC to ${villager.name}`,
    });

    setDrawerMode('NONE');
    setCustomCoinsDraft('');

    setMessages((prev) => [
      ...prev,
      {
        id: `sys_send_${Date.now()}`,
        sender: 'system',
        text: `You transferred ${amountFc} FC to ${villager.name}.`,
        offer: { kind: 'NONE' },
        offerSettled: true,
      },
      {
        id: `npc_thx_${Date.now()}`,
        sender: 'npc',
        text: `Appreciate that, friend! ${amountFc} FC helps a ton—I won't forget it.`,
        offer: { kind: 'NONE' },
        offerSettled: true,
      },
    ]);
  };

  const customCoinsAmount =
    customCoinsDraft.length > 0 ? Math.floor(Number(customCoinsDraft)) : 0;

  const customCoinsValid =
    Number.isFinite(customCoinsAmount) &&
    customCoinsAmount > 0 &&
    customCoinsAmount <= playerCoins;

  const handleAcceptBubbleOffer = (bubble: ChatBubbleEntry): void => {
    const offer = bubble.offer;

    if (offer.kind === 'GIFT_TO_PLAYER') {
      const giftIcon =
        offer.itemName !== null ? mapItemLabelToGameIcon(offer.itemName) : null;

      onApplyEconomicDelta({
        playerCoinsDelta: offer.coinsFc,
        villagerCoinsDelta: -offer.coinsFc,
        playerItemGain:
          giftIcon !== null && offer.itemQty > 0
            ? { itemId: giftIcon, qty: offer.itemQty }
            : null,
        playerItemGive: null,
        villagerItemDelta:
          offer.itemName !== null && offer.itemQty > 0
            ? { item: offer.itemName, qtyDelta: -offer.itemQty }
            : null,
        villagerItemGain: null,
        summaryToast: `Received gift from ${villager.name}!`,
      });

      const desc =
        offer.coinsFc > 0
          ? `${offer.coinsFc} FC`
          : `${offer.itemQty}× ${offer.itemName ?? 'item'}`;

      markOfferSettled(bubble.id, `${villager.name} gave you ${desc}.`);

      return;
    }

    if (offer.kind === 'REQUEST_FROM_PLAYER') {
      if (playerCoins < offer.coinsFc) {
        return;
      }

      onApplyEconomicDelta({
        playerCoinsDelta: -offer.coinsFc,
        villagerCoinsDelta: offer.coinsFc,
        playerItemGain: null,
        playerItemGive: null,
        villagerItemDelta: null,
        villagerItemGain: null,
        summaryToast: `Sent ${offer.coinsFc} FC to ${villager.name}`,
      });

      markOfferSettled(
        bubble.id,
        `You sent ${offer.coinsFc} FC to ${villager.name}.`
      );

      return;
    }

    if (offer.kind === 'BARTER_PROPOSAL') {
      const err = executeBarterOffer(offer);

      if (err !== null) {
        pushSystemNote(`Swap couldn't complete: ${err}`);

        return;
      }

      markOfferSettled(bubble.id, `Swap completed — ${describeSwap(offer)}.`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.avatarBox}>
              <ChatAvatar roleRow={villager.roleRow} size={44} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{villager.name}</Text>
              <Text style={styles.headerSub}>
                Wallet {villagerCoins} FC · Your Pouch {playerCoins} FC
              </Text>
            </View>
            {villager.role === 'banker' && onOpenBank !== undefined && (
              <Pressable onPress={onOpenBank} style={styles.bankHeaderBtn}>
                <Text style={styles.bankHeaderBtnText}>Bank</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close chat"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.feed}
          >
            {messages.map((m) => {
              if (m.sender === 'system') {
                return (
                  <View key={m.id} style={styles.systemPill}>
                    <Text style={styles.systemPillText}>{m.text}</Text>
                  </View>
                );
              }

              const isPlayer = m.sender === 'player';

              return (
                <View
                  key={m.id}
                  style={[
                    styles.bubbleWrap,
                    isPlayer ? styles.bubbleWrapRight : styles.bubbleWrapLeft,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isPlayer ? styles.bubblePlayer : styles.bubbleNpc,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        isPlayer
                          ? styles.bubbleTextPlayer
                          : styles.bubbleTextNpc,
                      ]}
                    >
                      {m.text}
                    </Text>

                    {!m.offerSettled && m.offer.kind === 'GIFT_TO_PLAYER' && (
                      <View style={styles.offerCard}>
                        <Text style={styles.offerTitle}>
                          Gift Offer:{' '}
                          {m.offer.coinsFc > 0
                            ? `${m.offer.coinsFc} FC`
                            : `${m.offer.itemQty}× ${m.offer.itemName ?? ''}`}
                        </Text>
                        <Pressable
                          onPress={() => {
                            handleAcceptBubbleOffer(m);
                          }}
                          style={styles.offerAcceptBtn}
                        >
                          <Text style={styles.offerAcceptText}>Accept Gift</Text>
                        </Pressable>
                      </View>
                    )}

                    {!m.offerSettled &&
                      m.offer.kind === 'REQUEST_FROM_PLAYER' && (
                        <View style={styles.offerCard}>
                          <Text style={styles.offerTitle}>
                            Requesting {m.offer.coinsFc} FC
                          </Text>
                          <View style={styles.offerBtnRow}>
                            <Pressable
                              disabled={playerCoins < m.offer.coinsFc}
                              onPress={() => {
                                handleAcceptBubbleOffer(m);
                              }}
                              style={[
                                styles.offerAcceptBtn,
                                playerCoins < m.offer.coinsFc &&
                                  styles.btnDisabled,
                              ]}
                            >
                              <Text style={styles.offerAcceptText}>
                                Send {m.offer.coinsFc} FC
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                markOfferSettled(m.id, 'Declined request.');
                              }}
                              style={styles.offerDeclineBtn}
                            >
                              <Text style={styles.offerDeclineText}>Pass</Text>
                            </Pressable>
                          </View>
                        </View>
                      )}

                    {!m.offerSettled && m.offer.kind === 'BARTER_PROPOSAL' && (
                      <View style={styles.offerCard}>
                        <Text style={styles.offerTitle}>
                          Deal:{' '}
                          {m.offer.playerGivesQty > 0
                            ? `${m.offer.playerGivesQty}× ${m.offer.playerGivesItem}`
                            : `${m.offer.playerGivesCoinsFc} FC`}{' '}
                          →{' '}
                          {m.offer.npcGivesQty > 0
                            ? `${m.offer.npcGivesQty}× ${m.offer.npcGivesItem}`
                            : `${m.offer.npcGivesCoinsFc} FC`}
                        </Text>
                        <View style={styles.offerBtnRow}>
                          <Pressable
                            onPress={() => {
                              handleAcceptBubbleOffer(m);
                            }}
                            style={styles.offerAcceptBtn}
                          >
                            <Text style={styles.offerAcceptText}>
                              Accept Trade
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              markOfferSettled(m.id, 'Declined trade.');
                            }}
                            style={styles.offerDeclineBtn}
                          >
                            <Text style={styles.offerDeclineText}>Pass</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {isSending && (
              <Text style={styles.typingIndicator}>
                {villager.name} is replying…
              </Text>
            )}
          </ScrollView>

          {drawerMode === 'SEND_COINS' && (
            <View style={styles.quickDrawer}>
              <Text style={styles.drawerLabel}>SEND COINS TO {villager.name.toUpperCase()}</Text>
              <View style={styles.offerBtnRow}>
                {[10, 25, 50].map((amt) => (
                  <Pressable
                    key={amt}
                    disabled={playerCoins < amt}
                    onPress={() => {
                      handleSendPlayerCoins(amt);
                    }}
                    style={[
                      styles.drawerActionChip,
                      playerCoins < amt && styles.btnDisabled,
                    ]}
                  >
                    <Text style={styles.drawerActionText}>Send {amt} FC</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.customCoinsRow}>
                <TextInput
                  value={customCoinsDraft}
                  onChangeText={(text) => {
                    setCustomCoinsDraft(text.replace(/[^0-9]/g, ''));
                  }}
                  placeholder="Custom amount"
                  placeholderTextColor={WOOD_THEME.inkMuted}
                  keyboardType="number-pad"
                  maxLength={7}
                  style={styles.customCoinsInput}
                  onSubmitEditing={() => {
                    if (customCoinsValid) {
                      handleSendPlayerCoins(customCoinsAmount);
                    }
                  }}
                />
                <Pressable
                  disabled={!customCoinsValid}
                  onPress={() => {
                    handleSendPlayerCoins(customCoinsAmount);
                  }}
                  style={[
                    styles.drawerActionChip,
                    !customCoinsValid && styles.btnDisabled,
                  ]}
                >
                  <Text style={styles.drawerActionText}>
                    {customCoinsValid ? `Send ${customCoinsAmount} FC` : 'Send'}
                  </Text>
                </Pressable>
              </View>
              {customCoinsAmount > playerCoins && (
                <Text style={styles.customCoinsError}>
                  You only have {playerCoins} FC.
                </Text>
              )}
            </View>
          )}

          {drawerMode === 'BARTER' &&
            (playerSwapAssets.length === 0 ||
            villagerSwapAssets.length === 0 ? (
              <View style={styles.quickDrawer}>
                <Text style={styles.emptyBarterHint}>
                  {playerSwapAssets.length === 0
                    ? 'Your pouch is empty — gather something to trade first.'
                    : `${villager.name} has nothing tradable right now.`}
                </Text>
              </View>
            ) : (
              <BarterSwapPanel
                villagerName={villager.name}
                playerAssets={playerSwapAssets}
                villagerAssets={villagerSwapAssets}
                isSubmitting={isSending}
                onPropose={handleProposeSwap}
              />
            ))}

          <View style={styles.quickChipRow}>
            <Pressable
              onPress={() => {
                void dispatchMessage(
                  'Times are hard—could you spare a little help or supplies?'
                );
              }}
              style={styles.quickChip}
            >
              <Text style={styles.quickChipText}>Ask for Help</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setDrawerMode((prev) =>
                  prev === 'SEND_COINS' ? 'NONE' : 'SEND_COINS'
                );
              }}
              style={[
                styles.quickChip,
                drawerMode === 'SEND_COINS' && styles.quickChipActive,
              ]}
            >
              <Text style={styles.quickChipText}>Send Coins</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setDrawerMode((prev) =>
                  prev === 'BARTER' ? 'NONE' : 'BARTER'
                );
              }}
              style={[
                styles.quickChip,
                drawerMode === 'BARTER' && styles.quickChipActive,
              ]}
            >
              <Text style={styles.quickChipText}>Barter</Text>
            </Pressable>
          </View>

          <View style={styles.composerRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message ${villager.name}…`}
              placeholderTextColor={WOOD_THEME.inkMuted}
              style={styles.chatInput}
              onSubmitEditing={() => {
                void dispatchMessage(draft);
              }}
            />
            <Pressable
              disabled={isSending || draft.trim().length === 0}
              onPress={() => {
                void dispatchMessage(draft);
              }}
              style={[
                styles.sendBtn,
                (isSending || draft.trim().length === 0) && styles.btnDisabled,
              ]}
            >
              <Text style={styles.sendBtnText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    height: '82%',
    backgroundColor: WOOD_THEME.sheetBg,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: WOOD_THEME.sheetBorder,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.cardBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    color: WOOD_THEME.inkHeading,
    fontSize: 16.5,
    fontWeight: '900',
  },
  headerSub: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
    fontWeight: '700',
  },
  bankHeaderBtn: {
    minHeight: 38,
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  closeBtn: {
    width: 38,
    height: 38,
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
  feed: {
    gap: 9,
    paddingVertical: 4,
  },
  bubbleWrap: {
    flexDirection: 'row',
  },
  bubbleWrapLeft: {
    justifyContent: 'flex-start',
  },
  bubbleWrapRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  bubbleNpc: {
    backgroundColor: WOOD_THEME.cardBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
  },
  bubblePlayer: {
    backgroundColor: WOOD_THEME.ctaWoodBg,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextNpc: {
    color: WOOD_THEME.inkPrimary,
    fontWeight: '600',
  },
  bubbleTextPlayer: {
    color: WOOD_THEME.inkOnDark,
    fontWeight: '600',
  },
  systemPill: {
    alignSelf: 'center',
    backgroundColor: WOOD_THEME.badgeGoldBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  systemPillText: {
    color: WOOD_THEME.badgeGoldText,
    fontSize: 11,
    fontWeight: '800',
  },
  offerCard: {
    backgroundColor: WOOD_THEME.sheetDeepBg,
    borderRadius: 10,
    padding: 9,
    gap: 7,
  },
  offerTitle: {
    color: WOOD_THEME.inkHeading,
    fontSize: 11.5,
    fontWeight: '800',
  },
  offerBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  offerAcceptBtn: {
    minHeight: 38,
    backgroundColor: WOOD_THEME.ctaGreenBg,
    borderRadius: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerAcceptText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  offerDeclineBtn: {
    minHeight: 38,
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderRadius: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerDeclineText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  typingIndicator: {
    color: WOOD_THEME.inkMuted,
    fontSize: 11.5,
    fontStyle: 'italic',
    paddingHorizontal: 4,
  },
  quickDrawer: {
    backgroundColor: WOOD_THEME.cardBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 12,
    padding: 10,
    gap: 7,
  },
  drawerLabel: {
    color: WOOD_THEME.inkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  drawerActionChip: {
    minHeight: 38,
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerActionText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  emptyBarterHint: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
  },
  customCoinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  customCoinsInput: {
    flex: 1,
    minHeight: 38,
    backgroundColor: WOOD_THEME.sheetBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: WOOD_THEME.inkPrimary,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  customCoinsError: {
    color: WOOD_THEME.ctaDangerBg,
    fontSize: 11,
    fontWeight: '700',
  },
  quickChipRow: {
    flexDirection: 'row',
    gap: 7,
  },
  quickChip: {
    flex: 1,
    minHeight: 38,
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  quickChipActive: {
    backgroundColor: WOOD_THEME.tabActiveBg,
    borderColor: WOOD_THEME.tabActiveBorder,
  },
  quickChipText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  composerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: WOOD_THEME.cardBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: WOOD_THEME.inkPrimary,
    fontSize: 13,
  },
  sendBtn: {
    minHeight: 44,
    backgroundColor: WOOD_THEME.ctaWoodBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 12.5,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
