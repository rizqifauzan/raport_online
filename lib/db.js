/**
 * Lapisan penyimpanan Neon Postgres.
 *
 * Data disimpan dalam tabel-tabel ternormalisasi (lihat lib/schema.sql).
 * Modul ini punya dua tanggung jawab:
 *
 *   1. `assembleState()` — merakit seluruh isi database jadi SATU objek
 *      berbentuk sama persis dengan dokumen state lama. Bentuk itu adalah
 *      kontrak yang dipakai app/store.jsx dan seluruh halaman, jadi
 *      normalisasi database tidak menyentuh satu pun komponen antarmuka.
 *
 *   2. Fungsi mutasi per entitas — tiap perubahan menulis baris yang
 *      bersangkutan saja, bukan seluruh dokumen. Ini yang menghilangkan
 *      saling-timpa saat beberapa orang mengisi nilai bersamaan.
 *
 * Penyimpanan lama (`app_state`, satu dokumen JSONB) masih ada di database
 * sebagai jalan mundur, tapi tidak lagi dibaca maupun ditulis dari sini.
 */

const TENANT = process.env.APP_TENANT_ID || "default";

/** Apakah mode database aktif? Ditentukan murni dari ada/tidaknya DATABASE_URL. */
export function isDbEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

let sqlPromise = null;

async function getSql() {
  if (!isDbEnabled()) return null;
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const { neon } = await import("@neondatabase/serverless");
      return neon(process.env.DATABASE_URL);
    })().catch((err) => {
      sqlPromise = null; // biar percobaan berikutnya menyambung ulang
      throw err;
    });
  }
  return sqlPromise;
}

// ── Bentuk baris → bentuk yang dipakai antarmuka ─────────────────────────

const ttdDari = (r) => ({ x: r.ttd_x, y: r.ttd_y, scale: r.ttd_scale });

const kelasDari = (r) => ({
  id: r.id,
  lembaga: r.lembaga,
  nomor: r.nomor,
  label: r.label,
  wali: r.wali_teks,
  waliGuruId: r.wali_guru_id ?? "",
});

const santriDari = (r) => ({
  id: r.id,
  kelasId: r.kelas_id ?? "",
  nama: r.nama,
  gender: r.gender,
  lahir: r.lahir,
  waliSantri: r.wali_santri,
  status: r.status,
  color: r.color,
});

const ujianDari = (r) => ({
  id: r.id,
  kelasId: r.kelas_id,
  nama: r.nama,
  tipe: r.tipe,
  periode: r.periode,
});

/**
 * Nilai disimpan sebagai TEXT karena ujian bertipe 'Kustom' berisi catatan
 * bebas. Untuk tipe lain nilainya dikembalikan sebagai angka, sesuai bentuk
 * yang selama ini dipakai antarmuka.
 */
function nilaiDari(mentah, tipe) {
  if (mentah == null) return null;
  if (tipe === "Kustom") return mentah;
  const n = Number(mentah);
  return Number.isFinite(n) ? n : mentah;
}

/**
 * Tanggal arsip sebagai 'YYYY-MM-DD'.
 *
 * Driver mengembalikan kolom DATE sebagai objek Date, dan String(Date) di
 * Node menghasilkan 'Tue Sep 08 2026 …' — bukan bentuk yang dipakai
 * antarmuka. Komponen tanggalnya diambil apa adanya (bukan lewat
 * toISOString) supaya tidak bergeser sehari karena zona waktu.
 */
function tanggalIso(v) {
  if (!v) return null;
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}

