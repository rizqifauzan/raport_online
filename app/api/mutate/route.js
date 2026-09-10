import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionToken } from "../../../lib/auth";
import * as db from "../../../lib/db";

/**
 * Satu pintu untuk seluruh perubahan data.
 *
 * Body: { entity, action, ...muatan }
 *
 * Dibuat satu endpoint, bukan satu route per entitas, karena tiga aturan
 * berikut harus berlaku untuk SETIAP perubahan tanpa kecuali — menyebarnya
 * ke belasan berkas hanya memperbesar peluang salah satunya terlewat:
 *
 *   1. Sudah login (dijamin middleware.js untuk semua /api).
 *   2. Hanya admin yang boleh menyentuh daftar pengguna. Tanpa ini seorang
 *      operator bisa mengangkat dirinya sendiri jadi admin.
 *   3. Kelas yang sudah dikunci menolak perubahan nilai, karakter, dan
 *      kenaikan. Pemeriksaannya di server, bukan cuma di antarmuka.
 */

export const dynamic = "force-dynamic";

function salah(pesan, status = 400) {
  return NextResponse.json({ ok: false, error: pesan }, { status });
}

/** Tolak bila kelas terkunci pada periode tersebut. */
async function terkunci(taId, kelasId, periode) {
  if (!kelasId || !periode) return false;
  return db.isKelasLocked(taId, kelasId, periode);
}

