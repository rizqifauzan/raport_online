'use client';
import { useState, useMemo, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';
const HURUF = ['A', 'B', 'C', 'D', 'E'];
const HURUF_COLOR = { A: '#0d9488', B: '#2563eb', C: '#d97706', D: '#dc2626', E: '#7f1d1d' };

const AKHLAQ_COLS = [
  { id: 'akhlaq',    label: 'Akhlaq',    type: 'huruf' },
  { id: 'kerajinan', label: 'Kerajinan', type: 'huruf' },
  { id: 'kerapihan', label: 'Kerapihan', type: 'huruf' },
];

const KEHADIRAN_COLS = [
  { id: 'izin',      label: 'Dengan Izin',  type: 'absen' },
  { id: 'tanpaIzin', label: 'Tanpa Izin',   type: 'absen' },
];

export default function AkhlaqPage() {
  const { lembaga, setLembaga, periode, setPeriode, kelas, students, karakter, updateKarakter } = useStore();

  const kelasList = kelas.filter(k => k.lembaga === lembaga);
  const [activeKelasId, setActiveKelasId] = useState(kelasList[0]?.id ?? '');
  const [savedAt, setSavedAt] = useState(null);

  const activeKelas = kelas.find(k => k.id === activeKelasId);
  const kelasSiswa = useMemo(() => students.filter(s => s.kelasId === activeKelasId), [students, activeKelasId]);

  const handleLembaga = (l) => {
    setLembaga(l);
    const newKelas = kelas.filter(k => k.lembaga === l);
    setActiveKelasId(newKelas[0]?.id ?? '');
  };

  const handleInput = useCallback((studentId, field, raw, type) => {
    let val;
    if (raw === '' || raw === null) {
      val = null;
    } else if (type === 'huruf') {
      val = HURUF.includes(raw) ? raw : null;
    } else {
      const n = Number(raw);
      val = isNaN(n) ? null : Math.max(0, Math.floor(n));
    }
    updateKarakter(studentId, periode, field, val);
    setSavedAt(new Date());
  }, [updateKarakter, periode]);

  const getColAvg = (field, type) => {
    const vals = kelasSiswa.map(s => karakter[s.id]?.[periode]?.[field]).filter(v => v != null);
    if (vals.length === 0) return null;
    if (type === 'huruf') {
      const counts = {};
      vals.forEach(v => { counts[v] = (counts[v] ?? 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
  };

  const ALL_COLS = [...AKHLAQ_COLS, ...KEHADIRAN_COLS];
  const totalSel = kelasSiswa.length * ALL_COLS.length;
  const totalIsi = kelasSiswa.reduce((acc, s) =>
    acc + ALL_COLS.filter(c => karakter[s.id]?.[periode]?.[c.id] != null).length
  , 0);

  const kelaIdx = kelasList.findIndex(k => k.id === activeKelasId);
  const isFirst = kelaIdx === 0;
  const isLast  = kelaIdx === kelasList.length - 1;
  const prevKelas = () => { if (!isFirst) setActiveKelasId(kelasList[kelaIdx - 1].id); };
  const nextKelas = () => { if (!isLast)  setActiveKelasId(kelasList[kelaIdx + 1].id); };

  const kelasSummary = useMemo(() => kelasList.map(k => {
    const siswa = students.filter(s => s.kelasId === k.id);
    const totalS = siswa.length * ALL_COLS.length;
    const totalI = siswa.reduce((acc, s) =>
      acc + ALL_COLS.filter(c => karakter[s.id]?.[periode]?.[c.id] != null).length
    , 0);
    return { ...k, jumlahSiswa: siswa.length, totalSel: totalS, totalIsi: totalI };
  }), [kelasList, students, karakter, periode]);

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div>
            <h1>Akhlaq &amp; Kehadiran</h1>
            <div className="crumb">Penilaian kepribadian &amp; kehadiran santri</div>
          </div>
          <div className="spacer"/>
          <div className="seg">
            <button className={lembaga==='TPQ' ? 'on' : ''} onClick={() => handleLembaga('TPQ')}>TPQ</button>
            <button className={lembaga==='Madin' ? 'on' : ''} onClick={() => handleLembaga('Madin')}>Madin</button>
          </div>
          <div className="seg gold">
            <button className={periode==='UTS' ? 'on' : ''} onClick={() => setPeriode('UTS')}>UTS</button>
            <button className={periode==='UAS' ? 'on' : ''} onClick={() => setPeriode('UAS')}>UAS</button>
          </div>
          <div className="field select">T.A. 2025/2026</div>
        </header>

        <div className="content">
          <div className="row between" style={{marginBottom:12}}>
            <div className="section-title">{lembaga} — {kelasList.length} Kelas</div>
            <div className="legend-row">
              <span className="lg"><b style={{color:'#0d9488'}}>A</b> Sangat Baik</span>
              <span className="lg"><b style={{color:'#2563eb'}}>B</b> Baik</span>
              <span className="lg"><b style={{color:'#d97706'}}>C</b> Cukup</span>
              <span className="lg"><b style={{color:'#dc2626'}}>D</b> Kurang</span>
              <span className="lg"><b style={{color:'#7f1d1d'}}>E</b> Sangat Kurang</span>
            </div>
          </div>

          <div className="class-rail" style={{gridTemplateColumns:`repeat(${kelasList.length},1fr)`,marginBottom:20}}>
            {kelasSummary.map(k => {
              const pct = k.totalSel > 0 ? Math.round(k.totalIsi / k.totalSel * 100) : 0;
              const done = k.totalSel > 0 && k.totalIsi === k.totalSel;
              return (
                <div
                  key={k.id}
                  className={`class-card${activeKelasId === k.id ? ' active' : ''}`}
                  onClick={() => setActiveKelasId(k.id)}
                >
                  <div className="kn b-teal">{k.nomor}</div>
                  <div className="ct">{k.label}</div>
                  <div className="cm">{k.jumlahSiswa} santri</div>
                  {k.totalSel > 0 && (
                    done
                      ? <div className="avg score hi" style={{fontSize:10}}>✓ Lengkap</div>
                      : <div className="avg score mid" style={{fontSize:10}}>{pct}%</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="card" style={{overflow:'hidden'}}>
            <div className="card-head">
              <div>
                <h3>{lembaga} · {activeKelas?.label} — T.A. 2025/2026</h3>
                <div className="sub">Wali kelas: {activeKelas?.wali}</div>
              </div>
              <div className="spacer"/>
              {totalSel - totalIsi > 0 && (
                <span className="badge b-amber"><span className="dot"/>{totalSel - totalIsi} sel belum terisi</span>
              )}
              {totalSel > 0 && totalIsi === totalSel && (
                <span className="badge b-green"><span className="dot"/> Semua terisi</span>
              )}
            </div>

            <div className="grade-wrap">
              <table className="grade">
                <thead>
                  <tr>
                    <th className="sticky-th" style={{textAlign:'left',padding:'9px 14px',minWidth:220,borderBottom:'1px solid var(--line)'}}>
                      Santri
                    </th>
                    <th colSpan={3} className="mapel-th">Kepribadian</th>
                    <th colSpan={2} className="mapel-th" style={{background:'#5c3d0a',color:'#fef3c7'}}>Ketidakhadiran (hari)</th>
                  </tr>
                  <tr>
                    {AKHLAQ_COLS.map(c => (
                      <th key={c.id} className="sub-th" style={{minWidth:80}}>{c.label}</th>
                    ))}
                    {KEHADIRAN_COLS.map(c => (
                      <th key={c.id} className="sub-th" style={{minWidth:90,background:'#fef9ee',color:'#92400e'}}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kelasSiswa.length === 0 ? (
                    <tr><td colSpan={6} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>
                      Belum ada santri — tambah dari halaman Siswa &amp; Kelas
                    </td></tr>
                  ) : kelasSiswa.map((s, idx) => {
                    const kData = karakter[s.id]?.[periode] ?? {};
                    return (
                      <tr key={s.id}>
                        <td className="sticky-td">
                          <div className="who-cell">
                            <span className="index-badge">{idx + 1}</span>
                            <div><b>{s.nama}</b></div>
                          </div>
                        </td>
                        {AKHLAQ_COLS.map(c => {
                          const val = kData[c.id];
                          const isEmpty = val == null;
                          return (
                            <td key={c.id} className={isEmpty ? 'empty' : ''} style={{textAlign:'center'}}>
                              <select
                                key={`${s.id}-${c.id}-${activeKelasId}-${periode}`}
                                className="cell-select"
                                value={val ?? ''}
                                style={{color: val ? HURUF_COLOR[val] : undefined, fontWeight: val ? 800 : undefined}}
                                onChange={e => handleInput(s.id, c.id, e.target.value || null, 'huruf')}
                              >
                                <option value="">—</option>
                                {HURUF.map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                            </td>
                          );
                        })}
                        {KEHADIRAN_COLS.map(c => {
                          const val = kData[c.id];
                          const isEmpty = val == null;
                          return (
                            <td key={c.id} className={isEmpty ? 'empty' : ''} style={{background: isEmpty ? undefined : '#fffbeb'}}>
                              <input
                                key={`${s.id}-${c.id}-${activeKelasId}-${periode}`}
                                className="cell-in"
                                defaultValue={val ?? ''}
                                placeholder="0"
                                type="number"
                                min="0"
                                style={{color:'#92400e'}}
                                onBlur={e => {
                                  if (e.target.value !== '') {
                                    const clamped = Math.max(0, Math.floor(Number(e.target.value)));
                                    e.target.value = isNaN(clamped) ? '' : clamped;
                                  }
                                  handleInput(s.id, c.id, e.target.value, 'absen');
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:'#f4f8f7',fontWeight:800}}>
                    <td className="sticky-td" style={{background:'#f4f8f7',fontWeight:800,padding:'11px 14px'}}>Rata-rata Kelas</td>
                    {AKHLAQ_COLS.map(c => {
                      const avg = getColAvg(c.id, c.type);
                      return (
                        <td key={c.id} style={{textAlign:'center',color: avg ? HURUF_COLOR[avg] : 'var(--muted)',fontWeight:800}}>
                          {avg ?? '—'}
                        </td>
                      );
                    })}
                    {KEHADIRAN_COLS.map(c => (
                      <td key={c.id} style={{textAlign:'center',color:'#92400e',background:'#fef9ee'}}>{getColAvg(c.id, c.type) ?? '—'}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="save-bar">
            {savedAt ? (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <div style={{fontSize:'12.5px'}}>
                  <b>Tersimpan otomatis</b>
                  <span className="muted"> — {savedAt.getHours().toString().padStart(2,'0')}:{savedAt.getMinutes().toString().padStart(2,'0')} · {totalIsi} dari {totalSel} sel terisi</span>
                </div>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/>
                </svg>
                <div style={{fontSize:'12.5px'}} className="muted">
                  {totalIsi} dari {totalSel} sel terisi · edit sel untuk menyimpan
                </div>
              </>
            )}
            <div className="spacer"/>
            <button className="btn" disabled={isFirst} onClick={prevKelas}>‹ Kelas Sebelumnya</button>
            <button className="btn" disabled={isLast} onClick={nextKelas}>Kelas Berikutnya ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
