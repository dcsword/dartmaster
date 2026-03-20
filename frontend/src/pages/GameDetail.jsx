import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

function dartLabel(dart) {
  if (dart.is_bull) return dart.score === 50 ? 'Bull' : '25';
  if (dart.multiplier === 3) return `T${dart.score / 3}`;
  if (dart.multiplier === 2) return `D${dart.score / 2}`;
  return `${dart.score}`;
}

function dartValueClass(dart) {
  if (dart.is_bull) return 'dart-slot-value bull';
  if (dart.multiplier === 3) return 'dart-slot-value triple';
  if (dart.multiplier === 2) return 'dart-slot-value double';
  return 'dart-slot-value single';
}

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getGameDetail(id)
      .then(setData)
      .catch(() => setError('Could not load game'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error || !data) return <div className="page-error">{error || 'Not found'}</div>;

  const { game, rounds } = data;

  function formatDate(dt) {
    return new Date(dt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function turnTotal(darts) {
    return darts.reduce((s, d) => s + d.score, 0);
  }

  return (
    <div className="page">
      <button className="btn-back" onClick={() => navigate('/history')}>
        ← Back to history
      </button>

      <div className="game-detail-header">
        <h1>GAME DETAIL</h1>
        <p>{formatDate(game.started_at)} · {game.mode} · {game.ruleset.replace(/_/g, ' ')}</p>
      </div>

      {/* Legs & sets summary */}
      {data.legs && data.legs.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', color: 'var(--accent)', marginBottom: '12px' }}>LEGS</h2>

          {[...new Set(data.legs.map(l => l.set_number))].map(setNum => (
            <div key={setNum} style={{ marginBottom: '16px' }}>

              {data.game.sets_per_match > 1 && (
                <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  SET {setNum}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.legs
                  .filter(l => l.set_number === setNum)
                  .map(leg => (
                    <div key={leg.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'Bebas Neue', fontSize: '16px', color: 'var(--muted)' }}>
                          Leg {leg.leg_number}
                        </span>
                        {(leg.winner_name || leg.winner_team_name) ? (
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                            🏆 {leg.winner_team_name || leg.winner_name}
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>In progress</span>
                        )}
                      </div>
                      {leg.finished_at && (
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {new Date(leg.finished_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="round-list"></div>

      <div className="round-list">
        {rounds.map(round => {
          const total = turnTotal(round.darts);
          const label = game.mode === 'teams' && round.team_name
            ? `${round.team_name} — ${round.player_name}`
            : round.player_name;

          return (
            <div key={round.id} className={`card round-card ${round.is_bust ? 'bust' : ''} ${round.is_winning ? 'winning' : ''}`}>
              <div className="round-header">
                <div className="round-left">
                  <span className="round-number">R{round.round_number}</span>
                  <span className="round-player">{label}</span>
                  {round.is_bust && <span className="badge bust">BUST</span>}
                  {round.is_winning && <span className="badge win">🏆 WIN</span>}
                </div>
                <div className="round-score">
                  <span className={`round-score-total ${round.is_bust ? 'bust' : ''}`}>
                    {round.is_bust ? 'BUST' : `−${total}`}
                  </span>
                  <span className="round-score-range">
                    {round.score_before} → {round.score_after}
                  </span>
                </div>
              </div>

              <div className="darts-row">
                {round.darts.map((dart, di) => (
                  <div key={di} className="dart-slot">
                    <div className="dart-slot-label">dart {dart.dart_number}</div>
                    <div className={dartValueClass(dart)}>{dartLabel(dart)}</div>
                    <div className="dart-slot-pts">{dart.score} pts</div>
                  </div>
                ))}
                {Array.from({ length: 3 - round.darts.length }).map((_, di) => (
                  <div key={`empty-${di}`} className="dart-slot empty">
                    <div className="dart-slot-label">dart {round.darts.length + di + 1}</div>
                    <div className="dart-slot-value single">—</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}