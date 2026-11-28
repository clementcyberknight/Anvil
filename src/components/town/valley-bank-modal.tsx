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
  borrowPlayerBankLoan,
  depositPlayerSavings,
  loadPlayerCreditReport,
  loadVillagerCreditReport,
  repayPlayerBankLoan,
  triggerAgentBankCycleForVillager,
  withdrawPlayerSavings,
} from '@/game/credit-bank';
import type { TownVillagerProfile } from '@/game/town-villagers';

interface ValleyBankModalProps {
  readonly visible: boolean;
  readonly villagers: readonly TownVillagerProfile[];
  readonly playerCoins: number;
  readonly liveConnected: boolean;
  readonly creditSyncVersion: number;
  readonly remoteBankError: string | null;
  readonly onRequestCreditSync: () => void;
  readonly onStreamBankAction: (
    action: 'DEPOSIT' | 'WITHDRAW' | 'BORROW' | 'REPAY',
    amountFc: number,
    prevLiquidCoinsFc: number
  ) => void;
  readonly onStreamNpcBankCycle: () => boolean;
  readonly onCommitPlayerCoins: (nextCoinsFc: number, toastMsg: string) => void;
  readonly onClose: () => void;
}

type BankTab = 'YOUR_CREDIT' | 'CITIZEN_SCORES';

