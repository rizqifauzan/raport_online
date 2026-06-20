'use client';
import { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';
import { KELAS, MAPEL, calcNilaiAkhir, getInitials } from '../../lib/data';

const COLORS = ['#0d9488','#7c3aed','#2563eb','#16a34a','#d4a056','#dc2626','#0891b2','#9333ea'];
const PER_PAGE = 7;

function scoreClass(v) { return v >= 85 ? 'hi' : v >= 75 ? 'mid' : 'lo'; }

function generateNIS(students) {
  const year = new Date().getFullYear().toString().slice(-2);
  const sameYear = students
    .map(s => s.id)
    .filter(id => id.startsWith(year) && id.length === 5)
    .map(id => parseInt(id.slice(2), 10))
    .filter(n => !isNaN(n));
  const maxSeq = sameYear.length > 0 ? Math.max(...sameYear) : 0;
  return year + String(maxSeq + 1).padStart(3, '0');
}

export default function SiswaPage() {
  const { lembaga, setLembaga, students, grades, addStudent, removeStudent } = useStore();
  const mapelList = MAPEL[lembaga];

  const kelasList = KELAS.filter(k => k.lembaga === lembaga);
  const [activeKelasId, setActiveKelasId] = useState(kelasList[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [generatedNIS, setGeneratedNIS] = useState('');
  const [toast, setToast] = useState('');

  // Switch lembaga → reset kelas & halaman
  const handleLembaga = (l) => {
    const newKelas = KELAS.filter(k => k.lembaga === l);
    setActiveKelasId(newKelas[0]?.id ?? '');
    setSearch('');
    setSelected(new Set());
    setPage(1);
  };

  const activeKelas = KELAS.find(k => k.id === activeKelasId);

  const kelasSummary = useMemo(() => kelasList.map(k => {
    const klsSiswa = students.filter(s => s.kelasId === k.id);
    const avgList = klsSiswa.map(s => calcNilaiAkhir(grades[s.id], mapelList, 'UAS')).filter(v => v !== null);
    const avg = avgList.length > 0 ? Math.round(avgList.reduce((a,b)=>a+b,0)/avgList.length) : null;
    return { ...k, jumlah: klsSiswa.length, avg };
  }), [kelasList, students, grades, mapelList]);

  const filtered = useMemo(() => {
    return students
      .filter(s => s.kelasId === activeKelasId)
      .filter(s => !search || s.nama.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search));
  }, [students, activeKelasId, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const allOnPageSelected = paged.length > 0 && paged.every(s => selected.has(s.id));

  function toggleSelect(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (allOnPageSelected) setSelected(prev => { const n = new Set(prev); paged.forEach(s=>n.delete(s.id)); return n; });
    else setSelected(prev => { const n = new Set(prev); paged.forEach(s=>n.add(s.id)); return n; });
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function handleDelete() {
    selected.forEach(id => removeStudent(id));
    setSelected(new Set());
    showToast(`${selected.size} santri dihapus`);
  }

  // Add student modal
  const [form, setForm] = useState({ nama:'', gender:'L', lahir:'', waliSantri:'', status:'Aktif' });

  function openModal() {
    setGeneratedNIS(generateNIS(students));
    setForm({ nama:'', gender:'L', lahir:'', waliSantri:'', status:'Aktif' });
    setShowModal(true);
  }

  function handleAddSantri(e) {
    e.preventDefault();
    if (!form.nama.trim()) return;
    const colorIdx = students.length % COLORS.length;
    addStudent({
      id: generatedNIS,
      kelasId: activeKelasId,
      nama: form.nama.trim(),
      gender: form.gender,
      lahir: form.lahir || '—',
      waliSantri: form.waliSantri || '—',
      status: form.status,
      color: COLORS[colorIdx],
    });
    setShowModal(false);
    showToast(`Santri "${form.nama}" (NIS ${generatedNIS}) berhasil ditambahkan`);
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div>
            <h1>Siswa &amp; Kelas</h1>
            <div className="crumb">Kelola data santri per lembaga</div>
          </div>
          <div className="spacer"/>
          <div className="seg">
            <button className={lembaga==='TPQ' ? 'on' : ''} onClick={() => { setLembaga('TPQ'); handleLembaga('TPQ'); }}>TPQ</button>
            <button className={lembaga==='Madin' ? 'on' : ''} onClick={() => { setLembaga('Madin'); handleLembaga('Madin'); }}>Madin</button>
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
          {/* Class rail */}
          <div className="row between" style={{marginBottom:12}}>
            <div className="section-title">{lembaga} — {kelasList.length} Kelas</div>
            <button className="btn sm" onClick={openModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Tambah Santri
            </button>
          </div>

          <div className="class-rail" style={{gridTemplateColumns:`repeat(${kelasList.length},1fr)`}}>
            {kelasSummary.map(k => (
              <div
                key={k.id}
                className={`class-card${activeKelasId === k.id ? ' active' : ''}`}
                onClick={() => { setActiveKelasId(k.id); setSearch(''); setPage(1); setSelected(new Set()); }}
              >
                <div className="kn b-teal">{k.nomor}</div>
                <div className="ct">{k.label}</div>
                <div className="cm">{k.jumlah} santri</div>
                {k.avg !== null && (
                  <div className={`avg score ${scoreClass(k.avg)}`}>{k.avg}</div>
                )}
              </div>
            ))}
          </div>

          {/* Student table */}
          <div className="card panel">
            <div className="toolbar">
              <div style={{fontWeight:800,fontSize:15}}>
                {lembaga} · {activeKelas?.label}
                <span className="muted" style={{fontWeight:600}}> — {filtered.length} santri</span>
                {selected.size > 0 && (
                  <span className="badge b-teal" style={{marginLeft:10}}>{selected.size} dipilih</span>
                )}
              </div>
              <div className="spacer"/>
              <div className="search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4" strokeLinecap="round"/>
                </svg>
                <input
                  placeholder="Cari nama / NIS santri..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              {selected.size > 0 && (
                <button className="btn" style={{color:'var(--red)'}} onClick={handleDelete}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
                  </svg>
                  Hapus ({selected.size})
                </button>
              )}
              <button className="btn primary" onClick={openModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Tambah Santri
              </button>
            </div>

            <table className="tbl">
              <thead>
                <tr>
                  <th style={{width:38}}>
                    <span className={`checkbox${allOnPageSelected ? ' on' : ''}`} onClick={toggleAll}>
                      {allOnPageSelected && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                    </span>
                  </th>
                  <th>Santri</th>
                  <th>NIS</th>
                  <th>L/P</th>
                  <th>Wali Santri</th>
                  <th>Rata-rata</th>
                  <th>Status</th>
                  <th style={{width:48}}/>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:'32px',color:'var(--muted)'}}>
                    {search ? 'Santri tidak ditemukan' : 'Belum ada santri di kelas ini'}
                  </td></tr>
                ) : paged.map(s => {
                  const na = calcNilaiAkhir(grades[s.id], mapelList, 'UAS');
                  const isChecked = selected.has(s.id);
                  return (
                    <tr key={s.id}>
                      <td>
                        <span className={`checkbox${isChecked ? ' on' : ''}`} onClick={() => toggleSelect(s.id)}>
                          {isChecked && <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                        </span>
                      </td>
                      <td>
                        <div className="who-cell">
                          <div className="avatar" style={{background:s.color}}>{getInitials(s.nama)}</div>
                          <div><b>{s.nama}</b><span>Lahir: {s.lahir}</span></div>
                        </div>
                      </td>
                      <td className="num">{s.id}</td>
                      <td><span className={`badge ${s.gender==='L' ? 'b-blue' : 'b-violet'}`}>{s.gender}</span></td>
                      <td>{s.waliSantri}</td>
                      <td>
                        {na !== null
                          ? <span className={`score ${scoreClass(na)}`}>{na}</span>
                          : <span className="muted">—</span>
                        }
                      </td>
                      <td>
                        <span className={`badge ${s.status==='Aktif' ? 'b-green' : s.status==='Izin' ? 'b-amber' : 'b-red'}`}>
                          <span className="dot"/>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <div className="menu-dot">
                          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="row between" style={{padding:'14px 20px',borderTop:'1px solid var(--line-2)'}}>
              <span className="muted" style={{fontSize:'12.5px'}}>
                Menampilkan {filtered.length === 0 ? 0 : (currentPage-1)*PER_PAGE+1}–{Math.min(currentPage*PER_PAGE, filtered.length)} dari {filtered.length} santri
              </span>
              <div className="row" style={{gap:6}}>
                <button className="btn sm" disabled={currentPage <= 1} onClick={() => setPage(p => p-1)}>‹ Sebelumnya</button>
                {Array.from({length: totalPages}, (_,i) => (
                  <button key={i} className={`btn sm${currentPage===i+1 ? ' primary' : ''}`} onClick={() => setPage(i+1)}>{i+1}</button>
                ))}
                <button className="btn sm" disabled={currentPage >= totalPages} onClick={() => setPage(p => p+1)}>Berikutnya ›</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal tambah santri */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h3>Tambah Santri Baru</h3>
            <form onSubmit={handleAddSantri}>
              <div className="form-row-2">
                <div className="form-row">
                  <label>NIS (otomatis)</label>
                  <div style={{
                    display:'flex', alignItems:'center', gap:8,
                    background:'var(--brand-tint)', border:'1.5px solid var(--brand-100)',
                    borderRadius:10, padding:'9px 12px',
                  }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--brand-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <span style={{fontWeight:800, fontSize:15, color:'var(--brand-700)', fontVariantNumeric:'tabular-nums', letterSpacing:'0.5px'}}>
                      {generatedNIS}
                    </span>
                    <span style={{fontSize:11, color:'var(--muted)', marginLeft:'auto'}}>auto</span>
                  </div>
                </div>
                <div className="form-row">
                  <label>Jenis Kelamin</label>
                  <select className="form-input" value={form.gender} onChange={e => setForm(f=>({...f,gender:e.target.value}))}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label>Nama Lengkap *</label>
                <input className="form-input" placeholder="Nama santri..." value={form.nama} onChange={e => setForm(f=>({...f,nama:e.target.value}))} required/>
              </div>
              <div className="form-row-2">
                <div className="form-row">
                  <label>Tempat, Tgl Lahir</label>
                  <input className="form-input" placeholder="Kediri, 01 Jan 2018" value={form.lahir} onChange={e => setForm(f=>({...f,lahir:e.target.value}))}/>
                </div>
                <div className="form-row">
                  <label>Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                    <option>Aktif</option>
                    <option>Izin</option>
                    <option>Keluar</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label>Nama Wali Santri</label>
                <input className="form-input" placeholder="Bpk. / Ibu. ..." value={form.waliSantri} onChange={e => setForm(f=>({...f,waliSantri:e.target.value}))}/>
              </div>
              <div className="form-actions">
                <button type="button" className="btn" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn primary">Tambah Santri</button>
              </div>
            </form>
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
