import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const RULESETS = [
  { value: 'double_out', label: 'Double Out', desc: 'Must finish on a double' },
  { value: 'straight_out', label: 'Straight Out', desc: 'Any dart to finish' },
  { value: 'triple_out', label: 'Triple Out', desc: 'Must finish on a triple' },
];

const COLORS = ['#e8593c', '#2dcb75', '#4a9eff', '#f0a050', '#b060e0', '#40c0b0'];

const PRESETS = [
  { label: 'Casual', desc: '1 leg', format: 'best_of', legs: 1, sets: 1 },
  { label: 'Bo3 legs', desc: 'Best of 3', format: 'best_of', legs: 3, sets: 1 },
  { label: 'Bo5 legs', desc: 'Best of 5', format: 'best_of', legs: 5, sets: 1 },
  { label: '3 sets', desc: 'First to 3 sets · 3 legs each', format: 'first_to', legs: 3, sets: 3 },
  { label: 'Custom', desc: 'Set your own format', format: null, legs: null, sets: null },
];

function Stepper({ value, onChange, min = 1, max = 20 }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

export default function Setup() {
  const navigate = useNavigate();

  const [mode, setMode] = useState('singles');
  const [ruleset, setRuleset] = useState('double_out');
  const [format, setFormat] = useState('best_of');
  const [legsPerSet, setLegsPerSet] = useState(1);
  const [setsPerMatch, setSetsPerMatch] = useState(1);
  const [activePreset, setActivePreset] = useState('Casual');

  const [players, setPlayers] = useState([
    { name: '', color: COLORS[0] },
    { name: '', color: COLORS[1] },
  ]);
  const [teams, setTeams] = useState([
    { name: 'Team 1', players: [{ name: '', color: COLORS[0] }, { name: '', color: COLORS[1] }] },
    { name: 'Team 2', players: [{ name: '', color: COLORS[2] }, { name: '', color: COLORS[3] }] },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function applyPreset(preset) {
    setActivePreset(preset.label);
    if (preset.format) setFormat(preset.format);
    if (preset.legs) setLegsPerSet(preset.legs);
    if (preset.sets) setSetsPerMatch(preset.sets);
  }

  function matchSummary() {
    const legsNeeded = format === 'best_of' ? Math.ceil(legsPerSet / 2) : legsPerSet;
    const setsNeeded = format === 'best_of' ? Math.ceil(setsPerMatch / 2) : setsPerMatch;
    const formatLabel = format === 'best_of' ? 'Best of' : 'First to';

    if (setsPerMatch === 1) {
      return `${formatLabel} ${legsPerSet} leg${legsPerSet > 1 ? 's' : ''} — first to ${legsNeeded} wins`;
    }
    return `${formatLabel} ${setsPerMatch} sets · ${formatLabel} ${legsPerSet} legs per set — first to ${setsNeeded} sets wins`;
  }

  async function handleStart() {
    setError('');
    setLoading(true);
    try {
      if (mode === 'singles') {
        const filledPlayers = players.filter(p => p.name.trim());
        if (filledPlayers.length < 1) throw new Error('Add at least 1 player');

        const playerIds = await Promise.all(
          filledPlayers.map(p =>
            api.register({ name: p.name.trim(), email: `guest_${Date.now()}_${Math.random()}@guest.local`, password: 'guest' })
              .then(r => r.user.id).catch(() => null)
          )
        );
        const validIds = playerIds.filter(Boolean);
        if (!validIds.length) throw new Error('Could not create player records');

        const game = await api.createGame({ mode: 'singles', ruleset, format, legsPerSet, setsPerMatch, players: validIds });
        navigate(`/game/${game.id}`);
      } else {
        const filledTeams = teams.filter(t => t.name.trim() && t.players.some(p => p.name.trim()));
        if (filledTeams.length < 2) throw new Error('Add at least 2 teams');

        const teamData = await Promise.all(filledTeams.map(async t => {
          const fp = t.players.filter(p => p.name.trim());
          if (fp.length !== 2) throw new Error(`Team "${t.name}" needs exactly 2 players`);
          const pIds = await Promise.all(
            fp.map(p => api.register({ name: p.name.trim(), email: `guest_${Date.now()}_${Math.random()}@guest.local`, password: 'guest' }).then(r => r.user.id))
          );
          return { name: t.name.trim(), players: pIds };
        }));

        const game = await api.createGame({ mode: 'teams', ruleset, format, legsPerSet, setsPerMatch, teams: teamData });
        navigate(`/game/${game.id}`);
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

      {/* Match format */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '10px' }}>MATCH FORMAT</p>

        {/* Presets */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {PRESETS.map(p => (
            <button key={p.label} className={`tag ${activePreset === p.label ? 'active' : ''}`} onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom controls — always visible, updates presets */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Format */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>Format</p>
              <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {format === 'best_of' ? 'Win by majority (e.g. Bo3 = need 2)' : 'Win exact count (e.g. First to 3)'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className={`tag ${format === 'best_of' ? 'active' : ''}`} onClick={() => { setFormat('best_of'); setActivePreset('Custom'); }}>Best of</button>
              <button className={`tag ${format === 'first_to' ? 'active' : ''}`} onClick={() => { setFormat('first_to'); setActivePreset('Custom'); }}>First to</button>
            </div>
          </div>

          {/* Legs per set */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>Legs per set</p>
              <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Need {format === 'best_of' ? Math.ceil(legsPerSet / 2) : legsPerSet} to win a set
              </p>
            </div>
            <Stepper value={legsPerSet} onChange={v => { setLegsPerSet(v); setActivePreset('Custom'); }} min={1} max={11} />
          </div>

          {/* Sets per match */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>Sets per match</p>
              <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Need {format === 'best_of' ? Math.ceil(setsPerMatch / 2) : setsPerMatch} to win the match
              </p>
            </div>
            <Stepper value={setsPerMatch} onChange={v => { setSetsPerMatch(v); setActivePreset('Custom'); }} min={1} max={11} />
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
            <p style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>📋 {matchSummary()}</p>
          </div>
        </div>
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
