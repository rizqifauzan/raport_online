'use client';
import { useEffect, useState } from 'react';
import './login.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState('/dashboard-a');

  // Tujuan setelah login dibaca dari query `?next=`. Hanya jalur internal
  // yang diterima, supaya tidak bisa dipakai untuk mengarahkan ke situs lain.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('next');
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) setNext(raw);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? 'Login gagal. Coba lagi.');
        setLoading(false);
        return;
      }
      // Navigasi penuh, bukan router.replace: StoreProvider hidup di layout
      // root dan sudah ter-mount sejak halaman login, sehingga sesi serta
      // seluruh data hanya termuat ulang bila halaman dimuat dari awal.
      window.location.replace(next);
    } catch {
      setError('Tidak bisa menghubungi server. Periksa koneksi.');
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4v5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V7l8-4z"/>
              <path d="M9.5 12l1.8 1.8L15 10"/>
            </svg>
          </div>
          <div>
            <div className="login-brand-name">Raport Online</div>
            <div className="login-brand-sub">Ponpes Al-Hikmah</div>
          </div>
        </div>

        <h1 className="login-title">Masuk</h1>
        <p className="login-desc">
          Data santri dan nilai hanya bisa dibuka oleh pengguna terdaftar.
          Masukkan username dan password Anda.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="username">Username</label>
            <input
              id="username" className="login-input" autoComplete="username" autoFocus required
              value={username} disabled={loading}
              onChange={e => { setUsername(e.target.value); setError(''); }}
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">Password</label>
            <div className="login-pw">
              <input
                id="password" className="login-input" type={showPw ? 'text' : 'password'}
                autoComplete="current-password" required
                value={password} disabled={loading}
                onChange={e => { setPassword(e.target.value); setError(''); }}
              />
              <button type="button" className="login-pw-toggle" onClick={() => setShowPw(v => !v)}>
                {showPw ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>

        <div className="login-foot">
          Lupa password? Hubungi admin pesantren untuk mengatur ulang.
          <br/>
          <a href="/">← Kembali ke halaman depan</a>
        </div>
      </div>
    </div>
  );
}
