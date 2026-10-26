# User Journeys — Reka Dana

> Dokumen ini mendefinisikan alur pengguna per role untuk web dan mobile.
> Menjadi referensi saat membangun UI: setiap halaman harus melayani satu atau lebih step di sini.
> Semua halaman wajib punya state: kosong, loading, error, forbidden, success.

---

## Peran Pengguna

| Role | Kode | Konteks SMK |
|------|------|-------------|
| Ketua Kegiatan | `ketua_kegiatan` | Ketua OSIS, ketua panitia acara, penanggung jawab kegiatan |
| Bendahara | `bendahara` | Bendahara OSIS atau guru pendamping keuangan |
| Panitia/Anggota | `panitia_anggota` | Anggota panitia yang mengajukan kebutuhan lapangan |

---

## Alur 1 — Ketua Kegiatan

### 1.1 Masuk dan pilih organisasi

```
Login → Pilih organisasi (OSIS SMA X / Ekstrakurikuler Y) → Dashboard
```

State kosong dashboard: "Belum ada kegiatan. Buat kegiatan pertama untuk mulai."

### 1.2 Buat kegiatan baru

```
Dashboard → Tombol "Buat Kegiatan" → Form:
  - Nama kegiatan (wajib)
  - Deskripsi (opsional)
  - Jumlah peserta (estimasi awal)
  - Dana tersedia (anggaran yang dialokasikan)
→ Simpan → Masuk ke halaman kegiatan
```

### 1.3 Buat skenario anggaran

```
Kegiatan → Tab "Skenario" → "Skenario baru" → Nama skenario
→ Tambah item: nama, kategori, jumlah, harga satuan, prioritas
→ Lihat: total, biaya per peserta, gap dana
→ Bisa buat 2-3 skenario untuk dibandingkan
→ Saat puas dengan skenario: "Ajukan sebagai Rancangan Anggaran"
```

Catatan UI wajib: label "Skenario ini belum resmi. Harus diajukan dan disetujui Bendahara dulu."

### 1.4 Pantau status anggaran

```
Kegiatan → Tab "Anggaran" → Lihat daftar versi anggaran
→ Status: Diajukan / Disetujui / Ditolak
→ Jika ditolak: lihat alasan → perbaiki skenario → ajukan ulang
```

### 1.5 Lihat laporan kegiatan

```
Kegiatan → Tab "Laporan"
→ Budget vs Realisasi: anggaran disetujui, terpakai, komitmen terbuka, sisa
→ Tidak ada export CSV untuk Ketua (hanya Bendahara yang bisa export)
```

---

## Alur 2 — Bendahara

### 2.1 Review rancangan anggaran

```
Dashboard → Notifikasi / badge: "1 anggaran menunggu review"
→ Kegiatan → Tab "Anggaran" → Pilih versi "Diajukan"
→ Lihat snapshot: total, item, biaya per peserta, dana tersedia, gap
→ Tombol "Setujui" (konfirmasi modal) atau "Tolak" (wajib isi alasan)
→ Hanya Bendahara yang melihat tombol ini
→ Self-approval tidak mungkin: Bendahara yang juga Ketua tidak bisa approve anggaran yang dia buat
```

### 2.2 Review permintaan pengeluaran

```
Kegiatan → Tab "Pengeluaran" → Lihat daftar request berstatus "Diajukan"
→ Buka detail: judul, nominal, deskripsi, item anggaran terkait
→ Lihat lampiran bukti jika ada
→ "Setujui" (isi nominal yang disetujui, bisa berbeda dari yang diminta)
   atau "Tolak" (wajib isi alasan)
```

### 2.3 Catat pembayaran

```
Kegiatan → Tab "Pengeluaran" → Request berstatus "Disetujui"
→ "Catat Pembayaran" → Isi nominal, catatan
→ Status berubah: "Sebagian Lunas" atau "Lunas"
→ Bendahara bisa catat beberapa pembayaran parsial
```

### 2.4 Koreksi pembayaran (reversal)

```
Pengeluaran → Detail → Tab "Pembayaran"
→ Pilih pembayaran yang salah → "Batalkan Pembayaran"
→ Wajib isi alasan pembatalan
→ Histori tetap tercatat (tidak dihapus)
```

### 2.5 Export laporan

```
Kegiatan → Tab "Laporan"
→ Budget vs Actual: semua item, realisasi, komitmen
→ Tombol "Export CSV" → download file
→ Hanya Bendahara dan Ketua yang bisa export
```

---

## Alur 3 — Panitia/Anggota

### 3.1 Lihat kegiatan yang tergabung

