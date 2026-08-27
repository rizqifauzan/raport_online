'use client';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';
import { LEMBAGA_LIST, TTD_DEFAULT, GARIS_ISIAN } from '../../lib/data';

const ROLE_LABEL = { TPQ: 'Pemimpin TPQ', Madin: 'Pemimpin Madin' };


/**
 * Modal pengaturan pemimpin satu lembaga: nama + gambar tanda tangan
 * beserta kalibrasi posisinya (dipakai saat raport dicetak).
 */
function PimpinanModal({ lembaga, guruId, gurus, signatures, onClose, onSave }) {
  const [pilihan, setPilihan] = useState(guruId ?? '');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const guru = pilihan ? gurus.find(g => g.id === pilihan) : null;
  const image = guru ? (signatures[guru.id] ?? null) : null;
  const ttd = { ...TTD_DEFAULT, ...(guru?.ttd ?? {}) };

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await onSave(pilihan);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:520}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <h3 style={{margin:0}}>{ROLE_LABEL[lembaga]}</h3>
          <button className="icon-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{display:'grid',gap:16}}>
          <div className="form-row">
            <label className="form-label">Pilih Guru</label>
            <select className="form-input" value={pilihan} onChange={e => setPilihan(e.target.value)} autoFocus>
              <option value="">— belum ditentukan —</option>
              {gurus.map(g => (
                <option key={g.id} value={g.id}>
                  {g.nama}{signatures[g.id] ? ' · ada TTD' : ' · tanpa TTD'}
                </option>
              ))}
            </select>
            <span className="muted" style={{fontSize:11.5,marginTop:6,display:'block',lineHeight:1.55}}>
              Nama, tanda tangan, dan posisinya mengikuti data guru tersebut — diatur
              sekali di menu <b>Guru &amp; TTD</b>, tidak perlu diunggah ulang di sini.
              Dibiarkan kosong berarti kolom pemimpin pada raport {lembaga} tercetak
              sebagai garis titik-titik untuk ditandatangani manual.
            </span>
          </div>

          <div className="form-row">
            <label className="form-label">Tampil di Raport</label>
            <div className="ttd-preview">
              <div className="ttd-preview-role">{ROLE_LABEL[lembaga]}</div>
              <div className="ttd-preview-box">
                <span className="ttd-preview-guide" />
                {image ? (
                  <img
                    src={image}
                    alt=""
                    draggable={false}
                    style={{ transform: `translate(calc(-50% + ${ttd.x}px), ${ttd.y}px) scale(${ttd.scale / 100})` }}
                  />
                ) : (
                  <span className="ttd-preview-empty">
                    {guru ? 'Guru ini belum punya tanda tangan' : 'Belum ada guru dipilih'}
                  </span>
                )}
              </div>
              <div className="ttd-preview-name">{guru?.nama || GARIS_ISIAN}</div>
            </div>
            {guru && !image && (
              <span className="muted" style={{fontSize:11.5,marginTop:6,display:'block',lineHeight:1.55}}>
                Unggah tanda tangannya lewat menu <b>Guru &amp; TTD</b> agar ikut tercetak.
              </span>
            )}
          </div>

          {formError && (
            <div style={{background:'var(--red-soft)',color:'var(--red)',padding:'10px 12px',
              borderRadius:'var(--r-sm)',fontSize:13,fontWeight:600}}>{formError}</div>
          )}

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Batal</button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TahunAjaranPage() {
  const {
    currentTaLabel, history, archiveCurrentTa,
    students, kelas, ujian, kenaikan,
    isHistory, viewingTaId, setViewingTa,
    pimpinan, setPimpinanGuru, getPimpinan, signatures, gurus,
  } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  // Pemimpin untuk T.A. baru: id guru; kosong = ikut yang sekarang
  const [newPimpinan, setNewPimpinan] = useState({ TPQ: '', Madin: '' });
  const [toast, setToast] = useState('');
  // Lembaga yang sedang diatur pemimpinnya ('TPQ' | 'Madin' | null)
  const [editLembaga, setEditLembaga] = useState(null);

  function handleArchive(e) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    // Pemimpin T.A. baru: pakai guru yang dipilih; bila tidak, bawa yang lama.
    const pimpinanBaru = Object.fromEntries(LEMBAGA_LIST.map(l => (
      [l, { guruId: newPimpinan[l] || (pimpinan[l]?.guruId ?? '') }]
    )));
    archiveCurrentTa(newLabel.trim(), pimpinanBaru);
    setShowModal(false);
    setNewLabel('');
    setNewPimpinan({ TPQ: '', Madin: '' });
    setToast(`T.A. ${currentTaLabel} berhasil diarsip. T.A. ${newLabel.trim()} sekarang aktif.`);
    setTimeout(() => setToast(''), 3500);
  }

  function openArchiveModal() {
    setNewPimpinan({ TPQ: pimpinan.TPQ.nama, Madin: pimpinan.Madin.nama });
    setShowModal(true);
  }

  /** Simpan nama, kalibrasi, dan gambar tanda tangan pemimpin satu lembaga. */
  function handleSavePimpinan(lembaga, guruId) {
    setPimpinanGuru(lembaga, guruId);
    showToast(guruId ? 'Pemimpin lembaga diperbarui' : 'Pemimpin lembaga dikosongkan');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  const activeStats = {
    totalSiswa: students.length,
    totalKelas: kelas.length,
    totalUjian: ujian.length,
    totalKenaikan: Object.keys(kenaikan).length,
  };

  const allSorted = [...history].reverse();

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div>
            <h1>Manajemen Tahun Ajaran</h1>
            <div className="crumb">Arsip data per tahun ajaran &amp; mulai T.A. baru</div>
          </div>
          <div className="spacer"/>
        </header>

        {isHistory && (
          <div className="history-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>
            </svg>
            Sedang melihat arsip T.A. {history.find(h => h.id === viewingTaId)?.label} — hanya baca
            <button className="history-banner-close" onClick={() => setViewingTa(null)}>
              ✕ Kembali ke T.A. Aktif
            </button>
          </div>
        )}

        <div className="content">
          {/* T.A. Aktif */}
          <div className="row between" style={{marginBottom:14}}>
            <div className="section-title">Tahun Ajaran Aktif</div>
          </div>

          <div className="ta-active-card">
            <div className="ta-badge-active">Aktif</div>
            <div className="ta-label">T.A. {currentTaLabel}</div>
            <div className="ta-stats-row">
              <div className="ta-stat">
                <div className="ts-val">{activeStats.totalSiswa}</div>
                <div className="ts-key">Santri</div>
              </div>
              <div className="ta-stat">
                <div className="ts-val">{activeStats.totalKelas}</div>
                <div className="ts-key">Kelas</div>
              </div>
              <div className="ta-stat">
                <div className="ts-val">{activeStats.totalUjian}</div>
                <div className="ts-key">Ujian</div>
              </div>
              <div className="ta-stat">
                <div className="ts-val">{activeStats.totalKenaikan}</div>
                <div className="ts-key">Status Kenaikan</div>
              </div>
            </div>
            <div className="ta-active-footer">
              <div className="muted" style={{fontSize:12.5}}>
                Data ujian, nilai, dan akhlaq akan direset saat T.A. baru dimulai. Santri &amp; kelas tetap terbawa.
              </div>
              <button className="btn primary" onClick={openArchiveModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                Tutup T.A. Ini &amp; Mulai T.A. Baru
              </button>
            </div>
          </div>

          {/* Pemimpin lembaga — ikut tercetak di raport T.A. ini */}
          <div className="row between" style={{margin:'28px 0 14px'}}>
            <div className="section-title">Pemimpin Lembaga (opsional)</div>
          </div>

          <div className="ta-history-list">
            {LEMBAGA_LIST.map(l => {
              const p = getPimpinan(l);
              const img = p.image;
              return (
                <div key={l} className="ta-snap-card">
                  <div className="ta-snap-left">
                    <div className="ta-snap-year">{ROLE_LABEL[l]}</div>
                    <div className="muted" style={{fontSize:12.5}}>
                      {p.nama || 'Belum ditentukan — kolom pada raport tercetak bergaris titik'}
                    </div>
                    <div className="ta-snap-badges">
                      <span className={`badge ${img ? 'b-green' : 'b-amber'}`}>
                        {img ? 'Tanda tangan tersedia' : 'Tanpa tanda tangan'}
                      </span>
                    </div>
                  </div>
                  <div className="ta-snap-kenaikan">
                    {img && <img src={img} alt={`TTD ${ROLE_LABEL[l]}`} className="ttd-thumb"/>}
                  </div>
                  <div className="ta-snap-actions">
                    <button className="btn sm" onClick={() => setEditLembaga(l)} disabled={isHistory}>
                      {p.nama || img ? 'Ubah' : 'Atur'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="muted" style={{fontSize:12,marginTop:10,lineHeight:1.6}}>
            Nama &amp; tanda tangan ini dipakai pada kolom pemimpin saat raport dicetak.
            Saat T.A. ditutup, keduanya ikut tersimpan di arsip sehingga raport T.A. lama
            tetap memakai tanda tangan yang berlaku waktu itu.
          </div>

          {/* History */}
          <div className="row between" style={{margin:'28px 0 14px'}}>
            <div className="section-title">Arsip Tahun Ajaran ({history.length})</div>
          </div>

          {history.length === 0 ? (
            <div className="empty-state" style={{minHeight:160}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M5 8h14M5 12h14M5 16h6"/>
                <rect x="3" y="4" width="18" height="16" rx="2"/>
              </svg>
              <p>Belum ada arsip. Tutup T.A. aktif untuk membuat arsip pertama.</p>
            </div>
          ) : (
            <div className="ta-history-list">
              {allSorted.map(snap => {
                const isViewing = viewingTaId === snap.id;
                const lulusCount = Object.values(snap.kenaikan).filter(v => v === 'Lulus').length;
                const naikCount  = Object.values(snap.kenaikan).filter(v => v === 'Naik').length;
                const tidakNaikCount = Object.values(snap.kenaikan).filter(v => v === 'Tidak Naik').length;
                return (
                  <div key={snap.id} className={`ta-snap-card${isViewing ? ' viewing' : ''}`}>
                    <div className="ta-snap-left">
                      <div className="ta-snap-year">T.A. {snap.label}</div>
                      <div className="muted" style={{fontSize:11.5}}>
                        Diarsip {snap.archivedAt}
                      </div>
                      <div className="ta-snap-badges">
                        <span className="badge b-teal">{snap.students?.length ?? 0} santri</span>
                        <span className="badge b-blue">{snap.kelas?.length ?? 0} kelas</span>
                        <span className="badge b-violet">{snap.ujian?.length ?? 0} ujian</span>
                      </div>
                    </div>
                    <div className="ta-snap-kenaikan">
                      <div className="kn-row">
                        <span className="badge b-green">{lulusCount} Lulus</span>
                        <span className="badge b-teal" style={{background:'#dcfce7',color:'#166534'}}>{naikCount} Naik</span>
                        <span className="badge b-amber">{tidakNaikCount} Tidak Naik</span>
                      </div>
                    </div>
                    <div className="ta-snap-actions">
                      {isViewing ? (
                        <button className="btn primary sm" onClick={() => setViewingTa(null)}>
                          ✕ Keluar Mode Arsip
                        </button>
                      ) : (
                        <button className="btn sm" onClick={() => { setViewingTa(snap.id); showToast(`Membuka arsip T.A. ${snap.label}`); }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>
                          </svg>
                          Lihat Arsip
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editLembaga && (
        <PimpinanModal
          lembaga={editLembaga}
          guruId={pimpinan[editLembaga]?.guruId ?? ''}
          gurus={gurus}
          signatures={signatures}
          onClose={() => setEditLembaga(null)}
          onSave={guruId => handleSavePimpinan(editLembaga, guruId)}
        />
      )}

      {/* Modal tutup T.A. */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{margin:0}}>Tutup T.A. &amp; Mulai T.A. Baru</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="ta-warning">
              <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <path d="M10.3 3.2L2.1 17a2 2 0 001.7 3h16.4a2 2 0 001.7-3L13.7 3.2a2 2 0 00-3.4 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                Data T.A. <b>{currentTaLabel}</b> akan diarsip. Ujian, nilai, dan data akhlaq akan direset. Santri dan kelas tetap terbawa ke T.A. baru.
              </div>
            </div>

            <form onSubmit={handleArchive}>
              <div className="form-row">
                <label>Label T.A. Baru *</label>
                <input
                  className="form-input"
                  placeholder="cth. 2026/2027"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  required
                />
              </div>
              {LEMBAGA_LIST.map(l => (
                <div className="form-row" key={l}>
                  <label>{ROLE_LABEL[l]} (opsional)</label>
                  <select
                    className="form-input"
                    value={newPimpinan[l]}
                    onChange={e => setNewPimpinan(prev => ({ ...prev, [l]: e.target.value }))}
                  >
                    <option value="">
                      {getPimpinan(l).nama
                        ? `Tetap: ${getPimpinan(l).nama}`
                        : '— belum ditentukan —'}
                    </option>
                    {gurus.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                  </select>
                </div>
              ))}
              <div style={{fontSize:12,color:'var(--muted)',marginTop:-4,marginBottom:16,lineHeight:1.6}}>
                T.A. saat ini (<b>{currentTaLabel}</b>) tersimpan di arsip beserta nama dan
                tanda tangan pemimpin yang berlaku saat ini — dibekukan, sehingga raport
                T.A. lama tetap benar walau gurunya kelak berubah. Biarkan pilihan di atas
                bila pemimpin T.A. baru masih sama.
              </div>
              <div className="form-actions">
                <button type="button" className="btn ghost" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn primary">Arsip &amp; Mulai T.A. Baru</button>
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
