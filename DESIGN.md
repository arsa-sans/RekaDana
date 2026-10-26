# DESIGN.md — Reka Dana

> Panduan visual ini adalah sumber kebenaran untuk semua keputusan desain Reka Dana.
> Semua implementasi UI harus mengacu pada dokumen ini, bukan asumsi atau default AI.
> Disetujui oleh: pengguna (26 Oktober 2026)

---

## 1. Identitas Produk

**Nama:** RekaDana

**Tagline (kerja):** Kelola anggaran kegiatan, dari rencana sampai laporan.

**Konteks penggunaan:**
- Lomba Traspac (tahap awal)
- Target implementasi: SMK — panitia OSIS, ekstrakurikuler, kegiatan sekolah
- Pengguna: siswa sebagai panitia, guru/bendahara sebagai approver

**Personality:**
- Profesional tapi tidak kaku — seperti aplikasi kerja yang nyaman dipakai siswa
- Tepercaya — angka keuangan harus terasa akurat dan aman
- Ringkas — tidak banyak ornamen; ruang dan tipografi yang bekerja

**Bukan:**
- Tidak startup-flashy (bukan neon, bukan gelap tanpa alasan)
- Tidak corporate-berat (bukan abu-abu enterprise yang dingin)
- Tidak colorful-playful (bukan pastel bermain-main)

---

## 2. Palet Warna

### Token resmi

| Token | Hex | Peran |
|-------|-----|-------|
| `--color-forest` | `#153D35` | Sidebar, logo, elemen penting, heading atas hierarki |
| `--color-growth` | `#35B88A` | Aksen tindakan utama, indikator positif |
| `--color-mint` | `#EAF5F0` | Latar ringkasan, area informasi ringan |
| `--color-cloud` | `#F6F8F7` | Latar utama dashboard |
| `--color-white` | `#FFFFFF` | Teks pada Forest, card surface |
| `--color-ink` | `#153D35` | Teks utama (sama dengan Forest, bukan hitam penuh) |
| `--color-body` | `#475569` | Teks isi, label sekunder (Slate-600) |
| `--color-muted` | `#64748B` | Metadata, placeholder (Slate-500) |
| `--color-border` | `#D1E8DF` | Border card dan input — turunan Mint |
| `--color-danger` | `#DC2626` | Error, reject, danger states |
| `--color-warning` | `#D97706` | Peringatan, deficit anggaran |

### Aturan kontras WCAG AA (sudah diverifikasi dengan contrast-check.py)

| Kombinasi | Rasio | Status | Boleh dipakai untuk |
|-----------|-------|--------|---------------------|
| `#153D35` teks pada `#F6F8F7` | 11.25:1 | ✅ Pass | Teks, heading, apapun |
| `#FFFFFF` teks pada `#153D35` | 11.99:1 | ✅ Pass | Teks sidebar, label pada dark bg |
| `#153D35` teks pada `#EAF5F0` | 10.75:1 | ✅ Pass | Teks pada Mint background |
| `#153D35` teks pada `#35B88A` | 4.78:1 | ✅ Pass | Tombol dengan bg Growth Green |
| `#35B88A` teks pada `#153D35` | 4.78:1 | ✅ Pass | Aksen teks pada sidebar gelap |
| `#475569` teks pada `#F6F8F7` | 7.10:1 | ✅ Pass | Teks body, label |
| **`#35B88A` teks pada `#F6F8F7`** | **2.35:1** | **❌ Fail** | **Jangan pakai sebagai teks pada latar terang** |
| **`#35B88A` teks pada `#EAF5F0`** | **2.25:1** | **❌ Fail** | **Jangan pakai sebagai teks pada Mint** |
| **`#FFFFFF` teks pada `#35B88A`** | **2.51:1** | **❌ Fail** | **Jangan pakai label putih pada bg Growth** |
| **`#94A3B8` teks pada `#F6F8F7`** | **2.40:1** | **❌ Fail** | **Jangan pakai Slate-400 sebagai teks** |

### Aturan penggunaan Growth Green (#35B88A)

