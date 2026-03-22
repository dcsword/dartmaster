import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="with-nav" style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px' }}>

      {/* Header */}
      <div style={{ padding: '24px 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="label-xs" style={{ marginBottom: '4px' }}>DartMaster</div>
          <h1 style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text)', lineHeight: 0.9, letterSpacing: '-1px' }}>
            PLAY<br /><span style={{ color: 'var(--accent)' }}>DARTS</span>
          </h1>
        </div>
        {user && (
          <div onClick={() => navigate(`/player/${user.id}`)} style={{ cursor: 'pointer', textAlign: 'right' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: user.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff', marginLeft: 'auto' }}>
              {user.name[0].toUpperCase()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px' }}>@{user.username || user.name}</div>
          </div>
        )}
      </div>

      {/* Primary CTA */}
      <button className="btn-primary" onClick={() => navigate('/setup')}
        style={{ fontSize: '20px', padding: '18px', fontFamily: 'Barlow Condensed', fontWeight: 800, letterSpacing: '0.05em', borderRadius: '14px', marginBottom: '10px' }}>
        NEW GAME
      </button>
      <button className="btn-ghost" onClick={() => navigate('/join')} style={{ marginBottom: '24px' }}>
        Join a Room
      </button>

      {/* Quick start chips */}
      <div style={{ marginBottom: '24px' }}>
        <div className="label-xs" style={{ marginBottom: '10px' }}>Quick start</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="tag active" onClick={() => navigate('/setup')}>501 · 2 players</button>
          <button className="tag" onClick={() => navigate('/setup')}>501 · 4 players</button>
          <button className="tag" onClick={() => navigate('/setup')}>Teams · 2v2</button>
        </div>
      </div>

      {/* Last game card - shown only if logged in */}
      {user && (
        <div>
          <div className="label-xs" style={{ marginBottom: '10px' }}>Last match</div>
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/history')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: user.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  {user.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>View history →</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--green)', marginBottom: '2px' }}>🟢 Signed in</div>
                {user.username && <div style={{ fontSize: '11px', color: 'var(--accent)' }}>@{user.username}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {!user && (
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>Sign in to track your stats and history</div>
          <button className="btn-primary" onClick={() => navigate('/login')} style={{ maxWidth: '200px', margin: '0 auto' }}>Sign In / Register</button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
