import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const result = tab === 'login'
        ? await api.login({ email: form.email, password: form.password })
        : await api.register({ name: form.name, email: form.email, password: form.password });
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
          <div style={{ display: 'flex', gap: '0', marginBottom: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', background: tab === t ? 'var(--accent)' : 'transparent', color: tab === t ? '#fff' : 'var(--muted)', fontSize: '14px', fontWeight: 600, textTransform: 'capitalize', border: 'none', borderRadius: 0 }}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tab === 'register' && (
              <input placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            )}
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

            {error && <p style={{ color: 'var(--danger)', fontSize: '13px' }}>{error}</p>}

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
