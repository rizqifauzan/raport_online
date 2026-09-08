/**
 * Migrasi dari penyimpanan dokumen (`app_state`) ke skema ternormalisasi.
 *
 *   node scripts/migrate.mjs [--dry-run]
 *
 * Skrip ini idempoten: tabel tujuan dikosongkan lebih dulu, jadi aman
 * dijalankan berkali-kali. `app_state` TIDAK disentuh sama sekali — ia tetap
 * jadi jalan mundur sampai jalur baru terbukti stabil.
 *
 * Verifikasi jumlah baris dijalankan di akhir. Bila ada yang tidak cocok,
 * skrip keluar dengan kode 1 dan menyebutkan selisihnya.
 */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');
const AKAR = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum di-set.');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

/**
 * Daftar mata pelajaran jalur lama, disalin dari konstanta MAPEL di
 * lib/data.js. Sengaja ditulis ulang di sini, bukan di-import: lib/data.js
 * memakai sintaks ESM sementara paket ini tidak ber-"type": "module",
 * sehingga tidak bisa di-import dari skrip Node biasa.
 */
const MAPEL_SEED = {
  TPQ: [
    { id: 'tahsin',  label: 'Tahsin / Tilawah' },
    { id: 'tajwid',  label: 'Tajwid' },
    { id: 'tahfidz', label: 'Tahfidz Juz 30' },
    { id: 'doa',     label: 'Doa & Adab Harian' },
    { id: 'ibadah',  label: 'Praktik Ibadah' },
    { id: 'imla',    label: "Imla' (Menulis Arab)" },
  ],
  Madin: [
    { id: 'fiqih',  label: 'Fiqih' },
    { id: 'akidah', label: 'Akidah Akhlak' },
    { id: 'quran',  label: "Al-Qur'an Hadits" },
    { id: 'nahwu',  label: 'Nahwu Shorof' },
    { id: 'tarikh', label: 'Tarikh Islam' },
    { id: 'bahasa', label: 'Bahasa Arab' },
  ],
};

const PERIODE_SAH = new Set(['UTS', 'UAS']);

/**
 * Id tahun ajaran diturunkan dari labelnya ('2025/2026' → 'ta-2025-2026').
 * Id ini melekat selamanya — begitu T.A. diarsipkan, barisnya tetap memakai
 * id yang sama — jadi ia harus menyebut tahunnya, bukan statusnya.
 */
function idTa(label) {
  const bersih = String(label).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `ta-${bersih || Date.now()}`;
}

// ── Utilitas ─────────────────────────────────────────────────────────────

