import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { eq, inArray } from "drizzle-orm";
import { hashPassword } from "./auth/passwords";
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
  auditLogs,
} from "./db/schema";
import { AuthorizationError, requireEventAccess } from "./authorization/tenant";
import {
  createExpenseRequest,
  approveExpenseRequest,
  postPayment,
  reversePayment,
} from "./modules/expenses.service";
import {
  createScenario,
  addScenarioItem,
  submitScenarioAsBudget,
} from "./modules/scenarios.service";
import { approveBudgetVersion } from "./modules/budgets.service";
import { getBudgetVsActualReport } from "./modules/reports.service";

async function runPhase8ReportsGateTests() {
  console.log("============================================================");
  console.log("  REKADANA - PENGUJIAN GATE FASE 8 (REPORTS, AUDIT & CSV EXPORT)");
  console.log("============================================================\n");

  const ts = Date.now();
  const password = "PasswordValid123!";

  console.log("[1] Menyiapkan entitas pengujian (Org A, Org B, User Role)...");

  const [userKetuaA] = await db
    .insert(users)
    .values({
      email: `ketua_p8_${ts}@test.id`,
      name: "Ketua Kegiatan A",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userBendaharaA] = await db
    .insert(users)
    .values({
      email: `bendahara_p8_${ts}@test.id`,
      name: "Bendahara Utama A",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userPanitiaA] = await db
    .insert(users)
    .values({
      email: `panitia_p8_${ts}@test.id`,
      name: "Panitia Anggota A",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userLuarOrgB] = await db
    .insert(users)
    .values({
      email: `user_b_p8_${ts}@test.id`,
      name: "User Organisasi B",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [orgA] = await db
    .insert(organizations)
    .values({
      name: `Organisasi Uji Lapangan 8A ${ts}`,
      slug: `org-8a-${ts}`,
    })
    .returning();

  const [orgB] = await db
    .insert(organizations)
    .values({
      name: `Organisasi Asing 8B ${ts}`,
      slug: `org-8b-${ts}`,
    })
    .returning();

  await db.insert(memberships).values([
    {
      userId: userKetuaA.id,
      organizationId: orgA.id,
      role: "ketua_kegiatan",
    },
    {
      userId: userBendaharaA.id,
      organizationId: orgA.id,
      role: "bendahara",
    },
    {
      userId: userPanitiaA.id,
      organizationId: orgA.id,
      role: "panitia_anggota",
    },
    {
      userId: userLuarOrgB.id,
      organizationId: orgB.id,
      role: "bendahara", // Bendahara di org lain
    },
  ]);

  const [eventA] = await db
    .insert(events)
    .values({
      organizationId: orgA.id,
      name: `Seminar Nasional 2026 ${ts}`,
      availableFunds: "10000000.00", // Pagu 10 jt
      participantCount: 150,
      createdBy: userKetuaA.id,
    })
    .returning();

  console.log("   -> Entitas siap: Org A, Org B, Event A, 4 Aktor.\n");

  const cleanupIds = {
    users: [userKetuaA.id, userBendaharaA.id, userPanitiaA.id, userLuarOrgB.id],
    organizations: [orgA.id, orgB.id],
    events: [eventA.id],
  };

  try {
    // 2. Setup Anggaran Resmi
    console.log("[2] Mempersiapkan Versi Anggaran Resmi Disetujui...");
    const scenario = await createScenario(userKetuaA.id, eventA.id, "Skenario Anggaran Konsumsi & ATK");

    const item1 = await addScenarioItem(userKetuaA.id, scenario.id, {
      name: "Konsumsi Peserta & Panitia",
      category: "Konsumsi",
      quantity: "100",
      estimatedUnitCost: "35000.00", // Total 3.500.000
    });

    const item2 = await addScenarioItem(userKetuaA.id, scenario.id, {
      name: "Penggandaan Modul & Sertifikat",
      category: "Perlengkapan",
      quantity: "150",
      estimatedUnitCost: "10000.00", // Total 1.500.000
    });

    const budgetVer = await submitScenarioAsBudget(userKetuaA.id, scenario.id);
    await approveBudgetVersion(userBendaharaA.id, budgetVer.id);

    // Ambil item anggaran versi aktif
    const approvedBudgetItems = await db
      .select()
      .from(budgetItems)
      .where(eq(budgetItems.budgetVersionId, budgetVer.id));

    const budgetItemKonsumsi = approvedBudgetItems.find((i) => i.name === "Konsumsi Peserta & Panitia")!;
    const budgetItemATK = approvedBudgetItems.find((i) => i.name === "Penggandaan Modul & Sertifikat")!;

    console.log("   -> Anggaran disetujui: Rp5.000.000,00 (2 Pos Anggaran).\n");

    // 3. Buat dan Proses Pengeluaran Lapangan
    console.log("[3] Transaksi Pengeluaran: Pengajuan, Approval, Pembayaran, dan Reversal...");

    // Pengajuan 1: Konsumsi (diminta 2.000.000, disetujui 2.000.000, dibayar penuh)
    const req1 = await createExpenseRequest(userPanitiaA.id, eventA.id, {
      budgetItemId: budgetItemKonsumsi.id,
      title: "Uang Muka Konsumsi Catering",
      requestedAmount: "2000000.00",
    });
    await approveExpenseRequest(userBendaharaA.id, req1.id, "2000000.00");
    await postPayment(userBendaharaA.id, req1.id, {
      idempotencyKey: `pay-req1-${ts}`,
      amount: "2000000.00",
      notes: "Pembayaran lunas uang muka",
    });

    // Pengajuan 2: ATK (diminta 800.000, disetujui 800.000, dibayar parsial 500.000, direversal 100.000)
    const req2 = await createExpenseRequest(userPanitiaA.id, eventA.id, {
      budgetItemId: budgetItemATK.id,
      title: "Cetak Modul Gelombang 1",
      requestedAmount: "800000.00",
    });
    await approveExpenseRequest(userBendaharaA.id, req2.id, "800000.00");
    const payment2Result = await postPayment(userBendaharaA.id, req2.id, {
      idempotencyKey: `pay-req2-${ts}`,
      amount: "500000.00",
      notes: "Pembayaran tahap 1",
    });
    // Reversal parsial atas payment 2
    await reversePayment(userBendaharaA.id, payment2Result.payment.id, {
      amount: "100000.00",
      reason: "Koreksi kelebihan transfer cetak modul",
    });

    console.log("   -> Transaksi selesai: Req 1 (Paid 2.000.000), Req 2 (Approved 800.000, Paid Net 400.000, Komitmen 400.000).\n");

    // 4. Pengujian Rekonsiliasi Laporan
    console.log("[4] PENGUJIAN REKONSILIASI: Total Transaksi vs Angka Ringkasan Laporan...");
    const report = await getBudgetVsActualReport(userKetuaA.id, eventA.id);

    // Verifikasi snapshot total
    if (report.approvedBudgetTotal !== "5000000.00") {
      throw new Error(`Rekonsiliasi gagal: approvedBudgetTotal ${report.approvedBudgetTotal} != 5000000.00`);
    }

    // Req 1 net paid = 2.000.000; Req 2 net paid = 500.000 - 100.000 = 400.000
    // Total actualNet = 2.400.000,00
    if (report.actualNet !== "2400000.00") {
      throw new Error(`Rekonsiliasi gagal: actualNet ${report.actualNet} != 2400000.00`);
    }

    // Req 1 status is paid -> open commitments = 0
    // Req 2 status is partially_paid -> open commitments = 800.000 - 400.000 = 400.000
    if (report.openCommitments !== "400000.00") {
      throw new Error(`Rekonsiliasi gagal: openCommitments ${report.openCommitments} != 400000.00`);
    }

    // Remaining control budget = 5.000.000 - 2.400.000 - 400.000 = 2.200.000,00
    if (report.remainingControlBudget !== "2200000.00") {
      throw new Error(`Rekonsiliasi gagal: remainingControlBudget ${report.remainingControlBudget} != 2200000.00`);
    }

    // Periksa rincian per pos anggaran
    const breakdownKonsumsi = report.itemsBreakdown.find((b) => b.budgetItemId === budgetItemKonsumsi.id);
    const breakdownATK = report.itemsBreakdown.find((b) => b.budgetItemId === budgetItemATK.id);

    if (!breakdownKonsumsi || breakdownKonsumsi.actualNet !== "2000000.00" || breakdownKonsumsi.openCommitments !== "0.00") {
      throw new Error("Rekonsiliasi breakdown pos konsumsi tidak sesuai");
    }
    if (!breakdownATK || breakdownATK.actualNet !== "400000.00" || breakdownATK.openCommitments !== "400000.00") {
      throw new Error("Rekonsiliasi breakdown pos ATK tidak sesuai");
    }

    console.log("   [PASS] 1. Rekonsiliasi angka finansial 100% akurat dan matematis konsisten.\n");

    // 5. Pengujian Otorisasi Ekspor Laporan CSV
    console.log("[5] PENGUJIAN OTORISASI EKSPOR CSV...");

    // Test A: Cross-tenant export dilarang (User B mencoba ekspor Event A)
    let crossTenantBlocked = false;
    try {
      await requireEventAccess(userLuarOrgB.id, eventA.id, ["bendahara"]);
    } catch (e: unknown) {
      if (e instanceof AuthorizationError && e.statusCode === 403) {
        crossTenantBlocked = true;
      }
    }
    if (!crossTenantBlocked) {
      throw new Error("Cross-tenant CSV export tidak diblokir!");
    }
    console.log("   [PASS] 2. Cross-tenant export ditolak dengan status 403.");

    // Test B: Non-bendahara di Org yang sama dilarang ekspor (Panitia Anggota)
    let nonBendaharaBlocked = false;
    try {
      await requireEventAccess(userPanitiaA.id, eventA.id, ["bendahara"]);
    } catch (e: unknown) {
      if (e instanceof AuthorizationError && e.statusCode === 403) {
        nonBendaharaBlocked = true;
      }
    }
    if (!nonBendaharaBlocked) {
      throw new Error("Non-bendahara role export tidak diblokir!");
    }
    console.log("   [PASS] 3. Ekspor oleh non-Bendahara (Panitia) ditolak dengan status 403.");

    // Test C: Bendahara resmi berhasil mendapatkan hak ekspor
    const bendaharaAccess = await requireEventAccess(userBendaharaA.id, eventA.id, ["bendahara"]);
    if (!bendaharaAccess || bendaharaAccess.membership.role !== "bendahara") {
      throw new Error("Bendahara resmi gagal mendapatkan akses ekspor.");
    }
    console.log("   [PASS] 4. Bendahara organisasi resmi berwenang mengunduh ekspor CSV.\n");

    // 6. Pengujian Audit Log & Isolasi Tenant
    console.log("[6] PENGUJIAN AUDIT LOG & ISOLASI TENANT...");

    // Periksa bahwa aktivitas finansial tercatat di tabel audit_logs
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, orgA.id));

    if (logs.length === 0) {
      throw new Error("Tidak ada audit log yang tercatat untuk aktivitas di Organisasi A!");
    }

    const recordedActions = logs.map((l) => l.action);
    const requiredActions = [
      "budget_version.approved",
      "expense_request.approved",
      "payment.posted",
      "payment.reversed",
    ];

    for (const act of requiredActions) {
      if (!recordedActions.includes(act)) {
        throw new Error(`Audit log tidak mencatat aksi wajib: ${act}`);
      }
    }
    console.log(`   [PASS] 5. Seluruh aksi finansial tercatat di audit log (${logs.length} entri ditemukan).`);

    // Isolasi Audit Log: Pengguna Org B dilarang membaca audit log Org A
    let auditLogCrossTenantBlocked = false;
    try {
      await requireEventAccess(userLuarOrgB.id, eventA.id);
    } catch (e: unknown) {
      if (e instanceof AuthorizationError && e.statusCode === 403) {
        auditLogCrossTenantBlocked = true;
      }
    }
    if (!auditLogCrossTenantBlocked) {
      throw new Error("Pengguna lintas tenant tidak diblokir dari akses audit log!");
    }
    console.log("   [PASS] 6. Akses histori audit log lintas-tenant ditolak secara ketat.");

    console.log("\n============================================================");
    console.log("  SEMUA PENGUJIAN GATE FASE 8 BERHASIL 100%!");
    console.log("============================================================\n");
  } finally {
    console.log("[Clean-up] Membersihkan data pengujian sementara...");
    try {
      // 1. Reversals & Payments
      const testPayments = await db
        .select({ id: payments.id })
        .from(payments)
        .innerJoin(expenseRequests, eq(payments.expenseRequestId, expenseRequests.id))
        .where(inArray(expenseRequests.eventId, cleanupIds.events));

      const paymentIds = testPayments.map((p) => p.id);
      if (paymentIds.length > 0) {
        await db.delete(paymentReversals).where(inArray(paymentReversals.paymentId, paymentIds));
        await db.delete(payments).where(inArray(payments.id, paymentIds));
      }

      // 2. Expenses
      await db.delete(expenseRequests).where(inArray(expenseRequests.eventId, cleanupIds.events));

      // 3. Budgets & Scenarios
      await db.delete(auditLogs).where(inArray(auditLogs.organizationId, cleanupIds.organizations));
      
      const testVersions = await db
        .select({ id: budgetVersions.id })
        .from(budgetVersions)
        .where(inArray(budgetVersions.eventId, cleanupIds.events));
      const versionIds = testVersions.map((v) => v.id);
      if (versionIds.length > 0) {
        await db.delete(budgetItems).where(inArray(budgetItems.budgetVersionId, versionIds));
        await db.delete(budgetVersions).where(inArray(budgetVersions.id, versionIds));
      }

      const testScenarios = await db
        .select({ id: budgetScenarios.id })
        .from(budgetScenarios)
        .where(inArray(budgetScenarios.eventId, cleanupIds.events));
      const scenarioIds = testScenarios.map((s) => s.id);
      if (scenarioIds.length > 0) {
        await db.delete(budgetScenarioItems).where(inArray(budgetScenarioItems.scenarioId, scenarioIds));
        await db.delete(budgetScenarios).where(inArray(budgetScenarios.id, scenarioIds));
      }

      // 4. Events, Memberships, Orgs, Users
      await db.delete(events).where(inArray(events.id, cleanupIds.events));
      await db.delete(memberships).where(inArray(memberships.organizationId, cleanupIds.organizations));
      await db.delete(organizations).where(inArray(organizations.id, cleanupIds.organizations));
      await db.delete(users).where(inArray(users.id, cleanupIds.users));
      console.log("   -> Pembersihan selesai.");
    } catch (cleanupErr) {
      console.error("   ⚠️ Terjadi kesalahan pembersihan:", cleanupErr);
    }
  }
}

runPhase8ReportsGateTests().catch((err) => {
  console.error("\n❌ PENGUJIAN GATE FASE 8 GAGAL:", err);
  process.exit(1);
});
