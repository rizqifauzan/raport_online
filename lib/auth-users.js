/**
 * Sumber data pengguna untuk keperluan login (sisi server).
 *
 * Daftar pengguna dibaca langsung dari tabel `app_user`. Tidak ada lagi
 * daftar seed sebagai cadangan: kalau database bermasalah, login ditolak.
 * Memakai daftar bawaan dalam keadaan itu justru berbahaya — orang bisa
 * masuk dengan akun yang sudah tidak berlaku.
 */

import { listUsers } from "./db";

/** Akun darurat supaya aplikasi selalu bisa dimasuki pertama kali. */
const BOOTSTRAP_USERNAME = process.env.AUTH_ADMIN_USERNAME || "admin";
const BOOTSTRAP_PASSWORD = process.env.AUTH_ADMIN_PASSWORD || "admin123";

let warned = false;

export function bootstrapAdmin() {
  if (!process.env.AUTH_ADMIN_PASSWORD && !warned) {
    warned = true;
    console.warn(
      "[auth] AUTH_ADMIN_PASSWORD belum di-set — akun darurat memakai " +
      `"${BOOTSTRAP_USERNAME}" / "admin123". Ganti lewat environment sebelum dipakai sungguhan.`,
    );
  }
  return {
    id: "u-bootstrap",
    nama: "Administrator",
    username: BOOTSTRAP_USERNAME,
    role: "admin",
    status: "Aktif",
    password: BOOTSTRAP_PASSWORD,
  };
}

/** Seluruh pengguna yang tercatat. Daftar kosong bila database bermasalah. */
export async function listAuthUsers() {
  try {
    return await listUsers();
  } catch (err) {
    console.error("[auth] gagal membaca pengguna dari database:", err);
    return [];
  }
}

export function findByUsername(users, username) {
  const q = String(username ?? "").trim().toLowerCase();
  if (!q) return null;
  return users.find((u) => String(u.username ?? "").toLowerCase() === q) ?? null;
}
