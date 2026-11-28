/**
 * Valley Bank Loan & Credit Score Engine (`300 – 850`)
 * ----------------------------------------------------
 * Shared credit scoring & lending model for BOTH the Player and NPC Agents
 * driven by three core economic behaviors:
 *   1. Saving (`savingsFc` deposited in Valley Bank + liquid reserve)
 *   2. Earning (`totalEarnedFc` from harvesting, crafting, and trade)
 *   3. Spending & Repayment Discipline (`totalSpentFc`, `loanDebtFc`, `totalRepaidFc`)
 */

import type { TownVillagerProfile } from '@/game/town-villagers';
import { sessionStorage } from '@/lib/storage';

const BANK_KEYS = {
  savingsFc: 'bank.v1.savingsFc',
  totalEarnedFc: 'bank.v1.totalEarnedFc',
  totalSpentFc: 'bank.v1.totalSpentFc',
  loanDebtFc: 'bank.v1.loanDebtFc',
  totalRepaidFc: 'bank.v1.totalRepaidFc',
  loansCleared: 'bank.v1.loansCleared',
  npcDeltaPrefix: 'npc.wallet.v1.',
  npcLoanPrefix: 'npc.loan.v1.',
  npcSavingsPrefix: 'npc.savings.v1.',
  npcEarnedPrefix: 'npc.earned.v1.',
  npcSpentPrefix: 'npc.spent.v1.',
  npcRepaidPrefix: 'npc.repaid.v1.',
  npcClearedPrefix: 'npc.cleared.v1.',
} as const;

export type CreditTierLabel = 'Excellent' | 'Good' | 'Fair' | 'Building';

export interface CreditFinancialLedger {
  readonly liquidCoinsFc: number;
  readonly savingsFc: number;
  readonly totalEarnedFc: number;
  readonly totalSpentFc: number;
  readonly loanDebtFc: number;
  readonly totalRepaidFc: number;
  readonly loansCleared: number;
}

export interface CreditScoreReport {
  readonly score: number;
  readonly tier: CreditTierLabel;
  readonly maxLoanLimitFc: number;
  readonly availableCreditFc: number;
  readonly interestRatePct: number;
  readonly savingsBonusPts: number;
  readonly earningBonusPts: number;
  readonly spendingDisciplinePts: number;
  readonly debtHistoryPts: number;
  readonly ledger: CreditFinancialLedger;
}

export interface BankOperationResult {
  readonly ok: boolean;
  readonly error: string | null;
  readonly nextLiquidCoinsFc: number;
  readonly report: CreditScoreReport;
}

export function computeCreditScoreReport(
  ledger: CreditFinancialLedger
): CreditScoreReport {
  const baseScore = 580;

  // 1. Savings Factor (`0 .. +115`): rewards bank savings + keeping emergency reserves
  const effectiveReserve = ledger.savingsFc + Math.floor(ledger.liquidCoinsFc * 0.25);

  const savingsBonusPts = Math.min(
    115,
    Math.round(Math.sqrt(Math.max(0, effectiveReserve)) * 4.8)
  );

  // 2. Earning Consistency (`0 .. +95`): rewards active work, gathering, and trade income
  const earningBonusPts = Math.min(
    95,
    Math.round(Math.sqrt(Math.max(0, ledger.totalEarnedFc)) * 3.2)
  );

  // 3. Spending Discipline (`-55 .. +45`): healthy spending vs total inflows
  const inflowBasis = Math.max(
    120,
    ledger.totalEarnedFc + ledger.savingsFc + ledger.liquidCoinsFc
  );

  const spendRatio = ledger.totalSpentFc / inflowBasis;
  let spendingDisciplinePts = 20;

  if (spendRatio <= 0.45) {
    spendingDisciplinePts = 45;
  } else if (spendRatio <= 0.75) {
    spendingDisciplinePts = 25;
  } else if (spendRatio > 1.1 && ledger.savingsFc < 20) {
    spendingDisciplinePts = -55;
  } else if (spendRatio > 0.9) {
    spendingDisciplinePts = -20;
  }

  // 4. Repayment History & Active Debt Utilization (`-140 .. +75`)
  const repaidBoost =
    Math.min(55, Math.round(Math.sqrt(Math.max(0, ledger.totalRepaidFc)) * 2.6)) +
    Math.min(20, ledger.loansCleared * 10);

  const debtPenalty =
    ledger.loanDebtFc > 0
      ? Math.min(140, Math.round(ledger.loanDebtFc * 0.28))
      : 0;

  const debtHistoryPts = repaidBoost - debtPenalty;

  const rawScore =
    baseScore +
    savingsBonusPts +
    earningBonusPts +
    spendingDisciplinePts +
    debtHistoryPts;

  const score = Math.max(300, Math.min(850, Math.round(rawScore)));

  let tier: CreditTierLabel = 'Building';
  let maxLoanLimitFc = 90;
  let interestRatePct = 16;

  if (score >= 750) {
    tier = 'Excellent';
    maxLoanLimitFc = 800;
    interestRatePct = 5;
  } else if (score >= 670) {
    tier = 'Good';
    maxLoanLimitFc = 420;
    interestRatePct = 8;
  } else if (score >= 580) {
    tier = 'Fair';
    maxLoanLimitFc = 220;
    interestRatePct = 12;
  }

  const availableCreditFc = Math.max(0, maxLoanLimitFc - ledger.loanDebtFc);

  return {
    score,
    tier,
    maxLoanLimitFc,
    availableCreditFc,
    interestRatePct,
    savingsBonusPts,
    earningBonusPts,
    spendingDisciplinePts,
    debtHistoryPts,
    ledger,
  };
}

