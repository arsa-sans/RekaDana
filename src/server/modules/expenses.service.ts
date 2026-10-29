import { eq, and, desc, sql, not, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db";
import {
  expenseRequests,
  budgetVersions,
  budgetItems,
  payments,
  paymentReversals,
  users,
} from "@/server/db/schema";
import { requireEventAccess, AuthorizationError } from "@/server/authorization/tenant";
import { logAuditEvent } from "@/server/audit/audit.service";

const requestedByUser = alias(users, "expense_requested_by_user");
const reviewedByUser = alias(users, "expense_reviewed_by_user");
const postedByUser = alias(users, "payment_posted_by_user");
const reversedByUser = alias(users, "payment_reversed_by_user");

export interface CreateExpenseRequestInput {
  budgetItemId?: string;
  title: string;
  description?: string;
  requestedAmount: string;
}

export interface PaymentWithReversals {
  id: string;
  expenseRequestId: string;
  idempotencyKey: string;
  amount: string;
  isReversed: boolean;
  postedBy: string;
  postedByName: string | null;
  postedAt: Date;
  notes: string | null;
  netAmount: number;
  reversals: {
    id: string;
    paymentId: string;
    amount: string;
    reason: string;
    reversedBy: string;
    reversedByName: string | null;
    reversedAt: Date;
  }[];
}

export interface ExpenseRequestDetailResult {
  request: {
    id: string;
    eventId: string;
    budgetVersionId: string;
    budgetItemId: string | null;
    budgetItemName: string | null;
    budgetItemCategory: string | null;
    requestedBy: string;
    requestedByName: string | null;
    title: string;
    description: string | null;
    requestedAmount: string;
    approvedAmount: string | null;
    status: "draft" | "submitted" | "approved" | "partially_paid" | "paid" | "rejected" | "cancelled";
    reviewedBy: string | null;
    reviewedByName: string | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  payments: PaymentWithReversals[];
  summary: {
    requestedAmount: number;
    approvedAmount: number;
    totalPaidNet: number;
    remainingBalance: number;
    isFullyPaid: boolean;
    isPartiallyPaid: boolean;
  };
}

export async function createExpenseRequest(
  userId: string,
  eventId: string,
  input: CreateExpenseRequestInput
) {
  const { event } = await requireEventAccess(userId, eventId);

  // Must link to currently active approved budget version
  const [activeVersion] = await db
    .select()
    .from(budgetVersions)
    .where(and(eq(budgetVersions.eventId, eventId), eq(budgetVersions.status, "approved")))
    .limit(1);

  if (!activeVersion) {
    throw new AuthorizationError(
      "Kegiatan ini belum memiliki versi anggaran resmi yang disetujui oleh Bendahara.",
      "NO_ACTIVE_BUDGET_VERSION",
      422
    );
  }

  const reqAmount = parseFloat(input.requestedAmount);
  if (isNaN(reqAmount) || reqAmount <= 0) {
    throw new AuthorizationError(
      "Nominal permintaan pengeluaran harus berupa angka positif lebih dari 0.",
      "INVALID_AMOUNT",
      422
    );
  }

  const [request] = await db
    .insert(expenseRequests)
    .values({
      eventId,
      budgetVersionId: activeVersion.id,
      budgetItemId: input.budgetItemId || null,
      requestedBy: userId,
      title: input.title,
      description: input.description || null,
      requestedAmount: input.requestedAmount,
      status: "submitted",
    })
    .returning();

  await logAuditEvent({
    actorId: userId,
    organizationId: event.organizationId,
    action: "expense_request.created",
    objectType: "expense_request",
    objectId: request.id,
    afterState: request as unknown as Record<string, unknown>,
  });

  return request;
}

export async function listExpenseRequests(userId: string, eventId: string) {
  await requireEventAccess(userId, eventId);

  return db
    .select({
      id: expenseRequests.id,
      eventId: expenseRequests.eventId,
      budgetVersionId: expenseRequests.budgetVersionId,
      budgetItemId: expenseRequests.budgetItemId,
      budgetItemName: budgetItems.name,
      requestedBy: expenseRequests.requestedBy,
      requestedByName: requestedByUser.name,
      title: expenseRequests.title,
      description: expenseRequests.description,
      requestedAmount: expenseRequests.requestedAmount,
      approvedAmount: expenseRequests.approvedAmount,
      status: expenseRequests.status,
      reviewedBy: expenseRequests.reviewedBy,
      reviewedByName: reviewedByUser.name,
      reviewedAt: expenseRequests.reviewedAt,
      rejectionReason: expenseRequests.rejectionReason,
      createdAt: expenseRequests.createdAt,
      updatedAt: expenseRequests.updatedAt,
    })
    .from(expenseRequests)
    .leftJoin(budgetItems, eq(expenseRequests.budgetItemId, budgetItems.id))
    .leftJoin(requestedByUser, eq(expenseRequests.requestedBy, requestedByUser.id))
    .leftJoin(reviewedByUser, eq(expenseRequests.reviewedBy, reviewedByUser.id))
    .where(eq(expenseRequests.eventId, eventId))
    .orderBy(desc(expenseRequests.createdAt));
}

export async function getExpenseRequestDetail(
  userId: string,
  requestId: string
): Promise<ExpenseRequestDetailResult> {
  const [request] = await db
    .select({
      id: expenseRequests.id,
      eventId: expenseRequests.eventId,
      budgetVersionId: expenseRequests.budgetVersionId,
      budgetItemId: expenseRequests.budgetItemId,
      budgetItemName: budgetItems.name,
      budgetItemCategory: budgetItems.category,
      requestedBy: expenseRequests.requestedBy,
      requestedByName: requestedByUser.name,
      title: expenseRequests.title,
      description: expenseRequests.description,
      requestedAmount: expenseRequests.requestedAmount,
      approvedAmount: expenseRequests.approvedAmount,
      status: expenseRequests.status,
      reviewedBy: expenseRequests.reviewedBy,
      reviewedByName: reviewedByUser.name,
      reviewedAt: expenseRequests.reviewedAt,
      rejectionReason: expenseRequests.rejectionReason,
      createdAt: expenseRequests.createdAt,
      updatedAt: expenseRequests.updatedAt,
    })
    .from(expenseRequests)
    .leftJoin(budgetItems, eq(expenseRequests.budgetItemId, budgetItems.id))
    .leftJoin(requestedByUser, eq(expenseRequests.requestedBy, requestedByUser.id))
    .leftJoin(reviewedByUser, eq(expenseRequests.reviewedBy, reviewedByUser.id))
    .where(eq(expenseRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new AuthorizationError(
      "Permintaan pengeluaran tidak ditemukan.",
      "EXPENSE_NOT_FOUND",
      404
    );
  }

  await requireEventAccess(userId, request.eventId);

  // Ambil daftar pembayaran dan pembatalannya
  const rawPayments = await db
    .select({
      id: payments.id,
      expenseRequestId: payments.expenseRequestId,
      idempotencyKey: payments.idempotencyKey,
      amount: payments.amount,
      isReversed: payments.isReversed,
      postedBy: payments.postedBy,
      postedByName: postedByUser.name,
      postedAt: payments.postedAt,
      notes: payments.notes,
    })
    .from(payments)
    .leftJoin(postedByUser, eq(payments.postedBy, postedByUser.id))
    .where(eq(payments.expenseRequestId, requestId))
    .orderBy(desc(payments.postedAt));

  const paymentList: PaymentWithReversals[] = [];
  let totalPaidNet = 0;

  for (const p of rawPayments) {
    const rawReversals = await db
      .select({
        id: paymentReversals.id,
        paymentId: paymentReversals.paymentId,
        amount: paymentReversals.amount,
        reason: paymentReversals.reason,
        reversedBy: paymentReversals.reversedBy,
        reversedByName: reversedByUser.name,
        reversedAt: paymentReversals.reversedAt,
      })
      .from(paymentReversals)
      .leftJoin(reversedByUser, eq(paymentReversals.reversedBy, reversedByUser.id))
      .where(eq(paymentReversals.paymentId, p.id))
      .orderBy(desc(paymentReversals.reversedAt));

    const totalRevForP = rawReversals.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const netForP = Math.max(0, parseFloat(p.amount) - totalRevForP);
    totalPaidNet += netForP;

    paymentList.push({
      ...p,
      netAmount: netForP,
      reversals: rawReversals,
    });
  }

  const requestedNum = parseFloat(request.requestedAmount);
  const approvedNum = request.approvedAmount ? parseFloat(request.approvedAmount) : 0;
  const remainingBalance = Math.max(0, approvedNum - totalPaidNet);
  const isFullyPaid = approvedNum > 0 && totalPaidNet >= approvedNum - 0.001;
  const isPartiallyPaid = totalPaidNet > 0 && !isFullyPaid;

  return {
    request,
    payments: paymentList,
    summary: {
      requestedAmount: requestedNum,
      approvedAmount: approvedNum,
      totalPaidNet,
      remainingBalance,
      isFullyPaid,
      isPartiallyPaid,
    },
  };
}

export async function approveExpenseRequest(
  userId: string,
  requestId: string,
  approvedAmount?: string
) {
  const [request] = await db
    .select()
    .from(expenseRequests)
    .where(eq(expenseRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new AuthorizationError("Permintaan pengeluaran tidak ditemukan.", "EXPENSE_NOT_FOUND", 404);
  }

  const { event } = await requireEventAccess(userId, request.eventId, ["bendahara"]);

  // Applicant cannot approve own expense request
  if (request.requestedBy === userId) {
    throw new AuthorizationError(
      "Prinsip pemisahan tugas: Pemohon tidak diizinkan menyetujui permintaan pengeluarannya sendiri.",
      "SELF_APPROVAL_FORBIDDEN",
      403
    );
  }

  if (request.status !== "submitted") {
    throw new AuthorizationError(
      `Hanya pengajuan berstatus 'submitted' yang dapat disetujui (status saat ini: ${request.status}).`,
      "INVALID_STATUS",
      409
    );
  }

  const finalApprovedAmount = approvedAmount || request.requestedAmount;
  const finalApprovedNum = parseFloat(finalApprovedAmount);
  const requestedNum = parseFloat(request.requestedAmount);

  if (isNaN(finalApprovedNum) || finalApprovedNum <= 0) {
    throw new AuthorizationError(
      "Nominal yang disetujui harus berupa angka positif lebih dari 0.",
      "INVALID_AMOUNT",
      422
    );
  }

  if (finalApprovedNum > requestedNum) {
    throw new AuthorizationError(
      "Nominal yang disetujui tidak boleh lebih besar dari nominal yang diajukan.",
      "APPROVED_EXCEEDS_REQUESTED",
      422
    );
  }

  // Over-budget prevention: cek apakah persetujuan ini melebihi sisa anggaran resmi kegiatan
  const [activeBudget] = await db
    .select({ snapshotTotal: budgetVersions.snapshotTotal })
    .from(budgetVersions)
    .where(and(eq(budgetVersions.eventId, request.eventId), eq(budgetVersions.status, "approved")))
    .limit(1);

  if (!activeBudget) {
    throw new AuthorizationError(
      "Kegiatan belum memiliki versi anggaran resmi yang disetujui.",
      "NO_ACTIVE_BUDGET_VERSION",
      422
    );
  }

  const officialBudgetTotal = parseFloat(activeBudget.snapshotTotal);

  // Ambil semua komitmen pengeluaran yang sudah disetujui sebelumnya
  const otherApprovedRequests = await db
    .select({
      id: expenseRequests.id,
      approvedAmount: expenseRequests.approvedAmount,
    })
    .from(expenseRequests)
    .where(
      and(
        eq(expenseRequests.eventId, request.eventId),
        sql`${expenseRequests.status} in ('approved', 'partially_paid', 'paid')`,
        not(eq(expenseRequests.id, requestId))
      )
    );

  let existingCommitments = 0;
  for (const r of otherApprovedRequests) {
    existingCommitments += parseFloat(r.approvedAmount || "0");
  }

  const newTotalCommitted = existingCommitments + finalApprovedNum;
  if (newTotalCommitted > officialBudgetTotal + 0.001) {
    const remainingBudget = Math.max(0, officialBudgetTotal - existingCommitments);
    throw new AuthorizationError(
      `Persetujuan ditolak. Nominal disetujui (Rp${finalApprovedNum.toLocaleString("id-ID")}) melebihi sisa pagu anggaran resmi yang tersedia (Rp${remainingBudget.toLocaleString("id-ID")}).`,
      "OVER_BUDGET_FORBIDDEN",
      422
    );
  }

  const [updated] = await db
    .update(expenseRequests)
    .set({
      status: "approved",
      approvedAmount: finalApprovedAmount,
      reviewedBy: userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(expenseRequests.id, requestId))
    .returning();

  await logAuditEvent({
    actorId: userId,
    organizationId: event.organizationId,
    action: "expense_request.approved",
    objectType: "expense_request",
    objectId: requestId,
    beforeState: request as unknown as Record<string, unknown>,
    afterState: updated as unknown as Record<string, unknown>,
  });

  return updated;
}

export async function rejectExpenseRequest(userId: string, requestId: string, reason: string) {
  const [request] = await db
    .select()
    .from(expenseRequests)
    .where(eq(expenseRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new AuthorizationError("Permintaan pengeluaran tidak ditemukan.", "EXPENSE_NOT_FOUND", 404);
  }

  const { event } = await requireEventAccess(userId, request.eventId, ["bendahara"]);

  if (request.requestedBy === userId) {
    throw new AuthorizationError(
      "Prinsip pemisahan tugas: Pemohon tidak diizinkan menolak atau memproses permintaannya sendiri.",
      "SELF_APPROVAL_FORBIDDEN",
      403
    );
  }

  if (request.status !== "submitted") {
    throw new AuthorizationError(
      `Hanya pengajuan berstatus 'submitted' yang dapat ditolak (status saat ini: ${request.status}).`,
      "INVALID_STATUS",
      409
    );
  }

  const cleanedReason = reason?.trim();
  if (!cleanedReason || cleanedReason.length < 5) {
    throw new AuthorizationError(
      "Alasan penolakan pengeluaran wajib diisi minimal 5 karakter.",
      "VALIDATION_ERROR",
      422
    );
  }

  const [rejected] = await db
    .update(expenseRequests)
    .set({
      status: "rejected",
      rejectionReason: cleanedReason,
      reviewedBy: userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(expenseRequests.id, requestId))
    .returning();

  await logAuditEvent({
    actorId: userId,
    organizationId: event.organizationId,
    action: "expense_request.rejected",
    objectType: "expense_request",
    objectId: requestId,
    beforeState: request as unknown as Record<string, unknown>,
    afterState: rejected as unknown as Record<string, unknown>,
  });

  return rejected;
}

export async function postPayment(
  userId: string,
  requestId: string,
  input: { idempotencyKey: string; amount: string; notes?: string }
) {
  const paymentAmount = parseFloat(input.amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new AuthorizationError(
      "Nominal pembayaran harus berupa angka positif lebih dari 0.",
      "INVALID_AMOUNT",
      422
    );
  }

  // 1. Idempotency check: if key already exists, return previous result or conflict
  const [existingPayment] = await db
    .select()
    .from(payments)
    .where(eq(payments.idempotencyKey, input.idempotencyKey))
    .limit(1);

  if (existingPayment) {
    if (existingPayment.amount === input.amount && existingPayment.expenseRequestId === requestId) {
      return { payment: existingPayment, isDuplicateReplay: true };
    }
    throw new AuthorizationError(
      "Konflik idempotensi: Kunci idempotensi yang sama digunakan untuk payload atau nominal yang berbeda.",
      "IDEMPOTENCY_CONFLICT",
      409
    );
  }

  const [request] = await db
    .select()
    .from(expenseRequests)
    .where(eq(expenseRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new AuthorizationError("Permintaan pengeluaran tidak ditemukan.", "EXPENSE_NOT_FOUND", 404);
  }

  // Only Bendahara can post payments
  const { event } = await requireEventAccess(userId, request.eventId, ["bendahara"]);

  // Concurrency-safe payment posting with row-level lock on expense_requests
  return await db.transaction(async (tx) => {
    // Acquire row-level lock FOR UPDATE on the expense request to prevent race conditions
    const [lockedRequest] = await tx
      .select()
      .from(expenseRequests)
      .where(eq(expenseRequests.id, requestId))
      .for("update")
      .limit(1);

    if (!lockedRequest) {
      throw new AuthorizationError("Permintaan pengeluaran tidak ditemukan.", "EXPENSE_NOT_FOUND", 404);
    }

    if (lockedRequest.status !== "approved" && lockedRequest.status !== "partially_paid") {
      throw new AuthorizationError(
        `Pembayaran hanya dapat dicatat untuk pengeluaran berstatus disetujui atau dibayar sebagian (status saat ini: ${lockedRequest.status}).`,
        "PAYMENT_NOT_ALLOWED",
        422
      );
    }

    const approvedLimit = parseFloat(lockedRequest.approvedAmount || "0");

    // Calculate current net paid in transaction
    const prevPayments = await tx
      .select({ id: payments.id, amount: payments.amount, isReversed: payments.isReversed })
      .from(payments)
      .where(eq(payments.expenseRequestId, requestId));

    let currentNetPaid = 0;
    for (const p of prevPayments) {
      const rev = await tx
        .select({ amount: paymentReversals.amount })
        .from(paymentReversals)
        .where(eq(paymentReversals.paymentId, p.id));
      const revSum = rev.reduce((acc, r) => acc + parseFloat(r.amount), 0);
      currentNetPaid += Math.max(0, parseFloat(p.amount) - revSum);
    }

    const newCumulative = currentNetPaid + paymentAmount;
    if (newCumulative > approvedLimit + 0.001) {
      const remainingAllowed = Math.max(0, approvedLimit - currentNetPaid);
      throw new AuthorizationError(
        `Pembayaran melebihi batas persetujuan. Batas disetujui: Rp${approvedLimit.toLocaleString("id-ID")}, telah dibayar bersih: Rp${currentNetPaid.toLocaleString("id-ID")}, sisa yang boleh dibayar: Rp${remainingAllowed.toLocaleString("id-ID")}.`,
        "OVERPAYMENT_FORBIDDEN",
        422
      );
    }

    const [payment] = await tx
      .insert(payments)
      .values({
        expenseRequestId: requestId,
        idempotencyKey: input.idempotencyKey,
        amount: input.amount,
        postedBy: userId,
        postedAt: new Date(),
        notes: input.notes || null,
      })
      .returning();

    const newStatus = Math.abs(newCumulative - approvedLimit) < 0.01 ? "paid" : "partially_paid";

    await tx
      .update(expenseRequests)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(expenseRequests.id, requestId));

    await logAuditEvent({
      actorId: userId,
      organizationId: event.organizationId,
      action: "payment.posted",
      objectType: "payment",
      objectId: payment.id,
      afterState: payment as unknown as Record<string, unknown>,
    });

    return { payment, isDuplicateReplay: false };
  });
}

export async function reversePayment(
  userId: string,
  paymentId: string,
  input: { amount: string; reason: string }
) {
  const revAmount = parseFloat(input.amount);
  if (isNaN(revAmount) || revAmount <= 0) {
    throw new AuthorizationError(
      "Nominal pembatalan pembayaran harus berupa angka positif lebih dari 0.",
      "INVALID_AMOUNT",
      422
    );
  }

  const cleanedReason = input.reason?.trim();
  if (!cleanedReason || cleanedReason.length < 5) {
    throw new AuthorizationError(
      "Alasan pembatalan (reversal) pembayaran wajib diisi minimal 5 karakter.",
      "VALIDATION_ERROR",
      422
    );
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);

  if (!payment) {
    throw new AuthorizationError("Catatan pembayaran tidak ditemukan.", "PAYMENT_NOT_FOUND", 404);
  }

  const [request] = await db
    .select()
    .from(expenseRequests)
    .where(eq(expenseRequests.id, payment.expenseRequestId))
    .limit(1);

  if (!request) {
    throw new AuthorizationError("Permintaan pengeluaran tidak ditemukan.", "EXPENSE_NOT_FOUND", 404);
  }

  // Only Bendahara can reverse payments
  const { event } = await requireEventAccess(userId, request.eventId, ["bendahara"]);

  const origAmount = parseFloat(payment.amount);

  return await db.transaction(async (tx) => {
    // Acquire row-level lock on payments row
    const [lockedPayment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .for("update")
      .limit(1);

    if (!lockedPayment) {
      throw new AuthorizationError("Catatan pembayaran tidak ditemukan.", "PAYMENT_NOT_FOUND", 404);
    }

    // Check previous reversals on this payment
    const prevReversals = await tx
      .select({ amount: paymentReversals.amount })
      .from(paymentReversals)
      .where(eq(paymentReversals.paymentId, paymentId));

    const totalReversedSoFar = prevReversals.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const remainingToReverse = origAmount - totalReversedSoFar;

    if (revAmount > remainingToReverse + 0.001) {
      throw new AuthorizationError(
        `Nominal pembatalan melebihi sisa transaksi asal yang belum dibatalkan (maksimal: Rp${remainingToReverse.toLocaleString("id-ID")}).`,
        "EXCEEDS_REVERSIBLE_AMOUNT",
        422
      );
    }

    const [reversal] = await tx
      .insert(paymentReversals)
      .values({
        paymentId,
        reversedBy: userId,
        reversedAt: new Date(),
        amount: input.amount,
        reason: cleanedReason,
      })
      .returning();

    // Mark payment isReversed if fully reversed
    if (Math.abs(remainingToReverse - revAmount) < 0.01) {
      await tx
        .update(payments)
        .set({ isReversed: true })
        .where(eq(payments.id, paymentId));
    }

    // Recalculate expense request status
    const allPayments = await tx
      .select({ id: payments.id, amount: payments.amount, isReversed: payments.isReversed })
      .from(payments)
      .where(eq(payments.expenseRequestId, request.id));

    let netRemainingPaid = 0;
    for (const p of allPayments) {
      const pReversals = await tx
        .select({ amount: paymentReversals.amount })
        .from(paymentReversals)
        .where(eq(paymentReversals.paymentId, p.id));
      const pRevSum = pReversals.reduce((acc, r) => acc + parseFloat(r.amount), 0);
      netRemainingPaid += Math.max(0, parseFloat(p.amount) - pRevSum);
    }

    const approvedLimit = parseFloat(request.approvedAmount || "0");
    let nextStatus: "approved" | "partially_paid" | "paid" = "partially_paid";
    if (netRemainingPaid <= 0.01) {
      nextStatus = "approved";
    } else if (Math.abs(netRemainingPaid - approvedLimit) < 0.01) {
      nextStatus = "paid";
    }

    await tx
      .update(expenseRequests)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(expenseRequests.id, request.id));

    await logAuditEvent({
      actorId: userId,
      organizationId: event.organizationId,
      action: "payment.reversed",
      objectType: "payment_reversal",
      objectId: reversal.id,
      afterState: reversal as unknown as Record<string, unknown>,
    });

    return reversal;
  });
}
