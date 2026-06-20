'use client';
import { useStore } from '../store';

export default function HistoryBanner() {
  const { isHistory, history, viewingTaId, setViewingTa, currentTaLabel } = useStore();
  if (!isHistory) return null;
  const snap = history.find(h => h.id === viewingTaId);
  return (
    <div className="history-banner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>
      </svg>
      Arsip T.A. {snap?.label} — data hanya baca
      <button className="history-banner-close" onClick={() => setViewingTa(null)}>
        ✕ Kembali ke T.A. {currentTaLabel}
      </button>
    </div>
  );
}
