import { eq, and, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db";
import {
  budgetVersions,
  budgetItems,
  expenseRequests,
  payments,
  paymentReversals,
  users,
} from "@/server/db/schema";
import { requireEventAccess, AuthorizationError } from "@/server/authorization/tenant";
import { logAuditEvent } from "@/server/audit/audit.service";

const submitterUsers = alias(users, "submitter_users");
const reviewerUsers = alias(users, "reviewer_users");

export interface BudgetItemDiff {
  name: string;
  category: string | null;
  type: "added" | "removed" | "modified";
  oldQuantity?: string;
  newQuantity?: string;
  oldUnitCost?: string;
  newUnitCost?: string;
  oldTotal?: string;
  newTotal?: string;
  totalDifference?: number;
}

export interface BudgetVersionComparison {
  previousVersionId: string;
  previousVersionNumber: number;
  previousSnapshotTotal: string;
  previousParticipantCount: number;
  deltaTotal: number;
  deltaTotalPercentage: number;
  deltaParticipantCount: number;
  addedItemsCount: number;
  removedItemsCount: number;
  modifiedItemsCount: number;
  diffs: BudgetItemDiff[];
}

export async function listBudgetVersions(userId: string, eventId: string) {
  await requireEventAccess(userId, eventId);

  const versions = await db
    .select({
      id: budgetVersions.id,
      eventId: budgetVersions.eventId,
      sourceScenarioId: budgetVersions.sourceScenarioId,
      versionNumber: budgetVersions.versionNumber,
      status: budgetVersions.status,
      snapshotTotal: budgetVersions.snapshotTotal,
      snapshotParticipantCount: budgetVersions.snapshotParticipantCount,
      snapshotAvailableFunds: budgetVersions.snapshotAvailableFunds,
      submittedBy: budgetVersions.submittedBy,
      submittedByName: submitterUsers.name,
      submittedAt: budgetVersions.submittedAt,
      reviewedBy: budgetVersions.reviewedBy,
      reviewedByName: reviewerUsers.name,
      reviewedAt: budgetVersions.reviewedAt,
      rejectionReason: budgetVersions.rejectionReason,
      createdAt: budgetVersions.createdAt,
      updatedAt: budgetVersions.updatedAt,
    })
    .from(budgetVersions)
    .leftJoin(submitterUsers, eq(budgetVersions.submittedBy, submitterUsers.id))
    .leftJoin(reviewerUsers, eq(budgetVersions.reviewedBy, reviewerUsers.id))
    .where(eq(budgetVersions.eventId, eventId))
    .orderBy(desc(budgetVersions.versionNumber));

  return versions;
}

export async function getBudgetVersionDetail(userId: string, versionId: string) {
  const [version] = await db
    .select({
      id: budgetVersions.id,
      eventId: budgetVersions.eventId,
      sourceScenarioId: budgetVersions.sourceScenarioId,
      versionNumber: budgetVersions.versionNumber,
      status: budgetVersions.status,
      snapshotTotal: budgetVersions.snapshotTotal,
      snapshotParticipantCount: budgetVersions.snapshotParticipantCount,
      snapshotAvailableFunds: budgetVersions.snapshotAvailableFunds,
      submittedBy: budgetVersions.submittedBy,
      submittedByName: submitterUsers.name,
      submittedAt: budgetVersions.submittedAt,
      reviewedBy: budgetVersions.reviewedBy,
      reviewedByName: reviewerUsers.name,
      reviewedAt: budgetVersions.reviewedAt,
      rejectionReason: budgetVersions.rejectionReason,
      createdAt: budgetVersions.createdAt,
      updatedAt: budgetVersions.updatedAt,
    })
    .from(budgetVersions)
    .leftJoin(submitterUsers, eq(budgetVersions.submittedBy, submitterUsers.id))
    .leftJoin(reviewerUsers, eq(budgetVersions.reviewedBy, reviewerUsers.id))
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

  // Perbedaan antar versi (diff snapshot): bandingkan dengan versi sebelumnya jika ada
  let comparison: BudgetVersionComparison | null = null;
  if (version.versionNumber > 1) {
    const [previousVersion] = await db
      .select()
      .from(budgetVersions)
      .where(
        and(
          eq(budgetVersions.eventId, version.eventId),
          eq(budgetVersions.versionNumber, version.versionNumber - 1)
        )
      )
      .limit(1);

    if (previousVersion) {
      const prevItems = await db
        .select()
        .from(budgetItems)
        .where(eq(budgetItems.budgetVersionId, previousVersion.id));

      const prevItemsMap = new Map(prevItems.map((item) => [item.name.toLowerCase().trim(), item]));
      const currentItemsMap = new Map(items.map((item) => [item.name.toLowerCase().trim(), item]));

      const diffs: BudgetItemDiff[] = [];
      let addedCount = 0;
      let removedCount = 0;
      let modifiedCount = 0;

      // 1. Cek item di versi saat ini (baru atau dimodifikasi)
      for (const currItem of items) {
        const key = currItem.name.toLowerCase().trim();
        const prevItem = prevItemsMap.get(key);

        if (!prevItem) {
          addedCount++;
          diffs.push({
            name: currItem.name,
            category: currItem.category,
            type: "added",
            newQuantity: currItem.quantity,
            newUnitCost: currItem.unitCost,
            newTotal: currItem.total,
            totalDifference: parseFloat(currItem.total),
          });
        } else {
          const qtyChanged = parseFloat(prevItem.quantity) !== parseFloat(currItem.quantity);
          const costChanged = parseFloat(prevItem.unitCost) !== parseFloat(currItem.unitCost);
          const totalChanged = parseFloat(prevItem.total) !== parseFloat(currItem.total);

          if (qtyChanged || costChanged || totalChanged) {
            modifiedCount++;
            const diffTotal = parseFloat(currItem.total) - parseFloat(prevItem.total);
            diffs.push({
              name: currItem.name,
              category: currItem.category,
              type: "modified",
              oldQuantity: prevItem.quantity,
              newQuantity: currItem.quantity,
              oldUnitCost: prevItem.unitCost,
              newUnitCost: currItem.unitCost,
              oldTotal: prevItem.total,
              newTotal: currItem.total,
              totalDifference: diffTotal,
            });
          }
        }
      }

      // 2. Cek item yang dihapus dari versi sebelumnya
      for (const prevItem of prevItems) {
        const key = prevItem.name.toLowerCase().trim();
        if (!currentItemsMap.has(key)) {
          removedCount++;
          diffs.push({
            name: prevItem.name,
            category: prevItem.category,
            type: "removed",
            oldQuantity: prevItem.quantity,
            oldUnitCost: prevItem.unitCost,
            oldTotal: prevItem.total,
            totalDifference: -parseFloat(prevItem.total),
          });
        }
      }

      const currentTotal = parseFloat(version.snapshotTotal);
      const prevTotal = parseFloat(previousVersion.snapshotTotal);
      const deltaTotal = currentTotal - prevTotal;
      const deltaPercentage = prevTotal > 0 ? (deltaTotal / prevTotal) * 100 : 0;
      const deltaParticipants =
        (version.snapshotParticipantCount ?? 0) - (previousVersion.snapshotParticipantCount ?? 0);

      comparison = {
        previousVersionId: previousVersion.id,
        previousVersionNumber: previousVersion.versionNumber,
        previousSnapshotTotal: previousVersion.snapshotTotal,
        previousParticipantCount: previousVersion.snapshotParticipantCount ?? 0,
        deltaTotal,
        deltaTotalPercentage: Math.round(deltaPercentage * 100) / 100,
        deltaParticipantCount: deltaParticipants,
        addedItemsCount: addedCount,
        removedItemsCount: removedCount,
        modifiedItemsCount: modifiedCount,
        diffs,
      };
    }
  }

  return {
    version,
    items,
    comparison,
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

  // Hanya role Bendahara yang memiliki wewenang untuk menyetujui anggaran
  const { event } = await requireEventAccess(userId, version.eventId, ["bendahara"]);

  // Prinsip pemisahan tugas (segregation of duties): pemohon dilarang menyetujui pengajuannya sendiri
  if (version.submittedBy === userId) {
    throw new AuthorizationError(
      "Prinsip pemisahan tugas: Pemohon tidak diizinkan menyetujui pengajuannya sendiri. Persetujuan harus dilakukan oleh akun Bendahara lain.",
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

  // Hitung komitmen dan realisasi berjalan untuk mencegah defisit kontrol
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

  // Aktivasi atomik di dalam database transaction untuk mencegah race condition
  return await db.transaction(async (tx) => {
    // Demosi versi yang sedang aktif menjadi draft riwayat
    await tx
      .update(budgetVersions)
      .set({ status: "draft", updatedAt: new Date() })
      .where(and(eq(budgetVersions.eventId, version.eventId), eq(budgetVersions.status, "approved")));

    // Aktifkan versi ini sebagai anggaran resmi
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
      "Prinsip pemisahan tugas: Pemohon tidak diizinkan menolak atau memproses pengajuannya sendiri.",
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

  const cleanedReason = reason?.trim();
  if (!cleanedReason || cleanedReason.length < 5) {
    throw new AuthorizationError(
      "Alasan penolakan wajib diisi minimal 5 karakter.",
      "VALIDATION_ERROR",
      422
    );
  }

  const [rejected] = await db
    .update(budgetVersions)
    .set({
      status: "rejected",
      reviewedBy: userId,
      reviewedAt: new Date(),
      rejectionReason: cleanedReason,
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
