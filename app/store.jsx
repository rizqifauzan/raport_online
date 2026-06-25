'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const Store = createContext(null);

// Helper persist ke server (fire-and-forget; update lokal tetap optimistic).
function persist(url, method, body) {
  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).catch((e) => console.error('Gagal menyimpan ke server:', e));
}

export function StoreProvider({ children }) {
  const [loading, setLoading] = useState(true);

  const [lembaga, setLembagaState] = useState('TPQ');
  const [periode, setPeriodeState] = useState('UAS');
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [kelas, setKelas] = useState([]);
  const [ujian, setUjian] = useState([]);
  const [ujianNilai, setUjianNilai] = useState({});
  const [karakter, setKarakter] = useState({});
  const [kenaikan, setKenaikan] = useState({});
  const [kenaikanTarget, setKenaikanTargetState] = useState({});

  // locks[kelasId][periode] = true
  const [locks, setLocks] = useState({});

  // Tahun ajaran history
  const [history, setHistory] = useState([]);
  const [viewingTaId, setViewingTaId] = useState(null);
  const [currentTaLabel, setCurrentTaLabel] = useState('2025/2026');

  // Bootstrap: muat seluruh state dari Neon saat mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return; // mis. 401 di halaman /login
        const d = await res.json();
        if (cancelled) return;
        setStudents(d.students ?? []);
        setKelas(d.kelas ?? []);
        setUjian(d.ujian ?? []);
        setGrades(d.grades ?? {});
        setUjianNilai(d.ujianNilai ?? {});
        setKarakter(d.karakter ?? {});
        setKenaikan(d.kenaikan ?? {});
        setKenaikanTargetState(d.kenaikanTarget ?? {});
        setLocks(d.locks ?? {});
        setLembagaState(d.lembaga ?? 'TPQ');
        setPeriodeState(d.periode ?? 'UAS');
        setCurrentTaLabel(d.currentTaLabel ?? '2025/2026');
        setHistory(d.history ?? []);
      } catch (e) {
        console.error('Gagal memuat data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const patchState = (patch) => persist('/api/state', 'PATCH', patch);

  const snap = viewingTaId ? (history.find(h => h.id === viewingTaId) ?? null) : null;

  // Setting global (dipersist agar pilihan bertahan setelah reload)
  function setLembaga(v) { setLembagaState(v); patchState({ lembaga: v }); }
  function setPeriode(v) { setPeriodeState(v); patchState({ periode: v }); }

  function isLocked(kelasId, p) {
    return locks[kelasId]?.[p] === true;
  }

  function lockKelas(kelasId, p) {
    const next = { ...locks, [kelasId]: { ...(locks[kelasId] ?? {}), [p]: true } };
    setLocks(next);
    patchState({ locks: next });
  }
  function unlockKelas(kelasId, p) {
    const next = { ...locks, [kelasId]: { ...(locks[kelasId] ?? {}), [p]: false } };
    setLocks(next);
    patchState({ locks: next });
  }

  // Students
  function addStudent(student) {
    if (snap) return;
    setStudents([student, ...students]);
    persist('/api/students', 'POST', student);
  }
  function removeStudent(id) {
    if (snap) return;
    setStudents(students.filter(s => s.id !== id));
    persist(`/api/students/${id}`, 'DELETE');
  }
  function updateStudent(id, patch) {
    if (snap) return;
    setStudents(students.map(s => s.id === id ? { ...s, ...patch } : s));
    persist(`/api/students/${id}`, 'PATCH', patch);
  }

  // Kelas CRUD
  function addClass(k) {
    if (snap) return;
    setKelas([...kelas, k]);
    persist('/api/kelas', 'POST', k);
  }
  function updateClass(id, patch) {
    if (snap) return;
    setKelas(kelas.map(k => k.id === id ? { ...k, ...patch } : k));
    persist(`/api/kelas/${id}`, 'PATCH', patch);
  }
  function removeClass(id) {
    if (snap) return;
    setKelas(kelas.filter(k => k.id !== id));
    persist(`/api/kelas/${id}`, 'DELETE');
  }

  // Ujian
  function addUjian(u) {
    if (snap) return;
    setUjian([...ujian, u]);
    persist('/api/ujian', 'POST', u);
  }
  function removeUjian(id) {
    if (snap) return;
    setUjian(ujian.filter(u => u.id !== id));
    persist(`/api/ujian/${id}`, 'DELETE');
  }
  function updateUjian(id, patch) {
    if (snap) return;
    setUjian(ujian.map(u => u.id === id ? { ...u, ...patch } : u));
    persist(`/api/ujian/${id}`, 'PATCH', patch);
  }

  // Nilai ujian — guarded by lock
  function setUjianNilaiEntry(ujianId, studentId, nilai) {
    if (snap) return;
    const u = ujian.find(u2 => u2.id === ujianId);
    if (u && isLocked(u.kelasId, u.periode)) return;
    const next = {
      ...ujianNilai,
      [ujianId]: { ...(ujianNilai[ujianId] ?? {}), [studentId]: nilai },
    };
    setUjianNilai(next);
    patchState({ ujianNilai: next });
  }

  // Karakter — guarded by lock
  function updateKarakter(studentId, p, field, value) {
    if (snap) return;
    const s = students.find(s2 => s2.id === studentId);
    if (s && isLocked(s.kelasId, p)) return;
    const next = {
      ...karakter,
      [studentId]: {
        ...(karakter[studentId] ?? {}),
        [p]: { ...(karakter[studentId]?.[p] ?? {}), [field]: value },
      },
    };
    setKarakter(next);
    patchState({ karakter: next });
  }

  // Grades (legacy)
  function updateGrade(studentId, mapelId, field, value) {
    if (snap) return;
    const next = {
      ...grades,
      [studentId]: {
        ...(grades[studentId] ?? {}),
        [mapelId]: {
          ...(grades[studentId]?.[mapelId] ?? {}),
          [periode]: {
            ...(grades[studentId]?.[mapelId]?.[periode] ?? {}),
            [field]: value,
          },
        },
      },
    };
    setGrades(next);
    patchState({ grades: next });
  }

  // Kenaikan — guarded by lock (UAS only)
  function setKenaikanEntry(studentId, status) {
    if (snap) return;
    const s = students.find(s2 => s2.id === studentId);
    if (s && isLocked(s.kelasId, 'UAS')) return;
    const next = { ...kenaikan, [studentId]: status };
    setKenaikan(next);
    patchState({ kenaikan: next });
  }
  function setKenaikanTarget(studentId, val) {
    if (snap) return;
    const s = students.find(s2 => s2.id === studentId);
    if (s && isLocked(s.kelasId, 'UAS')) return;
    const next = { ...kenaikanTarget, [studentId]: val };
    setKenaikanTargetState(next);
    patchState({ kenaikanTarget: next });
  }
  function resetKenaikan() {
    if (snap) return;
    setKenaikan({});
    setKenaikanTargetState({});
    patchState({ kenaikan: {}, kenaikanTarget: {} });
  }

  // Tahun ajaran
  function archiveCurrentTa(newTaLabel) {
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
    };
    setHistory(prev => [...prev, snapshot]);
    setCurrentTaLabel(newTaLabel);
    setUjian([]);
    setUjianNilai({});
    setKarakter({});
    setKenaikan({});
    setKenaikanTargetState({});
    setLocks({});
    setPeriodeState('UTS');
    setViewingTaId(null);
    persist('/api/tahun-ajaran', 'POST', { snapshot, newTaLabel });
  }

  return (
    <Store.Provider value={{
      loading,
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
