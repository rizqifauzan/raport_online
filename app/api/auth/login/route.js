import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { verifyPassword } from '../../../../lib/auth';
import {
  SESSION_COOKIE,
  createSession,
  sessionCookieOptions,
} from '../../../../lib/session';

export const runtime = 'nodejs';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 });
  }

  const username = (body.username ?? '').trim();
  const password = body.password ?? '';
  if (!username || !password) {
    return NextResponse.json(
      { error: 'Username dan password wajib diisi' },
      { status: 400 }
    );
  }

  const rows = await sql`SELECT id, username, password_hash, role FROM users WHERE username = ${username}`;
  const user = rows[0];
  const ok = user && (await verifyPassword(password, user.password_hash));
  if (!ok) {
    return NextResponse.json(
      { error: 'Username atau password salah' },
      { status: 401 }
    );
  }

  const token = await createSession({
    sub: String(user.id),
    username: user.username,
    role: user.role,
  });

  const res = NextResponse.json({
    ok: true,
    user: { username: user.username, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