/** Susun data satu tahun ajaran dari kumpulan baris yang sudah dikelompokkan. */
function rakitTa(taId, baris) {
  const kelas = baris.kelas.filter((r) => r.ta_id === taId).map(kelasDari);
  const students = baris.santri.filter((r) => r.ta_id === taId).map(santriDari);
  const ujianBaris = baris.ujian.filter((r) => r.ta_id === taId);
  const ujian = ujianBaris.map(ujianDari);
  const tipePerUjian = new Map(ujianBaris.map((r) => [r.id, r.tipe]));

  const ujianNilai = {};
  for (const r of baris.nilai) {
    if (r.ta_id !== taId) continue;
    (ujianNilai[r.ujian_id] ??= {})[r.santri_id] = nilaiDari(r.nilai, tipePerUjian.get(r.ujian_id));
  }

  const karakter = {};
  for (const r of baris.karakter) {
    if (r.ta_id !== taId) continue;
    ((karakter[r.santri_id] ??= {})[r.periode] ??= {})[r.field] = r.nilai;
  }

  const kenaikan = {};
  const kenaikanTarget = {};
  for (const r of baris.kenaikan) {
    if (r.ta_id !== taId) continue;
    if (r.status != null) kenaikan[r.santri_id] = r.status;
    if (r.target_kelas_id != null) kenaikanTarget[r.santri_id] = r.target_kelas_id;
  }

  const locks = {};
  for (const r of baris.lock) {
    if (r.ta_id !== taId) continue;
    (locks[r.kelas_id] ??= {})[r.periode] = r.locked;
  }

  const pimpinan = {};
  for (const r of baris.pimpinan) {
    if (r.ta_id !== taId) continue;
    pimpinan[r.lembaga] = { guruId: r.guru_id ?? "", nama: r.nama_beku, ttd: ttdDari(r) };
  }

  return { kelas, students, ujian, ujianNilai, karakter, kenaikan, kenaikanTarget, locks, pimpinan };
}

/**
 * Rakit seluruh isi database jadi objek state utuh.
 *
 * `null` bila database masih kosong (belum pernah dimigrasikan/di-seed).
 */
export async function assembleState() {
  const sql = await getSql();
  if (!sql) return null;

  const [ta, kelas, santri, ujian, nilai, karakter, kenaikan, lock, pimpinan, gurus, users, nilaiMapel, mapel] =
    await Promise.all([
      sql`SELECT * FROM tahun_ajaran ORDER BY urutan, id`,
      sql`SELECT * FROM kelas       ORDER BY ta_id, urutan`,
      sql`SELECT * FROM santri      ORDER BY ta_id, urutan`,
      sql`SELECT * FROM ujian       ORDER BY ta_id, urutan`,
      sql`SELECT * FROM nilai`,
      sql`SELECT * FROM karakter`,
      sql`SELECT * FROM kenaikan`,
      sql`SELECT * FROM kelas_lock`,
      sql`SELECT * FROM pimpinan`,
      sql`SELECT * FROM guru     ORDER BY urutan, id`,
      sql`SELECT * FROM app_user ORDER BY urutan, id`,
      sql`SELECT * FROM nilai_mapel`,
      sql`SELECT * FROM mapel ORDER BY lembaga, urutan`,
    ]);

  const taAktif = ta.find((t) => t.aktif);
  if (!taAktif) return null;

  const baris = { kelas, santri, ujian, nilai, karakter, kenaikan, lock, pimpinan };
  const aktif = rakitTa(taAktif.id, baris);

  // Jalur nilai lama. Daftar mapelnya per lembaga: { TPQ: [...], Madin: [...] }
  const mapelPerLembaga = {};
  for (const m of mapel) {
    (mapelPerLembaga[m.lembaga] ??= []).push({ id: m.id, label: m.label });
  }

  // grades[santriId][mapelId][periode] = { p, t }
  const grades = {};
  for (const r of nilaiMapel) {
    if (r.ta_id !== taAktif.id) continue;
    ((grades[r.santri_id] ??= {})[r.mapel_id] ??= {})[r.periode] = { p: r.p, t: r.t };
  }

  const history = ta
    .filter((t) => !t.aktif)
    .map((t) => {
      const isi = rakitTa(t.id, baris);
      return {
        id: t.id,
        label: t.label,
        archivedAt: tanggalIso(t.archived_at),
        students: isi.students,
        kelas: isi.kelas,
        ujian: isi.ujian,
        ujianNilai: isi.ujianNilai,
        karakter: isi.karakter,
        kenaikan: isi.kenaikan,
        kenaikanTarget: isi.kenaikanTarget,
        locks: isi.locks,
        pimpinan: isi.pimpinan,
      };
    });

  return {
    data: {
      students: aktif.students,
      kelas: aktif.kelas,
      ujian: aktif.ujian,
      ujianNilai: aktif.ujianNilai,
      karakter: aktif.karakter,
      kenaikan: aktif.kenaikan,
      kenaikanTarget: aktif.kenaikanTarget,
      locks: aktif.locks,
      pimpinan: aktif.pimpinan,
      grades,
      mapel: mapelPerLembaga,
      history,
      currentTaLabel: taAktif.label,
      users: users.map((u) => ({
        id: u.id,
        nama: u.nama,
        username: u.username,
        role: u.role,
        status: u.status,
        color: u.color,
        email: u.email,
        dibuat: u.dibuat,
        ...(u.password_hash ? { passwordHash: u.password_hash } : {}),
      })),
      gurus: gurus.map((g) => ({ id: g.id, nama: g.nama, color: g.color, ttd: ttdDari(g) })),
    },
    taId: taAktif.id,
  };
}