export function loadPlayerCreditReport(liquidCoinsFc: number): CreditScoreReport {
  const ledger: CreditFinancialLedger = {
    liquidCoinsFc,
    savingsFc: sessionStorage.getNumber(BANK_KEYS.savingsFc) ?? 0,
    totalEarnedFc: sessionStorage.getNumber(BANK_KEYS.totalEarnedFc) ?? 0,
    totalSpentFc: sessionStorage.getNumber(BANK_KEYS.totalSpentFc) ?? 0,
    loanDebtFc: sessionStorage.getNumber(BANK_KEYS.loanDebtFc) ?? 0,
    totalRepaidFc: sessionStorage.getNumber(BANK_KEYS.totalRepaidFc) ?? 0,
    loansCleared: sessionStorage.getNumber(BANK_KEYS.loansCleared) ?? 0,
  };

  return computeCreditScoreReport(ledger);
}

export function recordPlayerEarning(amountFc: number): void {
  if (amountFc <= 0) {
    return;
  }

  const prev = sessionStorage.getNumber(BANK_KEYS.totalEarnedFc) ?? 0;

  sessionStorage.set(BANK_KEYS.totalEarnedFc, prev + Math.round(amountFc));
}

export function recordPlayerSpending(amountFc: number): void {
  if (amountFc <= 0) {
    return;
  }

  const prev = sessionStorage.getNumber(BANK_KEYS.totalSpentFc) ?? 0;

  sessionStorage.set(BANK_KEYS.totalSpentFc, prev + Math.round(amountFc));
}

export function depositPlayerSavings(
  currentLiquidCoinsFc: number,
  amountFc: number
): BankOperationResult {
  const amt = Math.floor(amountFc);

  if (amt <= 0) {
    return {
      ok: false,
      error: 'Enter an amount greater than 0 FC.',
      nextLiquidCoinsFc: currentLiquidCoinsFc,
      report: loadPlayerCreditReport(currentLiquidCoinsFc),
    };
  }

  if (currentLiquidCoinsFc < amt) {
    return {
      ok: false,
      error: 'Not enough coins in your pouch.',
      nextLiquidCoinsFc: currentLiquidCoinsFc,
      report: loadPlayerCreditReport(currentLiquidCoinsFc),
    };
  }

  const prevSavings = sessionStorage.getNumber(BANK_KEYS.savingsFc) ?? 0;
  const nextLiquid = currentLiquidCoinsFc - amt;

  sessionStorage.set(BANK_KEYS.savingsFc, prevSavings + amt);

  return {
    ok: true,
    error: null,
    nextLiquidCoinsFc: nextLiquid,
    report: loadPlayerCreditReport(nextLiquid),
  };
}

