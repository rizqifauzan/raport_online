import { NextResponse } from 'next/server';
import { SESSION_COOKIE, clearedCookieOptions } from '../../../../lib/session';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', clearedCookieOptions());
  return res;
}
