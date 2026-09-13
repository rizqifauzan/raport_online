'use client';
import { useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';
import { LEMBAGA_LIST, CAP_DEFAULT, namaCetak } from '../../lib/data';
import {
  TtdPreview, fileToScaledPng,
  MAX_W, MAX_H, BATAS_X, BATAS_Y, SKALA_MIN, SKALA_MAX, PUTAR_MIN, PUTAR_MAX,
} from '../components/TtdEditor';

/**
 * Pengaturan cap (stempel) satu lembaga.
 *
 * Alurnya sengaja dibuat sama dengan tanda tangan guru: gambar dikecilkan di
 * browser, posisinya ditata di atas pratinjau kotak tanda tangan Pimpinan
 * (tanda tangan pemimpin ikut ditampilkan samar sebagai acuan), lalu
 * keduanya disimpan bersama saat tombol Simpan ditekan.
 */
function CapCard({ lembaga }) {
  const { getCap, getPimpinan, setCapTtd, setCapImage, removeCapImage, isHistory } = useStore();

  const tersimpan = getCap(lembaga);
  const pimpinan = getPimpinan(lembaga);

  const fileRef = useRef(null);
  const [draftImage, setDraftImage] = useState(tersimpan.image);
  const [ttd, setTtdState] = useState(tersimpan.ttd);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  // State dari server baru tiba belakangan (hidrasi awal, atau perubahan dari
  // tab lain). Isian ikut disegarkan HANYA selama pemakai belum menyentuhnya,
  // supaya penataan yang sedang berjalan tidak tertimpa.
  const [tersentuh, setTersentuh] = useState(false);
  const kunciServer = `${tersimpan.image ?? ''}|${tersimpan.ttd.x},${tersimpan.ttd.y},${tersimpan.ttd.scale},${tersimpan.ttd.rot}`;
  const [kunciTerpasang, setKunciTerpasang] = useState(kunciServer);
  if (kunciServer !== kunciTerpasang && !tersentuh && !busy) {
    setKunciTerpasang(kunciServer);
    setDraftImage(tersimpan.image);
    setTtdState(tersimpan.ttd);
  }

  const setTtd = (patch) => {
    setTtdState(t => ({ ...t, ...patch }));
    setTersentuh(true);
    setOkMsg('');
  };

  const berubah =
    draftImage !== tersimpan.image ||
    ttd.x !== tersimpan.ttd.x ||
    ttd.y !== tersimpan.ttd.y ||
    ttd.scale !== tersimpan.ttd.scale ||
    ttd.rot !== tersimpan.ttd.rot;

  async function handlePickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // biar berkas yang sama bisa dipilih lagi
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Pilih berkas gambar (PNG atau JPG).');
      return;
    }
    try {
      setBusy(true);
      setDraftImage(await fileToScaledPng(file));
      setTersentuh(true);
      setError('');
      setOkMsg('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    setBusy(true);
    setError('');
    try {
      if (draftImage && draftImage !== tersimpan.image) {
        const res = await setCapImage(lembaga, draftImage);
        if (!res.ok) { setError(res.error); return; }
      } else if (!draftImage && tersimpan.image) {
        await removeCapImage(lembaga);
      }
      setCapTtd(lembaga, ttd);
      setKunciTerpasang(`${draftImage ?? ''}|${ttd.x},${ttd.y},${ttd.scale},${ttd.rot}`);
      setTersentuh(false);
      setOkMsg('Cap tersimpan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card panel" style={{padding:18}}>
      <div className="row" style={{alignItems:'baseline',gap:10,marginBottom:14}}>
        <h3 style={{margin:0}}>Cap {lembaga}</h3>
        <span className="badge b-teal">{draftImage ? 'Ada cap' : 'Belum ada cap'}</span>
      </div>

      <div className="ttd-editor">
        <div>
          <label className="form-label">Gambar Cap</label>
          <div className="ttd-drop">
            {draftImage
              ? <img src={draftImage} alt={`Pratinjau cap ${lembaga}`}/>
              : <span className="muted" style={{fontSize:12.5}}>PNG latar transparan paling rapi</span>}
          </div>
          <div className="row" style={{gap:8,marginTop:10}}>
            <button type="button" className="btn sm" onClick={() => fileRef.current?.click()}
              disabled={busy || isHistory}>
              {draftImage ? 'Ganti Gambar' : 'Pilih Gambar'}
            </button>
            {draftImage && (
              <button type="button" className="btn sm ghost" style={{color:'var(--red)'}}
                disabled={busy || isHistory}
                onClick={() => { setDraftImage(null); setTersentuh(true); setOkMsg(''); }}>
                Hapus
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={handlePickFile}/>
          </div>
          <p className="muted" style={{fontSize:11.5,marginTop:8,lineHeight:1.55}}>
            Gambar otomatis dikecilkan ke maks. {MAX_W}×{MAX_H} px sebelum disimpan.
            Cap dicetak di kotak tanda tangan <b>Pimpinan</b> pada raport lembaga ini.
          </p>
        </div>

        <div>
          <label className="form-label">Posisi di Raport</label>
          <TtdPreview
            image={draftImage}
            ttd={ttd}
            nama={namaCetak(pimpinan.nama)}
            role={`Pimpinan ${lembaga}`}
            kosong="Belum ada cap"
            latar={pimpinan.image ? { image: pimpinan.image, ttd: pimpinan.ttd } : null}
            bisaPutar
            onChange={isHistory ? undefined : setTtd}
          />

          {draftImage && (
            <p className="muted" style={{fontSize:11.5,margin:'7px 0 0',lineHeight:1.5}}>
              Seret cap untuk menggeser, tarik titik di sudutnya untuk mengubah ukuran
              (Ctrl + roda tetikus juga bisa), dan tarik pegangan bulat di bawahnya untuk
              memutar. {pimpinan.image
                ? 'Tanda tangan pemimpin ikut ditampilkan supaya posisi cap terhadapnya terlihat persis seperti hasil cetak.'
                : 'Tanda tangan pemimpin belum ada — tetapkan pemimpin lembaga di halaman Tahun Ajaran agar bisa dipakai sebagai acuan posisi.'}
            </p>
          )}

          <div className="ttd-sliders">
            <label>
              <span>Geser ↔<b>{ttd.x > 0 ? `+${ttd.x}` : ttd.x}</b></span>
              <input type="range" min={-BATAS_X} max={BATAS_X} value={ttd.x} disabled={isHistory}
                onChange={e => setTtd({ x: Number(e.target.value) })}/>
            </label>
            <label>
              <span>Geser ↕<b>{ttd.y > 0 ? `+${ttd.y}` : ttd.y}</b></span>
              <input type="range" min={-BATAS_Y} max={BATAS_Y} value={ttd.y} disabled={isHistory}
                onChange={e => setTtd({ y: Number(e.target.value) })}/>
            </label>
            <label>
              <span>Ukuran<b>{ttd.scale}%</b></span>
              <input type="range" min={SKALA_MIN} max={SKALA_MAX} value={ttd.scale} disabled={isHistory}
                onChange={e => setTtd({ scale: Number(e.target.value) })}/>
            </label>
            <label>
              <span>Putar<b>{ttd.rot > 0 ? `+${ttd.rot}` : ttd.rot}°</b></span>
              <input type="range" min={PUTAR_MIN} max={PUTAR_MAX} value={ttd.rot} disabled={isHistory}
                onChange={e => setTtd({ rot: Number(e.target.value) })}/>
            </label>
            <button type="button" className="btn sm ghost" disabled={isHistory}
              onClick={() => setTtd({ ...CAP_DEFAULT })}>
              Reset posisi
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{background:'var(--red-soft)',color:'var(--red)',padding:'10px 12px',
          borderRadius:'var(--r-sm)',fontSize:13,fontWeight:600,marginTop:14}}>{error}</div>
      )}

      <div className="form-actions" style={{marginTop:14}}>
        {okMsg && <span className="muted" style={{fontSize:12.5,marginRight:'auto'}}>✓ {okMsg}</span>}
        <button type="button" className="btn primary" disabled={busy || isHistory || !berubah}
          onClick={handleSave}>
          {busy ? 'Menyimpan…' : 'Simpan Cap'}
        </button>
      </div>
    </div>
  );
}

export default function PengaturanPage() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <HistoryBanner />
        <header className="topbar">
          <div>
            <h1>Pengaturan</h1>
            <div className="crumb">
              Cap lembaga yang diunggah di sini tercetak otomatis pada raport
            </div>
          </div>
        </header>

        <div className="content" style={{display:'grid',gap:18}}>
          {LEMBAGA_LIST.map(l => <CapCard key={l} lembaga={l} />)}
        </div>
      </div>
    </div>
  );
}
