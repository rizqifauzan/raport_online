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
