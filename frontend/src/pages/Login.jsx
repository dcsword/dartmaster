import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleButton({ onSuccess, onError, loading }) {
  const [gsiReady, setGsiReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (window.google) { setGsiReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => setGsiReady(true);
    document.head.appendChild(script);
  }, []);

  function handleGoogleClick() {
    if (!window.google || !gsiReady) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try { await onSuccess(response.credential); }
        catch (err) { onError(err.message); }
      },
    });
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: render button in a popup
        const div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:hidden';
        document.body.appendChild(div);
        window.google.accounts.id.renderButton(div, { type: 'standard', size: 'large' });
        div.querySelector('[role=button]')?.click();
        setTimeout(() => div.remove(), 2000);
      }
    });
  }

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <button
      onClick={handleGoogleClick}
      disabled={loading || !gsiReady}
      style={{
        width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg3)', border: '1px solid var(--border)',
        color: 'var(--text)', fontSize: '14px', fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
      }}
    >
      {/* Google G logo */}
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', username: '', email: '', login: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
      login(result.user, result.token, result.refreshToken);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  async function handleGoogleSuccess(idToken) {
    setGoogleLoading(true); setError('');
    try {
      const result = await api.googleLogin(idToken);
      login(result.user, result.token, result.refreshToken);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally { setGoogleLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎯</div>
          <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '48px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>DARTMASTER</h1>
          <p className="label-xs" style={{ marginTop: '6px' }}>501 · Double Out · Play Anywhere</p>
        </div>

        {/* Google button */}
        <div style={{ marginBottom: '16px' }}>
          <GoogleButton
            onSuccess={handleGoogleSuccess}
            onError={setError}
            loading={googleLoading}
          />
        </div>

        {/* Divider */}
        <div className="divider" style={{ marginBottom: '16px' }}>or</div>

        {/* Email tabs */}
        <div style={{ display: 'flex', marginBottom: '20px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '4px', gap: '4px' }}>
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

          <button className="btn-primary" onClick={handleSubmit} disabled={loading}
            style={{ marginTop: '4px', fontFamily: 'Barlow Condensed', fontSize: '18px', fontWeight: 700, letterSpacing: '0.05em' }}>
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
