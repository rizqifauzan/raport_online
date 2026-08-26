import { NextResponse } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "./lib/auth";

/**
 * Penjaga akses seluruh aplikasi.
 *
 * Semua halaman dan API ditutup secara bawaan. Yang terbuka hanya landing
 * page, halaman login, dan endpoint login/logout itu sendiri.
 */

// Jalur yang boleh diakses tanpa login.
const PUBLIC_PATHS = new Set([
  "/",
  "/landing",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/session",
]);

function isPublic(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Aset statis Next dan berkas di /public.
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$/.test(pathname)
  );
}

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  // API menjawab dengan 401 — halaman dialihkan ke form login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Belum login." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", pathname + search);
  const res = NextResponse.redirect(url);
  // Buang cookie kedaluwarsa supaya tidak dikirim berulang.
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
