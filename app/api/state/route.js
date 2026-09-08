import { NextResponse } from "next/server";
import { assembleState, isDbEnabled } from "../../../lib/db";

// State selalu dibaca fresh — jangan pernah di-cache.
export const dynamic = "force-dynamic";

/**
 * GET /api/state — seluruh isi database sebagai satu objek state.
 *
 * Bentuk objeknya sama persis dengan dokumen state lama, dirakit dari
 * tabel-tabel ternormalisasi oleh assembleState(). Itu sebabnya normalisasi
 * database tidak menyentuh satu pun halaman.
 *
 * Perubahan data TIDAK lagi lewat sini — tidak ada PUT. Setiap mutasi
 * dikirim per entitas ke /api/mutate, sehingga dua orang yang mengisi nilai
 * bersamaan tidak saling menimpa.
 */
export async function GET() {
  if (!isDbEnabled()) {
    return NextResponse.json(
      { enabled: false, data: null, error: "DATABASE_URL belum di-set." },
      { status: 503 },
    );
  }
  try {
    const hasil = await assembleState();
    return NextResponse.json({
      enabled: true,
      data: hasil?.data ?? null,
      taId: hasil?.taId ?? null,
    });
  } catch (err) {
    console.error("[api/state] gagal membaca database:", err);
    return NextResponse.json(
      { enabled: true, error: "Gagal membaca database.", data: null },
      { status: 500 },
    );
  }
}
