import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', username: '', login: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Live username validation feedback
  const usernameHint = () => {
    if (!form.username) return null;
    if (form.username.length < 3) return { msg: 'At least 3 characters', ok: false };
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return { msg: 'Letters, numbers and underscores only', ok: false };
    return { msg: `@${form.username.toLowerCase()} looks good`, ok: true };
  };

  const hint = tab === 'register' ? usernameHint() : null;

  async function handleSubmit() {
    setError('');
    setLoading(true);
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px' }}>🎯</div>
          <h1 style={{ fontSize: '40px', color: 'var(--accent)' }}>DARTMASTER</h1>
        </div>

        <div className="card">
          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '24px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); }} style={{ flex: 1, padding: '10px', background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--muted)', fontSize: '14px', fontWeight: 600, textTransform: 'capitalize', border: 'none', borderRadius: 0 }}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {tab === 'register' && (
              <>
                {/* Display name */}
                <div>
                  <input
                    placeholder="Display name (e.g. Dogancan)"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', paddingLeft: '2px' }}>
                    Shown on scoreboard and history
                  </p>
                </div>

                {/* Username */}
                <div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '15px', pointerEvents: 'none' }}>@</span>
                    <input
                      placeholder="username"
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '').toLowerCase() }))}
                      style={{ paddingLeft: '28px' }}
                    />
                  </div>
                  {hint && (
                    <p style={{ fontSize: '11px', color: hint.ok ? 'var(--green)' : 'var(--muted)', marginTop: '4px', paddingLeft: '2px' }}>
                      {hint.msg}
                    </p>
                  )}
                  {!hint && (
                    <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', paddingLeft: '2px' }}>
                      Unique identifier — used to log in
                    </p>
                  )}
                </div>

                {/* Email */}
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </>
            )}

            {tab === 'login' && (
              <input
                placeholder="Username or email"
                value={form.login}
                onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            )}

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />

            {error && (
              <div style={{ background: 'rgba(224,64,64,0.1)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13px', color: 'var(--danger)' }}>
                {error}
              </div>
            )}

            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: '4px' }}>
              {loading ? '...' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>

        <button onClick={() => navigate('/')} style={{ display: 'block', margin: '16px auto 0', background: 'none', color: 'var(--muted)', fontSize: '13px' }}>
          ← Back to home
        </button>
      </div>
    </div>
  );
}