/** Id tahun ajaran yang sedang aktif. */
export async function activeTaId() {
  const sql = await getSql();
  if (!sql) return null;
  const rows = await sql`SELECT id FROM tahun_ajaran WHERE aktif LIMIT 1`;
  return rows[0]?.id ?? null;
}

/** Ambil semua tanda tangan sebagai peta { guruId: dataUrl }. */
export async function loadSignatures() {
  const sql = await getSql();
  if (!sql) return {};
  const rows = await sql`SELECT guru_id, image FROM guru_ttd WHERE tenant = ${TENANT}`;
  return Object.fromEntries(rows.map((r) => [r.guru_id, r.image]));
}

/** Simpan (upsert) satu tanda tangan. */
export async function saveSignature(guruId, image) {
  const sql = await getSql();
  if (!sql) return null;
  await sql`
    INSERT INTO guru_ttd (tenant, guru_id, image, updated_at)
    VALUES (${TENANT}, ${guruId}, ${image}, now())
    ON CONFLICT (tenant, guru_id) DO UPDATE
      SET image = EXCLUDED.image, updated_at = now()
  `;
  return true;
}

/** Hapus tanda tangan satu guru. */
export async function deleteSignature(guruId) {
  const sql = await getSql();
  if (!sql) return null;
  await sql`DELETE FROM guru_ttd WHERE tenant = ${TENANT} AND guru_id = ${guruId}`;
  return true;
}

// =========================================================================
// Mutasi per entitas
//
// Tiap fungsi menulis baris yang bersangkutan saja. Inilah yang membedakan
// skema ini dari penyimpanan lama: dua orang yang mengisi nilai kelas
// berbeda tidak lagi saling menimpa, karena tidak ada lagi dokumen tunggal
// yang ditulis ulang setiap kali.
//
// Pemeriksaan wewenang (peran admin) dan mode arsip dikerjakan di lapisan
// API, bukan di sini. Kunci kelas diperiksa di sini karena butuh membaca
// database, dan aturannya harus berlaku untuk semua pemanggil.
// =========================================================================

/** Apakah input kelas ini terkunci untuk periode tersebut? */
export async function isKelasLocked(taId, kelasId, periode) {
  const sql = await getSql();
  if (!sql) return false;
  const rows = await sql`
    SELECT locked FROM kelas_lock
    WHERE ta_id = ${taId} AND kelas_id = ${kelasId} AND periode = ${periode}
  `;
  return rows[0]?.locked === true;
}

/** Kelas tempat seorang santri terdaftar. */
export async function kelasSantri(taId, santriId) {
  const sql = await getSql();
  if (!sql) return null;
  const rows = await sql`SELECT kelas_id FROM santri WHERE ta_id = ${taId} AND id = ${santriId}`;
  return rows[0]?.kelas_id ?? null;
}

/** Kelas dan periode sebuah ujian. */
export async function ujianKelasPeriode(taId, ujianId) {
  const sql = await getSql();
  if (!sql) return null;
  const rows = await sql`SELECT kelas_id, periode FROM ujian WHERE ta_id = ${taId} AND id = ${ujianId}`;
  return rows[0] ? { kelasId: rows[0].kelas_id, periode: rows[0].periode } : null;
}

// ── Nilai ujian ──────────────────────────────────────────────────────────

