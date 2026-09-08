// Konstanta dan fungsi bantu yang dipakai bersama antarmuka.
//
// Seluruh DATA aplikasi kini tinggal di database (lihat lib/schema.sql).
// Berkas ini hanya memuat hal-hal yang memang tidak berubah-ubah — daftar
// peran, nilai bawaan, dan perhitungan murni — jadi tidak ada lagi data
// contoh yang bisa tertukar dengan data sungguhan.

export function getInitials(nama) {
  return nama.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function calcRata(gradeEntry) {
  if (!gradeEntry) return null;
  return Math.round((gradeEntry.p + gradeEntry.t) / 2 * 10) / 10;
}

export function calcNilaiAkhir(studentGrades, mapelList, periode) {
  if (!studentGrades) return null;
  const ratas = mapelList.map(m => {
    const entry = studentGrades[m.id]?.[periode];
    return entry ? (entry.p + entry.t) / 2 : null;
  }).filter(v => v !== null);
  if (ratas.length === 0) return null;
  return Math.round(ratas.reduce((a, b) => a + b, 0) / ratas.length * 10) / 10;
}

export function getPredikat(nilai) {
  if (nilai === null) return null;
  if (nilai >= 90) return { label: 'Mumtāz', cls: 'p-mumtaz' };
  if (nilai >= 80) return { label: 'Jayyid Jiddan', cls: 'p-jayyidj' };
  if (nilai >= 70) return { label: 'Jayyid', cls: 'p-jayyid' };
  if (nilai >= 60) return { label: 'Maqbūl', cls: 'p-maqbul' };
  return { label: 'Rāsib', cls: 'p-rasib' };
}

export const ROLES = [
  { id: 'admin',    label: 'Admin',    desc: 'Akses penuh, termasuk kelola pengguna & tahun ajaran' },
  { id: 'operator', label: 'Operator', desc: 'Kelola santri, kelas, input nilai, dan cetak raport' },
];

const ROLE_IDS = ROLES.map(r => r.id);

/**
 * Samakan peran ke daftar yang berlaku sekarang.
 * Data lama sempat memakai peran 'wali-kelas' dan 'ustadz'; keduanya
 * dipetakan ke 'operator' supaya data tersimpan tetap terbaca.
 */
export function normalizeUsers(list) {
  if (!Array.isArray(list)) return [];
  return list.map(u => {
    const { kelasId, ...rest } = u;
    return { ...rest, role: ROLE_IDS.includes(u.role) ? u.role : 'operator' };
  });
}

export const TTD_DEFAULT = { x: 0, y: 0, scale: 100 };

const GURU_COLORS = ['#0d9488','#7c3aed','#2563eb','#16a34a','#d4a056','#dc2626','#0891b2','#9333ea'];

export function normalizeGurus(list) {
  if (!Array.isArray(list)) return [];
  return list.map((g, i) => {
    const { kelasIds, ...rest } = g; // kelasIds lama tidak dipakai lagi
    return {
    ...rest,
    color: g.color ?? GURU_COLORS[i % GURU_COLORS.length],
    ttd: { ...TTD_DEFAULT, ...(g.ttd ?? {}) },
    };
  });
}

/**
 * Cari guru yang bertanda tangan sebagai wali kelas.
 * Prioritas: penetapan eksplisit lewat `kelasIds`; bila belum ada,
 * dicocokkan dengan nama wali kelas yang tertulis pada data kelas.
 */
export function findWaliKelasGuru(gurus, kelas) {
  if (!kelas) return null;
  if (kelas.waliGuruId) {
    const byId = gurus.find(g => g.id === kelas.waliGuruId);
    if (byId) return byId;
  }
  // Kelas yang wali kelasnya baru ditulis sebagai teks tetap bisa dikenali.
  const nama = (kelas.wali ?? '').trim().toLowerCase();
  if (!nama) return null;
  return gurus.find(g => g.nama.trim().toLowerCase() === nama) ?? null;
}

/**
 * Pindahkan penetapan wali kelas model lama (guru.kelasIds) ke data kelas.
 * Dipakai sekali saat memuat data yang tersimpan sebelum perubahan ini.
 */
export function migrateWaliKelas(kelasList, guruList) {
  if (!Array.isArray(kelasList) || !Array.isArray(guruList)) return kelasList;
  const perluMigrasi = guruList.some(g => Array.isArray(g.kelasIds) && g.kelasIds.length);
  if (!perluMigrasi) return kelasList;
  return kelasList.map(k => {
    if (k.waliGuruId) return k;
    const guru = guruList.find(g => g.kelasIds?.includes(k.id));
    return guru ? { ...k, waliGuruId: guru.id, wali: guru.nama } : k;
  });
}

export const LEMBAGA_LIST = ['TPQ', 'Madin'];

/**
 * Pemimpin lembaga ditentukan dengan menunjuk seorang guru (`guruId`).
 * Nama, gambar tanda tangan, dan kalibrasinya selalu mengikuti data guru
 * tersebut — tidak ada isian terpisah yang harus diketik ulang.
 *
 * `nama` dan `ttd` di sini hanya terisi pada arsip tahun ajaran, yang
 * membekukan keadaan pemimpin saat T.A. ditutup.
 */
export const PIMPINAN_DEFAULT = {
  TPQ:   { guruId: '' },
  Madin: { guruId: '' },
};

/**
 * Garis isian untuk nama yang belum ditetapkan pada raport — dibiarkan
 * kosong bertitik supaya bisa ditulis tangan setelah dicetak.
 */
export const GARIS_ISIAN = '...............................';

/** Nama untuk dicetak; bila belum diisi, diganti garis titik-titik. */
export function namaCetak(nama) {
  return (nama ?? '').trim() || GARIS_ISIAN;
}

/** Kunci gambar tanda tangan pemimpin. `taId` null = tahun ajaran aktif. */
export function pimpinanTtdKey(lembaga, taId = null) {
  return taId ? `pimpinan:${taId}:${lembaga}` : `pimpinan:${lembaga}`;
}

/** Lengkapi data pemimpin dari database agar bentuknya selalu utuh. */
export function normalizePimpinan(raw) {
  const src = raw ?? {};
  return Object.fromEntries(LEMBAGA_LIST.map(l => {
    const p = src[l] ?? {};
    return [l, {
      guruId: p.guruId ?? '',
      // Hanya bermakna pada arsip; T.A. aktif membacanya dari data guru.
      nama: p.nama ?? '',
      ttd: { ...TTD_DEFAULT, ...(p.ttd ?? {}) },
    }];
  }));
}
