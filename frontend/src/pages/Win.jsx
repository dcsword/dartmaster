import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../utils/api';

export default function Win() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { winnerName, teamName, result } = location.state || {};
  const [game, setGame] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.getGame(id)
      .then(setGame)
      .catch(err => {
        console.warn('Could not load finished game:', err.message);
        setLoadError('Could not load match details');
      });
  }, [id]);

  const displayName = teamName || winnerName || 'Winner';
  const checkoutDart = result?.turnResult?.checkoutDart;
  const multiSet = game?.sets_per_match > 1;

  function legsLabel() {
    if (!game) return '';
    if (game.mode === 'singles') {
      const winner = game.players?.find(p => p.id === game.winner_id);
      const others = game.players?.filter(p => p.id !== game.winner_id);
      if (!winner) return '';
      return `${winner.legs_won} – ${others?.map(p => p.legs_won).join(' – ')}`;
    }
    const winner = game.teams?.find(t => t.id === game.winner_team_id);
    const others = game.teams?.filter(t => t.id !== game.winner_team_id);
    if (!winner) return '';
    return `${winner.legs_won} – ${others?.map(t => t.legs_won).join(' – ')}`;
  }

  function setsLabel() {
    if (!game || !multiSet) return '';
    if (game.mode === 'singles') {
      const winner = game.players?.find(p => p.id === game.winner_id);
      const others = game.players?.filter(p => p.id !== game.winner_id);
      if (!winner) return '';
      return `${winner.sets_won} – ${others?.map(p => p.sets_won).join(' – ')}`;
    }
    const winner = game.teams?.find(t => t.id === game.winner_team_id);
    const others = game.teams?.filter(t => t.id !== game.winner_team_id);
    if (!winner) return '';
    return `${winner.sets_won} – ${others?.map(t => t.sets_won).join(' – ')}`;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', gap: '24px', background: 'var(--bg)' }}>

      {/* Trophy */}
      <div style={{ fontSize: '72px', animation: 'pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275)' }}>🏆</div>

      {/* Winner */}
      <div>
        <div className="label-xs" style={{ marginBottom: '8px' }}>Match winner</div>
        <h1 style={{ fontSize: '60px', fontWeight: 800, color: 'var(--accent)', lineHeight: 0.9 }}>{displayName}</h1>
        <p style={{ color: 'var(--muted)', marginTop: '8px', fontSize: '14px', letterSpacing: '0.1em' }}>WINS THE MATCH!</p>
      </div>

      {/* Score cards */}
      {loadError && (
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>{loadError}</p>
      )}
      {game && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {multiSet && (
            <div className="card-sm" style={{ minWidth: '90px', textAlign: 'center' }}>
              <div className="label-xs" style={{ marginBottom: '6px' }}>Sets</div>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: '32px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{setsLabel()}</div>
            </div>
          )}
          <div className="card-sm" style={{ minWidth: '90px', textAlign: 'center' }}>
            <div className="label-xs" style={{ marginBottom: '6px' }}>Legs</div>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '32px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{legsLabel()}</div>
          </div>
          {checkoutDart && (
            <div className="card-sm" style={{ minWidth: '90px', textAlign: 'center' }}>
              <div className="label-xs" style={{ marginBottom: '6px' }}>Checkout</div>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: '32px', fontWeight: 800, color: 'var(--green)', lineHeight: 1 }}>{checkoutDart}</div>
            </div>
          )}
          <div className="card-sm" style={{ minWidth: '90px', textAlign: 'center' }}>
            <div className="label-xs" style={{ marginBottom: '6px' }}>Format</div>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: '22px', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
              {game.format === 'best_of' ? 'Bo' : 'FT'}{game.legs_per_set}{game.sets_per_match > 1 ? ` · ${game.sets_per_match}S` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button className="btn-primary" style={{ fontSize: '20px', padding: '16px', fontFamily: 'Barlow Condensed', letterSpacing: '0.05em', fontWeight: 800 }} onClick={() => navigate('/setup')}>
          PLAY AGAIN
        </button>
        <button className="btn-ghost" onClick={() => navigate('/history')}>View History</button>
        <button className="btn-ghost" onClick={() => navigate('/')}>Home</button>
      </div>

      <style>{`
        @keyframes pop {
          0% { transform: scale(0.3); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
