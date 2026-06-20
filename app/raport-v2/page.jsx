'use client';
import { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';

const MAX_PRAKTIK  = 6;
const MAX_KUSTOM   = 2;
const MAX_TERTULIS = 8;

const today = new Date();
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const TODAY_STR = `${today.getDate()} ${BULAN[today.getMonth()]} ${today.getFullYear()}`;

const A4_PRINT_STYLE = `
  @page { size: A4; margin: 0; }
  @media print {
    body > * { display: none !important; }
    .sheet-area { display: flex !important; padding: 0 !important; }
    .stage { background: #fff !important; }
    .print-bar { display: none !important; }
    .sidebar { display: none !important; }
    .rv2-sheet { display: block !important; }
  }
`;

export default function RaportV2Page() {
  const {
    lembaga, setLembaga, periode, setPeriode,
    students, kelas: kelasList, ujian, ujianNilai,
    karakter, kenaikan, kenaikanTarget, currentTaLabel,
  } = useStore();

  const [activeKelasId, setActiveKelasId] = useState(() => kelasList.find(k => k.lembaga === 'TPQ')?.id ?? '');
  const [activeStudentId, setActiveStudentId] = useState('');
  const [cfgOpen, setCfgOpen] = useState(false);
  const [kota, setKota] = useState('Kediri');
  const [namaPimpinan, setNamaPimpinan] = useState('KH. Abdul Wahab, S.Ag.');
  const [judulPraktik, setJudulPraktik] = useState('A. Ujian Praktik');
  const [judulKitabah, setJudulKitabah] = useState('B. Ujian Kitabah');
  const [labelTtd1, setLabelTtd1] = useState('Wali Kelas');
  const [labelTtd2, setLabelTtd2] = useState('Pimpinan');
  const [labelTtd3, setLabelTtd3] = useState('Orang Tua / Wali Santri');

  const handleLembaga = (l) => {
    setLembaga(l);
    const first = kelasList.find(k => k.lembaga === l);
    setActiveKelasId(first?.id ?? '');
    setActiveStudentId('');
  };

  const handleKelasChange = (kelasId) => {
    setActiveKelasId(kelasId);
    setActiveStudentId('');
  };

  const kelasSiswa = useMemo(
    () => students.filter(s => s.kelasId === activeKelasId && s.status !== 'Lulus'),
    [students, activeKelasId]
  );
  const student = students.find(s => s.id === activeStudentId) ?? kelasSiswa[0] ?? null;
  const kelas   = kelasList.find(k => k.id === activeKelasId) ?? null;
  const studentIdx = kelasSiswa.findIndex(s => s.id === student?.id);

  const prevStudent = () => { if (studentIdx > 0) setActiveStudentId(kelasSiswa[studentIdx - 1].id); };
  const nextStudent = () => { if (studentIdx < kelasSiswa.length - 1) setActiveStudentId(kelasSiswa[studentIdx + 1].id); };

  // Ujian list for this kelas & periode, grouped by tipe
  const ujianKelas = useMemo(
    () => ujian.filter(u => u.kelasId === activeKelasId && u.periode === periode),
    [ujian, activeKelasId, periode]
  );
  const ujianPraktik  = ujianKelas.filter(u => u.tipe === 'Praktik').slice(0, MAX_PRAKTIK);
  const ujianKustom   = ujianKelas.filter(u => u.tipe === 'Kustom').slice(0, MAX_KUSTOM);
  const ujianTertulis = ujianKelas.filter(u => u.tipe === 'Tertulis').slice(0, MAX_TERTULIS);

  // Nilai helpers
  const getNilai = (ujianId) => {
    if (!student) return null;
    const v = ujianNilai[ujianId]?.[student.id];
    return (v != null && v !== '') ? v : null;
  };

  const numVal = (ujianId) => {
    const v = getNilai(ujianId);
    return v !== null ? Number(v) : null;
  };

  // Jumlah & rata-rata (non-kustom only)
  const { jumlah, rataRata } = useMemo(() => {
    const counted = [...ujianPraktik, ...ujianTertulis];
    const vals = counted.map(u => numVal(u.id)).filter(v => v !== null);
    if (vals.length === 0) return { jumlah: null, rataRata: null };
    const j = vals.reduce((a, b) => a + b, 0);
    return { jumlah: Math.round(j * 10) / 10, rataRata: Math.round(j / vals.length * 10) / 10 };
  }, [ujianPraktik, ujianTertulis, ujianNilai, student]);

  // Peringkat dalam kelas (by rata-rata non-kustom)
  const peringkat = useMemo(() => {
    if (!student) return null;
    const getRata = (sid) => {
      const counted = [...ujianPraktik, ...ujianTertulis];
      const vals = counted.map(u => {
        const v = ujianNilai[u.id]?.[sid];
        return (v != null && v !== '') ? Number(v) : null;
      }).filter(v => v !== null);
      return vals.length > 0 ? vals.reduce((a,b) => a+b, 0) / vals.length : 0;
    };
    const sorted = kelasSiswa.map(s => ({ id: s.id, rata: getRata(s.id) })).sort((a,b) => b.rata - a.rata);
    const rank = sorted.findIndex(s => s.id === student.id) + 1;
    return rank > 0 ? rank : null;
  }, [kelasSiswa, ujianPraktik, ujianTertulis, ujianNilai, student]);

  // Karakter
  const kar = karakter[student?.id]?.[periode] ?? {};
  const kenaikanStatus = kenaikan[student?.id];
  const kenaikanTargetVal = kenaikanTarget[student?.id];

  const scoreColor = (v) => {
    if (v == null) return {};
    const n = Number(v);
    return n >= 85 ? { color:'#065f46', fontWeight:800 } : n >= 75 ? { color:'#1e40af', fontWeight:700 } : { color:'#991b1b', fontWeight:700 };
  };

  const filteredKelas = kelasList.filter(k => k.lembaga === lembaga);

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <style>{A4_PRINT_STYLE}</style>
        <HistoryBanner />
        <div className="stage">

          {/* Config panel */}
          {cfgOpen && (
            <div className="print-bar" style={{flexWrap:'wrap',gap:10,paddingBottom:12,borderBottom:'1px solid rgba(255,255,255,.1)'}}>
              {[
                ['Kota / Tempat', kota, setKota],
                ['Nama Pimpinan', namaPimpinan, setNamaPimpinan],
                ['Judul Tabel 1', judulPraktik, setJudulPraktik],
                ['Judul Tabel 2', judulKitabah, setJudulKitabah],
                ['Label TTD 1', labelTtd1, setLabelTtd1],
                ['Label TTD 2', labelTtd2, setLabelTtd2],
                ['Label TTD 3', labelTtd3, setLabelTtd3],
              ].map(([label, val, setter]) => (
                <label key={label} style={{display:'flex',flexDirection:'column',gap:4}}>
                  <span style={{fontSize:10,color:'#9fb6c4',fontWeight:600,letterSpacing:'.04em'}}>{label}</span>
                  <input
                    value={val}
                    onChange={e => setter(e.target.value)}
                    style={{background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',fontSize:12,padding:'6px 10px',borderRadius:7,outline:'none',minWidth:140}}
                  />
                </label>
              ))}
            </div>
          )}

          {/* Print bar */}
          <div className="print-bar">
            <div className="seg" style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',borderRadius:9,padding:3,gap:2,display:'inline-flex'}}>
              {['TPQ','Madin'].map(l => (
                <button key={l} onClick={() => handleLembaga(l)} style={{border:0,background:lembaga===l?'#fff':'transparent',color:lembaga===l?'#0f172a':'#9fb6c4',fontWeight:700,fontSize:12.5,padding:'6px 12px',borderRadius:7,cursor:'pointer'}}>{l}</button>
              ))}
            </div>
            <select value={activeKelasId} onChange={e => handleKelasChange(e.target.value)} style={{background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',fontWeight:700,fontSize:13,padding:'8px 12px',borderRadius:9,cursor:'pointer',outline:'none'}}>
              {filteredKelas.map(k => <option key={k.id} value={k.id} style={{color:'#000'}}>{k.label}</option>)}
            </select>
            <select value={student?.id ?? ''} onChange={e => setActiveStudentId(e.target.value)} style={{background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',fontWeight:700,fontSize:13,padding:'8px 12px',borderRadius:9,cursor:'pointer',outline:'none',minWidth:200}}>
              {kelasSiswa.map(s => <option key={s.id} value={s.id} style={{color:'#000'}}>{s.nama}</option>)}
            </select>
            <div>
              <div className="pb-title">{student?.nama ?? '—'}</div>
              <div className="pb-sub">{lembaga} · {kelas?.label} · {periode} · T.A. {currentTaLabel}</div>
            </div>
            <div className="spacer"/>
            <div className="pb-seg">
              <button className={periode==='UTS'?'on':''} onClick={() => setPeriode('UTS')}>UTS</button>
              <button className={periode==='UAS'?'on':''} onClick={() => setPeriode('UAS')}>UAS</button>
            </div>
            <button className="pb-btn" disabled={studentIdx <= 0} onClick={prevStudent}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M15 18l-6-6 6-6"/></svg>
              Sebelumnya
            </button>
            <button className="pb-btn" disabled={studentIdx >= kelasSiswa.length - 1} onClick={nextStudent}>
              Berikutnya
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <button className="pb-btn" onClick={() => setCfgOpen(o => !o)} style={cfgOpen ? {background:'rgba(255,255,255,.2)'} : {}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 00-2.3-1.3L14 3h-4l-.3 2.2A7 7 0 007.4 6.5l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-1c.7.5 1.5.9 2.3 1.3L10 21h4l.3-2.2c.8-.3 1.6-.7 2.3-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z"/></svg>
              Konfigurasi
            </button>
            <button className="pb-btn" onClick={() => window.print()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"/></svg>
              Cetak
            </button>
          </div>

          {/* A4 Sheet */}
          <div className="sheet-area">
            {!student ? (
              <div style={{display:'grid',placeItems:'center',minHeight:'60vh',color:'#9fb6c4',fontSize:15}}>
                Pilih kelas dan santri untuk melihat raport.
              </div>
            ) : (
              <div className="sheet rv2-sheet">

                {/* Identity 2-col */}
                <div className="ident">
                  <div className="ir"><span className="k">Nama Santri</span><span className="v">{student.nama}</span></div>
                  <div className="ir"><span className="k">Kelas</span><span className="v">{lembaga} {kelas?.label}</span></div>
                  <div className="ir"><span className="k">NIS</span><span className="v">{student.id}</span></div>
                  <div className="ir"><span className="k">Tahun Ajaran</span><span className="v">{currentTaLabel}</span></div>
                  <div className="ir"><span className="k">Semester</span><span className="v">{periode === 'UTS' ? 'Ganjil (I)' : 'Genap (II)'}</span></div>
                </div>

                {/* Nilai table */}
                <table className="rapor rv2-tbl">
                  <thead>
                    <tr>
                      <th className="c no" style={{width:28}}>No</th>
                      <th>Mata Pelajaran / Ujian</th>
                      <th className="c" style={{width:60}}>Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* PRAKTIK section */}
                    <tr className="rv2-section-hdr">
                      <td colSpan={3}>{judulPraktik}</td>
                    </tr>
                    {Array.from({length: MAX_PRAKTIK}).map((_, i) => {
                      const u = ujianPraktik[i];
                      const val = u ? getNilai(u.id) : null;
                      return (
                        <tr key={`p-${i}`} className={!u ? 'rv2-empty' : ''}>
                          <td className="c no">{i + 1}</td>
                          <td>{u?.nama ?? ''}</td>
                          <td className="c" style={val !== null ? scoreColor(val) : {}}>{val ?? (u ? '—' : '')}</td>
                        </tr>
                      );
                    })}

                    {/* KUSTOM rows — langsung di bawah Praktik, tanpa section header */}
                    {ujianKustom.map((u, i) => {
                      const val = getNilai(u.id);
                      return (
                        <tr key={`k-${i}`}>
                          <td className="c no">{MAX_PRAKTIK + i + 1}</td>
                          <td>{u.nama}</td>
                          <td className="c" style={{fontStyle:'normal', fontSize:11}}>{val ?? '—'}</td>
                        </tr>
                      );
                    })}

                    {/* TERTULIS section */}
                    <tr className="rv2-section-hdr">
                      <td colSpan={3}>{judulKitabah}</td>
                    </tr>
                    {Array.from({length: MAX_TERTULIS}).map((_, i) => {
                      const u = ujianTertulis[i];
                      const val = u ? getNilai(u.id) : null;
                      return (
                        <tr key={`t-${i}`} className={!u ? 'rv2-empty' : ''}>
                          <td className="c no">{i + 1}</td>
                          <td>{u?.nama ?? ''}</td>
                          <td className="c" style={val !== null ? scoreColor(val) : {}}>{val ?? (u ? '—' : '')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="rv2-foot">
                      <td colSpan={2} style={{textAlign:'right',paddingRight:12}}>Jumlah Nilai</td>
                      <td className="c" style={{fontWeight:800}}>{jumlah ?? '—'}</td>
                    </tr>
                    <tr className="rv2-foot">
                      <td colSpan={2} style={{textAlign:'right',paddingRight:12}}>Rata-rata</td>
                      <td className="c" style={{fontWeight:800, ...(rataRata ? scoreColor(rataRata) : {})}}>{rataRata ?? '—'}</td>
                    </tr>
                    <tr className="rv2-foot">
                      <td colSpan={2} style={{textAlign:'right',paddingRight:12}}>Peringkat di Kelas</td>
                      <td className="c" style={{fontWeight:800,color:'#7c3aed'}}>{peringkat ? `${peringkat} / ${kelasSiswa.length}` : '—'}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Akhlaq & Kehadiran */}
                <div className="rv2-lower">
                  <div className="rv2-akhlaq" style={{display:'flex',gap:10}}>
                    <div style={{flex:1}}>
                      <div className="rv2-box-title">Akhlaq &amp; Kepribadian</div>
                      <table className="rv2-kar-tbl">
                        <tbody>
                          {[
                            {id:'akhlaq',    label:'Akhlaq'},
                            {id:'kerajinan', label:'Kerajinan'},
                            {id:'kerapihan', label:'Kerapihan'},
                          ].map(col => (
                            <tr key={col.id}>
                              <td>{col.label}</td>
                              <td className="c" style={{fontWeight:800,fontSize:13}}>{kar[col.id] ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{flex:1}}>
                      <div className="rv2-box-title">Kehadiran</div>
                      <table className="rv2-kar-tbl">
                        <tbody>
                          <tr>
                            <td>Dengan Izin</td>
                            <td className="c" style={{fontWeight:700}}>{kar.izin != null ? `${kar.izin} hari` : '—'}</td>
                          </tr>
                          <tr>
                            <td>Tanpa Izin</td>
                            <td className="c" style={{fontWeight:700}}>{kar.tanpaIzin != null ? `${kar.tanpaIzin} hari` : '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Kenaikan */}
                  <div className="rv2-kenaikan">
                    <div className="rv2-box-title">Keputusan Kenaikan Kelas</div>
                    <div className="rv2-kenaikan-body">
                      {kenaikanStatus ? (
                        <>
                          <div className={`rv2-kenaikan-status ${kenaikanStatus === 'Naik' ? 'naik' : kenaikanStatus === 'Lulus' ? 'lulus' : 'tinggal'}`}>
                            {kenaikanStatus.toUpperCase()}
                          </div>
                          {kenaikanStatus !== 'Lulus' && (
                            <div style={{fontSize:11,color:'#475569',marginTop:4,textAlign:'center'}}>
                              {kenaikanStatus === 'Naik' ? 'ke' : 'tetap di'} <b>{kenaikanTargetVal ?? kelas?.label ?? '—'}</b>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{fontSize:12,color:'#94a3b8',textAlign:'center'}}>Belum ditentukan</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="rv2-signs">
                  <div className="rv2-sign">
                    <div className="rv2-sign-place">{kota}, {TODAY_STR}</div>
                    <div className="rv2-sign-role">{labelTtd1}</div>
                    <div className="rv2-sign-space"/>
                    <div className="rv2-sign-name">{kelas?.wali ?? '(________________)'}</div>
                  </div>
                  <div className="rv2-sign">
                    <div className="rv2-sign-place">&nbsp;</div>
                    <div className="rv2-sign-role">{labelTtd2}</div>
                    <div className="rv2-sign-space"/>
                    <div className="rv2-sign-name">{namaPimpinan}</div>
                  </div>
                  <div className="rv2-sign">
                    <div className="rv2-sign-place">&nbsp;</div>
                    <div className="rv2-sign-role">{labelTtd3}</div>
                    <div className="rv2-sign-space"/>
                    <div className="rv2-sign-name">({student.waliSantri ?? '________________'})</div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
