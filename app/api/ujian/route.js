import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const runtime = 'nodejs';

// POST — tambah ujian baru.
export async function POST(request) {
  const u = await request.json();
  await sql`
    INSERT INTO ujian (id, kelas_id, nama, tipe, periode)
    VALUES (${u.id}, ${u.kelasId ?? null}, ${u.nama ?? null}, ${u.tipe ?? null}, ${u.periode ?? null})
    ON CONFLICT (id) DO UPDATE
      SET kelas_id = EXCLUDED.kelas_id, nama = EXCLUDED.nama,
          tipe = EXCLUDED.tipe, periode = EXCLUDED.periode`;
  return NextResponse.json({ ok: true });
}
