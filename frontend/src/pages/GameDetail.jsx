import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import Layout from '../components/Layout';

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGameDetail(id).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!data) return <div className="page-error">Game not found</div>;

  const { game, rounds, legs } = data;

  function dartValue(d) {
    if (d.is_bull) return d.score === 50 ? 'Bull' : '25';
    if (d.multiplier === 2) return `D${d.score / 2}`;
    if (d.multiplier === 3) return `T${Math.round(d.score / 3)}`;
    return `${d.score}`;
  }

  function dartClass(d) {
    if (d.is_bull) return 'bull';
    if (d.multiplier === 2) return 'double';
    if (d.multiplier === 3) return 'triple';
    return 'single';
  }

  return (
    <Layout>
      <div className="page">
        <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '40px', fontWeight: 800, color: 'var(--text)' }}>GAME DETAIL</h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
            {game.mode} · {game.ruleset.replace(/_/g, ' ')} · {new Date(game.started_at).toLocaleDateString('en-GB')}
          </p>
        </div>

        {legs && legs.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div className="label-xs" style={{ marginBottom: '12px' }}>Legs</div>
            {[...new Set(legs.map(l => l.set_number))].map(setNum => (
              <div key={setNum} style={{ marginBottom: '14px' }}>
                {game.sets_per_match > 1 && <div className="label-xs" style={{ marginBottom: '6px', color: 'var(--accent)' }}>Set {setNum}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {legs.filter(l => l.set_number === setNum).map(leg => (
                    <div key={leg.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'Barlow Condensed', fontSize: '15px', color: 'var(--muted)', fontWeight: 600 }}>Leg {leg.leg_number}</span>
                        {(leg.winner_name || leg.winner_team_name) && <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>🏆 {leg.winner_team_name || leg.winner_name}</span>}
                        {!leg.finished_at && <span style={{ fontSize: '12px', color: 'var(--muted)' }}>In progress</span>}
                      </div>
                      {leg.finished_at && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(leg.finished_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="label-xs" style={{ marginBottom: '12px' }}>All rounds</div>
        <div className="round-list">
          {rounds.map(r => (
            <div key={r.id} className={`card round-card ${r.is_bust ? 'bust' : ''} ${r.is_winning ? 'winning' : ''}`}>
              <div className="round-header">
                <div className="round-left">
                  <span className="round-number">R{r.round_number}</span>
                  <span className="round-player">{r.player_name || r.team_name}</span>
                  {r.is_bust && <span className="badge bust">Bust</span>}
                  {r.is_winning && <span className="badge win">Win!</span>}
                </div>
                <div className="round-score">
                  <span className="round-score-total" style={r.is_bust ? { color: 'var(--danger)' } : {}}>
                    {r.is_bust ? 0 : r.score_before - r.score_after}
                  </span>
                  <span className="round-score-range">{r.score_before} → {r.score_after}</span>
                </div>
              </div>
              <div className="darts-row">
                {(r.darts || []).map((d, i) => (
                  <div key={i} className="dart-slot filled">
                    <div className="dart-slot-label">D{d.dart_number}</div>
                    <div className={`dart-slot-value ${dartClass(d)}`}>{dartValue(d)}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{d.score}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
