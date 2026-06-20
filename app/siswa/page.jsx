'use client';
'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';
import { getInitials } from '../../lib/data';

const STATUS_LIST = ['Aktif', 'Lulus', 'Keluar', 'Dalam Pantauan'];
const PER_PAGE_OPTS = [20, 50, 100, 200];
const STATUS_BADGE = { Aktif: 'b-green', Lulus: 'b-violet', Keluar: 'b-red', 'Dalam Pantauan': 'b-amber' };
const COLORS = ['#0d9488','#7c3aed','#2563eb','#16a34a','#d4a056','#dc2626','#0891b2','#9333ea'];

const EMPTY_FORM = { nama: '', gender: 'L', kelasId: '', waliSantri: '', lahir: '', status: 'Aktif' };

function generateNIS(students) {
  const year = new Date().getFullYear().toString().slice(-2);
  const nums = students
    .map(s => s.id)
    .filter(id => id.startsWith(year) && id.length === 5)
    .map(id => parseInt(id.slice(2), 10))
    .filter(n => !isNaN(n));
  return year + String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(3, '0');
}

export default function SiswaPage() {
  const { students, kelas, addStudent, updateStudent, removeStudent, isHistory } = useStore();

  const [tab, setTab] = useState('Semua');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // Stats per status
  const counts = useMemo(() => {
    const map = { Semua: students.length };
    STATUS_LIST.forEach(s => { map[s] = students.filter(st => st.status === s).length; });
    return map;
  }, [students]);

  const filtered = useMemo(() => {
    let list = tab === 'Semua' ? students : students.filter(s => s.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.nama.toLowerCase().includes(q) || s.id.includes(q));
    }
    return list;
  }, [students, tab, search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  // Generate page number list with ellipsis
  function getPageNums(total, current) {
    if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
    const nums = new Set([1, total, current, current - 1, current + 1]);
    if (current <= 3) { nums.add(2); nums.add(3); nums.add(4); }
    if (current >= total - 2) { nums.add(total - 1); nums.add(total - 2); nums.add(total - 3); }
    return [...nums].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  }
  const pageNums = getPageNums(totalPages, page);

  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, id: generateNIS(students) });
    setShowModal(true);
  }

  function openEdit(s) {
    setEditId(s.id);
    setForm({ nama: s.nama, gender: s.gender, kelasId: s.kelasId ?? '', waliSantri: s.waliSantri ?? '', lahir: s.lahir ?? '', status: s.status ?? 'Aktif' });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama.trim()) return;
    if (editId) {
      updateStudent(editId, { nama: form.nama.trim(), gender: form.gender, kelasId: form.kelasId, waliSantri: form.waliSantri.trim(), lahir: form.lahir.trim(), status: form.status });
      showToast('Data siswa diperbarui');
    } else {
      const color = COLORS[students.length % COLORS.length];
      addStudent({ id: form.id, nama: form.nama.trim(), gender: form.gender, kelasId: form.kelasId, waliSantri: form.waliSantri.trim(), lahir: form.lahir.trim(), status: form.status, color });
      showToast('Siswa berhasil ditambahkan');
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    removeStudent(id);
    setConfirmDeleteId(null);
    showToast('Siswa dihapus');
  }

  const kelasOptions = kelas.slice().sort((a, b) => a.lembaga.localeCompare(b.lembaga) || a.nomor - b.nomor);

  const getKelasLabel = (kelasId) => {
    const k = kelas.find(k => k.id === kelasId);
    return k ? `${k.lembaga} · ${k.label}` : '—';
  };

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <HistoryBanner />
        <header className="topbar">
          <div>
            <h1>Data Siswa</h1>
            <div className="crumb">Semua siswa — aktif, lulus, maupun keluar</div>
          </div>
          <div className="spacer"/>
          {!isHistory && (
            <button className="btn primary" onClick={openAdd}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Tambah Siswa
            </button>
          )}
        </header>

        <div className="content">
          {/* Tab filter */}
          <div className="sv-tabs">
            {['Semua', ...STATUS_LIST].map(t => (
              counts[t] > 0 || t === 'Semua' ? (
                <button
                  key={t}
                  className={`sv-tab${tab === t ? ' active' : ''}`}
                  onClick={() => { setTab(t); setPage(1); }}
                >
                  {t}
                  <span className="sv-tab-count">{counts[t] ?? 0}</span>
                </button>
              ) : null
            ))}
          </div>

          <div className="card panel">
            <div className="toolbar">
              <div className="search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4" strokeLinecap="round"/>
                </svg>
                <input
                  placeholder="Cari nama atau NIS..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <div className="spacer"/>
              <span className="muted" style={{fontSize:13}}>{filtered.length} siswa</span>
              <select
                className="form-input"
                style={{width:'auto',padding:'5px 10px',fontSize:13}}
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              >
                {PER_PAGE_OPTS.map(n => <option key={n} value={n}>{n} per halaman</option>)}
              </select>
            </div>

            <table className="tbl">
              <thead>
                <tr>
                  <th style={{width:44}}>No</th>
                  <th>Nama Siswa</th>
                  <th style={{width:80}}>NIS</th>
                  <th style={{width:50}}>L/P</th>
                  <th>Kelas</th>
                  <th>Wali Santri</th>
                  <th style={{width:90}}>Status</th>
                  <th style={{width:80}}/>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>
                    {search ? 'Siswa tidak ditemukan' : 'Belum ada data siswa'}
                  </td></tr>
                ) : paged.map((s, i) => (
                  <tr key={s.id}>
                    <td className="num muted">{(page-1)*perPage + i + 1}</td>
                    <td>
                      <Link href={`/siswa/${s.id}`} className="who-cell" style={{textDecoration:'none',color:'inherit'}}>
                        <div className="avatar" style={{background: s.color}}>{getInitials(s.nama)}</div>
                        <b style={{color:'var(--brand)'}}>{s.nama}</b>
                      </Link>
                    </td>
                    <td className="num">{s.id}</td>
                    <td>
                      <span className={`badge ${s.gender === 'L' ? 'b-blue' : 'b-violet'}`}>{s.gender}</span>
                    </td>
                    <td className="muted" style={{fontSize:13}}>{getKelasLabel(s.kelasId)}</td>
                    <td style={{fontSize:13}}>{s.waliSantri || '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[s.status] ?? 'b-teal'}`}>{s.status}</span>
                    </td>
                    <td>
                      {!isHistory && (
                        <div className="row" style={{gap:4,justifyContent:'flex-end'}}>
                          <button className="icon-btn sm" title="Edit" onClick={() => openEdit(s)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/>
                            </svg>
                          </button>
                          <button className="icon-btn sm" title="Hapus" style={{color:'var(--red)'}} onClick={() => setConfirmDeleteId(s.id)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="pg-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
                {pageNums.flatMap((n, i) => {
                  const prev = pageNums[i - 1];
                  const items = [];
                  if (prev && n - prev > 1) items.push(<span key={`e-${n}`} className="pg-ellipsis">…</span>);
                  items.push(
                    <button key={n} className={`pg-btn${page === n ? ' active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                  );
                  return items;
                })}
                <button className="pg-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{maxWidth:480}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h3 style={{margin:0}}>{editId ? 'Edit Siswa' : 'Tambah Siswa'}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
              {!editId && (
                <div className="form-row">
                  <label className="form-label">NIS</label>
                  <input className="form-input" value={form.id} onChange={e => setForm(f => ({...f, id: e.target.value}))} required/>
                </div>
              )}
              <div className="form-row">
                <label className="form-label">Nama Lengkap</label>
                <input className="form-input" placeholder="Nama siswa..." value={form.nama} onChange={e => setForm(f => ({...f, nama: e.target.value}))} required autoFocus/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-row">
                  <label className="form-label">Jenis Kelamin</label>
                  <select className="form-input" value={form.gender} onChange={e => setForm(f => ({...f, gender: e.target.value}))}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                    {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label className="form-label">Kelas</label>
                <select className="form-input" value={form.kelasId} onChange={e => setForm(f => ({...f, kelasId: e.target.value}))}>
                  <option value="">— Tidak ada kelas —</option>
                  {kelasOptions.map(k => (
                    <option key={k.id} value={k.id}>{k.lembaga} · {k.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label className="form-label">Wali Santri</label>
                <input className="form-input" placeholder="Nama wali..." value={form.waliSantri} onChange={e => setForm(f => ({...f, waliSantri: e.target.value}))}/>
              </div>
              <div className="form-row">
                <label className="form-label">Tempat, Tanggal Lahir</label>
                <input className="form-input" placeholder="contoh: Kediri, 14 Mar 2010" value={form.lahir} onChange={e => setForm(f => ({...f, lahir: e.target.value}))}/>
              </div>
              <div className="form-actions" style={{marginTop:4}}>
                <button type="button" className="btn ghost" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn primary">{editId ? 'Simpan Perubahan' : 'Tambah Siswa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal" style={{maxWidth:380}} onClick={e => e.stopPropagation()}>
            <h3 style={{margin:'0 0 10px'}}>Hapus Siswa?</h3>
            <p style={{margin:'0 0 20px',fontSize:14,color:'var(--ink-2)'}}>
              Data siswa <b>{students.find(s => s.id === confirmDeleteId)?.nama}</b> akan dihapus permanen termasuk semua nilainya.
            </p>
            <div className="form-actions">
              <button className="btn ghost" onClick={() => setConfirmDeleteId(null)}>Batal</button>
              <button className="btn" style={{background:'var(--red)',color:'#fff'}} onClick={() => handleDelete(confirmDeleteId)}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
