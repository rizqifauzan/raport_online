/**
 * Cadangkan isi penyimpanan lama (app_state + guru_ttd) ke satu berkas JSON.
 *
 * Dipakai sebelum migrasi ke skema ternormalisasi. Berkas hasilnya memuat
 * hash password pengguna — simpan di luar repositori.
 *
 *   node scripts/dump-app-state.mjs <berkas-tujuan>
 */
import { neon } from '@neondatabase/serverless';
import { writeFileSync } from 'node:fs';

const tujuan = process.argv[2];
if (!tujuan) {
  console.error('Pemakaian: node scripts/dump-app-state.mjs <berkas-tujuan>');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum di-set.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const appState = await sql`SELECT id, data, updated_at FROM app_state`;
const guruTtd = await sql`SELECT tenant, guru_id, image, updated_at FROM guru_ttd`;

writeFileSync(tujuan, JSON.stringify({ app_state: appState, guru_ttd: guruTtd }, null, 2));
console.log(`Tersimpan: ${tujuan} (${appState.length} baris app_state, ${guruTtd.length} tanda tangan)`);
