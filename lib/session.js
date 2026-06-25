// Helper sesi berbasis JWT (jose-only) — aman dipakai di edge middleware.
// Tidak mengimpor bcrypt agar tidak menarik dependensi Node ke edge bundle.
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari (detik)

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET belum di-set di .env.local');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearedCookieOptions() {
  return { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 };
}
