'use client';
import { useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import HistoryBanner from '../components/HistoryBanner';
import { useStore } from '../store';
import { LEMBAGA_LIST, getPredikat } from '../../lib/data';

// Santri yang sudah tidak aktif tidak ikut diperingkat.
const STATUS_TIDAK_IKUT = new Set(['Lulus', 'Keluar']);

// Akhlaq, kerajinan, dan kerapihan diisi huruf A–E. Untuk dipakai sebagai
// pemecah nilai seri, hurufnya diubah menjadi angka.
const NILAI_HURUF = { A: 5, B: 4, C: 3, D: 2, E: 1 };
const KOLOM_AKHLAQ = ['akhlaq', 'kerajinan', 'kerapihan'];

const MEDALI = ['🥇', '🥈', '🥉'];
const MEDALI_CLS = ['emas', 'perak', 'perunggu'];

function rata(arr) {
  if (arr.length === 0) return null;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

/**
 * Peringkat disusun dari nilai rata-rata ujian. Bila ada yang sama persis,
 * urutannya ditentukan berurutan oleh akhlaq, lalu ketidakhadiran tanpa izin,
 * lalu izin, lalu nama — dan alasan yang dipakai ikut ditulis di kartunya
 * supaya pemilihan bisa dipertanggungjawabkan, bukan sekadar hasil urutan data.
 */
function bandingkan(a, b) {
  if (b.rata !== a.rata) return b.rata - a.rata;
  if ((b.akhlaq ?? -1) !== (a.akhlaq ?? -1)) return (b.akhlaq ?? -1) - (a.akhlaq ?? -1);
  if (a.tanpaIzin !== b.tanpaIzin) return a.tanpaIzin - b.tanpaIzin;
  if (a.izin !== b.izin) return a.izin - b.izin;
  return a.nama.localeCompare(b.nama, 'id');
}

/** Alasan seorang santri ditempatkan di atas santri berikutnya yang nilainya sama. */
function alasanUnggul(a, b) {
  if (!b || b.rata !== a.rata) return null;
  if ((a.akhlaq ?? -1) !== (b.akhlaq ?? -1)) return 'nilai akhlaq lebih baik';
  if (a.tanpaIzin !== b.tanpaIzin) return 'alpa lebih sedikit';
  if (a.izin !== b.izin) return 'izin lebih sedikit';
  return 'urut nama (A–Z)';
}

export default function TopSantriPage() {
  const { periode, kelas, students, ujian, ujianNilai, karakter, locks, isHistory, currentTaLabel } = useStore();

  const peringkat = useMemo(() => {
    const hasil = {};
    for (const lem of LEMBAGA_LIST) {
      const kelasLembaga = kelas.filter(k => k.lembaga === lem);
      const kelasById = new Map(kelasLembaga.map(k => [k.id, k]));

      const baris = students
        .filter(s => kelasById.has(s.kelasId) && !STATUS_TIDAK_IKUT.has(s.status))
        .map(s => {
          const ujianKelas = ujian.filter(u =>
            u.kelasId === s.kelasId && u.periode === periode && u.tipe !== 'Kustom');
          const nilai = ujianKelas
            .map(u => ujianNilai[u.id]?.[s.id])
            .filter(v => v != null && v !== '')
            .map(Number);
          const kar = karakter[s.id]?.[periode] ?? {};
          const huruf = KOLOM_AKHLAQ.map(c => NILAI_HURUF[kar[c]]).filter(v => v != null);
          return {
            id: s.id,
            nama: s.nama,
            status: s.status,
            kelas: kelasById.get(s.kelasId)?.label ?? '—',
            kelasId: s.kelasId,
            rata: rata(nilai),
            terisi: nilai.length,
            totalMapel: ujianKelas.length,
            akhlaq: rata(huruf),
            izin: kar.izin ?? 0,
            tanpaIzin: kar.tanpaIzin ?? 0,
            terkunci: locks[s.kelasId]?.[periode] === true,
          };
        })
        // Tanpa satu pun nilai tidak ada yang bisa diperingkat.
        .filter(r => r.rata != null)
        .sort(bandingkan);

      // Peringkat memakai nilai rata-rata saja, sehingga nilai yang sama
      // mendapat nomor yang sama — semua yang masuk tiga besar ikut tampil,
      // walau jumlahnya jadi lebih dari tiga.
      let nomor = 0;
      let nilaiSebelum = null;
      baris.forEach((r, i) => {
        if (r.rata !== nilaiSebelum) { nomor = i + 1; nilaiSebelum = r.rata; }
        r.peringkat = nomor;
        r.seri = baris.some((o, j) => j !== i && o.rata === r.rata);
        r.unggulKarena = r.seri ? alasanUnggul(r, baris[i + 1]) : null;
      });

      const jumlahKelas = kelasLembaga.length;
      hasil[lem] = {
        top: baris.filter(r => r.peringkat <= 3),
        semua: baris,
        jumlahKelas,
        kelasTerkunci: kelasLembaga.filter(k => locks[k.id]?.[periode] === true).length,
        belumLengkap: baris.filter(r => r.terisi < r.totalMapel).length,
      };
    }
    return hasil;
  }, [kelas, students, ujian, ujianNilai, karakter, locks, periode]);

  const judulPeriode = periode === 'UTS' ? 'UTS — Tengah Semester' : 'UAS — Kenaikan Kelas';

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <HistoryBanner />
        <header className="topbar">
          <div>
            <h1>Santri Berprestasi</h1>
            <div className="crumb">Tiga besar TPQ &amp; Madin — {judulPeriode}{currentTaLabel && !isHistory ? ` · T.A. ${currentTaLabel}` : ''}</div>
          </div>
          <div className="spacer" />
          <button className="btn ghost" onClick={() => window.print()}>Cetak</button>
        </header>

        <div className="content">
          <div className="ts-note">
            Peringkat dihitung dari <b>rata-rata seluruh mapel ujian {periode}</b> (tipe Kustom tidak ikut),
            lintas kelas dalam satu lembaga. Hanya santri berstatus aktif yang diperingkat.
            Jumlah izin dan alpa ditampilkan sebagai bahan pertimbangan, tidak mengurangi nilai.
          </div>

          {LEMBAGA_LIST.map(lem => {
            const d = peringkat[lem];
            return (
              <section key={lem} className="ts-sec">
                <div className="row between" style={{ marginBottom: 12 }}>
                  <div className="section-title">{lem} — 3 Besar {periode}</div>
                  <div className="ts-meta">
                    {d.kelasTerkunci}/{d.jumlahKelas} kelas sudah dipublikasi
                    {d.belumLengkap > 0 && <> · <span className="ts-warn">{d.belumLengkap} santri nilainya belum lengkap</span></>}
                  </div>
                </div>

                {d.top.length === 0 ? (
                  <div className="card card-pad ts-empty">
                    Belum ada nilai ujian {periode} yang bisa diperingkat untuk {lem}.
                  </div>
                ) : (
                  <div className="ts-grid">
                    {d.top.map((r, i) => {
                      const pred = getPredikat(r.rata);
                      const cls = MEDALI_CLS[Math.min(r.peringkat, 3) - 1];
                      return (
                        <div key={r.id} className={`card card-pad ts-card ${cls}`}>
                          <div className="ts-head">
                            <span className="ts-medal">{MEDALI[Math.min(r.peringkat, 3) - 1]}</span>
                            <span className="ts-rank">Peringkat {r.peringkat}</span>
                            {r.seri && <span className="badge b-gold">Seri</span>}
                            {!r.terkunci && <span className="badge b-amber">Belum final</span>}
                          </div>
                          <div className="ts-nama">{r.nama}</div>
                          <div className="ts-kelas">{r.kelas}</div>
                          <div className="ts-nilai">
                            <span className="score hi">{r.rata}</span>
                            {pred && <span className={`badge ${pred.cls}`}>{pred.label}</span>}
                          </div>
                          <dl className="ts-fakta">
                            <div><dt>Mapel dinilai</dt><dd className={r.terisi < r.totalMapel ? 'ts-warn' : ''}>{r.terisi}/{r.totalMapel}</dd></div>
                            <div><dt>Akhlaq</dt><dd>{r.akhlaq != null ? r.akhlaq.toFixed(1) : '—'}</dd></div>
                            <div><dt>Izin</dt><dd>{r.izin}</dd></div>
                            <div><dt>Alpa</dt><dd className={r.tanpaIzin > 0 ? 'ts-warn' : ''}>{r.tanpaIzin}</dd></div>
                          </dl>
                          {r.unggulKarena && (
                            <div className="ts-alasan">Nilai sama dengan santri lain — diurutkan di atas karena {r.unggulKarena}.</div>
                          )}
                          {i === d.top.length - 1 && d.semua[d.top.length] && d.semua[d.top.length].rata === r.rata && (
                            <div className="ts-alasan">Ada santri lain dengan nilai sama di luar tiga besar.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {d.semua.length > 0 && (
                  <div className="card" style={{ marginTop: 14 }}>
                    <div className="card-head">
                      <h3>10 Besar {lem}</h3>
                      <div className="sub">Pembanding — supaya selisih dengan peringkat berikutnya terlihat</div>
                    </div>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th style={{ width: 48 }}>#</th>
                          <th>Nama</th>
                          <th>Kelas</th>
                          <th style={{ textAlign: 'right' }}>Rata-rata</th>
                          <th style={{ textAlign: 'right' }}>Mapel</th>
                          <th style={{ textAlign: 'right' }}>Akhlaq</th>
                          <th style={{ textAlign: 'right' }}>Izin</th>
                          <th style={{ textAlign: 'right' }}>Alpa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.semua.slice(0, 10).map(r => (
                          <tr key={r.id} className={r.peringkat <= 3 ? 'ts-row-top' : ''}>
                            <td><b>{r.peringkat}</b></td>
                            <td>{r.nama}</td>
                            <td>{r.kelas}</td>
                            <td style={{ textAlign: 'right' }} className="score">{r.rata}</td>
                            <td style={{ textAlign: 'right' }} className={r.terisi < r.totalMapel ? 'ts-warn' : ''}>{r.terisi}/{r.totalMapel}</td>
                            <td style={{ textAlign: 'right' }}>{r.akhlaq != null ? r.akhlaq.toFixed(1) : '—'}</td>
                            <td style={{ textAlign: 'right' }}>{r.izin}</td>
                            <td style={{ textAlign: 'right' }} className={r.tanpaIzin > 0 ? 'ts-warn' : ''}>{r.tanpaIzin}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
