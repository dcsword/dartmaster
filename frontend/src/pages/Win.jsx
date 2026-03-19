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
  const checkoutDart = result?.turnResult?.checkoutDart;
  const multiSet = game?.sets_per_match > 1;

  function legsLabel() {
    if (!game) return '';
    if (game.mode === 'singles') {
      const winner = game.players?.find(p => p.id === game.winner_id);
      const others = game.players?.filter(p => p.id !== game.winner_id);
      if (!winner || !others?.length) return '';
      return `${winner.legs_won} – ${others.map(p => p.legs_won).join(' – ')} legs`;
    }
    const winner = game.teams?.find(t => t.id === game.winner_team_id);
    const others = game.teams?.filter(t => t.id !== game.winner_team_id);
    if (!winner || !others?.length) return '';
    return `${winner.legs_won} – ${others.map(t => t.legs_won).join(' – ')} legs`;
  }

  function setsLabel() {
    if (!game || !multiSet) return '';
    if (game.mode === 'singles') {
      const winner = game.players?.find(p => p.id === game.winner_id);
      const others = game.players?.filter(p => p.id !== game.winner_id);
      if (!winner) return '';
      return `${winner.sets_won} – ${others?.map(p => p.sets_won).join(' – ')} sets`;
    }
    const winner = game.teams?.find(t => t.id === game.winner_team_id);
    const others = game.teams?.filter(t => t.id !== game.winner_team_id);
    if (!winner) return '';
    return `${winner.sets_won} – ${others?.map(t => t.sets_won).join(' – ')} sets`;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', gap: '24px' }}>

      <div style={{ fontSize: '80px', animation: 'bounce 0.6s ease' }}>🏆</div>

      <div>
        <h1 style={{ fontSize: '56px', color: 'var(--accent)', lineHeight: 1 }}>{displayName}</h1>
        <p style={{ color: 'var(--muted)', marginTop: '8px', fontSize: '16px' }}>
          WINS THE MATCH!
        </p>
      </div>

      {/* Match score */}
      {game && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {multiSet && (
            <div className="card" style={{ minWidth: '120px' }}>
              <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' }}>SETS</p>
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '28px', color: 'var(--text)' }}>{setsLabel().replace(' sets', '')}</p>
            </div>
          )}
          <div className="card" style={{ minWidth: '120px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' }}>LEGS</p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '28px', color: 'var(--text)' }}>{legsLabel().replace(' legs', '')}</p>
          </div>
          {checkoutDart && (
            <div className="card" style={{ minWidth: '120px' }}>
              <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' }}>CHECKOUT</p>
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '28px', color: 'var(--green)' }}>{checkoutDart}</p>
            </div>
          )}
          <div className="card" style={{ minWidth: '120px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' }}>FORMAT</p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '18px', color: 'var(--text)' }}>
              {game.format === 'best_of' ? 'Bo' : 'FT'}{game.legs_per_set}
              {game.sets_per_match > 1 ? ` · ${game.sets_per_match}S` : ''}
            </p>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button className="btn-primary" style={{ fontSize: '18px', padding: '16px', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }} onClick={() => navigate('/setup')}>
          PLAY AGAIN
        </button>
        <button className="btn-ghost" onClick={() => navigate('/history')}>View History</button>
        <button className="btn-ghost" onClick={() => navigate('/')}>Home</button>
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
