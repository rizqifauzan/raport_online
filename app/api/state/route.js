import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isDbEnabled, loadState, saveState } from "../../../lib/db";
import { SESSION_COOKIE, readSessionToken } from "../../../lib/auth";

// State selalu dibaca fresh — jangan pernah di-cache.
export const dynamic = "force-dynamic";

/**
 * GET /api/state
 *   { enabled: false }                        → DATABASE_URL tidak di-set (mode demo)
 *   { enabled: true, data: null }             → database aktif tapi masih kosong
 *   { enabled: true, data: {...}, updatedAt } → database aktif dan sudah berisi
 */
export async function GET() {
  if (!isDbEnabled()) {
    return NextResponse.json({ enabled: false, data: null });
  }
  try {
    const row = await loadState();
    return NextResponse.json({
      enabled: true,
      data: row?.data ?? null,
      updatedAt: row?.updatedAt ?? null,
    });
  } catch (err) {
    console.error("[api/state] gagal membaca database:", err);
    return NextResponse.json(
      { enabled: true, error: "Gagal membaca database.", data: null },
      { status: 500 },
    );
  }
}

/** PUT /api/state — simpan seluruh state. Diabaikan bila mode demo. */
export async function PUT(request) {
  if (!isDbEnabled()) {
    return NextResponse.json({ enabled: false, saved: false });
  }
  let data;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON yang valid." }, { status: 400 });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ error: "State harus berupa objek." }, { status: 400 });
  }
  // Daftar pengguna hanya boleh diubah admin. Untuk non-admin, bagian
  // `users` dari kiriman diabaikan dan yang tersimpan dipertahankan —
  // supaya operator tidak bisa mengangkat dirinya sendiri jadi admin.
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (session?.role !== "admin") {
    try {
      const row = await loadState();
      if (row?.data?.users) data.users = row.data.users;
      else delete data.users;
    } catch (err) {
      console.error("[api/state] gagal memeriksa daftar pengguna tersimpan:", err);
      return NextResponse.json(
        { enabled: true, saved: false, error: "Gagal menyimpan ke database." },
        { status: 500 },
      );
    }
  }

  try {
    const { updatedAt } = await saveState(data);
    return NextResponse.json({ enabled: true, saved: true, updatedAt });
  } catch (err) {
    console.error("[api/state] gagal menyimpan ke database:", err);
    return NextResponse.json(
      { enabled: true, saved: false, error: "Gagal menyimpan ke database." },
      { status: 500 },
    );
  }
}
