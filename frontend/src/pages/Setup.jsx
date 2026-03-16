import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const RULESETS = [
  { value: 'double_out', label: 'Double Out', desc: 'Must finish on a double' },
  { value: 'straight_out', label: 'Straight Out', desc: 'Any dart to finish' },
  { value: 'triple_out', label: 'Triple Out', desc: 'Must finish on a triple' },
];

const COLORS = ['#e8593c', '#2dcb75', '#4a9eff', '#f0a050', '#b060e0', '#e0406080', '#40c0b0', '#e0b040'];

export default function Setup() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('singles');
  const [ruleset, setRuleset] = useState('double_out');
  const [players, setPlayers] = useState([{ name: '', color: COLORS[0] }, { name: '', color: COLORS[1] }]);
  const [teams, setTeams] = useState([
    { name: 'Team 1', players: [{ name: '', color: COLORS[0] }, { name: '', color: COLORS[1] }] },
    { name: 'Team 2', players: [{ name: '', color: COLORS[2] }, { name: '', color: COLORS[3] }] },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart() {
    setError('');
    setLoading(true);
    try {
      // For demo: create guest users on-the-fly (no account required)
      // In production, players would be looked up by account
      if (mode === 'singles') {
        const filledPlayers = players.filter(p => p.name.trim());
        if (filledPlayers.length < 1) throw new Error('Add at least 1 player');

        // Create guest player records and start game
        const playerIds = await Promise.all(
          filledPlayers.map(p => api.register({ name: p.name.trim(), email: `guest_${Date.now()}_${Math.random()}@guest.local`, password: 'guest' }).then(r => r.user.id).catch(() => null))
        );

        const validIds = playerIds.filter(Boolean);
        if (!validIds.length) throw new Error('Could not create player records');

        const game = await api.createGame({ mode: 'singles', ruleset, players: validIds });
        navigate(`/game/${game.id}`, { state: { playerNames: filledPlayers.map(p => p.name), playerColors: filledPlayers.map(p => p.color) } });
      } else {
        const filledTeams = teams.filter(t => t.name.trim() && t.players.some(p => p.name.trim()));
        if (filledTeams.length < 2) throw new Error('Add at least 2 teams');

        const teamData = await Promise.all(filledTeams.map(async t => {
          const filledPlayers = t.players.filter(p => p.name.trim());
          if (filledPlayers.length !== 2) throw new Error(`Team "${t.name}" needs exactly 2 players`);
          const pIds = await Promise.all(
            filledPlayers.map(p => api.register({ name: p.name.trim(), email: `guest_${Date.now()}_${Math.random()}@guest.local`, password: 'guest' }).then(r => r.user.id))
          );
          return { name: t.name.trim(), players: pIds };
        }));

        const game = await api.createGame({ mode: 'teams', ruleset, teams: teamData });
        navigate(`/game/${game.id}`, { state: { teamNames: filledTeams.map(t => t.name) } });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--muted)', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        ← Back
      </button>

      <h1 style={{ fontSize: '42px', color: 'var(--accent)', marginBottom: '24px' }}>NEW GAME</h1>

      {/* Mode */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '10px' }}>GAME MODE</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['singles', 'teams'].map(m => (
            <button key={m} className={`tag ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)} style={{ flex: 1, justifyContent: 'center', padding: '10px' }}>
              {m === 'singles' ? '👤 Singles' : '👥 Teams'}
            </button>
          ))}
        </div>
      </div>

      {/* Ruleset */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '10px' }}>FINISH RULE</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {RULESETS.map(r => (
            <button key={r.value} className={`tag ${ruleset === r.value ? 'active' : ''}`} onClick={() => setRuleset(r.value)}>
              {r.label}
            </button>
          ))}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '8px' }}>
          {RULESETS.find(r => r.value === ruleset)?.desc}
        </p>
      </div>

      {/* Players (singles) */}
      {mode === 'singles' && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '10px' }}>PLAYERS (max 4)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {players.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: p.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                  {p.name ? p.name[0].toUpperCase() : (i + 1)}
                </div>
                <input placeholder={`Player ${i + 1}`} value={p.name} onChange={e => setPlayers(prev => prev.map((pl, idx) => idx === i ? { ...pl, name: e.target.value } : pl))} />
                {players.length > 1 && (
                  <button onClick={() => setPlayers(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', color: 'var(--danger)', fontSize: '18px', flexShrink: 0, width: '32px' }}>×</button>
                )}
              </div>
            ))}
          </div>
          {players.length < 4 && (
            <button className="btn-ghost" style={{ marginTop: '12px' }} onClick={() => setPlayers(prev => [...prev, { name: '', color: COLORS[prev.length % COLORS.length] }])}>
              + Add Player
            </button>
          )}
        </div>
      )}

      {/* Teams */}
      {mode === 'teams' && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '10px' }}>TEAMS (max 4)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {teams.map((t, ti) => (
              <div key={ti} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <input placeholder={`Team ${ti + 1} name`} value={t.name} onChange={e => setTeams(prev => prev.map((tm, idx) => idx === ti ? { ...tm, name: e.target.value } : tm))} style={{ fontWeight: 600 }} />
                  {teams.length > 2 && (
                    <button onClick={() => setTeams(prev => prev.filter((_, idx) => idx !== ti))} style={{ background: 'none', color: 'var(--danger)', fontSize: '18px', flexShrink: 0 }}>×</button>
                  )}
                </div>
                {t.players.map((p, pi) => (
                  <input key={pi} placeholder={`Player ${pi + 1}`} value={p.name} style={{ marginBottom: '8px' }}
                    onChange={e => setTeams(prev => prev.map((tm, tIdx) => tIdx !== ti ? tm : { ...tm, players: tm.players.map((pl, pIdx) => pIdx === pi ? { ...pl, name: e.target.value } : pl) }))}
                  />
                ))}
              </div>
            ))}
          </div>
          {teams.length < 4 && (
            <button className="btn-ghost" style={{ marginTop: '12px' }} onClick={() => setTeams(prev => [...prev, { name: `Team ${prev.length + 1}`, players: [{ name: '', color: COLORS[prev.length * 2 % COLORS.length] }, { name: '', color: COLORS[(prev.length * 2 + 1) % COLORS.length] }] }])}>
              + Add Team
            </button>
          )}
        </div>
      )}

      {error && <p style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '14px' }}>{error}</p>}

      <button className="btn-primary" onClick={handleStart} disabled={loading} style={{ fontSize: '18px', padding: '16px', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
        {loading ? 'STARTING...' : 'START GAME 🎯'}
      </button>
    </div>
  );
}
