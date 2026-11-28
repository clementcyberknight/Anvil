import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { WOOD_THEME } from '@/components/town/wood-theme';
import {
  copyPublicText,
  copySecretWalletText,
  ensureLocalSuiWallet,
  type LocalSuiWalletSecrets,
  type LocalSuiWalletSummary,
  revealLocalSuiWalletSecrets,
} from '@/lib/sui-wallet';

type WalletTab = 'WALLET' | 'SECRET_PHRASE' | 'PRIVATE_KEY';

interface WalletSettingsModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

export function WalletSettingsModal({
  visible,
  onClose,
}: WalletSettingsModalProps) {
  const [tab, setTab] = useState<WalletTab>('WALLET');
  const [wallet, setWallet] = useState<LocalSuiWalletSummary | null>(null);
  const [secrets, setSecrets] = useState<LocalSuiWalletSecrets | null>(null);
  const [isPhraseRevealed, setIsPhraseRevealed] = useState<boolean>(false);
  const [isKeyRevealed, setIsKeyRevealed] = useState<boolean>(false);
  const [copiedBadge, setCopiedBadge] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;

    const loadWallet = async (): Promise<void> => {
      try {
        const summary = await ensureLocalSuiWallet();

        if (!cancelled) {
          setWallet(summary);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Could not load wallet from device storage.';

          setActionError(msg);
        }
      }
    };

    void loadWallet();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const flashCopied = (label: string): void => {
    setActionError(null);
    setCopiedBadge(label);
    setTimeout(() => {
      setCopiedBadge((prev) => (prev === label ? null : prev));
    }, 2000);
  };

  const handleCopyPublic = async (
    text: string,
    label: string
  ): Promise<void> => {
    try {
      await copyPublicText(text);
      flashCopied(label);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not copy to clipboard.';

      setActionError(msg);
    }
  };

  const handleCopySecret = async (
    secretText: string,
    label: string
  ): Promise<void> => {
    try {
      await copySecretWalletText(secretText);
      flashCopied(label);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not copy to clipboard.';

      setActionError(msg);
    }
  };

  const handleTogglePhraseReveal = async (): Promise<void> => {
    setActionError(null);

    if (isPhraseRevealed) {
      setIsPhraseRevealed(false);

      return;
    }

    try {
      const loaded = secrets ?? (await revealLocalSuiWalletSecrets());

      setSecrets(loaded);
      setIsPhraseRevealed(true);
    } catch (err) {
      setIsPhraseRevealed(false);

      const msg =
        err instanceof Error ? err.message : 'Unable to unlock secret phrase.';

      setActionError(msg);
    }
  };

  const handleToggleKeyReveal = async (): Promise<void> => {
    setActionError(null);

    if (isKeyRevealed) {
      setIsKeyRevealed(false);

      return;
    }

    try {
      const loaded = secrets ?? (await revealLocalSuiWalletSecrets());

      setSecrets(loaded);
      setIsKeyRevealed(true);
    } catch (err) {
      setIsKeyRevealed(false);

      const msg =
        err instanceof Error ? err.message : 'Unable to unlock private key.';

      setActionError(msg);
    }
  };

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
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerEyebrow}>SETTINGS</Text>
              <Text style={styles.headerTitle}>Wallet</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close wallet settings"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {copiedBadge !== null && (
            <View style={styles.copiedToast}>
              <Text style={styles.copiedToastText}>✓ {copiedBadge}</Text>
            </View>
          )}

          {actionError !== null && (
            <View style={styles.warningCard}>
              <Text style={styles.warningBody}>{actionError}</Text>
            </View>
          )}

          <View style={styles.tabRow}>
            {(
              [
                { key: 'WALLET', label: 'Wallet' },
                { key: 'SECRET_PHRASE', label: 'Secret Phrase' },
                { key: 'PRIVATE_KEY', label: 'Private Key' },
              ] as const
            ).map((item) => {
              const active = tab === item.key;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setTab(item.key);
                    setIsPhraseRevealed(false);
                    setIsKeyRevealed(false);
                  }}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                >
                  <Text
                    style={[
                      styles.tabPillText,
                      active && styles.tabPillTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {tab === 'WALLET' && (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>WALLET ADDRESS</Text>
                <View style={styles.monoBox}>
                  <Text selectable style={styles.monoText}>
                    {wallet?.suiAddress ?? 'Loading wallet…'}
                  </Text>
                </View>

                <Pressable
                  disabled={wallet === null}
                  onPress={() => {
                    if (wallet !== null) {
                      void handleCopyPublic(
                        wallet.suiAddress,
                        'Address Copied'
                      );
                    }
                  }}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>Copy Address</Text>
                </Pressable>
              </View>
            )}

            {tab === 'SECRET_PHRASE' && (
              <>
                <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>Keep Your Phrase Safe</Text>
                  <Text style={styles.warningBody}>
                    Never share your 12-word secret phrase with anyone. Anyone
                    with these words can access your wallet.
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    void handleTogglePhraseReveal();
                  }}
                  style={({ pressed }) => [
                    isPhraseRevealed ? styles.secondaryBtnFull : styles.revealBtn,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text
                    style={
                      isPhraseRevealed
                        ? styles.secondaryBtnText
                        : styles.revealBtnText
                    }
                  >
                    {isPhraseRevealed
                      ? 'Hide Secret Phrase'
                      : 'Reveal Secret Phrase'}
                  </Text>
                </Pressable>

                {isPhraseRevealed && secrets !== null && (
                  <View style={styles.card}>
                    <Text style={styles.fieldLabel}>SECRET PHRASE</Text>
                    {secrets.mnemonicWords.length > 0 &&
                    secrets.mnemonicPhrase !== null ? (
                      <>
                        <View style={styles.wordGrid}>
                          {secrets.mnemonicWords.map((word, idx) => (
                            <View
                              key={`${idx + 1}-${word}`}
                              style={styles.wordCell}
                            >
                              <Text style={styles.wordIndex}>{idx + 1}.</Text>
                              <Text selectable style={styles.wordText}>
                                {word}
                              </Text>
                            </View>
                          ))}
                        </View>
                        <Pressable
                          onPress={() => {
                            if (secrets.mnemonicPhrase !== null) {
                              void handleCopySecret(
                                secrets.mnemonicPhrase,
                                'Secret Phrase Copied'
                              );
                            }
                          }}
                          style={({ pressed }) => [
                            styles.primaryBtn,
                            pressed && styles.btnPressed,
                          ]}
                        >
                          <Text style={styles.primaryBtnText}>
                            Copy Secret Phrase
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <Text style={styles.bodyCopy}>
                        No 12-word phrase is stored for this wallet. Use the
                        Private Key tab to back it up.
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            {tab === 'PRIVATE_KEY' && (
              <>
                <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>Keep Your Key Safe</Text>
                  <Text style={styles.warningBody}>
                    Never share your private key with anyone. Anyone with this
                    key can access your wallet.
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    void handleToggleKeyReveal();
                  }}
                  style={({ pressed }) => [
                    isKeyRevealed ? styles.secondaryBtnFull : styles.revealBtn,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text
                    style={
                      isKeyRevealed
                        ? styles.secondaryBtnText
                        : styles.revealBtnText
                    }
                  >
                    {isKeyRevealed ? 'Hide Private Key' : 'Reveal Private Key'}
                  </Text>
                </Pressable>

                {isKeyRevealed && secrets !== null && (
                  <View style={styles.card}>
                    <Text style={styles.fieldLabel}>PRIVATE KEY</Text>
                    <View style={styles.monoBox}>
                      <Text selectable style={styles.monoText}>
                        {secrets.privateKeyBech32}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        void handleCopySecret(
                          secrets.privateKeyBech32,
                          'Private Key Copied'
                        );
                      }}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        pressed && styles.btnPressed,
                      ]}
                    >
                      <Text style={styles.primaryBtnText}>
                        Copy Private Key
                      </Text>
                    </Pressable>
                  </View>
                )}
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
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    backgroundColor: WOOD_THEME.sheetBg,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: WOOD_THEME.sheetBorder,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  headerEyebrow: {
    color: WOOD_THEME.inkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: WOOD_THEME.inkHeading,
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.closeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 15,
    fontWeight: '900',
  },
  copiedToast: {
    backgroundColor: WOOD_THEME.ctaGreenBg,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  copiedToastText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 12,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: WOOD_THEME.sheetDeepBg,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabPillActive: {
    backgroundColor: WOOD_THEME.tabActiveBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.tabActiveBorder,
  },
  tabPillText: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11.5,
    fontWeight: '800',
  },
  tabPillTextActive: {
    color: WOOD_THEME.inkPrimary,
  },
  scrollBody: {
    gap: 12,
    paddingBottom: 6,
  },
  card: {
    backgroundColor: WOOD_THEME.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    padding: 12,
    gap: 10,
  },
  fieldLabel: {
    color: WOOD_THEME.inkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  monoBox: {
    backgroundColor: WOOD_THEME.cardMutedBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    padding: 10,
  },
  monoText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  bodyCopy: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  warningCard: {
    backgroundColor: WOOD_THEME.ctaDangerSoftBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.ctaDangerBg,
    padding: 12,
    gap: 4,
  },
  warningTitle: {
    color: WOOD_THEME.ctaDangerText,
    fontSize: 12.5,
    fontWeight: '900',
  },
  warningBody: {
    color: WOOD_THEME.ctaDangerText,
    fontSize: 11.5,
    lineHeight: 16.5,
  },
  revealBtn: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderWidth: 2,
    borderColor: WOOD_THEME.ctaGoldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  revealBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  wordGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wordCell: {
    width: '31.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WOOD_THEME.cardMutedBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  wordIndex: {
    color: WOOD_THEME.inkMuted,
    fontSize: 10.5,
    fontWeight: '800',
  },
  wordText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.ctaWoodBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryBtnText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 12.5,
    fontWeight: '800',
  },
  secondaryBtnFull: {
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
    fontSize: 12,
    fontWeight: '800',
  },
  btnPressed: {
    transform: [{ scale: 0.96 }],
  },
});
