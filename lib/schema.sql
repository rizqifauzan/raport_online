-- Skema database Raport Online (NeonDB / Postgres)
-- Dijalankan oleh scripts/seed.mjs. Aman dijalankan ulang (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kelas (
  id      TEXT PRIMARY KEY,
  nomor   INTEGER,
  label   TEXT,
  wali    TEXT,
  lembaga TEXT
);

CREATE TABLE IF NOT EXISTS students (
  id          TEXT PRIMARY KEY,
  kelas_id    TEXT,
  nama        TEXT,
  gender      TEXT,
  lahir       TEXT,
  wali_santri TEXT,
  status      TEXT,
  color       TEXT
);

CREATE TABLE IF NOT EXISTS ujian (
  id       TEXT PRIMARY KEY,
  kelas_id TEXT,
  nama     TEXT,
  tipe     TEXT,
  periode  TEXT
);

-- State berbentuk map (nilai ujian, karakter, kenaikan, dll) + setting global
-- disimpan sebagai satu baris JSONB tunggal (id = 1).
CREATE TABLE IF NOT EXISTS app_state (
  id   INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT app_state_singleton CHECK (id = 1)
);

-- Arsip tahun ajaran: tiap baris menyimpan snapshot lengkap (read-only).
CREATE TABLE IF NOT EXISTS tahun_ajaran (
  id          TEXT PRIMARY KEY,
  label       TEXT,
  archived_at TEXT,
  snapshot    JSONB NOT NULL
);
