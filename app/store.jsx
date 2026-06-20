'use client';
import { createContext, useContext, useState } from 'react';
import { INITIAL_DATA } from '../lib/data';

const Store = createContext(null);

export function StoreProvider({ children }) {
  const [lembaga, setLembaga] = useState('TPQ');
  const [periode, setPeriode] = useState('UAS');
  const [students, setStudents] = useState(INITIAL_DATA.students);
  const [grades, setGrades] = useState(INITIAL_DATA.grades);

  function addStudent(student) {
    setStudents(prev => [student, ...prev]);
  }

  function removeStudent(id) {
    setStudents(prev => prev.filter(s => s.id !== id));
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
    <Store.Provider value={{ lembaga, setLembaga, periode, setPeriode, students, grades, addStudent, removeStudent, updateGrade }}>
      {children}
    </Store.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Store);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
}