export function ValleyBankModal({
  visible,
  villagers,
  playerCoins,
  liveConnected,
  creditSyncVersion,
  remoteBankError,
  onRequestCreditSync,
  onStreamBankAction,
  onStreamNpcBankCycle,
  onCommitPlayerCoins,
  onClose,
}: ValleyBankModalProps) {
  const [tab, setTab] = useState<BankTab>('YOUR_CREDIT');
  const [bankError, setBankError] = useState<string | null>(null);
  const [localRefreshTick, setLocalRefreshTick] = useState<number>(0);

  useEffect(() => {
    if (visible) {
      onRequestCreditSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const displayedError = bankError ?? remoteBankError;

  const report = loadPlayerCreditReport(playerCoins);
  const { ledger } = report;

  const applyResult = (
    res: {
      readonly ok: boolean;
      readonly error: string | null;
      readonly nextLiquidCoinsFc: number;
    },
    successMsg: string,
    syncAction?: {
      readonly action: 'DEPOSIT' | 'WITHDRAW' | 'BORROW' | 'REPAY';
      readonly amountFc: number;
    }
  ): void => {
    if (!res.ok) {
      setBankError(res.error ?? 'Bank action declined.');

      return;
    }

    setBankError(null);
    onCommitPlayerCoins(res.nextLiquidCoinsFc, successMsg);

    if (syncAction !== undefined) {
      onStreamBankAction(
        syncAction.action,
        syncAction.amountFc,
        playerCoins
      );
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
              <Text style={styles.eyebrow}>VALLEY BANK & LOANS</Text>
              <Text style={styles.title}>Credit & Savings</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Valley Bank"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            <Pressable
              onPress={() => {
                setTab('YOUR_CREDIT');
              }}
              style={[
                styles.tabPill,
                tab === 'YOUR_CREDIT' && styles.tabPillActive,
              ]}
            >
              <Text
                style={[
                  styles.tabPillText,
                  tab === 'YOUR_CREDIT' && styles.tabPillTextActive,
                ]}
              >
                Your Account
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setTab('CITIZEN_SCORES');
              }}
              style={[
                styles.tabPill,
                tab === 'CITIZEN_SCORES' && styles.tabPillActive,
              ]}
            >
              <Text
                style={[
                  styles.tabPillText,
                  tab === 'CITIZEN_SCORES' && styles.tabPillTextActive,
                ]}
              >
                Citizen Credit (
                {creditSyncVersion + localRefreshTick >= 0
                  ? villagers.length
                  : 0}
                )
              </Text>
            </Pressable>
          </View>

          {displayedError !== null && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{displayedError}</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {tab === 'YOUR_CREDIT' && (
              <>
                <View style={styles.scoreHeroCard}>
                  <View style={styles.scoreRow}>
                    <View>
                      <Text style={styles.scoreLabel}>CREDIT SCORE</Text>
                      <Text style={styles.scoreNumber}>{report.score}</Text>
                    </View>
                    <View style={styles.tierBadge}>
                      <Text style={styles.tierBadgeText}>
                        {report.tier} · {report.interestRatePct}% APR
                      </Text>
                    </View>
                  </View>

                  <View style={styles.factorGrid}>
                    <View style={styles.factorCell}>
                      <Text style={styles.factorTitle}>SAVING</Text>
                      <Text style={styles.factorVal}>{ledger.savingsFc} FC</Text>
                    </View>
                    <View style={styles.factorCell}>
                      <Text style={styles.factorTitle}>EARNED</Text>
                      <Text style={styles.factorVal}>
                        {ledger.totalEarnedFc} FC
                      </Text>
                    </View>
                    <View style={styles.factorCell}>
                      <Text style={styles.factorTitle}>SPENT</Text>
                      <Text style={styles.factorVal}>
                        {ledger.totalSpentFc} FC
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>
                    SAVINGS VAULT ({ledger.savingsFc} FC SAVED)
                  </Text>
                  <Text style={styles.hintText}>
                    Saving coins in the Bank raises your credit score and
                    unlocks larger, lower-interest loans.
                  </Text>
                  <View style={styles.btnRow}>
                    <Pressable
                      disabled={playerCoins < 25}
                      onPress={() => {
                        applyResult(
                          depositPlayerSavings(playerCoins, 25),
                          'Deposited 25 FC into Bank Savings',
                          { action: 'DEPOSIT', amountFc: 25 }
                        );
                      }}
                      style={[
                        styles.primaryBtn,
                        playerCoins < 25 && styles.btnDisabled,
                      ]}
                    >
                      <Text style={styles.primaryBtnText}>Save +25 FC</Text>
                    </Pressable>
                    <Pressable
                      disabled={playerCoins < 100}
                      onPress={() => {
                        applyResult(
                          depositPlayerSavings(playerCoins, 100),
                          'Deposited 100 FC into Bank Savings',
                          { action: 'DEPOSIT', amountFc: 100 }
                        );
                      }}
                      style={[
                        styles.primaryBtn,
                        playerCoins < 100 && styles.btnDisabled,
                      ]}
                    >
                      <Text style={styles.primaryBtnText}>Save +100 FC</Text>
                    </Pressable>
                    <Pressable
                      disabled={ledger.savingsFc <= 0}
                      onPress={() => {
                        const amt = Math.min(50, ledger.savingsFc);

                        applyResult(
                          withdrawPlayerSavings(playerCoins, amt),
                          `Withdrew ${amt} FC from Savings`,
                          { action: 'WITHDRAW', amountFc: amt }
                        );
                      }}
                      style={[
                        styles.secondaryBtn,
                        ledger.savingsFc <= 0 && styles.btnDisabled,
                      ]}
                    >
                      <Text style={styles.secondaryBtnText}>Withdraw</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>
                    BANK LOANS · LIMIT {report.maxLoanLimitFc} FC (OWED{' '}
                    {ledger.loanDebtFc} FC)
                  </Text>
                  <Text style={styles.hintText}>
                    Available to borrow: {report.availableCreditFc} FC. Repaying
                    loans boosts your credit score!
                  </Text>
                  <View style={styles.btnRow}>
                    <Pressable
                      disabled={report.availableCreditFc < 50}
                      onPress={() => {
                        applyResult(
                          borrowPlayerBankLoan(playerCoins, 50),
                          'Borrowed 50 FC from Valley Bank',
                          { action: 'BORROW', amountFc: 50 }
                        );
                      }}
                      style={[
                        styles.goldBtn,
                        report.availableCreditFc < 50 && styles.btnDisabled,
                      ]}
                    >
                      <Text style={styles.goldBtnText}>Borrow 50 FC</Text>
                    </Pressable>
                    <Pressable
                      disabled={report.availableCreditFc < 150}
                      onPress={() => {
                        applyResult(
                          borrowPlayerBankLoan(playerCoins, 150),
                          'Borrowed 150 FC from Valley Bank',
                          { action: 'BORROW', amountFc: 150 }
                        );
                      }}
                      style={[
                        styles.goldBtn,
                        report.availableCreditFc < 150 && styles.btnDisabled,
                      ]}
                    >
                      <Text style={styles.goldBtnText}>Borrow 150 FC</Text>
                    </Pressable>
                  </View>

                  {ledger.loanDebtFc > 0 && (
                    <View style={styles.btnRow}>
                      <Pressable
                        disabled={playerCoins < Math.min(25, ledger.loanDebtFc)}
                        onPress={() => {
                          const pay = Math.min(25, ledger.loanDebtFc);

                          applyResult(
                            repayPlayerBankLoan(playerCoins, pay),
                            `Repaid ${pay} FC toward Bank Loan`,
                            { action: 'REPAY', amountFc: pay }
                          );
                        }}
                        style={[
                          styles.greenBtn,
                          playerCoins < Math.min(25, ledger.loanDebtFc) &&
                            styles.btnDisabled,
                        ]}
                      >
                        <Text style={styles.primaryBtnText}>Repay 25 FC</Text>
                      </Pressable>
                      <Pressable
                        disabled={playerCoins < ledger.loanDebtFc}
                        onPress={() => {
                          applyResult(
                            repayPlayerBankLoan(playerCoins, ledger.loanDebtFc),
                            'Paid off Bank Loan in full!',
                            { action: 'REPAY', amountFc: ledger.loanDebtFc }
                          );
                        }}
                        style={[
                          styles.greenBtn,
                          playerCoins < ledger.loanDebtFc && styles.btnDisabled,
                        ]}
                      >
                        <Text style={styles.primaryBtnText}>
                          Pay Off ({ledger.loanDebtFc} FC)
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </>
            )}

            {tab === 'CITIZEN_SCORES' && (
              <View style={styles.card}>
                <View style={styles.citizenHeaderRow}>
                  <Text style={styles.sectionLabel}>
                    VILLAGER CREDIT & BANK LOANS
                  </Text>
                  <Pressable
                    onPress={() => {
                      const streamed = onStreamNpcBankCycle();

                      if (!streamed) {
                        for (let i = 0; i < villagers.length; i += 1) {
                          triggerAgentBankCycleForVillager(villagers[i]);
                        }

                        setLocalRefreshTick((t) => t + 1);
                      }
                    }}
                    style={styles.miniActionBtn}
                  >
                    <Text style={styles.miniActionText}>
                      {liveConnected ? 'Run Bank Cycle' : 'Run Cycle (Offline)'}
                    </Text>
                  </Pressable>
                </View>

                {villagers.map((vil) => {
                  const vRep = loadVillagerCreditReport(vil);

                  return (
                    <View key={vil.id} style={styles.citizenRow}>
                      <View style={styles.citizenInfo}>
                        <Text style={styles.citizenName}>{vil.name}</Text>
                        <Text style={styles.citizenSub}>
                          Saved {vRep.ledger.savingsFc} FC · Wallet{' '}
                          {vRep.ledger.liquidCoinsFc} FC
                          {vRep.ledger.loanDebtFc > 0
                            ? ` · Loan ${vRep.ledger.loanDebtFc} FC`
                            : ''}
                        </Text>
                      </View>
                      <View style={styles.citizenScoreBadge}>
                        <Text style={styles.citizenScoreText}>
                          {vRep.score} · {vRep.tier}
                        </Text>
                      </View>
                    </View>
                  );
                })}
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
    maxHeight: '86%',
    backgroundColor: WOOD_THEME.sheetBg,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: WOOD_THEME.sheetBorder,
    padding: 16,
    gap: 11,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleCol: {
    gap: 2,
  },
  eyebrow: {
    color: WOOD_THEME.inkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  title: {
    color: WOOD_THEME.inkHeading,
    fontSize: 18,
    fontWeight: '900',
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: WOOD_THEME.sheetDeepBg,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
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
  errorBox: {
    backgroundColor: WOOD_THEME.ctaDangerSoftBg,
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    color: WOOD_THEME.ctaDangerText,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollBody: {
    gap: 11,
    paddingBottom: 6,
  },
  scoreHeroCard: {
    backgroundColor: WOOD_THEME.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    padding: 13,
    gap: 10,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    color: WOOD_THEME.inkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  scoreNumber: {
    color: WOOD_THEME.inkHeading,
    fontSize: 30,
    fontWeight: '900',
  },
  tierBadge: {
    backgroundColor: WOOD_THEME.badgeGoldBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.badgeGoldBorder,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  tierBadgeText: {
    color: WOOD_THEME.badgeGoldText,
    fontSize: 11.5,
    fontWeight: '800',
  },
  factorGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  factorCell: {
    flex: 1,
    backgroundColor: WOOD_THEME.cardMutedBg,
    borderRadius: 10,
    padding: 8,
    gap: 2,
  },
  factorTitle: {
    color: WOOD_THEME.inkMuted,
    fontSize: 9.5,
    fontWeight: '800',
  },
  factorVal: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12.5,
    fontWeight: '800',
  },
  card: {
    backgroundColor: WOOD_THEME.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: WOOD_THEME.cardBorder,
    padding: 13,
    gap: 9,
  },
  sectionLabel: {
    color: WOOD_THEME.inkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  hintText: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 7,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 42,
    backgroundColor: WOOD_THEME.ctaWoodBg,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  primaryBtnText: {
    color: WOOD_THEME.inkOnDark,
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 42,
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderWidth: 1,
    borderColor: WOOD_THEME.cardBorder,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  secondaryBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  goldBtn: {
    flex: 1,
    minHeight: 42,
    backgroundColor: WOOD_THEME.ctaGoldBg,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  goldBtnText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  greenBtn: {
    flex: 1,
    minHeight: 42,
    backgroundColor: WOOD_THEME.ctaGreenBg,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  citizenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniActionBtn: {
    backgroundColor: WOOD_THEME.ctaWoodSoftBg,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  miniActionText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  citizenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: WOOD_THEME.cardBorder,
  },
  citizenInfo: {
    flex: 1,
    gap: 2,
  },
  citizenName: {
    color: WOOD_THEME.inkHeading,
    fontSize: 13,
    fontWeight: '800',
  },
  citizenSub: {
    color: WOOD_THEME.inkSecondary,
    fontSize: 11,
  },
  citizenScoreBadge: {
    backgroundColor: WOOD_THEME.cardMutedBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  citizenScoreText: {
    color: WOOD_THEME.inkPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
});
