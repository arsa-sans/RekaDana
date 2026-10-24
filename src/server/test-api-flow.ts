import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "./auth/passwords";
import { createSession } from "./auth/session";
import { db } from "./db";
import { users, organizations, memberships, events, budgetScenarios, budgetVersions, expenseRequests, payments, paymentReversals } from "./db/schema";
import { createEvent, getEvent } from "./modules/events.service";
import { createScenario, addScenarioItem, listScenariosWithCalculations, submitScenarioAsBudget } from "./modules/scenarios.service";
import { approveBudgetVersion, getBudgetVersionDetail } from "./modules/budgets.service";
import { createExpenseRequest, approveExpenseRequest, postPayment, reversePayment } from "./modules/expenses.service";
import { getBudgetVsActualReport } from "./modules/reports.service";

async function runIntegrationTest() {
  console.log("=== MEMULAI TEST INTEGRASI BISNIS REKADANA ===");

  const timestamp = Date.now();
  const emailKetua = `ketua_${timestamp}@example.com`;
  const emailBendahara = `bendahara_${timestamp}@example.com`;
  const password = "Password123!";

  // 1. Registrasi Akun
  console.log("\n[1] Mendaftarkan pengguna Ketua dan Bendahara...");
  const [ketuaUser] = await db.insert(users).values({
    email: emailKetua,
    name: "Ketua Pelaksana",
    passwordHash: hashPassword(password),
  }).returning();

  const [bendaharaUser] = await db.insert(users).values({
    email: emailBendahara,
    name: "Bendahara Utama",
    passwordHash: hashPassword(password),
  }).returning();
  console.log(`✓ Ketua terdaftar: id=${ketuaUser.id}, email=${ketuaUser.email}`);
  console.log(`✓ Bendahara terdaftar: id=${bendaharaUser.id}, email=${bendaharaUser.email}`);

  // 2. Verifikasi Password & Sesi
  console.log("\n[2] Verifikasi kata sandi & pembuatan sesi login...");
  const isValidKetua = verifyPassword(password, ketuaUser.passwordHash!);
  if (!isValidKetua) throw new Error("Gagal verifikasi password Ketua");
  const sessionKetua = await createSession(ketuaUser.id);

  const isValidBendahara = verifyPassword(password, bendaharaUser.passwordHash!);
  if (!isValidBendahara) throw new Error("Gagal verifikasi password Bendahara");
  const sessionBendahara = await createSession(bendaharaUser.id);
  console.log(`✓ Token sesi berhasil digenerate.`);

  // 3. Buat Organisasi
  console.log("\n[3] Membuat Organisasi...");
  const [org] = await db.insert(organizations).values({
    name: `Himpunan Informatika ${timestamp}`,
    slug: `hima-if-${timestamp}`,
  }).returning();

  // Ketua membership
  await db.insert(memberships).values({
    organizationId: org.id,
    userId: ketuaUser.id,
    role: "ketua_kegiatan",
  });

  // Bendahara membership
  await db.insert(memberships).values({
    organizationId: org.id,
    userId: bendaharaUser.id,
    role: "bendahara",
  });
  console.log(`✓ Organisasi '${org.name}' berhasil dibuat dengan role Ketua & Bendahara.`);

  // 4. Buat Kegiatan (Event)
  console.log("\n[4] Membuat Kegiatan (Event)...");
  const event = await createEvent(ketuaUser.id, org.id, {
    name: "Seminar Nasional Teknologi 2026",
    description: "Seminar dan workshop teknologi mahasiswa",
    participantCount: 100,
    availableFunds: "10000000.00", // 10 juta
  });
  console.log(`✓ Kegiatan dibuat: '${event.name}', Pagu Dana: Rp ${parseFloat(event.availableFunds).toLocaleString("id-ID")}`);

  // 5. Buat Skenario Anggaran (Scenario Lab)
  console.log("\n[5] Membuat Skenario Lab...");
  const scenarioHemat = await createScenario(ketuaUser.id, event.id, "Skenario Hemat", "Estimasi kebutuhan minimal", 100);
  await addScenarioItem(ketuaUser.id, scenarioHemat.id, {
    name: "Sewa Gedung Auditorium",
    category: "Logistik",
    priority: "required",
    quantity: "1",
    estimatedUnitCost: "4000000.00",
  });
  await addScenarioItem(ketuaUser.id, scenarioHemat.id, {
    name: "Konsumsi Peserta (Snack & Lunch)",
    category: "Konsumsi",
    priority: "required",
    quantity: "100",
    estimatedUnitCost: "35000.00", // 3.500.000
  });

  const scenarioMewah = await createScenario(ketuaUser.id, event.id, "Skenario Mewah", "Estimasi kebutuhan premium", 100);
  await addScenarioItem(ketuaUser.id, scenarioMewah.id, {
    name: "Sewa Hotel Ballroom",
    category: "Logistik",
    priority: "required",
    quantity: "1",
    estimatedUnitCost: "12000000.00", // 12 juta -> melebihi pagu 10 juta
  });

  // 6. Validasi Kalkulasi Matematis Skenario
  console.log("\n[6] Memeriksa kalkulasi matematis Skenario Lab...");
  const calcs = await listScenariosWithCalculations(ketuaUser.id, event.id);
  const calcHemat = calcs.find((c) => c.id === scenarioHemat.id);
  const calcMewah = calcs.find((c) => c.id === scenarioMewah.id);

  console.log(`- Skenario Hemat: Total=Rp ${parseFloat(calcHemat!.scenarioTotal).toLocaleString("id-ID")}, Gap=Rp ${parseFloat(calcHemat!.fundGap).toLocaleString("id-ID")}, Defisit=${calcHemat!.isDeficit}`);
  console.log(`- Skenario Mewah: Total=Rp ${parseFloat(calcMewah!.scenarioTotal).toLocaleString("id-ID")}, Gap=Rp ${parseFloat(calcMewah!.fundGap).toLocaleString("id-ID")}, Defisit=${calcMewah!.isDeficit}`);

  if (parseFloat(calcHemat!.scenarioTotal) !== 7500000) throw new Error("Kalkulasi total skenario hemat tidak sesuai.");
  if (!calcMewah!.isDeficit) throw new Error("Defisit skenario mewah tidak terdeteksi.");
  console.log(`✓ Kalkulasi matematis skenario lab terbukti akurat.`);

  // 7. Pengujian Deficit Protection saat pengajuan ke Bendahara
  console.log("\n[7] Menguji Deficit Protection pada pengajuan skenario...");
  let deficitBlocked = false;
  try {
    await submitScenarioAsBudget(ketuaUser.id, scenarioMewah.id);
  } catch (err: any) {
    if (err.code === "BUDGET_DEFICIT") {
      deficitBlocked = true;
      console.log(`✓ Terbukti berhasil dicegah: ${err.message}`);
    }
  }
  if (!deficitBlocked) throw new Error("Gagal mencegah pengajuan skenario yang defisit.");

  // 8. Pengajuan Skenario Hemat menjadi Versi Anggaran Resmi
  console.log("\n[8] Mengajukan skenario hemat menjadi versi anggaran...");
  const budgetVer1 = await submitScenarioAsBudget(ketuaUser.id, scenarioHemat.id);
  console.log(`✓ Skenario berhasil dibekukan menjadi versi anggaran #${budgetVer1.versionNumber} (status: ${budgetVer1.status})`);

  // 9. Uji Prinsip Pemisahan Tugas (Segregation of Duties) pada Persetujuan Anggaran
  console.log("\n[9] Menguji larangan self-approval pada persetujuan anggaran...");
  let selfApprovalBlocked = false;
  try {
    await approveBudgetVersion(ketuaUser.id, budgetVer1.id);
  } catch (err: any) {
    if (err.code === "SELF_APPROVAL_FORBIDDEN" || err.code === "INSUFFICIENT_ROLE_PERMISSIONS") {
      selfApprovalBlocked = true;
      console.log(`✓ Terbukti berhasil dicegah: ${err.message}`);
    }
  }
  if (!selfApprovalBlocked) throw new Error("Prinsip pemisahan tugas dilanggar: Pemohon bisa menyetujui anggaran sendiri.");

  // 10. Persetujuan Anggaran oleh Bendahara
  console.log("\n[10] Persetujuan anggaran oleh Bendahara...");
  const approvedVersion = await approveBudgetVersion(bendaharaUser.id, budgetVer1.id);
  console.log(`✓ Anggaran versi #${approvedVersion.versionNumber} disetujui resmi oleh Bendahara (status: ${approvedVersion.status}).`);

  // 11. Pengajuan Permintaan Pengeluaran (Expense Request)
  console.log("\n[11] Mengajukan permintaan pengeluaran...");
  const versionDetail = await getBudgetVersionDetail(ketuaUser.id, budgetVer1.id);
  const itemGedung = versionDetail.items.find((i) => i.name.includes("Auditorium"));

  const expenseReq = await createExpenseRequest(ketuaUser.id, event.id, {
    budgetItemId: itemGedung?.id,
    title: "Uang Muka Sewa Auditorium",
    description: "Pembayaran DP sewa gedung pertemuan",
    requestedAmount: "2000000.00",
  });
  console.log(`✓ Pengeluaran diajukan: '${expenseReq.title}', Nominal: Rp ${parseFloat(expenseReq.requestedAmount).toLocaleString("id-ID")}`);

  // 12. Uji Self-Approval pada Pengeluaran
  console.log("\n[12] Menguji larangan self-approval pada permintaan pengeluaran...");
  let expenseSelfApprovalBlocked = false;
  try {
    await approveExpenseRequest(ketuaUser.id, expenseReq.id);
  } catch (err: any) {
    if (err.code === "SELF_APPROVAL_FORBIDDEN" || err.code === "INSUFFICIENT_ROLE_PERMISSIONS") {
      expenseSelfApprovalBlocked = true;
      console.log(`✓ Terbukti berhasil dicegah: ${err.message}`);
    }
  }
  if (!expenseSelfApprovalBlocked) throw new Error("Prinsip pemisahan tugas dilanggar: Pemohon menyetujui pengeluarannya sendiri.");

  // 13. Persetujuan Pengeluaran oleh Bendahara
  console.log("\n[13] Persetujuan pengeluaran oleh Bendahara...");
  const approvedExpense = await approveExpenseRequest(bendaharaUser.id, expenseReq.id, "2000000.00");
  console.log(`✓ Pengeluaran disetujui: status=${approvedExpense.status}, approvedAmount=Rp ${parseFloat(approvedExpense.approvedAmount!).toLocaleString("id-ID")}`);

  // 14. Pembukuan Pembayaran Bertahap & Idempotensi
  console.log("\n[14] Pembukuan pembayaran termin 1 dengan Idempotency Key...");
  const idemKey1 = `PAY-TERMIN1-${timestamp}`;
  const payResult1 = await postPayment(bendaharaUser.id, expenseReq.id, {
    idempotencyKey: idemKey1,
    amount: "1500000.00",
    notes: "Pembayaran termin 1 via transfer bank",
  });
  console.log(`✓ Pembayaran termin 1 berhasil: id=${payResult1.payment.id}, nominal=Rp ${parseFloat(payResult1.payment.amount).toLocaleString("id-ID")}`);

  console.log("\n[15] Menguji replay idempotensi (mencegah double-posting)...");
  const payResultReplay = await postPayment(bendaharaUser.id, expenseReq.id, {
    idempotencyKey: idemKey1,
    amount: "1500000.00",
    notes: "Pengulangan jaringan yang tidak disengaja",
  });
  if (!payResultReplay.isDuplicateReplay) throw new Error("Idempotensi gagal mendeteksi transaksi duplikat.");
  console.log(`✓ Idempotensi berhasil: transaksi di-replay tanpa pencatatan ganda.`);

  // 16. Uji Overpayment Protection
  console.log("\n[16] Menguji pencegahan kelebihan bayar (Overpayment Protection)...");
  let overpayBlocked = false;
  try {
    await postPayment(bendaharaUser.id, expenseReq.id, {
      idempotencyKey: `PAY-OVER-${timestamp}`,
      amount: "1000000.00", // Sisa approved hanya 500.000, 1 juta harus diblokir!
      notes: "Kelebihan bayar tidak sengaja",
    });
  } catch (err: any) {
    if (err.code === "OVERPAYMENT_FORBIDDEN") {
      overpayBlocked = true;
      console.log(`✓ Terbukti berhasil dicegah: ${err.message}`);
    }
  }
  if (!overpayBlocked) throw new Error("Overpayment protection gagal mencegah kelebihan bayar.");

  // 17. Pelunasan Pembayaran Termin 2
  console.log("\n[17] Pelunasan pembayaran sisa termin 2 (Rp 500.000)...");
  const payResult2 = await postPayment(bendaharaUser.id, expenseReq.id, {
    idempotencyKey: `PAY-TERMIN2-${timestamp}`,
    amount: "500000.00",
    notes: "Pelunasan sisa termin 2",
  });
  console.log(`✓ Pelunasan dicatat: nominal=Rp ${parseFloat(payResult2.payment.amount).toLocaleString("id-ID")}`);

  // Periksa status pengeluaran setelah lunas
  const [expenseAfterPaid] = await db.select().from(expenseRequests).where(eq(expenseRequests.id, expenseReq.id));
  console.log(`✓ Status pengeluaran setelah lunas: ${expenseAfterPaid.status}`);
  if (expenseAfterPaid.status !== "paid") throw new Error("Status pengeluaran tidak menjadi 'paid'.");

  // 18. Pembatalan Pembayaran (Payment Reversal)
  console.log("\n[18] Melakukan pembatalan pembayaran termin 2 (Reversal)...");
  const reversal = await reversePayment(bendaharaUser.id, payResult2.payment.id, {
    amount: "500000.00",
    reason: "Koreksi administratif rekening salah transfer vendor",
  });
  console.log(`✓ Pembatalan berhasil dicatat: nominal=Rp ${parseFloat(reversal.amount).toLocaleString("id-ID")}, alasan='${reversal.reason}'`);

  const [expenseAfterReversal] = await db.select().from(expenseRequests).where(eq(expenseRequests.id, expenseReq.id));
  console.log(`✓ Status pengeluaran setelah reversal: ${expenseAfterReversal.status}`);
  if (expenseAfterReversal.status !== "partially_paid") throw new Error("Status tidak kembali ke 'partially_paid' setelah reversal.");

  // 19. Rekonsiliasi Anggaran vs Realisasi (Budget vs Actual Report)
  console.log("\n[19] Mengambil laporan rekonsiliasi Anggaran vs Realisasi...");
  const report = await getBudgetVsActualReport(ketuaUser.id, event.id);
  console.log(`- Anggaran Disetujui (Approved Budget Total): Rp ${parseFloat(report.approvedBudgetTotal).toLocaleString("id-ID")}`);
  console.log(`- Realisasi Bersih (Actual Net Posted):      Rp ${parseFloat(report.actualNet).toLocaleString("id-ID")}`);
  console.log(`- Komitmen Terbuka (Open Commitments):       Rp ${parseFloat(report.openCommitments).toLocaleString("id-ID")}`);
  console.log(`- Sisa Anggaran Terkendali (Remaining):      Rp ${parseFloat(report.remainingControlBudget).toLocaleString("id-ID")}`);

  if (parseFloat(report.approvedBudgetTotal) !== 7500000) throw new Error("Approved budget total salah.");
  if (parseFloat(report.actualNet) !== 1500000) throw new Error("Actual net salah (seharusnya 1.500.000 setelah reversal).");
  if (parseFloat(report.openCommitments) !== 500000) throw new Error("Open commitments salah (seharusnya 500.000).");
  if (parseFloat(report.remainingControlBudget) !== 5500000) throw new Error("Remaining control budget salah.");

  console.log("\n=== SELURUH 19 TAHAPAN PENGUJIAN INTEGRASI BERHASIL 100% ===");
}

runIntegrationTest()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test gagal:", err);
    process.exit(1);
  });
