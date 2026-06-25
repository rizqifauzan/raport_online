import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const runtime = 'nodejs';

// POST — tambah santri baru.
export async function POST(request) {
  const s = await request.json();
  await sql`
    INSERT INTO students (id, kelas_id, nama, gender, lahir, wali_santri, status, color)
    VALUES (${s.id}, ${s.kelasId ?? null}, ${s.nama ?? null}, ${s.gender ?? null},
            ${s.lahir ?? null}, ${s.waliSantri ?? null}, ${s.status ?? null}, ${s.color ?? null})
    ON CONFLICT (id) DO UPDATE
      SET kelas_id = EXCLUDED.kelas_id, nama = EXCLUDED.nama, gender = EXCLUDED.gender,
          lahir = EXCLUDED.lahir, wali_santri = EXCLUDED.wali_santri,
          status = EXCLUDED.status, color = EXCLUDED.color`;
  return NextResponse.json({ ok: true });
}
