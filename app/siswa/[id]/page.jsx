'use client';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import HistoryBanner from '../../components/HistoryBanner';
import { useStore } from '../../store';
import { getInitials } from '../../../lib/data';

const STATUS_BADGE   = { Aktif: 'b-green', Lulus: 'b-violet', Keluar: 'b-red', 'Dalam Pantauan': 'b-amber' };
const HURUF_COLOR    = { A: '#0d9488', B: '#2563eb', C: '#d97706', D: '#dc2626', E: '#7f1d1d' };
const KENAIKAN_BADGE = { Naik: 'b-green', 'Tidak Naik': 'b-amber', Lulus: 'b-violet' };

function scoreClass(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  return n >= 85 ? 'hi' : n >= 75 ? 'mid' : 'lo';
}

export default function DetailSiswaPage() {
  const { id } = useParams();
  const router = useRouter();
  const { history, currentTaLabel, currentTaData } = useStore();

  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [periode, setPeriode] = useState('UTS');

  // Build all T.A. entries for this student: current first, then history newest→oldest
  const taEntries = useMemo(() => {
    const entries = [];

    // Current T.A.
    const cur = currentTaData.students.find(s => s.id === id);
    if (cur) {
      const k = currentTaData.kelas.find(k => k.id === cur.kelasId);
      entries.push({
        taLabel: currentTaLabel,
        isCurrent: true,
        student: cur,
        kelas: k ?? null,
        ujian: currentTaData.ujian,
        ujianNilai: currentTaData.ujianNilai,
        karakter: currentTaData.karakter,
        kenaikan: currentTaData.kenaikan,
        kenaikanTarget: currentTaData.kenaikanTarget,
      });
    }

    // History snapshots (most recent first)
    ;[...history].reverse().forEach(snap => {
      const s = snap.students?.find(st => st.id === id);
      if (s) {
        const k = snap.kelas?.find(k => k.id === s.kelasId);
        entries.push({
          taLabel: snap.label,
          isCurrent: false,
          student: s,
          kelas: k ?? null,
          ujian: snap.ujian ?? [],
          ujianNilai: snap.ujianNilai ?? {},
          karakter: snap.karakter ?? {},
          kenaikan: snap.kenaikan ?? {},
          kenaikanTarget: snap.kenaikanTarget ?? {},
        });
      }
    });

    return entries;
  }, [id, history, currentTaLabel, currentTaData]);

  const entry = taEntries[activeTabIdx] ?? null;
  const student = entry?.student ?? null;

  const ujianList = useMemo(() => {
    if (!entry) return [];
    return entry.ujian.filter(u => u.kelasId === student?.kelasId && u.periode === periode);
  }, [entry, student, periode]);

  const grupUjian = useMemo(() => ({
    Praktik:  ujianList.filter(u => u.tipe === 'Praktik'),
    Tertulis: ujianList.filter(u => u.tipe === 'Tertulis'),
    Kustom:   ujianList.filter(u => u.tipe === 'Kustom'),
  }), [ujianList]);

  const rataRata = useMemo(() => {
    if (!entry || !student) return null;
    const counted = ujianList.filter(u => u.tipe !== 'Kustom');
    const vals = counted.map(u => entry.ujianNilai[u.id]?.[id]).filter(v => v != null && v !== '');
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length * 10) / 10 : null;
  }, [entry, student, ujianList, id]);

  const karSiswa = entry ? (entry.karakter[id]?.[periode] ?? {}) : {};
  const kenaikanStatus = entry?.kenaikan[id];
  const kenaikanTargetVal = entry?.kenaikanTarget[id];

  if (taEntries.length === 0) {
    return (
      <div className="app">
        <Sidebar />
        <div className="main">
          <div className="content" style={{paddingTop:60,textAlign:'center'}}>
            <p className="muted">Siswa tidak ditemukan.</p>
            <button className="btn ghost" style={{marginTop:12}} onClick={() => router.back()}>← Kembali</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <HistoryBanner />
        <header className="topbar">
          <button className="btn ghost sm" onClick={() => router.back()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="15" height="15">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Kembali
          </button>
          <div className="spacer"/>
        </header>

        <div className="content">

          {/* Profile hero */}
          <div className="card sd-hero">
            <div className="sd-avatar" style={{background: student?.color ?? '#0d9488'}}>
              {getInitials(student?.nama ?? '')}
            </div>
            <div className="sd-info">
              <div className="sd-name">{student?.nama}</div>
              <div className="sd-meta">
                <span className="badge b-teal" style={{fontSize:12}}>NIS {id}</span>
                {student?.status && (
                  <span className={`badge ${STATUS_BADGE[student.status] ?? 'b-teal'}`} style={{fontSize:12}}>{student.status}</span>
                )}
                {student?.gender && (
                  <span className={`badge ${student.gender==='L'?'b-blue':'b-violet'}`} style={{fontSize:12}}>
                    {student.gender==='L' ? 'Laki-laki' : 'Perempuan'}
                  </span>
                )}
              </div>
              <div className="sd-details">
                {student?.waliSantri && (
                  <div className="sd-detail-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="15" height="15">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    Wali: {student.waliSantri}
                  </div>
                )}
                {student?.lahir && (
                  <div className="sd-detail-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="15" height="15">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                    {student.lahir}
                  </div>
                )}
              </div>
            </div>
            {rataRata !== null && (
              <div className="sd-score-box">
                <div className={`sd-score score ${scoreClass(rataRata)}`}>{rataRata}</div>
                <div className="sd-score-label">Rata-rata · {periode}</div>
              </div>
            )}
          </div>

          {/* Kelas tabs */}
          <div className="sv-tabs" style={{marginBottom:16}}>
            {taEntries.map((e, i) => (
              <button
                key={i}
                className={`sv-tab${activeTabIdx === i ? ' active' : ''}`}
                onClick={() => setActiveTabIdx(i)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="13" height="13">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                </svg>
                {e.kelas ? `${e.kelas.lembaga} · ${e.kelas.label}` : 'Kelas tidak diketahui'}
                <span className="sv-tab-count" style={{fontWeight:600}}>{e.taLabel}</span>
                {e.isCurrent && <span style={{fontSize:10,opacity:.7}}>●</span>}
              </button>
            ))}
          </div>

          {/* Kelas info bar */}
          {entry?.kelas && (
            <div className="sd-kelas-bar">
              <div className="kn b-teal" style={{width:32,height:32,borderRadius:8,fontSize:13}}>{entry.kelas.nomor}</div>
              <div>
                <b>{entry.kelas.lembaga} · {entry.kelas.label}</b>
                {entry.kelas.wali && <span className="muted" style={{fontSize:13}}> — Wali Kelas: {entry.kelas.wali}</span>}
              </div>
              <span className="badge b-teal" style={{marginLeft:'auto',fontSize:12}}>T.A. {entry.taLabel}</span>
              {!entry.isCurrent && <span className="badge b-amber" style={{fontSize:11}}>Arsip</span>}
            </div>
          )}

          <div className="sd-grid">
            {/* Nilai */}
            <div className="card">
              <div className="card-head">
                <h3>Nilai Ujian</h3>
                <div className="spacer"/>
                {rataRata !== null && (
                  <div className="row" style={{gap:6,alignItems:'center'}}>
                    <span className="muted" style={{fontSize:12}}>Rata-rata</span>
                    <span className={`score ${scoreClass(rataRata)}`} style={{fontSize:16}}>{rataRata}</span>
                  </div>
                )}
                <div className="seg gold" style={{marginLeft:12}}>
                  <button className={periode==='UTS'?'on':''} onClick={() => setPeriode('UTS')}>UTS</button>
                  <button className={periode==='UAS'?'on':''} onClick={() => setPeriode('UAS')}>UAS</button>
                </div>
              </div>
              <div className="card-pad" style={{padding:0}}>
                {ujianList.length === 0 ? (
                  <div className="empty-state" style={{padding:'32px 0'}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" width="36" height="36">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                    <p>Belum ada ujian untuk periode {periode}</p>
                  </div>
                ) : (
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Nama Ujian</th>
                        <th style={{width:80}}>Tipe</th>
                        <th style={{width:90}}>Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Praktik','Tertulis','Kustom'].map(tipe => {
                        const list = grupUjian[tipe];
                        if (list.length === 0) return null;
                        return [
                          <tr key={`hdr-${tipe}`}>
                            <td colSpan={3} style={{background:'var(--line-2)',fontWeight:700,fontSize:11,color:'var(--muted)',letterSpacing:'.05em',padding:'6px 16px',textTransform:'uppercase'}}>
                              {tipe}
                            </td>
                          </tr>,
                          ...list.map(u => {
                            const val = entry.ujianNilai[u.id]?.[id];
                            return (
                              <tr key={u.id}>
                                <td>{u.nama}</td>
                                <td>
                                  <span className={`badge ${tipe==='Praktik'?'b-teal':tipe==='Tertulis'?'b-blue':'b-amber'}`} style={{fontSize:10}}>
                                    {tipe}
                                  </span>
                                </td>
                                <td className="num">
                                  {val != null && val !== ''
                                    ? u.tipe === 'Kustom'
                                      ? <span style={{fontSize:13,fontWeight:600}}>{val}</span>
                                      : <span className={`score ${scoreClass(val)}`}>{val}</span>
                                    : <span className="muted">—</span>
                                  }
                                </td>
                              </tr>
                            );
                          })
                        ];
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              {/* Akhlaq & Kehadiran */}
              <div className="card">
                <div className="card-head">
                <h3>Akhlaq &amp; Kehadiran</h3>
                <div className="spacer"/>
                <span className="badge b-teal" style={{fontSize:11}}>{periode}</span>
              </div>
                <div className="card-pad" style={{display:'flex',flexDirection:'column',gap:14}}>
                  {[
                    {id:'akhlaq',    label:'Akhlaq'},
                    {id:'kerajinan', label:'Kerajinan'},
                    {id:'kerapihan', label:'Kerapihan'},
                  ].map(col => {
                    const val = karSiswa[col.id];
                    return (
                      <div key={col.id} className="row between" style={{alignItems:'center'}}>
                        <span style={{fontSize:13,fontWeight:600,color:'var(--ink-2)'}}>{col.label}</span>
                        {val
                          ? <span className="badge" style={{background:HURUF_COLOR[val]+'22',color:HURUF_COLOR[val],fontWeight:800,fontSize:14,padding:'4px 14px'}}>{val}</span>
                          : <span className="muted" style={{fontSize:13}}>—</span>
                        }
                      </div>
                    );
                  })}
                  <hr style={{border:'none',borderTop:'1px solid var(--line-2)',margin:'4px 0'}}/>
                  {[
                    {id:'izin',      label:'Tidak Masuk — Dengan Izin'},
                    {id:'tanpaIzin', label:'Tidak Masuk — Tanpa Izin'},
                  ].map(col => {
                    const val = karSiswa[col.id];
                    return (
                      <div key={col.id} className="row between" style={{alignItems:'center'}}>
                        <span style={{fontSize:13,fontWeight:600,color:'var(--ink-2)'}}>{col.label}</span>
                        {val != null && val !== ''
                          ? <span style={{fontWeight:800,fontSize:15,color:Number(val)>0?'var(--amber)':'var(--green)'}}>{val} hari</span>
                          : <span className="muted" style={{fontSize:13}}>—</span>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kenaikan (UAS only) */}
              {periode === 'UAS' && (
                <div className="card">
                  <div className="card-head"><h3>Status Kenaikan</h3><span className="badge b-amber" style={{fontSize:11,marginLeft:8}}>UAS</span></div>
                  <div className="card-pad" style={{display:'flex',flexDirection:'column',gap:12}}>
                    <div className="row between" style={{alignItems:'center'}}>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--ink-2)'}}>Status</span>
                      {kenaikanStatus
                        ? <span className={`badge ${KENAIKAN_BADGE[kenaikanStatus]}`} style={{fontSize:13,padding:'5px 14px'}}>{kenaikanStatus}</span>
                        : <span className="muted" style={{fontSize:13}}>Belum ditentukan</span>
                      }
                    </div>
                    {kenaikanStatus && kenaikanStatus !== 'Lulus' && (
                      <div className="row between" style={{alignItems:'center'}}>
                        <span style={{fontSize:13,fontWeight:600,color:'var(--ink-2)'}}>
                          {kenaikanStatus === 'Naik' ? 'Naik ke Kelas' : 'Tetap di Kelas'}
                        </span>
                        <span style={{fontWeight:700,fontSize:13,color:'var(--ink)'}}>
                          {kenaikanTargetVal ?? (entry?.kelas?.label ?? '—')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