export async function POST(request) {
  if (!db.isDbEnabled()) {
    return salah("Database tidak tersambung.", 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return salah("Body bukan JSON yang valid.");
  }

  const { entity, action } = body ?? {};
  if (typeof entity !== "string" || typeof action !== "string") {
    return salah("entity dan action wajib diisi.");
  }

  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return salah("Belum login.", 401);

  // Aturan 2 — daftar pengguna milik admin.
  if (entity === "user" && session.role !== "admin") {
    return salah("Hanya admin yang boleh mengubah daftar pengguna.", 403);
  }

  try {
    const taId = await db.activeTaId();
    if (!taId) return salah("Belum ada tahun ajaran aktif.", 409);

    const hasil = await jalankan(entity, action, body, taId);
    if (hasil?.tolak) return salah(hasil.tolak, hasil.status ?? 409);
    return NextResponse.json({ ok: true, ...(hasil?.data ?? {}) });
  } catch (err) {
    console.error(`[api/mutate] ${entity}.${action} gagal:`, err);
    return NextResponse.json({ ok: false, error: "Gagal menyimpan ke database." }, { status: 500 });
  }
}

async function jalankan(entity, action, b, taId) {
  switch (`${entity}.${action}`) {
    // ── Nilai ujian ──────────────────────────────────────────────────────
    case "nilai.set": {
      const info = await db.ujianKelasPeriode(taId, b.ujianId);
      if (!info) return { tolak: "Ujian tidak ditemukan.", status: 404 };
      if (await terkunci(taId, info.kelasId, info.periode)) {
        return { tolak: "Kelas sudah dikunci untuk periode ini." };
      }
      await db.setNilai(taId, b.ujianId, b.santriId, b.nilai);
      return null;
    }

    // ── Karakter ─────────────────────────────────────────────────────────
    case "karakter.set": {
      const kelasId = await db.kelasSantri(taId, b.santriId);
      if (await terkunci(taId, kelasId, b.periode)) {
        return { tolak: "Kelas sudah dikunci untuk periode ini." };
      }
      await db.setKarakter(taId, b.santriId, b.periode, b.field, b.nilai);
      return null;
    }

    // ── Kenaikan (selalu terikat periode UAS) ────────────────────────────
    case "kenaikan.status": {
      const kelasId = await db.kelasSantri(taId, b.santriId);
      if (await terkunci(taId, kelasId, "UAS")) {
        return { tolak: "Kelas sudah dikunci untuk periode ini." };
      }
      await db.setKenaikanStatus(taId, b.santriId, b.status);
      return null;
    }
    case "kenaikan.target": {
      const kelasId = await db.kelasSantri(taId, b.santriId);
      if (await terkunci(taId, kelasId, "UAS")) {
        return { tolak: "Kelas sudah dikunci untuk periode ini." };
      }
      await db.setKenaikanTargetKelas(taId, b.santriId, b.target);
      return null;
    }
    case "kenaikan.reset":
      await db.hapusSemuaKenaikan(taId);
      return null;

    // ── Kunci kelas ──────────────────────────────────────────────────────
    case "lock.set":
      await db.setLock(taId, b.kelasId, b.periode, b.locked);
      return null;

    // ── Santri ───────────────────────────────────────────────────────────
    case "santri.create": await db.tambahSantri(taId, b.data); return null;
    case "santri.update": await db.ubahSantri(taId, b.id, b.patch ?? {}); return null;
    case "santri.delete": await db.hapusSantri(taId, b.id); return null;

    // ── Kelas ────────────────────────────────────────────────────────────
    case "kelas.create": await db.tambahKelas(taId, b.data); return null;
    case "kelas.update": await db.ubahKelas(taId, b.id, b.patch ?? {}); return null;
    case "kelas.delete": await db.hapusKelas(taId, b.id); return null;

    // ── Ujian ────────────────────────────────────────────────────────────
    case "ujian.create": await db.tambahUjian(taId, b.data); return null;
    case "ujian.update": await db.ubahUjian(taId, b.id, b.patch ?? {}); return null;
    case "ujian.delete": await db.hapusUjian(taId, b.id); return null;
    case "ujian.reorder":
      await db.urutkanUjian(taId, b.kelasId, b.periode, Array.isArray(b.ids) ? b.ids : []);
      return null;

    // ── Guru ─────────────────────────────────────────────────────────────
    case "guru.create": await db.tambahGuru(b.data); return null;
    case "guru.update": await db.ubahGuru(taId, b.id, b.patch ?? {}); return null;
    case "guru.delete": await db.hapusGuru(taId, b.id); return null;

    // ── Pengguna (wewenang sudah diperiksa di POST) ───────────────────────
    case "user.create": await db.tambahUser(b.data); return null;
    case "user.update": await db.ubahUser(b.id, b.patch ?? {}); return null;
    case "user.delete": await db.hapusUser(b.id); return null;

    // ── Nilai mapel (jalur lama) ─────────────────────────────────────────
    case "nilaiMapel.set": {
      const kelasId = await db.kelasSantri(taId, b.santriId);
      if (await terkunci(taId, kelasId, b.periode)) {
        return { tolak: "Kelas sudah dikunci untuk periode ini." };
      }
      await db.setNilaiMapel(taId, b.santriId, b.mapelId, b.periode, b.field, b.nilai);
      return null;
    }

    // ── Pimpinan lembaga ─────────────────────────────────────────────────
    case "pimpinan.set": await db.setPimpinanGuru(taId, b.lembaga, b.guruId); return null;

    // ── Tahun ajaran ─────────────────────────────────────────────────────
    case "ta.archive": {
      if (typeof b.label !== "string" || !b.label.trim()) {
        return { tolak: "Label tahun ajaran baru wajib diisi.", status: 400 };
      }
      const hasil = await db.arsipkanTa(b.label.trim(), b.pimpinan ?? null);
      return { data: hasil };
    }
    case "ta.rename": {
      if (typeof b.label !== "string" || !b.label.trim()) {
        return { tolak: "Label tahun ajaran wajib diisi.", status: 400 };
      }
      const label = b.label.trim();
      if (await db.labelTaDipakaiLain(label)) {
        return { tolak: `Tahun ajaran "${label}" sudah ada di arsip.`, status: 409 };
      }
      const hasil = await db.ubahLabelTa(label);
      return { data: hasil };
    }

    default:
      return { tolak: `Aksi tidak dikenal: ${entity}.${action}`, status: 400 };
  }
}
