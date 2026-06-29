// OASIS - Cash Reconciliation and Drawer Settlement Service
// Calculates expected sales totals, process shift closings, and logs immutable settlements in AuditLog

import { db } from '../db';
import { createAuditLog } from './audit.service';

export interface CashSummary {
  entityId: string;
  entityType: 'clinic' | 'pharmacy';
  date: string;
  expectedCash: number;
  expectedCard: number;
  expectedTotal: number;
  salesCount: number;
}

/**
 * Resolves USD commercial exchange rate (default to 36.50 for Managua)
 */
export async function getUsdExchangeRate(): Promise<number> {
  try {
    const rateSetting = await db.globalSetting.findUnique({
      where: { key: 'USD_EXCHANGE_RATE' },
    });
    if (rateSetting?.value) {
      const rate = parseFloat(rateSetting.value);
      if (!isNaN(rate) && rate > 0) return rate;
    }
  } catch (err) {
    console.warn('USD_EXCHANGE_RATE not configured, using default 36.50');
  }
  return 36.50;
}

/**
 * Calculates the expected cash and card sales totals forToday
 */
export async function getCashSummary(
  entityId: string,
  entityType: 'clinic' | 'pharmacy',
  dateStr?: string
): Promise<CashSummary> {
  const targetDate = dateStr ? new Date(dateStr) : new Date();
  const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

  // Find all completed sales for today
  const sales = await db.sale.findMany({
    where: {
      clinicId: entityType === 'clinic' ? entityId : undefined,
      pharmacyId: entityType === 'pharmacy' ? entityId : undefined,
      status: { in: ['completed', 'delivered'] },
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    include: { payments: { include: { paymentMethod: true } } },
  });

  const exchangeRate = await getUsdExchangeRate();
  let expectedCash = 0;
  let expectedCard = 0;

  for (const sale of sales) {
    if (sale.payments && sale.payments.length > 0) {
      for (const pay of sale.payments) {
        const amountInNio = pay.currency === 'USD' ? pay.amount * exchangeRate : pay.amount;
        const methodName = pay.paymentMethod?.name?.toLowerCase() || '';
        const isCash = methodName === 'cash' || methodName.includes('efectivo');
        if (isCash) {
          expectedCash += amountInNio;
        } else {
          expectedCard += amountInNio;
        }
      }
    } else {
      expectedCash += sale.totalAmount;
    }
  }

  return {
    entityId,
    entityType,
    date: startOfDay.toISOString().split('T')[0],
    expectedCash: Math.round(expectedCash * 100) / 100,
    expectedCard: Math.round(expectedCard * 100) / 100,
    expectedTotal: Math.round((expectedCash + expectedCard) * 100) / 100,
    salesCount: sales.length,
  };
}

/**
 * Commits cash drawer reconciliation to Audit Log (Immutable record)
 */
export async function createCashReconciliation(
  userId: string,
  data: {
    entityId: string;
    entityType: 'clinic' | 'pharmacy';
    openingBalance: number;
    actualCash: number;
    actualCard: number;
    notes?: string;
  },
  ipAddress?: string,
  userAgent?: string
) {
  const { entityId, entityType, openingBalance, actualCash, actualCard, notes } = data;

  if (
    isNaN(openingBalance) || isNaN(actualCash) || isNaN(actualCard) ||
    openingBalance < 0 || actualCash < 0 || actualCard < 0
  ) {
    throw new Error('INVALID_AMOUNTS: Balances and declared amounts must be non-negative.');
  }

  // Get Expected totals
  const summary = await getCashSummary(entityId, entityType);

  const totalSystemSales = summary.expectedCash + summary.expectedCard;
  const totalActualDeclared = actualCash + actualCard;
  const expectedCashTotal = openingBalance + summary.expectedCash;
  const discrepancyCash = actualCash - expectedCashTotal;
  const discrepancyCard = actualCard - summary.expectedCard;
  const totalDiscrepancy = discrepancyCash + discrepancyCard;

  let reconciliationStatus = 'conciliated';
  if (totalDiscrepancy > 2) {
    reconciliationStatus = 'surplus'; // Sobrante
  } else if (totalDiscrepancy < -2) {
    reconciliationStatus = 'deficit'; // Faltante
  }

  const settlementDetails = {
    entityId,
    entityType,
    reconciledBy: userId,
    date: summary.date,
    openingBalance,
    systemExpected: {
      cash: summary.expectedCash,
      card: summary.expectedCard,
      totalSales: totalSystemSales,
      totalExpectedDrawerCash: expectedCashTotal,
    },
    actualDeclared: {
      cash: actualCash,
      card: actualCard,
      total: totalActualDeclared,
    },
    discrepancies: {
      cash: Math.round(discrepancyCash * 100) / 100,
      card: Math.round(discrepancyCard * 100) / 100,
      total: Math.round(totalDiscrepancy * 100) / 100,
    },
    status: reconciliationStatus,
    notes: notes || '',
    digitalSettleStamp: `SETTLE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
  };

  const audit = await createAuditLog({
    userId,
    action: 'CASH_DRAWER_SETTLE',
    entityType: entityType === 'clinic' ? 'Clinic' : 'Pharmacy',
    entityId: entityId,
    details: JSON.stringify(settlementDetails),
    ipAddress,
    userAgent,
  });

  return {
    id: audit.id,
    createdAt: audit.createdAt,
    ...settlementDetails,
  };
}

/**
 * Retrieves the historical settlements for a branch
 */
export async function getReconciliationHistory(
  entityId: string,
  entityType: 'clinic' | 'pharmacy'
) {
  const logs = await db.auditLog.findMany({
    where: {
      action: 'CASH_DRAWER_SETTLE',
      entityId: entityId,
      entityType: entityType === 'clinic' ? 'Clinic' : 'Pharmacy',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return logs.map((log) => {
    let parsedDetails = {};
    try {
      if (log.details) {
        parsedDetails = JSON.parse(log.details);
      }
    } catch (e) {
      console.error('Failed to parse reconciliation details:', e);
    }

    return {
      auditId: log.id,
      createdAt: log.createdAt,
      user: log.user,
      ...parsedDetails,
    };
  });
}
