/**
 * Sumber data pengguna untuk keperluan login (sisi server).
 *
 * Daftar pengguna hidup di dalam dokumen state (lihat lib/db.js). Saat mode
 * database aktif, daftar itu dibaca dari sana. Saat mode demo — state hanya
 * ada di memori browser dan server tidak bisa melihatnya — dipakai daftar
 * seed dari lib/data.js.
 */

import { isDbEnabled, loadState } from "./db";
import { USERS_RAW } from "./data";

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

/** Seluruh pengguna yang tercatat, apa pun mode penyimpanannya. */
export async function listAuthUsers() {
  if (isDbEnabled()) {
    try {
      const row = await loadState();
      const users = row?.data?.users;
      if (Array.isArray(users) && users.length) return users;
    } catch (err) {
      console.error("[auth] gagal membaca pengguna dari database:", err);
      // Jangan jatuh ke daftar seed saat database bermasalah — lebih baik
      // login ditolak daripada memakai daftar yang salah.
      return [];
    }
  }
  return USERS_RAW;
}

export function findByUsername(users, username) {
  const q = String(username ?? "").trim().toLowerCase();
  if (!q) return null;
  return users.find((u) => String(u.username ?? "").toLowerCase() === q) ?? null;
}
