/**
 * Lapisan penyimpanan Neon Postgres.
 *
 * Aplikasi ini punya dua mode:
 *   - DATABASE_URL TIDAK di-set  → mode demo, data hidup di memori browser
 *                                  (persis seperti sebelumnya, reset saat refresh).
 *   - DATABASE_URL di-set        → mode database, seluruh state disimpan di Neon
 *                                  dan bertahan antar-refresh maupun antar-perangkat.
 *
 * State disimpan sebagai satu dokumen JSONB per tenant di tabel `app_state`.
 * Alasannya: seluruh logika aplikasi (store, kunci nilai, arsip tahun ajaran)
 * sudah bekerja di atas satu objek state utuh, jadi bentuk ini membuat mode
 * database berperilaku identik dengan mode demo tanpa menulis ulang tiap halaman.
 */

const TENANT = process.env.APP_TENANT_ID || "default";

/** Apakah mode database aktif? Ditentukan murni dari ada/tidaknya DATABASE_URL. */
export function isDbEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

let sqlPromise = null;

async function getSql() {
  if (!isDbEnabled()) return null;
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL);
      await sql`
        CREATE TABLE IF NOT EXISTS app_state (
          id         TEXT PRIMARY KEY,
          data       JSONB       NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `;
      // Gambar tanda tangan disimpan terpisah dari app_state supaya dokumen
      // state tetap ringan — state dikirim ulang seluruhnya pada tiap
      // perubahan, sedangkan gambar hanya ditulis saat guru mengunggahnya.
      await sql`
        CREATE TABLE IF NOT EXISTS guru_ttd (
          tenant     TEXT NOT NULL,
          guru_id    TEXT NOT NULL,
          image      TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (tenant, guru_id)
        )
      `;
      return sql;
    })().catch((err) => {
      sqlPromise = null; // biar percobaan berikutnya menyambung ulang
      throw err;
    });
  }
  return sqlPromise;
}

/** Ambil state tersimpan. `null` bila database masih kosong (belum pernah di-seed). */
export async function loadState() {
  const sql = await getSql();
  if (!sql) return null;
  const rows = await sql`SELECT data, updated_at FROM app_state WHERE id = ${TENANT}`;
  if (rows.length === 0) return null;
  return { data: rows[0].data, updatedAt: rows[0].updated_at };
}

/** Simpan (upsert) seluruh state. */
export async function saveState(data) {
  const sql = await getSql();
  if (!sql) return null;
  const rows = await sql`
    INSERT INTO app_state (id, data, updated_at)
    VALUES (${TENANT}, ${JSON.stringify(data)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = now()
    RETURNING updated_at
  `;
  return { updatedAt: rows[0].updated_at };
}

/** Ambil semua tanda tangan sebagai peta { guruId: dataUrl }. */
export async function loadSignatures() {
  const sql = await getSql();
  if (!sql) return {};
  const rows = await sql`SELECT guru_id, image FROM guru_ttd WHERE tenant = ${TENANT}`;
  return Object.fromEntries(rows.map((r) => [r.guru_id, r.image]));
}

/** Simpan (upsert) satu tanda tangan. */
export async function saveSignature(guruId, image) {
  const sql = await getSql();
  if (!sql) return null;
  await sql`
    INSERT INTO guru_ttd (tenant, guru_id, image, updated_at)
    VALUES (${TENANT}, ${guruId}, ${image}, now())
    ON CONFLICT (tenant, guru_id) DO UPDATE
      SET image = EXCLUDED.image, updated_at = now()
  `;
  return true;
}

/** Hapus tanda tangan satu guru. */
export async function deleteSignature(guruId) {
  const sql = await getSql();
  if (!sql) return null;
  await sql`DELETE FROM guru_ttd WHERE tenant = ${TENANT} AND guru_id = ${guruId}`;
  return true;
}
