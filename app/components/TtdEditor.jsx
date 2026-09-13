'use client';
import { useRef, useState, useLayoutEffect } from 'react';

// Editor tanda tangan bersama — dipakai halaman Guru (tanda tangan wali kelas),
// halaman Tahun Ajaran (tanda tangan pemimpin TPQ / Madin), dan halaman
// Pengaturan (cap/stempel lembaga).

// Gambar dikecilkan di browser sebelum dikirim, supaya tidak membebani database.
export const MAX_W = 600;
export const MAX_H = 260;

// Batas geser — dipakai bersama oleh slider dan seretan tetikus agar konsisten.
export const BATAS_X = 80;
export const BATAS_Y = 60;
export const SKALA_MIN = 40;
export const SKALA_MAX = 300;
// Sudut putar cap dinyatakan dalam derajat, dibungkus ke rentang -180..180.
export const PUTAR_MIN = -180;
export const PUTAR_MAX = 180;
const jepit = (nilai, batas) => Math.max(-batas, Math.min(batas, Math.round(nilai)));
const jepitSkala = (nilai) => Math.max(SKALA_MIN, Math.min(SKALA_MAX, Math.round(nilai)));
const bungkusPutar = (derajat) => {
  const d = Math.round(derajat) % 360;
  return d > 180 ? d - 360 : d <= -180 ? d + 360 : d;
};

/**
 * Transform CSS satu gambar. Urutannya penting: geser dulu, lalu putar,
 * lalu perbesar — sehingga memutar tidak menggeser titik jangkarnya.
 */
export function transformGambar(ttd) {
  const putar = ttd.rot ? ` rotate(${ttd.rot}deg)` : '';
  return `translate(calc(-50% + ${ttd.x}px), ${ttd.y}px)${putar} scale(${ttd.scale / 100})`;
}

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
export function fileToScaledPng(file) {
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
 *   - seret badan gambar   → menggeser  (ttd.x / ttd.y)
 *   - tarik pegangan sudut  → mengubah ukuran (ttd.scale)
 *   - tarik pegangan bulat  → memutar (ttd.rot), bila `bisaPutar` dinyalakan
 *   - Ctrl/⌘ + roda tetikus → mengubah ukuran tanpa melepas kursor
 * Semuanya menulis nilai yang sama dengan slider.
 */
export function TtdPreview({
  image, ttd, nama, onChange,
  role = 'Wali Kelas', placeholder = 'Nama Guru',
  latar = null,            // lapisan acuan di belakang (mis. TTD pemimpin saat menata cap)
  kosong = 'Belum ada tanda tangan',
  bisaPutar = false,       // tampilkan pegangan putar (dipakai cap)
}) {
  const kotakRef = useRef(null);
  const gambarRef = useRef(null);
  const aksi = useRef(null);
  const [mode, setMode] = useState(null);            // 'geser' | 'ukur' | 'putar' | null
  const [bingkai, setBingkai] = useState(null);      // posisi gambar untuk menaruh pegangan
  const interaktif = Boolean(image && onChange);
  const rot = ttd.rot ?? 0;

  // Geometri gambar dihitung dari ukuran tata letaknya, BUKAN dari
  // getBoundingClientRect — kotak pembatas ikut melar saat gambar diputar,
  // sedangkan pegangan harus menempel pada sisi gambar yang sebenarnya.
  useLayoutEffect(() => {
    if (!interaktif || !gambarRef.current || !kotakRef.current) { setBingkai(null); return; }
    const g = gambarRef.current;
    const k = kotakRef.current.getBoundingClientRect();
    const s = ttd.scale / 100;
    const w = g.offsetWidth * s;
    const h = g.offsetHeight * s;
    setBingkai({
      // Poros = titik yang tidak ikut bergerak saat diputar/diperbesar,
      // yaitu transform-origin "top center" sesudah digeser.
      porosX: k.width / 2 + ttd.x,
      porosY: ttd.y,
      width: w, height: h,
    });
  }, [image, ttd.x, ttd.y, ttd.scale, rot, interaktif]);

  /** Poros gambar dalam koordinat layar — dasar perhitungan ukur & putar. */
  function porosLayar() {
    const k = kotakRef.current.getBoundingClientRect();
    return { x: k.left + k.width / 2 + ttd.x, y: k.top + ttd.y };
  }

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
    const poros = porosLayar();
    const jarak = Math.hypot(e.clientX - poros.x, e.clientY - poros.y);
    aksi.current = { jenis: 'ukur', poros, jarakAwal: Math.max(jarak, 1), skalaAwal: ttd.scale };
    setMode('ukur');
  }

  function mulaiPutar(e) {
    if (!interaktif) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    aksi.current = { jenis: 'putar', poros: porosLayar() };
    setMode('putar');
  }

  function gerak(e) {
    const a = aksi.current;
    if (!a) return;
    if (a.jenis === 'geser') {
      onChange({
        x: jepit(a.awal.x + (e.clientX - a.x), BATAS_X),
        y: jepit(a.awal.y + (e.clientY - a.y), BATAS_Y),
      });
    } else if (a.jenis === 'ukur') {
      const jarak = Math.hypot(e.clientX - a.poros.x, e.clientY - a.poros.y);
      onChange({ scale: jepitSkala(a.skalaAwal * (jarak / a.jarakAwal)) });
    } else {
      // Pegangan putar berada lurus di bawah poros saat sudut 0°, jadi arah
      // (0, +1) dipakai sebagai acuan nol.
      const dx = e.clientX - a.poros.x;
      const dy = e.clientY - a.poros.y;
      onChange({ rot: bungkusPutar(Math.atan2(-dx, dy) * 180 / Math.PI) });
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
      <div className="ttd-preview-role">{role}</div>
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
        {latar?.image && (
          <img
            className="ttd-preview-latar"
            src={latar.image}
            alt=""
            draggable={false}
            style={{ transform: transformGambar(latar.ttd) }}
          />
        )}
        {image ? (
          <img
            ref={gambarRef}
            src={image}
            alt=""
            draggable={false}
            style={{ transform: transformGambar(ttd) }}
          />
        ) : (
          <span className="ttd-preview-empty">{kosong}</span>
        )}

        {interaktif && bingkai && (
          // Pembungkus ikut diputar bersama gambar (poros sama: "top center"),
          // sehingga bingkai dan pegangan selalu menempel pada sisi gambar.
          <div
            className="ttd-frame-wrap"
            style={{
              left: bingkai.porosX,
              top: bingkai.porosY,
              width: bingkai.width,
              height: bingkai.height,
              transform: `translateX(-50%)${rot ? ` rotate(${rot}deg)` : ''}`,
            }}
          >
            <div className="ttd-frame" />
            {SUDUT.map(sudut => (
              <span
                key={sudut.id}
                className="ttd-handle"
                style={{
                  left: `${sudut.x * 100}%`,
                  top: `${sudut.y * 100}%`,
                  cursor: sudut.cursor,
                }}
                onPointerDown={mulaiUkur}
                onPointerMove={gerak}
                onPointerUp={selesai}
                onPointerCancel={selesai}
              />
            ))}
            {bisaPutar && (
              <span
                className="ttd-handle putar"
                onPointerDown={mulaiPutar}
                onPointerMove={gerak}
                onPointerUp={selesai}
                onPointerCancel={selesai}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round" width="9" height="9">
                  <path d="M20 12a8 8 0 11-2.3-5.7"/><path d="M20 3v4h-4"/>
                </svg>
              </span>
            )}
          </div>
        )}
      </div>
      <div className="ttd-preview-name">{nama || placeholder}</div>
    </div>
  );
}

