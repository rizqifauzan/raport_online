import { NextResponse } from "next/server";
import { isDbEnabled, loadSignatures, saveSignature, deleteSignature } from "../../../lib/db";

export const dynamic = "force-dynamic";

// Batas ukuran satu gambar tanda tangan (data URL, sesudah dikecilkan di browser).
const MAX_IMAGE_CHARS = 400_000; // ± 300 KB

/** GET /api/signature — semua tanda tangan sebagai { guruId: dataUrl }. */
export async function GET() {
  if (!isDbEnabled()) {
    return NextResponse.json({ enabled: false, signatures: {} });
  }
  try {
    return NextResponse.json({ enabled: true, signatures: await loadSignatures() });
  } catch (err) {
    console.error("[api/signature] gagal membaca:", err);
    return NextResponse.json(
      { enabled: true, signatures: {}, error: "Gagal membaca tanda tangan." },
      { status: 500 },
    );
  }
}

/** PUT /api/signature — { guruId, image } */
export async function PUT(request) {
  if (!isDbEnabled()) {
    return NextResponse.json({ enabled: false, saved: false });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON yang valid." }, { status: 400 });
  }

  const { guruId, image } = body ?? {};
  if (typeof guruId !== "string" || !guruId.trim()) {
    return NextResponse.json({ error: "guruId wajib diisi." }, { status: 400 });
  }
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return NextResponse.json({ error: "image harus berupa data URL gambar." }, { status: 400 });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json(
      { error: "Gambar terlalu besar. Kecilkan dulu sebelum diunggah." },
      { status: 413 },
    );
  }

  try {
    await saveSignature(guruId, image);
    return NextResponse.json({ enabled: true, saved: true });
  } catch (err) {
    console.error("[api/signature] gagal menyimpan:", err);
    return NextResponse.json(
      { enabled: true, saved: false, error: "Gagal menyimpan tanda tangan." },
      { status: 500 },
    );
  }
}

/** DELETE /api/signature?guruId=... */
export async function DELETE(request) {
  if (!isDbEnabled()) {
    return NextResponse.json({ enabled: false, deleted: false });
  }
  const guruId = new URL(request.url).searchParams.get("guruId");
  if (!guruId) {
    return NextResponse.json({ error: "guruId wajib diisi." }, { status: 400 });
  }
  try {
    await deleteSignature(guruId);
    return NextResponse.json({ enabled: true, deleted: true });
  } catch (err) {
    console.error("[api/signature] gagal menghapus:", err);
    return NextResponse.json(
      { enabled: true, deleted: false, error: "Gagal menghapus tanda tangan." },
      { status: 500 },
    );
  }
}