/** Simpan satu nilai. `nilai` null/kosong berarti mengosongkan isian. */
export async function setNilai(taId, ujianId, santriId, nilai) {
  const sql = await getSql();
  if (!sql) return;
  if (nilai == null || nilai === "") {
    await sql`DELETE FROM nilai WHERE ta_id = ${taId} AND ujian_id = ${ujianId} AND santri_id = ${santriId}`;
    return;
  }
  await sql`
    INSERT INTO nilai (ta_id, ujian_id, santri_id, nilai, updated_at)
    VALUES (${taId}, ${ujianId}, ${santriId}, ${String(nilai)}, now())
    ON CONFLICT (ta_id, ujian_id, santri_id) DO UPDATE
      SET nilai = EXCLUDED.nilai, updated_at = now()
  `;
}

// ── Karakter ─────────────────────────────────────────────────────────────

export async function setKarakter(taId, santriId, periode, field, nilai) {
  const sql = await getSql();
  if (!sql) return;
  if (nilai == null || nilai === "") {
    await sql`
      DELETE FROM karakter
      WHERE ta_id = ${taId} AND santri_id = ${santriId} AND periode = ${periode} AND field = ${field}
    `;
    return;
  }
  await sql`
    INSERT INTO karakter (ta_id, santri_id, periode, field, nilai, updated_at)
    VALUES (${taId}, ${santriId}, ${periode}, ${field}, ${String(nilai)}, now())
    ON CONFLICT (ta_id, santri_id, periode, field) DO UPDATE
      SET nilai = EXCLUDED.nilai, updated_at = now()
  `;
}

// ── Kenaikan ─────────────────────────────────────────────────────────────

export async function setKenaikanStatus(taId, santriId, status) {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    INSERT INTO kenaikan (ta_id, santri_id, status, updated_at)
    VALUES (${taId}, ${santriId}, ${status ?? null}, now())
    ON CONFLICT (ta_id, santri_id) DO UPDATE
      SET status = EXCLUDED.status, updated_at = now()
  `;
}

export async function setKenaikanTargetKelas(taId, santriId, target) {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    INSERT INTO kenaikan (ta_id, santri_id, target_kelas_id, updated_at)
    VALUES (${taId}, ${santriId}, ${target ?? null}, now())
    ON CONFLICT (ta_id, santri_id) DO UPDATE
      SET target_kelas_id = EXCLUDED.target_kelas_id, updated_at = now()
  `;
}

export async function hapusSemuaKenaikan(taId) {
  const sql = await getSql();
  if (!sql) return;
  await sql`DELETE FROM kenaikan WHERE ta_id = ${taId}`;
}

// ── Kunci kelas ──────────────────────────────────────────────────────────

