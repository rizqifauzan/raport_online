'use client';
import { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';

const STATUS_OPTS = ['Naik', 'Tidak Naik', 'Lulus'];
const STATUS_BADGE = { Naik: 'b-green', 'Tidak Naik': 'b-amber', Lulus: 'b-violet' };

export default function KenaikanPage() {
  const { lembaga, setLembaga, kelas, students, ujian, ujianNilai, kenaikan, setKenaikanEntry, resetKenaikan } = useStore();

  const kelasList = kelas.filter(k => k.lembaga === lembaga);
  const [activeKelasId, setActiveKelasId] = useState(kelasList[0]?.id ?? '');
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState('');

  const handleLembaga = (l) => {
    setLembaga(l);
    const newKelas = kelas.filter(k => k.lembaga === l);
    setActiveKelasId(newKelas[0]?.id ?? '');
  };

  const activeKelas = kelas.find(k => k.id === activeKelasId);
  const kelasSiswa = useMemo(() => students.filter(s => s.kelasId === activeKelasId && s.status !== 'Lulus'), [students, activeKelasId]);

  const getNilaiAkhir = (studentId) => {
    const ujianKelas = ujian.filter(u => u.kelasId === activeKelasId && u.tipe !== 'Kustom' && u.periode === 'UAS');
    const vals = ujianKelas.map(u => ujianNilai[u.id]?.[studentId]).filter(v => v != null && v !== '');
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length * 10) / 10;
  };

  const getStatus = (studentId) => kenaikan[studentId] ?? 'Naik';

  function handleSimpan() {
    setShowConfirm(false);
    // Hanya simpan status — tidak ada migrasi kelas otomatis
    setToast('Status kenaikan berhasil disimpan');
    setTimeout(() => setToast(''), 2500);
  }

  const kelasSummary = useMemo(() => kelasList.map(k => {
    const siswa = students.filter(s => s.kelasId === k.id && s.status !== 'Lulus');
    const sudahDiisi = siswa.filter(s => kenaikan[s.id] != null).length;
    return { ...k, jumlah: siswa.length, sudahDiisi };
  }), [kelasList, students, kenaikan]);

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div>
            <h1>Kenaikan Kelas</h1>
            <div className="crumb">Penetapan status kenaikan santri — UAS</div>
          </div>
          <div className="spacer"/>
          <div className="seg">
            <button className={lembaga==='TPQ' ? 'on' : ''} onClick={() => handleLembaga('TPQ')}>TPQ</button>
            <button className={lembaga==='Madin' ? 'on' : ''} onClick={() => handleLembaga('Madin')}>Madin</button>
          </div>
          <div className="field select">T.A. 2025/2026</div>
        </header>

        <div className="content">
          <div className="row between" style={{marginBottom:12}}>
            <div className="section-title">{lembaga} — {kelasList.length} Kelas</div>
            <div className="legend-row">
              <span className="lg"><span className="badge b-green" style={{fontSize:10,padding:'2px 7px'}}>Naik</span></span>
              <span className="lg"><span className="badge b-amber" style={{fontSize:10,padding:'2px 7px'}}>Tidak Naik</span></span>
              <span className="lg"><span className="badge b-violet" style={{fontSize:10,padding:'2px 7px'}}>Lulus</span></span>
            </div>
          </div>

          <div className="class-rail" style={{gridTemplateColumns:`repeat(${kelasList.length},1fr)`,marginBottom:20}}>
            {kelasSummary.map(k => (
              <div
                key={k.id}
                className={`class-card${activeKelasId === k.id ? ' active' : ''}`}
                onClick={() => setActiveKelasId(k.id)}
              >
                <div className="kn b-teal">{k.nomor}</div>
                <div className="ct">{k.label}</div>
                <div className="cm">{k.jumlah} santri</div>
                {k.jumlah > 0 && (
                  k.sudahDiisi === k.jumlah
                    ? <div className="avg score hi" style={{fontSize:10}}>✓ Selesai</div>
                    : <div className="avg score mid" style={{fontSize:10}}>{k.sudahDiisi}/{k.jumlah}</div>
                )}
              </div>
            ))}
          </div>

          <div className="card panel">
            <div className="toolbar">
              <div style={{fontWeight:800,fontSize:15}}>
                {lembaga} · {activeKelas?.label}
                <span className="muted" style={{fontWeight:600}}> — {kelasSiswa.length} santri</span>
              </div>
              <div className="spacer"/>
              <button className="btn ghost sm" onClick={resetKenaikan} style={{color:'var(--muted)'}}>Reset Semua</button>
            </div>

            {kelasSiswa.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 3-4.5 5.5-4.5S13.9 16 14.5 19"/>
                </svg>
                <p>Belum ada santri aktif di kelas ini</p>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{width:44}}>No</th>
                    <th>Nama Santri</th>
                    <th style={{width:110}}>Nilai Akhir UAS</th>
                    <th style={{width:160}}>Status Kenaikan</th>
                  </tr>
                </thead>
                <tbody>
                  {kelasSiswa.map((s, i) => {
                    const na = getNilaiAkhir(s.id);
                    const status = getStatus(s.id);
                    return (
                      <tr key={s.id}>
                        <td className="num muted">{i + 1}</td>
                        <td><b>{s.nama}</b></td>
                        <td className="num">
                          {na !== null
                            ? <span className={`score ${na >= 85 ? 'hi' : na >= 75 ? 'mid' : 'lo'}`}>{na}</span>
                            : <span className="muted">—</span>
                          }
                        </td>
                        <td>
                          <div className="row" style={{gap:6,flexWrap:'wrap'}}>
                            {STATUS_OPTS.map(opt => (
                              <button
                                key={opt}
                                className={`badge ${STATUS_BADGE[opt]}`}
                                style={{
                                  cursor:'pointer', border:'none', padding:'5px 10px', fontSize:12,
                                  opacity: status === opt ? 1 : 0.35,
                                  fontWeight: status === opt ? 800 : 500,
                                  transition:'opacity .15s',
                                }}
                                onClick={() => setKenaikanEntry(s.id, opt)}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="save-bar">
            <div style={{fontSize:'12.5px'}} className="muted">
              Status disimpan sementara — tidak mengubah kelas santri secara otomatis
            </div>
            <div className="spacer"/>
            <button className="btn primary" onClick={() => setShowConfirm(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <path d="M17 21v-8H7v8M7 3v5h8"/>
              </svg>
              Simpan Status Kenaikan
            </button>
          </div>
        </div>

        {/* Konfirmasi */}
        {showConfirm && (
          <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <h3 style={{margin:0}}>Simpan Status Kenaikan?</h3>
                <button className="icon-btn" onClick={() => setShowConfirm(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <p style={{margin:'0 0 20px',fontSize:14,color:'var(--ink-2)'}}>
                Status kenaikan semua santri akan disimpan. Santri <b>tidak otomatis berpindah kelas</b> — admin perlu menambahkan manual ke kelas T.A. baru.
              </p>
              <div className="form-actions">
                <button className="btn ghost" onClick={() => setShowConfirm(false)}>Batal</button>
                <button className="btn primary" onClick={handleSimpan}>Ya, Simpan</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}
