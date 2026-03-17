import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function History() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory(30).then(g => { setGames(g); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function formatDate(dt) {
    if (!dt) return '';
    return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function duration(start, end) {
    if (!start || !end) return '';
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--muted)', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        ← Back
      </button>

      <h1 style={{ fontSize: '42px', color: 'var(--accent)', marginBottom: '24px' }}>HISTORY</h1>

      {loading && <p style={{ color: 'var(--muted)' }}>Loading...</p>}
      {!loading && games.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</div>
          <p>No games played yet.</p>
          <button className="btn-primary" style={{ marginTop: '16px', maxWidth: '200px' }} onClick={() => navigate('/setup')}>Play Now</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {games.map(g => (
          <div key={g.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(`/game/${g.id}/detail`)}>
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'Bebas Neue', fontSize: '18px' }}>501</span>
                <span className="tag" style={{ fontSize: '11px', padding: '2px 8px' }}>{g.mode}</span>
                <span className="tag" style={{ fontSize: '11px', padding: '2px 8px' }}>{g.ruleset.replace(/_/g, ' ')}</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{formatDate(g.started_at)}</div>
              {(g.winner_name || g.winner_team_name) && (
                <div style={{ fontSize: '13px', color: 'var(--green)', marginTop: '2px' }}>
                  🏆 {g.mode === 'teams' ? g.winner_team_name : g.winner_name}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', color: 'var(--muted)', fontSize: '12px' }}>
              {duration(g.started_at, g.finished_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
