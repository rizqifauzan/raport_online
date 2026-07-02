import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const runtime = 'nodejs';

// PATCH — update sebagian field kelas.
export async function PATCH(request, { params }) {
  const { id } = await params;
  const patch = await request.json();

  const rows = await sql`SELECT * FROM kelas WHERE id = ${id}`;
  const cur = rows[0];
  if (!cur) return NextResponse.json({ error: 'Kelas tidak ditemukan' }, { status: 404 });

  const next = {
    nomor: patch.nomor ?? cur.nomor,
    label: patch.label ?? cur.label,
    wali: patch.wali ?? cur.wali,
    lembaga: patch.lembaga ?? cur.lembaga,
  };

  await sql`
    UPDATE kelas SET nomor = ${next.nomor}, label = ${next.label},
      wali = ${next.wali}, lembaga = ${next.lembaga}
    WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

// DELETE — hapus kelas.
export async function DELETE(request, { params }) {
  const { id } = await params;
  await sql`DELETE FROM kelas WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
