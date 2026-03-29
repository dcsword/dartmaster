import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { GuestSessionStore } from '../utils/guestSessions';

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = [];
    if (user?.id) {
      ids.push(user.id);
    } else {
      try {
        const guestId = GuestSessionStore.getCurrentGuestId();
        if (guestId) ids.push(guestId);
      } catch (err) {
        console.warn('Could not read current guest history id:', err.message);
      }
    }
    api.getHistory(30, ids)
      .then(g => {
        setGames(g);
        setLoading(false);
      })
      .catch(err => {
        console.warn('History lookup failed:', err.message);
        setLoading(false);
      });
  }, [user]);

  function formatDate(dt) {
    if (!dt) return '';
    return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function duration(start, end) {
    if (!start || !end) return '';
    const mins = Math.round((new Date(end) - new Date(start)) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  return (
    <Layout>
      <div className="page with-nav">
        <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '48px', fontWeight: 800, color: 'var(--text)', lineHeight: 0.9, marginBottom: '6px' }}>HISTORY</h1>
        <p className="label-xs" style={{ marginBottom: '24px' }}>{user ? `Games for ${user.name}` : 'Games for this guest'}</p>

        {loading && <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center' }}>Loading...</div>}
        {!loading && games.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
            <p style={{ marginBottom: '20px' }}>No games played yet</p>
            <button className="btn-primary" style={{ maxWidth: '200px', margin: '0 auto' }} onClick={() => navigate('/setup')}>Play Now</button>
          </div>
        )}

        <div className="history-grid">
          {games.map(g => (
            <div key={g.id} className="card" style={{ cursor: 'pointer', padding: '14px 16px' }} onClick={() => navigate(`/game/${g.id}/detail`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'Barlow Condensed', fontSize: '18px', fontWeight: 700 }}>501</span>
                    <span className="tag" style={{ fontSize: '10px', padding: '2px 8px' }}>{g.mode}</span>
                    <span className="tag" style={{ fontSize: '10px', padding: '2px 8px' }}>{g.ruleset.replace(/_/g, ' ')}</span>
                  </div>
                  {(g.winner_name || g.winner_team_name) && (
                    <div style={{ fontSize: '13px', color: 'var(--green)', marginBottom: '3px' }}>🏆 {g.mode === 'teams' ? g.winner_team_name : g.winner_name}</div>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{formatDate(g.started_at)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: '22px', fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                    {g.format === 'best_of' ? 'Bo' : g.format === 'first_to' ? 'FT' : ''}{g.legs_per_set || ''}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{duration(g.started_at, g.finished_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
