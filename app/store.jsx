'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { INITIAL_DATA, HISTORY_SEED, normalizeUsers, normalizeGurus, migrateWaliKelas,
  normalizePimpinan, pimpinanTtdKey, PIMPINAN_DEFAULT, LEMBAGA_LIST, TTD_DEFAULT } from '../lib/data';

const Store = createContext(null);

// Jeda sebelum perubahan dikirim ke database (menggabungkan ketikan beruntun).
const SAVE_DEBOUNCE_MS = 700;

export function StoreProvider({ children }) {
  const [lembaga, setLembaga] = useState('TPQ');
  const [periode, setPeriode] = useState('UAS');
  const [students, setStudents] = useState(INITIAL_DATA.students);
  const [grades, setGrades] = useState(INITIAL_DATA.grades);
  const [kelas, setKelas] = useState(INITIAL_DATA.kelas);
  const [ujian, setUjian] = useState(INITIAL_DATA.ujian);
  const [ujianNilai, setUjianNilai] = useState(INITIAL_DATA.ujianNilai);
  const [karakter, setKarakter] = useState(INITIAL_DATA.karakter);
  const [kenaikan, setKenaikan] = useState(INITIAL_DATA.kenaikan);
  const [kenaikanTarget, setKenaikanTargetState] = useState({});

  // Pengguna aplikasi (operator/ustadz/wali kelas)
  const [users, setUsers] = useState(INITIAL_DATA.users);

  // Guru + kalibrasi posisi tanda tangannya (gambar disimpan terpisah)
  const [gurus, setGurus] = useState(INITIAL_DATA.gurus);
  // { guruId: dataUrl } — TIDAK ikut dokumen state, lihat /api/signature
  const [signatures, setSignatures] = useState({});

  // locks[kelasId][periode] = true
  const [locks, setLocks] = useState({});

  // Tahun ajaran history
  const [history, setHistory] = useState(HISTORY_SEED);
  const [viewingTaId, setViewingTaId] = useState(null);
  const [currentTaLabel, setCurrentTaLabel] = useState('2025/2026');
  // Pemimpin TPQ / Madin untuk T.A. aktif (opsional; ikut tercetak di raport)
  const [pimpinan, setPimpinanState] = useState(() => normalizePimpinan(PIMPINAN_DEFAULT));

  // ---------------------------------------------------------------
  // Mode penyimpanan
  //   dbEnabled === null  → belum tahu (masih menanyakan ke /api/state)
  //   dbEnabled === false → DATABASE_URL tidak di-set, data hanya di memori
  //   dbEnabled === true  → data dibaca & disimpan ke Neon
  // ---------------------------------------------------------------
  // Pengguna yang sedang login (dibaca dari cookie sesi lewat /api/auth/session)
  const [currentUser, setCurrentUser] = useState(null);

  const [dbEnabled, setDbEnabled] = useState(null);
  const [dbStatus, setDbStatus] = useState('loading'); // loading | idle | saving | error
  const [dbError, setDbError] = useState(null);

  // Menahan penyimpanan sampai hidrasi awal selesai, supaya state seed
  // tidak menimpa data yang sudah ada di database.
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef(null);

  const snap = viewingTaId ? (history.find(h => h.id === viewingTaId) ?? null) : null;

  // Kumpulan state yang ikut disimpan. `lembaga`, `periode`, dan `viewingTaId`
  // sengaja dikecualikan — itu preferensi tampilan, bukan data.
  const persisted = {
    students, grades, kelas, ujian, ujianNilai, karakter,
    kenaikan, kenaikanTarget, locks, history, currentTaLabel, users, gurus, pimpinan,
  };

  // Hidrasi awal: tanyakan mode ke server, lalu muat data bila mode database.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' });
        const payload = await res.json();
        if (cancelled) return;

        if (!payload.enabled) {
          // Mode demo — biarkan data seed apa adanya.
          setDbEnabled(false);
          setDbStatus('idle');
          return;
        }

        setDbEnabled(true);

        if (payload.error) {
          setDbStatus('error');
          setDbError(payload.error);
          return;
        }

        if (payload.data) {
          const d = payload.data;
          setStudents(d.students ?? INITIAL_DATA.students);
          setGrades(d.grades ?? INITIAL_DATA.grades);
          // Penetapan wali kelas lama (guru.kelasIds) dipindah ke data kelas
          setKelas(migrateWaliKelas(d.kelas ?? INITIAL_DATA.kelas, d.gurus ?? []));
          setUjian(d.ujian ?? INITIAL_DATA.ujian);
          setUjianNilai(d.ujianNilai ?? INITIAL_DATA.ujianNilai);
          setKarakter(d.karakter ?? INITIAL_DATA.karakter);
          setKenaikan(d.kenaikan ?? INITIAL_DATA.kenaikan);
          setKenaikanTargetState(d.kenaikanTarget ?? {});
          // normalizeUsers memetakan peran lama (wali-kelas/ustadz) ke 'operator'
          setUsers(d.users ? normalizeUsers(d.users) : INITIAL_DATA.users);
          setGurus(d.gurus ? normalizeGurus(d.gurus) : INITIAL_DATA.gurus);
          setLocks(d.locks ?? {});
          setHistory(d.history ?? HISTORY_SEED);
          setCurrentTaLabel(d.currentTaLabel ?? '2025/2026');
          setPimpinanState(normalizePimpinan(d.pimpinan));
        }
        // payload.data === null → database masih kosong; data seed yang
        // sedang tampil akan tersimpan otomatis sebagai isi awal.

        setDbStatus('idle');
        hydratedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        console.error('[store] gagal menghubungi /api/state:', err);
        setDbEnabled(false);
        setDbStatus('idle');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Siapa yang sedang login. Middleware sudah menjaga akses; ini hanya
  // supaya antarmuka bisa menampilkan nama & peran pemakainya.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!res.ok) return;
        const payload = await res.json();
        if (!cancelled) setCurrentUser(payload.user ?? null);
      } catch (err) {
        console.error('[store] gagal membaca sesi:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[store] gagal logout:', err);
    }
    window.location.href = '/login';
  }

  // Gambar tanda tangan dimuat terpisah — ukurannya besar dan jarang berubah,
  // jadi tidak ikut dalam dokumen state.
  useEffect(() => {
    if (dbEnabled !== true) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/signature', { cache: 'no-store' });
        const payload = await res.json();
        if (!cancelled && payload.signatures) setSignatures(payload.signatures);
      } catch (err) {
        console.error('[store] gagal memuat tanda tangan:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [dbEnabled]);

  // Simpan setiap perubahan ke database (hanya bila mode database aktif).
  useEffect(() => {
    if (dbEnabled !== true || !hydratedRef.current) return;

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setDbStatus('saving');
      try {
        const res = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(persisted),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setDbStatus('idle');
        setDbError(null);
      } catch (err) {
        console.error('[store] gagal menyimpan state:', err);
        setDbStatus('error');
        setDbError('Perubahan terakhir gagal disimpan.');
      }
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbEnabled, students, grades, kelas, ujian, ujianNilai, karakter,
      kenaikan, kenaikanTarget, locks, history, currentTaLabel, users, gurus, pimpinan]);

  function isLocked(kelasId, p) {
    return locks[kelasId]?.[p] === true;
  }

  function lockKelas(kelasId, p) {
    setLocks(prev => ({ ...prev, [kelasId]: { ...(prev[kelasId] ?? {}), [p]: true } }));
  }
  function unlockKelas(kelasId, p) {
    setLocks(prev => ({ ...prev, [kelasId]: { ...(prev[kelasId] ?? {}), [p]: false } }));
  }

  // Students
  function addStudent(student) {
    if (snap) return;
    setStudents(prev => [student, ...prev]);
  }
  function removeStudent(id) {
    if (snap) return;
    setStudents(prev => prev.filter(s => s.id !== id));
  }
  function updateStudent(id, patch) {
    if (snap) return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  // Kelas CRUD
  function addClass(k) {
    if (snap) return;
    setKelas(prev => [...prev, k]);
  }
  function updateClass(id, patch) {
    if (snap) return;
    setKelas(prev => prev.map(k => k.id === id ? { ...k, ...patch } : k));
  }
  function removeClass(id) {
    if (snap) return;
    setKelas(prev => prev.filter(k => k.id !== id));
  }

  // Ujian
  function addUjian(u) {
    if (snap) return;
    setUjian(prev => [...prev, u]);
  }
  function removeUjian(id) {
    if (snap) return;
    setUjian(prev => prev.filter(u => u.id !== id));
  }
  function updateUjian(id, patch) {
    if (snap) return;
    setUjian(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  }

  // Nilai ujian — guarded by lock
  function setUjianNilaiEntry(ujianId, studentId, nilai) {
    if (snap) return;
    const u = ujian.find(u2 => u2.id === ujianId);
    if (u && isLocked(u.kelasId, u.periode)) return;
    setUjianNilai(prev => ({
      ...prev,
      [ujianId]: { ...(prev[ujianId] ?? {}), [studentId]: nilai },
    }));
  }

  // Karakter — guarded by lock
  function updateKarakter(studentId, p, field, value) {
    if (snap) return;
    const s = students.find(s2 => s2.id === studentId);
    if (s && isLocked(s.kelasId, p)) return;
    setKarakter(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] ?? {}),
        [p]: { ...(prev[studentId]?.[p] ?? {}), [field]: value },
      },
    }));
  }

  // Grades (legacy)
  function updateGrade(studentId, mapelId, field, value) {
    if (snap) return;
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
  }

  // Kenaikan — guarded by lock (UAS only)
  function setKenaikanEntry(studentId, status) {
    if (snap) return;
    const s = students.find(s2 => s2.id === studentId);
    if (s && isLocked(s.kelasId, 'UAS')) return;
    setKenaikan(prev => ({ ...prev, [studentId]: status }));
  }
  function setKenaikanTarget(studentId, val) {
    if (snap) return;
    const s = students.find(s2 => s2.id === studentId);
    if (s && isLocked(s.kelasId, 'UAS')) return;
    setKenaikanTargetState(prev => ({ ...prev, [studentId]: val }));
  }
  function resetKenaikan() {
    if (snap) return;
    setKenaikan({});
    setKenaikanTargetState({});
  }

  // Pengguna — tidak terpengaruh mode arsip (pengguna berlaku lintas tahun ajaran)
  function addUser(user) {
    setUsers(prev => [...prev, user]);
  }
  function updateUser(id, patch) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  }
  function removeUser(id) {
    setUsers(prev => prev.filter(u => u.id !== id));
  }
  /** Cek username unik; `exceptId` dipakai saat mengedit pengguna yang sama. */
  function isUsernameTaken(username, exceptId = null) {
    const u = username.trim().toLowerCase();
    return users.some(x => x.username.toLowerCase() === u && x.id !== exceptId);
  }

  // Guru
  function addGuru(guru) {
    setGurus(prev => [...prev, guru]);
  }
  function updateGuru(id, patch) {
    setGurus(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
    if (patch.nama) {
      setKelas(prev => prev.map(k => k.waliGuruId === id ? { ...k, wali: patch.nama } : k));
    }
  }
  async function removeGuru(id) {
    setGurus(prev => prev.filter(g => g.id !== id));
    // Lepas dari kelas yang diampunya; nama wali dibiarkan sebagai teks
    setKelas(prev => prev.map(k => k.waliGuruId === id ? { ...k, waliGuruId: '' } : k));
    await removeSignature(id);
  }

  /** Simpan gambar tanda tangan (data URL). Langsung dikirim, tanpa debounce. */
  async function setSignature(guruId, dataUrl) {
    setSignatures(prev => ({ ...prev, [guruId]: dataUrl }));
    if (dbEnabled !== true) return { ok: true };
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
    if (dbEnabled !== true) return;
    try {
      await fetch(`/api/signature?guruId=${encodeURIComponent(guruId)}`, { method: 'DELETE' });
    } catch (err) {
      console.error('[store] gagal menghapus tanda tangan:', err);
    }
  }

  // ── Pemimpin lembaga (TPQ / Madin) ──────────────────────────────
  /** Tunjuk guru sebagai pemimpin lembaga (string kosong = belum ditentukan). */
  function setPimpinanGuru(lembaga, guruId) {
    setPimpinanState(prev => ({ ...prev, [lembaga]: { ...prev[lembaga], guruId: guruId || '' } }));
  }

  /**
   * Data pemimpin siap pakai untuk raport: nama, kalibrasi, dan gambar.
   *
   * T.A. aktif membacanya langsung dari data guru yang ditunjuk, sehingga
   * mengubah tanda tangan atau posisinya di menu Guru langsung ikut terpakai.
   * Arsip memakai salinan yang dibekukan saat T.A. ditutup.
   */
  function getPimpinan(lembaga) {
    if (snap) {
      const beku = normalizePimpinan(snap.pimpinan)[lembaga];
      return {
        nama: beku.nama,
        ttd: beku.ttd,
        image: signatures[pimpinanTtdKey(lembaga, snap.id)] ?? null,
      };
    }
    const guruId = pimpinan[lembaga]?.guruId;
    const guru = guruId ? gurus.find(g => g.id === guruId) : null;
    if (!guru) return { nama: '', ttd: { ...TTD_DEFAULT }, image: null };
    return {
      nama: guru.nama,
      ttd: { ...TTD_DEFAULT, ...(guru.ttd ?? {}) },
      image: signatures[guru.id] ?? null,
    };
  }

  // Tahun ajaran
  function archiveCurrentTa(newTaLabel, pimpinanBaru = null) {
    const snapshot = {
      id: `ta-${Date.now()}`,
      label: currentTaLabel,
      archivedAt: new Date().toISOString().slice(0, 10),
      students,
      kelas,
      ujian,
      ujianNilai,
      karakter,
      kenaikan,
      kenaikanTarget,
      locks,
      // Bekukan nama & kalibrasi pemimpin apa adanya saat ini
      pimpinan: Object.fromEntries(LEMBAGA_LIST.map(l => {
        const p = getPimpinan(l);
        return [l, { guruId: pimpinan[l]?.guruId ?? '', nama: p.nama, ttd: p.ttd }];
      })),
    };
    // Bekukan pula gambar tanda tangannya ke kunci milik arsip, supaya raport
    // T.A. lama tetap benar walau gurunya kelak berubah atau dihapus.
    for (const l of LEMBAGA_LIST) {
      const img = getPimpinan(l).image;
      if (img) setSignature(pimpinanTtdKey(l, snapshot.id), img);
    }
    setHistory(prev => [...prev, snapshot]);
    if (pimpinanBaru) setPimpinanState(normalizePimpinan(pimpinanBaru));
    setCurrentTaLabel(newTaLabel);
    setUjian([]);
    setUjianNilai({});
    setKarakter({});
    setKenaikan({});
    setKenaikanTargetState({});
    setLocks({});
    setPeriode('UTS');
    setViewingTaId(null);
  }

  return (
    <Store.Provider value={{
      lembaga, setLembaga,
      periode, setPeriode,

      // Data — snapshot when viewing history
      students:   snap ? snap.students   : students,
      grades,
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
      dbEnabled,   // null = belum diketahui, false = mode demo, true = Neon
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