/** Pecah schema.sql jadi pernyataan-pernyataan tunggal. */
function pernyataanSkema() {
  const teks = readFileSync(join(AKAR, 'lib', 'schema.sql'), 'utf8');
  return teks
    .split('\n')
    .filter((baris) => !baris.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Sisipkan banyak baris sekaligus; mengembalikan jumlah baris tertulis. */
async function sisipkan(tabel, kolom, baris) {
  if (baris.length === 0) return 0;
  const BATAS = 500; // jaga ukuran satu permintaan tetap wajar
  let total = 0;
  for (let i = 0; i < baris.length; i += BATAS) {
    const potongan = baris.slice(i, i + BATAS);
    const params = [];
    const values = potongan
      .map((r) => `(${r.map((v) => `$${params.push(v)}`).join()})`)
      .join();
    await sql.query(`INSERT INTO ${tabel} (${kolom.join()}) VALUES ${values}`, params);
    total += potongan.length;
  }
  return total;
}

const angka = (v, bawaan = 0) => (Number.isFinite(Number(v)) ? Number(v) : bawaan);
const teks = (v, bawaan = '') => (v == null ? bawaan : String(v));

// ── Ambil sumber ─────────────────────────────────────────────────────────

const [baris] = await sql`SELECT data FROM app_state WHERE id = 'default'`;
if (!baris) {
  console.error('Tidak ada baris app_state dengan id=default. Tidak ada yang dimigrasikan.');
  process.exit(1);
}
const state = baris.data;
const riwayat = Array.isArray(state.history) ? state.history : [];

/**
 * Satu tahun ajaran beserta seluruh data yang terikat padanya. Arsip lama
 * dan T.A. aktif diperlakukan dengan bentuk yang sama persis, sehingga
 * pengisian tabelnya cukup satu jalur kode.
 */
const semuaTa = [
  ...riwayat.map((h, i) => ({
    id: teks(h.id, `ta-arsip-${i + 1}`),
    label: teks(h.label, `Arsip ${i + 1}`),
    aktif: false,
    archivedAt: h.archivedAt ?? null,
    urutan: i,
    sumber: h,
  })),
  {
    id: idTa(teks(state.currentTaLabel, '2025/2026')),
    label: teks(state.currentTaLabel, '2025/2026'),
    aktif: true,
    archivedAt: null,
    urutan: riwayat.length,
    sumber: state,
  },
];

// ── Rakit baris untuk tiap tabel ─────────────────────────────────────────

const rowsTa = semuaTa.map((t) => [t.id, t.label, t.aktif, t.archivedAt, t.urutan]);

const rowsGuru = (state.gurus ?? []).map((g, i) => [
  g.id, teks(g.nama), teks(g.color, '#0d9488'),
  angka(g.ttd?.x), angka(g.ttd?.y), angka(g.ttd?.scale, 100), i,
]);

const rowsUser = (state.users ?? []).map((u, i) => [
  u.id, teks(u.username), teks(u.nama), teks(u.role, 'operator'), teks(u.status, 'Aktif'),
  u.passwordHash ?? null, teks(u.color, '#0d9488'), teks(u.email), teks(u.dibuat), i,
]);

const rowsMapel = Object.entries(MAPEL_SEED).flatMap(([lembaga, daftar]) =>
  daftar.map((m, i) => [m.id, lembaga, m.label, i]));

const rowsKelas = [];
const rowsSantri = [];
const rowsUjian = [];
const rowsNilai = [];
const rowsKarakter = [];
const rowsKenaikan = [];
const rowsLock = [];
const rowsPimpinan = [];
const rowsNilaiMapel = [];

const dilewati = [];

for (const ta of semuaTa) {
  const s = ta.sumber;

  const kelasSah = new Set();
  (s.kelas ?? []).forEach((k, i) => {
    kelasSah.add(k.id);
    rowsKelas.push([
      ta.id, k.id, teks(k.lembaga), angka(k.nomor), teks(k.label),
      k.waliGuruId || null, teks(k.wali), i,
    ]);
  });

  const santriSah = new Set();
  (s.students ?? []).forEach((x, i) => {
    // Santri yang menunjuk kelas tak dikenal tetap dimigrasikan, tapi
    // tautan kelasnya dikosongkan supaya tidak melanggar foreign key.
    const kelasId = kelasSah.has(x.kelasId) ? x.kelasId : null;
    if (x.kelasId && !kelasId) {
      dilewati.push(`santri ${x.id} (${x.nama}) menunjuk kelas tak dikenal '${x.kelasId}'`);
    }
    santriSah.add(x.id);
    rowsSantri.push([
      ta.id, x.id, kelasId, teks(x.nama), teks(x.gender), teks(x.lahir),
      teks(x.waliSantri), teks(x.status, 'Aktif'), teks(x.color, '#0d9488'), i,
    ]);
  });

  const ujianSah = new Set();
  (s.ujian ?? []).forEach((u, i) => {
    if (!kelasSah.has(u.kelasId) || !PERIODE_SAH.has(u.periode)) {
      dilewati.push(`ujian ${u.id} (${u.nama}) — kelas/periode tidak sah`);
      return;
    }
    ujianSah.add(u.id);
    rowsUjian.push([ta.id, u.id, u.kelasId, u.periode, teks(u.nama), teks(u.tipe, 'Tertulis'), i]);
  });

  for (const [ujianId, perSantri] of Object.entries(s.ujianNilai ?? {})) {
    if (!ujianSah.has(ujianId)) { dilewati.push(`nilai untuk ujian tak dikenal '${ujianId}'`); continue; }
    for (const [santriId, nilai] of Object.entries(perSantri ?? {})) {
      if (!santriSah.has(santriId)) { dilewati.push(`nilai untuk santri tak dikenal '${santriId}'`); continue; }
      if (nilai == null || nilai === '') continue;
      rowsNilai.push([ta.id, ujianId, santriId, String(nilai)]);
    }
  }

  for (const [santriId, perPeriode] of Object.entries(s.karakter ?? {})) {
    if (!santriSah.has(santriId)) { dilewati.push(`karakter untuk santri tak dikenal '${santriId}'`); continue; }
    for (const [periode, fields] of Object.entries(perPeriode ?? {})) {
      if (!PERIODE_SAH.has(periode)) continue;
      for (const [field, nilai] of Object.entries(fields ?? {})) {
        if (nilai == null || nilai === '') continue;
        rowsKarakter.push([ta.id, santriId, periode, field, String(nilai)]);
      }
    }
  }

  const target = s.kenaikanTarget ?? {};
  const idKenaikan = new Set([...Object.keys(s.kenaikan ?? {}), ...Object.keys(target)]);
  for (const santriId of idKenaikan) {
    if (!santriSah.has(santriId)) { dilewati.push(`kenaikan untuk santri tak dikenal '${santriId}'`); continue; }
    rowsKenaikan.push([ta.id, santriId, s.kenaikan?.[santriId] ?? null, target[santriId] ?? null]);
  }

  for (const [kelasId, perPeriode] of Object.entries(s.locks ?? {})) {
    if (!kelasSah.has(kelasId)) { dilewati.push(`kunci untuk kelas tak dikenal '${kelasId}'`); continue; }
    for (const [periode, terkunci] of Object.entries(perPeriode ?? {})) {
      if (!PERIODE_SAH.has(periode)) continue;
      rowsLock.push([ta.id, kelasId, periode, terkunci === true]);
    }
  }

  for (const [lembaga, p] of Object.entries(s.pimpinan ?? {})) {
    rowsPimpinan.push([
      ta.id, lembaga, p?.guruId || null, teks(p?.nama),
      angka(p?.ttd?.x), angka(p?.ttd?.y), angka(p?.ttd?.scale, 100),
    ]);
  }

  // Jalur nilai lama. Hanya ada pada T.A. aktif — arsip tidak pernah
  // membekukan `grades`.
  for (const [santriId, perMapel] of Object.entries(s.grades ?? {})) {
    if (!santriSah.has(santriId)) { dilewati.push(`grades untuk santri tak dikenal '${santriId}'`); continue; }
    for (const [mapelId, perPeriode] of Object.entries(perMapel ?? {})) {
      for (const [periode, v] of Object.entries(perPeriode ?? {})) {
        if (!PERIODE_SAH.has(periode)) continue;
        rowsNilaiMapel.push([ta.id, santriId, mapelId, periode,
          v?.p == null ? null : angka(v.p), v?.t == null ? null : angka(v.t)]);
      }
    }
  }
}

// ── Ringkasan sebelum menulis ────────────────────────────────────────────

const rencana = {
  tahun_ajaran: rowsTa.length, guru: rowsGuru.length, app_user: rowsUser.length,
  kelas: rowsKelas.length, santri: rowsSantri.length, ujian: rowsUjian.length,
  nilai: rowsNilai.length, karakter: rowsKarakter.length, kenaikan: rowsKenaikan.length,
  kelas_lock: rowsLock.length, pimpinan: rowsPimpinan.length, mapel: rowsMapel.length,
  nilai_mapel: rowsNilaiMapel.length,
};

console.log('Rencana penulisan:');
for (const [t, n] of Object.entries(rencana)) console.log(`  ${t.padEnd(14)} ${n}`);
if (dilewati.length) {
  console.log(`\n${dilewati.length} entri dilewati karena referensinya tidak sah:`);
  for (const d of dilewati.slice(0, 20)) console.log(`  - ${d}`);
  if (dilewati.length > 20) console.log(`  … dan ${dilewati.length - 20} lainnya`);
}

if (DRY_RUN) {
  console.log('\n--dry-run: tidak ada yang ditulis.');
  process.exit(0);
}

// ── Tulis ────────────────────────────────────────────────────────────────

console.log('\nMenyiapkan skema…');
for (const p of pernyataanSkema()) await sql.query(p);

// Urutan penting: anak dulu, induk belakangan.
console.log('Mengosongkan tabel tujuan…');
await sql.query(`TRUNCATE nilai_mapel, mapel, pimpinan, kelas_lock, kenaikan,
                          karakter, nilai, ujian, santri, kelas, app_user, guru,
                          tahun_ajaran RESTART IDENTITY CASCADE`);

console.log('Menulis…');
await sisipkan('tahun_ajaran', ['id', 'label', 'aktif', 'archived_at', 'urutan'], rowsTa);
await sisipkan('guru', ['id', 'nama', 'color', 'ttd_x', 'ttd_y', 'ttd_scale', 'urutan'], rowsGuru);
await sisipkan('app_user', ['id', 'username', 'nama', 'role', 'status', 'password_hash', 'color', 'email', 'dibuat', 'urutan'], rowsUser);
await sisipkan('kelas', ['ta_id', 'id', 'lembaga', 'nomor', 'label', 'wali_guru_id', 'wali_teks', 'urutan'], rowsKelas);
await sisipkan('santri', ['ta_id', 'id', 'kelas_id', 'nama', 'gender', 'lahir', 'wali_santri', 'status', 'color', 'urutan'], rowsSantri);
await sisipkan('ujian', ['ta_id', 'id', 'kelas_id', 'periode', 'nama', 'tipe', 'urutan'], rowsUjian);
await sisipkan('nilai', ['ta_id', 'ujian_id', 'santri_id', 'nilai'], rowsNilai);
await sisipkan('karakter', ['ta_id', 'santri_id', 'periode', 'field', 'nilai'], rowsKarakter);
await sisipkan('kenaikan', ['ta_id', 'santri_id', 'status', 'target_kelas_id'], rowsKenaikan);
await sisipkan('kelas_lock', ['ta_id', 'kelas_id', 'periode', 'locked'], rowsLock);
await sisipkan('pimpinan', ['ta_id', 'lembaga', 'guru_id', 'nama_beku', 'ttd_x', 'ttd_y', 'ttd_scale'], rowsPimpinan);
await sisipkan('mapel', ['id', 'lembaga', 'label', 'urutan'], rowsMapel);
await sisipkan('nilai_mapel', ['ta_id', 'santri_id', 'mapel_id', 'periode', 'p', 't'], rowsNilaiMapel);

// ── Verifikasi ───────────────────────────────────────────────────────────

console.log('\nVerifikasi:');
let gagal = 0;
for (const [tabel, diharapkan] of Object.entries(rencana)) {
  const [{ n }] = await sql.query(`SELECT count(*)::int AS n FROM ${tabel}`);
  const cocok = n === diharapkan;
  if (!cocok) gagal++;
  console.log(`  ${cocok ? '✓' : '✗'} ${tabel.padEnd(14)} ${n} / ${diharapkan}`);
}

if (gagal > 0) {
  console.error(`\n${gagal} tabel tidak cocok. app_state tidak disentuh — perbaiki lalu jalankan ulang.`);
  process.exit(1);
}
console.log('\nSelesai. app_state dibiarkan utuh sebagai jalan mundur.');
