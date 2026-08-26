import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, hashPassword, readSessionToken } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/password — { password } → { passwordHash }
 *
 * Hashing dikerjakan di server supaya parameter dan algoritmanya satu pintu.
 * Hash yang dikembalikan disimpan admin ke dalam data pengguna lewat /api/state.
 * Hanya admin yang boleh memanggilnya.
 */
export async function POST(request) {
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Hanya admin yang boleh mengatur password." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const password = String(body?.password ?? "");
  if (password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
  }

  return NextResponse.json({ passwordHash: await hashPassword(password) });
}
