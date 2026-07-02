'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Gagal masuk');
        setLoading(false);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Terjadi kesalahan jaringan');
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={onSubmit} style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.logo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
              <path d="M12 3l8 4v5c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V7l8-4z" />
              <path d="M9.5 12l1.8 1.8L15 10" />
            </svg>
          </div>
          <div>
            <div style={styles.title}>Raport Online</div>
            <div style={styles.sub}>Ponpes Al-Hikmah</div>
          </div>
        </div>

        <h1 style={styles.heading}>Masuk</h1>
        <p style={styles.lead}>Silakan masuk untuk mengelola data raport.</p>

        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>
          Username
          <input
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, #0b3b37 0%, #0d4842 60%, #0e524b 100%)',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--surface)',
    borderRadius: 'var(--r-xl)',
    boxShadow: 'var(--shadow-lg)',
    padding: '28px 26px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-700) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 44px',
  },
  title: { fontWeight: 800, fontSize: 16, color: 'var(--ink)' },
  sub: { fontSize: 12, color: 'var(--muted)' },
  heading: { margin: '8px 0 0', fontSize: 22, color: 'var(--ink)' },
  lead: { margin: 0, color: 'var(--muted)', fontSize: 13 },
  error: {
    background: 'var(--red-soft)',
    color: 'var(--red)',
    padding: '9px 12px',
    borderRadius: 'var(--r-sm)',
    fontSize: 13,
    fontWeight: 500,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ink-2)',
  },
  input: {
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-sm)',
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: 'inherit',
    outlineColor: 'var(--brand)',
  },
  button: {
    marginTop: 6,
    background: 'var(--brand)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--r-sm)',
    padding: '11px 14px',
    fontSize: 15,
    fontWeight: 700,
  },
};
