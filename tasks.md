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
| 1 | UX flows & design system | 🔴 Belum | Belum ada DESIGN.md, wireframe, atau design tokens |
| 2 | Repository, setup Next.js + Flutter | 🟡 Sebagian | Web & mobile sudah ada, tapi struktur belum sepenuhnya sesuai spec |
| 3 | Auth, organisasi, membership, authorization | 🟡 Sebagian | Sudah ada auth session, login/register/logout, role check |
| 4 | Kegiatan & Budget Scenario Lab | 🟡 Sebagian | CRUD ada, web UI scenario lab ada, mobile terbatas |
| 5 | Versi anggaran & approval Bendahara | 🟡 Sebagian | API approve/reject ada, web UI ada, mobile belum |
| 6 | Permintaan pengeluaran, payments, koreksi | 🟡 Sebagian | API & web UI ada, reversal ada, mobile terbatas |
| 7 | Evidence & private storage | 🟡 Sebagian | API upload/download ada, storage lokal dev, mobile upload ada |
| 8 | Dashboard, reports, audit, export | 🟡 Sebagian | Budget vs actual ada, laporan web ada, CSV export belum |
| 9 | Integrasi vertical slice web + Flutter | 🔴 Belum | Mobile masih ada gap fitur; integrasi end-to-end belum diuji |
| 10 | Security, performance, accessibility, hardening | 🔴 Belum | Belum ada security regression atau a11y audit |
| 11 | Deployment, demo & submission prep | 🔴 Belum | Belum ada deployment ke production |

---

## Fase 0 — Mengunci Baseline & Kebutuhan ✅

**Status: Selesai** (dilakukan di ChatGPT brainstorming session)

Dokumen yang sudah ditetapkan di brainstorming:
- [x] DECISIONS.md — keputusan arsitektur dan domain
- [x] ARCHITECTURE.md — fullstack Next.js + Flutter Android
- [x] API_SPEC.md — prefix `/api/v1`, format error seragam
- [x] DATABASE.md — PostgreSQL + Drizzle ORM
- [x] SECURITY.md — session cookie, storage privat
- [x] ROADMAP.md — 11 fase dengan approval gate
- [x] AGENTS.md — aturan AI coding agent
- [x] SKILL.md — antislop skill setup

> **Catatan:** Aturan resmi Traspac Competition 2027 belum terverifikasi dari sumber resmi. Tidak ada klaim kompetisi tanpa bukti.

---

## Fase 1 — UX Flows & Design System ✅

**Status: Selesai — 26 Oktober 2026**

### Dikerjakan:

#### 1.1 DESIGN.md — Arah visual project
- [x] Identitas produk: nama, personality, tone (profesional-approachable untuk SMK)
- [x] Palet warna: Deep Forest #153D35, Growth Green #35B88A, Mint Mist #EAF5F0, Cloud White #F6F8F7
- [x] Kontras WCAG AA diverifikasi via contrast-check.py — 4 kombinasi dilarang dicatat
- [x] Tipografi: Plus Jakarta Sans (dipilih karena konteks Indonesia + tidak AI-default)
- [x] Radius, shadow, spacing tokens (3 nilai radius, 2 level shadow, grid 4px)
- [x] ENERGY 2 / RHYTHM 2 / MOTION 1 dials
- [x] Aturan penggunaan Growth Green sebagai non-text color

#### 1.2 User journeys per role
- [x] Ketua Kegiatan: 5 alur lengkap
- [x] Bendahara: 5 alur lengkap (approve/reject budget, approve/reject expense, payment, reversal, export)
- [x] Panitia/Anggota: 4 alur lengkap
- [x] States wajib: kosong, loading, error, forbidden, success — contoh teks per halaman

#### 1.3 Budget Scenario Lab spec
- [x] Layout satu skenario + tampilan defisit
- [x] Perbandingan side-by-side (≥2 skenario)
- [x] Label wajib: "Skenario belum resmi sampai disetujui Bendahara"

#### 1.4 Design tokens
- [x] Format Rupiah: `Rp 1.250.000`
- [x] 7 status badge dengan label teks + warna (tidak hanya warna)
- [x] Terminologi konsisten: Diajukan/Disetujui/Ditolak/Lunas/Dibatalkan/Sebagian Lunas

