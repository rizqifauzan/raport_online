# Raport Online Pesantren

Sistem Raport Online (mockup hi-fi) untuk pesantren — mengelola **TPQ** & **Madin**, dengan rekap nilai, manajemen santri, input nilai cepat, dan cetak raport. Dibangun dengan **Next.js (App Router)** dan siap deploy ke **Vercel**.

## Halaman

| Route | Deskripsi |
|---|---|
| `/` | Hub navigasi semua mockup |
| `/dashboard-a` | Dashboard rekap nilai — Variasi A (friendly) |
| `/dashboard-b` | Dashboard rekap nilai — Variasi B (command center) |
| `/siswa` | Manajemen siswa & kelas |
| `/input-nilai` | Input nilai 1 kelas (Praktik/Tertulis, rata-rata otomatis) |
| `/raport` | Preview & cetak raport per santri (A4) |
| `/pengguna` | Manajemen pengguna: tambah, edit, hapus, atur peran |
| `/guru` | Data guru + tanda tangan dan kalibrasi posisinya |

## Mode data: demo vs database

Aplikasi ini punya **dua mode**, ditentukan otomatis dari ada atau tidaknya `DATABASE_URL`:

| Kondisi | Mode | Perilaku |
|---|---|---|
| `DATABASE_URL` **tidak di-set** | Demo | Data hidup di memori browser dan **reset setiap refresh** (persis seperti mockup sebelumnya). Tidak butuh konfigurasi apa pun. |
| `DATABASE_URL` **di-set** | Database (Neon) | Seluruh data disimpan ke Neon Postgres dan dimuat kembali saat halaman dibuka. |

Mode yang sedang aktif terlihat di badge bawah sidebar: **Mode demo** (kuning) atau
**Tersimpan di database** (hijau).

### Mengaktifkan Neon

