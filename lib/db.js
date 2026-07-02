import { neon } from '@neondatabase/serverless';

// Lazily create the Neon SQL client so a missing DATABASE_URL only fails when
// a query actually runs (e.g. during a request), not at import time.
let _sql = null;

export function getSql() {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL belum di-set. Buat file .env.local berisi connection string Neon.'
    );
  }
  _sql = neon(url);
  return _sql;
}

// Tagged-template helper: const rows = await sql`SELECT * FROM students`;
export function sql(strings, ...values) {
  return getSql()(strings, ...values);
}