export function withdrawPlayerSavings(
  currentLiquidCoinsFc: number,
  amountFc: number
): BankOperationResult {
  const amt = Math.floor(amountFc);
  const prevSavings = sessionStorage.getNumber(BANK_KEYS.savingsFc) ?? 0;

  if (amt <= 0 || prevSavings < amt) {
    return {
      ok: false,
      error: 'Insufficient bank savings.',
      nextLiquidCoinsFc: currentLiquidCoinsFc,
      report: loadPlayerCreditReport(currentLiquidCoinsFc),
    };
  }

  const nextLiquid = currentLiquidCoinsFc + amt;

  sessionStorage.set(BANK_KEYS.savingsFc, prevSavings - amt);

  return {
    ok: true,
    error: null,
    nextLiquidCoinsFc: nextLiquid,
    report: loadPlayerCreditReport(nextLiquid),
  };
}

export function borrowPlayerBankLoan(
  currentLiquidCoinsFc: number,
  principalFc: number
): BankOperationResult {
  const amt = Math.floor(principalFc);
  const currentReport = loadPlayerCreditReport(currentLiquidCoinsFc);

  if (amt <= 0) {
    return {
      ok: false,
      error: 'Choose a loan amount above 0 FC.',
      nextLiquidCoinsFc: currentLiquidCoinsFc,
      report: currentReport,
    };
  }

  if (amt > currentReport.availableCreditFc) {
    return {
      ok: false,
      error: `Exceeds your ${currentReport.availableCreditFc} FC credit limit (Score ${currentReport.score}).`,
      nextLiquidCoinsFc: currentLiquidCoinsFc,
      report: currentReport,
    };
  }

  const interestFc = Math.max(
    2,
    Math.ceil((amt * currentReport.interestRatePct) / 100)
  );

  const totalDue = currentReport.ledger.loanDebtFc + amt + interestFc;
  const nextLiquid = currentLiquidCoinsFc + amt;

  sessionStorage.set(BANK_KEYS.loanDebtFc, totalDue);

  return {
    ok: true,
    error: null,
    nextLiquidCoinsFc: nextLiquid,
    report: loadPlayerCreditReport(nextLiquid),
  };
}

export function repayPlayerBankLoan(
  currentLiquidCoinsFc: number,
  paymentFc: number
): BankOperationResult {
  const currentDebt = sessionStorage.getNumber(BANK_KEYS.loanDebtFc) ?? 0;

  if (currentDebt <= 0) {
    return {
      ok: false,
      error: 'You have no active bank loan to repay.',
      nextLiquidCoinsFc: currentLiquidCoinsFc,
      report: loadPlayerCreditReport(currentLiquidCoinsFc),
    };
  }

  const pay = Math.min(currentDebt, Math.floor(paymentFc));

  if (pay <= 0 || currentLiquidCoinsFc < pay) {
    return {
      ok: false,
      error: 'Not enough coins in your pouch for this repayment.',
      nextLiquidCoinsFc: currentLiquidCoinsFc,
      report: loadPlayerCreditReport(currentLiquidCoinsFc),
    };
  }

  const nextDebt = currentDebt - pay;
  const nextLiquid = currentLiquidCoinsFc - pay;
  const prevRepaid = sessionStorage.getNumber(BANK_KEYS.totalRepaidFc) ?? 0;

  sessionStorage.set(BANK_KEYS.loanDebtFc, nextDebt);
  sessionStorage.set(BANK_KEYS.totalRepaidFc, prevRepaid + pay);

  if (nextDebt === 0) {
    const prevCleared = sessionStorage.getNumber(BANK_KEYS.loansCleared) ?? 0;

    sessionStorage.set(BANK_KEYS.loansCleared, prevCleared + 1);
  }

  return {
    ok: true,
    error: null,
    nextLiquidCoinsFc: nextLiquid,
    report: loadPlayerCreditReport(nextLiquid),
  };
}

/**
 * Computes & persists each Villager Agent's real-time Wallet + Savings + Loan + Credit Score
 * based on their archetype, saving habits, earnings, spending, and player trades/transfers!
 */