**File yang dibuat:**
- `DESIGN.md` — di RekaDana (web) dan rekadana_mobile
- `USER_JOURNEYS.md` — di RekaDana (web) dan rekadana_mobile

**Gate Fase 1 — semua terpenuhi:**
- [x] Semua role utama punya flow yang jelas (3 role × alur lengkap)
- [x] DESIGN.md disetujui pengguna (palet, font, personality dikonfirmasi)
- [x] Kedua platform punya fungsi berguna yang terdefinisi

---

## Fase 2 — Repository & Setup 🟡

**Status: Sebagian selesai**

### Web (RekaDana) — sudah ada:
- [x] Next.js App Router + TypeScript + Bun
- [x] Drizzle ORM + schema PostgreSQL
- [x] Neon PostgreSQL connection
- [x] Folder `src/app/api/v1/` dengan semua route handlers
- [x] Folder `src/server/{auth,db,modules,authorization,storage,audit,http,validation}/`
- [x] `.env.example` + `.gitignore`

### Web — perlu diselesaikan:
- [ ] `features/` folder untuk UI komponen per fitur (sesuai spec arsitektur)
- [ ] CI setup (GitHub Actions: lint + typecheck + build)
- [ ] README.md yang menjelaskan project (bukan boilerplate Next.js)
- [ ] Health endpoint `/api/v1/health` — verifikasi sudah berfungsi
- [ ] Error contract konsisten di semua route (format `{code, message, errors, request_id}`)

### Mobile (rekadana_mobile) — sudah ada:
- [x] Flutter + Dart project baseline
- [x] `lib/features/{auth,expenses,approval,organization}/`
- [x] `lib/core/{constants,network,storage,utils,widgets}/`
- [x] Dependency: dio, flutter_secure_storage, google_fonts, image_picker

### Mobile — perlu diselesaikan:
- [ ] README.md yang menjelaskan project
- [ ] `pubspec.yaml` description diperbarui dari boilerplate
- [ ] Struktur folder sesuai spec: `apps/mobile` jika monorepo, atau standalone dengan jelas
- [ ] Analisis apakah butuh provider/riverpod/bloc untuk state management
- [ ] Flutter analyze clean (0 warnings)

**Gate sebelum lanjut ke Fase 3:**
- [ ] Clean install web: `bun install && bun run lint && bun run build` sukses
- [ ] Flutter: `flutter analyze && flutter test` clean
- [ ] Migrations dari database kosong berjalan
- [ ] Secrets tidak ada di repository

---

## Fase 3 — Auth, Organisasi, Membership & Authorization 🟡

**Status: Sebagian selesai**

### Web — sudah ada:
- [x] `POST /api/v1/auth/login` — login dengan email + password
- [x] `POST /api/v1/auth/register` — registrasi user baru
- [x] `POST /api/v1/auth/logout` — hapus session
- [x] Session cookie-based (`HttpOnly`)
- [x] `GET /api/v1/me` — profil user aktif
- [x] `requireMembership()` + `requireEventAccess()` — tenant/resource authorization
- [x] Role enum: `ketua_kegiatan`, `bendahara`, `panitia_anggota`
- [x] `GET /api/v1/organizations` + `POST` — CRUD organisasi
- [x] `GET /api/v1/organizations/[orgId]/members` + `POST` — CRUD membership

### Web — perlu diselesaikan:
- [ ] Verifikasi: `Secure` flag pada production cookie, `SameSite` setting
- [ ] Session expiry yang dikonfigurasi (bukan selamanya)
- [ ] CSRF/origin validation pada semua mutasi (POST/PATCH/DELETE)
- [ ] Test negative cases: role bypass, inactive membership, tenant isolation (A/B)
- [ ] Halaman `/app` (pilih organisasi) sudah redirect dengan benar
- [ ] Error state saat membership tidak aktif

### Mobile — sudah ada:
- [x] Login screen + auth service
- [x] Token disimpan di `flutter_secure_storage`
- [x] `user_model.dart` — model user

