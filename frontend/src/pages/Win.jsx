import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../utils/api';

export default function Win() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { winnerName, teamName, result } = location.state || {};

  const [game, setGame] = useState(null);

  useEffect(() => {
    api.getGame(id).then(setGame).catch(() => {});
  }, [id]);

  const displayName = teamName || winnerName || 'Winner';
  const dartsThrown = result?.turnResult?.dartsThrown;
  const checkoutDart = result?.turnResult?.checkoutDart;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', gap: '24px' }}>

      {/* Trophy */}
      <div style={{ fontSize: '80px', animation: 'bounce 0.6s ease' }}>🏆</div>

      <div>
        <h1 style={{ fontSize: '56px', color: 'var(--accent)', lineHeight: 1 }}>{displayName}</h1>
        <p style={{ color: 'var(--muted)', marginTop: '8px', fontSize: '16px' }}>WINS THE LEG!</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {checkoutDart && (
          <div className="card" style={{ minWidth: '120px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' }}>CHECKOUT</p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '32px', color: 'var(--green)' }}>{checkoutDart}</p>
          </div>
        )}
        {game && (
          <div className="card" style={{ minWidth: '120px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' }}>RULESET</p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '24px', color: 'var(--text)' }}>{game.ruleset.replace(/_/g, ' ').toUpperCase()}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button className="btn-primary" style={{ fontSize: '18px', padding: '16px', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }} onClick={() => navigate('/setup')}>
          PLAY AGAIN
        </button>
        <button className="btn-ghost" onClick={() => navigate('/history')}>
          View History
        </button>
        <button className="btn-ghost" onClick={() => navigate('/')}>
          Home
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