```
Login → Pilih organisasi → Dashboard
→ Lihat daftar kegiatan yang dia ikuti
→ Pilih kegiatan
```

### 3.2 Ajukan pengeluaran

```
Kegiatan → Tab "Pengeluaran" → "Ajukan Kebutuhan"
→ Form:
  - Judul kebutuhan (wajib)
  - Deskripsi (opsional)
  - Nominal yang diminta (wajib)
  - Item anggaran terkait (opsional, dari daftar budget items)
→ Kirim → Status: "Diajukan"
```

State error: Jika belum ada anggaran yang disetujui Bendahara, tampilkan:
"Belum ada anggaran resmi untuk kegiatan ini. Tunggu Bendahara menyetujui anggaran dulu."

### 3.3 Lampirkan bukti

```
Pengeluaran → Detail pengajuan
→ Tab "Bukti" → "Unggah Bukti"
→ Pilih file: PDF, JPEG, atau PNG, maks 5 MB
→ Preview thumbnail
→ Submit
```

### 3.4 Pantau status pengajuan

```
Kegiatan → Tab "Pengeluaran"
→ Filter: Semua / Diajukan / Disetujui / Ditolak / Lunas
→ Buka detail: lihat alasan jika ditolak
```

---

## States Wajib Per Halaman (R-27)

Setiap halaman yang menampilkan data harus punya semua state ini:

### State kosong (empty)
Teks yang membantu pengguna tahu langkah berikutnya — bukan hanya "Tidak ada data."

Contoh baik: "Belum ada skenario anggaran. Buat skenario pertama untuk mulai merencanakan kegiatan."
Contoh buruk: "No data found."

### State loading
Skeleton atau spinner ringkas. Bukan halaman kosong selama fetch.

### State error
Pesan error yang bisa dibaca manusia + tombol "Coba lagi."
Tidak boleh tampilkan stack trace atau kode teknis.

### State forbidden
Pesan singkat bahwa aksi ini tidak diizinkan untuk peran pengguna.
Contoh: "Hanya Bendahara yang bisa menyetujui anggaran."

### State success
Konfirmasi bahwa aksi berhasil. Bisa berupa toast atau perubahan status yang langsung terlihat.

---

## Navigasi Web (Sidebar)

Hanya halaman yang benar-benar ada yang boleh masuk sidebar (R-24):

```
[Logo RekaDana]
[Nama Organisasi]
─────────────────
Dashboard
Kegiatan            ← list semua kegiatan aktif
  └─ [Nama Kegiatan]
      ├─ Skenario
      ├─ Anggaran
      ├─ Pengeluaran
      └─ Laporan
Anggota             ← manage members (hanya Ketua/Bendahara)
─────────────────
[Nama User]
Keluar
```

Tidak ada link ke halaman "Pengaturan" atau "Notifikasi" jika belum dibangun.

---

## Navigasi Mobile (Bottom Navigation)

```
[Beranda]  [Pengeluaran]  [Kegiatan]  [Profil]
```

- Beranda: ringkasan kegiatan dan status pengajuan
- Pengeluaran: list + filter status + tombol ajukan
- Kegiatan: pilih kegiatan, lihat skenario/anggaran (Bendahara)
- Profil: informasi akun, ganti organisasi, logout

---

## Budget Scenario Lab — Spesifikasi UI

### Tampilan satu skenario

```
┌─────────────────────────────────────────┐
│ Skenario A — Paket Standar         [•••]│
│ 80 peserta                              │
├─────────────────────────────────────────┤
│ Item         Jml  Satuan      Total     │
│ Sewa Gedung   1   Rp 2.000.000  Rp 2.000.000 │
│ Konsumsi     80   Rp   25.000  Rp 2.000.000 │
│ ─────────────────────────────────────── │
│ Total             Rp 4.000.000          │
│ Dana tersedia     Rp 5.000.000          │
│ Sisa / Gap      + Rp 1.000.000  ✓       │
│ Biaya/peserta     Rp 50.000             │
└─────────────────────────────────────────┘
```

Jika total > dana tersedia, tampilkan:
```
│ Sisa / Gap      − Rp 500.000   ⚠ Defisit
```
Warna defisit: `#DC2626` — teks merah, bukan hanya ikon.

### Perbandingan skenario (jika ≥2 skenario)

Tampilkan dalam layout side-by-side pada desktop, scroll horizontal pada mobile.
Label jelas di atas tiap kolom: "Skenario A", "Skenario B", dll.
Baris ringkasan di bawah: Total / Biaya per peserta / Sisa dana.
Pengguna bisa pilih skenario mana yang akan diajukan.
