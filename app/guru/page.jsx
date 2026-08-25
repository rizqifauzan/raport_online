'use client';
import { useState, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';
import { getInitials, TTD_DEFAULT } from '../../lib/data';

const COLORS = ['#0d9488','#7c3aed','#2563eb','#16a34a','#d4a056','#dc2626','#0891b2','#9333ea'];

// Gambar dikecilkan di browser sebelum dikirim, supaya tidak membebani database.
const MAX_W = 600;
const MAX_H = 260;

/**
 * Baca file gambar, kecilkan, dan kembalikan sebagai data URL PNG.
 * PNG dipertahankan agar latar transparan hasil pindaian tidak jadi hitam.
 */
function fileToScaledPng(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Berkas bukan gambar yang valid.'));
      img.onload = () => {
        const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Pratinjau kotak tanda tangan raport, memakai kalibrasi yang sedang diatur. */
function TtdPreview({ image, ttd, nama }) {
  return (
    <div className="ttd-preview">
      <div className="ttd-preview-role">Wali Kelas</div>
      <div className="ttd-preview-box">
        <span className="ttd-preview-guide" />
        {image ? (
          <img
            src={image}
            alt=""
            style={{
              transform: `translate(calc(-50% + ${ttd.x}px), ${ttd.y}px) scale(${ttd.scale / 100})`,
            }}
          />
        ) : (
          <span className="ttd-preview-empty">Belum ada tanda tangan</span>
        )}
      </div>
      <div className="ttd-preview-name">{nama || 'Nama Guru'}</div>
    </div>
  );
}

export default function GuruPage() {
  const {
    gurus, kelas, signatures,
    addGuru, updateGuru, removeGuru, setSignature, removeSignature, setWaliKelas,
  } = useStore();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nama: '', kelasIds: [], ttd: { ...TTD_DEFAULT } });
  // kelasIds di form hanyalah cerminan data kelas; sumbernya tetap kelas.waliGuruId
  const [draftImage, setDraftImage] = useState(null); // gambar dalam modal (belum tentu tersimpan)
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? gurus.filter(g => g.nama.toLowerCase().includes(q)) : gurus;
  }, [gurus, search]);

  const kelasOptions = kelas.slice().sort(
    (a, b) => a.lembaga.localeCompare(b.lembaga) || a.nomor - b.nomor
  );

  /** Kelas yang diampu seorang guru — dibaca dari data kelas, bukan disimpan ganda. */
  const kelasDiampu = (guruId) => kelas.filter(k => k.waliGuruId === guruId);

  function nextId() {
    const nums = gurus
      .map(g => parseInt(String(g.id).replace(/\D/g, ''), 10))
      .filter(n => !Number.isNaN(n));
    return `g-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
  }

  function openAdd() {
    setEditId(null);
    setForm({ nama: '', kelasIds: [], ttd: { ...TTD_DEFAULT } });
    setDraftImage(null);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(g) {
    setEditId(g.id);
    setForm({ nama: g.nama, kelasIds: kelasDiampu(g.id).map(k => k.id), ttd: { ...TTD_DEFAULT, ...g.ttd } });
    setDraftImage(signatures[g.id] ?? null);
    setFormError('');
    setShowModal(true);
  }

  async function handlePickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // biar file yang sama bisa dipilih lagi
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Pilih berkas gambar (PNG atau JPG).');
      return;
    }
    try {
      setBusy(true);
      setDraftImage(await fileToScaledPng(file));
      setFormError('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function setTtd(patch) {
    setForm(f => ({ ...f, ttd: { ...f.ttd, ...patch } }));
  }

  function toggleKelas(id) {
    setForm(f => ({
      ...f,
      kelasIds: f.kelasIds.includes(id)
        ? f.kelasIds.filter(k => k !== id)
        : [...f.kelasIds, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nama = form.nama.trim();
    if (!nama) return;

    setBusy(true);
    try {
      const id = editId ?? nextId();
      const payload = { nama, ttd: form.ttd };

      if (editId) updateGuru(editId, payload);
      else addGuru({ id, ...payload, color: COLORS[gurus.length % COLORS.length] });

      // Penetapan wali kelas ditulis ke data kelas
      const sebelumnya = editId ? kelasDiampu(editId).map(k => k.id) : [];
      sebelumnya.filter(kid => !form.kelasIds.includes(kid)).forEach(kid => setWaliKelas(kid, null));
      form.kelasIds.filter(kid => !sebelumnya.includes(kid)).forEach(kid => setWaliKelas(kid, id));

      // Gambar disimpan lewat jalurnya sendiri
      const tersimpan = signatures[id] ?? null;
      if (draftImage && draftImage !== tersimpan) {
        const res = await setSignature(id, draftImage);
        if (!res.ok) { setFormError(res.error); return; }
      } else if (!draftImage && tersimpan) {
        await removeSignature(id);
      }

      showToast(editId ? 'Data guru diperbarui' : 'Guru berhasil ditambahkan');
      setShowModal(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    await removeGuru(id);
    setConfirmDeleteId(null);
    showToast('Guru dihapus');
  }

  const kelasLabel = (id) => {
    const k = kelas.find(k => k.id === id);
    return k ? `${k.lembaga} · ${k.label}` : id;
  };

  const berTtd = gurus.filter(g => signatures[g.id]).length;

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <HistoryBanner />
        <header className="topbar">
          <div>
            <h1>Guru &amp; Tanda Tangan</h1>
            <div className="crumb">
              Tanda tangan tersimpan di sini akan tercetak otomatis di raport kelas yang diampu
            </div>
          </div>
          <div className="spacer"/>
          <button className="btn primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Tambah Guru
          </button>
        </header>

        <div className="content">
          <div className="card panel">
            <div className="toolbar">
              <div className="search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4" strokeLinecap="round"/>
                </svg>
                <input placeholder="Cari nama guru..." value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
              <div className="spacer"/>
              <span className="muted" style={{fontSize:13}}>
                {filtered.length} guru · {berTtd} sudah punya TTD
              </span>
            </div>

            <table className="tbl">
              <thead>
                <tr>
                  <th style={{width:44}}>No</th>
                  <th style={{width:70}}>ID</th>
                  <th>Nama Guru</th>
                  <th style={{width:190}}>Tanda Tangan</th>
                  <th>Kelas Diampu</th>
                  <th style={{width:80}}/>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--muted)'}}>
                    {search ? 'Guru tidak ditemukan' : 'Belum ada data guru'}
                  </td></tr>
                ) : filtered.map((g, i) => (
                  <tr key={g.id}>
                    <td className="num muted">{i + 1}</td>
                    <td className="num muted">{g.id}</td>
                    <td>
                      <div className="who-cell">
                        <div className="avatar" style={{background: g.color ?? '#0d9488'}}>{getInitials(g.nama)}</div>
                        <b>{g.nama}</b>
                      </div>
                    </td>
                    <td>
                      {signatures[g.id] ? (
                        <img src={signatures[g.id]} alt={`TTD ${g.nama}`} className="ttd-thumb"/>
                      ) : (
                        <span className="badge b-amber">Belum ada</span>
                      )}
                    </td>
                    <td>
                      {kelasDiampu(g.id).length ? (
                        <div className="row" style={{gap:5,flexWrap:'wrap'}}>
                          {kelasDiampu(g.id).map(k => (
                            <span key={k.id} className="badge b-teal">{kelasLabel(k.id)}</span>
                          ))}
                        </div>
                      ) : <span className="muted" style={{fontSize:13}}>—</span>}
                    </td>
                    <td>
                      <div className="row" style={{gap:4,justifyContent:'flex-end'}}>
                        <button className="icon-btn sm" title="Edit" onClick={() => openEdit(g)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z"/>
                          </svg>
                        </button>
                        <button className="icon-btn sm" title="Hapus" style={{color:'var(--red)'}} onClick={() => setConfirmDeleteId(g.id)}>
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
            Penetapan wali kelas tersimpan pada data kelas — bisa diatur dari sini maupun
            dari halaman <b>Siswa &amp; Kelas</b> saat membuat atau mengubah kelas. Satu kelas
            hanya punya satu wali; mencentang kelas yang sudah dipegang guru lain akan
            memindahkannya.
          </p>
        </div>
      </div>

      {/* Tambah / Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !busy && setShowModal(false)}>
          <div className="modal" style={{maxWidth:640}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <h3 style={{margin:0}}>{editId ? 'Edit Guru' : 'Tambah Guru'}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div className="form-row">
                <label className="form-label">Nama Guru</label>
                <input className="form-input" placeholder="contoh: Ust. Salim" value={form.nama}
                  onChange={e => setForm(f => ({...f, nama: e.target.value}))} required autoFocus/>
              </div>

              <div className="form-row">
                <label className="form-label">Kelas Diampu <span className="muted" style={{fontWeight:500}}>(boleh lebih dari satu)</span></label>
                <div className="ttd-kelas-grid">
                  {kelasOptions.map(k => {
                    const lain = k.waliGuruId && k.waliGuruId !== editId
                      ? gurus.find(g => g.id === k.waliGuruId)
                      : null;
                    return (
                      <label
                        key={k.id}
                        className={`ttd-kelas-chip${form.kelasIds.includes(k.id) ? ' on' : ''}`}
                        title={lain ? `Saat ini wali kelasnya ${lain.nama}` : undefined}
                      >
                        <input type="checkbox" checked={form.kelasIds.includes(k.id)} onChange={() => toggleKelas(k.id)}/>
                        <span>
                          {k.lembaga} · {k.label}
                          {lain && <em className="ttd-kelas-taken">{lain.nama}</em>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="ttd-editor">
                <div>
                  <label className="form-label">Gambar Tanda Tangan</label>
                  <div className="ttd-drop">
                    {draftImage
                      ? <img src={draftImage} alt="Pratinjau tanda tangan"/>
                      : <span className="muted" style={{fontSize:12.5}}>PNG latar transparan paling rapi</span>}
                  </div>
                  <div className="row" style={{gap:8,marginTop:10}}>
                    <button type="button" className="btn sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                      {draftImage ? 'Ganti Gambar' : 'Pilih Gambar'}
                    </button>
                    {draftImage && (
                      <button type="button" className="btn sm ghost" style={{color:'var(--red)'}} onClick={() => setDraftImage(null)}>
                        Hapus
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={handlePickFile}/>
                  </div>
                  <p className="muted" style={{fontSize:11.5,marginTop:8,lineHeight:1.55}}>
                    Gambar otomatis dikecilkan ke maks. {MAX_W}×{MAX_H} px sebelum disimpan.
                  </p>
                </div>

                <div>
                  <label className="form-label">Posisi di Raport</label>
                  <TtdPreview image={draftImage} ttd={form.ttd} nama={form.nama}/>

                  <div className="ttd-sliders">
                    <label>
                      <span>Geser ↔<b>{form.ttd.x > 0 ? `+${form.ttd.x}` : form.ttd.x}</b></span>
                      <input type="range" min={-40} max={40} value={form.ttd.x}
                        onChange={e => setTtd({ x: Number(e.target.value) })}/>
                    </label>
                    <label>
                      <span>Geser ↕<b>{form.ttd.y > 0 ? `+${form.ttd.y}` : form.ttd.y}</b></span>
                      <input type="range" min={-30} max={30} value={form.ttd.y}
                        onChange={e => setTtd({ y: Number(e.target.value) })}/>
                    </label>
                    <label>
                      <span>Ukuran<b>{form.ttd.scale}%</b></span>
                      <input type="range" min={40} max={160} value={form.ttd.scale}
                        onChange={e => setTtd({ scale: Number(e.target.value) })}/>
                    </label>
                    <button type="button" className="btn sm ghost" onClick={() => setTtd({ ...TTD_DEFAULT })}>
                      Reset posisi
                    </button>
                  </div>
                </div>
              </div>

              {formError && (
                <div style={{background:'var(--red-soft)',color:'var(--red)',padding:'10px 12px',
                  borderRadius:'var(--r-sm)',fontSize:13,fontWeight:600}}>{formError}</div>
              )}

              <div className="form-actions" style={{marginTop:4}}>
                <button type="button" className="btn ghost" onClick={() => setShowModal(false)} disabled={busy}>Batal</button>
                <button type="submit" className="btn primary" disabled={busy}>
                  {busy ? 'Menyimpan…' : (editId ? 'Simpan Perubahan' : 'Tambah Guru')}
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
            <h3 style={{margin:'0 0 10px'}}>Hapus Guru?</h3>
            <p style={{margin:'0 0 20px',fontSize:14,color:'var(--ink-2)'}}>
              Data <b>{gurus.find(g => g.id === confirmDeleteId)?.nama}</b> beserta gambar
              tanda tangannya akan dihapus permanen.
            </p>
            <div className="form-actions">
              <button className="btn ghost" onClick={() => setConfirmDeleteId(null)}>Batal</button>
              <button className="btn" style={{background:'var(--red)',color:'#fff'}}
                onClick={() => handleDelete(confirmDeleteId)}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