### Mobile — perlu diselesaikan:
- [ ] Logout + clear secure storage
- [ ] Token expiry handling + auto-refresh atau re-login
- [ ] Org selection screen → menuju event list
- [ ] Negative test: akses dengan token expired
- [ ] Error handling saat server offline (timeout, network error)

**Gate sebelum lanjut ke Fase 4:**
- [ ] Negative tests role bypass lulus (server-side rejection terbukti)
- [ ] Tenant isolation: user org A tidak bisa akses data org B
- [ ] Session/token expiry diuji pada kedua platform
- [ ] Inactive membership ditolak

---

## Fase 4 — Kegiatan & Budget Scenario Lab 🟡

**Status: Sebagian selesai**

### Web — sudah ada:
- [x] `GET /api/v1/organizations/[orgId]/events` + `POST` — list & buat kegiatan
- [x] `GET /api/v1/events/[eventId]` + PATCH + DELETE (soft) 
- [x] `GET /api/v1/events/[eventId]/budget-scenarios` + `POST`
- [x] `GET /api/v1/budget-scenarios/[scenarioId]/items` + `POST`
- [x] `POST /api/v1/budget-scenarios/[scenarioId]/submit` — ajukan ke budget version
- [x] Web UI: halaman scenarios, form buat skenario, tambah item
- [x] Perhitungan: total, biaya per peserta di UI

### Web — perlu diselesaikan:
- [ ] **Tampilan perbandingan skenario side-by-side** — jika 2-3 skenario ada, bandingkan total/biaya peserta/gap
- [ ] Gap dana dan deficit display yang jelas (available funds - total)
- [ ] Label jelas: "Skenario bukan anggaran resmi sampai disetujui Bendahara"
- [ ] Edit/hapus item scenario
- [ ] Archive scenario yang tidak dipakai
- [ ] `participantCount` bisa di-override per skenario (snapshot)
- [ ] Empty state: belum ada skenario, belum ada item
- [ ] Decimal math test: pastikan tidak ada floating point error (pakai NUMERIC di DB sudah ✓)

### Mobile — sudah ada:
- [x] Events list screen (dengan org context)
- [x] Org selection screen

### Mobile — perlu diselesaikan:
- [ ] Tampilan list skenario per event
- [ ] Form buat skenario baru + tambah item
- [ ] Perhitungan total dan biaya per peserta di client (preview saja)
- [ ] Submit skenario untuk direview Bendahara

**Gate sebelum lanjut ke Fase 5:**
- [ ] Tenant check: scenario dari event lain tidak bisa diakses
- [ ] Decimal math: test edge case jumlah 0, quantity 0
- [ ] Snapshot immutability: setelah submit menjadi budget version, skenario tidak bisa diubah
- [ ] Deficit (total > available funds) ditampilkan dengan jelas, bukan hidden

---

## Fase 5 — Versi Anggaran & Approval Bendahara 🟡

**Status: Sebagian selesai**

### Web — sudah ada:
- [x] `GET /api/v1/events/[eventId]/budgets` — list budget versions
- [x] `GET /api/v1/budget-versions/[versionId]` — detail versi
- [x] `POST /api/v1/budget-versions/[versionId]/approve` — approve (Bendahara only)
- [x] `POST /api/v1/budget-versions/[versionId]/reject` — reject dengan alasan
- [x] Web UI: halaman review anggaran, tombol approve/reject, form alasan
- [x] Hanya satu versi aktif per event (enforced)
- [x] Snapshot immutable (disimpan saat promosi)

### Web — perlu diselesaikan:
- [ ] **Histori versi** — tampilkan semua versi dengan status dan timestamp
- [ ] **Perbedaan antar versi** (diff snapshot) — opsional tapi berguna
- [ ] Konfirmasi modal sebelum approve/reject (R-26 — interactive elements must work)
- [ ] Self-approval test: ketua tidak bisa approve anggaran sendiri yang dia buat
- [ ] Activation atomik: pastikan tidak bisa ada 2 versi approved bersamaan
- [ ] Label status versi: Draf, Diajukan, Disetujui, Ditolak

