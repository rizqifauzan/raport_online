# Raport Online Pesantren

Sistem Raport Online untuk pesantren — mengelola **TPQ** & **Madin**, dengan rekap nilai, manajemen santri, input nilai cepat, dan cetak raport. Dibangun dengan **Next.js (App Router)**, data tersimpan di **NeonDB (Postgres serverless)**, dan dilindungi **login admin**. Siap deploy ke **Vercel**.

## Database (NeonDB) & Login

Data kini **persisten** di NeonDB dan seluruh halaman dilindungi login.

### 1. Siapkan environment

Buat project di [neon.tech](https://neon.tech), salin connection string, lalu:

```bash
cp .env.local.example .env.local
# edit .env.local: isi DATABASE_URL, SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
```

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string dari Neon |
| `SESSION_SECRET` | String acak untuk menandatangani cookie sesi (`openssl rand -base64 32`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Kredensial admin awal |

### 2. Buat tabel & isi data awal

```bash
npm install
npm run seed     # menjalankan skema + seed data demo + membuat user admin
```

`npm run seed` aman dijalankan ulang (idempoten). Ubah `ADMIN_PASSWORD` lalu jalankan
ulang untuk mengganti password admin.

> Saat deploy ke Vercel, set variabel yang sama di **Project → Settings → Environment Variables**,
> dan jalankan seed sekali (lokal, mengarah ke DB produksi) sebelum dipakai.

## Halaman

| Route | Deskripsi |
|---|---|
| `/` | Hub navigasi semua mockup |
| `/dashboard-a` | Dashboard rekap nilai — Variasi A (friendly) |
| `/dashboard-b` | Dashboard rekap nilai — Variasi B (command center) |
| `/siswa` | Manajemen siswa & kelas |
| `/input-nilai` | Input nilai 1 kelas (Praktik/Tertulis, rata-rata otomatis) |
| `/raport` | Preview & cetak raport per santri (A4) |

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
  layout.jsx         # root layout + StoreProvider
  globals.css        # design system (Plus Jakarta Sans + Amiri)
  store.jsx          # client store: bootstrap dari /api/state + persist mutasi
  login/             # halaman login
  api/               # route handlers (auth, state, students, kelas, ujian, tahun-ajaran)
  dashboard-a/…      # dst. per route
lib/db.js            # client Neon (Postgres serverless)
lib/auth.js          # util password (bcrypt)
lib/session.js       # sesi JWT (jose) — dipakai middleware
lib/schema.sql       # skema tabel
lib/data.js          # data demo (sumber seed) + helper perhitungan nilai
scripts/seed.mjs     # buat tabel + isi data demo + user admin
middleware.js        # proteksi route (redirect ke /login bila belum login)
```

Data ditarik dari NeonDB saat halaman dimuat dan setiap perubahan dipersist lewat API route,
sehingga **tidak hilang saat refresh**.
