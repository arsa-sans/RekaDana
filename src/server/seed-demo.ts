/**
 * seed-demo.ts
 *
 * Menyiapkan data demo realistis untuk presentasi/kompetisi RekaDana.
 * Semua data berdasarkan skenario nyata kegiatan SMK: Studi Tour dan Pagelaran Seni.
 *
 * Jalankan: bun run db:seed-demo
 *
 * Kebutuhan: .env.local dikonfigurasi (DATABASE_URL)
 * Idempoten: aman dijalankan berulang (cek duplikat lewat email/slug).
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { eq, and } from "drizzle-orm";
import { randomBytes, scryptSync } from "node:crypto";
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
} from "./db/schema";

if (!neonConfig.webSocketConstructor && typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle({ client: pool });

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function findOrCreate<T extends { id: string }>(
  findFn: () => Promise<T | undefined>,
  createFn: () => Promise<T>,
  label: string
): Promise<T> {
  const existing = await findFn();
  if (existing) {
    console.log(`  [skip] ${label} sudah ada`);
    return existing;
  }
  const created = await createFn();
  console.log(`  [buat] ${label} (id: ${created.id})`);
  return created;
}

async function main() {
  console.log("=== RekaDana Demo Seed ===\n");

  // -------------------------------------------------------------------------
  // 1. Users
  // -------------------------------------------------------------------------
  console.log("1. Membuat akun pengguna demo...");

  const ketuaUser = await findOrCreate(
    async () => {
      const [u] = await db.select().from(users).where(eq(users.email, "budi.santoso@demo.rekadana")).limit(1);
      return u;
    },
    async () => {
      const [u] = await db.insert(users).values({
        name: "Budi Santoso",
        email: "budi.santoso@demo.rekadana",
        passwordHash: hashPassword("DemoRekaDana2026!"),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return u!;
    },
    "Ketua Kegiatan: Budi Santoso"
  );

  const bendaharaUser = await findOrCreate(
    async () => {
      const [u] = await db.select().from(users).where(eq(users.email, "siti.rahayu@demo.rekadana")).limit(1);
      return u;
    },
    async () => {
      const [u] = await db.insert(users).values({
        name: "Siti Rahayu",
        email: "siti.rahayu@demo.rekadana",
        passwordHash: hashPassword("DemoRekaDana2026!"),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return u!;
    },
    "Bendahara: Siti Rahayu"
  );

  const panitiaUser = await findOrCreate(
    async () => {
      const [u] = await db.select().from(users).where(eq(users.email, "andi.pratama@demo.rekadana")).limit(1);
      return u;
    },
    async () => {
      const [u] = await db.insert(users).values({
        name: "Andi Pratama",
        email: "andi.pratama@demo.rekadana",
        passwordHash: hashPassword("DemoRekaDana2026!"),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return u!;
    },
    "Panitia: Andi Pratama"
  );

  // -------------------------------------------------------------------------
  // 2. Organisasi
  // -------------------------------------------------------------------------
  console.log("\n2. Membuat organisasi demo...");

  const org = await findOrCreate(
    async () => {
      const [o] = await db.select().from(organizations).where(eq(organizations.slug, "smk-nusantara-demo")).limit(1);
      return o;
    },
    async () => {
      const [o] = await db.insert(organizations).values({
        name: "OSIS SMK Nusantara 1",
        slug: "smk-nusantara-demo",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return o!;
    },
    "Org: OSIS SMK Nusantara 1"
  );

  // -------------------------------------------------------------------------
  // 3. Membership
  // -------------------------------------------------------------------------
  console.log("\n3. Menambahkan anggota ke organisasi...");

  for (const { userId, role, label } of [
    { userId: ketuaUser.id, role: "ketua_kegiatan" as const, label: "Budi (Ketua)" },
    { userId: bendaharaUser.id, role: "bendahara" as const, label: "Siti (Bendahara)" },
    { userId: panitiaUser.id, role: "panitia_anggota" as const, label: "Andi (Panitia)" },
  ]) {
    await findOrCreate(
      async () => {
        const [m] = await db.select().from(memberships).where(
          and(eq(memberships.userId, userId), eq(memberships.organizationId, org.id))
        ).limit(1);
        return m;
      },
      async () => {
        const [m] = await db.insert(memberships).values({
          userId,
          organizationId: org.id,
          role,
          isActive: true,
          joinedAt: new Date(),
          createdAt: new Date(),
        }).returning();
        return m!;
      },
      `Membership: ${label}`
    );
  }

  // -------------------------------------------------------------------------
  // 4. Kegiatan
  // -------------------------------------------------------------------------
  console.log("\n4. Membuat kegiatan demo...");

  const event1 = await findOrCreate(
    async () => {
      const [e] = await db.select().from(events).where(
        and(eq(events.organizationId, org.id), eq(events.name, "Studi Tour Bandung 2027"))
      ).limit(1);
      return e;
    },
    async () => {
      const [e] = await db.insert(events).values({
        organizationId: org.id,
        name: "Studi Tour Bandung 2027",
        description: "Kunjungan edukatif ke Museum Geologi dan ITB untuk siswa kelas XI jurusan Teknik.",
        participantCount: 60,
        availableFunds: "18000000.00",
        isActive: true,
        createdBy: ketuaUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return e!;
    },
    "Kegiatan: Studi Tour Bandung 2027"
  );

  const event2 = await findOrCreate(
    async () => {
      const [e] = await db.select().from(events).where(
        and(eq(events.organizationId, org.id), eq(events.name, "Pagelaran Seni Akhir Tahun 2026"))
      ).limit(1);
      return e;
    },
    async () => {
      const [e] = await db.insert(events).values({
        organizationId: org.id,
        name: "Pagelaran Seni Akhir Tahun 2026",
        description: "Penampilan seni budaya siswa: tari, musik, dan drama teatrikal.",
        participantCount: 120,
        availableFunds: "12000000.00",
        isActive: true,
        createdBy: ketuaUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return e!;
    },
    "Kegiatan: Pagelaran Seni Akhir Tahun 2026"
  );

  // -------------------------------------------------------------------------
  // 5. Skenario Anggaran (Studi Tour)
  // -------------------------------------------------------------------------
  console.log("\n5. Membuat skenario anggaran...");

  const scenario1 = await findOrCreate(
    async () => {
      const [s] = await db.select().from(budgetScenarios).where(
        and(eq(budgetScenarios.eventId, event1.id), eq(budgetScenarios.name, "Skenario A: Bus Reguler"))
      ).limit(1);
      return s;
    },
    async () => {
      const [s] = await db.insert(budgetScenarios).values({
        eventId: event1.id,
        name: "Skenario A: Bus Reguler",
        description: "Menggunakan armada bus reguler 3 unit, penginapan guest house.",
        participantCount: 60,
        isArchived: false,
        createdBy: ketuaUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return s!;
    },
    "Skenario A: Bus Reguler"
  );

  const scenario1Items = [
    { name: "Sewa bus 3 unit (PP Bandung)", quantity: "3.00", estimatedUnitCost: "2500000.00" },
    { name: "Penginapan guest house 2 malam", quantity: "60.00", estimatedUnitCost: "120000.00" },
    { name: "Tiket masuk Museum Geologi", quantity: "60.00", estimatedUnitCost: "15000.00" },
    { name: "Makan siang 2 hari", quantity: "120.00", estimatedUnitCost: "30000.00" },
    { name: "Dokumentasi (fotografer)", quantity: "1.00", estimatedUnitCost: "500000.00" },
    { name: "Biaya cadangan 5%", quantity: "1.00", estimatedUnitCost: "574500.00" },
  ];

  for (const item of scenario1Items) {
    await findOrCreate(
      async () => {
        const [i] = await db.select().from(budgetScenarioItems).where(
          and(eq(budgetScenarioItems.scenarioId, scenario1.id), eq(budgetScenarioItems.name, item.name))
        ).limit(1);
        return i;
      },
      async () => {
        const [i] = await db.insert(budgetScenarioItems).values({
          scenarioId: scenario1.id,
          name: item.name,
          quantity: item.quantity,
          estimatedUnitCost: item.estimatedUnitCost,
          isIncluded: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        return i!;
      },
      `  Item: ${item.name}`
    );
  }

  // -------------------------------------------------------------------------
  // 6. Versi Anggaran Resmi (Pagelaran Seni - sudah disetujui)
  // -------------------------------------------------------------------------
  console.log("\n6. Membuat versi anggaran resmi (Pagelaran Seni)...");

  const budgetVersion = await findOrCreate(
    async () => {
      const [v] = await db.select().from(budgetVersions).where(
        and(eq(budgetVersions.eventId, event2.id), eq(budgetVersions.status, "approved"))
      ).limit(1);
      return v;
    },
    async () => {
      const [v] = await db.insert(budgetVersions).values({
        eventId: event2.id,
        versionNumber: 1,
        snapshotTotal: "11200000.00",
        snapshotAvailableFunds: "12000000.00",
        snapshotParticipantCount: 120,
        status: "approved",
        submittedBy: ketuaUser.id,
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        reviewedBy: bendaharaUser.id,
        reviewedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      }).returning();
      return v!;
    },
    "Versi Anggaran v1 (Approved)"
  );

  const versionItems = [
    { name: "Sewa panggung dan tenda", quantity: "1.00", unitCost: "4500000.00", total: "4500000.00" },
    { name: "Sewa sound system", quantity: "1.00", unitCost: "2200000.00", total: "2200000.00" },
    { name: "Kostum penampil", quantity: "120.00", unitCost: "30000.00", total: "3600000.00" },
    { name: "Konsumsi panitia dan tamu", quantity: "50.00", unitCost: "50000.00", total: "2500000.00" },
    { name: "Spanduk dan dekorasi", quantity: "1.00", unitCost: "800000.00", total: "800000.00" },
    { name: "Dokumentasi video dan foto", quantity: "1.00", unitCost: "1100000.00", total: "1100000.00" },
  ];

  for (const item of versionItems) {
    await findOrCreate(
      async () => {
        const [i] = await db.select().from(budgetItems).where(
          and(eq(budgetItems.budgetVersionId, budgetVersion.id), eq(budgetItems.name, item.name))
        ).limit(1);
        return i;
      },
      async () => {
        const [i] = await db.insert(budgetItems).values({
          budgetVersionId: budgetVersion.id,
          name: item.name,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.total,
          createdAt: new Date(),
        }).returning();
        return i!;
      },
      `  Item versi: ${item.name}`
    );
  }

  // -------------------------------------------------------------------------
  // 7. Permintaan Pengeluaran (Pagelaran - dalam proses)
  // -------------------------------------------------------------------------
  console.log("\n7. Membuat permintaan pengeluaran demo...");

  const expense1 = await findOrCreate(
    async () => {
      const [r] = await db.select().from(expenseRequests).where(
        and(eq(expenseRequests.eventId, event2.id), eq(expenseRequests.title, "DP Sewa Panggung dan Tenda"))
      ).limit(1);
      return r;
    },
    async () => {
      const [r] = await db.insert(expenseRequests).values({
        eventId: event2.id,
        budgetVersionId: budgetVersion.id,
        requestedBy: panitiaUser.id,
        title: "DP Sewa Panggung dan Tenda",
        description: "Uang muka 50% sewa panggung outdoor + tenda 10x20m kepada CV Maju Bersama.",
        requestedAmount: "2250000.00",
        approvedAmount: "2250000.00",
        status: "approved",
        reviewedBy: bendaharaUser.id,
        reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      }).returning();
      return r!;
    },
    "Pengeluaran: DP Sewa Panggung"
  );

  await findOrCreate(
    async () => {
      const [p] = await db.select().from(payments).where(
        eq(payments.expenseRequestId, expense1.id)
      ).limit(1);
      return p;
    },
    async () => {
      const [p] = await db.insert(payments).values({
        expenseRequestId: expense1.id,
        idempotencyKey: `demo-pay-${expense1.id}-001`,
        amount: "2250000.00",
        postedBy: bendaharaUser.id,
        notes: "Transfer ke rekening CV Maju Bersama via BCA. Bukti terlampir.",
        isReversed: false,
        postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      }).returning();
      return p!;
    },
    "Pembayaran: DP Panggung (Lunas)"
  );

  await findOrCreate(
    async () => {
      const [r] = await db.select().from(expenseRequests).where(
        and(eq(expenseRequests.eventId, event2.id), eq(expenseRequests.title, "Pembelian Kostum Penampil"))
      ).limit(1);
      return r;
    },
    async () => {
      const [r] = await db.insert(expenseRequests).values({
        eventId: event2.id,
        budgetVersionId: budgetVersion.id,
        requestedBy: panitiaUser.id,
        title: "Pembelian Kostum Penampil",
        description: "120 set kostum untuk 4 kelompok penampilan: tari tradisional, band, teater, dan paduan suara.",
        requestedAmount: "3600000.00",
        status: "submitted",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      }).returning();
      return r!;
    },
    "Pengeluaran: Pembelian Kostum (Menunggu Review)"
  );

  // -------------------------------------------------------------------------
  // Ringkasan
  // -------------------------------------------------------------------------
  console.log("\n=== Seed berhasil ===");
  console.log("\nAkun demo (password: DemoRekaDana2026!):");
  console.log("  Ketua    : budi.santoso@demo.rekadana");
  console.log("  Bendahara: siti.rahayu@demo.rekadana");
  console.log("  Panitia  : andi.pratama@demo.rekadana");
  console.log("\nOrganisasi: OSIS SMK Nusantara 1");
  console.log("Kegiatan  :");
  console.log("  - Studi Tour Bandung 2027 (Scenario Lab aktif)");
  console.log("  - Pagelaran Seni Akhir Tahun 2026 (Anggaran disetujui, pengeluaran berjalan)");

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed gagal:", err);
  process.exit(1);
});
