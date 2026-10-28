import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { eq } from "drizzle-orm";
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
  auditLogs,
} from "./db/schema";
import { AuthorizationError } from "./authorization/tenant";
import {
  listScenariosWithCalculations,
  createScenario,
  addScenarioItem,
  updateScenarioItem,
  deleteScenarioItem,
  archiveScenario,
  submitScenarioAsBudget,
} from "./modules/scenarios.service";

async function runPhase4GateTests() {
  console.log("============================================================");
  console.log("  REKADANA - PENGUJIAN GATE FASE 4 (SCENARIO LAB)");
  console.log("============================================================\n");

  const ts = Date.now();
  const password = "PasswordValid123!";

  // 1. Setup Entitas Uji
  console.log("[1] Setup entitas pengujian (User Org A, User Org B, Event)...");

  const [userKetuaA] = await db
    .insert(users)
    .values({
      email: `ketua_p4_${ts}@test.id`,
      name: "Ketua Kegiatan A",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [userOrgB] = await db
    .insert(users)
    .values({
      email: `outsider_p4_${ts}@test.id`,
      name: "User Org B",
      passwordHash: hashPassword(password),
    })
    .returning();

  const [orgA] = await db
    .insert(organizations)
    .values({
      name: `Organisasi A P4 ${ts}`,
      slug: `org-a-p4-${ts}`,
    })
    .returning();

  const [orgB] = await db
    .insert(organizations)
    .values({
      name: `Organisasi B P4 ${ts}`,
      slug: `org-b-p4-${ts}`,
    })
    .returning();

  await db.insert(memberships).values({
    organizationId: orgA.id,
    userId: userKetuaA.id,
    role: "ketua_kegiatan",
  });

  await db.insert(memberships).values({
    organizationId: orgB.id,
    userId: userOrgB.id,
    role: "ketua_kegiatan",
  });

  // Pagu dana Rp 5.000.000
  const [eventA] = await db
    .insert(events)
    .values({
      organizationId: orgA.id,
      name: `Kegiatan Workshop P4 ${ts}`,
      participantCount: 50,
      availableFunds: "5000000.00",
      createdBy: userKetuaA.id,
    })
    .returning();

  console.log("  ✓ Entitas uji berhasil disiapkan.\n");

  // 2. Uji Tenant Isolation
  console.log("[2] Uji Tenant Isolation: User Org B tidak boleh mengakses skenario Event A...");
  const scenarioA = await createScenario(
    userKetuaA.id,
    eventA.id,
    "Skenario Standar",
    "Skenario pengujian tenant",
    50
  );

  let outsiderBlocked = false;
  try {
    await listScenariosWithCalculations(userOrgB.id, eventA.id);
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      outsiderBlocked = true;
      console.log(`  ✓ Akses ditolak dengan kode: ${err.code} (Status: ${err.statusCode})`);
    }
  }

  if (!outsiderBlocked) {
    throw new Error("GATE GAGAL: User Org B berhasil mengakses skenario dari Event Org A!");
  }

  let outsiderItemBlocked = false;
  try {
    await addScenarioItem(userOrgB.id, scenarioA.id, {
      name: "Item Ilegal Outsider",
      quantity: "1",
      estimatedUnitCost: "100000",
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      outsiderItemBlocked = true;
      console.log(`  ✓ Tambah item oleh user luar ditolak: ${err.code}`);
    }
  }

  if (!outsiderItemBlocked) {
    throw new Error("GATE GAGAL: User Org B berhasil menambah item ke skenario Event Org A!");
  }
  console.log("  ✓ Uji Tenant Isolation LULUS.\n");

  // 3. Uji Decimal Math Edge Cases (0 quantity, 0 cost)
  console.log("[3] Uji Decimal Math: Edge case kuantitas 0 dan biaya satuan 0...");
  const scenarioZero = await createScenario(
    userKetuaA.id,
    eventA.id,
    "Skenario Zero",
    "Pengujian nilai 0",
    50
  );

  const zeroItem = await addScenarioItem(userKetuaA.id, scenarioZero.id, {
    name: "Kebutuhan Sukarela",
    quantity: "0",
    estimatedUnitCost: "0",
    priority: "optional",
  });

  const calcsZero = await listScenariosWithCalculations(userKetuaA.id, eventA.id);
  const foundZero = calcsZero.find((s) => s.id === scenarioZero.id);

  if (!foundZero) {
    throw new Error("GATE GAGAL: Skenario Zero tidak ditemukan pada perhitungan!");
  }

  if (parseFloat(foundZero.scenarioTotal) !== 0) {
    throw new Error(`GATE GAGAL: Total skenario zero bukan 0 melainkan ${foundZero.scenarioTotal}`);
  }

  if (foundZero.isDeficit) {
    throw new Error("GATE GAGAL: isDeficit bernilai true untuk total 0 dengan pagu positif!");
  }
  console.log(`  ✓ Total skenario zero: Rp ${foundZero.scenarioTotal}, isDeficit: ${foundZero.isDeficit}`);
  console.log("  ✓ Uji Decimal Math Edge Case LULUS.\n");

  // 4. Uji Deficit Detection & Tampilan Gap
  console.log("[4] Uji Deteksi Defisit: Skenario dengan total melebihi pagu ditandai isDeficit=true...");
  const scenarioDeficit = await createScenario(
    userKetuaA.id,
    eventA.id,
    "Skenario Mewah",
    "Skenario melebihi pagu",
    50
  );

  // Tambahkan item Rp 8.000.000 (melebihi pagu Rp 5.000.000)
  await addScenarioItem(userKetuaA.id, scenarioDeficit.id, {
    name: "Sewa Gedung Mewah",
    category: "Tempat",
    priority: "required",
    quantity: "1",
    estimatedUnitCost: "8000000.00",
  });

  const calcsDeficit = await listScenariosWithCalculations(userKetuaA.id, eventA.id);
  const foundDeficit = calcsDeficit.find((s) => s.id === scenarioDeficit.id);

  if (!foundDeficit) {
    throw new Error("GATE GAGAL: Skenario Mewah tidak ditemukan!");
  }

  if (!foundDeficit.isDeficit) {
    throw new Error(`GATE GAGAL: Skenario total Rp 8jt dengan pagu Rp 5jt tidak terdeteksi defisit!`);
  }

  const gapNum = parseFloat(foundDeficit.fundGap);
  if (gapNum >= 0) {
    throw new Error(`GATE GAGAL: fundGap skenario defisit seharusnya bernilai negatif, didapat: ${gapNum}`);
  }

  console.log(`  ✓ Skenario Mewah terdeteksi defisit (isDeficit: ${foundDeficit.isDeficit}, fundGap: ${foundDeficit.fundGap})`);

  // Submit skenario defisit harus ditolak server
  let deficitSubmitBlocked = false;
  try {
    await submitScenarioAsBudget(userKetuaA.id, scenarioDeficit.id);
  } catch (err: unknown) {
    if (err instanceof AuthorizationError && err.code === "BUDGET_DEFICIT") {
      deficitSubmitBlocked = true;
      console.log(`  ✓ Pengajuan skenario defisit berhasil ditolak server: ${err.message}`);
    }
  }

  if (!deficitSubmitBlocked) {
    throw new Error("GATE GAGAL: Skenario defisit berhasil diajukan sebagai anggaran resmi!");
  }
  console.log("  ✓ Uji Deteksi Defisit & Proteksi Pengajuan LULUS.\n");

  // 5. Uji Edit & Hapus Item Skenario
  console.log("[5] Uji Edit dan Hapus Item Skenario...");
  const itemToEdit = await addScenarioItem(userKetuaA.id, scenarioA.id, {
    name: "Spanduk Kegiatan",
    quantity: "2",
    estimatedUnitCost: "75000",
  });

  const updatedItem = await updateScenarioItem(userKetuaA.id, itemToEdit.id, {
    name: "Spanduk Kegiatan Vinyl",
    quantity: "3",
    estimatedUnitCost: "80000",
  });

  if (updatedItem.name !== "Spanduk Kegiatan Vinyl" || parseFloat(updatedItem.quantity) !== 3) {
    throw new Error(`GATE GAGAL: Update item skenario tidak tersimpan dengan benar! Diterima quantity: ${updatedItem.quantity}`);
  }
  console.log(`  ✓ Item berhasil diubah menjadi: "${updatedItem.name}" (Qty: ${updatedItem.quantity})`);

  await deleteScenarioItem(userKetuaA.id, itemToEdit.id);
  const checkDeleted = await db
    .select()
    .from(budgetScenarioItems)
    .where(eq(budgetScenarioItems.id, itemToEdit.id));

  if (checkDeleted.length > 0) {
    throw new Error("GATE GAGAL: Item skenario masih ada setelah dihapus!");
  }
  console.log("  ✓ Item berhasil dihapus dari database.");
  console.log("  ✓ Uji Edit & Hapus Item LULUS.\n");

  // 6. Uji Snapshot Immutability setelah Submit
  console.log("[6] Uji Snapshot Immutability: Skenario tidak dapat diubah setelah diajukan...");
  // Tambah item valid ke Skenario Standar
  const itemImm = await addScenarioItem(userKetuaA.id, scenarioA.id, {
    name: "Konsumsi Peserta",
    category: "Konsumsi",
    priority: "required",
    quantity: "50",
    estimatedUnitCost: "25000", // Rp 1.250.000 (aman, <= pagu 5jt)
  });

  const submittedVersion = await submitScenarioAsBudget(userKetuaA.id, scenarioA.id);
  console.log(`  ✓ Skenario diajukan menjadi Versi Anggaran #${submittedVersion.versionNumber}`);

  let addBlocked = false;
  try {
    await addScenarioItem(userKetuaA.id, scenarioA.id, {
      name: "Item Ilegal Pasca Submit",
      quantity: "1",
      estimatedUnitCost: "50000",
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError && err.code === "SCENARIO_IMMUTABLE") {
      addBlocked = true;
      console.log(`  ✓ Penambahan item ditolak: ${err.message}`);
    }
  }

  if (!addBlocked) {
    throw new Error("GATE GAGAL: Berhasil menambah item ke skenario yang sudah diajukan!");
  }

  let updateBlocked = false;
  try {
    await updateScenarioItem(userKetuaA.id, itemImm.id, {
      name: "Nama Berubah Pasca Submit",
    });
  } catch (err: unknown) {
    if (err instanceof AuthorizationError && err.code === "SCENARIO_IMMUTABLE") {
      updateBlocked = true;
      console.log(`  ✓ Pembaruan item ditolak: ${err.message}`);
    }
  }

  if (!updateBlocked) {
    throw new Error("GATE GAGAL: Berhasil mengubah item pada skenario yang sudah diajukan!");
  }

  let deleteBlocked = false;
  try {
    await deleteScenarioItem(userKetuaA.id, itemImm.id);
  } catch (err: unknown) {
    if (err instanceof AuthorizationError && err.code === "SCENARIO_IMMUTABLE") {
      deleteBlocked = true;
      console.log(`  ✓ Penghapusan item ditolak: ${err.message}`);
    }
  }

  if (!deleteBlocked) {
    throw new Error("GATE GAGAL: Berhasil menghapus item pada skenario yang sudah diajukan!");
  }
  console.log("  ✓ Uji Snapshot Immutability LULUS.\n");

  // 7. Uji Archive Skenario
  console.log("[7] Uji Arsip Skenario: Skenario terarsip tidak muncul di perbandingan aktif...");
  await archiveScenario(userKetuaA.id, scenarioZero.id);

  const activeScenarios = await listScenariosWithCalculations(userKetuaA.id, eventA.id);
  const foundArchived = activeScenarios.find((s) => s.id === scenarioZero.id);

  if (foundArchived) {
    throw new Error("GATE GAGAL: Skenario terarsip masih muncul di list skenario aktif!");
  }
  console.log("  ✓ Skenario terarsip berhasil disaring keluar dari lab perbandingan aktif.");
  console.log("  ✓ Uji Arsip Skenario LULUS.\n");

  // Cleanup data uji
  console.log("[8] Pembersihan entitas uji...");
  await db.delete(auditLogs).where(eq(auditLogs.organizationId, orgA.id));
  await db.delete(budgetItems).where(eq(budgetItems.budgetVersionId, submittedVersion.id));
  await db.delete(budgetVersions).where(eq(budgetVersions.eventId, eventA.id));
  await db.delete(budgetScenarioItems).where(eq(budgetScenarioItems.scenarioId, scenarioA.id));
  await db.delete(budgetScenarioItems).where(eq(budgetScenarioItems.scenarioId, scenarioDeficit.id));
  await db.delete(budgetScenarioItems).where(eq(budgetScenarioItems.scenarioId, scenarioZero.id));
  await db.delete(budgetScenarios).where(eq(budgetScenarios.eventId, eventA.id));
  await db.delete(events).where(eq(events.id, eventA.id));
  await db.delete(memberships).where(eq(memberships.organizationId, orgA.id));
  await db.delete(memberships).where(eq(memberships.organizationId, orgB.id));
  await db.delete(organizations).where(eq(organizations.id, orgA.id));
  await db.delete(organizations).where(eq(organizations.id, orgB.id));
  await db.delete(users).where(eq(users.id, userKetuaA.id));
  await db.delete(users).where(eq(users.id, userOrgB.id));
  console.log("  ✓ Data uji berhasil dibersihkan.\n");

  console.log("============================================================");
  console.log("  SEMUA PENGUJIAN GATE FASE 4 LULUS 100%");
  console.log("============================================================\n");
}

runPhase4GateTests().catch((err) => {
  console.error("FATAL ERROR pada Pengujian Gate Fase 4:", err);
  process.exit(1);
});
