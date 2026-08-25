import Link from "next/link";
import "./landing.css";

export const metadata = {
  title: "Raport Online Pesantren — Rekap Nilai & Cetak Raport TPQ / Madin",
  description:
    "Satu aplikasi untuk mengelola santri, input nilai, rekap otomatis, dan cetak raport TPQ & Madin. Tanpa Excel, tanpa hitung manual.",
};

/* ---------- ikon kecil (inline, tanpa dependensi) ---------- */
const Ic = {
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 4v5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V7l8-4z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3 3-4.5 5.5-4.5S13.9 16 14.5 19" />
      <path d="M16 5.5a3 3 0 010 5.6M18 19c-.3-2-1-3.3-2.2-4.2" />
    </svg>
  ),
  pen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 10-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </svg>
  ),
  printer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 9V4h10v5" />
      <rect x="4" y="9" width="16" height="7" rx="2" />
      <path d="M7 14h10v6H7z" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.6l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8L12 3.6z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  ),
  ladder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V13h5v8M9.5 21v-6h5v6M15 21V9h5v12" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A2.5 2.5 0 016.5 3H19v15H6.5A2.5 2.5 0 004 20.5v-15z" />
      <path d="M19 18v3H6.5" />
    </svg>
  ),
  cal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  ),
  device: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
};

const FEATURES = [
  {
    icon: Ic.chart, bg: "var(--brand-tint)", fg: "var(--brand-700)",
    title: "Rekap nilai otomatis",
    desc: "Rata-rata praktik & tertulis, peringkat kelas, dan sebaran nilai dihitung sendiri begitu nilai masuk.",
  },
  {
    icon: Ic.pen, bg: "var(--blue-soft)", fg: "var(--blue)",
    title: "Input nilai secepat Excel",
    desc: "Satu tabel untuk satu kelas, pindah antar kolom pakai keyboard. Tidak perlu buka form satu per satu.",
  },
  {
    icon: Ic.printer, bg: "var(--gold-soft)", fg: "#a97c2c",
    title: "Cetak raport siap A4",
    desc: "Beberapa pilihan layout raport, lengkap catatan wali kelas dan tanda tangan — langsung print.",
  },
  {
    icon: Ic.users, bg: "var(--violet-soft)", fg: "var(--violet)",
    title: "Data santri terpusat",
    desc: "Biodata, wali santri, riwayat kelas, dan status keaktifan santri TPQ maupun Madin dalam satu tempat.",
  },
  {
    icon: Ic.star, bg: "var(--amber-soft)", fg: "var(--amber)",
    title: "Penilaian akhlaq",
    desc: "Nilai sikap, kedisiplinan, dan adab harian ikut terekam dan tampil di raport santri.",
  },
  {
    icon: Ic.ladder, bg: "var(--green-soft)", fg: "var(--green)",
    title: "Kenaikan & arsip tahun ajaran",
    desc: "Naikkan kelas satu angkatan sekaligus, nilai tahun sebelumnya tetap tersimpan dan bisa dibuka lagi.",
  },
];

const MODULES = [
  { href: "/dashboard-a", icon: Ic.grid, title: "Dashboard", sub: "Rekap & sebaran nilai" },
  { href: "/siswa", icon: Ic.users, title: "Data Santri", sub: "Biodata & wali santri" },
  { href: "/siswa-kelas", icon: Ic.users, title: "Siswa & Kelas", sub: "Pembagian rombel" },
  { href: "/input-nilai", icon: Ic.pen, title: "Input Nilai", sub: "Per kelas, per mapel" },
  { href: "/ujian", icon: Ic.book, title: "Ujian", sub: "Jadwal & hasil ujian" },
  { href: "/akhlaq", icon: Ic.star, title: "Nilai Akhlaq", sub: "Sikap & kedisiplinan" },
  { href: "/kenaikan", icon: Ic.ladder, title: "Kenaikan Kelas", sub: "Promosi satu angkatan" },
  { href: "/raport-v3", icon: Ic.printer, title: "Cetak Raport", sub: "Preview & print A4" },
  { href: "/tahun-ajaran", icon: Ic.cal, title: "Tahun Ajaran", sub: "Arsip & periode aktif" },
];

