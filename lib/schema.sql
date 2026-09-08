-- ==========================================================================
-- Skema ternormalisasi raport online.
--
-- Menggantikan penyimpanan lama yang menaruh seluruh state aplikasi sebagai
-- satu dokumen JSONB di tabel `app_state`. Tabel lama sengaja TIDAK di-drop
-- di sini — ia jadi jalan mundur sampai jalur baru terbukti stabil.
--
-- ── Catatan desain ───────────────────────────────────────────────────────
--
-- 1. Id tetap TEXT dan memakai nilai yang sudah dipakai aplikasi ('tpq-1',
--    '001', 'g-010', 'u-007'), supaya tidak ada referensi yang perlu
--    dipetakan ulang saat migrasi.
--
-- 2. Tahun ajaran adalah KOLOM, bukan salinan dokumen. Sebelumnya
--    archiveCurrentTa menyalin seluruh santri, kelas, ujian, dan nilai ke
--    dalam array `history`; di sini cukup menandai barisnya tidak aktif.
--
-- 3. Kelas, santri, dan ujian ber-primary key GABUNGAN (ta_id, id) — bukan
--    id saja. Ini penting: id yang sama dipakai lintas tahun ajaran, tapi
--    isinya berbeda. 'tpq-1' tahun lalu punya wali dan daftar santri sendiri
--    yang harus tetap utuh saat raport lama dicetak ulang. Karena itu pula
--    foreign key yang menunjuk ketiganya ikut membawa `ta_id`, sehingga
--    database sendiri yang menjamin nilai tidak pernah nyasar ke santri
--    tahun ajaran lain.
--
-- 4. Kolom `urutan` mempertahankan urutan array pada state lama. Antarmuka
--    menampilkan daftar sesuai urutan itu, jadi tanpa kolom ini tampilan
--    bisa berubah walau datanya sama.
-- ==========================================================================

-- ── Tahun ajaran ─────────────────────────────────────────────────────────
-- Tepat satu baris boleh aktif; dijaga indeks unik parsial di bawah.
CREATE TABLE IF NOT EXISTS tahun_ajaran (
  id          TEXT PRIMARY KEY,
  label       TEXT        NOT NULL,
  aktif       BOOLEAN     NOT NULL DEFAULT false,
  archived_at DATE,
  urutan      INTEGER     NOT NULL DEFAULT 0,
  dibuat_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tahun_ajaran_satu_aktif
  ON tahun_ajaran ((aktif)) WHERE aktif;

-- ── Guru ─────────────────────────────────────────────────────────────────
-- Guru berlaku lintas tahun ajaran, jadi tidak ber-`ta_id`.
-- `ttd_*` menyimpan kalibrasi POSISI tanda tangan, bukan gambarnya. Gambar
-- tetap di tabel `guru_ttd` yang sudah ada — ukurannya besar dan jarang
-- berubah, jadi tidak ikut terbaca setiap kali state dimuat.
CREATE TABLE IF NOT EXISTS guru (
  id        TEXT PRIMARY KEY,
  nama      TEXT NOT NULL,
  color     TEXT NOT NULL DEFAULT '#0d9488',
  ttd_x     INTEGER NOT NULL DEFAULT 0,
  ttd_y     INTEGER NOT NULL DEFAULT 0,
  ttd_scale INTEGER NOT NULL DEFAULT 100,
  urutan    INTEGER NOT NULL DEFAULT 0
);

-- Gambar tanda tangan memakai tabel yang sudah ada, bentuknya tidak diubah
-- supaya /api/signature tetap bekerja apa adanya:
--   guru_ttd (tenant, guru_id, image, updated_at)
-- Kolom `guru_id` di sana juga menampung kunci sintetis tanda tangan
-- pimpinan arsip ('pimpinan:<taId>:<lembaga>'), jadi ia sengaja TIDAK
-- diberi foreign key ke tabel guru.

-- ── Pengguna aplikasi ────────────────────────────────────────────────────
-- Dinamai `app_user` karena `user` kata kunci SQL. Berlaku lintas T.A.
CREATE TABLE IF NOT EXISTS app_user (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL,
  nama          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  status        TEXT NOT NULL DEFAULT 'Aktif',
  password_hash TEXT,
  color         TEXT NOT NULL DEFAULT '#0d9488',
  email         TEXT NOT NULL DEFAULT '',
  dibuat        TEXT NOT NULL DEFAULT '',
  urutan        INTEGER NOT NULL DEFAULT 0
);

-- Username dibandingkan tanpa memperhatikan besar-kecil huruf saat login
-- (lib/auth-users.js findByUsername), jadi keunikannya pun harus begitu.
CREATE UNIQUE INDEX IF NOT EXISTS app_user_username_unik
  ON app_user (lower(username));

-- ── Kelas ────────────────────────────────────────────────────────────────
-- `wali_teks` dipertahankan karena wali kelas boleh ditulis sebagai nama
-- lepas tanpa menunjuk guru yang tercatat (lihat findWaliKelasGuru).
CREATE TABLE IF NOT EXISTS kelas (
  ta_id        TEXT NOT NULL REFERENCES tahun_ajaran(id) ON DELETE CASCADE,
  id           TEXT NOT NULL,
  lembaga      TEXT NOT NULL,
  nomor        INTEGER NOT NULL DEFAULT 0,
  label        TEXT NOT NULL,
  -- Sengaja TANPA foreign key ke guru. Dengan ON DELETE SET NULL, menghapus
  -- seorang guru hari ini akan ikut memutus tautan wali kelas pada tahun
  -- ajaran yang sudah diarsipkan — dan arsip harus kebal terhadap perubahan
  -- sekarang. Pelepasan tautan dikerjakan aplikasi, dan hanya untuk T.A.
  -- yang sedang aktif (lihat hapusGuru di lib/db.js).
  wali_guru_id TEXT,
  wali_teks    TEXT NOT NULL DEFAULT '',
  urutan       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ta_id, id)
);