export async function setLock(taId, kelasId, periode, locked) {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    INSERT INTO kelas_lock (ta_id, kelas_id, periode, locked, updated_at)
    VALUES (${taId}, ${kelasId}, ${periode}, ${locked === true}, now())
    ON CONFLICT (ta_id, kelas_id, periode) DO UPDATE
      SET locked = EXCLUDED.locked, updated_at = now()
  `;
}

// ── Santri ───────────────────────────────────────────────────────────────

export async function tambahSantri(taId, s) {
  const sql = await getSql();
  if (!sql) return;
  // Santri baru muncul di paling atas daftar; urutan negatif menjaga posisi
  // itu tanpa perlu menomori ulang seluruh baris.
  const rows = await sql`SELECT coalesce(min(urutan), 0) - 1 AS u FROM santri WHERE ta_id = ${taId}`;
  await sql`
    INSERT INTO santri (ta_id, id, kelas_id, nama, gender, lahir, wali_santri, status, color, urutan)
    VALUES (${taId}, ${s.id}, ${s.kelasId || null}, ${s.nama ?? ""}, ${s.gender ?? ""},
            ${s.lahir ?? ""}, ${s.waliSantri ?? ""}, ${s.status ?? "Aktif"},
            ${s.color ?? "#0d9488"}, ${rows[0].u})
  `;
}

const KOLOM_SANTRI = {
  kelasId: "kelas_id", nama: "nama", gender: "gender", lahir: "lahir",
  waliSantri: "wali_santri", status: "status", color: "color",
};

export async function ubahSantri(taId, id, patch) {
  await ubahBaris("santri", KOLOM_SANTRI, taId, id, patch);
}

export async function hapusSantri(taId, id) {
  const sql = await getSql();
  if (!sql) return;
  await sql`DELETE FROM santri WHERE ta_id = ${taId} AND id = ${id}`;
}

// ── Kelas ────────────────────────────────────────────────────────────────

export async function tambahKelas(taId, k) {
  const sql = await getSql();
  if (!sql) return;
  const rows = await sql`SELECT coalesce(max(urutan), -1) + 1 AS u FROM kelas WHERE ta_id = ${taId}`;
  await sql`
    INSERT INTO kelas (ta_id, id, lembaga, nomor, label, wali_guru_id, wali_teks, urutan)
    VALUES (${taId}, ${k.id}, ${k.lembaga ?? ""}, ${Number(k.nomor) || 0}, ${k.label ?? ""},
            ${k.waliGuruId || null}, ${k.wali ?? ""}, ${rows[0].u})
  `;
}

const KOLOM_KELAS = {
  lembaga: "lembaga", nomor: "nomor", label: "label",
  waliGuruId: "wali_guru_id", wali: "wali_teks",
};

export async function ubahKelas(taId, id, patch) {
  await ubahBaris("kelas", KOLOM_KELAS, taId, id, patch);
}

export async function hapusKelas(taId, id) {
  const sql = await getSql();
  if (!sql) return;
  await sql`DELETE FROM kelas WHERE ta_id = ${taId} AND id = ${id}`;
}

// ── Ujian ────────────────────────────────────────────────────────────────

export async function tambahUjian(taId, u) {
  const sql = await getSql();
  if (!sql) return;
  const rows = await sql`SELECT coalesce(max(urutan), -1) + 1 AS u FROM ujian WHERE ta_id = ${taId}`;
  await sql`
    INSERT INTO ujian (ta_id, id, kelas_id, periode, nama, tipe, urutan)
    VALUES (${taId}, ${u.id}, ${u.kelasId}, ${u.periode}, ${u.nama ?? ""},
            ${u.tipe ?? "Tertulis"}, ${rows[0].u})
  `;
}

const KOLOM_UJIAN = { kelasId: "kelas_id", periode: "periode", nama: "nama", tipe: "tipe" };

export async function ubahUjian(taId, id, patch) {
  await ubahBaris("ujian", KOLOM_UJIAN, taId, id, patch);
}

export async function hapusUjian(taId, id) {
  const sql = await getSql();
  if (!sql) return;
  await sql`DELETE FROM ujian WHERE ta_id = ${taId} AND id = ${id}`;
}

/**
 * Menyusun ulang urutan sekelompok ujian (satu kelas, satu periode).
 *
 * Nilai `urutan` yang dipakai adalah nilai-nilai yang SUDAH dimiliki kelompok
 * itu, hanya dibagikan ulang mengikuti urutan `ids`. Dengan begitu posisi
 * kelompok terhadap ujian kelas lain tidak ikut bergeser — daftar global tetap
 * diurutkan `ORDER BY ta_id, urutan` seperti sebelumnya.
 */
export async function urutkanUjian(taId, kelasId, periode, ids) {
  const sql = await getSql();
  if (!sql) return;
  const rows = await sql`
    SELECT id, urutan FROM ujian
    WHERE ta_id = ${taId} AND kelas_id = ${kelasId} AND periode = ${periode}
    ORDER BY urutan
  `;
  const milik = new Set(rows.map((r) => r.id));
  // Abaikan id asing, dan pertahankan yang tidak disebut di ekor daftar.
  const baru = ids.filter((id) => milik.has(id));
  for (const r of rows) if (!baru.includes(r.id)) baru.push(r.id);
  const slot = rows.map((r) => r.urutan);
  for (let i = 0; i < baru.length; i++) {
    await sql`UPDATE ujian SET urutan = ${slot[i]} WHERE ta_id = ${taId} AND id = ${baru[i]}`;
  }
}

// ── Guru ─────────────────────────────────────────────────────────────────

export async function tambahGuru(g) {
  const sql = await getSql();
  if (!sql) return;
  const rows = await sql`SELECT coalesce(max(urutan), -1) + 1 AS u FROM guru`;
  await sql`
    INSERT INTO guru (id, nama, color, ttd_x, ttd_y, ttd_scale, urutan)
    VALUES (${g.id}, ${g.nama ?? ""}, ${g.color ?? "#0d9488"},
            ${Number(g.ttd?.x) || 0}, ${Number(g.ttd?.y) || 0},
            ${Number(g.ttd?.scale) || 100}, ${rows[0].u})
  `;
}

/**
 * Ubah data guru. Bila namanya berganti, nama wali kelas ikut diperbarui —
 * tapi HANYA pada tahun ajaran aktif. Raport tahun lalu tetap mencantumkan
 * nama sebagaimana tercetak waktu itu.
 */
export async function ubahGuru(taId, id, patch) {
  const sql = await getSql();
  if (!sql) return;
  const set = [];
  const params = [];
  if (patch.nama !== undefined)  { set.push(`nama = $${params.push(patch.nama)}`); }
  if (patch.color !== undefined) { set.push(`color = $${params.push(patch.color)}`); }
  if (patch.ttd !== undefined) {
    set.push(`ttd_x = $${params.push(Number(patch.ttd?.x) || 0)}`);
    set.push(`ttd_y = $${params.push(Number(patch.ttd?.y) || 0)}`);
    set.push(`ttd_scale = $${params.push(Number(patch.ttd?.scale) || 100)}`);
  }
  if (set.length === 0) return;
  await sql.query(`UPDATE guru SET ${set.join()} WHERE id = $${params.push(id)}`, params);

  if (patch.nama !== undefined) {
    await sql`UPDATE kelas SET wali_teks = ${patch.nama}
               WHERE ta_id = ${taId} AND wali_guru_id = ${id}`;
  }
}

/**
 * Hapus guru. Tautan wali kelas dilepas hanya pada T.A. aktif — arsip tetap
 * utuh. Nama walinya dibiarkan sebagai teks supaya raport yang sudah dicetak
 * tetap masuk akal.
 */
export async function hapusGuru(taId, id) {
  const sql = await getSql();
  if (!sql) return;
  await sql`UPDATE kelas SET wali_guru_id = NULL WHERE ta_id = ${taId} AND wali_guru_id = ${id}`;
  await sql`UPDATE pimpinan SET guru_id = NULL WHERE ta_id = ${taId} AND guru_id = ${id}`;
  await sql`DELETE FROM guru WHERE id = ${id}`;
}

// ── Jalur nilai lama (mapel per lembaga) ─────────────────────────────────

/** Simpan satu nilai mapel jalur lama. `field` berupa 'p' (praktik) atau 't'. */
export async function setNilaiMapel(taId, santriId, mapelId, periode, field, nilai) {
  const sql = await getSql();
  if (!sql) return;
  if (field !== "p" && field !== "t") throw new Error("field harus 'p' atau 't'");
  const angka = nilai === "" || nilai == null ? null : Number(nilai);
  // Kolomnya ditulis eksplisit per cabang, bukan disisipkan sebagai string,
  // supaya nama kolom tidak pernah datang dari luar.
  if (field === "p") {
    await sql`
      INSERT INTO nilai_mapel (ta_id, santri_id, mapel_id, periode, p, updated_at)
      VALUES (${taId}, ${santriId}, ${mapelId}, ${periode}, ${angka}, now())
      ON CONFLICT (ta_id, santri_id, mapel_id, periode) DO UPDATE
        SET p = EXCLUDED.p, updated_at = now()
    `;
  } else {
    await sql`
      INSERT INTO nilai_mapel (ta_id, santri_id, mapel_id, periode, t, updated_at)
      VALUES (${taId}, ${santriId}, ${mapelId}, ${periode}, ${angka}, now())
      ON CONFLICT (ta_id, santri_id, mapel_id, periode) DO UPDATE
        SET t = EXCLUDED.t, updated_at = now()
    `;
  }
}

// ── Pengguna ─────────────────────────────────────────────────────────────

export async function tambahUser(u) {
  const sql = await getSql();
  if (!sql) return;
  const rows = await sql`SELECT coalesce(max(urutan), -1) + 1 AS u FROM app_user`;
  await sql`
    INSERT INTO app_user (id, username, nama, role, status, password_hash, color, email, dibuat, urutan)
    VALUES (${u.id}, ${u.username}, ${u.nama ?? ""}, ${u.role ?? "operator"},
            ${u.status ?? "Aktif"}, ${u.passwordHash ?? null}, ${u.color ?? "#0d9488"},
            ${u.email ?? ""}, ${u.dibuat ?? ""}, ${rows[0].u})
  `;
}

const KOLOM_USER = {
  username: "username", nama: "nama", role: "role", status: "status",
  passwordHash: "password_hash", color: "color", email: "email", dibuat: "dibuat",
};

export async function ubahUser(id, patch) {
  const sql = await getSql();
  if (!sql) return;
  const set = [];
  const params = [];
  for (const [kunci, kolom] of Object.entries(KOLOM_USER)) {
    if (patch[kunci] !== undefined) set.push(`${kolom} = $${params.push(patch[kunci])}`);
  }
  if (set.length === 0) return;
  await sql.query(`UPDATE app_user SET ${set.join()} WHERE id = $${params.push(id)}`, params);
}

export async function hapusUser(id) {
  const sql = await getSql();
  if (!sql) return;
  await sql`DELETE FROM app_user WHERE id = ${id}`;
}

// ── Pimpinan ─────────────────────────────────────────────────────────────

export async function setPimpinanGuru(taId, lembaga, guruId) {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    INSERT INTO pimpinan (ta_id, lembaga, guru_id)
    VALUES (${taId}, ${lembaga}, ${guruId || null})
    ON CONFLICT (ta_id, lembaga) DO UPDATE SET guru_id = EXCLUDED.guru_id
  `;
}

