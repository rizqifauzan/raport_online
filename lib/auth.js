/**
 * Autentikasi — hashing password, penandatanganan sesi, dan pembacaan cookie.
 *
 * Seluruh modul ini memakai Web Crypto (`crypto.subtle`) supaya bisa dipakai
 * baik di route handler (Node) maupun di middleware (Edge runtime).
 *
 * Bentuk penyimpanan password di dalam data pengguna:
 *   passwordHash: "pbkdf2$<iterasi>$<salt-b64url>$<hash-b64url>"
 * Password polos TIDAK PERNAH disimpan di mana pun.
 */

export const SESSION_COOKIE = "raport_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 jam

const PBKDF2_ITERATIONS = 120_000;
const KEY_LENGTH = 32;

// ------------------------------------------------------------------
// Util encoding
// ------------------------------------------------------------------

const enc = new TextEncoder();

function toB64url(bytes) {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Perbandingan waktu-tetap supaya tidak bocor lewat timing. */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ------------------------------------------------------------------
// Password
// ------------------------------------------------------------------

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    KEY_LENGTH * 8,
  );
  return new Uint8Array(bits);
}

/** Buat hash baru untuk sebuah password polos. */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64url(salt)}$${toB64url(hash)}`;
}

/** Cocokkan password polos dengan hash tersimpan. */
export async function verifyPassword(password, stored) {
  if (typeof stored !== "string") return false;
  const [scheme, iterStr, saltStr, hashStr] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterStr || !saltStr || !hashStr) return false;
  const iterations = Number(iterStr);
  if (!Number.isInteger(iterations) || iterations < 1000) return false;
  try {
    const actual = await pbkdf2(password, fromB64url(saltStr), iterations);
    return timingSafeEqual(actual, fromB64url(hashStr));
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------
// Token sesi — payload JSON + tanda tangan HMAC-SHA256
// ------------------------------------------------------------------

/**
 * Kunci penandatangan sesi. Set `AUTH_SECRET` di environment.
 * Bila tidak di-set, dipakai kunci turunan dari DATABASE_URL sebagai
 * cadangan; kalau itu pun kosong, dipakai kunci pengembangan yang
 * TIDAK aman untuk produksi.
 */
function secret() {
  const s = process.env.AUTH_SECRET || process.env.DATABASE_URL;
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth] AUTH_SECRET belum di-set. Sesi ditandatangani dengan kunci bawaan — " +
      "siapa pun yang tahu kunci ini bisa memalsukan login. Set AUTH_SECRET sekarang.",
    );
  }
  return "raport-online-dev-secret";
}

async function hmacKey() {
  return crypto.subtle.importKey(
    "raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
}

async function sign(data) {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(data));
  return toB64url(sig);
}

/** Buat token sesi untuk seorang pengguna. */
export async function createSessionToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const body = toB64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${await sign(body)}`;
}

/** Baca token sesi. Mengembalikan payload, atau `null` bila tidak sah/kedaluwarsa. */
export async function readSessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await sign(body);
  if (!timingSafeEqual(enc.encode(sig), enc.encode(expected))) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!payload?.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Opsi cookie sesi — httpOnly supaya tidak bisa dibaca JavaScript halaman. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
