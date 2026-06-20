'use client';
import { useState, useMemo, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';

const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const STORAGE_KEY = 'raport-v3-settings-v2';

// Teks tetap (tidak dapat diubah lewat panel)
const KOTA = 'Magelang';
const PIMPINAN = 'Muhlisun S.Th, I.';
const JUDUL_PRAKTIK = 'UJIAN PRAKTIK';
const JUDUL_KITABAH = 'UJIAN KITABAH';
const ROLE_ORTU = 'Orang Tua / Wali Santri';
const ROLE_PIMPINAN = 'Pimpinan Pesantren';
const ROLE_WALI = 'Wali Kelas';

// Ukuran kertas (mm) + setara piksel layar @96dpi
const PAPERS = {
  A4: { label: 'A4', w: 210, h: 297, screenW: 794, screenH: 1123 },
  F4: { label: 'F4', w: 215, h: 330, screenW: 813, screenH: 1247 },
};

const DEFAULT_SETTINGS = {
  // Kertas
  paper: 'A4',
  // Jumlah baris
  rowsPraktik: 7,
  rowsKitabah: 9,
  // Layout (px) — default dikalibrasi agar muat 1 halaman A4
  fontSize: 12.5,
  rowHeight: 22,
  padX: 52,
  padY: 28,
  signHeight: 56,
  secGap: 10,
};

const printStyle = (paper) => `
  @media print {
    @page { size: ${paper.w}mm ${paper.h}mm; margin: 0; }
    .sidebar, .print-bar, .history-banner, .rv3-settings, .rv3-settings-overlay { display: none !important; }
    .app, .main, .stage, .sheet-area {
      display: block !important;
      background: #fff !important;
      padding: 0 !important;
      margin: 0 !important;
      min-height: 0 !important;
    }
    .rv3-sheet {
      box-shadow: none !important;
      margin: 0 auto !important;
      width: ${paper.w}mm !important;
      min-height: ${paper.h - 24}mm !important;
      height: auto !important;
    }
  }
`;

export default function RaportV3Page() {
  const {
    lembaga, setLembaga, periode, setPeriode,
    students, kelas: kelasList, ujian, ujianNilai,
    karakter, kenaikan, kenaikanTarget, currentTaLabel,
  } = useStore();

  const [activeKelasId, setActiveKelasId] = useState(() => kelasList.find(k => k.lembaga === 'TPQ')?.id ?? '');
  const [activeStudentId, setActiveStudentId] = useState('');

  // ── Pengaturan tampilan (tersimpan di browser) ───────────────
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings(s => ({ ...s, ...JSON.parse(saved) }));
    } catch { /* abaikan */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* abaikan */ }
  }, [settings]);

  const setField = (key, value) => setSettings(s => ({ ...s, [key]: value }));
  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  const paper = PAPERS[settings.paper] ?? PAPERS.A4;
  const sheetVars = {
    '--rv3-fs': `${settings.fontSize}px`,
    '--rv3-row-h': `${settings.rowHeight}px`,
    '--rv3-pad-x': `${settings.padX}px`,
    '--rv3-pad-y': `${settings.padY}px`,
    '--rv3-sign-h': `${settings.signHeight}px`,
    '--rv3-sec-gap': `${settings.secGap}px`,
    width: `${paper.screenW}px`,
    minHeight: `${paper.screenH}px`,
  };

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

  // Ujian list for this kelas & periode
  const ujianKelas = useMemo(
    () => ujian.filter(u => u.kelasId === activeKelasId && u.periode === periode),
    [ujian, activeKelasId, periode]
  );
  const ujianPraktik = useMemo(
    () => ujianKelas.filter(u => u.tipe === 'Praktik').slice(0, settings.rowsPraktik),
    [ujianKelas, settings.rowsPraktik]
  );
  const ujianKitabah = useMemo(
    () => ujianKelas.filter(u => u.tipe === 'Tertulis').slice(0, settings.rowsKitabah),
    [ujianKelas, settings.rowsKitabah]
  );

  const getNilai = (ujianId) => {
    if (!student) return null;
    const v = ujianNilai[ujianId]?.[student.id];
    return (v != null && v !== '') ? v : null;
  };
  const numVal = (ujianId) => {
    const v = getNilai(ujianId);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;   // text values (e.g. "Naqish : 4") tidak dihitung
  };

  // Jumlah & rata-rata (semua ujian Praktik + Kitabah)
  const { jumlah, rataRata } = useMemo(() => {
    const counted = [...ujianPraktik, ...ujianKitabah];
    const vals = counted.map(u => numVal(u.id)).filter(v => v !== null);
    if (vals.length === 0) return { jumlah: null, rataRata: null };
    const j = vals.reduce((a, b) => a + b, 0);
    return { jumlah: j, rataRata: j / vals.length };
  }, [ujianPraktik, ujianKitabah, ujianNilai, student]);

  // Peringkat dalam kelas
  const peringkat = useMemo(() => {
    if (!student) return null;
    const counted = [...ujianPraktik, ...ujianKitabah];
    const getRata = (sid) => {
      const vals = counted.map(u => {
        const v = ujianNilai[u.id]?.[sid];
        if (v == null || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      }).filter(v => v !== null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    const sorted = kelasSiswa.map(s => ({ id: s.id, rata: getRata(s.id) })).sort((a, b) => b.rata - a.rata);
    const rank = sorted.findIndex(s => s.id === student.id) + 1;
    return rank > 0 ? rank : null;
  }, [kelasSiswa, ujianPraktik, ujianKitabah, ujianNilai, student]);

  const kar = karakter[student?.id]?.[periode] ?? {};
  const kenaikanStatus = kenaikan[student?.id];
  const kenaikanTargetVal = kenaikanTarget[student?.id];

  const today = new Date();
  const tanggalStr = `${KOTA}, ${HARI[today.getDay()]}, ${today.getDate()} ${BULAN[today.getMonth()]} ${today.getFullYear()} M.`;

  const keputusanText = () => {
    if (!kenaikanStatus) return 'Belum ditetapkan';
    if (kenaikanStatus === 'Lulus') return 'LULUS / TAMAT BELAJAR';
    if (kenaikanStatus === 'Naik') return `Naik Ke Kelas ${kenaikanTargetVal ?? kelas?.label ?? '—'}`;
    return `Tetap di Kelas ${kelas?.label ?? '—'}`;
  };

  const filteredKelas = kelasList.filter(k => k.lembaga === lembaga);

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <style>{printStyle(paper)}</style>
        <HistoryBanner />
        <div className="stage">

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
            <button className="pb-btn" onClick={() => setSettingsOpen(o => !o)} title="Pengaturan tampilan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19 12a7 7 0 00-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 00-2.3-1.3L16 3h-4l-.3 2.2A7 7 0 009.4 6.5l-2.3-1-2 3.4 2 1.5A7 7 0 007 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-1c.7.5 1.5.9 2.3 1.3L12 21h4l.3-2.2c.8-.3 1.6-.7 2.3-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z"/>
              </svg>
              Pengaturan
            </button>
            <button className="pb-btn primary" onClick={() => window.print()}>
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
              <div className="sheet rv3-sheet" style={sheetVars}>

                {/* Identitas */}
                <div className="rv3-ident">
                  <div className="row"><span className="lab">NAMA SANTRI</span><span className="sep">:</span><span className="val">{student.nama}</span></div>
                  <div className="row"><span className="lab">TAHUN AJARAN</span><span className="sep">:</span><span className="val">{currentTaLabel}</span></div>
                  <div className="row"><span className="lab">KELAS</span><span className="sep">:</span><span className="val">{kelas?.label}</span></div>
                  <div className="row"><span className="lab">SEMESTER</span><span className="sep">:</span><span className="val">{periode === 'UTS' ? 'Ganjil' : 'Genap'}</span></div>
                </div>

                {/* UJIAN PRAKTIK */}
                <div className="rv3-sec">{JUDUL_PRAKTIK}</div>
                <table className="rv3-tbl">
                  <thead>
                    <tr>
                      <th className="no">No</th>
                      <th>Mata Pelajaran</th>
                      <th className="nilai">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({length: settings.rowsPraktik}).map((_, i) => {
                      const u = ujianPraktik[i];
                      const val = u ? getNilai(u.id) : null;
                      return (
                        <tr key={`p-${i}`}>
                          <td className="no">{i + 1}</td>
                          <td>{u?.nama ?? ''}</td>
                          <td className="nilai">{val ?? ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* UJIAN KITABAH */}
                <div className="rv3-sec">{JUDUL_KITABAH}</div>
                <table className="rv3-tbl">
                  <thead>
                    <tr>
                      <th className="no">No</th>
                      <th>Mata Pelajaran</th>
                      <th className="nilai">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({length: settings.rowsKitabah}).map((_, i) => {
                      const u = ujianKitabah[i];
                      const val = u ? getNilai(u.id) : null;
                      return (
                        <tr key={`k-${i}`}>
                          <td className="no">{i + 1}</td>
                          <td>{u?.nama ?? ''}</td>
                          <td className="nilai">{val ?? ''}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={2} className="rv3-sum">Jumlah</td>
                      <td className="nilai">{jumlah ?? ''}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="rv3-sum">Nilai rata-rata</td>
                      <td className="nilai">{rataRata != null ? rataRata.toFixed(8) : ''}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="rv3-rank">{peringkat ? `Peringkat ke ${peringkat}` : ''}</td>
                    </tr>
                  </tbody>
                </table>

                {/* KETIDAK HADIRAN & AKHLAQ */}
                <div className="rv3-lower">
                  <div>
                    <div className="rv3-box-title">KETIDAK HADIRAN</div>
                    <table className="rv3-tbl">
                      <thead>
                        <tr>
                          <th className="no">No</th>
                          <th>Aspek Yang Di Nilai</th>
                          <th className="nilai">Nilai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {id:'akhlaq',    label:'Akhlaq'},
                          {id:'kerajinan', label:'Kerajinan'},
                          {id:'kerapihan', label:'Kerapihan'},
                        ].map((row, i) => (
                          <tr key={row.id}>
                            <td className="no">{i + 1}</td>
                            <td>{row.label}</td>
                            <td className="nilai">{kar[row.id] ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div className="rv3-box-title">AKHLAQ</div>
                    <table className="rv3-tbl">
                      <thead>
                        <tr>
                          <th className="no">No</th>
                          <th>Alasan Ketidak Hadiran</th>
                          <th className="nilai">Lama</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="no">1</td>
                          <td>Ijin (Uzur)</td>
                          <td className="nilai">{kar.izin != null ? kar.izin : ''}</td>
                        </tr>
                        <tr>
                          <td className="no">2</td>
                          <td>Tanpa Udzur</td>
                          <td className="nilai">{kar.tanpaIzin != null ? kar.tanpaIzin : ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* KEPUTUSAN */}
                <div className="rv3-keputusan">
                  <h4>KEPUTUSAN</h4>
                  <div className="rv3-kep-line">Dengan memperhatikan hasil yang di capai pada tahun ajaran ini, maka santri ini di tetapkan:</div>
                  <div className="rv3-kep-decision">{keputusanText()}</div>
                </div>

                {/* Tanggal & tanda tangan */}
                <div className="rv3-date push">{tanggalStr}</div>
                <div className="rv3-date" style={{marginTop:0}}>Mengetahui,</div>

                <div className="rv3-signs">
                  <div className="rv3-sign">
                    <div className="rv3-sign-role">{ROLE_ORTU}</div>
                    <div className="rv3-sign-space"/>
                    <div className="rv3-sign-name">{student.waliSantri ?? ''}</div>
                  </div>
                  <div className="rv3-sign">
                    <div className="rv3-sign-role">{ROLE_PIMPINAN}</div>
                    <div className="rv3-sign-space"/>
                    <div className="rv3-sign-name">{PIMPINAN}</div>
                  </div>
                  <div className="rv3-sign">
                    <div className="rv3-sign-role">{ROLE_WALI}</div>
                    <div className="rv3-sign-space"/>
                    <div className="rv3-sign-name">{kelas?.wali ?? ''}</div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel Pengaturan */}
      {settingsOpen && <div className="rv3-settings-overlay" onClick={() => setSettingsOpen(false)} />}
      <aside className={`rv3-settings${settingsOpen ? ' open' : ''}`}>
        <div className="rv3-settings-head">
          <span>Pengaturan Raport</span>
          <button onClick={() => setSettingsOpen(false)} aria-label="Tutup">✕</button>
        </div>

        <div className="rv3-settings-body">
          <div className="rv3-set-group">Ukuran Kertas</div>
          <div className="rv3-set-row">
            <div className="rv3-paper-seg">
              {Object.values(PAPERS).map(p => (
                <button
                  key={p.label}
                  className={settings.paper === p.label ? 'on' : ''}
                  onClick={() => setField('paper', p.label)}
                >
                  {p.label} <small>{p.w}×{p.h}mm</small>
                </button>
              ))}
            </div>
          </div>

          <div className="rv3-set-group">Tabel</div>
          <RangeField label="Baris Tabel 1"  min={1}  max={15} step={1}   value={settings.rowsPraktik} onChange={v => setField('rowsPraktik', v)} />
          <RangeField label="Baris Tabel 2"  min={1}  max={20} step={1}   value={settings.rowsKitabah} onChange={v => setField('rowsKitabah', v)} />
          <RangeField label="Tinggi Baris"   min={18} max={42} step={1}   value={settings.rowHeight}   onChange={v => setField('rowHeight', v)} unit="px" />

          <div className="rv3-set-group">Tata Letak</div>
          <RangeField label="Ukuran Font"        min={10} max={18} step={0.5} value={settings.fontSize}   onChange={v => setField('fontSize', v)} unit="px" />
          <RangeField label="Margin Kiri/Kanan"  min={20} max={80} step={2}   value={settings.padX}       onChange={v => setField('padX', v)} unit="px" />
          <RangeField label="Margin Atas/Bawah"  min={16} max={80} step={2}   value={settings.padY}       onChange={v => setField('padY', v)} unit="px" />
          <RangeField label="Jarak Antar Bagian" min={4}  max={40} step={1}   value={settings.secGap}     onChange={v => setField('secGap', v)} unit="px" />
          <RangeField label="Tinggi Kolom TTD"   min={30} max={140} step={2}  value={settings.signHeight} onChange={v => setField('signHeight', v)} unit="px" />
        </div>

        <div className="rv3-settings-foot">
          <button className="rv3-set-reset" onClick={resetSettings}>Kembalikan Default</button>
        </div>
      </aside>
    </div>
  );
}

function RangeField({ label, value, onChange, min, max, step, unit }) {
  return (
    <label className="rv3-set-row">
      <span className="rv3-set-label">{label}<b>{value}{unit ?? ''}</b></span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="rv3-set-range"
      />
    </label>
  );
}
