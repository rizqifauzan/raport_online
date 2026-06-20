'use client';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';
import { KELAS, MAPEL, calcNilaiAkhir } from '../../lib/data';
import { useMemo } from 'react';

function getKenaikanStatus(nilaiAkhir) {
  if (nilaiAkhir === null) return 'tinjau';
  if (nilaiAkhir >= 75) return 'naik';
  if (nilaiAkhir >= 65) return 'tinjau';
  return 'tinggal';
}

export default function DashboardPage() {
  const { lembaga, setLembaga, periode, setPeriode, students, grades } = useStore();

  const kelasList = KELAS.filter(k => k.lembaga === lembaga);
  const mapelList = MAPEL[lembaga];

  const studentStats = useMemo(() => {
    const lembagaStudents = students.filter(s => {
      const kelas = KELAS.find(k => k.id === s.kelasId);
      return kelas?.lembaga === lembaga;
    });

    let totalNilai = 0;
    let countNilai = 0;
    let naik = 0, tinjau = 0, tinggal = 0;

    lembagaStudents.forEach(s => {
      const na = calcNilaiAkhir(grades[s.id], mapelList, periode);
      if (na !== null) { totalNilai += na; countNilai++; }
      const status = getKenaikanStatus(na);
      if (status === 'naik') naik++;
      else if (status === 'tinjau') tinjau++;
      else tinggal++;
    });

    return {
      total: lembagaStudents.length,
      avgNilai: countNilai > 0 ? Math.round(totalNilai / countNilai * 10) / 10 : 0,
      naik, tinjau, tinggal,
    };
  }, [lembaga, periode, students, grades, mapelList]);

  const kelasSummary = useMemo(() => {
    return kelasList.map(kelas => {
      const klsSiswa = students.filter(s => s.kelasId === kelas.id);
      const avgList = klsSiswa.map(s => calcNilaiAkhir(grades[s.id], mapelList, periode)).filter(v => v !== null);
      const avg = avgList.length > 0 ? Math.round(avgList.reduce((a,b)=>a+b,0)/avgList.length*10)/10 : null;
      const naikCount = klsSiswa.filter(s => getKenaikanStatus(calcNilaiAkhir(grades[s.id], mapelList, periode)) === 'naik').length;
      const tinjauCount = klsSiswa.filter(s => getKenaikanStatus(calcNilaiAkhir(grades[s.id], mapelList, periode)) === 'tinjau').length;
      const tinggalCount = klsSiswa.filter(s => getKenaikanStatus(calcNilaiAkhir(grades[s.id], mapelList, periode)) === 'tinggal').length;
      return { ...kelas, jumlah: klsSiswa.length, avg, naikCount, tinjauCount, tinggalCount };
    });
  }, [kelasList, students, grades, mapelList, periode]);

  const mapelAvg = useMemo(() => {
    return mapelList.map(m => {
      const lembagaStudents = students.filter(s => {
        const kelas = KELAS.find(k => k.id === s.kelasId);
        return kelas?.lembaga === lembaga;
      });
      const vals = lembagaStudents.map(s => {
        const e = grades[s.id]?.[m.id]?.[periode];
        return e ? (e.p + e.t) / 2 : null;
      }).filter(v => v !== null);
      const avg = vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
      const valsUTS = lembagaStudents.map(s => {
        const e = grades[s.id]?.[m.id]?.UTS;
        return e ? (e.p + e.t) / 2 : null;
      }).filter(v => v !== null);
      const avgUTS = valsUTS.length > 0 ? Math.round(valsUTS.reduce((a,b)=>a+b,0)/valsUTS.length) : 0;
      return { ...m, avg, avgUTS };
    });
  }, [mapelList, lembaga, students, grades, periode]);

  const pct = studentStats.total > 0;
  const naikPct = pct ? Math.round(studentStats.naik / studentStats.total * 100) : 0;
  const tinjauPct = pct ? Math.round(studentStats.tinjau / studentStats.total * 100) : 0;
  const tinggalPct = 100 - naikPct - tinjauPct;

  const scoreClass = (v) => v >= 85 ? 'hi' : v >= 75 ? 'mid' : 'lo';

  // Donut SVG math
  const total = 100;
  const naikDash = naikPct;
  const tinjauDash = tinjauPct;
  const tinggalDash = tinggalPct;

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <div className="crumb">Rekap nilai &amp; kenaikan kelas</div>
          </div>
          <div className="spacer"/>
          <div className="seg">
            <button className={lembaga==='TPQ' ? 'on' : ''} onClick={() => setLembaga('TPQ')}>TPQ</button>
            <button className={lembaga==='Madin' ? 'on' : ''} onClick={() => setLembaga('Madin')}>Madin</button>
          </div>
          <div className="seg gold">
            <button className={periode==='UTS' ? 'on' : ''} onClick={() => setPeriode('UTS')}>UTS</button>
            <button className={periode==='UAS' ? 'on' : ''} onClick={() => setPeriode('UAS')}>UAS</button>
          </div>
          <div className="field select">T.A. 2025/2026</div>
          <button className="icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z"/>
              <path d="M10 19a2 2 0 004 0"/>
            </svg>
          </button>
        </header>

        <div className="content">
          <div className="greet">
            <div className="badge b-gold" style={{fontSize:14,padding:'6px 12px',fontFamily:'Amiri,serif'}}>السلام عليكم</div>
            <div>
              <div style={{fontWeight:800,fontSize:16}}>{lembaga} · {periode === 'UTS' ? 'Ujian Tengah Semester' : 'Ujian Akhir Semester'}</div>
              <div className="muted" style={{fontSize:13}}>Periode {periode} aktif — data nilai dapat dikonfirmasi.</div>
            </div>
            <div style={{marginLeft:'auto'}} className="row">
              <Link href="/input-nilai" className="btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Input Nilai
              </Link>
              <Link href="/raport" className="btn primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"/>
                </svg>
                Cetak Massal
              </Link>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid stat-grid">
            <div className="stat">
              <div className="ic teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 3-4.5 5.5-4.5S13.9 16 14.5 19"/>
                  <path d="M16 5.5a3 3 0 010 5.6M18 19c-.3-2-1-3.3-2.2-4.2"/>
                </svg>
              </div>
              <div className="label">Total Santri {lembaga}</div>
              <div className="value">{studentStats.total}</div>
              <div className="delta up">▲ aktif terdaftar</div>
            </div>
            <div className="stat">
              <div className="ic blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 17l5-5 4 3 6-7"/><path d="M16 4h4v4"/>
                </svg>
              </div>
              <div className="label">Rata-rata Nilai</div>
              <div className="value">{studentStats.avgNilai}<small>/100</small></div>
              <div className="delta up">▲ periode {periode}</div>
            </div>
            <div className="stat">
              <div className="ic green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 13l4 4 7-7"/><path d="M14 17l3 3 4-4"/>
                </svg>
              </div>
              <div className="label">Disarankan Naik</div>
              <div className="value">{studentStats.naik}</div>
              <div className="delta up">{naikPct}% santri</div>
            </div>
            <div className="stat">
              <div className="ic amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 9v4M12 17h.01"/>
                  <path d="M10.3 3.9l-8 14A2 2 0 004 21h16a2 2 0 001.7-3.1l-8-14a2 2 0 00-3.4 0z"/>
                </svg>
              </div>
              <div className="label">Perlu Ditinjau</div>
              <div className="value">{studentStats.tinjau + studentStats.tinggal}</div>
              <div className="delta down">{tinjauPct + tinggalPct}% · tinjau/koreksi</div>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid main-grid">
            {/* Bar chart */}
            <div className="card">
              <div className="card-head">
                <div>
                  <h3>Rata-rata Nilai per Mapel</h3>
                  <div className="sub">Praktik vs Tertulis · {lembaga}</div>
                </div>
                <div className="spacer"/>
                <div className="legend">
                  <span><i style={{background:'#2dd4bf',borderRadius:4,display:'inline-block',width:11,height:11}}/> Praktik</span>
                  <span><i style={{background:'#0f766e',borderRadius:4,display:'inline-block',width:11,height:11}}/> Tertulis</span>
                </div>
              </div>
              <div className="card-pad">
                <div className="barchart">
                  {mapelAvg.map(m => {
                    const prak = Math.round(m.students?.reduce((acc, s) => {
                      const e = grades[s.id]?.[m.id]?.[periode];
                      return e ? { sum: acc.sum + e.p, n: acc.n + 1 } : acc;
                    }, {sum:0,n:0}));
                    const praktikVals = students.filter(s => KELAS.find(k=>k.id===s.kelasId)?.lembaga===lembaga).map(s => grades[s.id]?.[m.id]?.[periode]?.p).filter(v=>v!=null);
                    const tulisVals = students.filter(s => KELAS.find(k=>k.id===s.kelasId)?.lembaga===lembaga).map(s => grades[s.id]?.[m.id]?.[periode]?.t).filter(v=>v!=null);
                    const avgP = praktikVals.length > 0 ? Math.round(praktikVals.reduce((a,b)=>a+b,0)/praktikVals.length) : 0;
                    const avgT = tulisVals.length > 0 ? Math.round(tulisVals.reduce((a,b)=>a+b,0)/tulisVals.length) : 0;
                    const maxH = 85;
                    return (
                      <div className="col" key={m.id}>
                        <div className="stack">
                          <div className="bv prak" style={{height:`${(avgP/100)*maxH}%`}}/>
                          <div className="bv tul"  style={{height:`${(avgT/100)*maxH}%`}}/>
                        </div>
                        <div className="val">{m.avg}</div>
                        <div className="lab" style={{fontSize:10,textAlign:'center'}}>{m.label.split(' ')[0]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Donut */}
            <div className="card">
              <div className="card-head"><h3>Status Kenaikan</h3><div className="sub" style={{marginLeft:'auto'}}>Saran sistem</div></div>
              <div className="card-pad">
                <div className="donut-wrap">
                  <svg width="130" height="130" viewBox="0 0 42 42" style={{flex:'0 0 auto'}}>
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef2f5" strokeWidth="6"/>
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#16a34a" strokeWidth="6"
                      strokeDasharray={`${naikPct} ${100-naikPct}`} strokeDashoffset="25" strokeLinecap="round"/>
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#d97706" strokeWidth="6"
                      strokeDasharray={`${tinjauPct} ${100-tinjauPct}`} strokeDashoffset={`-${naikPct - 25}`} strokeLinecap="round"/>
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#dc2626" strokeWidth="6"
                      strokeDasharray={`${tinggalPct} ${100-tinggalPct}`} strokeDashoffset={`-${naikPct + tinjauPct - 25}`} strokeLinecap="round"/>
                  </svg>
                  <div className="donut-legend">
                    <div className="dl-item"><i style={{background:'#16a34a'}}/><span className="t">Naik</span><span className="n">{studentStats.naik}</span><span className="p">{naikPct}%</span></div>
                    <div className="dl-item"><i style={{background:'#d97706'}}/><span className="t">Tinjau</span><span className="n">{studentStats.tinjau}</span><span className="p">{tinjauPct}%</span></div>
                    <div className="dl-item"><i style={{background:'#dc2626'}}/><span className="t">Tinggal</span><span className="n">{studentStats.tinggal}</span><span className="p">{tinggalPct}%</span></div>
                  </div>
                </div>
                <hr className="hr" style={{margin:'18px 0 14px'}}/>
                <div className="row between" style={{fontSize:'12.5px'}}>
                  <span className="muted" style={{fontWeight:600}}>Total santri {lembaga}</span>
                  <span style={{fontWeight:800}}>{studentStats.total}</span>
                </div>
                <div className="bar" style={{marginTop:9}}><i style={{width:`${naikPct}%`}}/></div>
              </div>
            </div>
          </div>

          {/* Lower: class breakdown */}
          <div className="grid main-grid" style={{marginTop:18}}>
            <div className="card">
              <div className="card-head">
                <h3>Ringkasan per Kelas</h3>
                <div className="spacer"/>
                <Link href="/siswa" className="btn sm ghost">Lihat semua →</Link>
              </div>
              <div className="card-pad" style={{paddingTop:6,paddingBottom:6}}>
                {kelasSummary.map((k, i) => (
                  <div className="kelas-row" key={k.id}>
                    <div className="kbadge b-teal">{k.nomor}</div>
                    <div>
                      <b style={{fontSize:14}}>{lembaga} {k.label}</b>
                      <div className="muted" style={{fontSize:12}}>Wali: {k.wali} · {k.jumlah} santri</div>
                    </div>
                    <div style={{marginLeft:'auto',textAlign:'right'}}>
                      <div className={`score ${k.avg ? scoreClass(k.avg) : ''}`} style={{fontSize:16}}>{k.avg ?? '—'}</div>
                      <div className="muted" style={{fontSize:11}}>rata-rata</div>
                    </div>
                    {k.tinggalCount > 0 ? (
                      <span className="badge b-red" style={{marginLeft:8}}><span className="dot"/>{k.tinggalCount} tinggal</span>
                    ) : k.tinjauCount > 0 ? (
                      <span className="badge b-amber" style={{marginLeft:8}}><span className="dot"/>{k.tinjauCount} tinjau</span>
                    ) : (
                      <span className="badge b-green" style={{marginLeft:8}}><span className="dot"/>{k.naikCount} naik</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* UTS vs UAS comparison */}
            <div className="card">
              <div className="card-head"><h3>Perbandingan UTS → UAS</h3></div>
              <div className="card-pad">
                <div className="row between" style={{marginBottom:18}}>
                  <div>
                    <div className="muted" style={{fontSize:12,fontWeight:600}}>Rata-rata UTS</div>
                    <div style={{fontSize:22,fontWeight:800}}>
                      {(() => {
                        const lembagaStudents = students.filter(s => KELAS.find(k=>k.id===s.kelasId)?.lembaga===lembaga);
                        const vals = lembagaStudents.map(s => calcNilaiAkhir(grades[s.id], mapelList, 'UTS')).filter(v=>v!==null);
                        return vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : '—';
                      })()}
                    </div>
                  </div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted-2)" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                  <div style={{textAlign:'right'}}>
                    <div className="muted" style={{fontSize:12,fontWeight:600}}>Rata-rata UAS</div>
                    <div style={{fontSize:22,fontWeight:800,color:'var(--green)'}}>
                      {(() => {
                        const lembagaStudents = students.filter(s => KELAS.find(k=>k.id===s.kelasId)?.lembaga===lembaga);
                        const vals = lembagaStudents.map(s => calcNilaiAkhir(grades[s.id], mapelList, 'UAS')).filter(v=>v!==null);
                        return vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : '—';
                      })()}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:13}}>
                  {mapelAvg.map(m => (
                    <div key={m.id}>
                      <div className="row between" style={{fontSize:12,fontWeight:700,marginBottom:6}}>
                        <span>{m.label}</span>
                        <span className="muted">{m.avgUTS} → <b style={{color:'var(--green)'}}>{m.avg}</b></span>
                      </div>
                      <div className="bar"><i style={{width:`${m.avg}%`}}/></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
