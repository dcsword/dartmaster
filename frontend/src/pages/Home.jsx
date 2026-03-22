import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '32px' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>🎯</div>
        <h1 style={{ fontSize: '64px', color: 'var(--accent)', lineHeight: 1 }}>DARTMASTER</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px', letterSpacing: '0.1em' }}>501 · DOUBLE OUT · PLAY ANYWHERE</p>
      </div>

      {/* Main actions */}
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button className="btn-primary" style={{ fontSize: '18px', padding: '16px', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }} onClick={() => navigate('/setup')}>
          NEW GAME
        </button>
        <button className="btn-ghost" onClick={() => navigate('/join')}>
          Join a Room
        </button>
        <button className="btn-ghost" onClick={() => navigate('/history')}>
          Game History
        </button>
        {user ? (
          <button className="btn-ghost" onClick={() => navigate(`/player/${user.id}`)}>
            My Profile
          </button>
        ) : (
          <button className="btn-ghost" onClick={() => navigate('/login')}>
            Sign In / Register
          </button>
        )}
      </div>

      {/* Signed in indicator */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted)', fontSize: '13px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }} />
          Signed in as <strong style={{ color: 'var(--text)' }}>{user.name}</strong>
          {user.username && <span style={{ color: 'var(--muted)', fontSize: '12px' }}> @{user.username}</span>}
          <button onClick={logout} style={{ background: 'none', color: 'var(--muted)', fontSize: '12px', textDecoration: 'underline' }}>sign out</button>
        </div>
      )}
    </div>
  );
}