Growth Green **tidak boleh** digunakan sebagai warna teks di atas latar terang.
Growth Green boleh digunakan sebagai:
- Background elemen besar (badge status, tag) dengan **teks #153D35**
- Border / garis pembatas
- Ikon (bukan teks)
- Indikator grafis (progress bar, dot)
- Fill pada ilustrasi

---

## 3. Tipografi

### Typeface

**Plus Jakarta Sans** — dipilih karena:
- Dirancang dengan perhatian pada tipografi konteks Indonesia
- Humanist grotesque: ramah dibaca oleh siswa tanpa terasa korporat
- Lebar yang wajar di ukuran kecil (penting untuk tabel keuangan)
- Bukan default AI (bukan Inter/Geist)
- Tersedia gratis via Google Fonts

```css
font-family: 'Plus Jakarta Sans', sans-serif;
```

**Angka keuangan:** gunakan `font-variant-numeric: tabular-nums` agar kolom angka rapi.
Tidak ada font mono terpisah — angka rata kanan dengan tabular-nums cukup untuk konteks ini.

### Skala ukuran

| Token | px | Peran |
|-------|----|-------|
| `text-xs` | 11px | Timestamp, metadata, label chip kecil |
| `text-sm` | 13px | Teks tabel, label form, deskripsi pendek |
| `text-base` | 15px | Teks isi utama, label navigasi |
| `text-lg` | 17px | Subjudul section |
| `text-xl` | 20px | Heading halaman (`<h1>`) |
| `text-2xl` | 24px | Angka besar di summary card |

### Bobot (weight)

- `400` — teks isi biasa
- `500` — label, metadata penting
- `600` — teks tabel, tombol, heading level 2
- `700` — heading halaman, angka utama summary

---

## 4. Spacing & Radius

### Spacing scale

Berbasis grid 4px. Gunakan ini, bukan nilai sembarang.

| Token | nilai |
|-------|-------|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |

### Border radius

Tiga nilai saja — bukan pill-everything (R-11):

| Token | nilai | Pakai untuk |
|-------|-------|-------------|
| `radius-sm` | 6px | Input, chip kecil, badge |
| `radius-md` | 10px | Card, modal, dropdown |
| `radius-lg` | 16px | Card summary besar, panel sidebar |

Tombol utama: `radius-sm` (6px) — terasa decisive, bukan playful.
Bukan pill shape (`rounded-full`) untuk tombol utama.

---

## 5. Komponen Utama

### Tombol

```
Tombol Utama (Primary):
  bg: #153D35   text: #FFFFFF   radius: 6px
  hover: bg #1A4D43
  focus: ring 2px #35B88A, offset 2px
  Alasan: Deep Forest sebagai aksi utama — konsisten dengan sidebar, memberi kesan decisive

Tombol Aksen (Accent):
  bg: #35B88A   text: #153D35   radius: 6px
  hover: bg #2EA87D
  Alasan: Growth Green sebagai aksi sekunder positif, teks Forest agar kontras 4.78:1 (WCAG AA pass)
  Catatan: JANGAN pakai teks putih pada bg Growth Green (2.51:1, fail)

Tombol Ghost:
  bg: transparent   border: 1.5px #D1E8DF   text: #153D35
  hover: bg #EAF5F0
```

### Status badge

Status menggunakan teks + warna latar, BUKAN hanya warna (R-25 — tidak bergantung warna saja).

| Status | Teks | Background | Teks warna |
|--------|------|------------|------------|
| Draf | Draf | `#F1F5F9` | `#475569` |
| Diajukan | Diajukan | `#DBEAFE` | `#1E40AF` |
| Disetujui | Disetujui | `#D1FAE5` | `#065F46` |
| Ditolak | Ditolak | `#FEE2E2` | `#991B1B` |
| Lunas | Lunas | `#EAF5F0` | `#153D35` |
| Dibatalkan | Dibatalkan | `#F1F5F9` | `#6B7280` |
| Sebagian | Sebagian Lunas | `#FEF3C7` | `#92400E` |

### Sidebar

```
bg: #153D35
item aktif:  bg #1A4D43  text: #FFFFFF  left-border: 3px solid #35B88A
item hover:  bg #1A4D43  text: #FFFFFF
item normal: text: rgba(255,255,255,0.75)
icon:        color: rgba(255,255,255,0.6)
icon aktif:  color: #35B88A
```