export function loadVillagerWalletCoins(
  villager: TownVillagerProfile,
  liveBackendCoins?: number
): number {
  const base = liveBackendCoins ?? villager.coins;

  const delta =
    sessionStorage.getNumber(`${BANK_KEYS.npcDeltaPrefix}${villager.id}`) ?? 0;

  return Math.max(0, base + delta);
}

export function adjustVillagerWalletCoins(
  villagerId: string,
  deltaFc: number
): void {
  const key = `${BANK_KEYS.npcDeltaPrefix}${villagerId}`;
  const prev = sessionStorage.getNumber(key) ?? 0;

  sessionStorage.set(key, prev + Math.round(deltaFc));
}

export function loadVillagerCreditReport(
  villager: TownVillagerProfile,
  liveBackendCoins?: number
): CreditScoreReport {
  const liquid = loadVillagerWalletCoins(villager, liveBackendCoins);

  const seedSavings =
    villager.role === 'banker' || villager.role === 'mayor'
      ? 420
      : villager.role === 'landlord'
        ? 310
        : villager.role === 'criminal' || villager.role === 'unemployed'
          ? 12
          : 115;

  const seedEarned = Math.round(villager.coins * 1.45);

  const seedSpent =
    villager.role === 'criminal' || villager.role === 'unemployed'
      ? Math.round(seedEarned * 1.05)
      : Math.round(seedEarned * 0.58);

  const defaultLoan =
    villager.role === 'unemployed'
      ? 45
      : villager.role === 'criminal'
        ? 65
        : 0;

  const savingsFc =
    sessionStorage.getNumber(`${BANK_KEYS.npcSavingsPrefix}${villager.id}`) ??
    seedSavings;

  const loanDebtFc =
    sessionStorage.getNumber(`${BANK_KEYS.npcLoanPrefix}${villager.id}`) ??
    defaultLoan;

  const syncedEarned = sessionStorage.getNumber(
    `${BANK_KEYS.npcEarnedPrefix}${villager.id}`
  );

  const syncedSpent = sessionStorage.getNumber(
    `${BANK_KEYS.npcSpentPrefix}${villager.id}`
  );

  const syncedRepaid = sessionStorage.getNumber(
    `${BANK_KEYS.npcRepaidPrefix}${villager.id}`
  );

  const syncedCleared = sessionStorage.getNumber(
    `${BANK_KEYS.npcClearedPrefix}${villager.id}`
  );

  return computeCreditScoreReport({
    liquidCoinsFc: liquid,
    savingsFc,
    totalEarnedFc:
      syncedEarned ?? seedEarned + Math.max(0, liquid - villager.coins),
    totalSpentFc:
      syncedSpent ?? seedSpent + Math.max(0, villager.coins - liquid),
    loanDebtFc,
    totalRepaidFc: syncedRepaid ?? (loanDebtFc === 0 ? 60 : 15),
    loansCleared: syncedCleared ?? (loanDebtFc === 0 ? 1 : 0),
  });
}

export function triggerAgentBankCycleForVillager(
  villager: TownVillagerProfile,
  liveBackendCoins?: number
): CreditScoreReport {
  const report = loadVillagerCreditReport(villager, liveBackendCoins);
  const loanKey = `${BANK_KEYS.npcLoanPrefix}${villager.id}`;
  const savKey = `${BANK_KEYS.npcSavingsPrefix}${villager.id}`;

  if (report.ledger.liquidCoinsFc < 30 && report.availableCreditFc >= 40) {
    const borrowAmt = 40;
    const interest = Math.ceil((borrowAmt * report.interestRatePct) / 100);

    sessionStorage.set(loanKey, report.ledger.loanDebtFc + borrowAmt + interest);
    adjustVillagerWalletCoins(villager.id, borrowAmt);
  } else if (report.ledger.liquidCoinsFc > 260 && report.ledger.loanDebtFc > 0) {
    const repayAmt = Math.min(report.ledger.loanDebtFc, 45);

    sessionStorage.set(loanKey, report.ledger.loanDebtFc - repayAmt);
    adjustVillagerWalletCoins(villager.id, -repayAmt);
  } else if (report.ledger.liquidCoinsFc > 420) {
    sessionStorage.set(savKey, report.ledger.savingsFc + 30);
    adjustVillagerWalletCoins(villager.id, -30);
  }

  return loadVillagerCreditReport(villager, liveBackendCoins);
}

