import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { validateOrigin } from "./http/csrf";
import { checkRateLimit, getClientIp } from "./http/ratelimit";
import { NextRequest } from "next/server";
import { hashPassword, verifyPassword } from "./auth/passwords";
import { loginSchema, registerSchema, createExpenseRequestSchema } from "./validation";
import { SESSION_COOKIE_NAME } from "./auth/session";
import { requireMembership, requireEventAccess, AuthorizationError } from "./authorization/tenant";
import { db } from "./db";
import { users, organizations, memberships, events } from "./db/schema";
import { eq } from "drizzle-orm";

async function runPhase10SecurityGateTests() {
  console.log("============================================================");
  console.log("  REKADANA - PENGUJIAN GATE FASE 10 (SECURITY & HARDENING)");
  console.log("============================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      throw new Error(`Pengujian gagal: ${testName}`);
    }
  }

  // 1. PENGUJIAN CSRF ORIGIN VALIDATION
  console.log("[1] Menguji CSRF Origin Validation...");

  // Skenario 1.1: Request dengan Bearer token (Mobile/API client) -> SELALU LOLOS
  const bearerReq = new NextRequest("http://localhost:3000/api/v1/events", {
    method: "POST",
    headers: {
      authorization: "Bearer test_token_123",
      origin: "http://malicious-site.com",
    },
  });
  assert(validateOrigin(bearerReq) === true, "1.1 Bearer token (mobile client) diizinkan tanpa batasan origin web");

  // Skenario 1.2: Request dari origin yang sama (same-host) -> LOLOS
  const sameHostReq = new NextRequest("http://localhost:3000/api/v1/events", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
    },
  });
  assert(validateOrigin(sameHostReq) === true, "1.2 Request dari same-host origin diizinkan");

  // Skenario 1.3: Request cross-origin mencurigakan pada mode produksi
  const originalEnv = process.env.NODE_ENV;
  const originalAppUrl = process.env.APP_URL;
  try {
    (process.env as any).NODE_ENV = "production";
    process.env.APP_URL = "https://rekadana.sch.id";

    const maliciousReq = new NextRequest("https://rekadana.sch.id/api/v1/events", {
      method: "POST",
      headers: {
        host: "rekadana.sch.id",
        origin: "https://evil-attacker.com",
      },
    });
    assert(validateOrigin(maliciousReq) === false, "1.3 Request dari untrusted external origin ditolak (403)");

    const trustedAppReq = new NextRequest("https://rekadana.sch.id/api/v1/events", {
      method: "POST",
      headers: {
        host: "rekadana.sch.id",
        origin: "https://rekadana.sch.id",
      },
    });
    assert(validateOrigin(trustedAppReq) === true, "1.4 Request dari konfigurasi APP_URL resmi diizinkan");

    const noOriginProdReq = new NextRequest("https://rekadana.sch.id/api/v1/events", {
      method: "POST",
      headers: {
        host: "rekadana.sch.id",
      },
    });
    assert(validateOrigin(noOriginProdReq) === false, "1.5 Request browser tanpa Origin/Referer di production ditolak");
  } finally {
    (process.env as any).NODE_ENV = originalEnv;
    process.env.APP_URL = originalAppUrl;
  }

  // 2. PENGUJIAN RATE LIMITING
  console.log("\n[2] Menguji In-Memory Rate Limiting...");

  const testIp = `192.168.1.${Math.floor(Math.random() * 250) + 2}`;
  
  // IP helper check
  const dummyHeaders = new Headers();
  dummyHeaders.set("x-forwarded-for", `${testIp}, 10.0.0.1`);
  assert(getClientIp(dummyHeaders) === testIp, "2.1 getClientIp mengekstrak IP pertama dari x-forwarded-for");

  // Auth rate limit (dev mode max 100, kita uji burst)
  let allowedCount = 0;
  for (let i = 0; i < 105; i++) {
    if (checkRateLimit(testIp, "auth")) {
      allowedCount++;
    }
  }
  // Di dev max adalah 100, jadi 100 harus allowed, 5 diblokir
  assert(allowedCount === 100, `2.2 Rate limit membatasi burst request (tercapai batas ${allowedCount}/100)`);
  assert(checkRateLimit(testIp, "auth") === false, "2.3 Percobaan berikutnya setelah limit habis langsung diblokir");

  // 3. PENGUJIAN MASS ASSIGNMENT & SCHEMA VALIDATION
  console.log("\n[3] Menguji Pencegahan Mass Assignment via Zod...");

  // Extra/injected fields harus di-strip atau tidak mengganggu schema
  const maliciousRegisterBody = {
    email: "test_security@example.com",
    password: "PasswordSuperKuat123!",
    name: "Calon Ketua",
    isAdmin: true, // injected field
    role: "superadmin", // injected field
    balance: "999999999", // injected field
  };
  const parsedRegister = registerSchema.safeParse(maliciousRegisterBody);
  assert(parsedRegister.success === true, "3.1 Schema registrasi memvalidasi field yang legal");
  if (parsedRegister.success) {
    const keys = Object.keys(parsedRegister.data);
    assert(!keys.includes("isAdmin"), "3.2 Injected field 'isAdmin' tidak lolos ke parsed data");
    assert(!keys.includes("role"), "3.3 Injected field 'role' tidak lolos ke parsed data");
    assert(!keys.includes("balance"), "3.4 Injected field 'balance' tidak lolos ke parsed data");
  }

  // Pengujian negative amount injection
  const negativeExpense = {
    title: "Dana fiktif negatif",
    requestedAmount: "-500000",
  };
  const parsedNegative = createExpenseRequestSchema.safeParse(negativeExpense);
  assert(parsedNegative.success === false, "3.5 Nilai pengeluaran negatif ditolak oleh schema server");

  // 4. PENGUJIAN PASSWORD SECURITY & HASHING
  console.log("\n[4] Menguji Keamanan Password Hashing...");

  const rawPassword = "KataSandiSangatRahasia!2026";
  const hash1 = hashPassword(rawPassword);
  const hash2 = hashPassword(rawPassword);

  assert(hash1 !== rawPassword, "4.1 Password tidak pernah disimpan plain text");
  assert(hash1 !== hash2, "4.2 Salt acak digunakan (dua hash berbeda untuk password sama)");
  assert(verifyPassword(rawPassword, hash1) === true, "4.3 Verifikasi password yang benar berhasil");
  assert(verifyPassword("PasswordSalah123", hash1) === false, "4.4 Verifikasi password salah ditolak");

  // 5. PENGUJIAN TENANT & ROLE AUTHORIZATION REGRESSION
  console.log("\n[5] Menguji Regresi Tenant Isolation & Role RBAC...");

  const ts = Date.now();
  const [userAlpha] = await db.insert(users).values({
    email: `sec_alpha_${ts}@example.com`,
    name: "User Alpha",
    passwordHash: hashPassword(rawPassword),
  }).returning();

  const [orgAlpha] = await db.insert(organizations).values({
    name: `Org Alpha ${ts}`,
    slug: `org-alpha-${ts}`,
  }).returning();

  const [orgBeta] = await db.insert(organizations).values({
    name: `Org Beta ${ts}`,
    slug: `org-beta-${ts}`,
  }).returning();

  // User Alpha hanya anggota di Org Alpha (role: panitia_anggota)
  await db.insert(memberships).values({
    userId: userAlpha.id,
    organizationId: orgAlpha.id,
    role: "panitia_anggota",
    isActive: true,
  });

  // Uji 5.1: Akses ke org yang bukan anggotanya (Org Beta) -> Harus throw AuthorizationError 403
  let orgDenied = false;
  try {
    await requireMembership(userAlpha.id, orgBeta.id);
  } catch (err: any) {
    if (err instanceof AuthorizationError && err.statusCode === 403) {
      orgDenied = true;
    }
  }
  assert(orgDenied, "5.1 Cross-tenant access: user org A diblokir dari akses data org B (403)");

  // Uji 5.2: Role check - Panitia Anggota mencoba aksi role Bendahara -> Harus ditolak 403
  let roleDenied = false;
  try {
    await requireMembership(userAlpha.id, orgAlpha.id, ["bendahara"]);
  } catch (err: any) {
    if (err instanceof AuthorizationError && err.statusCode === 403) {
      roleDenied = true;
    }
  }
  assert(roleDenied, "5.2 Role escalation: panitia_anggota dilarang mengakses aksi khusus bendahara (403)");

  // Cleanup testing entities
  await db.delete(memberships).where(eq(memberships.userId, userAlpha.id));
  await db.delete(organizations).where(eq(organizations.id, orgAlpha.id));
  await db.delete(organizations).where(eq(organizations.id, orgBeta.id));
  await db.delete(users).where(eq(users.id, userAlpha.id));

  console.log("\n============================================================");
  console.log(`  SEMUA PENGUJIAN GATE FASE 10 BERHASIL (${passedTests}/${totalTests} PASS)`);
  console.log("============================================================\n");
}

runPhase10SecurityGateTests().catch((err) => {
  console.error("Fatal error during Phase 10 gate tests:", err);
  process.exit(1);
});
