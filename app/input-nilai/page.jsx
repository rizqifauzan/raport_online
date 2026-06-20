'use client';
import { useState, useMemo, useCallback, Fragment } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';
function scoreClass(v) { return v >= 85 ? 'hi' : v >= 75 ? 'mid' : 'lo'; }

export default function InputNilaiPage() {
  const { lembaga, setLembaga, periode, setPeriode, kelas, students, ujian, ujianNilai, setUjianNilaiEntry, locks, lockKelas, unlockKelas, isHistory } = useStore();

  const kelasList = kelas.filter(k => k.lembaga === lembaga);
  const [activeKelasId, setActiveKelasId] = useState(kelasList[0]?.id ?? '');
  const [savedAt, setSavedAt] = useState(null);
  const [toast, setToast] = useState('');

  const activeKelas = kelas.find(k => k.id === activeKelasId);
  const kelasSiswa = useMemo(() => students.filter(s => s.kelasId === activeKelasId), [students, activeKelasId]);
  const ujianKelas = useMemo(() => ujian.filter(u => u.kelasId === activeKelasId && u.periode === periode), [ujian, activeKelasId, periode]);

  const handleLembaga = (l) => {
    setLembaga(l);
    const newKelas = kelas.filter(k => k.lembaga === l);
    setActiveKelasId(newKelas[0]?.id ?? '');
  };

  const handleInput = useCallback((ujianId, studentId, raw, isKustom) => {
    let val;
    if (isKustom) {
      val = raw === '' ? null : raw;
    } else {
      if (raw === '') { val = null; }
      else {
        const n = Number(raw);
        val = isNaN(n) ? null : Math.min(100, Math.max(0, n));
      }
    }
    setUjianNilaiEntry(ujianId, studentId, val);
    setSavedAt(new Date());
  }, [setUjianNilaiEntry]);

  const getNilaiAkhir = (studentId) => {
    const vals = ujianKelas
      .filter(u => u.tipe !== 'Kustom')
      .map(u => ujianNilai[u.id]?.[studentId])
      .filter(v => v != null && v !== '');
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length * 10) / 10;
  };

  const getColAvg = (ujianId) => {
    const vals = kelasSiswa
      .map(s => ujianNilai[ujianId]?.[s.id])
      .filter(v => v != null && v !== '');
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length * 10) / 10;
  };

  const getKelasNilaiAkhir = () => {
    const vals = kelasSiswa.map(s => getNilaiAkhir(s.id)).filter(v => v !== null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
  };

  const totalSel = kelasSiswa.length * ujianKelas.length;
  const totalIsi = kelasSiswa.reduce((acc, s) =>
    acc + ujianKelas.filter(u => {
      const v = ujianNilai[u.id]?.[s.id];
      return v != null && v !== '';
    }).length
  , 0);

  const locked = !isHistory && locks[activeKelasId]?.[periode] === true;
  const [confirmUnlock, setConfirmUnlock] = useState(false);

  function handleLock() {
    lockKelas(activeKelasId, periode);
    setToast(`Nilai ${activeKelas?.label} ${periode} dipublikasi`);
    setTimeout(() => setToast(''), 2500);
  }
  function handleUnlock() {
    unlockKelas(activeKelasId, periode);
    setConfirmUnlock(false);
    setToast(`Edit mode aktif untuk ${activeKelas?.label} ${periode}`);
    setTimeout(() => setToast(''), 2500);
  }

  const kelaIdx = kelasList.findIndex(k => k.id === activeKelasId);
  const isFirst = kelaIdx === 0;
  const isLast  = kelaIdx === kelasList.length - 1;
  const prevKelas = () => { if (!isFirst) setActiveKelasId(kelasList[kelaIdx - 1].id); };
  const nextKelas = () => { if (!isLast)  setActiveKelasId(kelasList[kelaIdx + 1].id); };

  const kelasSummary = useMemo(() => kelasList.map(k => {
    const siswa = students.filter(s => s.kelasId === k.id);
    const ujianK = ujian.filter(u => u.kelasId === k.id && u.periode === periode);
    const totalS = siswa.length * ujianK.length;
    const totalI = siswa.reduce((acc, s) =>
      acc + ujianK.filter(u => { const v = ujianNilai[u.id]?.[s.id]; return v != null && v !== ''; }).length
    , 0);
    return { ...k, jumlahSiswa: siswa.length, jumlahUjian: ujianK.length, totalSel: totalS, totalIsi: totalI, locked: locks[k.id]?.[periode] === true };
  }), [kelasList, students, ujian, ujianNilai, locks, periode]);

  const tipeBadge = (tipe) => tipe === 'Praktik' ? 'b-violet' : tipe === 'Kustom' ? 'b-gold' : 'b-blue';

  const GROUP_ORDER = ['Praktik', 'Tertulis', 'Kustom'];
  const GROUP_STYLE = {
    Praktik:  { bg: '#3b0764', color: '#e9d5ff' },
    Tertulis: { bg: '#0d4842', color: '#ccfbf1' },
    Kustom:   { bg: '#78350f', color: '#fef3c7' },
  };
  const grouped = GROUP_ORDER
    .map(tipe => ({ tipe, items: ujianKelas.filter(u => u.tipe === tipe) }))
    .filter(g => g.items.length > 0);
  const ujianOrdered = grouped.flatMap(g => g.items);

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
          <HistoryBanner />
        <header className="topbar">
          <div>
            <h1>Input Nilai</h1>
            <div className="crumb">Entri nilai ujian per kelas</div>
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
              <span className="lg"><span className="badge b-violet" style={{fontSize:10,padding:'2px 7px'}}>Praktik</span></span>
              <span className="lg"><span className="badge b-blue" style={{fontSize:10,padding:'2px 7px'}}>Tertulis</span></span>
              <span className="lg"><span className="badge b-gold" style={{fontSize:10,padding:'2px 7px'}}>Kustom</span> tidak dihitung</span>
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
                  <div className="cm">{k.jumlahSiswa} santri · {k.jumlahUjian} ujian</div>
                  {k.locked ? (
                    <div className="avg" style={{fontSize:10,color:'#16a34a',fontWeight:800}}>✅ Published</div>
                  ) : k.totalSel > 0 && (
                    done
                      ? <div className="avg score hi" style={{fontSize:10}}>✓ Lengkap</div>
                      : <div className="avg score mid" style={{fontSize:10}}>{pct}%</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="card" style={{overflow:'hidden'}}>
            {locked && (
              <div className="lock-banner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>
                Nilai {activeKelas?.label} {periode} sudah dipublikasi — hanya baca
                {!isHistory && <button className="lock-banner-btn" onClick={() => setConfirmUnlock(true)}>Edit</button>}
              </div>
            )}
            <div className="card-head">
              <div>
                <h3>{lembaga} · {activeKelas?.label} — T.A. 2025/2026</h3>
                <div className="sub">Wali kelas: {activeKelas?.wali} · Kustom tidak masuk rata-rata</div>
              </div>
              <div className="spacer"/>
              {ujianKelas.length > 0 && totalSel - totalIsi > 0 && !locked && (
                <span className="badge b-amber"><span className="dot"/>{totalSel - totalIsi} sel belum terisi</span>
              )}
              {ujianKelas.length > 0 && totalSel > 0 && totalIsi === totalSel && (
                <span className="badge b-green"><span className="dot"/> Semua terisi</span>
              )}
              {!locked && !isHistory && (
                <button className="btn publish-btn" onClick={handleLock}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Publish
                </button>
              )}
            </div>

            {ujianKelas.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="M9 12h6M9 16h4"/>
                </svg>
                <p>Belum ada ujian untuk kelas ini</p>
                <a href="/ujian" className="btn sm">Buat Ujian di Menu Ujian</a>
              </div>
            ) : (
              <div className="grade-wrap">
                <table className="grade">
                  <thead>
                    <tr>
                      <th className="sticky-th" rowSpan={2} style={{textAlign:'left',padding:'9px 14px',minWidth:240,verticalAlign:'bottom',borderBottom:'1px solid var(--line)'}}>
                        Santri
                      </th>
                      {grouped.map(g => (
                        <th key={g.tipe} colSpan={g.items.length} className="mapel-th"
                          style={{background: GROUP_STYLE[g.tipe].bg, color: GROUP_STYLE[g.tipe].color}}>
                          {g.tipe}
                        </th>
                      ))}
                      <th rowSpan={2} className="mapel-th" style={{background:'#1e293b',color:'#fff',minWidth:88,verticalAlign:'bottom'}}>
                        Nilai<br/>Akhir
                      </th>
                    </tr>
                    <tr>
                      {ujianOrdered.map(u => (
                        <th key={u.id} className="sub-th" style={{minWidth: u.tipe === 'Kustom' ? 140 : 80, background: GROUP_STYLE[u.tipe].bg + '22'}}>
                          {u.nama}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kelasSiswa.length === 0 ? (
                      <tr><td colSpan={ujianOrdered.length + 2} style={{textAlign:'center',padding:32,color:'var(--muted)'}}>
                        Belum ada santri — tambah dari halaman Siswa &amp; Kelas
                      </td></tr>
                    ) : kelasSiswa.map((s, idx) => {
                      const na = getNilaiAkhir(s.id);
                      return (
                        <tr key={s.id}>
                          <td className="sticky-td">
                            <div className="who-cell">
                              <span className="index-badge">{idx + 1}</span>
                              <div><b>{s.nama}</b></div>
                            </div>
                          </td>
                          {ujianOrdered.map(u => {
                            const val = ujianNilai[u.id]?.[s.id];
                            const isEmpty = val == null || val === '';
                            const isKustom = u.tipe === 'Kustom';
                            return (
                              <td key={u.id} className={isEmpty ? 'empty' : ''}>
                                <input
                                  key={`${s.id}-${u.id}-${activeKelasId}`}
                                  className="cell-in"
                                  defaultValue={val ?? ''}
                                  placeholder="—"
                                  type={isKustom ? 'text' : 'number'}
                                  min={isKustom ? undefined : 0}
                                  max={isKustom ? undefined : 100}
                                  disabled={locked || isHistory}
                                  style={isKustom ? {textAlign:'left',paddingLeft:8,fontSize:12} : {}}
                                  onBlur={e => {
                                    if (locked || isHistory) return;
                                    if (!isKustom && e.target.value !== '') {
                                      const clamped = Math.min(100, Math.max(0, Number(e.target.value)));
                                      e.target.value = isNaN(clamped) ? '' : clamped;
                                    }
                                    handleInput(u.id, s.id, e.target.value, isKustom);
                                  }}
                                />
                              </td>
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
                      {ujianOrdered.map(u => {
                        const avg = u.tipe !== 'Kustom' ? getColAvg(u.id) : null;
                        return (
                          <td key={u.id} style={{textAlign:'center',color:'var(--brand-700)'}}>
                            {avg ?? (u.tipe === 'Kustom' ? <span className="muted" style={{fontSize:11}}>—</span> : '—')}
                          </td>
                        );
                      })}
                      <td style={{textAlign:'center',color:'var(--brand-700)',fontSize:14}}>{getKelasNilaiAkhir() ?? '—'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
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
            {!locked && !isHistory && (
              <button className="btn primary" onClick={handleLock}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Publish
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmUnlock && (
        <div className="modal-overlay" onClick={() => setConfirmUnlock(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:400}}>
            <h3 style={{margin:'0 0 10px'}}>Batalkan Publish & Edit Nilai?</h3>
            <p style={{margin:'0 0 20px',fontSize:14,color:'var(--ink-2)'}}>
              Nilai <b>{activeKelas?.label} {periode}</b> akan dapat diedit kembali. Pastikan ada alasan yang valid untuk membuka kunci.
            </p>
            <div className="form-actions">
              <button className="btn ghost" onClick={() => setConfirmUnlock(false)}>Batal</button>
              <button className="btn" style={{background:'var(--amber)',color:'#fff'}} onClick={handleUnlock}>Ya, Edit Kembali</button>
            </div>
          </div>
        </div>
      )}

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
