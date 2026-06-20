'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';

function scoreClass(v) { return v >= 85 ? 'hi' : v >= 75 ? 'mid' : 'lo'; }

export default function DashboardPage() {
  const {
    lembaga, setLembaga, periode, setPeriode,
    students, kelas, ujian, ujianNilai, kenaikan, karakter,
    locks, isHistory, currentTaLabel,
  } = useStore();

  const kelasList = kelas.filter(k => k.lembaga === lembaga);

  // Per-kelas stats
  const kelasSummary = useMemo(() => kelasList.map(k => {
    const siswa = students.filter(s => s.kelasId === k.id && s.status !== 'Lulus');
    const ujianKelas = ujian.filter(u => u.kelasId === k.id && u.periode === periode && u.tipe !== 'Kustom');
    const avgPerSiswa = siswa.map(s => {
      const vals = ujianKelas.map(u => ujianNilai[u.id]?.[s.id]).filter(v => v != null && v !== '');
      return vals.length > 0 ? vals.reduce((a,b) => a + Number(b), 0) / vals.length : null;
    }).filter(v => v !== null);
    const avg = avgPerSiswa.length > 0 ? Math.round(avgPerSiswa.reduce((a,b)=>a+b,0)/avgPerSiswa.length*10)/10 : null;

    const published = locks[k.id]?.[periode] === true;
    const publishedUAS = locks[k.id]?.UAS === true;

    const kenaikanMap = { Naik: 0, 'Tidak Naik': 0, Lulus: 0 };
    if (periode === 'UAS') {
      siswa.forEach(s => { const st = kenaikan[s.id]; if (st) kenaikanMap[st] = (kenaikanMap[st] ?? 0) + 1; });
    }

    return { ...k, jumlah: siswa.length, avg, ujianCount: ujianKelas.length, published, publishedUAS, kenaikanMap };
  }), [kelasList, students, ujian, ujianNilai, kenaikan, locks, periode]);

  // Global stats
  const stats = useMemo(() => {
    const lembagaSiswa = students.filter(s => kelas.find(k => k.id === s.kelasId)?.lembaga === lembaga && s.status !== 'Lulus');
    const ujianAll = ujian.filter(u => kelasList.some(k => k.id === u.kelasId) && u.periode === periode && u.tipe !== 'Kustom');
    const allAvgs = lembagaSiswa.flatMap(s => {
      const ujianSiswa = ujianAll.filter(u => u.kelasId === s.kelasId);
      const vals = ujianSiswa.map(u => ujianNilai[u.id]?.[s.id]).filter(v => v != null && v !== '');
      return vals.length > 0 ? [vals.reduce((a,b)=>a+Number(b),0)/vals.length] : [];
    });
    const avgNilai = allAvgs.length > 0 ? Math.round(allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length*10)/10 : null;
    const publishedCount = kelasList.filter(k => locks[k.id]?.[periode] === true).length;

    let kenaikanStats = { Naik: 0, 'Tidak Naik': 0, Lulus: 0 };
    if (periode === 'UAS') {
      lembagaSiswa.forEach(s => { const st = kenaikan[s.id]; if (st) kenaikanStats[st] = (kenaikanStats[st] ?? 0) + 1; });
    }

    return { total: lembagaSiswa.length, avgNilai, publishedCount, kenaikanStats };
  }, [students, kelas, ujian, ujianNilai, kenaikan, locks, lembaga, kelasList, periode]);

  // Progress input nilai
  const inputProgress = useMemo(() => {
    const ujianList = ujian.filter(u => kelasList.some(k => k.id === u.kelasId) && u.periode === periode && u.tipe !== 'Kustom');
    let total = 0, filled = 0;
    ujianList.forEach(u => {
      const siswaKelas = students.filter(s => s.kelasId === u.kelasId && s.status !== 'Lulus');
      total += siswaKelas.length;
      filled += siswaKelas.filter(s => ujianNilai[u.id]?.[s.id] != null && ujianNilai[u.id]?.[s.id] !== '').length;
    });
    const pct = total > 0 ? Math.round(filled / total * 100) : 0;
    return { total, filled, pct };
  }, [ujian, kelasList, periode, students, ujianNilai]);

  const naik = stats.kenaikanStats.Naik;
  const tidakNaik = stats.kenaikanStats['Tidak Naik'];
  const lulus = stats.kenaikanStats.Lulus;
  const naikPct = stats.total > 0 ? Math.round(naik / stats.total * 100) : 0;
  const tidakNaikPct = stats.total > 0 ? Math.round(tidakNaik / stats.total * 100) : 0;
  const lulusPct = stats.total > 0 ? Math.round(lulus / stats.total * 100) : 0;

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <HistoryBanner />
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <div className="crumb">T.A. {currentTaLabel} — {isHistory ? 'Mode Arsip' : 'Aktif'}</div>
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
        </header>

        <div className="content">
          {/* Stat cards — each with a distinct style */}
          <div className="grid stat-grid">

            {/* Card 1: teal gradient */}
            <div className="stat-card stat-gradient">
              <div className="sg-left">
                <div className="sc-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 3-4.5 5.5-4.5S13.9 16 14.5 19"/>
                    <path d="M16 5.5a3 3 0 010 5.6M18 19c-.3-2-1-3.3-2.2-4.2"/>
                  </svg>
                </div>
                <div className="sc-label">Santri Aktif · {lembaga}</div>
                <div className="sc-sub">{kelasList.length} kelas terdaftar</div>
              </div>
              <div className="sc-value">{stats.total}</div>
            </div>

            {/* Card 2: blue gradient */}
            <div className="stat-card stat-gradient sg-blue">
              <div className="sg-left">
                <div className="sc-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/>
                  </svg>
                </div>
                <div className="sc-label">Progress Penginputan Nilai</div>
                <div className="sc-sub">{inputProgress.filled} dari {inputProgress.total} nilai terisi</div>
              </div>
              <div className="sc-value">{inputProgress.pct}%</div>
            </div>

            {/* Card 3: green gradient */}
            <div className="stat-card stat-gradient sg-green">
              <div className="sg-left">
                <div className="sc-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 17l5-5 4 3 6-7"/><path d="M16 4h4v4"/>
                  </svg>
                </div>
                <div className="sc-label">Rata-rata Nilai</div>
                <div className="sc-sub">periode {periode}</div>
              </div>
              <div className="sc-value">{stats.avgNilai ?? '—'}</div>
            </div>

            {/* Card 4: violet gradient */}
            <div className="stat-card stat-gradient sg-violet">
              <div className="sg-left">
                <div className="sc-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>
                  </svg>
                </div>
                <div className="sc-label">Kelas Published</div>
                <div className="sc-sub">{kelasList.length > 0 ? Math.round(stats.publishedCount/kelasList.length*100) : 0}% selesai · {periode}</div>
              </div>
              <div className="sc-value">{stats.publishedCount}<span style={{fontSize:22,fontWeight:600,opacity:.6}}>/{kelasList.length}</span></div>
            </div>

          </div>

          {/* Main grid */}
          <div className="grid main-grid" style={{marginTop:18}}>
            {/* Per-kelas table */}
            <div className="card" style={{gridColumn:'span 2'}}>
              <div className="card-head">
                <div>
                  <h3>Ringkasan per Kelas · {lembaga}</h3>
                  <div className="sub">Periode {periode}</div>
                </div>
                <div className="spacer"/>
                <Link href="/input-nilai" className="btn sm ghost">Input Nilai →</Link>
              </div>
              <div className="card-pad" style={{padding:0}}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Kelas</th>
                      <th>Wali Kelas</th>
                      <th style={{width:80}}>Santri</th>
                      <th style={{width:80}}>Ujian</th>
                      <th style={{width:90}}>Rata-rata</th>
                      <th style={{width:110}}>Status</th>
                      {periode === 'UAS' && <th style={{width:160}}>Kenaikan</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {kelasSummary.length === 0 ? (
                      <tr><td colSpan={7} style={{textAlign:'center',padding:'32px',color:'var(--muted)'}}>Belum ada kelas</td></tr>
                    ) : kelasSummary.map(k => (
                      <tr key={k.id}>
                        <td>
                          <div className="row" style={{gap:8}}>
                            <div className="kbadge b-teal" style={{minWidth:28}}>{k.nomor}</div>
                            <b>{k.label}</b>
                          </div>
                        </td>
                        <td className="muted">{k.wali}</td>
                        <td className="num">{k.jumlah}</td>
                        <td className="num">{k.ujianCount}</td>
                        <td className="num">
                          {k.avg !== null
                            ? <span className={`score ${scoreClass(k.avg)}`}>{k.avg}</span>
                            : <span className="muted">—</span>}
                        </td>
                        <td>
                          {k.published
                            ? <span className="badge b-green">✅ Published</span>
                            : <span className="badge b-amber">Belum</span>}
                        </td>
                        {periode === 'UAS' && (
                          <td>
                            <div className="row" style={{gap:5,flexWrap:'wrap'}}>
                              {k.kenaikanMap.Naik > 0 && <span className="badge b-green" style={{fontSize:11}}>{k.kenaikanMap.Naik} Naik</span>}
                              {k.kenaikanMap['Tidak Naik'] > 0 && <span className="badge b-amber" style={{fontSize:11}}>{k.kenaikanMap['Tidak Naik']} Tdk Naik</span>}
                              {k.kenaikanMap.Lulus > 0 && <span className="badge b-violet" style={{fontSize:11}}>{k.kenaikanMap.Lulus} Lulus</span>}
                              {k.kenaikanMap.Naik === 0 && k.kenaikanMap['Tidak Naik'] === 0 && k.kenaikanMap.Lulus === 0 && (
                                <span className="muted" style={{fontSize:12}}>Belum diisi</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid main-grid" style={{marginTop:18}}>
            {/* Kenaikan donut (UAS only) */}
            {periode === 'UAS' ? (
              <div className="card">
                <div className="card-head"><h3>Status Kenaikan · UAS</h3></div>
                <div className="card-pad">
                  <div className="donut-wrap">
                    <svg width="130" height="130" viewBox="0 0 42 42" style={{flex:'0 0 auto'}}>
                      <circle cx="21" cy="21" r="15.9" fill="none" stroke="#eef2f5" strokeWidth="6"/>
                      <circle cx="21" cy="21" r="15.9" fill="none" stroke="#16a34a" strokeWidth="6"
                        strokeDasharray={`${naikPct} ${100-naikPct}`} strokeDashoffset="25" strokeLinecap="round"/>
                      <circle cx="21" cy="21" r="15.9" fill="none" stroke="#dc2626" strokeWidth="6"
                        strokeDasharray={`${tidakNaikPct} ${100-tidakNaikPct}`} strokeDashoffset={`-${naikPct-25}`} strokeLinecap="round"/>
                      <circle cx="21" cy="21" r="15.9" fill="none" stroke="#7c3aed" strokeWidth="6"
                        strokeDasharray={`${lulusPct} ${100-lulusPct}`} strokeDashoffset={`-${naikPct+tidakNaikPct-25}`} strokeLinecap="round"/>
                    </svg>
                    <div className="donut-legend">
                      <div className="dl-item"><i style={{background:'#16a34a'}}/><span className="t">Naik</span><span className="n">{naik}</span><span className="p">{naikPct}%</span></div>
                      <div className="dl-item"><i style={{background:'#dc2626'}}/><span className="t">Tidak Naik</span><span className="n">{tidakNaik}</span><span className="p">{tidakNaikPct}%</span></div>
                      <div className="dl-item"><i style={{background:'#7c3aed'}}/><span className="t">Lulus</span><span className="n">{lulus}</span><span className="p">{lulusPct}%</span></div>
                    </div>
                  </div>
                  <hr className="hr" style={{margin:'18px 0 14px'}}/>
                  <div className="row between" style={{fontSize:'12.5px'}}>
                    <span className="muted" style={{fontWeight:600}}>Total santri {lembaga}</span>
                    <span style={{fontWeight:800}}>{stats.total}</span>
                  </div>
                  <div style={{marginTop:10}}>
                    <Link href="/kenaikan" className="btn primary" style={{width:'100%',justifyContent:'center'}}>
                      Buka Kenaikan Kelas →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-head"><h3>Info · UTS</h3></div>
                <div className="card-pad">
                  <p className="muted" style={{fontSize:14}}>
                    Kenaikan kelas hanya tersedia di periode UAS. Beralih ke UAS untuk melihat status kenaikan santri.
                  </p>
                  <button className="btn primary" style={{marginTop:12}} onClick={() => setPeriode('UAS')}>
                    Beralih ke UAS
                  </button>
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="card">
              <div className="card-head"><h3>Akses Cepat</h3></div>
              <div className="card-pad" style={{display:'flex',flexDirection:'column',gap:10}}>
                <Link href="/siswa-kelas" className="btn ghost" style={{justifyContent:'flex-start',gap:10}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" width="18" height="18">
                    <circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 3-4.5 5.5-4.5S13.9 16 14.5 19"/>
                  </svg>
                  Kelola Siswa &amp; Kelas
                </Link>
                <Link href="/ujian" className="btn ghost" style={{justifyContent:'flex-start',gap:10}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                  </svg>
                  Mapel Ujian
                </Link>
                <Link href="/input-nilai" className="btn ghost" style={{justifyContent:'flex-start',gap:10}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Input Nilai
                </Link>
                <Link href="/akhlaq" className="btn ghost" style={{justifyContent:'flex-start',gap:10}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M12 21C5.5 12.5 3 9.5 3 7a9 9 0 0118 0c0 2.5-2.5 5.5-9 14z"/>
                  </svg>
                  Akhlaq &amp; Kehadiran
                </Link>
                <Link href="/raport" className="btn ghost" style={{justifyContent:'flex-start',gap:10}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"/>
                  </svg>
                  Cetak Raport
                </Link>
                <Link href="/tahun-ajaran" className="btn ghost" style={{justifyContent:'flex-start',gap:10}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  Tahun Ajaran
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
