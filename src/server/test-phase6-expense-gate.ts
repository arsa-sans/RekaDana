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
import { AuthorizationError } from "./authorization/tenant";
import {
  createExpenseRequest,
  getExpenseRequestDetail,
  approveExpenseRequest,
  rejectExpenseRequest,
  postPayment,
  reversePayment,
} from "./modules/expenses.service";
import {
  createScenario,
  addScenarioItem,
  submitScenarioAsBudget,
} from "./modules/scenarios.service";
import { approveBudgetVersion } from "./modules/budgets.service";

async function runPhase6ExpenseGateTests() {
  console.log("============================================================");
  console.log("  REKADANA - PENGUJIAN GATE FASE 6 (EXPENSES, PAYMENTS, REVERSAL)");
  console.log("============================================================\n");

  const ts = Date.now();
  const password = "PasswordValid123!";

  // 1. Setup Entitas Uji
  console.log("[1] Menyiapkan entitas pengujian (Org A, Org B, Ketua, 2 Bendahara, Panitia)...");

  const [userKetuaA] = await db
    .insert(users)
    .values({
      email: `ketua_p6_${ts}@test.id`,
      name: "Ketua Kegiatan A",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userBendaharaA1] = await db
    .insert(users)
    .values({
      email: `bendahara1_p6_${ts}@test.id`,
      name: "Bendahara A1 (Pemohon)",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userBendaharaA2] = await db
    .insert(users)
    .values({
      email: `bendahara2_p6_${ts}@test.id`,
      name: "Bendahara A2 (Reviewer Independen)",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userPanitiaA] = await db
    .insert(users)
    .values({
      email: `panitia_p6_${ts}@test.id`,
      name: "Panitia Anggota A",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userBendaharaB] = await db
    .insert(users)
    .values({
      email: `bendahara_b_p6_${ts}@test.id`,
      name: "Bendahara Org B (Tenant Lain)",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [orgA] = await db
    .insert(organizations)
    .values({
      name: `OSIS SMKN 1 Test P6 ${ts}`,
      slug: `osis-smkn1-p6-${ts}`,
    })
    .returning();

  const [orgB] = await db
    .insert(organizations)
    .values({
      name: `Pramuka SMKN 2 Test P6 ${ts}`,
      slug: `pramuka-smkn2-p6-${ts}`,
    })
    .returning();

  // Memberships Org A
  await db.insert(memberships).values([
    { userId: userKetuaA.id, organizationId: orgA.id, role: "ketua_kegiatan" },
    { userId: userBendaharaA1.id, organizationId: orgA.id, role: "bendahara" },
    { userId: userBendaharaA2.id, organizationId: orgA.id, role: "bendahara" },
    { userId: userPanitiaA.id, organizationId: orgA.id, role: "panitia_anggota" },
  ]);

  // Membership Org B
  await db.insert(memberships).values([
    { userId: userBendaharaB.id, organizationId: orgB.id, role: "bendahara" },
  ]);

  // Events: Event A1 (siap anggaran) & Event A2 (tanpa anggaran)
  const [eventA1] = await db
    .insert(events)
    .values({
      organizationId: orgA.id,
      name: `Pentas Seni P6 ${ts}`,
      description: "Kegiatan dengan anggaran resmi aktif",
      participantCount: 200,
      availableFunds: "1000000.00",
      createdBy: userKetuaA.id,
    })
    .returning();

  const [eventA2] = await db
    .insert(events)
    .values({
      organizationId: orgA.id,
      name: `Bazar Tanpa Anggaran P6 ${ts}`,
      description: "Kegiatan tanpa anggaran resmi",
      participantCount: 50,
      availableFunds: "0.00",
      createdBy: userKetuaA.id,
    })
    .returning();

  // Siapkan Budget Resmi untuk Event A1: Total Rp 1.000.000 (Konsumsi Rp 600.000, Transport Rp 400.000)
  const sc1 = await createScenario(userKetuaA.id, eventA1.id, "Skenario P6 Utama", "Skenario awal", 200);
  const itemKonsumsi = await addScenarioItem(userKetuaA.id, sc1.id, {
    name: "Snack & Makan Siang",
    category: "Konsumsi",
    priority: "required",
    quantity: "200",
    estimatedUnitCost: "3000.00", // Total Rp 600.000
  });
  await addScenarioItem(userKetuaA.id, sc1.id, {
    name: "Transportasi Logistik",
    category: "Transport",
    priority: "normal",
    quantity: "4",
    estimatedUnitCost: "100000.00", // Total Rp 400.000
  });

  const submittedVersion = await submitScenarioAsBudget(userKetuaA.id, sc1.id);
  const approvedBudget = await approveBudgetVersion(userBendaharaA1.id, submittedVersion.id);

  console.log(`  ✓ Entitas uji siap. Event A1 ID: ${eventA1.id}`);
  console.log(`  ✓ Versi Anggaran Resmi Aktif: ${approvedBudget.versionNumber} (Total Pagu: Rp 1.000.000)\n`);

  try {
    // -------------------------------------------------------------
    // TEST 1: Gagal Buat Pengeluaran Tanpa Anggaran Resmi Aktif
    // -------------------------------------------------------------
    console.log("[TEST 1] Memastikan pengajuan pengeluaran gagal jika belum ada anggaran resmi aktif...");
    try {
      await createExpenseRequest(userPanitiaA.id, eventA2.id, {
        title: "Beli Perlengkapan Bazar",
        requestedAmount: "150000.00",
      });
      throw new Error("FAIL: Berhasil membuat pengeluaran tanpa anggaran resmi aktif!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "NO_ACTIVE_BUDGET_VERSION") {
        console.log("  ✓ Ditolak sesuai aturan: NO_ACTIVE_BUDGET_VERSION (Status 422)");
        console.log(`  ✓ Pesan: ${err.message}`);
      } else {
        throw err;
      }
    }
    console.log("  ✓ Test 1 LULUS.\n");

    // -------------------------------------------------------------
    // TEST 2: Role Authorization & Self-Approval Prevention
    // -------------------------------------------------------------
    console.log("[TEST 2] Memastikan role permissions & proteksi self-approval...");
    // Panitia membuat permintaan pengeluaran #1
    const expense1 = await createExpenseRequest(userPanitiaA.id, eventA1.id, {
      title: "Pemesanan Snack Panitia",
      description: "Snack 50 kotak untuk gladi resik",
      requestedAmount: "250000.00",
      budgetItemId: undefined,
    });
    console.log(`  ✓ Permintaan #1 dibuat oleh Panitia: ID ${expense1.id} (Rp 250.000)`);

    // Panitia mencoba menyetujui -> Ditolak (403)
    try {
      await approveExpenseRequest(userPanitiaA.id, expense1.id, "250000.00");
      throw new Error("FAIL: Panitia berhasil menyetujui pengeluaran!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "INSUFFICIENT_ROLE_PERMISSIONS") {
        console.log("  ✓ Panitia ditolak: INSUFFICIENT_ROLE_PERMISSIONS (403)");
      } else {
        throw err;
      }
    }

    // Ketua mencoba menyetujui -> Ditolak (403: Hanya Bendahara)
    try {
      await approveExpenseRequest(userKetuaA.id, expense1.id, "250000.00");
      throw new Error("FAIL: Ketua berhasil menyetujui pengeluaran!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "INSUFFICIENT_ROLE_PERMISSIONS") {
        console.log("  ✓ Ketua ditolak: INSUFFICIENT_ROLE_PERMISSIONS (403)");
      } else {
        throw err;
      }
    }

    // Bendahara B (tenant lain) mencoba menyetujui -> Ditolak (403)
    try {
      await approveExpenseRequest(userBendaharaB.id, expense1.id, "250000.00");
      throw new Error("FAIL: Cross-tenant Bendahara berhasil menyetujui!");
    } catch (err) {
      if (err instanceof AuthorizationError) {
        console.log(`  ✓ Bendahara Tenant Lain ditolak: ${err.code} (403)`);
      } else {
        throw err;
      }
    }

    // Bendahara A1 membuat permintaan pengeluaran #2
    const expense2 = await createExpenseRequest(userBendaharaA1.id, eventA1.id, {
      title: "Pembelian ATK & Kwitansi",
      description: "Kebutuhan administrasi bendahara",
      requestedAmount: "100000.00",
    });

    // Bendahara A1 mencoba menyetujui pengajuannya sendiri -> Ditolak (403: SELF_APPROVAL_FORBIDDEN)
    try {
      await approveExpenseRequest(userBendaharaA1.id, expense2.id, "100000.00");
      throw new Error("FAIL: Bendahara A1 berhasil menyetujui pengajuannya sendiri!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "SELF_APPROVAL_FORBIDDEN") {
        console.log("  ✓ Self-approval ditolak: SELF_APPROVAL_FORBIDDEN (403)");
        console.log(`  ✓ Pesan: ${err.message}`);
      } else {
        throw err;
      }
    }

    // Reviewer independen (Bendahara A2) menyetujui permintaan #2 -> Sukses
    const approvedExpense2 = await approveExpenseRequest(userBendaharaA2.id, expense2.id, "100000.00");
    console.log(`  ✓ Bendahara A2 berhasil menyetujui pengajuan Bendahara A1 (Status: ${approvedExpense2.status})`);
    console.log("  ✓ Test 2 LULUS.\n");

    // -------------------------------------------------------------
    // TEST 3: Over-Budget Protection & Negative Amount Validation
    // -------------------------------------------------------------
    console.log("[TEST 3] Memastikan proteksi Over-Budget & Validasi Nominal...");
    // Pagu total = Rp 1.000.000.
    // expense2 sudah disetujui Rp 100.000. Sisa kapasitas pagu = Rp 900.000.
    // Buat permintaan #3 sebesar Rp 950.000 (total komitmen jika disetujui = 100.000 + 950.000 = 1.050.000 > 1.000.000)
    const expense3 = await createExpenseRequest(userPanitiaA.id, eventA1.id, {
      title: "Sewa Sound System Mewah",
      requestedAmount: "950000.00",
    });

    try {
      await approveExpenseRequest(userBendaharaA1.id, expense3.id, "950000.00");
      throw new Error("FAIL: Persetujuan over-budget berhasil lolos!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "OVER_BUDGET_FORBIDDEN") {
        console.log("  ✓ Over-budget ditolak: OVER_BUDGET_FORBIDDEN (422)");
        console.log(`  ✓ Pesan: ${err.message}`);
      } else {
        throw err;
      }
    }

    // Validasi nominal <= 0
    try {
      await approveExpenseRequest(userBendaharaA1.id, expense3.id, "-50000.00");
      throw new Error("FAIL: Persetujuan dengan nominal negatif berhasil lolos!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "INVALID_AMOUNT") {
        console.log("  ✓ Nominal negatif ditolak: INVALID_AMOUNT (422)");
      } else {
        throw err;
      }
    }

    // Setujui expense1 dengan nominal pas Rp 200.000 (< requested Rp 250.000)
    const approvedExpense1 = await approveExpenseRequest(userBendaharaA1.id, expense1.id, "200000.00");
    console.log(`  ✓ Permintaan #1 disetujui sebesar Rp ${approvedExpense1.approvedAmount} (Status: ${approvedExpense1.status})`);
    console.log("  ✓ Test 3 LULUS.\n");

    // -------------------------------------------------------------
    // TEST 4: Partial Payment & Sisa Saldo (Remaining Balance)
    // -------------------------------------------------------------
    console.log("[TEST 4] Menguji pembayaran bertahap (partial payment) & saldo sisa...");
    // expense1 disetujui Rp 200.000. Bayar tahap 1: Rp 75.000
    const payment1 = await postPayment(userBendaharaA1.id, expense1.id, {
      idempotencyKey: `PAY-P6-1-${ts}`,
      amount: "75000.00",
      notes: "DP Konsumsi 75rb",
    });

    console.log(`  ✓ Pembayaran tahap 1 dicatat: Rp ${payment1.payment.amount} (isDuplicateReplay: ${payment1.isDuplicateReplay})`);

    // Ambil detail pengeluaran untuk verifikasi status & sisa saldo
    const detailAfterPay1 = await getExpenseRequestDetail(userKetuaA.id, expense1.id);
    console.log(`  ✓ Status sekarang: ${detailAfterPay1.request.status}`);
    console.log(`  ✓ Total Net Dibayar: Rp ${detailAfterPay1.summary.totalPaidNet}`);
    console.log(`  ✓ Sisa Saldo Belum Dibayar: Rp ${detailAfterPay1.summary.remainingBalance}`);

    if (detailAfterPay1.request.status !== "partially_paid") {
      throw new Error(`FAIL: Status harusnya partially_paid, bukan ${detailAfterPay1.request.status}`);
    }
    if (detailAfterPay1.summary.remainingBalance !== 125000) {
      throw new Error(`FAIL: Sisa saldo harusnya 125000, bukan ${detailAfterPay1.summary.remainingBalance}`);
    }
    console.log("  ✓ Test 4 LULUS.\n");

    // -------------------------------------------------------------
    // TEST 5: Overpayment Prevention
    // -------------------------------------------------------------
    console.log("[TEST 5] Menguji proteksi Overpayment (nominal bayar > sisa saldo)...");
    // Sisa saldo adalah Rp 125.000. Mencoba bayar Rp 150.000 -> Ditolak (422)
    try {
      await postPayment(userBendaharaA1.id, expense1.id, {
        idempotencyKey: `PAY-OVER-${ts}`,
        amount: "150000.00",
      });
      throw new Error("FAIL: Overpayment berhasil dicatat!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "OVERPAYMENT_FORBIDDEN") {
        console.log("  ✓ Overpayment ditolak: OVERPAYMENT_FORBIDDEN (422)");
        console.log(`  ✓ Pesan: ${err.message}`);
      } else {
        throw err;
      }
    }
    console.log("  ✓ Test 5 LULUS.\n");

    // -------------------------------------------------------------
    // TEST 6: Idempotency Protection (Replay vs Conflict)
    // -------------------------------------------------------------
    console.log("[TEST 6] Menguji idempotensi pembayaran (replay identik vs conflict)...");
    // Replay identik: kirim ulang payment 1 dengan kunci dan nominal yang sama
    const replayRes = await postPayment(userBendaharaA1.id, expense1.id, {
      idempotencyKey: `PAY-P6-1-${ts}`,
      amount: "75000.00",
      notes: "Retry jaringan",
    });

    if (!replayRes.isDuplicateReplay) {
      throw new Error("FAIL: Replay request tidak terdeteksi sebagai duplicate!");
    }
    console.log("  ✓ Replay identik diterima kembali secara aman (isDuplicateReplay: true, tanpa buat record baru)");

    // Conflict: kirim dengan kunci yang sama tapi nominal beda (Rp 80.000)
    try {
      await postPayment(userBendaharaA1.id, expense1.id, {
        idempotencyKey: `PAY-P6-1-${ts}`,
        amount: "80000.00",
      });
      throw new Error("FAIL: Konflik kunci idempotensi tidak terdeteksi!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "IDEMPOTENCY_CONFLICT") {
        console.log("  ✓ Konflik payload kunci idempotensi ditolak: IDEMPOTENCY_CONFLICT (409)");
      } else {
        throw err;
      }
    }
    console.log("  ✓ Test 6 LULUS.\n");

    // -------------------------------------------------------------
    // TEST 7: Full Payment Transition (paid)
    // -------------------------------------------------------------
    console.log("[TEST 7] Melunasi sisa saldo dan transisi status ke 'paid'...");
    // Sisa Rp 125.000 dibayar penuh
    const payment2 = await postPayment(userBendaharaA1.id, expense1.id, {
      idempotencyKey: `PAY-P6-2-${ts}`,
      amount: "125000.00",
      notes: "Pelunasan sisa konsumsi",
    });

    const detailAfterPay2 = await getExpenseRequestDetail(userKetuaA.id, expense1.id);
    console.log(`  ✓ Pembayaran tahap 2 dicatat: Rp ${payment2.payment.amount}`);
    console.log(`  ✓ Status sekarang: ${detailAfterPay2.request.status}`);
    console.log(`  ✓ Sisa Saldo: Rp ${detailAfterPay2.summary.remainingBalance}`);

    if (detailAfterPay2.request.status !== "paid") {
      throw new Error(`FAIL: Status harusnya paid, didapat: ${detailAfterPay2.request.status}`);
    }
    if (detailAfterPay2.summary.remainingBalance !== 0) {
      throw new Error(`FAIL: Sisa saldo harusnya 0, didapat: ${detailAfterPay2.summary.remainingBalance}`);
    }
    console.log("  ✓ Test 7 LULUS.\n");

    // -------------------------------------------------------------
    // TEST 8: Reversal Validations (Reason < 5 chars & Exceeds Reversible)
    // -------------------------------------------------------------
    console.log("[TEST 8] Menguji validasi pembatalan (reversal)...");
    // Alasan terlalu pendek (< 5 karakter)
    try {
      await reversePayment(userBendaharaA1.id, payment1.payment.id, {
        amount: "25000.00",
        reason: "tes",
      });
      throw new Error("FAIL: Reversal dengan alasan < 5 karakter lolos!");
    } catch (err) {
      if (err instanceof AuthorizationError && (err.code === "INVALID_REASON" || err.code === "VALIDATION_ERROR")) {
        console.log("  ✓ Alasan pendek ditolak: VALIDATION_ERROR (422)");
      } else {
        throw err;
      }
    }

    // Nominal reversal melebihi nominal pembayaran (Rp 100.000 > Rp 75.000)
    try {
      await reversePayment(userBendaharaA1.id, payment1.payment.id, {
        amount: "100000.00",
        reason: "Koreksi kelebihan nominal transaksi",
      });
      throw new Error("FAIL: Reversal melebihi nominal transaksi lolos!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "EXCEEDS_REVERSIBLE_AMOUNT") {
        console.log("  ✓ Reversal melebihi batas ditolak: EXCEEDS_REVERSIBLE_AMOUNT (422)");
      } else {
        throw err;
      }
    }
    console.log("  ✓ Test 8 LULUS.\n");

    // -------------------------------------------------------------
    // TEST 9: Execution of Reversal & Status Recalculation
    // -------------------------------------------------------------
    console.log("[TEST 9] Menjalankan Reversal Pembayaran & Rekalkulasi Status...");
    // Batalkan sebagian payment 1 sebesar Rp 25.000
    const rev1 = await reversePayment(userBendaharaA1.id, payment1.payment.id, {
      amount: "25000.00",
      reason: "Koreksi kelebihan transfer nominal termin 1",
    });
    console.log(`  ✓ Reversal parsial 1 dicatat: Rp ${rev1.amount}`);

    // Cek detail: status harus kembali ke partially_paid, remainingBalance menjadi 25.000
    const detailAfterRev1 = await getExpenseRequestDetail(userKetuaA.id, expense1.id);
    console.log(`  ✓ Status setelah reversal parsial: ${detailAfterRev1.request.status}`);
    console.log(`  ✓ Total Net Dibayar: Rp ${detailAfterRev1.summary.totalPaidNet}`);
    console.log(`  ✓ Sisa Belum Dibayar: Rp ${detailAfterRev1.summary.remainingBalance}`);

    if (detailAfterRev1.request.status !== "partially_paid") {
      throw new Error(`FAIL: Status harusnya kembali ke partially_paid, bukan ${detailAfterRev1.request.status}`);
    }
    if (detailAfterRev1.summary.remainingBalance !== 25000) {
      throw new Error(`FAIL: Sisa saldo harusnya 25000, bukan ${detailAfterRev1.summary.remainingBalance}`);
    }

    // Batalkan sisa dari payment 1 (Rp 50.000)
    const rev2 = await reversePayment(userBendaharaA1.id, payment1.payment.id, {
      amount: "50000.00",
      reason: "Pembatalan sisa pembayaran termin 1",
    });
    console.log(`  ✓ Reversal sisa payment 1 dicatat: Rp ${rev2.amount}`);

    // Cek bahwa payment 1 kini tidak dapat dibatalkan lagi
    try {
      await reversePayment(userBendaharaA1.id, payment1.payment.id, {
        amount: "5000.00",
        reason: "Mencoba batalkan lagi transaksi yang sudah habis",
      });
      throw new Error("FAIL: Transaksi yang sudah habis dibatalkan masih bisa dibatalkan lagi!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "EXCEEDS_REVERSIBLE_AMOUNT") {
        console.log("  ✓ Pembatalan lanjutan ditolak karena saldo reversible = 0");
      } else {
        throw err;
      }
    }
    console.log("  ✓ Test 9 LULUS.\n");

    // -------------------------------------------------------------
    // TEST 10: Rejection Workflow & Audit Trail Verification
    // -------------------------------------------------------------
    console.log("[TEST 10] Menguji Alur Penolakan & Jejak Audit...");
    // Tolak expense3 dengan alasan valid
    const rejectedExpense3 = await rejectExpenseRequest(
      userBendaharaA1.id,
      expense3.id,
      "Anggaran tidak mencukupi dan pos sewa sound system dinilai terlalu mahal."
    );
    console.log(`  ✓ Pengeluaran #3 ditolak (Status: ${rejectedExpense3.status})`);
    console.log(`  ✓ Alasan penolakan: ${rejectedExpense3.rejectionReason}`);

    // Cek log audit untuk eventA1
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, orgA.id));

    const actions = logs.map((l) => l.action);
    console.log(`  ✓ Total log audit tercatat di Org A: ${logs.length}`);
    console.log(`  ✓ Aksi audit: ${actions.join(", ")}`);

    const expectedActions = [
      "expense_request.created",
      "expense_request.approved",
      "expense_request.rejected",
      "payment.posted",
      "payment.reversed",
    ];
    for (const exp of expectedActions) {
      if (!actions.includes(exp)) {
        throw new Error(`FAIL: Log audit untuk aksi '${exp}' tidak ditemukan!`);
      }
    }
    console.log("  ✓ Semua jejak audit finansial terverifikasi lengkap.");
    console.log("  ✓ Test 10 LULUS.\n");

    console.log("============================================================");
    console.log("  SEMUA PENGUJIAN GATE FASE 6 (EXPENSES & PAYMENTS) LULUS 100%");
    console.log("============================================================\n");
  } finally {
    // Pembersihan data pengujian
    console.log("[Pembersihan] Menghapus data uji dari database...");
    try {
      // 1. Reversals
      const testPayments = await db
        .select({ id: payments.id })
        .from(payments)
        .innerJoin(expenseRequests, eq(payments.expenseRequestId, expenseRequests.id))
        .where(inArray(expenseRequests.eventId, [eventA1.id, eventA2.id]));

      const paymentIds = testPayments.map((p) => p.id);
      if (paymentIds.length > 0) {
        await db.delete(paymentReversals).where(inArray(paymentReversals.paymentId, paymentIds));
        await db.delete(payments).where(inArray(payments.id, paymentIds));
      }

      // 2. Expenses
      await db.delete(expenseRequests).where(inArray(expenseRequests.eventId, [eventA1.id, eventA2.id]));

      // 3. Budgets & Scenarios
      await db.delete(auditLogs).where(inArray(auditLogs.organizationId, [orgA.id, orgB.id]));
      await db.delete(budgetItems).where(eq(budgetItems.budgetVersionId, approvedBudget.id));
      await db.delete(budgetVersions).where(eq(budgetVersions.eventId, eventA1.id));
      await db.delete(budgetScenarioItems).where(eq(budgetScenarioItems.scenarioId, sc1.id));
      await db.delete(budgetScenarios).where(eq(budgetScenarios.eventId, eventA1.id));

      // 4. Events & Orgs
      await db.delete(events).where(inArray(events.id, [eventA1.id, eventA2.id]));
      await db.delete(memberships).where(inArray(memberships.organizationId, [orgA.id, orgB.id]));
      await db.delete(organizations).where(inArray(organizations.id, [orgA.id, orgB.id]));
      await db.delete(users).where(
        inArray(users.id, [
          userKetuaA.id,
          userBendaharaA1.id,
          userBendaharaA2.id,
          userPanitiaA.id,
          userBendaharaB.id,
        ])
      );
      console.log("  ✓ Data uji berhasil dibersihkan tanpa sisa.");
    } catch (cleanupErr) {
      console.error("  ⚠️ Gagal saat pembersihan data uji:", cleanupErr);
    }
  }
}

runPhase6ExpenseGateTests().catch((err) => {
  console.error("\n❌ ERROR PENGUJIAN GATE FASE 6:", err);
  process.exit(1);
});