### Mobile — perlu diselesaikan:
- [ ] Tampilan status budget version per event
- [ ] Form approve/reject untuk role Bendahara
- [ ] Notifikasi status berubah (minimal UI refresh / polling)
- [ ] Riwayat versi anggaran di mobile

**Gate sebelum lanjut ke Fase 6:**
- [ ] Unauthorized approval ditolak server-side (403, bukan hanya hidden button)
- [ ] Self-approval ditolak
- [ ] Activation atomik diuji (race condition tidak menghasilkan 2 approved)
- [ ] Konflik status diuji: approve versi saat ada versi approved lain

---

## Fase 6 — Permintaan Pengeluaran, Payments & Koreksi 🟡

**Status: Sebagian selesai**

### Web — sudah ada:
- [x] `POST /api/v1/events/[eventId]/expense-requests` — ajukan pengeluaran
- [x] `GET /api/v1/expense-requests/[requestId]/approve` + `POST` — approve
- [x] `POST /api/v1/expense-requests/[requestId]/reject` — reject
- [x] `POST /api/v1/expense-requests/[requestId]/payments` — catat pembayaran
- [x] `POST /api/v1/payments/[paymentId]/reverse` — reversal pembayaran
- [x] Idempotency key pada payments
- [x] Web UI: list pengeluaran, form ajukan, detail dengan payments
- [x] Status: draft, submitted, approved, partially_paid, paid, rejected, cancelled
- [x] Audit log pada tiap aksi

### Web — perlu diselesaikan:
- [ ] **Pembayaran sebagian (partial payment)** — UI yang jelas untuk partial vs full
- [ ] **Remaining balance display** — berapa yang belum dibayar
- [ ] Reversal form — alasan reversal wajib diisi
- [ ] Lock concurrency saat pembayaran bersamaan (row lock diuji)
- [ ] Over-budget prevention: peringatan jika approved amount > remaining budget
- [ ] Test: duplicate payment dengan idempotency key yang sama
- [ ] Test: negative amount ditolak server-side
- [ ] Konfirmasi modal sebelum approve/reject pengeluaran

### Mobile — sudah ada:
- [x] Expense list screen dengan filter status
- [x] Expense create screen — form ajukan pengeluaran
- [x] Expense detail screen
- [x] Bendahara review screen (approval)

### Mobile — perlu diselesaikan:
- [ ] **Upload bukti dari expense detail** (lihat Fase 7)
- [ ] Tampilan payments per expense request
- [ ] Reversal tampil di history
- [ ] Partial payment status yang jelas
- [ ] Error state: tidak ada approved budget version

**Gate sebelum lanjut ke Fase 7:**
- [ ] Concurrent payment test: dua request bersamaan tidak menghasilkan double payment
- [ ] Duplicate retry dengan idempotency key lulus
- [ ] Negative/zero amount ditolak
- [ ] Reversal test: tidak bisa reverse melebihi amount asli

---

## Fase 7 — Evidence & Private Storage 🟡

**Status: Sebagian selesai**

### Web — sudah ada:
- [x] `POST /api/v1/evidence` — upload bukti
- [x] `GET /api/v1/evidence/[evidenceId]/download` — download private (signed URL atau streaming)
- [x] Validasi type: PDF/JPEG/PNG
- [x] Validasi size: ≤ 5 MiB (5.242.880 byte) — server-side
- [x] Storage adapter interface (local dev)
- [x] Object key private (bukan public URL langsung)
- [x] Metadata di PostgreSQL, binary di storage
- [x] `EvidenceSection` di halaman expense detail

### Web — perlu diselesaikan:
- [ ] **Storage adapter S3-compatible** — implementasi untuk production (pilih vendor saat deployment)
- [ ] MIME type validation via file signature (magic bytes), bukan hanya extension
- [ ] Orphan upload cleanup — evidence yang tidak ter-attach ke expense perlu dibersihkan
- [ ] Authorization download: hanya member organisasi yang sama yang bisa download
- [ ] Max file size error message yang jelas: "File melebihi batas 5 MB"
- [ ] Preview thumbnail di UI (PDF: show icon, gambar: thumbnail kecil)
- [ ] Multiple evidence per expense request

