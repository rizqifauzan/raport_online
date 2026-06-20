'use client';
import { createContext, useContext, useState } from 'react';
import { INITIAL_DATA } from '../lib/data';

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

  // Students
  function addStudent(student) {
    setStudents(prev => [student, ...prev]);
  }
  function removeStudent(id) {
    setStudents(prev => prev.filter(s => s.id !== id));
  }

  // Kelas CRUD
  function addClass(k) {
    setKelas(prev => [...prev, k]);
  }
  function updateClass(id, patch) {
    setKelas(prev => prev.map(k => k.id === id ? { ...k, ...patch } : k));
  }
  function removeClass(id) {
    setKelas(prev => prev.filter(k => k.id !== id));
  }

  // Ujian
  function addUjian(u) {
    setUjian(prev => [...prev, u]);
  }
  function removeUjian(id) {
    setUjian(prev => prev.filter(u => u.id !== id));
  }
  function updateUjian(id, patch) {
    setUjian(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  }

  // Nilai ujian
  function setUjianNilaiEntry(ujianId, studentId, nilai) {
    setUjianNilai(prev => ({
      ...prev,
      [ujianId]: { ...(prev[ujianId] ?? {}), [studentId]: nilai },
    }));
  }

  // Karakter (per periode)
  function updateKarakter(studentId, p, field, value) {
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

  // Kenaikan
  function setKenaikanEntry(studentId, status) {
    setKenaikan(prev => ({ ...prev, [studentId]: status }));
  }
  function resetKenaikan() {
    setKenaikan({});
  }

  return (
    <Store.Provider value={{
      lembaga, setLembaga,
      periode, setPeriode,
      students, addStudent, removeStudent,
      grades, updateGrade,
      kelas, addClass, updateClass, removeClass,
      ujian, addUjian, removeUjian, updateUjian,
      ujianNilai, setUjianNilaiEntry,
      karakter, updateKarakter,
      kenaikan, setKenaikanEntry, resetKenaikan,
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