export interface BackendNpcCreditSyncItem {
  readonly npcId: string;
  readonly coins: number;
  readonly savingsFc: number;
  readonly loanDebtFc: number;
  readonly totalEarnedFc?: number;
  readonly totalSpentFc?: number;
  readonly totalRepaidFc?: number;
  readonly loansCleared?: number;
}

export function hydrateSingleVillagerCreditFromIntent(
  villager: TownVillagerProfile,
  coinsAfter: number,
  savingsFc?: number,
  loanDebtFc?: number
): void {
  sessionStorage.set(
    `${BANK_KEYS.npcDeltaPrefix}${villager.id}`,
    Math.round(coinsAfter - villager.coins)
  );

  if (savingsFc !== undefined) {
    sessionStorage.set(
      `${BANK_KEYS.npcSavingsPrefix}${villager.id}`,
      Math.max(0, Math.round(savingsFc))
    );
  }

  if (loanDebtFc !== undefined) {
    sessionStorage.set(
      `${BANK_KEYS.npcLoanPrefix}${villager.id}`,
      Math.max(0, Math.round(loanDebtFc))
    );
  }
}

export function hydratePlayerCreditLedgerFromBackend(
  ledger: CreditFinancialLedger
): void {
  sessionStorage.set(BANK_KEYS.savingsFc, Math.max(0, Math.round(ledger.savingsFc)));
  sessionStorage.set(
    BANK_KEYS.totalEarnedFc,
    Math.max(0, Math.round(ledger.totalEarnedFc))
  );
  sessionStorage.set(
    BANK_KEYS.totalSpentFc,
    Math.max(0, Math.round(ledger.totalSpentFc))
  );
  sessionStorage.set(BANK_KEYS.loanDebtFc, Math.max(0, Math.round(ledger.loanDebtFc)));
  sessionStorage.set(
    BANK_KEYS.totalRepaidFc,
    Math.max(0, Math.round(ledger.totalRepaidFc))
  );
  sessionStorage.set(
    BANK_KEYS.loansCleared,
    Math.max(0, Math.round(ledger.loansCleared))
  );
}

export function hydrateVillagerCreditsFromBackend(
  villagers: readonly TownVillagerProfile[],
  backendRows: readonly BackendNpcCreditSyncItem[]
): void {
  const limit = Math.min(villagers.length, backendRows.length);

  for (let i = 0; i < limit; i += 1) {
    const vil = villagers[i];
    const row = backendRows[i];

    sessionStorage.set(
      `${BANK_KEYS.npcSavingsPrefix}${vil.id}`,
      Math.max(0, Math.round(row.savingsFc))
    );
    sessionStorage.set(
      `${BANK_KEYS.npcLoanPrefix}${vil.id}`,
      Math.max(0, Math.round(row.loanDebtFc))
    );
    sessionStorage.set(
      `${BANK_KEYS.npcDeltaPrefix}${vil.id}`,
      Math.round(row.coins - vil.coins)
    );

    if (row.totalEarnedFc !== undefined) {
      sessionStorage.set(
        `${BANK_KEYS.npcEarnedPrefix}${vil.id}`,
        Math.max(0, Math.round(row.totalEarnedFc))
      );
    }

    if (row.totalSpentFc !== undefined) {
      sessionStorage.set(
        `${BANK_KEYS.npcSpentPrefix}${vil.id}`,
        Math.max(0, Math.round(row.totalSpentFc))
      );
    }

    if (row.totalRepaidFc !== undefined) {
      sessionStorage.set(
        `${BANK_KEYS.npcRepaidPrefix}${vil.id}`,
        Math.max(0, Math.round(row.totalRepaidFc))
      );
    }

    if (row.loansCleared !== undefined) {
      sessionStorage.set(
        `${BANK_KEYS.npcClearedPrefix}${vil.id}`,
        Math.max(0, Math.round(row.loansCleared))
      );
    }
  }
}