### Angka keuangan

```
Format: Rp 1.250.000   (titik sebagai pemisah ribuan, bukan koma)
Rata: kanan (text-right)
Font weight: 600 (semibold)
font-variant-numeric: tabular-nums
Warna positif / normal: #153D35
Warna negatif / deficit: #DC2626
```

---

## 6. Shadow

Hanya dua level shadow (R-12 — elevation marker, bukan dekorasi):

```css
--shadow-card: 0 1px 3px rgba(21, 61, 53, 0.08), 0 1px 2px rgba(21, 61, 53, 0.04);
--shadow-modal: 0 8px 24px rgba(21, 61, 53, 0.12), 0 2px 8px rgba(21, 61, 53, 0.06);
```

Tidak ada shadow besar floating di semua card. Shadow hanya pada card di atas background berwarna.

---

## 7. Ikon

Library: **Lucide React** (web) / **Material Icons** (Flutter)

Alasan Lucide: stroke style yang clean, sudah dipakai di codebase. Bukan pilihan "AI default" — dipilih karena konsisten dengan gaya garis yang cocok untuk palette Forest.

Aturan (R-04):
- Ikon harus relevan dengan konten yang diwakili
- Jangan pakai: Sparkle, Star, Magic, Lightning sebagai ikon fitur
- Ikon selalu berpasangan dengan label teks (aksesibilitas)
- Ukuran minimum ikon interaktif: 20px (bukan 16px)

Ikon yang disetujui per domain:
- Anggaran: `Calculator`, `FileText`, `DollarSign`
- Kegiatan: `Calendar`, `Users`
- Pengeluaran: `Receipt`, `ShoppingCart`
- Pembayaran: `CreditCard`, `CheckCircle`
- Laporan: `BarChart2`, `Download`
- Upload bukti: `Upload`, `Paperclip`
- Approve: `CheckCircle` (hijau)
- Reject: `XCircle` (merah)

---

## 8. Logo

**Konsep yang ditetapkan pengguna:** simbol geometris yang menggabungkan bentuk huruf R atau D dengan elemen grafis dan alur. Sederhana agar mudah dikenali sebagai favicon, ikon aplikasi Android, dan header dashboard web.

**Status:** `[LOGO]` — placeholder teks "RekaDana" digunakan sampai logo final tersedia.
Tidak ada logo yang digenerate AI sebagai versi final (R-23).

**Catatan untuk implementasi:** logo yang sudah tampak di konsep (gambar M/huruf abstrak dalam kotak gelap) dapat dijadikan referensi saat mengerjakan asset logo. Konfirmasi dengan pengguna sebelum dipasang sebagai asset final.

---

## 9. Liveliness Dials

Menggunakan skala antislop Part 3:

| Dial | Nilai | Alasan |
|------|-------|--------|
| ENERGY | 2 / 5 | Aplikasi keuangan perlu ketenangan — bukan flat, tapi bukan energik |
| RHYTHM | 2 / 5 | Layout konsisten antar section, dengan variasi kecil yang disengaja |
| MOTION | 1 / 5 | Animasi minimal — hanya transisi state yang punya tujuan UX |

**MOTION 1** berarti:
- Tidak ada fade-up, float, bounce untuk semua elemen
- Transisi yang boleh: `transition-colors` pada hover, `transition-opacity` saat loading state masuk/keluar
- Modal: fade-in singkat (150ms) — bukan slide dramatis

---

## 10. Aturan yang Tidak Boleh Dilanggar

1. Growth Green (`#35B88A`) tidak boleh jadi warna teks di atas latar terang
2. Putih tidak boleh jadi teks di atas Growth Green background
3. Semua tombol dan link harus punya aksi nyata (R-26)
4. Status selalu ada label teks, bukan hanya warna (R-25)
5. Tidak ada placeholder statistik seperti "500+ pengguna" (R-17)
6. Tidak ada badge "Powered by AI" atau ornamen tanpa fungsi (R-09)
7. Sidebar: Growth Green hanya untuk indikator item aktif, bukan untuk fill keseluruhan