// ── Pembantu ─────────────────────────────────────────────────────────────

/**
 * UPDATE sebagian kolom pada tabel ber-kunci (ta_id, id).
 * `peta` menerjemahkan nama field antarmuka jadi nama kolom database, dan
 * sekaligus membatasi kolom apa saja yang boleh disentuh dari luar.
 */
async function ubahBaris(tabel, peta, taId, id, patch) {
  const sql = await getSql();
  if (!sql) return;
  const set = [];
  const params = [];
  for (const [kunci, kolom] of Object.entries(peta)) {
    if (patch[kunci] === undefined) continue;
    const nilai = kolom.endsWith("_id") ? (patch[kunci] || null) : patch[kunci];
    set.push(`${kolom} = $${params.push(nilai)}`);
  }
  if (set.length === 0) return;
  const pTa = params.push(taId);
  const pId = params.push(id);
  await sql.query(`UPDATE ${tabel} SET ${set.join()} WHERE ta_id = $${pTa} AND id = $${pId}`, params);
}

// ── Tahun ajaran ─────────────────────────────────────────────────────────

/**
 * Id tahun ajaran diturunkan dari labelnya ('2026/2027' → 'ta-2026-2027').
 * Id melekat selamanya, termasuk setelah diarsipkan, jadi ia menyebut
 * tahunnya — bukan statusnya.
 */