-- ── Santri ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS santri (
  ta_id       TEXT NOT NULL REFERENCES tahun_ajaran(id) ON DELETE CASCADE,
  id          TEXT NOT NULL,
  kelas_id    TEXT,
  nama        TEXT NOT NULL,
  gender      TEXT NOT NULL DEFAULT '',
  lahir       TEXT NOT NULL DEFAULT '',
  wali_santri TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'Aktif',
  color       TEXT NOT NULL DEFAULT '#0d9488',
  urutan      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ta_id, id),
  FOREIGN KEY (ta_id, kelas_id) REFERENCES kelas(ta_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS santri_kelas ON santri (ta_id, kelas_id);

-- ── Ujian (mata pelajaran yang dinilai, per kelas per periode) ───────────
CREATE TABLE IF NOT EXISTS ujian (
  ta_id    TEXT NOT NULL REFERENCES tahun_ajaran(id) ON DELETE CASCADE,
  id       TEXT NOT NULL,
  kelas_id TEXT NOT NULL,
  periode  TEXT NOT NULL CHECK (periode IN ('UTS', 'UAS')),
  nama     TEXT NOT NULL,
  tipe     TEXT NOT NULL DEFAULT 'Tertulis' CHECK (tipe IN ('Tertulis', 'Praktik', 'Kustom')),
  urutan   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ta_id, id),
  FOREIGN KEY (ta_id, kelas_id) REFERENCES kelas(ta_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ujian_kelas_periode ON ujian (ta_id, kelas_id, periode);

-- ── Nilai ujian ──────────────────────────────────────────────────────────
-- Bertipe TEXT, bukan angka: ujian bertipe 'Kustom' menyimpan catatan bebas
-- (lihat penanganan isKustom di app/input-nilai/page.jsx). Konversi ke angka
-- tetap dikerjakan aplikasi, sama seperti sebelumnya.
CREATE TABLE IF NOT EXISTS nilai (
  ta_id      TEXT NOT NULL,
  ujian_id   TEXT NOT NULL,
  santri_id  TEXT NOT NULL,
  nilai      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ta_id, ujian_id, santri_id),
  FOREIGN KEY (ta_id, ujian_id)  REFERENCES ujian(ta_id, id)  ON DELETE CASCADE,
  FOREIGN KEY (ta_id, santri_id) REFERENCES santri(ta_id, id) ON DELETE CASCADE
);

-- ── Penilaian karakter / akhlak ──────────────────────────────────────────
-- Kolom penilaiannya ditentukan antarmuka dan bisa bertambah, jadi disimpan
-- sebagai pasangan field–nilai, bukan satu kolom per aspek.
CREATE TABLE IF NOT EXISTS karakter (
  ta_id      TEXT NOT NULL,
  santri_id  TEXT NOT NULL,
  periode    TEXT NOT NULL CHECK (periode IN ('UTS', 'UAS')),
  field      TEXT NOT NULL,
  nilai      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ta_id, santri_id, periode, field),
  FOREIGN KEY (ta_id, santri_id) REFERENCES santri(ta_id, id) ON DELETE CASCADE
);

