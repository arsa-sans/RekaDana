import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  budgetVersions,
  budgetItems,
  expenseRequests,
  payments,
  paymentReversals,
} from "@/server/db/schema";
import { requireEventAccess, AuthorizationError } from "@/server/authorization/tenant";
import { logAuditEvent } from "@/server/audit/audit.service";

export async function listBudgetVersions(userId: string, eventId: string) {
  await requireEventAccess(userId, eventId);

  return db
    .select()
    .from(budgetVersions)
    .where(eq(budgetVersions.eventId, eventId))
    .orderBy(desc(budgetVersions.versionNumber));
}

export async function getBudgetVersionDetail(userId: string, versionId: string) {
  const [version] = await db
    .select()
    .from(budgetVersions)
    .where(eq(budgetVersions.id, versionId))
    .limit(1);

  if (!version) {
    throw new AuthorizationError("Versi anggaran tidak ditemukan.", "BUDGET_VERSION_NOT_FOUND", 404);
  }

  await requireEventAccess(userId, version.eventId);

  const items = await db
    .select()
    .from(budgetItems)
    .where(eq(budgetItems.budgetVersionId, version.id))
    .orderBy(budgetItems.name);

  return {
    version,
    items,
  };
}

export async function approveBudgetVersion(userId: string, versionId: string) {
  const [version] = await db
    .select()
    .from(budgetVersions)
    .where(eq(budgetVersions.id, versionId))
    .limit(1);

  if (!version) {
    throw new AuthorizationError("Versi anggaran tidak ditemukan.", "BUDGET_VERSION_NOT_FOUND", 404);
  }

  // Only Bendahara is authorized to approve
  const { event } = await requireEventAccess(userId, version.eventId, ["bendahara"]);

  // Segregation of duties: applicant cannot approve their own submission
  if (version.submittedBy === userId) {
    throw new AuthorizationError(
      "Prinsip pemisahan tugas: Pemohon tidak diizinkan menyetujui pengajuannya sendiri. Persetujuan harus dilakukan oleh akun Bendahara lain atau pengajuan dialihkan.",
      "SELF_APPROVAL_FORBIDDEN",
      403
    );
  }

  if (version.status !== "submitted") {
    throw new AuthorizationError(
      `Hanya versi berstatus 'submitted' yang dapat disetujui (status saat ini: ${version.status}).`,
      "INVALID_STATUS_TRANSITION",
      409
    );
  }

  // Calculate existing actual_net and open_commitments to prevent negative remaining control
  const newBudgetTotal = parseFloat(version.snapshotTotal);

  const existingRequests = await db
    .select({
      id: expenseRequests.id,
      approvedAmount: expenseRequests.approvedAmount,
      status: expenseRequests.status,
    })
    .from(expenseRequests)
    .where(
      and(
        eq(expenseRequests.eventId, version.eventId),
        sql`${expenseRequests.status} in ('approved', 'partially_paid', 'paid')`
      )
    );

  let totalActualNet = 0;
  let totalOpenCommitments = 0;

  for (const req of existingRequests) {
    const reqApproved = parseFloat(req.approvedAmount || "0");
    const reqPayments = await db
      .select({ amount: payments.amount, isReversed: payments.isReversed, id: payments.id })
      .from(payments)
      .where(eq(payments.expenseRequestId, req.id));

    let netPosted = 0;
    for (const p of reqPayments) {
      if (!p.isReversed) {
        netPosted += parseFloat(p.amount);
      } else {
        const rev = await db
          .select({ amount: paymentReversals.amount })
          .from(paymentReversals)
          .where(eq(paymentReversals.paymentId, p.id));
        const revSum = rev.reduce((acc, r) => acc + parseFloat(r.amount), 0);
        netPosted += Math.max(0, parseFloat(p.amount) - revSum);
      }
    }

    totalActualNet += netPosted;
    if (req.status !== "paid" && req.status !== "cancelled") {
      const remainingCommitment = Math.max(0, reqApproved - netPosted);
      totalOpenCommitments += remainingCommitment;
    }
  }

  const committedTotal = totalActualNet + totalOpenCommitments;
  if (newBudgetTotal < committedTotal) {
    throw new AuthorizationError(
      `Persetujuan ditolak. Total anggaran baru (Rp${newBudgetTotal.toLocaleString("id-ID")}) lebih kecil dari komitmen dan pengeluaran berjalan (Rp${committedTotal.toLocaleString("id-ID")}).`,
      "BUDGET_REDUCTION_EXCEEDS_COMMITMENTS",
      422
    );
  }

  // Atomic activation in a transaction
  return await db.transaction(async (tx) => {
    // Demote any currently approved version to draft/historical
    await tx
      .update(budgetVersions)
      .set({ status: "draft", updatedAt: new Date() })
      .where(and(eq(budgetVersions.eventId, version.eventId), eq(budgetVersions.status, "approved")));

    // Activate this version
    const [approvedVersion] = await tx
      .update(budgetVersions)
      .set({
        status: "approved",
        reviewedBy: userId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(budgetVersions.id, versionId))
      .returning();

    await logAuditEvent({
      actorId: userId,
      organizationId: event.organizationId,
      action: "budget_version.approved",
      objectType: "budget_version",
      objectId: versionId,
      beforeState: version as unknown as Record<string, unknown>,
      afterState: approvedVersion as unknown as Record<string, unknown>,
    });

    return approvedVersion;
  });
}

export async function rejectBudgetVersion(userId: string, versionId: string, reason: string) {
  const [version] = await db
    .select()
    .from(budgetVersions)
    .where(eq(budgetVersions.id, versionId))
    .limit(1);

  if (!version) {
    throw new AuthorizationError("Versi anggaran tidak ditemukan.", "BUDGET_VERSION_NOT_FOUND", 404);
  }

  const { event } = await requireEventAccess(userId, version.eventId, ["bendahara"]);

  if (version.submittedBy === userId) {
    throw new AuthorizationError(
      "Prinsip pemisahan tugas: Pemohon tidak diizinkan menolak/memproses pengajuannya sendiri.",
      "SELF_APPROVAL_FORBIDDEN",
      403
    );
  }

  if (version.status !== "submitted") {
    throw new AuthorizationError(
      `Hanya versi berstatus 'submitted' yang dapat ditolak (status saat ini: ${version.status}).`,
      "INVALID_STATUS_TRANSITION",
      409
    );
  }

  const [rejected] = await db
    .update(budgetVersions)
    .set({
      status: "rejected",
      reviewedBy: userId,
      reviewedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(budgetVersions.id, versionId))
    .returning();

  await logAuditEvent({
    actorId: userId,
    organizationId: event.organizationId,
    action: "budget_version.rejected",
    objectType: "budget_version",
    objectId: versionId,
    beforeState: version as unknown as Record<string, unknown>,
    afterState: rejected as unknown as Record<string, unknown>,
  });

  return rejected;
}
