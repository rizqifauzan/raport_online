'use client';
import { useState, useMemo, useCallback, Fragment } from 'react';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';
import { KELAS, MAPEL, getInitials } from '../../lib/data';

function scoreClass(v) { return v >= 85 ? 'hi' : v >= 75 ? 'mid' : 'lo'; }

export default function InputNilaiPage() {
  const { lembaga, setLembaga, periode, setPeriode, students, grades, updateGrade } = useStore();
  const mapelList = MAPEL[lembaga];
  const kelasList = KELAS.filter(k => k.lembaga === lembaga);
  const [activeKelasId, setActiveKelasId] = useState(kelasList[0]?.id ?? '');
  const [savedAt, setSavedAt] = useState(null);
  const [toast, setToast] = useState('');

  const activeKelas = KELAS.find(k => k.id === activeKelasId);
  const kelasSiswa = useMemo(() => students.filter(s => s.kelasId === activeKelasId), [students, activeKelasId]);

  const handleLembaga = (l) => {
    setLembaga(l);
    const newKelas = KELAS.filter(k => k.lembaga === l);
    setActiveKelasId(newKelas[0]?.id ?? '');
  };

  const handleInput = useCallback((studentId, mapelId, field, raw) => {
    const val = raw === '' ? null : Math.min(100, Math.max(0, Number(raw)));
    updateGrade(studentId, mapelId, field, val === null ? null : isNaN(val) ? null : val);
    setSavedAt(new Date());
  }, [updateGrade]);

  const getRata = (studentId, mapelId) => {
    const entry = grades[studentId]?.[mapelId]?.[periode];
    if (!entry) return null;
    if (entry.p == null || entry.t == null) return null;
    return Math.round((entry.p + entry.t) / 2 * 10) / 10;
  };

  const getNilaiAkhir = (studentId) => {
    const ratas = mapelList.map(m => getRata(studentId, m.id)).filter(v => v !== null);
    if (ratas.length === 0) return null;
    return Math.round(ratas.reduce((a,b)=>a+b,0)/ratas.length * 10) / 10;
  };

  const getColAvg = (mapelId, field) => {
    const vals = kelasSiswa.map(s => grades[s.id]?.[mapelId]?.[periode]?.[field]).filter(v => v != null);
    return vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
  };

  const getColRataAvg = (mapelId) => {
    const ratas = kelasSiswa.map(s => getRata(s.id, mapelId)).filter(v => v !== null);
    return ratas.length > 0 ? Math.round(ratas.reduce((a,b)=>a+b,0)/ratas.length * 10) / 10 : null;
  };

  const getKelasNilaiAkhir = () => {
    const vals = kelasSiswa.map(s => getNilaiAkhir(s.id)).filter(v => v !== null);
    return vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length * 10) / 10 : null;
  };

  const totalSel = kelasSiswa.length * mapelList.length * 2;
  const totalIsi = kelasSiswa.reduce((acc, s) => {
    return acc + mapelList.reduce((a2, m) => {
      const e = grades[s.id]?.[m.id]?.[periode];
      return a2 + (e?.p != null ? 1 : 0) + (e?.t != null ? 1 : 0);
    }, 0);
  }, 0);

  function handleSimpan() {
    setToast('Nilai berhasil dikunci!');
    setTimeout(() => setToast(''), 2500);
  }

  const prevKelas = () => {
    const idx = kelasList.findIndex(k => k.id === activeKelasId);
    if (idx > 0) setActiveKelasId(kelasList[idx - 1].id);
  };
  const nextKelas = () => {
    const idx = kelasList.findIndex(k => k.id === activeKelasId);
    if (idx < kelasList.length - 1) setActiveKelasId(kelasList[idx + 1].id);
  };
  const isFirst = kelasList.findIndex(k => k.id === activeKelasId) === 0;
  const isLast  = kelasList.findIndex(k => k.id === activeKelasId) === kelasList.length - 1;

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div>
            <h1>Input Nilai</h1>
            <div className="crumb">Entri cepat per kelas</div>
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
          <div className="row between wrap" style={{marginBottom:16}}>
            <div className="row wrap">
              <div className="field select" style={{cursor:'default'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18" strokeLinecap="round"/>
                </svg>
                <select
                  style={{border:'none',outline:'none',background:'transparent',fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',color:'var(--ink-2)'}}
                  value={activeKelasId}
                  onChange={e => setActiveKelasId(e.target.value)}
                >
                  {kelasList.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </div>
              <div className="field">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 3-4.5 5.5-4.5S13.9 16 14.5 19"/>
                </svg>
                {kelasSiswa.length} santri
              </div>
              <span className="badge b-gold" style={{padding:'7px 12px'}}>
                <span className="dot"/> Periode: {periode} {periode==='UAS' ? 'Genap' : 'Ganjil'}
              </span>
            </div>
            <div className="legend-row">
              <span className="lg"><span className="sw" style={{background:'#5eead4'}}/> Praktik</span>
              <span className="lg"><span className="sw" style={{background:'#0f766e'}}/> Tertulis</span>
              <span className="lg"><span className="sw" style={{background:'#0d9488'}}/> Rata = otomatis</span>
            </div>
          </div>

          <div className="card" style={{overflow:'hidden'}}>
            <div className="card-head">
              <div>
                <h3>{lembaga} · {activeKelas?.label} — T.A. 2025/2026</h3>
                <div className="sub">Wali kelas: {activeKelas?.wali} · isi Praktik &amp; Tertulis, rata-rata terhitung otomatis</div>
              </div>
              <div className="spacer"/>
              {totalSel - totalIsi > 0 && (
                <span className="badge b-amber"><span className="dot"/>{totalSel - totalIsi} sel belum terisi</span>
              )}
              {totalSel > 0 && totalIsi === totalSel && (
                <span className="badge b-green"><span className="dot"/> Semua terisi</span>
              )}
              <button className="btn sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 20h16"/>
                </svg>
                Impor Excel
              </button>
            </div>

            <div className="grade-wrap">
              <table className="grade">
                <thead>
                  <tr>
                    <th rowSpan={2} className="sticky-th" style={{textAlign:'left',padding:'9px 14px',minWidth:240,verticalAlign:'bottom',borderBottom:'1px solid var(--line)'}}>Santri</th>
                    {mapelList.map(m => (
                      <th key={m.id} colSpan={3} className="mapel-th">{m.label}</th>
                    ))}
                    <th rowSpan={2} className="mapel-th" style={{background:'#0d4842',color:'#fff',verticalAlign:'bottom',minWidth:88}}>Nilai<br/>Akhir</th>
                  </tr>
                  <tr>
                    {mapelList.map(m => (
                      <Fragment key={m.id}>
                        <th className="sub-th">Prk</th>
                        <th className="sub-th">Tul</th>
                        <th className="sub-th rata">Rt</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kelasSiswa.length === 0 ? (
                    <tr><td colSpan={mapelList.length*3+2} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>
                      Belum ada santri — tambah dari halaman Siswa &amp; Kelas
                    </td></tr>
                  ) : kelasSiswa.map((s, idx) => {
                    const na = getNilaiAkhir(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="sticky-td">
                          <div className="who-cell">
                            <span className="index-badge">{idx+1}</span>
                            <div><b>{s.nama}</b><span>NIS {s.id}</span></div>
                          </div>
                        </td>
                        {mapelList.map(m => {
                          const entry = grades[s.id]?.[m.id]?.[periode];
                          const rata = getRata(s.id, m.id);
                          const hasP = entry?.p != null;
                          const hasT = entry?.t != null;
                          return (
                            <Fragment key={m.id}>
                              <td className={!hasP ? 'empty' : ''}>
                                <input
                                  key={`${s.id}-${m.id}-p-${periode}-${activeKelasId}`}
                                  className="cell-in"
                                  defaultValue={entry?.p ?? ''}
                                  placeholder="—"
                                  type="number"
                                  min="0"
                                  max="100"
                                  onChange={e => handleInput(s.id, m.id, 'p', e.target.value)}
                                />
                              </td>
                              <td className={!hasT ? 'empty' : ''}>
                                <input
                                  key={`${s.id}-${m.id}-t-${periode}-${activeKelasId}`}
                                  className="cell-in"
                                  defaultValue={entry?.t ?? ''}
                                  placeholder="—"
                                  type="number"
                                  min="0"
                                  max="100"
                                  onChange={e => handleInput(s.id, m.id, 't', e.target.value)}
                                />
                              </td>
                              <td className={`rata-cell${rata === null ? ' empty-rata' : ''}`}>
                                {rata !== null ? rata : '—'}
                              </td>
                            </Fragment>
                          );
                        })}
                        <td className="final-cell">
                          {na !== null
                            ? <span className={`score ${scoreClass(na)}`} style={{fontSize:15}}>{na}</span>
                            : <span className="muted">—</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:'#f4f8f7',fontWeight:800}}>
                    <td className="sticky-td" style={{background:'#f4f8f7',fontWeight:800,padding:'11px 14px'}}>Rata-rata Kelas</td>
                    {mapelList.map(m => (
                      <Fragment key={m.id}>
                        <td style={{textAlign:'center',color:'var(--brand-700)'}}>{getColAvg(m.id,'p') ?? '—'}</td>
                        <td style={{textAlign:'center',color:'var(--brand-700)'}}>{getColAvg(m.id,'t') ?? '—'}</td>
                        <td style={{textAlign:'center',color:'var(--brand-700)'}}>{getColRataAvg(m.id) ?? '—'}</td>
                      </Fragment>
                    ))}
                    <td style={{textAlign:'center',color:'var(--brand-700)',fontSize:14}}>{getKelasNilaiAkhir() ?? '—'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Save bar */}
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
            <button className="btn primary" onClick={handleSimpan}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <path d="M17 21v-8H7v8M7 3v5h8"/>
              </svg>
              Simpan &amp; Kunci Nilai
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="toast">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
