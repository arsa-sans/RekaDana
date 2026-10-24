import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  expenseRequests,
  budgetVersions,
  payments,
  paymentReversals,
} from "@/server/db/schema";
import { requireEventAccess, AuthorizationError } from "@/server/authorization/tenant";
import { logAuditEvent } from "@/server/audit/audit.service";

export interface CreateExpenseRequestInput {
  budgetItemId?: string;
  title: string;
  description?: string;
  requestedAmount: string;
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
    .select()
    .from(expenseRequests)
    .where(eq(expenseRequests.eventId, eventId))
    .orderBy(desc(expenseRequests.createdAt));
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
  if (parseFloat(finalApprovedAmount) > parseFloat(request.requestedAmount)) {
    throw new AuthorizationError(
      "Nominal yang disetujui tidak boleh lebih besar dari nominal yang diajukan.",
      "APPROVED_EXCEEDS_REQUESTED",
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
      "Prinsip pemisahan tugas: Pemohon tidak diizinkan menolak/memproses permintaannya sendiri.",
      "SELF_APPROVAL_FORBIDDEN",
      403
    );
  }

  const [rejected] = await db
    .update(expenseRequests)
    .set({
      status: "rejected",
      rejectionReason: reason,
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

  if (request.status !== "approved" && request.status !== "partially_paid") {
    throw new AuthorizationError(
      `Pembayaran hanya dapat dicatat untuk pengeluaran berstatus disetujui atau dibayar sebagian (status saat ini: ${request.status}).`,
      "PAYMENT_NOT_ALLOWED",
      422
    );
  }

  const paymentAmount = parseFloat(input.amount);
  const approvedLimit = parseFloat(request.approvedAmount || "0");

  // Transactional payment posting
  return await db.transaction(async (tx) => {
    // Calculate current net paid
    const prevPayments = await tx
      .select({ id: payments.id, amount: payments.amount, isReversed: payments.isReversed })
      .from(payments)
      .where(eq(payments.expenseRequestId, requestId));

    let currentNetPaid = 0;
    for (const p of prevPayments) {
      if (!p.isReversed) {
        currentNetPaid += parseFloat(p.amount);
      } else {
        const rev = await tx
          .select({ amount: paymentReversals.amount })
          .from(paymentReversals)
          .where(eq(paymentReversals.paymentId, p.id));
        const revSum = rev.reduce((acc, r) => acc + parseFloat(r.amount), 0);
        currentNetPaid += Math.max(0, parseFloat(p.amount) - revSum);
      }
    }

    const newCumulative = currentNetPaid + paymentAmount;
    if (newCumulative > approvedLimit + 0.001) {
      throw new AuthorizationError(
        `Pembayaran melebihi batas persetujuan. Batas disetujui: Rp${approvedLimit.toLocaleString("id-ID")}, telah dibayar: Rp${currentNetPaid.toLocaleString("id-ID")}, sisa yang boleh dibayar: Rp${(approvedLimit - currentNetPaid).toLocaleString("id-ID")}.`,
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

  // Only Bendahara can reverse payments
  const { event } = await requireEventAccess(userId, request.eventId, ["bendahara"]);

  const revAmount = parseFloat(input.amount);
  const origAmount = parseFloat(payment.amount);

  return await db.transaction(async (tx) => {
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
        reason: input.reason,
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