-- ── Kenaikan kelas ───────────────────────────────────────────────────────
-- `target_kelas_id` boleh kosong: selama belum ditentukan manual, aplikasi
-- menghitung tujuan bawaan dari status kenaikan (lihat app/kenaikan).
CREATE TABLE IF NOT EXISTS kenaikan (
  ta_id           TEXT NOT NULL,
  santri_id       TEXT NOT NULL,
  status          TEXT,
  target_kelas_id TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ta_id, santri_id),
  FOREIGN KEY (ta_id, santri_id) REFERENCES santri(ta_id, id) ON DELETE CASCADE
);

-- ── Kunci input per kelas per periode ────────────────────────────────────
CREATE TABLE IF NOT EXISTS kelas_lock (
  ta_id      TEXT NOT NULL,
  kelas_id   TEXT NOT NULL,
  periode    TEXT NOT NULL CHECK (periode IN ('UTS', 'UAS')),
  locked     BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ta_id, kelas_id, periode),
  FOREIGN KEY (ta_id, kelas_id) REFERENCES kelas(ta_id, id) ON DELETE CASCADE
);

-- ── Pimpinan lembaga ─────────────────────────────────────────────────────
-- T.A. aktif membaca nama & kalibrasi langsung dari guru yang ditunjuk.
-- `nama_beku` dan `ttd_*` hanya bermakna pada T.A. yang sudah diarsipkan,
-- supaya raport lama tetap benar walau gurunya kelak berubah atau dihapus.
CREATE TABLE IF NOT EXISTS pimpinan (
  ta_id     TEXT NOT NULL REFERENCES tahun_ajaran(id) ON DELETE CASCADE,
  lembaga   TEXT NOT NULL,
  guru_id   TEXT,  -- tanpa foreign key, alasan sama seperti kelas.wali_guru_id
  nama_beku TEXT NOT NULL DEFAULT '',
  ttd_x     INTEGER NOT NULL DEFAULT 0,
  ttd_y     INTEGER NOT NULL DEFAULT 0,
  ttd_scale INTEGER NOT NULL DEFAULT 100,
  PRIMARY KEY (ta_id, lembaga)
);

-- ── Jalur nilai lama (mapel tetap per lembaga) ───────────────────────────
-- Dipakai halaman /raport, /raport-v2, dan /siswa-kelas. Jalur ini berjalan
-- paralel dengan `ujian`; keduanya sengaja dipertahankan.
CREATE TABLE IF NOT EXISTS mapel (
  id      TEXT NOT NULL,
  lembaga TEXT NOT NULL,
  label   TEXT NOT NULL,
  urutan  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, lembaga)
);

-- `p` = nilai praktik, `t` = nilai tertulis (lihat calcRata di lib/data.js).
CREATE TABLE IF NOT EXISTS nilai_mapel (
  ta_id      TEXT NOT NULL,
  santri_id  TEXT NOT NULL,
  mapel_id   TEXT NOT NULL,
  periode    TEXT NOT NULL CHECK (periode IN ('UTS', 'UAS')),
  p          INTEGER,
  t          INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ta_id, santri_id, mapel_id, periode),
  FOREIGN KEY (ta_id, santri_id) REFERENCES santri(ta_id, id) ON DELETE CASCADE
);

-- ── Tanda tangan (dari penyimpanan lama, bentuknya tidak diubah) ─────────
-- Didefinisikan di sini supaya pemasangan baru tetap lengkap. `guru_id`
-- juga menampung kunci sintetis pimpinan arsip, jadi tanpa foreign key.
CREATE TABLE IF NOT EXISTS guru_ttd (
  tenant     TEXT NOT NULL,
  guru_id    TEXT NOT NULL,
  image      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant, guru_id)
);
