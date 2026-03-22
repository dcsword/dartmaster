import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Layout>
      <div className="page with-nav">

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <div className="label-xs" style={{ marginBottom: '4px' }}>Welcome back</div>
            <h1 style={{ fontSize: '56px', fontWeight: 800, color: 'var(--text)', lineHeight: 0.9, letterSpacing: '-1px' }}>
              PLAY<br /><span style={{ color: 'var(--accent)' }}>DARTS</span>
            </h1>
          </div>
          {user && (
            <div onClick={() => navigate(`/player/${user.id}`)} style={{ cursor: 'pointer', textAlign: 'right' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: user.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff', marginLeft: 'auto' }}>
                {user.name[0].toUpperCase()}
              </div>
              {user.username && <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px' }}>@{user.username}</div>}
            </div>
          )}
        </div>

        {/* Primary CTA */}
        <button className="btn-primary" onClick={() => navigate('/setup')}
          style={{ fontSize: '22px', padding: '18px', fontFamily: 'Barlow Condensed', fontWeight: 800, letterSpacing: '0.05em', borderRadius: '14px', marginBottom: '10px' }}>
          NEW GAME
        </button>
        <button className="btn-ghost" onClick={() => navigate('/join')} style={{ marginBottom: '28px' }}>
          Join a Room
        </button>

        {/* Quick start */}
        <div style={{ marginBottom: '28px' }}>
          <div className="label-xs" style={{ marginBottom: '10px' }}>Quick start</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="tag active" onClick={() => navigate('/setup', { state: { mode: 'singles', playerCount: 2 } })}>501 · 2 players</button>
            <button className="tag" onClick={() => navigate('/setup', { state: { mode: 'singles', playerCount: 4 } })}>501 · 4 players</button>
            <button className="tag" onClick={() => navigate('/setup', { state: { mode: 'teams' } })}>Teams · 2v2</button>
          </div>
        </div>

        {/* Signed-in card */}
        {user ? (
          <div>
            <div className="label-xs" style={{ marginBottom: '10px' }}>Your account</div>
            <div className="card" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate(`/player/${user.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: user.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                  {user.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
                  {user.username && <div style={{ fontSize: '11px', color: 'var(--accent)' }}>@{user.username}</div>}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)' }} />
                Signed in
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '14px' }}>Sign in to track your stats and history</div>
            <button className="btn-primary" onClick={() => navigate('/login')} style={{ maxWidth: '200px', margin: '0 auto' }}>Sign In / Register</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
