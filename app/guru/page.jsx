'use client';
import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';
import { getInitials, TTD_DEFAULT } from '../../lib/data';

const COLORS = ['#0d9488','#7c3aed','#2563eb','#16a34a','#d4a056','#dc2626','#0891b2','#9333ea'];

// Gambar dikecilkan di browser sebelum dikirim, supaya tidak membebani database.
const MAX_W = 600;
const MAX_H = 260;

// Batas geser — dipakai bersama oleh slider dan seretan tetikus agar konsisten.
const BATAS_X = 80;
const BATAS_Y = 60;
const SKALA_MIN = 40;
const SKALA_MAX = 300;
const jepit = (nilai, batas) => Math.max(-batas, Math.min(batas, Math.round(nilai)));
const jepitSkala = (nilai) => Math.max(SKALA_MIN, Math.min(SKALA_MAX, Math.round(nilai)));

// Pegangan ukuran di empat sudut, seperti gambar terpilih di Word.
const SUDUT = [
  { id: 'kiri-atas',   x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'kanan-atas',  x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'kiri-bawah',  x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'kanan-bawah', x: 1, y: 1, cursor: 'nwse-resize' },
];

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

/**
 * Pratinjau kotak tanda tangan raport, memakai kalibrasi yang sedang diatur.
 *
 * Bila `onChange` diberikan dan gambarnya ada, tanda tangan bisa diatur
 * langsung dengan tetikus — seperti gambar di Word:
 *   - seret badan gambar  → menggeser  (ttd.x / ttd.y)
 *   - tarik pegangan sudut → mengubah ukuran (ttd.scale)
 *   - Ctrl/⌘ + roda tetikus → mengubah ukuran tanpa melepas kursor
 * Semuanya menulis nilai yang sama dengan slider.
 */
