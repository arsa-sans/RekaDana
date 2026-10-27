# RekaDana — Web

Aplikasi manajemen anggaran kegiatan untuk organisasi sekolah dan komunitas. Dibangun di atas Next.js App Router dengan backend fullstack, PostgreSQL, dan REST API yang dikonsumsi oleh aplikasi Flutter Android.

## Stack

- **Framework:** Next.js 16 App Router + TypeScript
- **Runtime:** Bun
- **Database:** PostgreSQL (Neon) via Drizzle ORM
- **Styling:** Tailwind CSS v4
- **UI:** Radix UI primitives
- **Auth:** session cookie (`HttpOnly`, `Secure` on production)

## Struktur

```
src/
  app/
    api/v1/          # REST Route Handlers
    app/[orgId]/     # Halaman dashboard per organisasi
    login/           # Autentikasi
    register/
  server/
    auth/            # Session, password hashing
    authorization/   # Tenant isolation, role checks
    modules/         # Domain services (budgets, expenses, payments, reports)
    db/              # Drizzle schema, migrations, client
    storage/         # Evidence file storage adapter
    audit/           # Audit log
    http/            # Response helpers (apiSuccess, apiError)
    validation/      # Zod request schemas
  components/
    layout/          # Sidebar, navigation
    ui/              # Reusable UI components
```

## Menjalankan secara lokal

### Prasyarat

- Bun ≥ 1.3
- PostgreSQL (atau akun Neon)

### Setup

```bash
# Install dependencies
bun install

# Salin environment variables
cp .env.example .env.local
# Isi DATABASE_URL dan variabel lainnya di .env.local

# Push schema ke database
bun run db:push

# Jalankan development server
bun run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Perintah lain

```bash
bun run lint         # ESLint
bun run typecheck    # TypeScript check tanpa emit
bun run build        # Production build
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Drizzle Studio (database GUI)
```

## API

Semua endpoint tersedia di `/api/v1`. Format error:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Deskripsi error yang bisa dibaca.",
  "errors": { "field": ["pesan per field"] },
  "request_id": "uuid"
}
```

Status HTTP semantik digunakan: `401`, `403`, `404`, `409`, `413`, `422`, `500`.

## Peran pengguna

| Role | Kode | Akses |
|------|------|-------|
| Ketua Kegiatan | `ketua_kegiatan` | Buat kegiatan, kelola skenario, ajukan anggaran |
| Bendahara | `bendahara` | Approve/reject anggaran dan pengeluaran, catat pembayaran |
| Panitia/Anggota | `panitia_anggota` | Ajukan pengeluaran, unggah bukti |

Hanya Bendahara yang bisa menyetujui atau menolak. Self-approval dilarang.

## Environment variables

Lihat `.env.example` untuk daftar lengkap variabel yang dibutuhkan.

## Repo terkait

- [`rekadana_mobile`](https://github.com/arsa-sans/rekadana_mobile) — Aplikasi Flutter Android
