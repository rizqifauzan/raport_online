import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const runtime = 'nodejs';

// PATCH — update sebagian field ujian.
export async function PATCH(request, { params }) {
  const { id } = await params;
  const patch = await request.json();

  const rows = await sql`SELECT * FROM ujian WHERE id = ${id}`;
  const cur = rows[0];
  if (!cur) return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 });

  const next = {
    kelas_id: patch.kelasId ?? cur.kelas_id,
    nama: patch.nama ?? cur.nama,
    tipe: patch.tipe ?? cur.tipe,
    periode: patch.periode ?? cur.periode,
  };

  await sql`
    UPDATE ujian SET kelas_id = ${next.kelas_id}, nama = ${next.nama},
      tipe = ${next.tipe}, periode = ${next.periode}
    WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

// DELETE — hapus ujian.
export async function DELETE(request, { params }) {
  const { id } = await params;
  await sql`DELETE FROM ujian WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
