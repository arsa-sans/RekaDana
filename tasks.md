# Reka Dana — Tasks & Progress

> Dokumen ini adalah panduan pengerjaan project RekaDana berdasarkan dokumentasi brainstorming v4.0.
> Setiap fase selesai → laporkan → **tunggu konfirmasi eksplisit** sebelum lanjut ke fase berikutnya.
> Commit ke GitHub hanya setelah mendapat persetujuan pesan commit dari pengguna.

---

## Konteks Project

**Stack target:**
- Web: Next.js App Router + TypeScript + Bun + Tailwind CSS
- Backend: Next.js Route Handlers `/api/v1` + Drizzle ORM
- Database: PostgreSQL (Neon)
- Mobile: Flutter + Dart (target Android)
- Storage bukti: local private (dev) / S3-compatible private (prod)

**Aturan domain (tidak boleh dilanggar):**
- Tiga role operasional: `ketua_kegiatan`, `bendahara`, `panitia_anggota`
- Admin Platform terpisah sebagai akses teknis, bukan approver finansial
- Hanya Bendahara yang bisa approve/reject anggaran dan pengeluaran
- Self-approval dilarang; alasan reject wajib diisi
- UI dalam Bahasa Indonesia; angka dalam format IDR (Rupiah)
- Bukti lampiran: PDF/JPEG/PNG, maks 5 MiB (5.242.880 byte) — validasi server-side
- Storage development: local private; production: S3-compatible private

**Repo GitHub:**
- Web: [github.com/arsa-sans/RekaDana](https://github.com/arsa-sans/RekaDana)
- Mobile: [github.com/arsa-sans/rekadana_mobile](https://github.com/arsa-sans/rekadana_mobile)

**Antislop:** `during` (session override) — berlaku sepanjang pengerjaan.

---

## Ringkasan Status Fase

| Fase | Nama | Status | Keterangan |
|------|------|--------|------------|
| 0 | Mengunci baseline & kebutuhan | ✅ Selesai | Dokumentasi v4.0 sudah dibuat di ChatGPT |
| 1 | UX flows & design system | ✅ Selesai | DESIGN.md & USER_JOURNEYS.md siap di kedua platform |
| 2 | Repository, setup Next.js + Flutter | ✅ Selesai | Clean install, lint, typecheck, build, dan CI siap |
| 3 | Auth, organisasi, membership, authorization | ✅ Selesai | Cookie flags, proxy CSRF, tenant isolation, expiry, mobile error handling & negative tests lulus |
| 4 | Kegiatan & Budget Scenario Lab | ✅ Selesai | Komparasi skenario, edit/hapus item, arsip, immutability, Flutter lab & 100% gate tests |
| 5 | Versi anggaran & approval Bendahara | ✅ Selesai | Histori versi, diff snapshot, proteksi self-approval, aktivasi atomik, review Bendahara mobile & 100% gate tests |
| 6 | Permintaan pengeluaran, payments, koreksi | ✅ Selesai | Partial payment, remaining balance, concurrency lock, reversal, over-budget check & 100% gate tests |
| 7 | Evidence & private storage | ✅ Selesai | Magic bytes validation, batas 5 MiB, isolasi tenant 403, upload & preview mobile, 100% gate tests |
| 8 | Dashboard, reports, audit, export | ✅ Selesai | Rekonsiliasi akuntansi 100%, CSV export (role Bendahara), Audit Log view, ringkasan mobile & gate tests lulus |
| 9 | Integrasi vertical slice web + Flutter | ✅ Selesai | Alur end-to-end 6 langkah terintegrasi di Web & Flutter, pengujian otomatis gate lulus 100% |
| 10 | Security, performance, accessibility, hardening | ✅ Selesai | CSRF di semua mutasi, rate limiting auth, audit WCAG AA kontras 100%, 19/19 security gate tests, build web & mobile clean |
| 11 | Deployment, demo & submission prep | ✅ Selesai | Build web Next.js 16 clean, build APK release Android 54 MB, adapter S3 Neon Object Storage, data seed realistis R-38 |

---

## Fase 10 — Security, Performance, Accessibility & Hardening ✅

**Status: Selesai (10 November 2026)**

### Security:
- [x] CSRF origin validation di semua mutasi (POST, PATCH, DELETE) pada semua route handlers Next.js
- [x] Rate limiting in-memory pada auth endpoints (`/api/v1/auth/login` dan `/api/v1/auth/register`)
- [x] Security headers pada `next.config.ts`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
- [x] Pencegahan mass assignment via Zod schema (injected fields seperti `isAdmin` otomatis dibuang)
- [x] SQL injection prevention (Drizzle ORM parameterized queries)
- [x] Password hashing aman via PBKDF2/Crypto dengan salt acak dan perbandingan konstan
- [x] Pengujian otomatis gate keamanan (`src/server/test-phase10-security-gate.ts`, 19/19 lulus)

### Performance:
- [x] Pagination (`limit` & `page`/`offset`) pada `GET /api/v1/events/[eventId]/expense-requests` dan `GET /api/v1/events/[eventId]/audit-logs`
- [x] Database indexes terpasang pada foreign key (`organizationId`, `eventId`, `expenseRequestId`) dan unique token
- [x] Loading skeleton dan states di web (`States.tsx`) dan mobile

### Accessibility (antislop-human):
- [x] Audit kontras warna WCAG AA: 0 kontras teks yang gagal (perbaikan `text-slate-400` menjadi `text-slate-500` pada seluruh teks konten)
- [x] Focus rings (`focus-visible:ring-2`) terlihat jelas pada semua tombol, input, dan link
- [x] Keyboard navigation: modal konfirmasi (`ConfirmModal`) dapat ditutup dengan `Escape`, tab order logis
- [x] Form accessibility: semua input terhubung dengan `label` (`htmlFor`), `aria-describedby`, dan `aria-invalid`
- [x] `StatusChip`: status disajikan dengan teks eksplisit dan `sr-only` prefix, tidak bergantung pada warna saja (R-25)

### Hardening & Build Verification:
- [x] `bun run typecheck` sukses (0 error)
- [x] `bun run lint` sukses (0 error)
- [x] `bun run test:phase10` (19/19 gate tests passed)
- [x] `bun run build` sukses (15/15 static & dynamic pages generated)
- [x] `flutter analyze` sukses (0 issues found)
- [x] `flutter test` sukses (48/48 tests passed)

---

## Fase 11 — Deployment, Demo & Submission Prep ✅

**Status: Selesai (11 November 2026)**

### Deployment & Demo:
- [x] Deploy Next.js ke production (Neon PostgreSQL):
  - Adapter bukti privat S3 Neon Object Storage (`evidence.service.ts`)
  - Konfigurasi `vercel.json` siap deployment
  - Build web Next.js 16 clean (15/15 routes static & dynamic)
  - Typecheck dan lint lulus 100%
- [x] Build APK Android untuk demo:
  - Kompilasi `app-release.apk` (54.0 MB) dan `app-debug.apk` di `rekadana_mobile/build/app/outputs/flutter-apk/`
  - Pengaturan URL server dinamis di dialog Login
  - `flutter analyze` (0 issues) dan `flutter test` (48/48 tests lulus)
- [x] Verifikasi ketiadaan data dummy / fake (R-38):
  - Script seed data realistis `seed-demo.ts` (`bun run db:seed-demo`) dengan kegiatan sekolah nyata
  - Akun demo realistis: Ketua, Bendahara, dan Panitia OSIS SMK Nusantara 1
