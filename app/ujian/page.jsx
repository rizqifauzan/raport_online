'use client';
import { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';
export default function UjianPage() {
  const { lembaga, setLembaga, periode, setPeriode, kelas, ujian, ujianNilai, addUjian, removeUjian, updateUjian } = useStore();

  const kelasList = kelas.filter(k => k.lembaga === lembaga);
  const [activeKelasId, setActiveKelasId] = useState(kelasList[0]?.id ?? '');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('ok');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = add, id = edit
  const [form, setForm] = useState({ nama: '', tipe: 'Tertulis' });

  function showToast(msg, type = 'ok') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 2500);
  }

  function handleLembaga(l) {
    const newKelas = kelas.filter(k => k.lembaga === l);
    setLembaga(l);
    setActiveKelasId(newKelas[0]?.id ?? '');
  }

  const activeKelas = kelas.find(k => k.id === activeKelasId);

  const kelasSummary = useMemo(() => kelasList.map(k => ({
    ...k,
    jumlah: ujian.filter(u => u.kelasId === k.id && u.periode === periode).length,
  })), [kelasList, ujian, periode]);

  const ujianKelas = useMemo(
    () => ujian.filter(u => u.kelasId === activeKelasId && u.periode === periode),
    [ujian, activeKelasId, periode]
  );

  function openAdd() {
    setEditTarget(null);
    setForm({ nama: '', tipe: 'Tertulis' });
    setShowModal(true);
  }

  function openEdit(u) {
    setEditTarget(u.id);
    setForm({ nama: u.nama, tipe: u.tipe });
    setShowModal(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama.trim()) return;
    if (editTarget) {
      updateUjian(editTarget, { nama: form.nama.trim(), tipe: form.tipe });
      showToast('Ujian berhasil diperbarui');
    } else {
      const id = `ujian-${Date.now()}`;
      addUjian({ id, kelasId: activeKelasId, nama: form.nama.trim(), tipe: form.tipe, periode });
      showToast('Ujian berhasil ditambahkan');
    }
    setShowModal(false);
  }

  function handleDelete(u) {
    const hasNilai = ujianNilai[u.id] && Object.keys(ujianNilai[u.id]).length > 0;
    if (hasNilai) {
      showToast('Ujian tidak bisa dihapus karena sudah ada nilai terkait', 'err');
      return;
    }
    removeUjian(u.id);
    showToast(`Ujian "${u.nama}" dihapus`);
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
          <HistoryBanner />
        <header className="topbar">
          <div>
            <h1>Mapel Ujian</h1>
            <div className="crumb">Kelola daftar ujian per kelas</div>
          </div>
          <div className="spacer"/>
          <div className="seg">
            <button className={lembaga === 'TPQ' ? 'on' : ''} onClick={() => handleLembaga('TPQ')}>TPQ</button>
            <button className={lembaga === 'Madin' ? 'on' : ''} onClick={() => handleLembaga('Madin')}>Madin</button>
          </div>
          <div className="seg gold">
            <button className={periode === 'UTS' ? 'on' : ''} onClick={() => setPeriode('UTS')}>UTS</button>
            <button className={periode === 'UAS' ? 'on' : ''} onClick={() => setPeriode('UAS')}>UAS</button>
          </div>

          <button className="icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 9a6 6 0 1112 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z"/>
              <path d="M10 19a2 2 0 004 0"/>
            </svg>
          </button>
        </header>

        <div className="content">
          <div className="row between" style={{marginBottom:12}}>
            <div className="section-title">{lembaga} — {kelasList.length} Kelas</div>
            <button className="btn sm" onClick={openAdd}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Tambah Ujian
            </button>
          </div>

          <div className="class-rail" style={{gridTemplateColumns:`repeat(${kelasList.length},1fr)`}}>
            {kelasSummary.map(k => (
              <div
                key={k.id}
                className={`class-card${activeKelasId === k.id ? ' active' : ''}`}
                onClick={() => setActiveKelasId(k.id)}
              >
                <div className="kn b-teal">{k.nomor}</div>
                <div className="ct">{k.label}</div>
                <div className="cm">{k.jumlah} ujian</div>
              </div>
            ))}
          </div>

          <div className="card panel">
            <div className="toolbar">
              <div style={{fontWeight:800,fontSize:15}}>
                {lembaga} · {activeKelas?.label}
                <span className="muted" style={{fontWeight:600}}> — {ujianKelas.length} ujian</span>
              </div>
              <div className="spacer"/>
              <button className="btn sm" onClick={openAdd}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Tambah
              </button>
            </div>

            {ujianKelas.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="M9 12h6M9 16h4"/>
                </svg>
                <p>Belum ada ujian untuk kelas ini</p>
                <button className="btn sm" onClick={openAdd}>Tambah Ujian Pertama</button>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{width:44}}>No</th>
                    <th>Nama Ujian</th>
                    <th style={{width:120}}>Tipe</th>
                    <th style={{width:100}}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {ujianKelas.map((u, i) => {
                    const hasNilai = ujianNilai[u.id] && Object.keys(ujianNilai[u.id]).length > 0;
                    return (
                      <tr key={u.id}>
                        <td className="num muted">{i + 1}</td>
                        <td><b>{u.nama}</b></td>
                        <td>
                          <span className={`badge ${u.tipe === 'Praktik' ? 'b-violet' : u.tipe === 'Kustom' ? 'b-gold' : 'b-blue'}`}>{u.tipe}</span>
                        </td>
                        <td>
                          <div className="row" style={{gap:6}}>
                            <button className="icon-btn sm" title="Edit" onClick={() => openEdit(u)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              className="icon-btn sm"
                              title={hasNilai ? 'Sudah ada nilai, tidak bisa dihapus' : 'Hapus'}
                              style={hasNilai ? {opacity:.4,cursor:'not-allowed'} : {}}
                              onClick={() => handleDelete(u)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
                <h3 style={{margin:0}}>{editTarget ? 'Edit Ujian' : 'Tambah Ujian'}</h3>
                <button className="icon-btn" onClick={() => setShowModal(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <label>Nama Ujian</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Ujian Baca Al-Qur'an"
                    value={form.nama}
                    onChange={e => setForm(f => ({...f, nama: e.target.value}))}
                    autoFocus
                  />
                </div>

                <div className="form-row">
                  <label>Tipe Ujian</label>
                  <div className="tipe-toggle tipe-toggle-3">
                    <button type="button" className={`tipe-opt${form.tipe === 'Tertulis' ? ' on' : ''}`} onClick={() => setForm(f => ({...f, tipe: 'Tertulis'}))}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      Tertulis
                    </button>
                    <button type="button" className={`tipe-opt${form.tipe === 'Praktik' ? ' on' : ''}`} onClick={() => setForm(f => ({...f, tipe: 'Praktik'}))}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 8a5 5 0 010 8M7 8a5 5 0 000 8M12 3v2M12 19v2"/><circle cx="12" cy="12" r="3"/></svg>
                      Praktik
                    </button>
                    <button type="button" className={`tipe-opt tipe-opt-custom${form.tipe === 'Kustom' ? ' on' : ''}`} onClick={() => setForm(f => ({...f, tipe: 'Kustom'}))}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      Kustom
                      <span className="tipe-opt-note">nilai teks, tidak dihitung</span>
                    </button>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn ghost" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn" disabled={!form.nama.trim()}>
                    {editTarget ? 'Simpan Perubahan' : 'Tambah Ujian'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`toast${toastType === 'err' ? ' toast-err' : ''}`}>{toast}</div>
        )}
      </div>
    </div>
  );
}
