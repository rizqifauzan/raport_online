'use client';
import { useRef, useState, useLayoutEffect } from 'react';

// Editor tanda tangan bersama — dipakai halaman Guru (tanda tangan wali kelas)
// dan halaman Tahun Ajaran (tanda tangan pemimpin TPQ / Madin).

// Gambar dikecilkan di browser sebelum dikirim, supaya tidak membebani database.
export const MAX_W = 600;
export const MAX_H = 260;

// Batas geser — dipakai bersama oleh slider dan seretan tetikus agar konsisten.
export const BATAS_X = 80;
export const BATAS_Y = 60;
export const SKALA_MIN = 40;
export const SKALA_MAX = 300;
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
 *   - seret badan gambar  → menggeser  (ttd.x / ttd.y)
 *   - tarik pegangan sudut → mengubah ukuran (ttd.scale)
 *   - Ctrl/⌘ + roda tetikus → mengubah ukuran tanpa melepas kursor
 * Semuanya menulis nilai yang sama dengan slider.
 */
export function TtdPreview({ image, ttd, nama, onChange, role = 'Wali Kelas', placeholder = 'Nama Guru' }) {
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
      <div className="ttd-preview-name">{nama || placeholder}</div>
    </div>
  );
}

