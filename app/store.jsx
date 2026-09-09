'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { normalizeUsers, normalizeGurus, migrateWaliKelas, normalizePimpinan,
  periodeAwal, pimpinanTtdKey, PIMPINAN_DEFAULT, TTD_DEFAULT } from '../lib/data';

const Store = createContext(null);

// Jeda sebelum isian yang diketik beruntun dikirim ke server. Hanya dipakai
// untuk kolom nilai — mutasi lain (tambah santri, kunci kelas, dsb.) dikirim
// seketika karena datangnya satu-satu.
const KETIK_DEBOUNCE_MS = 500;

export function StoreProvider({ children }) {
  const [lembaga, setLembaga] = useState('TPQ');
  const [periode, setPeriode] = useState('UAS');

  // Seluruh data berasal dari database. Sebelum hidrasi selesai, isinya
  // kosong — tidak ada lagi data contoh yang bisa tertukar dengan data asli.
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [mapel, setMapel] = useState({});
  const [kelas, setKelas] = useState([]);
  const [ujian, setUjian] = useState([]);
  const [ujianNilai, setUjianNilai] = useState({});
  const [karakter, setKarakter] = useState({});
  const [kenaikan, setKenaikan] = useState({});
  const [kenaikanTarget, setKenaikanTargetState] = useState({});
  const [users, setUsers] = useState([]);
  const [gurus, setGurus] = useState([]);
  const [locks, setLocks] = useState({});
  const [history, setHistory] = useState([]);
  const [currentTaLabel, setCurrentTaLabel] = useState('');
  const [pimpinan, setPimpinanState] = useState(() => normalizePimpinan(PIMPINAN_DEFAULT));

  // { guruId: dataUrl } — dimuat terpisah lewat /api/signature karena besar.
  const [signatures, setSignatures] = useState({});

  const [viewingTaId, setViewingTaId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // 'loading' → hidrasi awal; 'idle' → tersambung; 'saving' → ada mutasi
  // berjalan; 'error' → perubahan terakhir gagal disimpan.
  const [dbStatus, setDbStatus] = useState('loading');
  const [dbError, setDbError] = useState(null);

  const mutasiBerjalan = useRef(0);
  const timerKetik = useRef({});
  // Periode bawaan hanya ditentukan sekali; sesudah itu pilihan pemakai yang
  // berlaku, supaya tab tidak melompat sendiri sementara nilai sedang diisi.
  const periodeSudahDitentukan = useRef(false);

  const snap = viewingTaId ? (history.find(h => h.id === viewingTaId) ?? null) : null;

  /** Pasang seluruh data dari muatan /api/state. */
  function terapkanState(d) {
    setStudents(d.students ?? []);
    setGrades(d.grades ?? {});
    setMapel(d.mapel ?? {});
    // Penetapan wali kelas lama (guru.kelasIds) dipindah ke data kelas
    setKelas(migrateWaliKelas(d.kelas ?? [], d.gurus ?? []));
    setUjian(d.ujian ?? []);
    setUjianNilai(d.ujianNilai ?? {});
    setKarakter(d.karakter ?? {});
    setKenaikan(d.kenaikan ?? {});
    setKenaikanTargetState(d.kenaikanTarget ?? {});
    // normalizeUsers memetakan peran lama (wali-kelas/ustadz) ke 'operator'
    setUsers(normalizeUsers(d.users ?? []));
    setGurus(normalizeGurus(d.gurus ?? []));
    setLocks(d.locks ?? {});
    setHistory(d.history ?? []);
    setCurrentTaLabel(d.currentTaLabel ?? '');
    setPimpinanState(normalizePimpinan(d.pimpinan));
  }

  /** Muat ulang seluruh state dari server. */
  async function muatState() {
    const res = await fetch('/api/state', { cache: 'no-store' });
    const payload = await res.json();
    if (!res.ok || payload.error) {
      throw new Error(payload.error ?? `HTTP ${res.status}`);
    }
    if (payload.data) terapkanState(payload.data);
    return payload;
  }

  // Hidrasi awal.
  useEffect(() => {
    let dibatalkan = false;
    (async () => {
      try {
        const payload = await muatState();
        if (!dibatalkan) {
          if (payload.data && !periodeSudahDitentukan.current) {
            periodeSudahDitentukan.current = true;
            setPeriode(periodeAwal(payload.data));
          }
          setDbStatus('idle');
          setDbError(null);
        }
      } catch (err) {
        console.error('[store] gagal memuat data:', err);
        if (!dibatalkan) {
          setDbStatus('error');
          setDbError('Gagal memuat data dari database.');
        }
      }
    })();
    return () => { dibatalkan = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Siapa yang sedang login. Middleware sudah menjaga akses; ini hanya
  // supaya antarmuka bisa menampilkan nama & peran pemakainya.
  useEffect(() => {
    let dibatalkan = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!res.ok) return;
        const payload = await res.json();
        if (!dibatalkan) setCurrentUser(payload.user ?? null);
      } catch (err) {
        console.error('[store] gagal membaca sesi:', err);
      }
    })();
    return () => { dibatalkan = true; };
  }, []);

  // Gambar tanda tangan dimuat terpisah — besar dan jarang berubah.
  useEffect(() => {
    let dibatalkan = false;
    (async () => {
      try {
        const res = await fetch('/api/signature', { cache: 'no-store' });
        const payload = await res.json();
        if (!dibatalkan && payload.signatures) setSignatures(payload.signatures);
      } catch (err) {
        console.error('[store] gagal memuat tanda tangan:', err);
      }
    })();
    return () => { dibatalkan = true; };
  }, []);

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[store] gagal logout:', err);
    }
    window.location.href = '/login';
  }

  // ── Pengiriman mutasi ───────────────────────────────────────────────────
  //
  // Perubahan langsung tampak di layar (optimistic), lalu dikirim ke server.
  // Bila server menolak, tampilan dikembalikan ke keadaan sebelumnya dan
  // alasannya ditampilkan. Ini menggantikan penyimpanan lama yang mengirim
  // ulang SELURUH dokumen state setiap kali ada perubahan — sumber saling
  // timpa saat beberapa orang mengisi nilai bersamaan.

  /**
   * Kirim satu mutasi. `batalkan` dipanggil bila server menolak, untuk
   * mengembalikan tampilan ke keadaan sebelum perubahan.
   */
  async function kirim(body, batalkan) {
    mutasiBerjalan.current += 1;
    setDbStatus('saving');
    try {
      const res = await fetch('/api/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) throw new Error(payload.error ?? `HTTP ${res.status}`);
      setDbError(null);
      return { ok: true, ...payload };
    } catch (err) {
      console.error(`[store] ${body.entity}.${body.action} gagal:`, err);
      batalkan?.();
      setDbError(err.message || 'Perubahan terakhir gagal disimpan.');
      return { ok: false, error: err.message };
    } finally {
      mutasiBerjalan.current -= 1;
      if (mutasiBerjalan.current === 0) {
        setDbStatus((s) => (s === 'saving' ? 'idle' : s));
      }
    }
  }

  /**
   * Seperti `kirim`, tapi menunda pengiriman selama pemakai masih mengetik
   * di kolom yang sama. Kolom berbeda tidak saling menunda — inilah bedanya
   * dengan debounce global yang lama.
   */
  function kirimTertunda(kunci, body, batalkan) {
    clearTimeout(timerKetik.current[kunci]);
    timerKetik.current[kunci] = setTimeout(() => {
      delete timerKetik.current[kunci];
      kirim(body, batalkan);
    }, KETIK_DEBOUNCE_MS);
  }

  useEffect(() => () => {
    for (const t of Object.values(timerKetik.current)) clearTimeout(t);
  }, []);

  // ── Kunci kelas ─────────────────────────────────────────────────────────

  function isLocked(kelasId, p) {
    return locks[kelasId]?.[p] === true;
  }

  function ubahLock(kelasId, p, locked) {
    const sebelum = locks;
    setLocks(prev => ({ ...prev, [kelasId]: { ...(prev[kelasId] ?? {}), [p]: locked } }));
    kirim({ entity: 'lock', action: 'set', kelasId, periode: p, locked },
      () => setLocks(sebelum));
  }
  const lockKelas   = (kelasId, p) => ubahLock(kelasId, p, true);
  const unlockKelas = (kelasId, p) => ubahLock(kelasId, p, false);

  // ── Santri ──────────────────────────────────────────────────────────────

  function addStudent(student) {
    if (snap) return;
    const sebelum = students;
    setStudents(prev => [student, ...prev]);
    kirim({ entity: 'santri', action: 'create', data: student }, () => setStudents(sebelum));
  }
  function removeStudent(id) {
    if (snap) return;
    const sebelum = students;
    setStudents(prev => prev.filter(s => s.id !== id));
    kirim({ entity: 'santri', action: 'delete', id }, () => setStudents(sebelum));
  }
  function updateStudent(id, patch) {
    if (snap) return;
    const sebelum = students;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    kirim({ entity: 'santri', action: 'update', id, patch }, () => setStudents(sebelum));
  }

  // ── Kelas ───────────────────────────────────────────────────────────────

  function addClass(k) {
    if (snap) return;
    const sebelum = kelas;
    setKelas(prev => [...prev, k]);
    kirim({ entity: 'kelas', action: 'create', data: k }, () => setKelas(sebelum));
  }
  function updateClass(id, patch) {
    if (snap) return;
    const sebelum = kelas;
    setKelas(prev => prev.map(k => k.id === id ? { ...k, ...patch } : k));
    kirim({ entity: 'kelas', action: 'update', id, patch }, () => setKelas(sebelum));
  }
  function removeClass(id) {
    if (snap) return;
    const sebelum = kelas;
    setKelas(prev => prev.filter(k => k.id !== id));
    kirim({ entity: 'kelas', action: 'delete', id }, () => setKelas(sebelum));
  }

  // ── Ujian ───────────────────────────────────────────────────────────────

  function addUjian(u) {
    if (snap) return;
    const sebelum = ujian;
    setUjian(prev => [...prev, u]);
    kirim({ entity: 'ujian', action: 'create', data: u }, () => setUjian(sebelum));
  }
  function removeUjian(id) {
    if (snap) return;
    const sebelum = ujian;
    setUjian(prev => prev.filter(u => u.id !== id));
    kirim({ entity: 'ujian', action: 'delete', id }, () => setUjian(sebelum));
  }
  function updateUjian(id, patch) {
    if (snap) return;
    const sebelum = ujian;
    setUjian(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
    kirim({ entity: 'ujian', action: 'update', id, patch }, () => setUjian(sebelum));
  }

  // ── Nilai ujian — dijaga kunci kelas ────────────────────────────────────

  function setUjianNilaiEntry(ujianId, studentId, nilai) {
    if (snap) return;
    const u = ujian.find(u2 => u2.id === ujianId);
    if (u && isLocked(u.kelasId, u.periode)) return;
    const sebelum = ujianNilai;
    setUjianNilai(prev => ({
      ...prev,
      [ujianId]: { ...(prev[ujianId] ?? {}), [studentId]: nilai },
    }));
    kirimTertunda(`nilai:${ujianId}:${studentId}`,
      { entity: 'nilai', action: 'set', ujianId, santriId: studentId, nilai },
      () => setUjianNilai(sebelum));
  }

  // ── Karakter — dijaga kunci kelas ───────────────────────────────────────

  function updateKarakter(studentId, p, field, value) {
    if (snap) return;
    const s = students.find(s2 => s2.id === studentId);
    if (s && isLocked(s.kelasId, p)) return;
    const sebelum = karakter;
    setKarakter(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] ?? {}),
        [p]: { ...(prev[studentId]?.[p] ?? {}), [field]: value },
      },
    }));
    kirimTertunda(`karakter:${studentId}:${p}:${field}`,
      { entity: 'karakter', action: 'set', santriId: studentId, periode: p, field, nilai: value },
      () => setKarakter(sebelum));
  }

  // ── Nilai mapel (jalur lama) ────────────────────────────────────────────

  function updateGrade(studentId, mapelId, field, value) {
    if (snap) return;
    const sebelum = grades;
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] ?? {}),
        [mapelId]: {
          ...(prev[studentId]?.[mapelId] ?? {}),
          [periode]: {
            ...(prev[studentId]?.[mapelId]?.[periode] ?? {}),
            [field]: value,
          },
        },
      },
    }));
    kirimTertunda(`mapel:${studentId}:${mapelId}:${periode}:${field}`,
      { entity: 'nilaiMapel', action: 'set', santriId: studentId, mapelId, periode, field, nilai: value },
      () => setGrades(sebelum));
  }

  // ── Kenaikan — dijaga kunci kelas (selalu UAS) ──────────────────────────

  function setKenaikanEntry(studentId, status) {
    if (snap) return;
    const s = students.find(s2 => s2.id === studentId);
    if (s && isLocked(s.kelasId, 'UAS')) return;
    const sebelum = kenaikan;
    setKenaikan(prev => ({ ...prev, [studentId]: status }));
    kirim({ entity: 'kenaikan', action: 'status', santriId: studentId, status },
      () => setKenaikan(sebelum));
  }
  function setKenaikanTarget(studentId, val) {
    if (snap) return;
    const s = students.find(s2 => s2.id === studentId);
    if (s && isLocked(s.kelasId, 'UAS')) return;
    const sebelum = kenaikanTarget;
    setKenaikanTargetState(prev => ({ ...prev, [studentId]: val }));
    kirim({ entity: 'kenaikan', action: 'target', santriId: studentId, target: val },
      () => setKenaikanTargetState(sebelum));
  }
  function resetKenaikan() {
    if (snap) return;
    const sebelumStatus = kenaikan;
    const sebelumTarget = kenaikanTarget;
    setKenaikan({});
    setKenaikanTargetState({});
    kirim({ entity: 'kenaikan', action: 'reset' }, () => {
      setKenaikan(sebelumStatus);
      setKenaikanTargetState(sebelumTarget);
    });
  }

  // ── Pengguna — hanya admin (ditegakkan juga di server) ──────────────────

  function addUser(user) {
    const sebelum = users;
    setUsers(prev => [...prev, user]);
    kirim({ entity: 'user', action: 'create', data: user }, () => setUsers(sebelum));
  }
  function updateUser(id, patch) {
    const sebelum = users;
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
    kirim({ entity: 'user', action: 'update', id, patch }, () => setUsers(sebelum));
  }
  function removeUser(id) {
    const sebelum = users;
    setUsers(prev => prev.filter(u => u.id !== id));
    kirim({ entity: 'user', action: 'delete', id }, () => setUsers(sebelum));
  }
  /** Cek username unik; `exceptId` dipakai saat mengedit pengguna yang sama. */
  function isUsernameTaken(username, exceptId = null) {
    const u = username.trim().toLowerCase();
    return users.some(x => x.username.toLowerCase() === u && x.id !== exceptId);
  }

  // ── Guru ────────────────────────────────────────────────────────────────

  function addGuru(guru) {
    const sebelum = gurus;
    setGurus(prev => [...prev, guru]);
    kirim({ entity: 'guru', action: 'create', data: guru }, () => setGurus(sebelum));
  }
  function updateGuru(id, patch) {
    const sebelumGuru = gurus;
    const sebelumKelas = kelas;
    setGurus(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
    // Nama wali kelas mengikuti nama gurunya; server melakukan hal yang sama
    // untuk T.A. aktif saja, supaya arsip tidak ikut berubah.
    if (patch.nama) {
      setKelas(prev => prev.map(k => k.waliGuruId === id ? { ...k, wali: patch.nama } : k));
    }
    kirim({ entity: 'guru', action: 'update', id, patch }, () => {
      setGurus(sebelumGuru);
      setKelas(sebelumKelas);
    });
  }
  async function removeGuru(id) {
    const sebelumGuru = gurus;
    const sebelumKelas = kelas;
    setGurus(prev => prev.filter(g => g.id !== id));
    setKelas(prev => prev.map(k => k.waliGuruId === id ? { ...k, waliGuruId: '' } : k));
    const hasil = await kirim({ entity: 'guru', action: 'delete', id }, () => {
      setGurus(sebelumGuru);
      setKelas(sebelumKelas);
    });
    if (hasil.ok) await removeSignature(id);
  }

  // ── Tanda tangan ────────────────────────────────────────────────────────

  /** Simpan gambar tanda tangan (data URL). Langsung dikirim, tanpa debounce. */
  async function setSignature(guruId, dataUrl) {
    setSignatures(prev => ({ ...prev, [guruId]: dataUrl }));
    try {
      const res = await fetch('/api/signature', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guruId, image: dataUrl }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        return { ok: false, error: payload.error ?? 'Gagal menyimpan tanda tangan.' };
      }
      return { ok: true };
    } catch (err) {
      console.error('[store] gagal menyimpan tanda tangan:', err);
      return { ok: false, error: 'Gagal menghubungi server.' };
    }
  }

  async function removeSignature(guruId) {
    setSignatures(prev => {
      const next = { ...prev };
      delete next[guruId];
      return next;
    });
    try {
      await fetch(`/api/signature?guruId=${encodeURIComponent(guruId)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('[store] gagal menghapus tanda tangan:', err);
    }
  }

  // ── Pemimpin lembaga ────────────────────────────────────────────────────

  /** Tunjuk guru sebagai pemimpin lembaga (string kosong = belum ditentukan). */
  function setPimpinanGuru(namaLembaga, guruId) {
    const sebelum = pimpinan;
    setPimpinanState(prev => ({
      ...prev,
      [namaLembaga]: { ...prev[namaLembaga], guruId: guruId || '' },
    }));
    kirim({ entity: 'pimpinan', action: 'set', lembaga: namaLembaga, guruId: guruId || '' },
      () => setPimpinanState(sebelum));
  }

  /**
   * Data pemimpin siap pakai untuk raport: nama, kalibrasi, dan gambar.
   *
   * T.A. aktif membacanya langsung dari data guru yang ditunjuk, sehingga
   * mengubah tanda tangan atau posisinya di menu Guru langsung ikut terpakai.
   * Arsip memakai salinan yang dibekukan saat T.A. ditutup.
   */
  function getPimpinan(namaLembaga) {
    if (snap) {
      const beku = normalizePimpinan(snap.pimpinan)[namaLembaga];
      return {
        nama: beku.nama,
        ttd: beku.ttd,
        image: signatures[pimpinanTtdKey(namaLembaga, snap.id)] ?? null,
      };
    }
    const guruId = pimpinan[namaLembaga]?.guruId;
    const guru = guruId ? gurus.find(g => g.id === guruId) : null;
    if (!guru) return { nama: '', ttd: { ...TTD_DEFAULT }, image: null };
    return {
      nama: guru.nama,
      ttd: { ...TTD_DEFAULT, ...(guru.ttd ?? {}) },
      image: signatures[guru.id] ?? null,
    };
  }

  // ── Tahun ajaran ────────────────────────────────────────────────────────

  /**
   * Tutup T.A. berjalan dan buka yang baru.
   *
   * Seluruh pekerjaannya dilakukan server dalam satu permintaan: membekukan
   * identitas pemimpin, menandai T.A. lama sebagai arsip, lalu meneruskan
   * daftar kelas dan santri ke T.A. baru. Tidak ada lagi penyalinan data di
   * sisi klien. Sesudahnya state dimuat ulang supaya tampilan mengikuti
   * keadaan sebenarnya di database.
   */
  async function archiveCurrentTa(newTaLabel, pimpinanBaru = null) {
    const hasil = await kirim({
      entity: 'ta', action: 'archive', label: newTaLabel, pimpinan: pimpinanBaru,
    });
    if (!hasil.ok) return hasil;
    try {
      await muatState();
      setPeriode('UTS');
      setViewingTaId(null);
    } catch (err) {
      console.error('[store] gagal memuat ulang setelah arsip:', err);
      setDbStatus('error');
      setDbError('Tahun ajaran tersimpan, tapi gagal memuat ulang data. Muat ulang halaman.');
    }
    return hasil;
  }

  return (
    <Store.Provider value={{
      lembaga, setLembaga,
      periode, setPeriode,

      // Data — snapshot when viewing history
      students:   snap ? snap.students   : students,
      grades,
      mapel,
      kelas:      snap ? snap.kelas      : kelas,
      ujian:      snap ? snap.ujian      : ujian,
      ujianNilai: snap ? snap.ujianNilai : ujianNilai,
      karakter:   snap ? snap.karakter   : karakter,
      kenaikan:       snap ? snap.kenaikan       : kenaikan,
      kenaikanTarget: snap ? (snap.kenaikanTarget ?? {}) : kenaikanTarget,

      // Locks (only current T.A. is lockable; history is always read-only)
      locks,
      lockKelas,
      unlockKelas,
      isLocked,

      // Guru & tanda tangan
      gurus,
      addGuru, updateGuru, removeGuru,
      signatures,
      setSignature, removeSignature,

      // Pemimpin lembaga per tahun ajaran
      pimpinan,
      setPimpinanGuru,
      getPimpinan,

      // Sesi
      currentUser,
      isAdmin: currentUser?.role === 'admin',
      logout,

      // Pengguna
      users,
      addUser, updateUser, removeUser, isUsernameTaken,

      // Mutations
      addStudent, removeStudent, updateStudent,
      updateGrade,
      addClass, updateClass, removeClass,
      addUjian, removeUjian, updateUjian,
      setUjianNilaiEntry,
      updateKarakter,
      setKenaikanEntry, setKenaikanTarget, resetKenaikan,

      // Raw current T.A. data (always current, regardless of viewingTaId)
      currentTaData: { students, kelas, ujian, ujianNilai, karakter, kenaikan, kenaikanTarget },

      // History
      isHistory: !!snap,
      viewingTaId,
      setViewingTa: setViewingTaId,
      history,
      currentTaLabel,
      archiveCurrentTa,

      // Status penyimpanan
      dbStatus,    // 'loading' | 'idle' | 'saving' | 'error'
      dbError,
    }}>
      {children}
    </Store.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Store);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
}
