import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const runtime = 'nodejs';

// PATCH — update sebagian field santri (key camelCase dari store → kolom DB).
export async function PATCH(request, { params }) {
  const { id } = await params;
  const patch = await request.json();

  const rows = await sql`SELECT * FROM students WHERE id = ${id}`;
  const cur = rows[0];
  if (!cur) return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 });

  // Gabung nilai lama (snake_case) dengan patch (camelCase) lalu tulis semua kolom.
  const next = {
    kelas_id: patch.kelasId ?? cur.kelas_id,
    nama: patch.nama ?? cur.nama,
    gender: patch.gender ?? cur.gender,
    lahir: patch.lahir ?? cur.lahir,
    wali_santri: patch.waliSantri ?? cur.wali_santri,
    status: patch.status ?? cur.status,
    color: patch.color ?? cur.color,
  };

  await sql`
    UPDATE students SET
      kelas_id = ${next.kelas_id}, nama = ${next.nama}, gender = ${next.gender},
      lahir = ${next.lahir}, wali_santri = ${next.wali_santri},
      status = ${next.status}, color = ${next.color}
    WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

// DELETE — hapus santri.
export async function DELETE(request, { params }) {
  const { id } = await params;
  await sql`DELETE FROM students WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