### Mobile — sudah ada:
- [x] `image_picker` dependency
- [x] Expense create screen (kemungkinan sudah ada upload field)

### Mobile — perlu diselesaikan:
- [ ] Upload bukti dari expense detail screen (kamera atau galeri)
- [ ] Progress upload indicator
- [ ] File size validation di client sebelum upload (UX, bukan security gate)
- [ ] Error: type tidak valid, ukuran terlalu besar
- [ ] Download/view bukti dari mobile

**Gate sebelum lanjut ke Fase 8:**
- [ ] Type spoofing test: upload `.exe` dengan extension `.pdf` — ditolak
- [ ] Max+1 byte: file 5.242.881 byte — ditolak
- [ ] MIME/signature mismatch: JPEG dengan extension `.png` — ditangani dengan benar
- [ ] Unauthorized download: user dari org lain — ditolak (403)
- [ ] Orphan upload dibersihkan (atau tidak bisa dibuat orphan)

---

## Fase 8 — Dashboard, Reports, Audit & Export 🟡

**Status: Sebagian selesai**

### Web — sudah ada:
- [x] `GET /api/v1/events/[eventId]/reports/budget-vs-actual` — laporan budget vs actual
- [x] `getBudgetVsActualReport()` service — approved total, actual net, open commitments, remaining
- [x] Dashboard: ringkasan anggaran kegiatan pertama
- [x] Laporan page per event
- [x] `BudgetSummary` component

### Web — perlu diselesaikan:
- [ ] **CSV export laporan** — download file `.csv` dengan data budget vs actual
- [ ] **Audit log view** — histori semua aksi per event (approve, reject, payment, reversal)
- [ ] Laporan per kategori (breakdown by category)
- [ ] Filter laporan: by status, by periode, by item
- [ ] Role-based export: hanya Bendahara dan Ketua bisa export
- [ ] Dashboard improvement: tampilkan semua kegiatan aktif + ringkasan masing-masing
- [ ] Print-friendly report (atau export PDF)
- [ ] Reconciliation check: total dari transaksi = remaining yang ditampilkan

### Mobile — perlu diselesaikan:
- [ ] Ringkasan keuangan per event (total budget, terpakai, sisa)
- [ ] Status pengeluaran summary (berapa approved, berapa paid)
- [ ] Tampilkan laporan sederhana (tidak perlu CSV di mobile)

**Gate sebelum lanjut ke Fase 9:**
- [ ] Report reconciliation: total dari detail transaksi = summary angka
- [ ] Cross-tenant export: laporan org B tidak bisa diakses user org A
- [ ] Role check export: panitia_anggota tidak bisa export

---

## Fase 9 — Integrasi Vertical Slice Web + Flutter 🔴

**Status: Belum dimulai** — tergantung Fase 3-8 selesai

### Alur yang harus diuji end-to-end di kedua platform:
1. Register + login → pilih organisasi → masuk dashboard
2. Buat kegiatan → buat skenario → tambah item → submit sebagai budget version
3. Bendahara login → review budget version → approve/reject
4. Panitia submit expense request → attach bukti
5. Bendahara approve expense → catat pembayaran
6. Lihat laporan: budget vs actual

### Yang harus dikerjakan:
- [ ] Mobile: implementasi semua flow yang belum ada (dari Fase 3-8 mobile)
- [ ] Verifikasi error contract konsisten antara web dan mobile
- [ ] Retry handling di mobile (timeout, 5xx)
- [ ] Pagination pada list yang bisa panjang (expense, payments)
- [ ] Session/token refresh di mobile saat expired di tengah sesi

**Gate sebelum lanjut ke Fase 10:**
- [ ] Alur submit → approval → payment → laporan berhasil di kedua klien
- [ ] Akses sesuai role di setiap langkah
- [ ] Mobile tidak crash pada any state (error, empty, loading semua ada)

---

## Fase 10 — Security, Performance, Accessibility & Hardening 🔴

**Status: Belum dimulai**

### Security:
- [ ] CSRF origin validation diaktifkan pada semua mutasi
- [ ] Rate limiting: auth endpoint (login, register)
- [ ] Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- [ ] CORS konfigurasi production
- [ ] Dependency audit: `bun audit` atau `npm audit`
- [ ] Tidak ada secret yang ter-expose di response atau log
- [ ] Mass assignment prevention di semua route handler
- [ ] SQL injection prevention (Drizzle parameterized query — sudah built-in)

