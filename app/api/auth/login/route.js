import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions, verifyPassword, SESSION_COOKIE } from "../../../../lib/auth";
import { bootstrapAdmin, findByUsername, listAuthUsers } from "../../../../lib/auth-users";

export const dynamic = "force-dynamic";

// Pembatas percobaan sederhana per-username (di memori proses).
const attempts = new Map();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function tooManyAttempts(key) {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) { attempts.delete(key); return false; }
  return rec.count >= MAX_ATTEMPTS;
}

function noteFailure(key) {
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else rec.count += 1;
}

/** POST /api/auth/login — { username, password } */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  if (!username || !password) {
    return NextResponse.json({ error: "Username dan password wajib diisi." }, { status: 400 });
  }

  const key = username.toLowerCase();
  if (tooManyAttempts(key)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi." },
      { status: 429 },
    );
  }

  // Pesan gagal sengaja seragam supaya tidak membocorkan username mana yang ada.
  const gagal = NextResponse.json({ error: "Username atau password salah." }, { status: 401 });

  let user = null;

  const boot = bootstrapAdmin();
  if (boot && boot.username.toLowerCase() === key && password === boot.password) {
    const { password: _pw, ...rest } = boot;
    user = rest;
  }

  if (!user) {
    const users = await listAuthUsers();
    const found = findByUsername(users, username);
    if (!found || !found.passwordHash) { noteFailure(key); return gagal; }
    if (found.status && found.status !== "Aktif") {
      noteFailure(key);
      return NextResponse.json({ error: "Akun ini dinonaktifkan." }, { status: 403 });
    }
    if (!(await verifyPassword(password, found.passwordHash))) { noteFailure(key); return gagal; }
    user = found;
  }

  attempts.delete(key);

  const token = await createSessionToken(user);
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, nama: user.nama, username: user.username, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
