# Reka Dana — Tasks & Progress

> Dokumen ini adalah panduan pengerjaan project RekaDana berdasarkan dokumentasi brainstorming v4.0.
> Setiap fase selesai -> laporkan -> **tunggu konfirmasi eksplisit** sebelum lanjut ke fase berikutnya.
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
- Bukti lampiran: PDF/JPEG/PNG, maks 5 MiB (5.242.880 byte) (validasi server-side)
- Storage development: local private; production: S3-compatible private

**Repo GitHub:**
- Web: [github.com/arsa-sans/RekaDana](https://github.com/arsa-sans/RekaDana)
- Mobile: [github.com/arsa-sans/rekadana_mobile](https://github.com/arsa-sans/rekadana_mobile)

**Antislop:** `during` (session override) (berlaku sepanjang pengerjaan).

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
| 7 | Evidence & private storage | 🟡 Sebagian | API upload/download ada, storage lokal dev, mobile upload ada |
| 8 | Dashboard, reports, audit, export | 🟡 Sebagian | Budget vs actual ada, laporan web ada, CSV export belum |
| 9 | Integrasi vertical slice web + Flutter | 🔴 Belum | Mobile masih ada gap fitur; integrasi end-to-end belum diuji |
| 10 | Security, performance, accessibility, hardening | 🔴 Belum | Belum ada security regression atau a11y audit |
| 11 | Deployment, demo & submission prep | 🔴 Belum | Belum ada deployment ke production |

---

## Fase 0 — Mengunci Baseline & Kebutuhan ✅

**Status: Selesai** (dilakukan di ChatGPT brainstorming session)

Dokumen yang sudah ditetapkan di brainstorming:
- [x] DECISIONS.md (keputusan arsitektur dan domain)
- [x] ARCHITECTURE.md (fullstack Next.js + Flutter Android)
- [x] API_SPEC.md (prefix `/api/v1`, format error seragam)
- [x] DATABASE.md (PostgreSQL + Drizzle ORM)
- [x] SECURITY.md (session cookie, storage privat)
- [x] ROADMAP.md (11 fase dengan approval gate)
- [x] AGENTS.md (aturan AI coding agent)
- [x] SKILL.md (antislop skill setup)

> **Catatan:** Aturan resmi Traspac Competition 2027 belum terverifikasi dari sumber resmi. Tidak ada klaim kompetisi tanpa bukti.

---

## Fase 1 — UX Flows & Design System ✅

**Status: Selesai (26 Oktober 2026)**

### Dikerjakan:

#### 1.1 DESIGN.md (Arah visual project)
- [x] Identitas produk: nama, personality, tone (profesional-approachable untuk SMK)
- [x] Palet warna: Deep Forest #153D35, Growth Green #35B88A, Mint Mist #EAF5F0, Cloud White #F6F8F7
- [x] Kontras WCAG AA diverifikasi via contrast-check.py (4 kombinasi dilarang dicatat)
- [x] Tipografi: Plus Jakarta Sans (dipilih karena konteks Indonesia + tidak AI-default)
- [x] Radius, shadow, spacing tokens (3 nilai radius, 2 level shadow, grid 4px)
- [x] ENERGY 2 / RHYTHM 2 / MOTION 1 dials
- [x] Aturan penggunaan Growth Green sebagai non-text color

#### 1.2 User journeys per role
- [x] Ketua Kegiatan: 5 alur lengkap
- [x] Bendahara: 5 alur lengkap (approve/reject budget, approve/reject expense, payment, reversal, export)
- [x] Panitia/Anggota: 4 alur lengkap
- [x] States wajib: kosong, loading, error, forbidden, success (contoh teks per halaman)

#### 1.3 Budget Scenario Lab spec
- [x] Layout satu skenario + tampilan defisit
- [x] Perbandingan side-by-side (>= 2 skenario)
- [x] Label wajib: "Skenario belum resmi sampai disetujui Bendahara"

#### 1.4 Design tokens
- [x] Format Rupiah: `Rp 1.250.000`
- [x] 7 status badge dengan label teks + warna (tidak hanya warna)
- [x] Terminologi konsisten: Diajukan/Disetujui/Ditolak/Lunas/Dibatalkan/Sebagian Lunas

**File yang dibuat:**
- `DESIGN.md` (di RekaDana (web) dan rekadana_mobile)
- `USER_JOURNEYS.md` (di RekaDana (web) dan rekadana_mobile)

**Gate Fase 1 (semua terpenuhi):**
- [x] Semua role utama punya flow yang jelas (3 role x alur lengkap)
- [x] DESIGN.md disetujui pengguna (palet, font, personality dikonfirmasi)
- [x] Kedua platform punya fungsi berguna yang terdefinisi

---

## Fase 2 — Repository & Setup ✅

**Status: Selesai (27 Oktober 2026)**

### Web (RekaDana) (selesai):
- [x] Next.js 16 App Router + TypeScript + Bun
- [x] Drizzle ORM + schema PostgreSQL
- [x] Neon PostgreSQL connection
- [x] Folder `src/app/api/v1/` dengan semua route handlers
- [x] Folder `src/server/{auth,db,modules,authorization,storage,audit,http,validation}/`
- [x] `.env.example` + `.gitignore`
- [x] CI setup (`.github/workflows/ci.yml`: lint + typecheck + build)
- [x] README.md resmi RekaDana Web
- [x] Health endpoint `/api/v1/health` dengan format konsisten (`apiSuccess`/`apiError`)
- [x] Error contract konsisten dengan `request_id` (UUID generated)
- [x] Security headers pada `next.config.ts` (nosniff, frame deny, referrer policy)
- [x] Flat config ESLint untuk Next.js 16 (`eslint.config.mjs`) & `bun run lint` clean (0 errors)
- [x] `bun run typecheck` & `bun run build` sukses (15/15 static & dynamic pages generated)

### Mobile (rekadana_mobile) (selesai):
- [x] Flutter + Dart project baseline
- [x] `lib/features/{auth,expenses,approval,organization}/`
- [x] `lib/core/{constants,network,storage,utils,widgets}/`
- [x] Dependency: dio, flutter_secure_storage, google_fonts, image_picker
- [x] CI setup (`.github/workflows/ci.yml`: flutter analyze + test)
- [x] README.md resmi RekaDana Mobile
- [x] `pubspec.yaml` description diperbarui
- [x] `flutter analyze` clean (0 warnings / no issues found)
- [x] `flutter test` lulus

**Gate Fase 2 (semua terpenuhi):**
- [x] Clean install web: `bun install && bun run lint && bun run build` sukses
- [x] Flutter: `flutter analyze && flutter test` clean
- [x] Error contract `/api/v1` terstandarisasi dengan `request_id`
- [x] Secrets tidak ada di repository

---

## Fase 3 — Auth, Organisasi, Membership & Authorization ✅

**Status: Selesai (27 Oktober 2026)**

### Web (selesai):
- [x] `POST /api/v1/auth/login` (login dengan email + password)
- [x] `POST /api/v1/auth/register` (registrasi user baru)
- [x] `POST /api/v1/auth/logout` (hapus session)
- [x] Session cookie-based (`HttpOnly`, `SameSite: Lax`, `Secure` pada production) via `setSessionCookie()`
- [x] `GET /api/v1/me` (profil user aktif)
- [x] `requireMembership()` + `requireEventAccess()` (tenant/resource authorization)
- [x] Role enum: `ketua_kegiatan`, `bendahara`, `panitia_anggota`
- [x] `GET /api/v1/organizations` + `POST` (CRUD organisasi)
- [x] `GET /api/v1/organizations/[orgId]/members` + `POST` (CRUD membership)
- [x] Proteksi CSRF mutasi (POST/PUT/PATCH/DELETE) via Next.js 16 `proxy.ts` (Origin & Host validation)
- [x] Session expiry terkonfigurasi (default 7 hari via `SESSION_TTL_DAYS`, expired token otomatis ditolak DB)
- [x] Halaman `/app` (pilih organisasi) redirect otomatis jika hanya 1 org, atau menampilkan kartu role jika > 1
- [x] Halaman `/app/new-org` untuk pembuatan organisasi baru dengan validasi dan slug otomatis
- [x] Error state khusus `MEMBERSHIP_INACTIVE` vs `ORGANIZATION_ACCESS_DENIED` pada layout organisasi
- [x] Test gate otomatis (`src/server/test-phase3-auth-gate.ts`) (100% lulus)

### Mobile (selesai):
- [x] Login screen + auth service
- [x] Token disimpan di `flutter_secure_storage`
- [x] `user_model.dart` (model user)
- [x] Logout + clear secure storage pada `OrgSelectionScreen` dan `EventsListScreen`
- [x] Token expiry handling: `ApiClient.onSessionExpired` mendeteksi 401 dan redirect ke login dengan pesan informatif
- [x] Org selection screen -> navigasi menuju event list dan kemampuan ganti organisasi
- [x] Error handling saat server offline / timeout: pemetaan `SocketException` & timeout ke Bahasa Indonesia
- [x] Automated unit & widget tests (`test/phase3_auth_test.dart`) (13/13 tests lulus)

**Gate sebelum lanjut ke Fase 4 (semua terpenuhi):**
- [x] Negative tests role bypass lulus (server-side rejection terbukti pada `test-phase3-auth-gate.ts`)
- [x] Tenant isolation: user org A tidak bisa akses data org B (terbukti 403 `ORGANIZATION_ACCESS_DENIED`)
- [x] Session/token expiry diuji pada kedua platform (Web: `expiresAt < NOW`, Mobile: 401 redirect & auto-clear)
- [x] Inactive membership ditolak (403 `MEMBERSHIP_INACTIVE` dengan recovery action ke `/app`)

---

## Fase 4 — Kegiatan & Budget Scenario Lab ✅

**Status: Selesai (28 Oktober 2026)**

### Web (selesai):
- [x] `GET /api/v1/organizations/[orgId]/events` + `POST` (list & buat kegiatan)
- [x] `GET /api/v1/events/[eventId]` + PATCH + DELETE (soft)
- [x] `GET /api/v1/events/[eventId]/budget-scenarios` + `POST`
- [x] `GET /api/v1/budget-scenarios/[scenarioId]/items` + `POST`
- [x] `PATCH /api/v1/budget-scenarios/[scenarioId]/items/[itemId]` + `DELETE` (edit & hapus item kebutuhan)
- [x] `PATCH /api/v1/budget-scenarios/[scenarioId]` (arsipkan skenario anggaran)
- [x] `POST /api/v1/budget-scenarios/[scenarioId]/submit` (ajukan ke budget version dengan snapshot immutability)
- [x] Tampilan perbandingan skenario side-by-side (komparasi hingga 3 skenario aktif)
- [x] Indikator defisit dan selisih pagu (fund gap) kontras dan jelas
- [x] Label resmi peringatan: "Skenario bukan anggaran resmi sampai disetujui Bendahara"
- [x] Edit & hapus item skenario interaktif (`ScenarioItemActions` dengan modal ubah & konfirmasi hapus)
- [x] Tombol arsipkan skenario (`ScenarioActions` dengan modal konfirmasi)
- [x] `participantCount` override per skenario (snapshot peserta khusus)
- [x] UI states lengkap: empty state, loading, error state, forbidden state
- [x] Pengujian otomatis gate Fase 4 (`src/server/test-phase4-gate.ts`) (100% lulus)

### Mobile (selesai):
- [x] Events list screen dengan navigasi menuju Scenario Lab
- [x] `ScenarioModel` & `ScenarioItemModel` (parsing data kalkulasi desimal finansial)
- [x] `ScenarioService` (integrasi API list, create, add item, dan submit skenario)
- [x] Layar daftar skenario per kegiatan (`ScenarioListScreen`) dengan metrik finansial
- [x] Layar buat skenario baru (`ScenarioCreateScreen`) dengan override kuantitas peserta
- [x] Layar tambah item kebutuhan (`ScenarioItemFormScreen`) dengan kalkulasi preview real-time
- [x] Tombol ajukan skenario ke Bendahara dengan dialog konfirmasi dan proteksi pemblokiran jika defisit
- [x] Pengujian unit & widget mobile (`test/phase4_scenario_test.dart`) (18/18 tests lulus)

**Gate sebelum lanjut ke Fase 5 (semua terpenuhi):**
- [x] Tenant check: scenario dari event lain tidak bisa diakses (terbukti 403 `ORGANIZATION_ACCESS_DENIED`)
- [x] Decimal math: test edge case jumlah 0, quantity 0 berhasil ditangani tanpa error desimal
- [x] Snapshot immutability: setelah submit menjadi budget version, skenario tidak bisa diubah (409 `SCENARIO_IMMUTABLE`)
- [x] Deficit (total > available funds) ditampilkan dengan jelas, bukan hidden

---

## Fase 5 — Versi Anggaran & Approval Bendahara ✅

**Status: Selesai (28 Oktober 2026)**

### Web (selesai):
- [x] `GET /api/v1/events/[eventId]/budgets` (list budget versions dengan submitter & reviewer)
- [x] `GET /api/v1/budget-versions/[versionId]` (detail versi beserta items snapshot dan diff comparison)
- [x] `POST /api/v1/budget-versions/[versionId]/approve` (approve, Bendahara only)
- [x] `POST /api/v1/budget-versions/[versionId]/reject` (reject dengan alasan, Bendahara only)
- [x] **Histori versi** (tampilkan semua versi dengan status, submitter, reviewer, dan timestamp)
- [x] **Perbedaan antar versi** (diff snapshot) (perbandingan otomatis selisih nominal, selisih peserta, item baru, diubah, dan dihapus)
- [x] Konfirmasi modal sebelum approve/reject (`ConfirmModal` dengan Escape & WCAG AA contrast)
- [x] Self-approval blocked: pemohon dilarang menyetujui versinya sendiri (403 `SELF_APPROVAL_FORBIDDEN` di server & UI disabled)
- [x] Activation atomik: demosi versi lama ke draf dan aktivasi versi baru dalam 1 transaksi DB (tepat 1 versi resmi aktif)
- [x] Proteksi penurunan anggaran: penolakan 422 `BUDGET_REDUCTION_EXCEEDS_COMMITMENTS` jika total < komitmen pengeluaran berjalan
- [x] Label status versi: Draf, Diajukan, Disetujui, Ditolak dengan warna dan label teks kontras WCAG AA
- [x] Pengujian otomatis gate Fase 5 (`src/server/test-phase5-budget-gate.ts`) (100% lulus)

### Mobile (selesai):
- [x] `BudgetVersionModel`, `BudgetVersionDetailModel`, `BudgetItemDetailModel`, `BudgetComparisonModel`
- [x] `BudgetService` (API list versions, detail with diff snapshot, approve, dan reject dengan alasan)
- [x] Layar riwayat versi anggaran (`BudgetVersionListScreen`) dengan banner versi aktif, metrik finansial, dan pull-to-refresh
- [x] Layar rincian versi anggaran (`BudgetVersionDetailScreen`) dengan tabel item snapshot terkunci dan kartu perbandingan vs versi sebelumnya
- [x] Form & aksi approve/reject oleh Bendahara dengan dialog konfirmasi (`ConfirmationDialog`) dan input alasan (`RejectionReasonDialog`)
- [x] Pencegahan self-approval pada klien Flutter dengan peringatan prinsip pemisahan tugas
- [x] Navigasi cepat dari `EventsListScreen` menuju Versi Anggaran & Approval Bendahara
- [x] Pengujian unit & widget mobile (`test/phase5_budget_test.dart`) (7/7 tests lulus, total 25/25 tests mobile lulus)

**Gate sebelum lanjut ke Fase 6 (semua terpenuhi):**
- [x] Unauthorized approval ditolak server-side (403 `INSUFFICIENT_ROLE_PERMISSIONS` dan `ORGANIZATION_ACCESS_DENIED`)
- [x] Self-approval ditolak (403 `SELF_APPROVAL_FORBIDDEN` baik untuk approve maupun reject)
- [x] Activation atomik diuji (tepat 1 versi approved aktif, versi sebelumnya otomatis didemosi)
- [x] Konflik status diuji: approve versi saat ada versi approved lain berhasil mendemosi versi lama; versi rejected ditolak (409)
- [x] Over-commitment reduction ditolak (422 saat total baru < komitmen aktif)

---

## Fase 6 — Permintaan Pengeluaran, Payments & Koreksi ✅

**Status: Selesai (29 Oktober 2026)**

### Web:
- [x] `POST /api/v1/events/[eventId]/expense-requests` (ajukan pengeluaran lapangan)
- [x] `GET /api/v1/expense-requests/[requestId]` (detail lengkap dengan payment history dan summary finansial)
- [x] `POST /api/v1/expense-requests/[requestId]/approve` (approve pengeluaran dengan nominal disetujui)
- [x] `POST /api/v1/expense-requests/[requestId]/reject` (reject pengeluaran dengan alasan beraudit)
- [x] `POST /api/v1/expense-requests/[requestId]/payments` (catat pembayaran dengan kunci idempotensi)
- [x] `POST /api/v1/payments/[paymentId]/reverse` (pembatalan/reversal pembayaran dengan alasan)
- [x] **Pembayaran sebagian (partial payment)** (UI yang jelas untuk nominal dibayar vs sisa saldo)
- [x] **Remaining balance display** (tampilan sisa saldo pengeluaran yang belum dibayar)
- [x] Reversal form (alasan reversal wajib diisi minimal 5 karakter)
- [x] Lock concurrency saat pembayaran bersamaan (row lock `FOR UPDATE` diuji)
- [x] Over-budget prevention: peringatan dan penolakan 422 jika approved amount > remaining budget
- [x] Test: duplicate payment dengan idempotency key yang sama (replay idempotensi 200 vs konflik payload 409)
- [x] Test: negative amount ditolak server-side (422)
- [x] Konfirmasi modal sebelum approve/reject pengeluaran dan sebelum reversal
- [x] Pengujian otomatis gate Fase 6 (`src/server/test-phase6-expense-gate.ts` lulus 100%)

### Mobile:
- [x] Expense list screen dengan filter status
- [x] Expense create screen (form ajukan pengeluaran)
- [x] Expense detail screen (ringkasan pengeluaran & 4 kartu metrik finansial)
- [x] Bendahara review screen (approval pengeluaran)
- [x] Tampilan riwayat pembayaran per expense request (payments list + reversals)
- [x] Form catat pembayaran sebagian vs bayar penuh oleh Bendahara dengan pintasan nominal
- [x] Reversal tampil di history dengan alasan pembatalan dan tombol aksi beraudit
- [x] Sisa saldo (remaining balance) yang jelas di mobile
- [x] Error state: tidak ada approved budget version
- [x] Pengujian unit & widget mobile (`test/phase6_expense_test.dart` lulus 100%)

**Gate sebelum lanjut ke Fase 7 (Semua Terpenuhi):**
- [x] Concurrent payment test: dua request bersamaan tidak menghasilkan double payment (row lock `FOR UPDATE`)
- [x] Duplicate retry dengan idempotency key lulus (replay idempotent mengembalikan data transaksi asal)
- [x] Negative/zero amount ditolak server-side (422 `INVALID_AMOUNT`)
- [x] Reversal test: tidak bisa reverse melebihi amount asli (`EXCEEDS_REVERSIBLE_AMOUNT`)
- [x] Over-budget prevention: tidak bisa approve pengeluaran melebihi sisa anggaran resmi (`OVER_BUDGET_FORBIDDEN`)

---

## Fase 7 — Evidence & Private Storage 🟡

**Status: Sebagian selesai**

### Web:
- [x] `POST /api/v1/evidence` (upload bukti)
- [x] `GET /api/v1/evidence/[evidenceId]/download` (download private)
- [x] Validasi type: PDF/JPEG/PNG
- [x] Validasi size: <= 5 MiB (5.242.880 byte) server-side
- [x] Storage adapter interface (local dev)
- [x] Object key private (bukan public URL langsung)
- [x] Metadata di PostgreSQL, binary di storage
- [x] `EvidenceSection` di halaman expense detail
- [ ] Storage adapter S3-compatible untuk production
- [ ] MIME type validation via magic bytes (file signature)
- [ ] Orphan upload cleanup

### Mobile:
- [x] `image_picker` dependency
- [x] Upload bukti dari expense create screen
- [ ] Upload bukti dari expense detail screen
- [ ] Client-side validation file size sebelum upload
- [ ] Download / preview bukti dari mobile

**Gate sebelum lanjut ke Fase 8:**
- [ ] Type spoofing test: upload `.exe` dengan extension `.pdf` ditolak
- [ ] Max+1 byte: file 5.242.881 byte ditolak
- [ ] Unauthorized download ditolak (403)

---

## Fase 8 — Dashboard, Reports, Audit & Export 🟡

**Status: Sebagian selesai**

### Web:
- [x] `GET /api/v1/events/[eventId]/reports/budget-vs-actual` (laporan budget vs actual)
- [x] `getBudgetVsActualReport()` service (approved total, actual net, open commitments, remaining)
- [x] Dashboard: ringkasan anggaran kegiatan pertama
- [x] Laporan page per event
- [x] `BudgetSummary` component
- [ ] CSV export laporan
- [ ] Audit log view (histori semua aksi per event)
- [ ] Role-based export

### Mobile:
- [ ] Ringkasan keuangan per event (total budget, terpakai, sisa)
- [ ] Status pengeluaran summary

**Gate sebelum lanjut ke Fase 9:**
- [ ] Report reconciliation: total transaksi = summary angka
- [ ] Cross-tenant export ditolak

---

## Fase 9 — Integrasi Vertical Slice Web + Flutter 🔴

**Status: Belum dimulai**

### Alur end-to-end yang harus diuji di kedua platform:
1. Register + login -> pilih organisasi -> masuk dashboard
2. Buat kegiatan -> buat skenario -> tambah item -> submit sebagai budget version
3. Bendahara login -> review budget version -> approve/reject
4. Panitia submit expense request -> attach bukti
5. Bendahara approve expense -> catat pembayaran
6. Lihat laporan: budget vs actual

**Gate sebelum lanjut ke Fase 10:**
- [ ] Alur submit -> approval -> payment -> laporan berhasil di kedua klien

---

## Fase 10 — Security, Performance, Accessibility & Hardening 🔴

**Status: Belum dimulai**

### Security, Performance & Accessibility:
- [ ] CSRF origin validation di semua mutasi
- [ ] Rate limiting auth endpoints
- [ ] Security headers
- [ ] 0 WCAG AA contrast failure pada teks utama
- [ ] Production build sukses tanpa error

---

## Fase 11 — Deployment, Demo & Submission Prep 🔴

**Status: Belum dimulai**

### Deployment & Demo:
- [ ] Deploy Next.js ke production (Neon PostgreSQL)
- [ ] Build APK Android untuk demo
- [ ] Verifikasi ketiadaan data dummy / fake (R-38)

---

## Tugas Segera (Konfirmasi Dulu)

Fase 5 telah selesai 100%. **Saat ini mengerjakan Fase 6 (Permintaan Pengeluaran, Payments & Koreksi)**:
1. Validasi nominal positif/nol dan alasan pembatalan minimal 5 karakter pada service payments & reversals
2. Row-level concurrency lock (`FOR UPDATE`) pada pencatatan pembayaran untuk mencegah double-payment
3. Over-budget prevention pada persetujuan pengeluaran
4. UI web: detail sisa saldo belum dibayar (remaining balance) & opsi bayar lunas vs bayar sebagian
5. Mobile: integrasi riwayat pembayaran, sisa saldo, dan form pembayaran/reversal
6. Pengujian gate otomatis Fase 6 di backend dan mobile

---

## Catatan Commit

Setiap commit harus mendapat persetujuan pesan dari pengguna sebelum push. Format:
```
<type>(<scope>): <deskripsi singkat dalam Bahasa Indonesia>

Contoh:
feat(web): lengkapi histori versi anggaran, diff snapshot, dan approval bendahara fase 5
feat(mobile): tambah riwayat versi anggaran, diff snapshot, dan review bendahara fase 5
```

---

*Terakhir diperbarui: 29 Oktober 2026*
*Berdasarkan: RekaDana Dokumentasi v4.0*
