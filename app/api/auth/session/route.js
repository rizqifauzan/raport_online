import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSessionToken } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

/** GET /api/auth/session — siapa yang sedang login. */
export async function GET() {
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: { id: session.id, nama: session.nama, username: session.username, role: session.role },
  });
}
