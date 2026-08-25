'use client';
import { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';
import { getInitials, ROLES } from '../../lib/data';

const STATUS_LIST = ['Aktif', 'Nonaktif'];
const STATUS_BADGE = { Aktif: 'b-green', Nonaktif: 'b-red' };
const ROLE_BADGE = { admin: 'b-violet', operator: 'b-blue' };
const COLORS = ['#0d9488','#7c3aed','#2563eb','#16a34a','#d4a056','#dc2626','#0891b2','#9333ea'];

const EMPTY_FORM = {
  nama: '', username: '', email: '', role: 'operator', status: 'Aktif',
};

const roleLabel = (id) => ROLES.find(r => r.id === id)?.label ?? id;

export default function PenggunaPage() {
  const { users, addUser, updateUser, removeUser, isUsernameTaken } = useStore();

  const [tab, setTab] = useState('Semua');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const counts = useMemo(() => {
    const map = { Semua: users.length };
    ROLES.forEach(r => { map[r.id] = users.filter(u => u.role === r.id).length; });
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    let list = tab === 'Semua' ? users : users.filter(u => u.role === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.nama.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, tab, search]);

  const adminAktif = users.filter(u => u.role === 'admin' && u.status === 'Aktif');

  function nextId() {
    const nums = users
      .map(u => parseInt(String(u.id).replace(/\D/g, ''), 10))
      .filter(n => !Number.isNaN(n));
    return `u-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
  }

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(u) {
    setEditId(u.id);
    setForm({
      nama: u.nama, username: u.username, email: u.email ?? '',
      role: u.role, status: u.status ?? 'Aktif',
    });
    setFormError('');
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nama = form.nama.trim();
    const username = form.username.trim();
    if (!nama || !username) return;

    if (isUsernameTaken(username, editId)) {
      setFormError(`Username "${username}" sudah dipakai pengguna lain.`);
      return;
    }

    // Jangan sampai tidak ada admin aktif yang tersisa.
    const current = editId ? users.find(u => u.id === editId) : null;
    if (current?.role === 'admin' && current.status === 'Aktif') {
      const masihAdmin = form.role === 'admin' && form.status === 'Aktif';
      if (!masihAdmin && adminAktif.length === 1) {
        setFormError('Ini satu-satunya admin aktif. Angkat admin lain dulu sebelum mengubah yang ini.');
        return;
      }
    }

    const payload = {
      nama,
      username,
      email: form.email.trim(),
      role: form.role,
      status: form.status,
    };

    if (editId) {
      updateUser(editId, payload);
      showToast('Data pengguna diperbarui');
    } else {
      addUser({
        id: nextId(),
        ...payload,
        dibuat: new Date().toISOString().slice(0, 10),
        color: COLORS[users.length % COLORS.length],
      });
      showToast('Pengguna berhasil ditambahkan');
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    removeUser(id);
    setConfirmDeleteId(null);
    showToast('Pengguna dihapus');
  }

  const targetHapus = users.find(u => u.id === confirmDeleteId);
  const hapusAdminTerakhir =
    targetHapus?.role === 'admin' && targetHapus.status === 'Aktif' && adminAktif.length === 1;

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <HistoryBanner />
        <header className="topbar">
          <div>
            <h1>Pengguna</h1>
            <div className="crumb">Admin dan operator yang punya akses aplikasi</div>
          </div>
          <div className="spacer"/>
          <button className="btn primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Tambah Pengguna
          </button>
        </header>

        <div className="content">
          <div className="sv-tabs">
            {['Semua', ...ROLES.map(r => r.id)].map(t => (
              <button
                key={t}
                className={`sv-tab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'Semua' ? 'Semua' : roleLabel(t)}
                <span className="sv-tab-count">{counts[t] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="card panel">
            <div className="toolbar">
              <div className="search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4" strokeLinecap="round"/>
                </svg>
                <input
                  placeholder="Cari nama, username, atau email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="spacer"/>
              <span className="muted" style={{fontSize:13}}>{filtered.length} pengguna</span>
            </div>

            <table className="tbl">
              <thead>
                <tr>
                  <th style={{width:44}}>No</th>
                  <th>Nama</th>
                  <th style={{width:120}}>Username</th>
                  <th>Email</th>
                  <th style={{width:110}}>Peran</th>
                  <th style={{width:110}}>Dibuat</th>
                  <th style={{width:90}}>Status</th>
                  <th style={{width:80}}/>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>
                    {search ? 'Pengguna tidak ditemukan' : 'Belum ada pengguna'}
                  </td></tr>
                ) : filtered.map((u, i) => (
                  <tr key={u.id}>
                    <td className="num muted">{i + 1}</td>
                    <td>
                      <div className="who-cell">
                        <div className="avatar" style={{background: u.color}}>{getInitials(u.nama)}</div>
                        <b>{u.nama}</b>
                      </div>
                    </td>
                    <td className="num">{u.username}</td>
                    <td className="muted" style={{fontSize:13}}>{u.email || '—'}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role] ?? 'b-teal'}`}>{roleLabel(u.role)}</span>
                    </td>
                    <td className="muted" style={{fontSize:13}}>{u.dibuat ?? '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[u.status] ?? 'b-teal'}`}>{u.status}</span>
                    </td>
                    <td>
                      <div className="row" style={{gap:4,justifyContent:'flex-end'}}>
                        <button className="icon-btn sm" title="Edit" onClick={() => openEdit(u)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/>
                          </svg>
                        </button>
                        <button className="icon-btn sm" title="Hapus" style={{color:'var(--red)'}} onClick={() => setConfirmDeleteId(u.id)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="muted" style={{fontSize:12.5,marginTop:14,lineHeight:1.6}}>
            Modul ini mengelola <b>daftar pengguna dan perannya</b>. Aplikasi belum punya
            halaman login, jadi password sengaja tidak disimpan di sini — lihat catatan
            keamanan di README sebelum mengaktifkan autentikasi.
          </p>
        </div>
      </div>

      {/* Tambah / Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{maxWidth:480}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h3 style={{margin:0}}>{editId ? 'Edit Pengguna' : 'Tambah Pengguna'}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="form-row">
                <label className="form-label">Nama Lengkap</label>
                <input className="form-input" placeholder="contoh: Ust. Salim" value={form.nama}
                  onChange={e => setForm(f => ({...f, nama: e.target.value}))} required autoFocus/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-row">
                  <label className="form-label">Username</label>
                  <input className="form-input" placeholder="salim" value={form.username}
                    onChange={e => { setForm(f => ({...f, username: e.target.value})); setFormError(''); }} required/>
                </div>
                <div className="form-row">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status}
                    onChange={e => { setForm(f => ({...f, status: e.target.value})); setFormError(''); }}>
                    {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="nama@pesantren.sch.id" value={form.email}
                  onChange={e => setForm(f => ({...f, email: e.target.value}))}/>
              </div>

              <div className="form-row">
                <label className="form-label">Peran</label>
                <select className="form-input" value={form.role}
                  onChange={e => { setForm(f => ({...f, role: e.target.value})); setFormError(''); }}>
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <span className="muted" style={{fontSize:12,marginTop:5,display:'block'}}>
                  {ROLES.find(r => r.id === form.role)?.desc}
                </span>
              </div>

              {formError && (
                <div style={{
                  background:'var(--red-soft)', color:'var(--red)', padding:'10px 12px',
                  borderRadius:'var(--r-sm)', fontSize:13, fontWeight:600,
                }}>
                  {formError}
                </div>
              )}

              <div className="form-actions" style={{marginTop:4}}>
                <button type="button" className="btn ghost" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn primary">
                  {editId ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal" style={{maxWidth:380}} onClick={e => e.stopPropagation()}>
            <h3 style={{margin:'0 0 10px'}}>Hapus Pengguna?</h3>
            {hapusAdminTerakhir ? (
              <p style={{margin:'0 0 20px',fontSize:14,color:'var(--ink-2)'}}>
                <b>{targetHapus?.nama}</b> adalah satu-satunya admin aktif. Angkat admin lain
                dulu sebelum menghapus pengguna ini.
              </p>
            ) : (
              <p style={{margin:'0 0 20px',fontSize:14,color:'var(--ink-2)'}}>
                Akses <b>{targetHapus?.nama}</b> akan dicabut dan datanya dihapus permanen.
              </p>
            )}
            <div className="form-actions">
              <button className="btn ghost" onClick={() => setConfirmDeleteId(null)}>Batal</button>
              {!hapusAdminTerakhir && (
                <button className="btn" style={{background:'var(--red)',color:'#fff'}} onClick={() => handleDelete(confirmDeleteId)}>Ya, Hapus</button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
