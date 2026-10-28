import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { eq, and } from "drizzle-orm";
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
  auditLogs,
} from "./db/schema";
import { AuthorizationError } from "./authorization/tenant";
import {
  listBudgetVersions,
  getBudgetVersionDetail,
  approveBudgetVersion,
  rejectBudgetVersion,
} from "./modules/budgets.service";
import { createScenario, addScenarioItem, submitScenarioAsBudget, archiveScenario } from "./modules/scenarios.service";

async function runPhase5BudgetGateTests() {
  console.log("============================================================");
  console.log("  REKADANA - PENGUJIAN GATE FASE 5 (BUDGET APPROVAL GATE)");
  console.log("============================================================\n");

  const ts = Date.now();
  const password = "PasswordValid123!";

  // 1. Setup Entitas Uji
  console.log("[1] Menyiapkan entitas pengujian (Org A, Org B, Ketua, 2 Bendahara, Panitia)...");

  const [userKetuaA] = await db
    .insert(users)
    .values({
      email: `ketua_p5_${ts}@test.id`,
      name: "Ketua Kegiatan A",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userBendaharaA1] = await db
    .insert(users)
    .values({
      email: `bendahara1_p5_${ts}@test.id`,
      name: "Bendahara A1 (Pemohon)",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userBendaharaA2] = await db
    .insert(users)
    .values({
      email: `bendahara2_p5_${ts}@test.id`,
      name: "Bendahara A2 (Reviewer Independen)",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userPanitiaA] = await db
    .insert(users)
    .values({
      email: `panitia_p5_${ts}@test.id`,
      name: "Panitia Anggota A",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userBendaharaB] = await db
    .insert(users)
    .values({
      email: `bendahara_b_p5_${ts}@test.id`,
      name: "Bendahara Org B (Tenant Lain)",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [orgA] = await db
    .insert(organizations)
    .values({
      name: `OSIS SMKN 1 Test P5 ${ts}`,
      slug: `osis-smkn1-p5-${ts}`,
    })
    .returning();

  const [orgB] = await db
    .insert(organizations)
    .values({
      name: `Pramuka SMKN 2 Test P5 ${ts}`,
      slug: `pramuka-smkn2-p5-${ts}`,
    })
    .returning();

  // Daftarkan keanggotaan
  await db.insert(memberships).values([
    { userId: userKetuaA.id, organizationId: orgA.id, role: "ketua_kegiatan" },
    { userId: userBendaharaA1.id, organizationId: orgA.id, role: "bendahara" },
    { userId: userBendaharaA2.id, organizationId: orgA.id, role: "bendahara" },
    { userId: userPanitiaA.id, organizationId: orgA.id, role: "panitia_anggota" },
    { userId: userBendaharaB.id, organizationId: orgB.id, role: "bendahara" },
  ]);

  const [eventA] = await db
    .insert(events)
    .values({
      organizationId: orgA.id,
      name: "Gebyar Seni & Olahraga SMK",
      description: "Kegiatan uji coba approval anggaran fase 5",
      availableFunds: "10000000.00", // Pagu 10 Juta
      participantCount: 150,
      createdBy: userKetuaA.id,
    })
    .returning();

  console.log("  ✓ Entitas uji berhasil disiapkan.\n");

  try {
    // 2. Buat skenario 1 dan ajukan oleh Bendahara A1
    console.log("[2] Membuat dan mengajukan Skenario 1 oleh Bendahara A1...");
    const sc1 = await createScenario(userBendaharaA1.id, eventA.id, "Skenario Awal", "Kebutuhan dasar", 150);
    await addScenarioItem(userBendaharaA1.id, sc1.id, {
      name: "Sewa Panggung & Tenda",
      category: "Perlengkapan",
      quantity: "1",
      estimatedUnitCost: "3500000.00",
    });
    await addScenarioItem(userBendaharaA1.id, sc1.id, {
      name: "Konsumsi Panitia",
      category: "Konsumsi",
      quantity: "150",
      estimatedUnitCost: "10000.00",
    }); // Total = 3.5jt + 1.5jt = 5.0jt

    const version1 = await submitScenarioAsBudget(userBendaharaA1.id, sc1.id);
    console.log(`  ✓ Versi #${version1.versionNumber} berhasil dibuat dengan status: '${version1.status}' (submittedBy: Bendahara A1)\n`);

    // 3. Uji Tenant Isolation: Bendahara Org B ditolak saat mencoba approve versi Org A
    console.log("[3] Uji Tenant Isolation: Bendahara Org B tidak boleh menyetujui versi Org A...");
    try {
      await approveBudgetVersion(userBendaharaB.id, version1.id);
      throw new Error("FAIL: Bendahara Org B berhasil menyetujui versi Org A!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "ORGANIZATION_ACCESS_DENIED") {
        console.log("  ✓ Akses ditolak dengan kode: ORGANIZATION_ACCESS_DENIED (Status: 403)");
      } else {
        throw err;
      }
    }
    console.log("  ✓ Uji Tenant Isolation LULUS.\n");

    // 4. Uji Role Authorization: Ketua dan Panitia ditolak saat mencoba approve
    console.log("[4] Uji Role Authorization: Hanya role 'bendahara' yang diizinkan menyetujui...");
    try {
      await approveBudgetVersion(userKetuaA.id, version1.id);
      throw new Error("FAIL: Ketua Kegiatan berhasil menyetujui anggaran!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "INSUFFICIENT_ROLE_PERMISSIONS") {
        console.log("  ✓ Ketua ditolak: INSUFFICIENT_ROLE_PERMISSIONS (Status: 403)");
      } else {
        throw err;
      }
    }

    try {
      await approveBudgetVersion(userPanitiaA.id, version1.id);
      throw new Error("FAIL: Panitia Anggota berhasil menyetujui anggaran!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "INSUFFICIENT_ROLE_PERMISSIONS") {
        console.log("  ✓ Panitia ditolak: INSUFFICIENT_ROLE_PERMISSIONS (Status: 403)");
      } else {
        throw err;
      }
    }
    console.log("  ✓ Uji Role Authorization LULUS.\n");

    // 5. Uji Segregation of Duties (Pencegahan Self-Approval)
    console.log("[5] Uji Segregation of Duties: Bendahara A1 tidak boleh menyetujui atau memproses pengajuannya sendiri...");
    try {
      await approveBudgetVersion(userBendaharaA1.id, version1.id);
      throw new Error("FAIL: Bendahara A1 berhasil menyetujui versinya sendiri!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "SELF_APPROVAL_FORBIDDEN") {
        console.log("  ✓ Self-approval ditolak: SELF_APPROVAL_FORBIDDEN (Status: 403)");
      } else {
        throw err;
      }
    }

    try {
      await rejectBudgetVersion(userBendaharaA1.id, version1.id, "Saya tolak sendiri");
      throw new Error("FAIL: Bendahara A1 berhasil menolak versinya sendiri!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "SELF_APPROVAL_FORBIDDEN") {
        console.log("  ✓ Self-rejection ditolak: SELF_APPROVAL_FORBIDDEN (Status: 403)");
      } else {
        throw err;
      }
    }
    console.log("  ✓ Uji Pencegahan Self-Approval LULUS.\n");

    // 6. Uji Validasi Alasan Penolakan
    console.log("[6] Uji Validasi Penolakan: Alasan penolakan wajib diisi minimal 5 karakter...");
    try {
      await rejectBudgetVersion(userBendaharaA2.id, version1.id, "   ");
      throw new Error("FAIL: Penolakan tanpa alasan berhasil!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "VALIDATION_ERROR") {
        console.log("  ✓ Penolakan alasan kosong ditolak: VALIDATION_ERROR (Status: 422)");
      } else {
        throw err;
      }
    }

    const rejectedVersion = await rejectBudgetVersion(
      userBendaharaA2.id,
      version1.id,
      "Biaya sewa panggung terlalu mahal, cari alternatif rekanan lain"
    );
    if (rejectedVersion.status !== "rejected" || !rejectedVersion.rejectionReason) {
      throw new Error("FAIL: Status versi tidak berubah menjadi rejected!");
    }
    console.log(`  ✓ Versi #${version1.versionNumber} berhasil ditolak dengan alasan: "${rejectedVersion.rejectionReason}"\n`);

    // 7. Uji Status Transition Conflict: Versi yang sudah rejected tidak bisa disetujui
    console.log("[7] Uji Transisi Status: Versi 'rejected' tidak dapat disetujui...");
    try {
      await approveBudgetVersion(userBendaharaA2.id, version1.id);
      throw new Error("FAIL: Versi rejected berhasil disetujui!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "INVALID_STATUS_TRANSITION") {
        console.log("  ✓ Persetujuan versi rejected ditolak: INVALID_STATUS_TRANSITION (Status: 409)");
      } else {
        throw err;
      }
    }
    console.log("  ✓ Uji Transisi Status LULUS.\n");

    // 8. Buat Versi 2 (oleh Ketua A) dan setujui oleh Bendahara A1
    console.log("[8] Membuat Versi 2 (diajukan oleh Ketua A) dan disetujui oleh Bendahara A1...");
    const sc2 = await createScenario(userKetuaA.id, eventA.id, "Skenario Revisi Rekanan", "Negosiasi rekanan baru", 150);
    await addScenarioItem(userKetuaA.id, sc2.id, {
      name: "Sewa Panggung Rekanan B",
      category: "Perlengkapan",
      quantity: "1",
      estimatedUnitCost: "2500000.00",
    });
    await addScenarioItem(userKetuaA.id, sc2.id, {
      name: "Konsumsi Panitia",
      category: "Konsumsi",
      quantity: "150",
      estimatedUnitCost: "10000.00",
    }); // Total = 2.5jt + 1.5jt = 4.0jt

    const version2 = await submitScenarioAsBudget(userKetuaA.id, sc2.id);
    console.log(`  ✓ Versi #${version2.versionNumber} berhasil dibuat dengan status: '${version2.status}'`);

    const approvedV2 = await approveBudgetVersion(userBendaharaA1.id, version2.id);
    if (approvedV2.status !== "approved") {
      throw new Error("FAIL: Status Versi 2 bukan approved!");
    }
    console.log(`  ✓ Versi #${version2.versionNumber} disetujui oleh Bendahara A1 (Status: approved)\n`);

    // 9. Uji Aktivasi Atomik & Demosi: Buat Versi 3, approve oleh Bendahara A2, pastikan hanya 1 versi approved
    console.log("[9] Uji Aktivasi Atomik: Pengaktifan Versi 3 harus otomatis mendemosi Versi 2...");
    const sc3 = await createScenario(userKetuaA.id, eventA.id, "Skenario Penambahan Peserta", "Peserta bertambah", 200);
    await addScenarioItem(userKetuaA.id, sc3.id, {
      name: "Sewa Panggung Rekanan B",
      category: "Perlengkapan",
      quantity: "1",
      estimatedUnitCost: "2500000.00",
    });
    await addScenarioItem(userKetuaA.id, sc3.id, {
      name: "Konsumsi Panitia",
      category: "Konsumsi",
      quantity: "200",
      estimatedUnitCost: "12000.00",
    });
    await addScenarioItem(userKetuaA.id, sc3.id, {
      name: "Sertifikat Cetak",
      category: "Dokumentasi",
      quantity: "200",
      estimatedUnitCost: "5000.00",
    }); // Total = 2.5jt + 2.4jt + 1.0jt = 5.9jt

    const version3 = await submitScenarioAsBudget(userKetuaA.id, sc3.id);
    const approvedV3 = await approveBudgetVersion(userBendaharaA2.id, version3.id);
    if (approvedV3.status !== "approved") {
      throw new Error("FAIL: Status Versi 3 bukan approved!");
    }

    // Verifikasi di database: Versi 2 harus menjadi draft, Versi 3 approved
    const allVersions = await listBudgetVersions(userKetuaA.id, eventA.id);
    const approvedList = allVersions.filter((v) => v.status === "approved");
    const v2Updated = allVersions.find((v) => v.id === version2.id);

    if (approvedList.length !== 1) {
      throw new Error(`FAIL: Terdapat ${approvedList.length} versi approved! Harus tepat 1 versi aktif.`);
    }
    if (approvedList[0].id !== version3.id) {
      throw new Error("FAIL: Versi aktif bukan Versi 3!");
    }
    if (v2Updated?.status !== "draft") {
      throw new Error(`FAIL: Versi 2 sebelumnya tidak didemosi ke draft (status saat ini: ${v2Updated?.status})`);
    }

    console.log("  ✓ Tepat satu versi aktif terkonfirmasi di database (Versi #3 approved, Versi #2 demoted ke draft)");
    console.log("  ✓ Uji Aktivasi Atomik LULUS.\n");

    // 10. Uji Diff Snapshot & Perbandingan Versi
    console.log("[10] Uji Fitur Perbedaan Antar Versi (Diff Snapshot)...");
    const detailV3 = await getBudgetVersionDetail(userKetuaA.id, version3.id);
    if (!detailV3.comparison) {
      throw new Error("FAIL: Comparison antar versi tidak terhitung pada Versi 3!");
    }
    const cmp = detailV3.comparison;
    console.log(`  ✓ Perbandingan Versi #3 vs #${cmp.previousVersionNumber}:`);
    console.log(`    - Selisih total: Rp ${cmp.deltaTotal.toLocaleString("id-ID")} (${cmp.deltaTotalPercentage}%)`);
    console.log(`    - Selisih peserta: +${cmp.deltaParticipantCount} orang`);
    console.log(`    - Item baru: ${cmp.addedItemsCount}, Disesuaikan: ${cmp.modifiedItemsCount}, Dihapus: ${cmp.removedItemsCount}`);

    if (cmp.addedItemsCount !== 1) {
      throw new Error(`FAIL: Jumlah item baru tidak sesuai! Ditemukan: ${cmp.addedItemsCount}, Diharapkan: 1 ("Sertifikat Cetak")`);
    }
    console.log("  ✓ Uji Diff Snapshot LULUS.\n");

    // 11. Uji Proteksi Penurunan Anggaran Melebihi Komitmen Berjalan (Commitment Over-Reduction)
    console.log("[11] Uji Proteksi Komitmen: Versi baru dengan total < komitmen pengeluaran berjalan ditolak...");
    // Buat pengeluaran sebesar 4.000.000 disetujui pada eventA
    const [expenseReq] = await db
      .insert(expenseRequests)
      .values({
        eventId: eventA.id,
        budgetVersionId: version3.id,
        requestedBy: userPanitiaA.id,
        title: "Uang Muka Sewa Panggung & Sound",
        requestedAmount: "4000000.00",
        approvedAmount: "4000000.00",
        status: "approved", // Berstatus approved = open commitment 4 juta
      })
      .returning();

    // Arsipkan skenario 1 terlebih dahulu karena batas maksimal 3 skenario aktif
    await archiveScenario(userKetuaA.id, sc1.id);

    // Buat Versi 4 dengan total anggaran hanya 3.000.000 (< 4.000.000 komitmen)
    const sc4 = await createScenario(userKetuaA.id, eventA.id, "Skenario Pangkas Ekstrem", "Pemotongan", 50);
    await addScenarioItem(userKetuaA.id, sc4.id, {
      name: "Tenda Sederhana",
      category: "Perlengkapan",
      quantity: "1",
      estimatedUnitCost: "3000000.00",
    }); // Total 3.0jt < 4.0jt komitmen
    const version4 = await submitScenarioAsBudget(userKetuaA.id, sc4.id);

    try {
      await approveBudgetVersion(userBendaharaA1.id, version4.id);
      throw new Error("FAIL: Versi 4 dengan total < komitmen berhasil disetujui!");
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "BUDGET_REDUCTION_EXCEEDS_COMMITMENTS") {
        console.log("  ✓ Persetujuan ditolak dengan kode: BUDGET_REDUCTION_EXCEEDS_COMMITMENTS (Status: 422)");
        console.log(`  ✓ Pesan: ${err.message}`);
      } else {
        throw err;
      }
    }
    console.log("  ✓ Uji Proteksi Komitmen LULUS.\n");

    console.log("============================================================");
    console.log("  SEMUA PENGUJIAN GATE FASE 5 (BUDGET APPROVAL) LULUS 100%");
    console.log("============================================================\n");
  } finally {
    // Bersihkan data pengujian
    console.log("[Pembersihan] Menghapus data uji dari database...");
    await db.delete(auditLogs).where(eq(auditLogs.organizationId, orgA.id));
    await db.delete(auditLogs).where(eq(auditLogs.organizationId, orgB.id));
    await db.delete(expenseRequests).where(eq(expenseRequests.eventId, eventA.id));
    await db.delete(events).where(eq(events.id, eventA.id));
    await db.delete(organizations).where(eq(organizations.id, orgA.id));
    await db.delete(organizations).where(eq(organizations.id, orgB.id));
    await db.delete(users).where(eq(users.id, userKetuaA.id));
    await db.delete(users).where(eq(users.id, userBendaharaA1.id));
    await db.delete(users).where(eq(users.id, userBendaharaA2.id));
    await db.delete(users).where(eq(users.id, userPanitiaA.id));
    await db.delete(users).where(eq(users.id, userBendaharaB.id));
    console.log("  ✓ Data uji berhasil dibersihkan.");
  }
}

runPhase5BudgetGateTests().catch((err) => {
  console.error("\n❌ ERROR PENGUJIAN GATE FASE 5:", err);
  process.exit(1);
});