const STEPS = [
  { n: 1, h: "Siapkan kelas & santri", p: "Masukkan data santri TPQ dan Madin, lalu bagi ke kelas beserta wali kelasnya." },
  { n: 2, h: "Input nilai per mapel", p: "Ustadz mengisi nilai praktik dan tertulis langsung di tabel kelas masing-masing." },
  { n: 3, h: "Cek rekap", p: "Rata-rata, peringkat, dan santri yang perlu pendampingan langsung terlihat di dashboard." },
  { n: 4, h: "Cetak raport", p: "Pilih layout raport, tambahkan catatan wali kelas, lalu cetak untuk dibagikan ke wali santri." },
];

const PREVIEW_ROWS = [
  { in: "AF", nm: "Ahmad Faiz Maulana", sc: "92", c: "#0d9488" },
  { in: "NA", nm: "Nadia Aulia Rahma", sc: "89", c: "#7c3aed" },
  { in: "MR", nm: "M. Rafa Pratama", sc: "85", c: "#2563eb" },
];

export default function LandingPage() {
  return (
    <div className="lp">
      {/* ---------------- Navbar ---------------- */}
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <Link href="/landing" className="lp-logo">
            <div className="mark">{Ic.shield}</div>
            <div>
              <div className="nm">Raport Online</div>
              <div className="sb">TPQ &amp; Madin</div>
            </div>
          </Link>
          <nav className="lp-nav-links">
            <a href="#fitur">Fitur</a>
            <a href="#modul">Modul</a>
            <a href="#alur">Cara Kerja</a>
          </nav>
          <Link href="/dashboard-a" className="lp-btn lp-btn-primary lp-btn-sm">
            Buka Aplikasi {Ic.arrow}
          </Link>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <div>
            <span className="lp-eyebrow">
              <i className="dot" /> Untuk TPQ &amp; Madrasah Diniyah
            </span>
            <h1 className="lp-h1">
              Raport pesantren, <br />
              <span className="grad">selesai tanpa Excel.</span>
            </h1>
            <p className="lp-lead">
              Kelola santri, input nilai, dan cetak raport TPQ &amp; Madin dalam satu aplikasi.
              Rekap dan peringkat dihitung otomatis — ustadz tinggal mengisi nilai.
            </p>
            <div className="lp-cta">
              <Link href="/dashboard-a" className="lp-btn lp-btn-primary">
                Coba Demo Sekarang {Ic.arrow}
              </Link>
              <a href="#fitur" className="lp-btn lp-btn-ghost">Lihat Fitur</a>
            </div>
            <div className="lp-trust">
              <span>{Ic.check} Tanpa instalasi</span>
              <span>{Ic.check} Data TPQ &amp; Madin terpisah</span>
              <span>{Ic.check} Raport siap cetak A4</span>
            </div>
          </div>

          {/* Preview mock */}
          <div className="lp-preview">
            <div className="lp-preview-bar">
              <i /><i /><i />
              <em className="url">raport-online / dashboard</em>
            </div>
            <div className="lp-preview-body">
              <div className="lp-stat-row">
                <div className="lp-stat"><div className="k">Santri</div><div className="v">248</div></div>
                <div className="lp-stat"><div className="k">Rata-rata</div><div className="v">84<small>,6</small></div></div>
                <div className="lp-stat"><div className="k">Tuntas</div><div className="v">92<small>%</small></div></div>
              </div>
              <div className="lp-chart">
                <div className="lp-chart-head">
                  <b>Rata-rata per Kelas</b>
                  <em>Ganjil 2025/26</em>
                </div>
                <div className="lp-bars">
                  {[62, 78, 94, 70, 86, 74, 90].map((h, i) => (
                    <div key={i} style={{ height: `${h}%`, animationDelay: `${i * 70}ms` }} />
                  ))}
                </div>
              </div>
              <div className="lp-rows">
                {PREVIEW_ROWS.map((r) => (
                  <div className="lp-row" key={r.in}>
                    <div className="av" style={{ background: r.c }}>{r.in}</div>
                    <div className="nm">{r.nm}</div>
                    <div className="sc" style={{ color: r.c }}>{r.sc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lp-badge-float">
              <div className="ic">{Ic.check}</div>
              <div>
                <b>Raport 248 santri</b>
                <span>siap dicetak</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      <section className="lp-section alt" style={{ paddingBlock: 44 }}>
        <div className="lp-wrap">
          <div className="lp-stats-strip">
            <div><div className="v">2</div><div className="k">Lembaga: TPQ &amp; Madin</div></div>
            <div><div className="v">9</div><div className="k">Kelas terkelola</div></div>
            <div><div className="v">12</div><div className="k">Mata pelajaran</div></div>
            <div><div className="v">4</div><div className="k">Pilihan layout raport</div></div>
          </div>
        </div>
      </section>

      {/* ---------------- Fitur ---------------- */}
      <section className="lp-section" id="fitur">
        <div className="lp-wrap">
          <div className="lp-head">
            <div className="lp-kicker">Fitur</div>
            <h2 className="lp-h2">Semua yang dibutuhkan wali kelas</h2>
            <p className="lp-sub">
              Dari pendataan santri sampai raport tercetak — tidak ada lagi rekap manual di akhir semester.
            </p>
          </div>
          <div className="lp-features">
            {FEATURES.map((f) => (
              <article className="lp-feature" key={f.title}>
                <div className="ic" style={{ background: f.bg, color: f.fg }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Modul ---------------- */}
      <section className="lp-section alt" id="modul">
        <div className="lp-wrap">
          <div className="lp-head">
            <div className="lp-kicker">Modul</div>
            <h2 className="lp-h2">Jelajahi setiap halaman</h2>
            <p className="lp-sub">
              Klik salah satu modul untuk langsung masuk ke halamannya dengan data contoh.
            </p>
          </div>
          <div className="lp-modules">
            {MODULES.map((m) => (
              <Link href={m.href} className="lp-module" key={m.href}>
                <div className="ic">{m.icon}</div>
                <div>
                  <b>{m.title}</b>
                  <span>{m.sub}</span>
                </div>
                <div className="arw">{Ic.arrow}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Alur ---------------- */}
      <section className="lp-section" id="alur">
        <div className="lp-wrap">
          <div className="lp-head">
            <div className="lp-kicker">Cara Kerja</div>
            <h2 className="lp-h2">Empat langkah sampai raport tercetak</h2>
          </div>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div className="lp-step" key={s.n}>
                <div className="n">{s.n}</div>
                <h4>{s.h}</h4>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="lp-section alt">
        <div className="lp-wrap">
          <div className="lp-cta-band">
            <h2>Siap mencoba di pesantren Anda?</h2>
            <p>
              Buka demo dengan data contoh lengkap — santri, nilai, sampai halaman raport siap cetak.
              Tidak perlu daftar.
            </p>
            <div className="lp-cta">
              <Link href="/dashboard-a" className="lp-btn lp-btn-white">
                Buka Dashboard {Ic.arrow}
              </Link>
              <Link href="/raport-v3" className="lp-btn lp-btn-outline">
                Lihat Contoh Raport
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div className="lp-logo">
            <div className="mark">{Ic.shield}</div>
            <div>
              <div className="nm">Raport Online</div>
              <div className="sb">Sistem raport pesantren</div>
            </div>
          </div>
          <nav className="lp-footer-links">
            <a href="#fitur">Fitur</a>
            <a href="#modul">Modul</a>
            <Link href="/dashboard-a">Aplikasi</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
