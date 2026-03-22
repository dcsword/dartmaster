import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Collect all user IDs to filter by:
    // 1. Logged-in user
    // 2. Any guest IDs stored on this device
    const ids = [];
    if (user?.id) {
      // Logged in — only show games for this registered account
      ids.push(user.id);
    } else {
      // Not logged in — show games played as guest on this device
      try {
        const guestIds = JSON.parse(localStorage.getItem('dm_guest_ids') || '[]');
        ids.push(...guestIds);
      } catch { }
    }

    api.getHistory(30, ids)
      .then(g => { setGames(g); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

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

      <h1 style={{ fontSize: '42px', color: 'var(--accent)', marginBottom: '8px' }}>HISTORY</h1>
      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '24px' }}>
        {user ? `Showing games for ${user.name}` : 'Showing games played on this device'}
      </p>

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
