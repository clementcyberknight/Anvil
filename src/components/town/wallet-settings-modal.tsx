import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { WOOD_THEME } from '@/components/town/wood-theme';
import {
  loadLastSyncDiagnostic,
  resolveBackendHttpBaseUrl,
} from '@/lib/anvil-live-sync';
import {
  copyPublicText,
  copySecretWalletText,
  ensureLocalSuiWallet,
  importLocalSuiWallet,
  type LocalSuiWalletSecrets,
  type LocalSuiWalletSummary,
  readClipboardText,
  revealLocalSuiWalletSecrets,
} from '@/lib/sui-wallet';

type WalletTab = 'OVERVIEW' | 'RECOVERY' | 'IMPORT';

interface WalletSettingsModalProps {
  readonly visible: boolean;
  readonly liveConnected: boolean;
  readonly activeTownId: string;
  readonly onClose: () => void;
  readonly onWalletChanged: (newWallet: LocalSuiWalletSummary) => void;
}

export function WalletSettingsModal({
  visible,
  liveConnected,
  activeTownId,
  onClose,
  onWalletChanged,
}: WalletSettingsModalProps) {
  const [tab, setTab] = useState<WalletTab>('OVERVIEW');
  const [wallet, setWallet] = useState<LocalSuiWalletSummary | null>(null);
  const [secrets, setSecrets] = useState<LocalSuiWalletSecrets | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [copiedBadge, setCopiedBadge] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [syncDiag] = useState<string | null>(() => loadLastSyncDiagnostic());
  const [importDraft, setImportDraft] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

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
              : 'Could not read SecureStore wallet — rebuild native app if needed.';

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
    }, 2200);
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
        err instanceof Error
          ? err.message
          : 'Could not copy secret to clipboard.';

      setActionError(msg);
    }
  };

  const handleToggleReveal = async (): Promise<void> => {
    setActionError(null);

    if (isRevealed) {
      setIsRevealed(false);
      setSecrets(null);

      return;
    }

    try {
      const loaded = await revealLocalSuiWalletSecrets();

      setSecrets(loaded);
      setIsRevealed(true);
    } catch (err) {
      setIsRevealed(false);

      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to unlock SecureStore wallet secrets.';

      setActionError(msg);
    }
  };

  const handlePasteClipboard = async (): Promise<void> => {
    setActionError(null);

    try {
      const clip = await readClipboardText();

      if (clip.trim().length > 0) {
        setImportDraft(clip.trim());
        setImportError(null);
      } else {
        setImportError('Clipboard is empty.');
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Clipboard access was denied.';

      setImportError(msg);
    }
  };

  const handleImportSubmit = async (): Promise<void> => {
    setIsImporting(true);
    setImportError(null);

    const result = await importLocalSuiWallet(importDraft);

    setIsImporting(false);

    if (!result.ok || result.wallet === null) {
      setImportError(result.error ?? 'Failed to restore Sui wallet.');

      return;
    }

    setWallet(result.wallet);
    setSecrets(null);
    setIsRevealed(false);
    setImportDraft('');
    setTab('OVERVIEW');
    onWalletChanged(result.wallet);
    flashCopied('Wallet Restored!');
  };

  const backendUrl = resolveBackendHttpBaseUrl();

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
              <Text style={styles.headerEyebrow}>SETTINGS · NON-CUSTODIAL</Text>
              <Text style={styles.headerTitle}>Sui Wallet & Recovery</Text>
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
                { key: 'OVERVIEW', label: 'Wallet' },
                { key: 'RECOVERY', label: 'Secret & Key' },
                { key: 'IMPORT', label: 'Import' },
              ] as const
            ).map((item) => {
              const active = tab === item.key;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    setTab(item.key);

                    if (item.key !== 'RECOVERY') {
                      setIsRevealed(false);
                      setSecrets(null);
                    }
                  }}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                >
                  <Text
                    style={[
                      styles.tabPillText,
                      active && styles.tabPillTextActive,
                    ]}
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
            {tab === 'OVERVIEW' && (
              <>
                <View style={styles.card}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.statusPill,
                        liveConnected
                          ? styles.statusPillLive
                          : styles.statusPillOffline,
                      ]}
                    >
                      <Text style={styles.statusPillText}>
                        {liveConnected ? '● Railway Live' : '○ Offline Outbox'}
                      </Text>
                    </View>
                    <View style={styles.schemePill}>
                      <Text style={styles.schemePillText}>
                        {wallet?.isAuthVerified
                          ? 'Ed25519 Verified'
                          : 'Sui Ed25519'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>SUI WALLET ADDRESS</Text>
                  <View style={styles.monoBox}>
                    <Text selectable style={styles.monoText}>
                      {wallet?.suiAddress ?? 'Generating local Sui keypair…'}
                    </Text>
                  </View>

                  <Pressable
                    disabled={wallet === null}
                    onPress={() => {
                      if (wallet !== null) {
                        void handleCopyPublic(
                          wallet.suiAddress,
                          'Sui Address Copied'
                        );
                      }
                    }}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.primaryBtnText}>Copy Sui Address</Text>
                  </Pressable>
                </View>

                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>HOW SIGN-IN WORKS</Text>
                  <Text style={styles.bodyCopy}>
                    Your Sui wallet lives inside your device’s encrypted
                    Keychain / Keystore. When connecting to{' '}
                    <Text style={styles.boldCopy}>{activeTownId}</Text>, your
                    phone signs a one-time challenge locally — your private key
                    never touches the server.
                  </Text>
                  <Text style={styles.endpointCaption} numberOfLines={1}>
                    Server: {backendUrl}
                  </Text>
                  {syncDiag !== null && (
                    <Text style={styles.errorText}>{syncDiag}</Text>
                  )}
                </View>

                <View style={styles.quickRow}>
                  <Pressable
                    onPress={() => {
                      setTab('RECOVERY');
                    }}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.secondaryBtnText}>
                      View Phrase / Private Key
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setTab('IMPORT');
                    }}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.secondaryBtnText}>Import Wallet</Text>
                  </Pressable>
                </View>
              </>
            )}

            {tab === 'RECOVERY' && (
              <>
                <View style={styles.warningCard}>
                  <Text style={styles.warningTitle}>
                    Self-Custody Backup Warning
                  </Text>
                  <Text style={styles.warningBody}>
                    Never share your 12-word Secret Phrase or Private Key with
                    anyone. Store them offline — compatible with Sui Wallet,
                    Slush, Phantom, and Nightly (`m/44&apos;/784&apos;/0&apos;/0&apos;/0&apos;`).
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    void handleToggleReveal();
                  }}
                  style={({ pressed }) => [
                    isRevealed ? styles.secondaryBtnFull : styles.revealBtn,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Text
                    style={
                      isRevealed
                        ? styles.secondaryBtnText
                        : styles.revealBtnText
                    }
                  >
                    {isRevealed
                      ? 'Hide Secret Phrase & Private Key'
                      : 'Tap to Reveal Secret Phrase & Private Key'}
                  </Text>
                </Pressable>

                {isRevealed && secrets !== null && (
                  <>
                    <View style={styles.card}>
                      <Text style={styles.fieldLabel}>
                        12-WORD SECRET RECOVERY PHRASE
                      </Text>
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
                                  'Secret Phrase Copied (Auto-Expires)'
                                );
                              }
                            }}
                            style={({ pressed }) => [
                              styles.primaryBtn,
                              pressed && styles.btnPressed,
                            ]}
                          >
                            <Text style={styles.primaryBtnText}>
                              Copy 12-Word Secret Phrase
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        <Text style={styles.bodyCopy}>
                          This wallet was imported directly from a{' '}
                          <Text style={styles.boldCopy}>suiprivkey1…</Text>{' '}
                          Private Key (no parent 12-word phrase). Back up your
                          Private Key below.
                        </Text>
                      )}
                    </View>

                    <View style={styles.card}>
                      <Text style={styles.fieldLabel}>
                        SUI PRIVATE KEY (BECH32)
                      </Text>
                      <View style={styles.monoBox}>
                        <Text selectable style={styles.monoText}>
                          {secrets.privateKeyBech32}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          void handleCopySecret(
                            secrets.privateKeyBech32,
                            'Private Key Copied (Auto-Expires)'
                          );
                        }}
                        style={({ pressed }) => [
                          styles.secondaryBtnFull,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <Text style={styles.secondaryBtnText}>
                          Copy Private Key (suiprivkey1…)
                        </Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </>
            )}

            {tab === 'IMPORT' && (
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>
                  RESTORE FROM SECRET PHRASE OR PRIVATE KEY
                </Text>
                <Text style={styles.bodyCopy}>
                  Paste a 12-word (or 24-word) Sui Secret Recovery Phrase, or a{' '}
                  <Text style={styles.boldCopy}>suiprivkey1…</Text> Bech32
                  private key to switch accounts on this device.
                </Text>

                <TextInput
                  value={importDraft}
                  onChangeText={(txt) => {
                    setImportDraft(txt);

                    if (importError !== null) {
                      setImportError(null);
                    }
                  }}
                  placeholder="e.g. word1 word2 … word12  OR  suiprivkey1q…"
                  placeholderTextColor={WOOD_THEME.inkMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  style={styles.secretInput}
                />

                {importError !== null && (
                  <Text style={styles.errorText}>{importError}</Text>
                )}

                <View style={styles.quickRow}>
                  <Pressable
                    onPress={() => {
                      void handlePasteClipboard();
                    }}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.secondaryBtnText}>Paste Clipboard</Text>
                  </Pressable>
                  <Pressable
                    disabled={isImporting}
                    onPress={() => {
                      void handleImportSubmit();
                    }}
                    style={({ pressed }) => [
                      styles.primaryBtnFlex,
                      isImporting && styles.btnDisabled,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <Text style={styles.primaryBtnText}>
                      {isImporting ? 'Verifying…' : 'Restore Wallet'}
                    </Text>
                  </Pressable>
                </View>
              </View>
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
    paddingHorizontal: 8,
  },
  tabPillActive: {
    backgroundColor: WOOD_THEME.tabActiveBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.tabActiveBorder,
  },
  tabPillText: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 12,
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
    gap: 9,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillLive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillOffline: {
    backgroundColor: WOOD_THEME.badgeGoldBg,
  },
  statusPillText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  schemePill: {
    backgroundColor: WOOD_THEME.badgeGoldBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.badgeGoldBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  schemePillText: {
    color: WOOD_THEME.badgeGoldText,
    fontSize: 10.5,
    fontWeight: '800',
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
  boldCopy: {
    color: WOOD_THEME.inkPrimary,
    fontWeight: '800',
  },
  endpointCaption: {
    color: WOOD_THEME.inkMuted,
    fontSize: 11,
    fontWeight: '600',
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
  secretInput: {
    minHeight: 88,
    backgroundColor: WOOD_THEME.cardMutedBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: WOOD_THEME.inkPrimary,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  errorText: {
    color: WOOD_THEME.ctaDangerText,
    fontSize: 12,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.ctaWoodBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryBtnFlex: {
    flex: 1,
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
  secondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
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
  btnDisabled: {
    opacity: 0.55,
  },
});
