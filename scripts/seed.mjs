// Seed NeonDB dari data demo di lib/data.js + buat user admin.
// Jalankan: npm run seed   (membaca .env.local via --env-file)
//
// Membutuhkan env: DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { INITIAL_DATA, HISTORY_SEED } from '../lib/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL) throw new Error('DATABASE_URL belum di-set (lihat .env.local).');
if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('ADMIN_USERNAME / ADMIN_PASSWORD belum di-set (lihat .env.local).');
}

const sql = neon(DATABASE_URL);

async function run() {
  console.log('› Menjalankan skema…');
  const schema = await readFile(path.join(__dirname, '..', 'lib', 'schema.sql'), 'utf8');
  for (const stmt of schema.split(';').map((s) => s.trim()).filter(Boolean)) {
    await sql.query(stmt);
  }

  // ── Kelas ──
  console.log(`› Seed ${INITIAL_DATA.kelas.length} kelas…`);
  for (const k of INITIAL_DATA.kelas) {
    await sql`
      INSERT INTO kelas (id, nomor, label, wali, lembaga)
      VALUES (${k.id}, ${k.nomor}, ${k.label}, ${k.wali}, ${k.lembaga})
      ON CONFLICT (id) DO UPDATE
        SET nomor = EXCLUDED.nomor, label = EXCLUDED.label,
            wali = EXCLUDED.wali, lembaga = EXCLUDED.lembaga`;
  }

  // ── Students ──
  console.log(`› Seed ${INITIAL_DATA.students.length} santri…`);
  for (const s of INITIAL_DATA.students) {
    await sql`
      INSERT INTO students (id, kelas_id, nama, gender, lahir, wali_santri, status, color)
      VALUES (${s.id}, ${s.kelasId}, ${s.nama}, ${s.gender}, ${s.lahir}, ${s.waliSantri}, ${s.status}, ${s.color})
      ON CONFLICT (id) DO UPDATE
        SET kelas_id = EXCLUDED.kelas_id, nama = EXCLUDED.nama, gender = EXCLUDED.gender,
            lahir = EXCLUDED.lahir, wali_santri = EXCLUDED.wali_santri,
            status = EXCLUDED.status, color = EXCLUDED.color`;
  }

  // ── Ujian ──
  console.log(`› Seed ${INITIAL_DATA.ujian.length} ujian…`);
  for (const u of INITIAL_DATA.ujian) {
    await sql`
      INSERT INTO ujian (id, kelas_id, nama, tipe, periode)
      VALUES (${u.id}, ${u.kelasId}, ${u.nama}, ${u.tipe}, ${u.periode})
      ON CONFLICT (id) DO UPDATE
        SET kelas_id = EXCLUDED.kelas_id, nama = EXCLUDED.nama,
            tipe = EXCLUDED.tipe, periode = EXCLUDED.periode`;
  }

  // ── app_state (map-shaped state + setting) ──
  console.log('› Seed app_state…');
  const appState = {
    grades: INITIAL_DATA.grades,
    ujianNilai: INITIAL_DATA.ujianNilai,
    karakter: INITIAL_DATA.karakter,
    kenaikan: INITIAL_DATA.kenaikan,
    kenaikanTarget: {},
    locks: {},
    lembaga: 'TPQ',
    periode: 'UAS',
    currentTaLabel: '2025/2026',
  };
  await sql`
    INSERT INTO app_state (id, data)
    VALUES (1, ${JSON.stringify(appState)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;

  // ── Tahun ajaran (arsip) ──
  console.log(`› Seed ${HISTORY_SEED.length} arsip tahun ajaran…`);
  for (const h of HISTORY_SEED) {
    await sql`
      INSERT INTO tahun_ajaran (id, label, archived_at, snapshot)
      VALUES (${h.id}, ${h.label}, ${h.archivedAt}, ${JSON.stringify(h)}::jsonb)
      ON CONFLICT (id) DO UPDATE
        SET label = EXCLUDED.label, archived_at = EXCLUDED.archived_at,
            snapshot = EXCLUDED.snapshot`;
  }

  // ── User admin ──
  console.log(`› Membuat/memperbarui user admin "${ADMIN_USERNAME}"…`);
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await sql`
    INSERT INTO users (username, password_hash, role)
    VALUES (${ADMIN_USERNAME}, ${hash}, 'admin')
    ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`;

  console.log('✓ Seed selesai.');
}

run().catch((err) => {
  console.error('✗ Seed gagal:', err);
  process.exit(1);
});
