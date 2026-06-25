import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mapStudent(r) {
  return {
    id: r.id,
    kelasId: r.kelas_id,
    nama: r.nama,
    gender: r.gender,
    lahir: r.lahir,
    waliSantri: r.wali_santri,
    status: r.status,
    color: r.color,
  };
}

function mapUjian(r) {
  return { id: r.id, kelasId: r.kelas_id, nama: r.nama, tipe: r.tipe, periode: r.periode };
}

// GET — rakit seluruh state untuk bootstrap store di klien.
export async function GET() {
  const [students, kelas, ujian, stateRows, taRows] = await Promise.all([
    sql`SELECT * FROM students ORDER BY id`,
    sql`SELECT * FROM kelas ORDER BY lembaga, nomor`,
    sql`SELECT * FROM ujian ORDER BY id`,
    sql`SELECT data FROM app_state WHERE id = 1`,
    sql`SELECT snapshot FROM tahun_ajaran ORDER BY archived_at`,
  ]);

  const state = stateRows[0]?.data ?? {};

  return NextResponse.json({
    students: students.map(mapStudent),
    kelas: kelas.map((k) => ({
      id: k.id, nomor: k.nomor, label: k.label, wali: k.wali, lembaga: k.lembaga,
    })),
    ujian: ujian.map(mapUjian),
    grades: state.grades ?? {},
    ujianNilai: state.ujianNilai ?? {},
    karakter: state.karakter ?? {},
    kenaikan: state.kenaikan ?? {},
    kenaikanTarget: state.kenaikanTarget ?? {},
    locks: state.locks ?? {},
    lembaga: state.lembaga ?? 'TPQ',
    periode: state.periode ?? 'UAS',
    currentTaLabel: state.currentTaLabel ?? '2025/2026',
    history: taRows.map((r) => r.snapshot),
  });
}

// PATCH — merge sebagian key map-shaped state / setting ke app_state.data.
export async function PATCH(request) {
  let patch;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 });
  }
  await sql`
    INSERT INTO app_state (id, data) VALUES (1, ${JSON.stringify(patch)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = app_state.data || EXCLUDED.data`;
  return NextResponse.json({ ok: true });
}
