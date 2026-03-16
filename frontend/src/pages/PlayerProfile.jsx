import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function PlayerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getPlayer(id), api.getPlayerGames(id)])
      .then(([p, g]) => { setPlayer(p); setGames(g); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>Loading...</div>;
  if (!player) return <div style={{ padding: '24px' }}>Player not found</div>;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', color: 'var(--muted)', fontSize: '13px', marginBottom: '24px' }}>← Back</button>

      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: player.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: '#fff' }}>
          {player.name[0].toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '36px', color: 'var(--text)', lineHeight: 1 }}>{player.name}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px' }}>Member since {new Date(player.created_at).getFullYear()}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'GAMES', value: player.games_played || 0 },
          { label: 'WINS', value: player.games_won || 0 },
          { label: 'WIN %', value: `${player.win_rate || 0}%` },
          { label: 'AVG / DART', value: player.avg_per_dart || 0 },
          { label: 'BEST CHECKOUT', value: player.highest_checkout || '—' },
          { label: 'BEST GAME', value: player.best_game_darts ? `${player.best_game_darts} darts` : '—' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '6px' }}>{s.label}</p>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '24px', color: 'var(--text)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent games */}
      <h2 style={{ fontSize: '24px', color: 'var(--accent)', marginBottom: '12px' }}>RECENT GAMES</h2>
      {games.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No finished games yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {games.slice(0, 10).map(g => (
          <div key={g.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '16px' }}>{g.won ? '🏆' : '·'}</span>
              <span style={{ fontSize: '13px', color: g.won ? 'var(--green)' : 'var(--muted)' }}>{g.won ? 'Win' : 'Loss'}</span>
              <span className="tag" style={{ fontSize: '11px', padding: '2px 8px' }}>{g.ruleset.replace(/_/g, ' ')}</span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{new Date(g.finished_at).toLocaleDateString('en-GB')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
