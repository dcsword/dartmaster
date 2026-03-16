import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';

const MULTIPLIERS = [
  { value: 1, label: 'Single', short: 'S' },
  { value: 2, label: 'Double', short: 'D' },
  { value: 3, label: 'Triple', short: 'T' },
];

export default function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const meta = location.state || {};

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Current turn state
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [currentPlayerInTeam, setCurrentPlayerInTeam] = useState(0);
  const [darts, setDarts] = useState([]); // array of { display, value, score }
  const [multiplier, setMultiplier] = useState(1);
  const [inputVal, setInputVal] = useState('');
  const [checkout, setCheckout] = useState(null);
  const [lastTurn, setLastTurn] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getGame(id).then(g => { setGame(g); setLoading(false); }).catch(() => setError('Game not found'));
  }, [id]);

  // Get checkout suggestion when score changes
  useEffect(() => {
    if (!game) return;
    const score = currentScore();
    if (score <= 170 && score > 1) {
      api.getCheckout(id, score, game.ruleset).then(r => setCheckout(r.suggestion)).catch(() => {});
    } else {
      setCheckout(null);
    }
  }, [game, currentPlayerIdx, currentTeamIdx, darts]);

  function currentScore() {
    if (!game) return 501;
    if (game.mode === 'singles') {
      const p = game.players?.[currentPlayerIdx];
      const base = p?.score ?? 501;
      const spent = darts.reduce((s, d) => s + d.score, 0);
      return base - spent;
    } else {
      const t = game.teams?.[currentTeamIdx];
      const base = t?.score ?? 501;
      const spent = darts.reduce((s, d) => s + d.score, 0);
      return base - spent;
    }
  }

  function getCurrentPlayer() {
    if (!game) return null;
    if (game.mode === 'singles') return game.players?.[currentPlayerIdx];
    const team = game.teams?.[currentTeamIdx];
    return team?.players?.[currentPlayerInTeam];
  }

  function getCurrentTeam() {
    if (!game || game.mode !== 'teams') return null;
    return game.teams?.[currentTeamIdx];
  }

  function addDart(scoreVal, mult, isBull = false) {
    if (darts.length >= 3) return;
    const score = isBull ? (mult === 2 ? 50 : 25) : scoreVal * mult;
    const remaining = currentScore();

    if (score > remaining) {
      setError(`Score ${score} exceeds remaining ${remaining}`);
      setTimeout(() => setError(''), 2000);
      return;
    }

    let display;
    if (isBull) display = mult === 2 ? 'Bull' : '25';
    else if (mult === 1) display = `${scoreVal}`;
    else if (mult === 2) display = `D${scoreVal}`;
    else display = `T${scoreVal}`;

    setDarts(prev => [...prev, { display, value: display, score }]);
    setInputVal('');
    setError('');
  }

  function handleBull() { addDart(25, multiplier === 2 ? 2 : 1, true); }
  function handleMiss() { addDart(0, 1); }

  function handleNumpad(n) {
    const next = inputVal + n;
    const num = parseInt(next);
    if (num > 20) return;
    setInputVal(next);
    if (next.length === 2 || num === 20 || num === 0) {
      addDart(num, multiplier);
      setInputVal('');
    }
  }

  function handleSingleDigit() {
    if (!inputVal) return;
    addDart(parseInt(inputVal), multiplier);
    setInputVal('');
  }

  function undoDart() {
    setDarts(prev => prev.slice(0, -1));
    setInputVal('');
  }

  async function submitTurn(dartOverride) {
    const dartsToSubmit = dartOverride || darts;
    if (dartsToSubmit.length === 0) return;
    setSubmitting(true);
    setError('');

    try {
      const player = getCurrentPlayer();
      const team = getCurrentTeam();
      const body = {
        darts: dartsToSubmit.map(d => d.value),
        playerId: player?.id,
        teamId: team?.id,
      };

      const result = await api.submitTurn(id, body);
      setLastTurn(result);

      if (result.gameStatus === 'finished') {
        navigate(`/win/${id}`, { state: { winnerName: player?.name, teamName: team?.name, result } });
        return;
      }

      // Refresh game state
      const updated = await api.getGame(id);
      setGame(updated);
      setDarts([]);
      setInputVal('');
      setMultiplier(1);

      // Advance turn
      if (game.mode === 'singles') {
        setCurrentPlayerIdx(prev => (prev + 1) % game.players.length);
      } else {
        const team = game.teams[currentTeamIdx];
        const nextInTeam = (currentPlayerInTeam + 1) % team.players.length;
        if (nextInTeam === 0) {
          setCurrentTeamIdx(prev => (prev + 1) % game.teams.length);
        }
        setCurrentPlayerInTeam(nextInTeam);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBust() {
    // Submit 0-scoring turn
    setSubmitting(true);
    try {
      const player = getCurrentPlayer();
      const team = getCurrentTeam();
      await api.submitTurn(id, { darts: darts.length > 0 ? darts.map(d => d.value) : ['0'], playerId: player?.id, teamId: team?.id });
      const updated = await api.getGame(id);
      setGame(updated);
      setDarts([]);
      setInputVal('');
      if (game.mode === 'singles') {
        setCurrentPlayerIdx(prev => (prev + 1) % game.players.length);
      } else {
        const team = game.teams[currentTeamIdx];
        const nextInTeam = (currentPlayerInTeam + 1) % team.players.length;
        if (nextInTeam === 0) setCurrentTeamIdx(prev => (prev + 1) % game.teams.length);
        setCurrentPlayerInTeam(nextInTeam);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>Loading game...</div>;
  if (!game) return <div style={{ padding: '24px', color: 'var(--danger)' }}>{error || 'Game not found'}</div>;

  const remaining = currentScore();
  const player = getCurrentPlayer();
  const team = getCurrentTeam();

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--accent)' }}>501</h1>
        <span style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.08em' }}>
          {game.ruleset.replace('_', ' ').toUpperCase()}
        </span>
        <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--muted)', fontSize: '12px' }}>✕ Quit</button>
      </div>

      {/* Scoreboard */}
      <div className="card" style={{ padding: '12px' }}>
        {game.mode === 'singles' ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${game.players.length}, 1fr)`, gap: '8px' }}>
            {game.players.map((p, i) => {
              const active = i === currentPlayerIdx;
              return (
                <div key={p.id} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 'var(--radius-sm)', background: active ? 'var(--surface)' : 'transparent', border: active ? '1px solid var(--accent)' : '1px solid transparent', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '11px', color: active ? 'var(--accent)' : 'var(--muted)', marginBottom: '4px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {active ? '▶ ' : ''}{p.name}
                  </div>
                  <div style={{ fontSize: '32px', fontFamily: 'Bebas Neue', color: active ? 'var(--text)' : 'var(--muted)', lineHeight: 1 }}>
                    {i === currentPlayerIdx ? remaining : p.score}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${game.teams.length}, 1fr)`, gap: '8px' }}>
            {game.teams.map((t, ti) => {
              const active = ti === currentTeamIdx;
              return (
                <div key={t.id} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 'var(--radius-sm)', background: active ? 'var(--surface)' : 'transparent', border: active ? '1px solid var(--accent)' : '1px solid transparent' }}>
                  <div style={{ fontSize: '11px', color: active ? 'var(--accent)' : 'var(--muted)', marginBottom: '2px', fontWeight: 500 }}>{t.name}</div>
                  <div style={{ fontSize: '28px', fontFamily: 'Bebas Neue', lineHeight: 1, color: active ? 'var(--text)' : 'var(--muted)' }}>{ti === currentTeamIdx ? remaining : t.score}</div>
                  {active && <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{player?.name}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current turn */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {team ? `${team.name} · ` : ''}{player?.name} — dart {darts.length + 1} of 3
          </span>
          <span style={{ fontFamily: 'Bebas Neue', fontSize: '20px', color: remaining <= 170 ? 'var(--accent2)' : 'var(--text)' }}>
            {remaining}
          </span>
        </div>

        {/* Dart slots */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, padding: '10px 6px', borderRadius: 'var(--radius-sm)', background: darts[i] ? 'var(--surface)' : 'var(--bg3)', border: `1px solid ${darts[i] ? 'var(--accent)' : 'var(--border)'}`, textAlign: 'center', fontSize: '15px', fontWeight: 600, color: darts[i] ? 'var(--text)' : 'var(--muted)', transition: 'all 0.15s' }}>
              {darts[i] ? darts[i].display : '—'}
            </div>
          ))}
        </div>

        {/* Checkout suggestion */}
        {checkout && darts.length === 0 && (
          <div style={{ background: 'rgba(232,89,60,0.1)', border: '1px solid rgba(232,89,60,0.3)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: '12px', fontSize: '13px' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>🎯 Checkout: </span>
            <span style={{ color: 'var(--text)' }}>{checkout.join(' → ')}</span>
          </div>
        )}

        {/* Multiplier selector */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {MULTIPLIERS.map(m => (
            <button key={m.value} onClick={() => setMultiplier(m.value)} style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', background: multiplier === m.value ? 'var(--accent)' : 'var(--bg3)', border: `1px solid ${multiplier === m.value ? 'var(--accent)' : 'var(--border)'}`, color: multiplier === m.value ? '#fff' : 'var(--muted)', fontSize: '13px', fontWeight: 600 }}>
              {m.short}
            </button>
          ))}
        </div>

        {/* Input preview */}
        {inputVal && (
          <div style={{ textAlign: 'center', fontSize: '28px', fontFamily: 'Bebas Neue', color: 'var(--accent)', marginBottom: '8px' }}>
            {multiplier > 1 ? MULTIPLIERS.find(m => m.value === multiplier).short : ''}{inputVal}
          </div>
        )}

        {/* Number pad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
          {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(n => (
            <button key={n} onClick={() => addDart(n, multiplier)} disabled={darts.length >= 3 || n * multiplier > remaining} style={{ padding: '10px 4px', borderRadius: 'var(--radius-sm)', background: 'var(--bg3)', border: '1px solid var(--border)', color: n * multiplier > remaining ? 'var(--border)' : 'var(--text)', fontSize: '14px', fontWeight: 500, transition: 'all 0.1s' }}
              onMouseEnter={e => { if (n * multiplier <= remaining) e.target.style.background = 'var(--surface)'; }}
              onMouseLeave={e => e.target.style.background = 'var(--bg3)'}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Special buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
          <button onClick={handleMiss} disabled={darts.length >= 3} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: '13px' }}>
            Miss
          </button>
          <button onClick={handleBull} disabled={darts.length >= 3 || (multiplier === 2 ? 50 : 25) > remaining} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}>
            {multiplier === 2 ? 'Bull (50)' : 'Bull (25)'}
          </button>
          <button onClick={undoDart} disabled={darts.length === 0} style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: '13px' }}>
            ↩ Undo
          </button>
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '8px', textAlign: 'center' }}>{error}</p>}

        {/* Submit / Bust */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button onClick={handleBust} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(224,64,64,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '14px', fontWeight: 600 }}>
            BUST
          </button>
          <button onClick={() => submitTurn()} disabled={darts.length === 0 || submitting} style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: darts.length > 0 ? 'var(--accent)' : 'var(--bg3)', border: 'none', color: darts.length > 0 ? '#fff' : 'var(--muted)', fontSize: '14px', fontWeight: 600 }}>
            {submitting ? '...' : darts.length === 3 ? 'NEXT PLAYER →' : `DONE (${darts.length}/3)`}
          </button>
        </div>
      </div>

      {/* Last turn result */}
      {lastTurn && (
        <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '8px' }}>
          {lastTurn.turnResult?.isBust ? (
            <span style={{ color: 'var(--danger)' }}>💥 BUST — score reset</span>
          ) : (
            <span>Last turn: {lastTurn.turnResult?.parsedDarts?.map(d => d.score).join(' + ')} = {lastTurn.turnResult?.parsedDarts?.reduce((s, d) => s + d.score, 0)}</span>
          )}
        </div>
      )}
    </div>
  );
}
