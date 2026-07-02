import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from './lib/session';

// Proteksi semua route kecuali halaman & API login, serta aset statis.
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  // Sudah login tapi membuka /login → arahkan ke beranda.
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isPublic) return NextResponse.next();

  if (!session) {
    // API → 401 JSON; halaman → redirect ke /login.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Lewati aset internal Next.js & file statis (punya titik di nama, mis. .css/.svg).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