function idTa(label) {
  const bersih = String(label).trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `ta-${bersih || Date.now()}`;
}

/**
 * Tutup tahun ajaran berjalan dan buka yang baru.
 *
 * Berbeda dengan penyimpanan lama yang menyalin seluruh santri, kelas, dan
 * nilai ke dalam dokumen arsip, di sini data lama TIDAK dipindah ke mana
 * pun: barisnya cukup ditandai milik T.A. yang sudah tidak aktif. Yang
 * disalin hanya daftar kelas dan santri ke T.A. baru, karena keduanya
 * memang berlanjut; ujian, nilai, karakter, kenaikan, dan kunci mulai dari
 * kosong.
 *
 * Nama dan kalibrasi tanda tangan pemimpin dibekukan ke baris pimpinan T.A.
 * lama, berikut salinan gambarnya, supaya raport lama tetap benar walau
 * gurunya kelak berubah atau dihapus.
 */
export async function arsipkanTa(newLabel, pimpinanBaru = null) {
  const sql = await getSql();
  if (!sql) return null;

  const lama = await activeTaId();
  if (!lama) throw new Error("Tidak ada tahun ajaran aktif.");

  const baru = idTa(newLabel);
  const bentrok = await sql`SELECT 1 FROM tahun_ajaran WHERE id = ${baru}`;
  const idBaru = bentrok.length ? `${baru}-${Date.now()}` : baru;

  // 1. Bekukan identitas pemimpin T.A. lama dari data guru yang ditunjuk.
  await sql`
    UPDATE pimpinan p
       SET nama_beku = g.nama, ttd_x = g.ttd_x, ttd_y = g.ttd_y, ttd_scale = g.ttd_scale
      FROM guru g
     WHERE p.ta_id = ${lama} AND p.guru_id = g.id
  `;
  // Gambarnya ikut dibekukan ke kunci milik arsip.
  await sql`
    INSERT INTO guru_ttd (tenant, guru_id, image, updated_at)
    SELECT ${TENANT}, 'pimpinan:' || p.ta_id || ':' || p.lembaga, t.image, now()
      FROM pimpinan p
      JOIN guru_ttd t ON t.tenant = ${TENANT} AND t.guru_id = p.guru_id
     WHERE p.ta_id = ${lama}
    ON CONFLICT (tenant, guru_id) DO UPDATE
      SET image = EXCLUDED.image, updated_at = now()
  `;

  // 2. Tutup yang lama sebelum membuka yang baru — hanya satu boleh aktif.
  await sql`UPDATE tahun_ajaran SET aktif = false, archived_at = current_date WHERE id = ${lama}`;
  await sql`
    INSERT INTO tahun_ajaran (id, label, aktif, urutan)
    VALUES (${idBaru}, ${newLabel}, true,
            (SELECT coalesce(max(urutan), -1) + 1 FROM tahun_ajaran))
  `;

  // 3. Kelas dan santri berlanjut ke T.A. baru; sisanya mulai dari kosong.
  await sql`
    INSERT INTO kelas (ta_id, id, lembaga, nomor, label, wali_guru_id, wali_teks, urutan)
    SELECT ${idBaru}, id, lembaga, nomor, label, wali_guru_id, wali_teks, urutan
      FROM kelas WHERE ta_id = ${lama}
  `;
  await sql`
    INSERT INTO santri (ta_id, id, kelas_id, nama, gender, lahir, wali_santri, status, color, urutan)
    SELECT ${idBaru}, id, kelas_id, nama, gender, lahir, wali_santri, status, color, urutan
      FROM santri WHERE ta_id = ${lama}
  `;

  // 4. Pemimpin T.A. baru: pilihan baru bila diberikan, kalau tidak diteruskan.
  if (pimpinanBaru && typeof pimpinanBaru === "object") {
    for (const [lembaga, p] of Object.entries(pimpinanBaru)) {
      await sql`
        INSERT INTO pimpinan (ta_id, lembaga, guru_id)
        VALUES (${idBaru}, ${lembaga}, ${p?.guruId || null})
        ON CONFLICT (ta_id, lembaga) DO UPDATE SET guru_id = EXCLUDED.guru_id
      `;
    }
  } else {
    await sql`
      INSERT INTO pimpinan (ta_id, lembaga, guru_id)
      SELECT ${idBaru}, lembaga, guru_id FROM pimpinan WHERE ta_id = ${lama}
    `;
  }

  return { taLama: lama, taBaru: idBaru };
}

/**
 * Daftar pengguna untuk keperluan login (lib/auth-users.js).
 *
 * Dipisah dari assembleState() supaya proses login tidak perlu membaca
 * seluruh isi database hanya untuk mencocokkan satu username.
 */
export async function listUsers() {
  const sql = await getSql();
  if (!sql) return [];
  const rows = await sql`SELECT * FROM app_user ORDER BY urutan, id`;
  return rows.map((u) => ({
    id: u.id,
    nama: u.nama,
    username: u.username,
    role: u.role,
    status: u.status,
    color: u.color,
    email: u.email,
    dibuat: u.dibuat,
    passwordHash: u.password_hash ?? undefined,
  }));
}