1. Buat project di [neon.tech](https://neon.tech), buka **Connection Details**, salin
   connection string **Pooled connection**.
2. Salin `.env.example` menjadi `.env.local`, lalu isi:

   ```bash
   DATABASE_URL="postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
   ```

3. Jalankan aplikasi. Tabel `app_state` dibuat otomatis saat request pertama —
   **tidak perlu migrasi manual**. Database yang masih kosong akan diisi data contoh
   sebagai kondisi awal.

Untuk deploy di Vercel, cukup tambahkan `DATABASE_URL` di **Project Settings →
Environment Variables**. Selama variabel itu belum ada, deployment tetap jalan normal
dalam mode demo.

### Cara penyimpanan bekerja

Seluruh state (santri, kelas, nilai, ujian, akhlaq, kenaikan, kunci nilai, dan arsip
tahun ajaran) disimpan sebagai satu dokumen JSONB di tabel `app_state`, satu baris per
tenant:

```sql
CREATE TABLE app_state (
  id         TEXT PRIMARY KEY,   -- dari APP_TENANT_ID, default 'default'
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Perubahan disimpan otomatis (debounce ~0,7 detik) lewat `PUT /api/state`; pembacaan
lewat `GET /api/state`. Bentuk dokumen dipilih supaya mode database berperilaku
identik dengan mode demo tanpa mengubah satu pun halaman yang sudah ada. Bila nanti
butuh query relasional (laporan lintas tahun, akses banyak operator sekaligus),
skema ini bisa dinormalisasi ke tabel per-entitas tanpa mengubah antarmuka store.

Set `APP_TENANT_ID` bila satu database dipakai beberapa pesantren.

## Manajemen pengguna

Halaman `/pengguna` mengelola siapa saja yang punya akses aplikasi, lengkap dengan
peran masing-masing:

| Peran | Cakupan |
|---|---|
| **Admin** | Akses penuh, termasuk kelola pengguna & tahun ajaran |
| **Operator** | Kelola santri, kelas, input nilai, dan cetak raport |

Fitur: tambah/edit/hapus pengguna, filter per peran, dan pencarian
nama/username/email. Dua pengaman ikut dipasang —
username wajib unik, dan admin aktif terakhir tidak bisa dihapus atau diturunkan
perannya supaya aplikasi tidak pernah kehilangan admin.

Seperti data lain, daftar pengguna ikut mode penyimpanan: tersimpan permanen di Neon
bila `DATABASE_URL` di-set, atau hanya di memori bila tidak.

> **Catatan keamanan.** Modul ini mengelola *daftar pengguna dan perannya*, bukan
> autentikasi — aplikasi belum punya halaman login dan peran belum menjadi pembatas
> akses yang sesungguhnya. Password sengaja **tidak** disimpan, karena endpoint
> `/api/state` saat ini belum terproteksi: siapa pun yang bisa membuka aplikasi juga
> bisa membaca seluruh isi state. Sebelum menyimpan kredensial apa pun, endpoint itu
> perlu diberi autentikasi lebih dulu dan password disimpan sebagai hash.

## Guru & tanda tangan otomatis

Halaman `/guru` menyimpan data guru (`id`, nama, kelas yang diampu) beserta **gambar
tanda tangan** dan **kalibrasi posisinya**. Saat raport dicetak, tanda tangan wali
kelas muncul sendiri — tidak perlu ditempel manual per santri.

### Kenapa posisi dikalibrasi per guru

Hasil pindaian tanda tangan tidak pernah seragam: ada yang goresannya besar, ada yang
miring, ada yang menyisakan banyak ruang kosong di satu sisi. Kalau semuanya dipasang
dengan posisi sama, sebagian akan menabrak nama atau menggantung terlalu tinggi. Karena
itu tiap guru punya tiga angka penyetel sendiri, tersimpan bersama datanya:

| Field | Arti | Rentang |
|---|---|---|
| `ttd.x` | geser mendatar (px) | −40 … +40 |
| `ttd.y` | geser tegak (px) | −30 … +30 |
| `ttd.scale` | ukuran tampil (%) | 40 … 160 |

Penyetelannya lewat slider, dengan pratinjau yang bentuknya sama persis dengan kotak
tanda tangan di raport — jadi hasilnya terlihat sebelum dicetak. Kalibrasi ini menempel
pada gurunya, bukan pada template, sehingga sekali disetel akan ikut ke semua raport
kelas yang diampu.

### Cara tanda tangan dicocokkan ke kelas

1. **Penetapan eksplisit** — guru yang kelasnya dicentang pada form (`kelasIds`).
2. **Pencocokan nama** — bila belum ditetapkan, nama guru dicocokkan dengan nama wali
   kelas pada data kelas.

Urutan ini membuat data kelas yang sudah ada tetap bekerja tanpa perlu diatur ulang.

### Catatan penyimpanan

Gambar tanda tangan **tidak** disimpan di dalam dokumen state, melainkan di tabel
terpisah `guru_ttd` lewat endpoint `/api/signature`. Alasannya: dokumen state dikirim
ulang seluruhnya setiap kali ada perubahan (termasuk saat mengetik nilai), sedangkan
gambar berukuran besar dan jarang berubah — mencampurnya akan memperlambat setiap
penyimpanan. Sebelum diunggah, gambar dikecilkan di browser ke maksimal 600×260 px
dan disimpan sebagai PNG agar latar transparannya tetap utuh.

Gunakan **PNG dengan latar transparan** untuk hasil paling rapi. Foto JPG tetap bisa,
tetapi latar putihnya akan menutupi garis di raport.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000

## Build produksi

```bash
npm run build
npm run start
```

## Deploy ke Vercel

**Opsi A — via dashboard (paling mudah):**
1. Push repo ini ke GitHub/GitLab/Bitbucket.
2. Buka [vercel.com/new](https://vercel.com/new), import repo.
3. Framework otomatis terdeteksi sebagai **Next.js** — biarkan default, klik **Deploy**.

**Opsi B — via CLI:**
```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

## Struktur

```
app/                 # Next.js App Router (satu folder per halaman)
  layout.jsx         # root layout + import globals.css
  globals.css        # design system (Plus Jakarta Sans + Amiri)
  page.jsx           # hub  (/)
  dashboard-a/…      # dst. per route
lib/mockup.js        # loader: ambil <style>+<body> mockup, render saat build
mockups/*.html       # sumber markup hi-fi (di-inject ke tiap route)
```

Setiap halaman dirender **statis saat build** (`force-static`), jadi hosting di Vercel sangat ringan & cepat.
