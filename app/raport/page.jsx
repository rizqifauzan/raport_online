'use client';
import { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';
import { KELAS, MAPEL, calcRata, getInitials, getPredikat } from '../../lib/data';

export default function RaportPage() {
  const { lembaga, setLembaga, periode, setPeriode, students, grades } = useStore();
  const mapelList = MAPEL[lembaga];
  const kelasList = KELAS.filter(k => k.lembaga === lembaga);

  const [activeKelasId, setActiveKelasId] = useState('tpq-3');
  const [activeStudentId, setActiveStudentId] = useState('24302');

  const kelasSiswa = useMemo(() => students.filter(s => s.kelasId === activeKelasId), [students, activeKelasId]);
  const student = students.find(s => s.id === activeStudentId) ?? kelasSiswa[0];
  const kelas = KELAS.find(k => k.id === activeKelasId);

  const studentIdx = kelasSiswa.findIndex(s => s.id === student?.id);

  const handleLembaga = (l) => {
    setLembaga(l);
    const newKelas = KELAS.filter(k => k.lembaga === l);
    const firstKelas = newKelas[0];
    setActiveKelasId(firstKelas?.id ?? '');
    const firstStudent = students.find(s => s.kelasId === firstKelas?.id);
    setActiveStudentId(firstStudent?.id ?? '');
  };

  const handleKelasChange = (kelasId) => {
    setActiveKelasId(kelasId);
    const firstStudent = students.find(s => s.kelasId === kelasId);
    setActiveStudentId(firstStudent?.id ?? '');
  };

  const prevStudent = () => {
    if (studentIdx > 0) setActiveStudentId(kelasSiswa[studentIdx - 1].id);
  };
  const nextStudent = () => {
    if (studentIdx < kelasSiswa.length - 1) setActiveStudentId(kelasSiswa[studentIdx + 1].id);
  };

  const nilaiRows = useMemo(() => {
    if (!student) return [];
    return mapelList.map(m => {
      const entry = grades[student.id]?.[m.id]?.[periode];
      const rata = entry ? calcRata(entry) : null;
      return { ...m, p: entry?.p ?? null, t: entry?.t ?? null, rata };
    });
  }, [student, mapelList, grades, periode]);

  const rataAkhir = useMemo(() => {
    const ratas = nilaiRows.map(r => r.rata).filter(v => v !== null);
    return ratas.length > 0 ? Math.round(ratas.reduce((a,b)=>a+b,0)/ratas.length * 10) / 10 : null;
  }, [nilaiRows]);

  const predAkhir = getPredikat(rataAkhir);

  const kenaikanStatus = rataAkhir === null ? 'tinjau' : rataAkhir >= 75 ? 'naik' : rataAkhir >= 65 ? 'tinjau' : 'tinggal';
  const kelasNaik = kelas ? `${lembaga} ${kelas.nomor < kelasList.length ? KELAS.find(k=>k.id===kelasList[kelas.nomor]?.id)?.label ?? 'Lulus' : 'Lulus'}` : '';

  const today = new Date();
  const tanggalStr = `Kediri, ${today.getDate()} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][today.getMonth()]} ${today.getFullYear()}`;

  if (!student) {
    return (
      <div className="app">
        <Sidebar />
        <div className="main">
          <div className="stage">
            <div style={{display:'grid',placeItems:'center',minHeight:'60vh',color:'var(--muted)',fontSize:15}}>
              Pilih kelas dan santri untuk melihat raport.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="stage">
          {/* Print bar */}
          <div className="print-bar">
            <div className="seg" style={{background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.15)',borderRadius:9,padding:3,gap:2,display:'inline-flex'}}>
              <button className={lembaga==='TPQ' ? 'on' : ''} style={{border:0,background:lembaga==='TPQ'?'#fff':'transparent',color:lembaga==='TPQ'?'#0f172a':'#9fb6c4',fontWeight:700,fontSize:12.5,padding:'6px 12px',borderRadius:7,cursor:'pointer'}} onClick={() => handleLembaga('TPQ')}>TPQ</button>
              <button className={lembaga==='Madin' ? 'on' : ''} style={{border:0,background:lembaga==='Madin'?'#fff':'transparent',color:lembaga==='Madin'?'#0f172a':'#9fb6c4',fontWeight:700,fontSize:12.5,padding:'6px 12px',borderRadius:7,cursor:'pointer'}} onClick={() => handleLembaga('Madin')}>Madin</button>
            </div>
            <select
              value={activeKelasId}
              onChange={e => handleKelasChange(e.target.value)}
              style={{background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',fontWeight:700,fontSize:13,padding:'8px 12px',borderRadius:9,cursor:'pointer',outline:'none'}}
            >
              {kelasList.map(k => <option key={k.id} value={k.id} style={{color:'#000'}}>{k.label}</option>)}
            </select>
            <select
              value={student?.id ?? ''}
              onChange={e => setActiveStudentId(e.target.value)}
              style={{background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',fontWeight:700,fontSize:13,padding:'8px 12px',borderRadius:9,cursor:'pointer',outline:'none',minWidth:200}}
            >
              {kelasSiswa.map(s => <option key={s.id} value={s.id} style={{color:'#000'}}>{s.nama}</option>)}
            </select>
            <div>
              <div className="pb-title">{student?.nama}</div>
              <div className="pb-sub">{lembaga} · {kelas?.label} · {periode} Genap 2025/2026</div>
            </div>
            <div className="spacer"/>
            <div className="pb-seg">
              <button className={periode==='UTS'?'on':''} onClick={() => setPeriode('UTS')}>UTS</button>
              <button className={periode==='UAS'?'on':''} onClick={() => setPeriode('UAS')}>UAS</button>
            </div>
            <button className="pb-btn" disabled={studentIdx <= 0} onClick={prevStudent}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              Sebelumnya
            </button>
            <button className="pb-btn" disabled={studentIdx >= kelasSiswa.length-1} onClick={nextStudent}>
              Berikutnya
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <button className="pb-btn" onClick={() => window.print()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"/>
              </svg>
              Cetak
            </button>
            <button className="pb-btn primary" onClick={() => window.print()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" style={{transform:'rotate(45deg) translate(0,0)'}}/>
              </svg>
              Unduh PDF
            </button>
          </div>

          {/* A4 Sheet */}
          <div className="sheet-area">
            <div className="sheet">
              {/* KOP */}
              <div className="kop">
                <div className="seal">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l8 4v5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V7l8-4z"/>
                    <path d="M9.5 12l1.8 1.8L15 10"/>
                  </svg>
                </div>
                <div className="kt">
                  <div className="arab">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
                  <h2>PONDOK PESANTREN AL-HIKMAH</h2>
                  <div className="l1">Taman Pendidikan Al-Qur'an (TPQ)</div>
                  <div className="l2">Jl. KH. Ahmad Dahlan No. 27, Kediri, Jawa Timur · NSPP 411235710089 · Telp. (0354) 771xxx</div>
                </div>
              </div>

              <div className="doc-title">
                <h3>Laporan Hasil Belajar Santri</h3>
                <div className="sub">{periode === 'UTS' ? 'Ujian Tengah Semester (UTS)' : 'Ujian Akhir Semester (UAS)'} — Semester Genap, Tahun Ajaran 2025/2026</div>
              </div>

              {/* Identity */}
              <div className="ident">
                <div className="ir"><span className="k">Nama Santri</span><span className="v">{student.nama}</span></div>
                <div className="ir"><span className="k">Kelas</span><span className="v">{lembaga} {kelas?.label}</span></div>
                <div className="ir"><span className="k">NIS</span><span className="v">{student.id}</span></div>
                <div className="ir"><span className="k">Wali Kelas</span><span className="v">{kelas?.wali}</span></div>
                <div className="ir"><span className="k">Tempat/Tgl Lahir</span><span className="v">{student.lahir}</span></div>
                <div className="ir"><span className="k">Semester</span><span className="v">Genap (II)</span></div>
                <div className="ir"><span className="k">Nama Wali</span><span className="v">{student.waliSantri}</span></div>
                <div className="ir"><span className="k">Tahun Ajaran</span><span className="v">2025 / 2026</span></div>
              </div>

              {/* Grades table */}
              <table className="rapor">
                <thead>
                  <tr>
                    <th className="c no">No</th>
                    <th>Mata Pelajaran</th>
                    <th className="c">Ujian Praktik</th>
                    <th className="c">Ujian Tertulis</th>
                    <th className="c">Nilai Akhir</th>
                    <th className="c">Predikat</th>
                  </tr>
                </thead>
                <tbody>
                  {nilaiRows.map((r, i) => {
                    const pred = getPredikat(r.rata);
                    return (
                      <tr key={r.id}>
                        <td className="no">{i+1}</td>
                        <td>{r.label}</td>
                        <td className="c">{r.p ?? '—'}</td>
                        <td className="c">{r.t ?? '—'}</td>
                        <td className="c akhir">{r.rata ?? '—'}</td>
                        <td className="c">
                          {pred ? <span className={`pred ${pred.cls}`}>{pred.label}</span> : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{textAlign:'right'}}>Rata-rata Nilai Akhir</td>
                    <td className="c">{rataAkhir ?? '—'}</td>
                    <td className="c">
                      {predAkhir ? <span className={`pred ${predAkhir.cls}`}>{predAkhir.label}</span> : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="legend-pred">
                <span><b>Mumtāz</b> 90–100</span>
                <span><b>Jayyid Jiddan</b> 80–89</span>
                <span><b>Jayyid</b> 70–79</span>
                <span><b>Maqbūl</b> 60–69</span>
                <span><b>Rāsib</b> &lt; 60</span>
              </div>

              {/* Lower section */}
              <div className="lower">
                <div>
                  <div className="box" style={{marginBottom:14}}>
                    <div className="bt">Catatan Wali Kelas</div>
                    <div className="catatan">
                      Ananda {student.nama.split(' ')[0]} menunjukkan perkembangan yang {rataAkhir && rataAkhir >= 85 ? 'sangat baik' : 'cukup baik'} selama semester ini.
                      {rataAkhir && rataAkhir >= 90 ? ' Pertahankan prestasi dan tingkatkan terus semangat belajar.' : ' Terus tingkatkan semangat dan ketelitian dalam belajar.'}
                      {' '}Bārakallāhu fīk.
                    </div>
                  </div>
                  <div className="box">
                    <div className="bt">Rekapitulasi Kehadiran</div>
                    <div className="row" style={{gap:24,fontSize:12,fontWeight:700,color:'#334155'}}>
                      <span>Sakit: <b style={{color:'#0f766e'}}>2</b></span>
                      <span>Izin: <b style={{color:'#0f766e'}}>1</b></span>
                      <span>Alpa: <b style={{color:'#0f766e'}}>0</b></span>
                      <span>Hadir: <b style={{color:'#0f766e'}}>96%</b></span>
                    </div>
                  </div>
                </div>
                <div className={`kenaikan-box ${kenaikanStatus}`}>
                  <div className="lbl">Keputusan Kenaikan Kelas</div>
                  <div className="res">{kenaikanStatus === 'naik' ? 'NAIK' : kenaikanStatus === 'tinjau' ? 'TINJAU' : 'TINGGAL'}</div>
                  {kenaikanStatus === 'naik' && <div className="to">ke <b>{kelasNaik}</b></div>}
                  <div className="sysnote">
                    {rataAkhir !== null
                      ? `✓ Rata-rata ${rataAkhir} · ${kenaikanStatus === 'naik' ? 'seluruh mapel ≥ KKM' : 'perlu evaluasi lebih lanjut'}`
                      : 'Nilai belum lengkap — input nilai terlebih dahulu'}
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="signs">
                <div className="s">
                  <div className="role">Orang Tua / Wali</div>
                  <div className="ln"/>
                  <div className="nm">({student.waliSantri})</div>
                </div>
                <div className="s">
                  <div className="role">Wali Kelas</div>
                  <div className="ln"/>
                  <div className="nm">{kelas?.wali}</div>
                </div>
                <div className="s">
                  <div className="place">{tanggalStr}</div>
                  <div className="role">Kepala TPQ</div>
                  <div className="ln"/>
                  <div className="nm">KH. Abdul Wahab, S.Ag.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
