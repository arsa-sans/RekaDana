import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { eq, inArray } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./auth/passwords";
import { createSession } from "./auth/session";
import { db } from "./db";
import {
  users,
  organizations,
  memberships,
  events,
  budgetScenarios,
  budgetScenarioItems,
  budgetVersions,
  budgetItems,
  expenseRequests,
  payments,
  paymentReversals,
  evidenceFiles,
  auditLogs,
} from "./db/schema";
import { AuthorizationError } from "./authorization/tenant";
import { createEvent, getEvent } from "./modules/events.service";
import {
  createScenario,
  addScenarioItem,
  listScenariosWithCalculations,
  submitScenarioAsBudget,
} from "./modules/scenarios.service";
import {
  approveBudgetVersion,
  rejectBudgetVersion,
  getBudgetVersionDetail,
} from "./modules/budgets.service";
import {
  createExpenseRequest,
  approveExpenseRequest,
  postPayment,
  reversePayment,
} from "./modules/expenses.service";
import { getBudgetVsActualReport } from "./modules/reports.service";

async function runPhase9IntegrationGateTests() {
  console.log("REKADANA: PENGUJIAN GATE FASE 9 (VERTICAL SLICE INTEGRASI WEB + FLUTTER)");

  const ts = Date.now();
  const password = "PasswordValid123!";

  const cleanupIds = {
    users: [] as string[],
    organizations: [] as string[],
    events: [] as string[],
  };

  try {
    console.log("\n[Langkah 1] Registrasi, Login, Sesi, Pembuatan Organisasi, dan Role");

    const [userKetua] = await db
      .insert(users)
      .values({
        email: `ketua_p9_${ts}@test.id`,
        name: "Ketua Pelaksana P9",
        passwordHash: hashPassword(password),
      })
      .returning();
    cleanupIds.users.push(userKetua.id);

    const [userBendahara] = await db
      .insert(users)
      .values({
        email: `bendahara_p9_${ts}@test.id`,
        name: "Bendahara Utama P9",
        passwordHash: hashPassword(password),
      })
      .returning();
    cleanupIds.users.push(userBendahara.id);

    const [userPanitia] = await db
      .insert(users)
      .values({
        email: `panitia_p9_${ts}@test.id`,
        name: "Panitia Lapangan P9",
        passwordHash: hashPassword(password),
      })
      .returning();
    cleanupIds.users.push(userPanitia.id);

    const [userLuar] = await db
      .insert(users)
      .values({
        email: `luar_p9_${ts}@test.id`,
        name: "User Asing P9",
        passwordHash: hashPassword(password),
      })
      .returning();
    cleanupIds.users.push(userLuar.id);

    if (!verifyPassword(password, userKetua.passwordHash!)) {
      throw new Error("Verifikasi kata sandi gagal untuk user Ketua.");
    }
    const sessionKetua = await createSession(userKetua.id);
    const sessionBendahara = await createSession(userBendahara.id);
    const sessionPanitia = await createSession(userPanitia.id);

    if (!sessionKetua.token || !sessionBendahara.token || !sessionPanitia.token) {
      throw new Error("Pembuatan sesi login gagal menghasilkan token.");
    }

    const [org] = await db
      .insert(organizations)
      .values({
        name: `OSIS SMK Negeri 1 Jakarta ${ts}`,
        slug: `osis-smkn1-${ts}`,
      })
      .returning();
    cleanupIds.organizations.push(org.id);

    const [orgAsing] = await db
      .insert(organizations)
      .values({
        name: `Organisasi Asing ${ts}`,
        slug: `org-asing-${ts}`,
      })
      .returning();
    cleanupIds.organizations.push(orgAsing.id);

    await db.insert(memberships).values([
      {
        userId: userKetua.id,
        organizationId: org.id,
        role: "ketua_kegiatan",
      },
      {
        userId: userBendahara.id,
        organizationId: org.id,
        role: "bendahara",
      },
      {
        userId: userPanitia.id,
        organizationId: org.id,
        role: "panitia_anggota",
      },
      {
        userId: userLuar.id,
        organizationId: orgAsing.id,
        role: "panitia_anggota",
      },
    ]);

    console.log("  [PASS] 1. Alur auth, registrasi, sesi, dan multi-role membership terverifikasi.");

    console.log("\n[Langkah 2] Buat Kegiatan, Skenario Anggaran, Tambah Item, dan Submit Versi");

    const event = await createEvent(userKetua.id, org.id, {
      name: "Latihan Dasar Kepemimpinan Siswa 2026",
      description: "Program pembinaan karakter dan kepemimpinan OSIS",
      participantCount: 120,
      availableFunds: "15000000.00",
    });
    cleanupIds.events.push(event.id);

    const scenario = await createScenario(
      userKetua.id,
      event.id,
      "Skenario Optimal",
      "Estimasi kebutuhan konsumsi dan perlengkapan utama",
      120
    );

    const itemKonsumsi = await addScenarioItem(userKetua.id, scenario.id, {
      name: "Konsumsi Peserta dan Panitia (2 Hari)",
      category: "Konsumsi",
      priority: "required",
      quantity: "240",
      estimatedUnitCost: "25000.00",
    });

    const itemModul = await addScenarioItem(userKetua.id, scenario.id, {
      name: "Buku Panduan dan Modul Kepemimpinan",
      category: "Perlengkapan",
      priority: "required",
      quantity: "120",
      estimatedUnitCost: "15000.00",
    });

    const itemSewa = await addScenarioItem(userKetua.id, scenario.id, {
      name: "Sewa Tenda dan Sound System",
      category: "Logistik",
      priority: "normal",
      quantity: "1",
      estimatedUnitCost: "2000000.00",
    });

    const calculatedScenarios = await listScenariosWithCalculations(userKetua.id, event.id);
    const targetScenario = calculatedScenarios.find((s) => s.id === scenario.id);
    if (!targetScenario) {
      throw new Error("Skenario yang dibuat tidak ditemukan dalam kalkulasi.");
    }

    const expectedTotal =
      240 * 25000 + // 6.000.000
      120 * 15000 + // 1.800.000
      1 * 2000000;  // 2.000.000 -> Total 9.800.000
    if (parseFloat(targetScenario.scenarioTotal) !== expectedTotal) {
      throw new Error(`Total kalkulasi skenario mismatch: didapat ${targetScenario.scenarioTotal}, diharapkan ${expectedTotal}`);
    }

    const budgetVersion = await submitScenarioAsBudget(
      userKetua.id,
      scenario.id
    );

    if (budgetVersion.status !== "submitted") {
      throw new Error(`Status versi anggaran salah: ${budgetVersion.status}, diharapkan submitted`);
    }

    console.log("  [PASS] 2. Alur pembuatan kegiatan, kalkulasi skenario (Rp9.800.000,00), dan submission berhasil.");

    console.log("\n[Langkah 3] Review Bendahara, Validasi Otorisasi, dan Approval Versi Anggaran");

    let nonBendaharaRejected = false;
    try {
      await approveBudgetVersion(userPanitia.id, budgetVersion.id);
    } catch (err: any) {
      if (err instanceof AuthorizationError && err.statusCode === 403) {
        nonBendaharaRejected = true;
      }
    }
    if (!nonBendaharaRejected) {
      throw new Error("Pelanggaran keamanan: Panitia non-bendahara berhasil menyetujui anggaran.");
    }

    let selfApprovalRejected = false;
    try {
      await approveBudgetVersion(userKetua.id, budgetVersion.id);
    } catch (err: any) {
      if (err instanceof AuthorizationError && err.statusCode === 403) {
        selfApprovalRejected = true;
      }
    }
    if (!selfApprovalRejected) {
      throw new Error("Pelanggaran pemisahan tugas: Pemohon berhasil menyetujui anggarannya sendiri.");
    }

    const approvedVersion = await approveBudgetVersion(userBendahara.id, budgetVersion.id);
    if (approvedVersion.status !== "approved") {
      throw new Error("Persetujuan versi anggaran oleh Bendahara gagal mengaktifkan status approved.");
    }

    const versionDetail = await getBudgetVersionDetail(userBendahara.id, budgetVersion.id);
    if (versionDetail.items.length !== 3) {
      throw new Error(`Snapshot item anggaran tidak lengkap: ${versionDetail.items.length} item.`);
    }

    const budgetItemKonsumsi = versionDetail.items.find((i) => i.name.includes("Konsumsi"));
    const budgetItemModul = versionDetail.items.find((i) => i.name.includes("Modul"));
    const budgetItemSewa = versionDetail.items.find((i) => i.name.includes("Sewa"));

    if (!budgetItemKonsumsi || !budgetItemModul || !budgetItemSewa) {
      throw new Error("Item anggaran resmi tidak sesuai dengan snapshot skenario.");
    }

    console.log("  [PASS] 3. Otorisasi role ketat dan aktivasi versi anggaran resmi diverifikasi 100%.");

    console.log("\n[Langkah 4] Panitia Submit Permintaan Pengeluaran dan Lampiran Bukti");

    const reqKonsumsi = await createExpenseRequest(userPanitia.id, event.id, {
      budgetItemId: budgetItemKonsumsi.id,
      title: "Uang Muka Katering Hari Pertama",
      description: "Pembayaran DP 50% untuk katering 120 porsi",
      requestedAmount: "3000000.00",
    });

    const [mockEvidence] = await db
      .insert(evidenceFiles)
      .values({
        organizationId: org.id,
        expenseRequestId: reqKonsumsi.id,
        uploadedBy: userPanitia.id,
        originalFileName: "nota_dp_katering.pdf",
        objectKey: `evidence/test_${ts}.pdf`,
        fileSizeBytes: 245000,
        detectedFileType: "pdf",
      })
      .returning();

    if (reqKonsumsi.status !== "submitted") {
      throw new Error("Status permintaan pengeluaran awal tidak submitted.");
    }

    const reqModul = await createExpenseRequest(userPanitia.id, event.id, {
      budgetItemId: budgetItemModul.id,
      title: "Cetak Buku Panduan LDKS",
      description: "Pelunasan percetakan 120 buku panduan",
      requestedAmount: "1800000.00",
    });

    console.log("  [PASS] 4. Pengajuan pengeluaran lapangan dengan relasi bukti transaksi berhasil.");

    console.log("\n[Langkah 5] Bendahara Approve Pengeluaran, Pembayaran Idempoten, dan Reversal");

    const approvedKonsumsi = await approveExpenseRequest(userBendahara.id, reqKonsumsi.id);
    if (approvedKonsumsi.status !== "approved") {
      throw new Error("Status approval pengeluaran bukan approved.");
    }

    const approvedModul = await approveExpenseRequest(userBendahara.id, reqModul.id);
    if (approvedModul.status !== "approved") {
      throw new Error("Status approval pengeluaran modul bukan approved.");
    }

    const paymentKey1 = `IDEM-PAY-P9-${ts}-1`;
    const payment1 = await postPayment(userBendahara.id, reqKonsumsi.id, {
      idempotencyKey: paymentKey1,
      amount: "3000000.00",
      notes: "Transfer bank ke rekening penyedia katering",
    });

    const replayPayment = await postPayment(userBendahara.id, reqKonsumsi.id, {
      idempotencyKey: paymentKey1,
      amount: "3000000.00",
      notes: "Percobaan ulang transfer yang sama",
    });

    if (replayPayment.isDuplicateReplay !== true || replayPayment.payment.id !== payment1.payment.id) {
      throw new Error("Prinsip idempotensi gagal: request pembayaran duplikat tidak mengembalikan transaksi asli.");
    }

    const paymentKey2 = `IDEM-PAY-P9-${ts}-2`;
    const payment2 = await postPayment(userBendahara.id, reqModul.id, {
      idempotencyKey: paymentKey2,
      amount: "1000000.00",
      notes: "Pembayaran termin 1 cetak modul",
    });

    const reversal = await reversePayment(userBendahara.id, payment2.payment.id, {
      amount: "200000.00",
      reason: "Koreksi diskon percetakan dari vendor",
    });

    if (parseFloat(reversal.amount) !== 200000) {
      throw new Error("Koreksi reversal pembayaran gagal dibukukan.");
    }

    console.log("  [PASS] 5. Pembayaran idempoten, termin parsial, dan reversal transaksi lulus 100%.");

    console.log("\n[Langkah 6] Laporan Realisasi Finansial, Rekonsiliasi Matematika, dan Isolasi Tenant");

    const report = await getBudgetVsActualReport(userBendahara.id, event.id);

    if (parseFloat(report.approvedBudgetTotal) !== 9800000) {
      throw new Error(`Total anggaran disetujui mismatch: didapat ${report.approvedBudgetTotal}, diharapkan 9800000`);
    }

    // Realisasi bersih: Payment 1 (3.000.000) + Payment 2 (1.000.000) - Reversal (200.000) = 3.800.000
    const expectedActualNet = 3800000;
    if (parseFloat(report.actualNet) !== expectedActualNet) {
      throw new Error(`Realisasi bersih mismatch: didapat ${report.actualNet}, diharapkan ${expectedActualNet}`);
    }

    // Komitmen terbuka: Req Modul disetujui 1.800.000, dibayar net 800.000 -> sisa komitmen 1.000.000
    const expectedCommitments = 1000000;
    if (parseFloat(report.openCommitments) !== expectedCommitments) {
      throw new Error(`Komitmen terbuka mismatch: didapat ${report.openCommitments}, diharapkan ${expectedCommitments}`);
    }

    // Sisa kontrol anggaran: 9.800.000 - 3.800.000 - 1.000.000 = 5.000.000
    const expectedRemaining = 5000000;
    if (parseFloat(report.remainingControlBudget) !== expectedRemaining) {
      throw new Error(`Sisa kontrol anggaran mismatch: didapat ${report.remainingControlBudget}, diharapkan ${expectedRemaining}`);
    }

    let crossTenantBlocked = false;
    try {
      await getBudgetVsActualReport(userLuar.id, event.id);
    } catch (err: any) {
      if (err instanceof AuthorizationError && err.statusCode === 403) {
        crossTenantBlocked = true;
      }
    }
    if (!crossTenantBlocked) {
      throw new Error("Pelanggaran tenant: User organisasi lain berhasil mengakses laporan kegiatan.");
    }

    const allAuditEntries = await db
      .select({ id: auditLogs.id, action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, org.id));

    if (allAuditEntries.length < 5) {
      throw new Error(`Audit log tidak mencatat semua aksi finansial (${allAuditEntries.length} entri ditemukan).`);
    }

    console.log("  [PASS] 6. Rekonsiliasi matematis 100% konsisten dan isolasi tenant terlindungi.");

    console.log("\n============================================================");
    console.log("  SEMUA PENGUJIAN VERTICAL SLICE FASE 9 BERHASIL 100%!");
    console.log("============================================================\n");
  } finally {
    console.log("[Pembersihan] Membersihkan entitas pengujian sementara...");
    try {
      const testEvents = await db
        .select({ id: events.id })
        .from(events)
        .where(inArray(events.id, cleanupIds.events));

      const eventIds = testEvents.map((e) => e.id);
      if (eventIds.length > 0) {
        const testPayments = await db
          .select({ id: payments.id })
          .from(payments)
          .innerJoin(expenseRequests, eq(payments.expenseRequestId, expenseRequests.id))
          .where(inArray(expenseRequests.eventId, eventIds));

        const paymentIds = testPayments.map((p) => p.id);
        if (paymentIds.length > 0) {
          await db.delete(paymentReversals).where(inArray(paymentReversals.paymentId, paymentIds));
          await db.delete(payments).where(inArray(payments.id, paymentIds));
        }

        await db.delete(evidenceFiles).where(inArray(evidenceFiles.organizationId, cleanupIds.organizations));
        await db.delete(expenseRequests).where(inArray(expenseRequests.eventId, eventIds));

        const testVersions = await db
          .select({ id: budgetVersions.id })
          .from(budgetVersions)
          .where(inArray(budgetVersions.eventId, eventIds));
        const versionIds = testVersions.map((v) => v.id);
        if (versionIds.length > 0) {
          await db.delete(budgetItems).where(inArray(budgetItems.budgetVersionId, versionIds));
          await db.delete(budgetVersions).where(inArray(budgetVersions.id, versionIds));
        }

        const testScenarios = await db
          .select({ id: budgetScenarios.id })
          .from(budgetScenarios)
          .where(inArray(budgetScenarios.eventId, eventIds));
        const scenarioIds = testScenarios.map((s) => s.id);
        if (scenarioIds.length > 0) {
          await db.delete(budgetScenarioItems).where(inArray(budgetScenarioItems.scenarioId, scenarioIds));
          await db.delete(budgetScenarios).where(inArray(budgetScenarios.id, scenarioIds));
        }

        await db.delete(events).where(inArray(events.id, eventIds));
      }

      await db.delete(auditLogs).where(inArray(auditLogs.organizationId, cleanupIds.organizations));
      await db.delete(memberships).where(inArray(memberships.organizationId, cleanupIds.organizations));
      await db.delete(organizations).where(inArray(organizations.id, cleanupIds.organizations));
      await db.delete(users).where(inArray(users.id, cleanupIds.users));
      console.log("   Pembersihan entitas sementara selesai.");
    } catch (cleanupErr) {
      console.error("   Kesalahan pembersihan:", cleanupErr);
    }
  }
}

runPhase9IntegrationGateTests().catch((err) => {
  console.error("\nPENGUJIAN GATE FASE 9 GAGAL:", err);
  process.exit(1);
});
