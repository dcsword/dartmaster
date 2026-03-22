import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', username: '', email: '', login: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const usernameHint = () => {
    if (!form.username) return null;
    if (form.username.length < 3) return { msg: 'At least 3 characters', ok: false };
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return { msg: 'Letters, numbers and underscores only', ok: false };
    return { msg: `@${form.username} looks good`, ok: true };
  };
  const hint = tab === 'register' ? usernameHint() : null;

  async function handleSubmit() {
    setError(''); setLoading(true);
    try {
      const result = tab === 'login'
        ? await api.login({ login: form.login, password: form.password })
        : await api.register({ name: form.name, username: form.username, email: form.email, password: form.password });
      login(result.user, result.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎯</div>
          <h1 style={{ fontSize: '48px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>DARTMASTER</h1>
          <p className="label-xs" style={{ marginTop: '6px' }}>501 · Double Out · Play Anywhere</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '24px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '4px', gap: '4px' }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--muted)', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tab === 'register' && (
            <>
              <input placeholder="Display name (e.g. Dogancan)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '14px', pointerEvents: 'none' }}>@</span>
                  <input placeholder="username" value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '').toLowerCase() }))}
                    style={{ paddingLeft: '28px' }} />
                </div>
                {hint && <p style={{ fontSize: '11px', color: hint.ok ? 'var(--green)' : 'var(--muted)', marginTop: '4px', paddingLeft: '4px' }}>{hint.msg}</p>}
              </div>
              <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </>
          )}
          {tab === 'login' && (
            <input placeholder="Username or email" value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          )}
          <input type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

          {error && (
            <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.25)', borderRadius: 'var(--radius-xs)', padding: '10px 14px', fontSize: '13px', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: '4px', fontFamily: 'Barlow Condensed', fontSize: '18px', fontWeight: 700, letterSpacing: '0.05em' }}>
            {loading ? '...' : tab === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </div>

        <button onClick={() => navigate('/')} style={{ display: 'block', margin: '20px auto 0', background: 'none', color: 'var(--muted)', fontSize: '13px' }}>
          ← Back to home
        </button>
      </div>
    </div>
  );
}
