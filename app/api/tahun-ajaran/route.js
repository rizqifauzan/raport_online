import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';

export const runtime = 'nodejs';

// POST — arsipkan T.A. berjalan lalu reset state untuk tahun ajaran baru.
// Body: { snapshot, newTaLabel }
//   snapshot = objek lengkap { id, label, archivedAt, students, kelas, ujian,
//              ujianNilai, karakter, kenaikan, kenaikanTarget, locks }
export async function POST(request) {
  const { snapshot, newTaLabel } = await request.json();
  if (!snapshot?.id || !newTaLabel) {
    return NextResponse.json({ error: 'snapshot & newTaLabel wajib' }, { status: 400 });
  }

  // 1) Simpan arsip.
  await sql`
    INSERT INTO tahun_ajaran (id, label, archived_at, snapshot)
    VALUES (${snapshot.id}, ${snapshot.label}, ${snapshot.archivedAt}, ${JSON.stringify(snapshot)}::jsonb)
    ON CONFLICT (id) DO UPDATE
      SET label = EXCLUDED.label, archived_at = EXCLUDED.archived_at, snapshot = EXCLUDED.snapshot`;

  // 2) Reset data T.A. berjalan: kosongkan ujian + state nilai/karakter/kenaikan/locks,
  //    set periode ke UTS, ganti label T.A. (santri & kelas dipertahankan).
  await sql`DELETE FROM ujian`;
  const reset = {
    ujianNilai: {},
    karakter: {},
    kenaikan: {},
    kenaikanTarget: {},
    locks: {},
    periode: 'UTS',
    currentTaLabel: newTaLabel,
  };
  await sql`
    INSERT INTO app_state (id, data) VALUES (1, ${JSON.stringify(reset)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = app_state.data || EXCLUDED.data`;

  return NextResponse.json({ ok: true });
}