function TtdPreview({ image, ttd, nama, onChange }) {
  const kotakRef = useRef(null);
  const gambarRef = useRef(null);
  const aksi = useRef(null);
  const [mode, setMode] = useState(null);            // 'geser' | 'ukur' | null
  const [bingkai, setBingkai] = useState(null);      // posisi gambar untuk menaruh pegangan
  const interaktif = Boolean(image && onChange);

  // Pegangan mengikuti gambar; rect dibaca setelah transform diterapkan.
  useLayoutEffect(() => {
    if (!interaktif || !gambarRef.current || !kotakRef.current) { setBingkai(null); return; }
    const g = gambarRef.current.getBoundingClientRect();
    const k = kotakRef.current.getBoundingClientRect();
    setBingkai({
      left: g.left - k.left, top: g.top - k.top, width: g.width, height: g.height,
      kotakW: k.width, kotakH: k.height,
    });
  }, [image, ttd.x, ttd.y, ttd.scale, interaktif]);

  function mulaiGeser(e) {
    if (!interaktif) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    aksi.current = { jenis: 'geser', x: e.clientX, y: e.clientY, awal: { x: ttd.x, y: ttd.y } };
    setMode('geser');
  }

  function mulaiUkur(e) {
    if (!interaktif) return;
    e.preventDefault();
    e.stopPropagation();                      // jangan ikut menggeser
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // transform-origin gambar adalah "top center", jadi titik itu tidak ikut
    // bergerak saat diperbesar — pas dipakai sebagai poros pengukuran.
    const g = gambarRef.current.getBoundingClientRect();
    const poros = { x: g.left + g.width / 2, y: g.top };
    const jarak = Math.hypot(e.clientX - poros.x, e.clientY - poros.y);
    aksi.current = { jenis: 'ukur', poros, jarakAwal: Math.max(jarak, 1), skalaAwal: ttd.scale };
    setMode('ukur');
  }

  function gerak(e) {
    const a = aksi.current;
    if (!a) return;
    if (a.jenis === 'geser') {
      onChange({
        x: jepit(a.awal.x + (e.clientX - a.x), BATAS_X),
        y: jepit(a.awal.y + (e.clientY - a.y), BATAS_Y),
      });
    } else {
      const jarak = Math.hypot(e.clientX - a.poros.x, e.clientY - a.poros.y);
      onChange({ scale: jepitSkala(a.skalaAwal * (jarak / a.jarakAwal)) });
    }
  }

  function selesai(e) {
    if (!aksi.current) return;
    aksi.current = null;
    setMode(null);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  // Ctrl/⌘ + roda tetikus untuk mengubah ukuran (roda polos tetap menggulir modal).
  function roda(e) {
    if (!interaktif || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    onChange({ scale: jepitSkala(ttd.scale - e.deltaY * 0.1) });
  }

  return (
    <div className="ttd-preview">
      <div className="ttd-preview-role">Wali Kelas</div>
      <div
        ref={kotakRef}
        className={`ttd-preview-box${interaktif ? ' bisa-seret' : ''}${mode ? ` sedang-${mode}` : ''}`}
        onPointerDown={mulaiGeser}
        onPointerMove={gerak}
        onPointerUp={selesai}
        onPointerCancel={selesai}
        onWheel={roda}
      >
        <span className="ttd-preview-guide" />
        {image ? (
          <img
            ref={gambarRef}
            src={image}
            alt=""
            draggable={false}
            style={{
              transform: `translate(calc(-50% + ${ttd.x}px), ${ttd.y}px) scale(${ttd.scale / 100})`,
            }}
          />
        ) : (
          <span className="ttd-preview-empty">Belum ada tanda tangan</span>
        )}

        {interaktif && bingkai && (
          <>
            <div
              className="ttd-frame"
              style={{ left: bingkai.left, top: bingkai.top, width: bingkai.width, height: bingkai.height }}
            />
            {SUDUT.map(sudut => {
              // Pegangan dijepit ke dalam kotak pratinjau supaya tetap bisa
              // diraih walau gambarnya sudah lebih besar dari kotaknya.
              const px = bingkai.left + sudut.x * bingkai.width;
              const py = bingkai.top + sudut.y * bingkai.height;
              const INSET = 5;
              return (
                <span
                  key={sudut.id}
                  className="ttd-handle"
                  style={{
                    left: Math.max(INSET, Math.min(bingkai.kotakW - INSET, px)),
                    top: Math.max(INSET, Math.min(bingkai.kotakH - INSET, py)),
                    cursor: sudut.cursor,
                  }}
                  onPointerDown={mulaiUkur}
                  onPointerMove={gerak}
                  onPointerUp={selesai}
                  onPointerCancel={selesai}
                />
              );
            })}
          </>
        )}
      </div>
      <div className="ttd-preview-name">{nama || 'Nama Guru'}</div>
    </div>
  );
}

export default function GuruPage() {
  const {
    gurus, kelas, signatures,
    addGuru, updateGuru, removeGuru, setSignature, removeSignature,
  } = useStore();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nama: '', ttd: { ...TTD_DEFAULT } });
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
    setForm({ nama: '', ttd: { ...TTD_DEFAULT } });
    setDraftImage(null);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(g) {
    setEditId(g.id);
    setForm({ nama: g.nama, ttd: { ...TTD_DEFAULT, ...g.ttd } });
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
            Kolom <b>Kelas Diampu</b> hanya menampilkan hasil penetapan; wali kelas diatur
            dari halaman <b>Siswa &amp; Kelas</b> saat membuat atau mengubah kelas. Saat
            mencetak raport, tanda tangan guru yang menjadi wali kelas dipakai otomatis.
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
                <label className="form-label">Kelas Diampu</label>
                {editId && kelasDiampu(editId).length ? (
                  <div className="row" style={{gap:5,flexWrap:'wrap'}}>
                    {kelasDiampu(editId).map(k => (
                      <span key={k.id} className="badge b-teal">{k.lembaga} · {k.label}</span>
                    ))}
                  </div>
                ) : (
                  <span className="muted" style={{fontSize:13}}>Belum menjadi wali kelas mana pun</span>
                )}
                <span className="muted" style={{fontSize:11.5,marginTop:6,display:'block',lineHeight:1.55}}>
                  Wali kelas ditetapkan dari halaman <b>Siswa &amp; Kelas</b> saat membuat
                  atau mengubah kelas.
                </span>
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
                  <TtdPreview
                    image={draftImage}
                    ttd={form.ttd}
                    nama={form.nama}
                    onChange={setTtd}
                  />

                  {draftImage && (
                    <p className="muted" style={{fontSize:11.5,margin:'7px 0 0',lineHeight:1.5}}>
                      Seret tanda tangan untuk menggeser, tarik titik di sudutnya untuk
                      mengubah ukuran (Ctrl + roda tetikus juga bisa). Slider di bawah
                      tetap tersedia untuk penyetelan halus.
                    </p>
                  )}

                  <div className="ttd-sliders">
                    <label>
                      <span>Geser ↔<b>{form.ttd.x > 0 ? `+${form.ttd.x}` : form.ttd.x}</b></span>
                      <input type="range" min={-BATAS_X} max={BATAS_X} value={form.ttd.x}
                        onChange={e => setTtd({ x: Number(e.target.value) })}/>
                    </label>
                    <label>
                      <span>Geser ↕<b>{form.ttd.y > 0 ? `+${form.ttd.y}` : form.ttd.y}</b></span>
                      <input type="range" min={-BATAS_Y} max={BATAS_Y} value={form.ttd.y}
                        onChange={e => setTtd({ y: Number(e.target.value) })}/>
                    </label>
                    <label>
                      <span>Ukuran<b>{form.ttd.scale}%</b></span>
                      <input type="range" min={SKALA_MIN} max={SKALA_MAX} value={form.ttd.scale}
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
