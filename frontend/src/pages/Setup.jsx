import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const RULESETS = [
  { value: 'double_out', label: 'Double Out', desc: 'Must finish on a double' },
  { value: 'straight_out', label: 'Straight Out', desc: 'Any dart to finish' },
  { value: 'triple_out', label: 'Triple Out', desc: 'Must finish on a triple' },
];

const COLORS = ['#e8593c', '#2dcb75', '#4a9eff', '#f0a050', '#b060e0', '#40c0b0'];

const PRESETS = [
  { label: 'Casual',   format: 'best_of',  legs: 1, sets: 1 },
  { label: 'Bo3 legs', format: 'best_of',  legs: 3, sets: 1 },
  { label: 'Bo5 legs', format: 'best_of',  legs: 5, sets: 1 },
  { label: '3 sets',   format: 'first_to', legs: 3, sets: 3 },
  { label: 'Custom',   format: null, legs: null, sets: null },
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

// Simple player row — no search, just name input + drag handle
function PlayerRow({ player, index, total, onUpdate, onRemove, onDragStart, onDragOver, onDrop, isDragging }) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDrop={() => onDrop(index)}
      style={{ display: 'flex', gap: '10px', alignItems: 'center', opacity: isDragging ? 0.4 : 1, transition: 'opacity 0.15s' }}
    >
      <div style={{ cursor: 'grab', color: 'var(--muted)', fontSize: '16px', flexShrink: 0, userSelect: 'none' }}>⠿</div>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: player.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
        {player.name ? player.name[0].toUpperCase() : (index + 1)}
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          placeholder={player.isOwner ? 'You' : `Player ${index + 1}`}
          value={player.name}
          readOnly={player.isOwner}
          onChange={e => onUpdate({ ...player, name: e.target.value })}
          style={{ width: '100%', background: player.isOwner ? 'var(--surface)' : undefined }}
        />
        {player.isOwner && (
          <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--accent)', fontWeight: 600 }}>you</div>
        )}
        {player.userId && !player.isOwner && (
          <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--green)', fontWeight: 600 }}>✓ registered</div>
        )}
      </div>
      {!player.isOwner && total > 1
        ? <button onClick={onRemove} style={{ background: 'none', color: 'var(--danger)', fontSize: '18px', flexShrink: 0, width: '32px' }}>×</button>
        : <div style={{ width: '32px', flexShrink: 0 }} />
      }
    </div>
  );
}

