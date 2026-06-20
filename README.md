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
