import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
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
  evidenceFiles,
  auditLogs,
} from "./db/schema";
import { hashPassword } from "./auth/passwords";
import { AuthorizationError } from "./authorization/tenant";
import {
  MAX_FILE_SIZE,
  uploadEvidenceFile,
  getEvidenceDownload,
} from "./storage/evidence.service";
import {
  createScenario,
  addScenarioItem,
  submitScenarioAsBudget,
} from "./modules/scenarios.service";
import { approveBudgetVersion } from "./modules/budgets.service";
import { createExpenseRequest } from "./modules/expenses.service";

// Magic bytes signatures
const PDF_HEADER = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const EXE_HEADER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ PE Executable

function createVirtualFile(name: string, content: Buffer, sizeOverride?: number): File {
  const uint8 = new Uint8Array(content);
  const file = new File([uint8], name, {
    type: name.endsWith(".pdf")
      ? "application/pdf"
      : name.endsWith(".png")
      ? "image/png"
      : "image/jpeg",
  });
  if (sizeOverride !== undefined) {
    Object.defineProperty(file, "size", { value: sizeOverride });
  }
  return file;
}

async function runPhase7EvidenceGateTests() {
  console.log("============================================================");
  console.log("  REKADANA - PENGUJIAN GATE FASE 7 (EVIDENCE & PRIVATE STORAGE)");
  console.log("============================================================\n");

  const ts = Date.now();
  const password = "PasswordValid123!";
  const createdObjectKeys: string[] = [];

  // 1. Setup Entitas Uji
  console.log("[1] Menyiapkan organisasi dan pengguna uji (Org A & Org B)...");

  const [userPanitiaA] = await db
    .insert(users)
    .values({
      email: `panitia_p7_${ts}@test.id`,
      name: "Panitia Pelaksana A",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userBendaharaA] = await db
    .insert(users)
    .values({
      email: `bendahara_p7_${ts}@test.id`,
      name: "Bendahara Sekolah A",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userLuarB] = await db
    .insert(users)
    .values({
      email: `pengguna_luar_p7_${ts}@test.id`,
      name: "Pengguna Organisasi B",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [orgA] = await db
    .insert(organizations)
    .values({
      name: `SMK Negeri 1 Test P7 (${ts})`,
      slug: `smkn1-p7-${ts}`,
    })
    .returning();

  const [orgB] = await db
    .insert(organizations)
    .values({
      name: `SMK Luar Lingkup P7 (${ts})`,
      slug: `smk-luar-p7-${ts}`,
    })
    .returning();

  await db.insert(memberships).values([
    {
      userId: userPanitiaA.id,
      organizationId: orgA.id,
      role: "panitia_anggota",
    },
    {
      userId: userBendaharaA.id,
      organizationId: orgA.id,
      role: "bendahara",
    },
    {
      userId: userLuarB.id,
      organizationId: orgB.id,
      role: "bendahara",
    },
  ]);

  const [eventA] = await db
    .insert(events)
    .values({
      organizationId: orgA.id,
      name: "Pentas Seni Budaya P7",
      participantCount: 300,
      availableFunds: "5000000.00",
      createdBy: userPanitiaA.id,
    })
    .returning();

  // Buat anggaran & expense request untuk ditautkan
  const sc = await createScenario(
    userPanitiaA.id,
    eventA.id,
    "Skenario Operasional"
  );
  await addScenarioItem(userPanitiaA.id, sc.id, {
    name: "Sewa Panggung & Sound",
    quantity: "1",
    estimatedUnitCost: "2000000.00",
  });
  const budgetVersion = await submitScenarioAsBudget(userPanitiaA.id, sc.id);
  await approveBudgetVersion(userBendaharaA.id, budgetVersion.id);

  const expense = await createExpenseRequest(userPanitiaA.id, eventA.id, {
    title: "Uang Muka Sewa Sound System",
    requestedAmount: "1000000.00",
  });

  console.log("  ✓ Entitas dasar siap.");

  try {
    // -------------------------------------------------------------
    // GATE TEST 1: Ukuran File Maksimal (5.242.880 byte)
    // -------------------------------------------------------------
    console.log("\n[2] Uji Gate Ukuran: File melebihi 5 MiB (5.242.881 byte) wajib ditolak...");
    const oversizedBytes = MAX_FILE_SIZE + 1;
    const oversizedFile = createVirtualFile(
      "kwitansi_raksasa.pdf",
      Buffer.concat([PDF_HEADER, Buffer.alloc(100)]),
      oversizedBytes
    );

    let rejectedOversize = false;
    try {
      await uploadEvidenceFile(userPanitiaA.id, orgA.id, oversizedFile);
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "FILE_TOO_LARGE" && err.statusCode === 413) {
        rejectedOversize = true;
      } else {
        throw err;
      }
    }
    if (!rejectedOversize) {
      throw new Error("GATE GAGAL: File berukuran 5.242.881 byte tidak ditolak dengan status 413 FILE_TOO_LARGE!");
    }
    console.log("  ✓ LULUS: File 5.242.881 byte berhasil ditolak (413 FILE_TOO_LARGE).");

    // -------------------------------------------------------------
    // GATE TEST 2: Type Spoofing Protection (Magic Bytes Inspection)
    // -------------------------------------------------------------
    console.log("\n[3] Uji Gate Type Spoofing: File executable .exe yang dinamai .pdf wajib ditolak...");
    const spoofedContent = Buffer.concat([EXE_HEADER, Buffer.from("MALICIOUS PAYLOAD EXECUTABLE")]);
    const spoofedFile = createVirtualFile("laporan_keuangan.pdf", spoofedContent);

    let rejectedSpoofing = false;
    try {
      await uploadEvidenceFile(userPanitiaA.id, orgA.id, spoofedFile);
    } catch (err) {
      if (err instanceof AuthorizationError && err.code === "UNSUPPORTED_FILE_TYPE" && err.statusCode === 415) {
        rejectedSpoofing = true;
      } else {
        throw err;
      }
    }
    if (!rejectedSpoofing) {
      throw new Error("GATE GAGAL: File exe berekstensi .pdf tidak ditolak dengan status 415 UNSUPPORTED_FILE_TYPE!");
    }
    console.log("  ✓ LULUS: Upaya type spoofing berhasil digagalkan lewat inspeksi magic bytes (415 UNSUPPORTED_FILE_TYPE).");

    // -------------------------------------------------------------
    // GATE TEST 3: Unggah Dokumen PDF Asli & Verifikasi Hash + Storage
    // -------------------------------------------------------------
    console.log("\n[4] Uji Unggah Bukti PDF Asli: Verifikasi SHA-256 dan jalur penyimpanan privat...");
    const validPdfBuffer = Buffer.concat([
      PDF_HEADER,
      Buffer.from("\n% Kuitansi Resmi Pembayaran Vendor Sound System #00123\n"),
    ]);
    const expectedHash = createHash("sha256").update(validPdfBuffer).digest("hex");
    const validPdfFile = createVirtualFile("kuitansi_sound.pdf", validPdfBuffer);

    const uploadedPdf = await uploadEvidenceFile(userPanitiaA.id, orgA.id, validPdfFile, {
      expenseRequestId: expense.id,
    });
    createdObjectKeys.push(uploadedPdf.objectKey);

    if (uploadedPdf.detectedFileType !== "pdf") {
      throw new Error(`Deteksi tipe salah: diharapkan pdf, didapat ${uploadedPdf.detectedFileType}`);
    }
    if (uploadedPdf.contentHash !== expectedHash) {
      throw new Error("Hash SHA-256 tidak cocok dengan isi biner berkas!");
    }
    if (!uploadedPdf.objectKey.startsWith(`${orgA.id}/`)) {
      throw new Error("Kunci objek penyimpanan tidak terisolasi dalam direktori tenant organisasi!");
    }

    // Verifikasi berkas fisik benar-benar tersimpan di storage lokal privat
    const storageDir = process.env.PRIVATE_STORAGE_PATH || "./private-storage";
    const physicalPath = path.join(process.cwd(), storageDir, uploadedPdf.objectKey);
    const diskBuffer = await fs.readFile(physicalPath);
    if (!diskBuffer.equals(validPdfBuffer)) {
      throw new Error("Isi berkas fisik di disk tidak cocok dengan berkas yang diunggah!");
    }
    console.log("  ✓ LULUS: File PDF valid tersimpan di penyimpanan privat dengan hash SHA-256 terverifikasi.");

    // -------------------------------------------------------------
    // GATE TEST 4: Unggah Bukti PNG Asli & Verifikasi
    // -------------------------------------------------------------
    console.log("\n[5] Uji Unggah Bukti Gambar PNG Asli...");
    const validPngBuffer = Buffer.concat([PNG_HEADER, Buffer.from("PIXEL DATA STREAM FOR RECEIPT")]);
    const validPngFile = createVirtualFile("foto_nota_warung.png", validPngBuffer);

    const uploadedPng = await uploadEvidenceFile(userPanitiaA.id, orgA.id, validPngFile, {
      expenseRequestId: expense.id,
    });
    createdObjectKeys.push(uploadedPng.objectKey);

    if (uploadedPng.detectedFileType !== "png") {
      throw new Error(`Deteksi tipe salah: diharapkan png, didapat ${uploadedPng.detectedFileType}`);
    }
    console.log("  ✓ LULUS: File PNG valid berhasil diverifikasi dan tersimpan.");

    // -------------------------------------------------------------
    // GATE TEST 5: Pengunduhan Sah (Authorized Download)
    // -------------------------------------------------------------
    console.log("\n[6] Uji Pengunduhan Sah: Anggota sah organisasi A dapat mengunduh berkas...");
    const downloadA = await getEvidenceDownload(userBendaharaA.id, uploadedPdf.id);
    if (!downloadA.fileBuffer.equals(validPdfBuffer)) {
      throw new Error("Buffer yang diunduh tidak identik dengan dokumen asli!");
    }
    if (downloadA.contentType !== "application/pdf") {
      throw new Error(`Content-Type salah: didapat ${downloadA.contentType}`);
    }
    console.log("  ✓ LULUS: Pengunduh terotorisasi menerima berkas fisik dan Content-Type yang tepat.");

    // -------------------------------------------------------------
    // GATE TEST 6: Unauthorized Download Protection (Cross-Tenant 403)
    // -------------------------------------------------------------
    console.log("\n[7] Uji Gate Keamanan: Pengguna lintas organisasi (Org B) dilarang mengunduh berkas (403/404)...");
    let rejectedCrossTenant = false;
    try {
      await getEvidenceDownload(userLuarB.id, uploadedPdf.id);
    } catch (err) {
      if (err instanceof AuthorizationError && (err.statusCode === 403 || err.statusCode === 404)) {
        rejectedCrossTenant = true;
      } else {
        throw err;
      }
    }
    if (!rejectedCrossTenant) {
      throw new Error("GATE GAGAL: Pengguna luar organisasi dapat mengunduh bukti privat tanpa hak akses!");
    }
    console.log("  ✓ LULUS: Akses lintas organisasi ditolak tegas (403 FORBIDDEN).");

    // -------------------------------------------------------------
    // GATE TEST 7: Audit Log Logging
    // -------------------------------------------------------------
    console.log("\n[8] Uji Jejak Audit: Verifikasi pencatatan aksi evidence.uploaded di audit_logs...");
    const [auditPdf] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.objectId, uploadedPdf.id))
      .limit(1);

    if (!auditPdf || auditPdf.action !== "evidence.uploaded" || auditPdf.actorId !== userPanitiaA.id) {
      throw new Error("Catatan audit log untuk bukti transaksi tidak ditemukan atau tidak valid!");
    }
    console.log("  ✓ LULUS: Jejak audit lengkap tercatat dengan ID aktor dan organisasi.");

    console.log("\n============================================================");
    console.log("  SEMUA 7 UJI GATE FASE 7 BERHASIL LULUS 100%");
    console.log("============================================================\n");
  } finally {
    // Pembersihan data uji
    console.log("[Pembersihan] Membersihkan data uji dan berkas fisik...");
    try {
      const storageDir = process.env.PRIVATE_STORAGE_PATH || "./private-storage";
      for (const key of createdObjectKeys) {
        try {
          const filePath = path.join(process.cwd(), storageDir, key);
          await fs.unlink(filePath);
        } catch (_) {}
      }

      await db.delete(evidenceFiles).where(eq(evidenceFiles.organizationId, orgA.id));
      await db.delete(auditLogs).where(inArray(auditLogs.organizationId, [orgA.id, orgB.id]));
      await db.delete(expenseRequests).where(eq(expenseRequests.eventId, eventA.id));
      await db.delete(budgetItems).where(eq(budgetItems.budgetVersionId, budgetVersion.id));
      await db.delete(budgetVersions).where(eq(budgetVersions.eventId, eventA.id));
      await db.delete(budgetScenarioItems).where(eq(budgetScenarioItems.scenarioId, sc.id));
      await db.delete(budgetScenarios).where(eq(budgetScenarios.eventId, eventA.id));
      await db.delete(events).where(eq(events.id, eventA.id));
      await db.delete(memberships).where(inArray(memberships.organizationId, [orgA.id, orgB.id]));
      await db.delete(organizations).where(inArray(organizations.id, [orgA.id, orgB.id]));
      await db.delete(users).where(inArray(users.id, [userPanitiaA.id, userBendaharaA.id, userLuarB.id]));
      console.log("  ✓ Seluruh data uji database dan berkas fisik berhasil dibersihkan.");
    } catch (cleanupErr) {
      console.error("  ⚠️ Gagal saat pembersihan data:", cleanupErr);
    }
  }
}

runPhase7EvidenceGateTests().catch((err) => {
  console.error("\n❌ ERROR PENGUJIAN GATE FASE 7:", err);
  process.exit(1);
});
