'use client';
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useStore } from '../store';

export default function TahunAjaranPage() {
  const {
    currentTaLabel, history, archiveCurrentTa,
    students, kelas, ujian, kenaikan,
    isHistory, viewingTaId, setViewingTa,
  } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [toast, setToast] = useState('');

  function handleArchive(e) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    archiveCurrentTa(newLabel.trim());
    setShowModal(false);
    setNewLabel('');
    setToast(`T.A. ${currentTaLabel} berhasil diarsip. T.A. ${newLabel.trim()} sekarang aktif.`);
    setTimeout(() => setToast(''), 3500);
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
              <button className="btn primary" onClick={() => setShowModal(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                Tutup T.A. Ini &amp; Mulai T.A. Baru
              </button>
            </div>
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
              <div style={{fontSize:12,color:'var(--muted)',marginTop:-4,marginBottom:16}}>
                T.A. saat ini (<b>{currentTaLabel}</b>) akan tersimpan di arsip.
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
