import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

export default function Stats() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="with-nav" style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px' }}>
      <h1 style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text)', lineHeight: 0.9, marginBottom: '6px' }}>STATS</h1>
      <p className="label-xs" style={{ marginBottom: '32px' }}>Coming soon</p>

      {!user ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
          <p style={{ color: 'var(--muted)', marginBottom: '16px', fontSize: '14px' }}>Sign in to see your stats</p>
          <button className="btn-primary" onClick={() => navigate('/login')} style={{ maxWidth: '200px', margin: '0 auto' }}>Sign In</button>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🚧</div>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Full stats dashboard coming soon.<br />For now, check your profile for game history.</p>
          <button className="btn-ghost" style={{ marginTop: '16px' }} onClick={() => navigate(`/player/${user.id}`)}>View Profile</button>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
