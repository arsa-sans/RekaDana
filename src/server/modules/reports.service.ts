import { eq, and, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  budgetVersions,
  budgetItems,
  expenseRequests,
  payments,
  paymentReversals,
} from "@/server/db/schema";
import { requireEventAccess } from "@/server/authorization/tenant";

export interface BudgetVsActualReport {
  eventId: string;
  eventName: string;
  availableFunds: string;
  hasActiveBudget: boolean;
  activeBudgetVersionNumber: number | null;
  approvedBudgetTotal: string;
  actualNet: string;
  openCommitments: string;
  remainingControlBudget: string;
  itemsBreakdown: Array<{
    budgetItemId: string;
    name: string;
    category: string | null;
    budgetTotal: string;
    actualNet: string;
    openCommitments: string;
    remaining: string;
  }>;
}

export async function getBudgetVsActualReport(
  userId: string,
  eventId: string
): Promise<BudgetVsActualReport> {
  const { event } = await requireEventAccess(userId, eventId);

  // 1. Get active approved budget version
  const [activeVersion] = await db
    .select()
    .from(budgetVersions)
    .where(and(eq(budgetVersions.eventId, eventId), eq(budgetVersions.status, "approved")))
    .limit(1);

  if (!activeVersion) {
    return {
      eventId: event.id,
      eventName: event.name,
      availableFunds: event.availableFunds,
      hasActiveBudget: false,
      activeBudgetVersionNumber: null,
      approvedBudgetTotal: "0.00",
      actualNet: "0.00",
      openCommitments: "0.00",
      remainingControlBudget: "0.00",
      itemsBreakdown: [],
    };
  }

  const items = await db
    .select()
    .from(budgetItems)
    .where(eq(budgetItems.budgetVersionId, activeVersion.id))
    .orderBy(budgetItems.name);

  // 2. Fetch all relevant expense requests
  const requests = await db
    .select()
    .from(expenseRequests)
    .where(
      and(
        eq(expenseRequests.eventId, eventId),
        sql`${expenseRequests.status} in ('approved', 'partially_paid', 'paid')`
      )
    );

  // Map request calculations
  const requestMap = new Map<string, { netPaid: number; remainingCommitment: number; budgetItemId: string | null }>();

  let overallActualNet = 0;
  let overallOpenCommitments = 0;

  for (const req of requests) {
    const reqApproved = parseFloat(req.approvedAmount || "0");
    const reqPayments = await db
      .select({ id: payments.id, amount: payments.amount, isReversed: payments.isReversed })
      .from(payments)
      .where(eq(payments.expenseRequestId, req.id));

    let netPosted = 0;
    for (const p of reqPayments) {
      const pReversals = await db
        .select({ amount: paymentReversals.amount })
        .from(paymentReversals)
        .where(eq(paymentReversals.paymentId, p.id));
      const revSum = pReversals.reduce((acc, r) => acc + parseFloat(r.amount), 0);
      netPosted += Math.max(0, parseFloat(p.amount) - revSum);
    }

    const commitment = req.status !== "paid" && req.status !== "cancelled"
      ? Math.max(0, reqApproved - netPosted)
      : 0;

    overallActualNet += netPosted;
    overallOpenCommitments += commitment;

    requestMap.set(req.id, {
      netPaid: netPosted,
      remainingCommitment: commitment,
      budgetItemId: req.budgetItemId,
    });
  }

  // 3. Breakdown per budget item
  const itemsBreakdown = items.map((bItem) => {
    const bTotal = parseFloat(bItem.total);
    let itemNetPaid = 0;
    let itemCommitment = 0;

    for (const [, reqData] of requestMap.entries()) {
      if (reqData.budgetItemId === bItem.id) {
        itemNetPaid += reqData.netPaid;
        itemCommitment += reqData.remainingCommitment;
      }
    }

    const remaining = bTotal - itemNetPaid - itemCommitment;

    return {
      budgetItemId: bItem.id,
      name: bItem.name,
      category: bItem.category,
      budgetTotal: bItem.total,
      actualNet: itemNetPaid.toFixed(2),
      openCommitments: itemCommitment.toFixed(2),
      remaining: remaining.toFixed(2),
    };
  });

  const approvedBudgetTotalNum = parseFloat(activeVersion.snapshotTotal);
  const remainingControlBudgetNum = approvedBudgetTotalNum - overallActualNet - overallOpenCommitments;

  return {
    eventId: event.id,
    eventName: event.name,
    availableFunds: event.availableFunds,
    hasActiveBudget: true,
    activeBudgetVersionNumber: activeVersion.versionNumber,
    approvedBudgetTotal: approvedBudgetTotalNum.toFixed(2),
    actualNet: overallActualNet.toFixed(2),
    openCommitments: overallOpenCommitments.toFixed(2),
    remainingControlBudget: remainingControlBudgetNum.toFixed(2),
    itemsBreakdown,
  };
}