### Performance:
- [ ] Query dengan JOIN yang banyak — pastikan ada index yang tepat
- [ ] Pagination pada semua list endpoint yang bisa besar
- [ ] Loading state di semua page (web dan mobile)
- [ ] Image/file upload dengan progress indicator

### Accessibility (antislop-human):
- [ ] Semua teks memenuhi WCAG AA contrast (4.5:1 untuk teks normal — R-25)
- [ ] Semua elemen interaktif dapat diakses via keyboard (R-32)
- [ ] Focus ring visible di semua button, link, input
- [ ] Label form yang benar (`htmlFor` / `aria-label`)
- [ ] Status selalu ada teks, tidak bergantung warna saja (R-25)
- [ ] Approve/reject memerlukan konfirmasi sebelum aksi dilakukan

### Hardening:
- [ ] Production build test: `bun run build` tanpa error
- [ ] Error state di semua halaman yang menampilkan data (R-27)
- [ ] Tidak ada dead link atau nav item yang mengarah ke halaman tidak ada (R-24)
- [ ] Semua tombol dan link punya aksi nyata (R-26)

**Gate sebelum lanjut ke Fase 11:**
- [ ] Security regression test: role bypass, CSRF, tenant isolation semuanya pass
- [ ] 0 WCAG AA contrast failure pada teks utama
- [ ] Production build sukses tanpa error atau warning kritis

---

## Fase 11 — Deployment, Demo & Submission Prep 🔴

**Status: Belum dimulai**

### Deployment:
- [ ] Next.js: deploy ke Vercel atau platform lain (dengan Neon PostgreSQL)
- [ ] Environment variables dikonfigurasi di platform (bukan di repo)
- [ ] Storage: pilih S3-compatible vendor dan konfigurasi
- [ ] Flutter: build APK untuk demo Android
- [ ] README kedua repo diperbarui dengan instruksi run & deploy

### Demo prep:
- [ ] Buat data demo (organisasi, kegiatan, beberapa skenario, expense)
- [ ] Pastikan semua alur utama bisa didemonstrasikan tanpa perlu setup ulang
- [ ] Screenshot/video walkthrough (opsional tapi berguna)

### Submission (jika Traspac Competition):
- [ ] Verifikasi aturan resmi Traspac 2027 sebelum submit
- [ ] `COMPETITION_STATUS.md` diperbarui jika aturan resmi sudah tersedia

**Gate akhir:**
- [ ] Aplikasi web accessible dari URL publik
- [ ] APK Android bisa diinstall dan digunakan untuk demo
- [ ] Tidak ada data dummy / fake yang terlihat seperti data nyata (R-38)

---

## Tugas Segera (Konfirmasi Dulu)

Berdasarkan analisis kondisi project sekarang, **prioritas berikutnya adalah Fase 1** karena:
1. DESIGN.md belum ada — UI saat ini dibangun tanpa arah visual yang ditetapkan
2. User journeys belum terdokumentasi — ada risiko gap di mobile
3. Beberapa halaman web belum punya semua UI states (loading, error, empty)

**Sebelum mengerjakan Fase 1, diperlukan input dari pengguna:**
- Warna brand Reka Dana (bukan biru-ungu AI default)
- Personality produk: formal/profesional atau friendly/casual?
- Font preference ada atau biarkan dipilih dengan alasan?

---

## Catatan Commit

Setiap commit harus mendapat persetujuan pesan dari pengguna sebelum push. Format:
```
<type>(<scope>): <deskripsi singkat dalam Bahasa Indonesia>

Contoh:
feat(web): tambah tampilan perbandingan skenario anggaran
fix(mobile): perbaiki crash saat token expired
chore(web): perbarui README dengan instruksi deployment
```

---

*Terakhir diperbarui: 26 Oktober 2026*
*Berdasarkan: RekaDana Dokumentasi v4.0 (brainstorming ChatGPT — Brainstorming Produk Blue Ocean)*
