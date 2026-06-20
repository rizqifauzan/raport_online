'use client';
import { createContext, useContext, useState } from 'react';
import { INITIAL_DATA, HISTORY_SEED } from '../lib/data';

const Store = createContext(null);

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

  // locks[kelasId][periode] = true
  const [locks, setLocks] = useState({});

  // Tahun ajaran history
  const [history, setHistory] = useState(HISTORY_SEED);
  const [viewingTaId, setViewingTaId] = useState(null);
  const [currentTaLabel, setCurrentTaLabel] = useState('2025/2026');

  const snap = viewingTaId ? (history.find(h => h.id === viewingTaId) ?? null) : null;

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
  function resetKenaikan() {
    if (snap) return;
    setKenaikan({});
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
      locks,
    };
    setHistory(prev => [...prev, snapshot]);
    setCurrentTaLabel(newTaLabel);
    setUjian([]);
    setUjianNilai({});
    setKarakter({});
    setKenaikan({});
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
      kenaikan:   snap ? snap.kenaikan   : kenaikan,

      // Locks (only current T.A. is lockable; history is always read-only)
      locks,
      lockKelas,
      unlockKelas,
      isLocked,

      // Mutations
      addStudent, removeStudent,
      updateGrade,
      addClass, updateClass, removeClass,
      addUjian, removeUjian, updateUjian,
      setUjianNilaiEntry,
      updateKarakter,
      setKenaikanEntry, resetKenaikan,

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
