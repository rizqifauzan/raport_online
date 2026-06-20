'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '../store';

export default function Sidebar() {
  const pathname = usePathname();
  const { students, periode, isHistory, history, currentTaLabel, viewingTaId, setViewingTa } = useStore();
  const totalSantri = students.length;
  const [taOpen, setTaOpen] = useState(false);

  const active = (href) => pathname === href ? 'active' : '';

  const viewingSnap = viewingTaId ? history.find(h => h.id === viewingTaId) : null;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8 4v5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V7l8-4z"/>
            <path d="M9.5 12l1.8 1.8L15 10"/>
          </svg>
        </div>
        <div>
          <div className="name">Raport Online</div>
          <div className="sub">Ponpes Al-Hikmah</div>
        </div>
      </div>

      <nav className="nav">
        <div className="nav-label">Menu</div>
        <Link href="/dashboard-a" className={active('/dashboard-a')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          Dashboard
        </Link>
        <Link href="/siswa" className={active('/siswa')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="9" cy="8" r="3.2"/>
            <path d="M3.5 19c.6-3 3-4.5 5.5-4.5S13.9 16 14.5 19"/>
          </svg>
          Data Siswa
          <span className="pill">{totalSantri}</span>
        </Link>
        <Link href="/siswa-kelas" className={active('/siswa-kelas')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="9" cy="8" r="3.2"/>
            <path d="M3.5 19c.6-3 3-4.5 5.5-4.5S13.9 16 14.5 19"/>
            <path d="M16 5.5a3 3 0 010 5.6M18 19c-.3-2-1-3.3-2.2-4.2"/>
          </svg>
          Siswa &amp; Kelas
        </Link>
        <Link href="/ujian" className={active('/ujian')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12h6M9 16h4"/>
          </svg>
          Mapel Ujian
        </Link>
        <Link href="/input-nilai" className={active('/input-nilai')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16v16H4z"/>
            <path d="M4 9h16M9 9v11M15 13l1.5 1.5L19 12"/>
          </svg>
          Input Nilai
        </Link>
        <Link href="/akhlaq" className={active('/akhlaq')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21C12 21 4 13.5 4 8a8 8 0 0116 0c0 5.5-8 13-8 13z"/>
            <circle cx="12" cy="8" r="2.5"/>
          </svg>
          Akhlaq &amp; Kehadiran
        </Link>
        {periode === 'UAS' ? (
          <Link href="/kenaikan" className={active('/kenaikan')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10M17 15l-5-5-5 5"/>
              <path d="M5 20h14"/>
            </svg>
            Kenaikan Kelas
          </Link>
        ) : (
          <span className="nav-disabled">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10M17 15l-5-5-5 5"/>
              <path d="M5 20h14"/>
            </svg>
            Kenaikan Kelas
            <span className="pill" style={{background:'rgba(148,163,184,.15)',color:'var(--muted)',fontSize:9}}>UAS</span>
          </span>
        )}
        <Link href="/raport" className={active('/raport')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h7l5 5v13H6z"/>
            <path d="M13 3v5h5"/>
            <path d="M9 13h6M9 17h4"/>
          </svg>
          Cetak Raport
        </Link>
        <div className="nav-label">Lainnya</div>
        <Link href="/tahun-ajaran" className={active('/tahun-ajaran')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          Tahun Ajaran
          {history.length > 0 && <span className="pill">{history.length}</span>}
        </Link>
        <a href="#">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19 12a7 7 0 00-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 00-2.3-1.3L16 3h-4l-.3 2.2A7 7 0 009.4 6.5l-2.3-1-2 3.4 2 1.5A7 7 0 007 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-1c.7.5 1.5.9 2.3 1.3L12 21h4l.3-2.2c.8-.3 1.6-.7 2.3-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z"/>
          </svg>
          Pengaturan
        </a>
      </nav>

      {/* T.A. Selector */}
      <div className="ta-selector">
        <button className={`ta-sel-btn${taOpen ? ' open' : ''}${isHistory ? ' history-mode' : ''}`} onClick={() => setTaOpen(o => !o)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <div className="ta-sel-info">
            <div className="ta-sel-label">{viewingSnap ? `Arsip ${viewingSnap.label}` : `T.A. ${currentTaLabel}`}</div>
            <div className="ta-sel-sub">{isHistory ? '🕐 Hanya Baca' : 'Aktif'}</div>
          </div>
          <svg className="ta-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>

        {taOpen && (
          <div className="ta-dropdown">
            <div
              className={`ta-opt${!viewingTaId ? ' sel' : ''}`}
              onClick={() => { setViewingTa(null); setTaOpen(false); }}
            >
              <div className="ta-opt-year">T.A. {currentTaLabel}</div>
              <div className="ta-opt-sub">Aktif sekarang</div>
              {!viewingTaId && <svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" width="14"><path d="M20 6L9 17l-5-5"/></svg>}
            </div>
            {history.length > 0 && <div className="ta-sep">Arsip</div>}
            {[...history].reverse().map(h => (
              <div
                key={h.id}
                className={`ta-opt${viewingTaId === h.id ? ' sel' : ''}`}
                onClick={() => { setViewingTa(h.id); setTaOpen(false); }}
              >
                <div className="ta-opt-year">T.A. {h.label}</div>
                <div className="ta-opt-sub">Diarsip {h.archivedAt}</div>
                {viewingTaId === h.id && <svg viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" width="14"><path d="M20 6L9 17l-5-5"/></svg>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="foot">
        <div className="av">OP</div>
        <div className="who">
          <b>Ustadz Hamid</b>
          <br/>
          <span>Operator</span>
        </div>
      </div>
    </aside>
  );
}
