'use client';
import { createContext, useContext, useState } from 'react';
import { INITIAL_DATA } from '../lib/data';

const Store = createContext(null);

export function StoreProvider({ children }) {
  const [lembaga, setLembaga] = useState('TPQ');
  const [periode, setPeriode] = useState('UAS');
  const [students, setStudents] = useState(INITIAL_DATA.students);
  const [grades, setGrades] = useState(INITIAL_DATA.grades);
  const [ujian, setUjian] = useState(INITIAL_DATA.ujian);
  const [ujianNilai, setUjianNilai] = useState(INITIAL_DATA.ujianNilai);
  const [karakter, setKarakter] = useState(INITIAL_DATA.karakter);

  function addStudent(student) {
    setStudents(prev => [student, ...prev]);
  }

  function removeStudent(id) {
    setStudents(prev => prev.filter(s => s.id !== id));
  }

  function addUjian(u) {
    setUjian(prev => [...prev, u]);
  }

  function removeUjian(id) {
    setUjian(prev => prev.filter(u => u.id !== id));
  }

  function updateUjian(id, patch) {
    setUjian(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  }

  function setUjianNilaiEntry(ujianId, studentId, nilai) {
    setUjianNilai(prev => ({
      ...prev,
      [ujianId]: { ...(prev[ujianId] ?? {}), [studentId]: nilai },
    }));
  }

  function updateKarakter(studentId, field, value) {
    setKarakter(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [field]: value },
    }));
  }

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

  return (
    <Store.Provider value={{ lembaga, setLembaga, periode, setPeriode, students, grades, addStudent, removeStudent, updateGrade, ujian, ujianNilai, addUjian, removeUjian, updateUjian, setUjianNilaiEntry, karakter, updateKarakter }}>
      {children}
    </Store.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Store);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
}