function RoomPanel({ room, onClose, players, setPlayers }) {
  const [liveRoom, setLiveRoom] = useState(room);
  const [qrUrl, setQrUrl] = useState('');
  const pollRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState('');

  const joinUrl = `${window.location.origin}/join/${room.code}`;

  useState(() => {
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=14141c&color=f0ede8&margin=10`);
    pollRef.current = setInterval(async () => {
      try { const updated = await api.getRoom(room.code); setLiveRoom(updated); } catch {}
    }, 3000);
    const tick = () => {
      const diff = new Date(room.expires_at) - new Date();
      if (diff <= 0) { setTimeLeft('Expired'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => { clearInterval(pollRef.current); clearInterval(t); };
  }, []);

  function addMember(member) {
    if (players.some(p => p.userId === member.id)) return;
    const emptyIdx = players.findIndex(p => !p.name.trim() && !p.isOwner);
    if (emptyIdx >= 0) {
      setPlayers(prev => prev.map((p, i) => i === emptyIdx
        ? { ...p, name: member.name, userId: member.id, color: member.avatar_color || COLORS[emptyIdx % COLORS.length] }
        : p
      ));
    } else if (players.length < 4) {
      setPlayers(prev => [...prev, { name: member.name, userId: member.id, color: member.avatar_color || COLORS[prev.length % COLORS.length], isOwner: false }]);
    }
  }

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--accent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '4px' }}>ROOM CODE</p>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '42px', color: 'var(--accent)', letterSpacing: '0.2em', lineHeight: 1 }}>{room.code}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '2px' }}>Expires in</p>
          <p style={{ color: timeLeft === 'Expired' ? 'var(--danger)' : 'var(--text)', fontSize: '18px', fontWeight: 600, fontFamily: 'Bebas Neue' }}>{timeLeft}</p>
        </div>
      </div>
      {qrUrl && (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img src={qrUrl} alt="Room QR" style={{ width: '160px', height: '160px', borderRadius: 'var(--radius-sm)' }} />
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '8px' }}>Friends scan this or type the code above</p>
        </div>
      )}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '10px' }}>
          IN ROOM ({liveRoom.members.length})
          {liveRoom.members.length === 1 && <span style={{ marginLeft: '8px' }}>· waiting for friends...</span>}
        </p>
        {liveRoom.members.map(m => {
          const alreadyAdded = players.some(p => p.userId === m.id);
          const isHost = m.id === room.host_id;
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: m.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {m.name[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text)', flex: 1 }}>{m.name}</span>
              {isHost && <span style={{ fontSize: '11px', color: 'var(--accent)' }}>host</span>}
              {!isHost && (alreadyAdded
                ? <span style={{ fontSize: '11px', color: 'var(--green)' }}>✓ added</span>
                : <button onClick={() => addMember(m)} style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)', borderRadius: '99px', padding: '3px 10px', cursor: 'pointer' }}>+ Add</button>
              )}
            </div>
          );
        })}
      </div>
      <button className="btn-ghost" onClick={onClose} style={{ fontSize: '13px' }}>Close room</button>
    </div>
  );
}

export default function Setup() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState('singles');
  const [ruleset, setRuleset] = useState('double_out');
  const [format, setFormat] = useState('best_of');
  const [legsPerSet, setLegsPerSet] = useState(1);
  const [setsPerMatch, setSetsPerMatch] = useState(1);
  const [activePreset, setActivePreset] = useState('Casual');
  const [room, setRoom] = useState(null);
  const [roomLoading, setRoomLoading] = useState(false);

  const [players, setPlayers] = useState([
    { name: user?.name || '', color: COLORS[0], userId: user?.id || null, isOwner: !!user },
    { name: '', color: COLORS[1], userId: null, isOwner: false },
  ]);
  const [teams, setTeams] = useState([
    { name: 'Team 1', players: [{ name: user?.name || '', color: COLORS[0], userId: user?.id || null }, { name: '', color: COLORS[1], userId: null }] },
    { name: 'Team 2', players: [{ name: '', color: COLORS[2], userId: null }, { name: '', color: COLORS[3], userId: null }] },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  function handleDragStart(i) { dragIndex.current = i; }
  function handleDragOver(i) { setDragOverIndex(i); }
  function handleDrop(dropIdx) {
    if (dragIndex.current === null || dragIndex.current === dropIdx) { dragIndex.current = null; setDragOverIndex(null); return; }
    setPlayers(prev => {
      const a = [...prev];
      const [moved] = a.splice(dragIndex.current, 1);
      a.splice(dropIdx, 0, moved);
      return a;
    });
    dragIndex.current = null; setDragOverIndex(null);
  }

  function applyPreset(p) {
    setActivePreset(p.label);
    if (p.format) setFormat(p.format);
    if (p.legs) setLegsPerSet(p.legs);
    if (p.sets) setSetsPerMatch(p.sets);
  }

  function matchSummary() {
    const ln = format === 'best_of' ? Math.ceil(legsPerSet / 2) : legsPerSet;
    const sn = format === 'best_of' ? Math.ceil(setsPerMatch / 2) : setsPerMatch;
    const fl = format === 'best_of' ? 'Best of' : 'First to';
    if (setsPerMatch === 1) return `${fl} ${legsPerSet} leg${legsPerSet > 1 ? 's' : ''} — first to ${ln} wins`;
    return `${fl} ${setsPerMatch} sets · ${fl} ${legsPerSet} legs per set — first to ${sn} sets wins`;
  }

  async function handleCreateRoom() {
    if (!user) { setError('You must be signed in to create a room'); return; }
    setRoomLoading(true);
    try { const r = await api.createRoom(); setRoom(r); }
    catch (err) { setError(err.message); }
    finally { setRoomLoading(false); }
  }

  async function handleCloseRoom() {
    if (room) { try { await api.closeRoom(room.code); } catch {} setRoom(null); }
  }

  async function resolvePlayerId(p) {
    if (p.userId) return p.userId;
    try {
      const r = await api.register({
        name: p.name.trim(),
        email: `guest_${Date.now()}_${Math.random()}@guest.local`,
        password: 'guest',
      });
      const guestId = r.user.id;
      // Store guest ID in localStorage so they can see their history later
      const stored = JSON.parse(localStorage.getItem('dm_guest_ids') || '[]');
      if (!stored.includes(guestId)) {
        stored.push(guestId);
        localStorage.setItem('dm_guest_ids', JSON.stringify(stored));
      }
      // Also store name→id mapping so returning guests are recognised
      const nameMap = JSON.parse(localStorage.getItem('dm_guest_map') || '{}');
      nameMap[p.name.trim().toLowerCase()] = guestId;
      localStorage.setItem('dm_guest_map', JSON.stringify(nameMap));
      return guestId;
    } catch { return null; }
  }

  async function handleStart() {
    setError(''); setLoading(true);
    try {
      if (mode === 'singles') {
        const fp = players.filter(p => p.name.trim());
        if (fp.length < 1) throw new Error('Add at least 1 player');
        const ids = await Promise.all(fp.map(resolvePlayerId));
        const valid = ids.filter(Boolean);
        if (!valid.length) throw new Error('Could not create player records');
        if (room) { try { await api.closeRoom(room.code); } catch {} }
        const game = await api.createGame({ mode: 'singles', ruleset, format, legsPerSet, setsPerMatch, players: valid });
        navigate(`/game/${game.id}`);
      } else {
        const ft = teams.filter(t => t.name.trim() && t.players.some(p => p.name.trim()));
        if (ft.length < 2) throw new Error('Add at least 2 teams');
        const teamData = await Promise.all(ft.map(async t => {
          const fp = t.players.filter(p => p.name.trim());
          if (fp.length !== 2) throw new Error(`Team "${t.name}" needs exactly 2 players`);
          const pIds = await Promise.all(fp.map(resolvePlayerId));
          return { name: t.name.trim(), players: pIds.filter(Boolean) };
        }));
        if (room) { try { await api.closeRoom(room.code); } catch {} }
        const game = await api.createGame({ mode: 'teams', ruleset, format, legsPerSet, setsPerMatch, teams: teamData });
        navigate(`/game/${game.id}`);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--muted)', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>← Back</button>
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
          {RULESETS.map(r => <button key={r.value} className={`tag ${ruleset === r.value ? 'active' : ''}`} onClick={() => setRuleset(r.value)}>{r.label}</button>)}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '8px' }}>{RULESETS.find(r => r.value === ruleset)?.desc}</p>
      </div>

      {/* Match format */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.1em', marginBottom: '10px' }}>MATCH FORMAT</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {PRESETS.map(p => <button key={p.label} className={`tag ${activePreset === p.label ? 'active' : ''}`} onClick={() => applyPreset(p)}>{p.label}</button>)}
        </div>
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>Format</p>
              <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{format === 'best_of' ? 'Win by majority (e.g. Bo3 = need 2)' : 'Win exact count (e.g. First to 3)'}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className={`tag ${format === 'best_of' ? 'active' : ''}`} onClick={() => { setFormat('best_of'); setActivePreset('Custom'); if (legsPerSet % 2 === 0) setLegsPerSet(legsPerSet + 1); if (setsPerMatch % 2 === 0) setSetsPerMatch(setsPerMatch + 1); }}>Best of</button>
              <button className={`tag ${format === 'first_to' ? 'active' : ''}`} onClick={() => { setFormat('first_to'); setActivePreset('Custom'); }}>First to</button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>Legs per set</p>
              <p style={{ fontSize: '11px', color: 'var(--muted)' }}>Need {format === 'best_of' ? Math.ceil(legsPerSet / 2) : legsPerSet} to win a set</p>
            </div>
            <Stepper value={legsPerSet} min={1} max={11} onChange={v => {
              if (format === 'best_of') { const up = v > legsPerSet; let val = v; if (val % 2 === 0) val = up ? val + 1 : val - 1; if (val < 1) val = 1; setLegsPerSet(val); }
              else setLegsPerSet(v);
              setActivePreset('Custom');
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>Sets per match</p>
              <p style={{ fontSize: '11px', color: 'var(--muted)' }}>Need {format === 'best_of' ? Math.ceil(setsPerMatch / 2) : setsPerMatch} to win the match</p>
            </div>
            <Stepper value={setsPerMatch} min={1} max={11} onChange={v => {
              if (format === 'best_of') { const up = v > setsPerMatch; let val = v; if (val % 2 === 0) val = up ? val + 1 : val - 1; if (val < 1) val = 1; setSetsPerMatch(val); }
              else setSetsPerMatch(v);
              setActivePreset('Custom');
            }} />
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
            <p style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>📋 {matchSummary()}</p>
          </div>
        </div>
      </div>

      {/* Players */}
      {mode === 'singles' && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <p style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '0.1em' }}>PLAYERS (max 4)</p>
            {user && !room && (
              <button onClick={handleCreateRoom} disabled={roomLoading} style={{ background: 'none', color: 'var(--accent)', fontSize: '12px', border: '1px solid var(--accent)', borderRadius: '99px', padding: '4px 12px', cursor: 'pointer' }}>
                {roomLoading ? '...' : '🔗 Create room'}
              </button>
            )}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '12px' }}>⠿ Drag to reorder · Player 1 throws first</p>
          {room && <RoomPanel room={room} onClose={handleCloseRoom} players={players} setPlayers={setPlayers} />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {players.map((p, i) => (
              <PlayerRow key={i} player={p} index={i} total={players.length}
                onUpdate={updated => setPlayers(prev => prev.map((pl, idx) => idx === i ? updated : pl))}
                onRemove={() => setPlayers(prev => prev.filter((_, idx) => idx !== i))}
                onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
                isDragging={dragOverIndex === i && dragIndex.current !== null && dragIndex.current !== i}
              />
            ))}
          </div>
          {players.length < 4 && (
            <button className="btn-ghost" style={{ marginTop: '12px' }} onClick={() => setPlayers(prev => [...prev, { name: '', color: COLORS[prev.length % COLORS.length], userId: null, isOwner: false }])}>
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
                  {teams.length > 2 && <button onClick={() => setTeams(prev => prev.filter((_, idx) => idx !== ti))} style={{ background: 'none', color: 'var(--danger)', fontSize: '18px', flexShrink: 0 }}>×</button>}
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
            <button className="btn-ghost" style={{ marginTop: '12px' }} onClick={() => setTeams(prev => [...prev, { name: `Team ${prev.length + 1}`, players: [{ name: '', color: COLORS[prev.length * 2 % COLORS.length], userId: null }, { name: '', color: COLORS[(prev.length * 2 + 1) % COLORS.length], userId: null }] }])}>
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
