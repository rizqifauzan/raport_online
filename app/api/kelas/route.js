import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const runtime = 'nodejs';

// POST — tambah kelas baru.
export async function POST(request) {
  const k = await request.json();
  await sql`
    INSERT INTO kelas (id, nomor, label, wali, lembaga)
    VALUES (${k.id}, ${k.nomor ?? null}, ${k.label ?? null}, ${k.wali ?? null}, ${k.lembaga ?? null})
    ON CONFLICT (id) DO UPDATE
      SET nomor = EXCLUDED.nomor, label = EXCLUDED.label,
          wali = EXCLUDED.wali, lembaga = EXCLUDED.lembaga`;
  return NextResponse.json({ ok: true });
}
