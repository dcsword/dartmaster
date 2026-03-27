import { useState, useRef, useCallback, useEffect } from 'react';
import QRCode from 'qrcode';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../utils/api';
import { GameAccess } from '../utils/gameAccess';
import { GuestSessionStore } from '../utils/guestSessions';
import { useAuth } from '../context/AuthContext';

const RULESETS = [
  { value: 'double_out', label: 'Double Out', desc: 'Must finish on a double' },
  { value: 'straight_out', label: 'Straight Out', desc: 'Any dart to finish' },
  { value: 'triple_out', label: 'Triple Out', desc: 'Must finish on a triple' },
];

const COLORS = ['#e8593c', '#2dcb75', '#4a9eff', '#f0a050', '#b060e0', '#40c0b0'];

const PRESETS = [
  { label: 'Casual',   format: 'first_to', legs: 1, sets: 1 },
  { label: 'FT3 legs', format: 'first_to', legs: 3, sets: 1 },
  { label: 'FT5 legs', format: 'first_to', legs: 5, sets: 1 },
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

// ── Drag handle — mouse + touch with ghost preview ───────────────────────────
// Touch drag creates a floating ghost that follows the finger,
// dims the source row, and highlights the target — matching iOS list behaviour.
function DragHandle({ index, listRef, onDragStart, onDragOver, onDrop }) {
  const ghostRef = useRef(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const rowHeight = useRef(0);

  function createGhost(e) {
    if (!listRef?.current) return;
    const rows = listRef.current.querySelectorAll('[data-row-index]');
    const sourceRow = rows[index];
    if (!sourceRow) return;

    const rect = sourceRow.getBoundingClientRect();
    rowHeight.current = rect.height;
    startY.current = e.touches[0].clientY;

    // Clone the row as ghost
    const ghost = sourceRow.cloneNode(true);
    ghost.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      z-index: 9999;
      pointer-events: none;
      opacity: 0.9;
      background: var(--bg2);
      border: 1px solid var(--accent);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      transition: none;
    `;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    // Dim the source
    sourceRow.style.opacity = '0.3';
  }

  function moveGhost(e) {
    if (!ghostRef.current || !listRef?.current) return;
    const touch = e.touches[0];
    const dy = touch.clientY - startY.current;

    // Move ghost
    const ghost = ghostRef.current;
    const currentTop = parseFloat(ghost.style.top);
    ghost.style.top = `${currentTop + dy}px`;
    startY.current = touch.clientY;

    // Find target row
    const rows = listRef.current.querySelectorAll('[data-row-index]');
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        const targetIdx = parseInt(row.dataset.rowIndex);
        onDragOver(targetIdx);
        // Visual indicator on target
        rows.forEach(r => r.style.borderTop = '');
        if (targetIdx !== index) {
          row.style.borderTop = touch.clientY < mid
            ? '2px solid var(--accent)'
            : '';
          row.style.borderBottom = touch.clientY >= mid
            ? '2px solid var(--accent)'
            : '';
        }
        break;
      }
    }
  }

  function removeGhost() {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
    // Restore all rows
    if (listRef?.current) {
      const rows = listRef.current.querySelectorAll('[data-row-index]');
      rows.forEach(r => {
        r.style.opacity = '';
        r.style.borderTop = '';
        r.style.borderBottom = '';
      });
    }
  }

  function handleTouchStart(e) {
    e.preventDefault();
    isDragging.current = true;
    onDragStart(index);
    createGhost(e);
  }

  function handleTouchMove(e) {
    if (!isDragging.current) return;
    e.preventDefault();
    moveGhost(e);
  }

  function handleTouchEnd() {
    isDragging.current = false;
    removeGhost();
    onDrop();
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: 'grab',
        color: 'var(--muted)',
        fontSize: '20px',
        flexShrink: 0,
        userSelect: 'none',
        padding: '8px 4px',
        touchAction: 'none',
      }}
    >
      ⠿
    </div>
  );
}

// ── Player row (singles) ──────────────────────────────────────────────────────
function PlayerRow({ player, index, total, listRef, onUpdate, onRemove, onDragStart, onDragOver, onDrop, isDragging }) {
  return (
    <div
      data-row-index={index}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDrop={() => onDrop()}
      style={{
        display: 'flex', gap: '10px', alignItems: 'center',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.15s',
        background: isDragging ? 'var(--bg2)' : 'transparent',
        borderRadius: 'var(--radius-xs)',
      }}
    >
      <DragHandle index={index} listRef={listRef} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} />
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
          <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--green)', fontWeight: 600 }}>✓</div>
        )}
      </div>
      {!player.isOwner && total > 1
        ? <button onClick={onRemove} style={{ background: 'none', color: 'var(--danger)', fontSize: '18px', flexShrink: 0, width: '32px' }}>×</button>
        : <div style={{ width: '32px', flexShrink: 0 }} />
      }
    </div>
  );
}

// ── Team card with inner player drag ─────────────────────────────────────────
function TeamCard({
  team, teamIndex, totalTeams, teamListRef,
  onTeamUpdate, onTeamRemove,
  onTeamDragStart, onTeamDragOver, onTeamDrop,
  isTeamDragging,
}) {
  const playerListRef = useRef(null);
  const playerDragIdx = useRef(null);
  const [playerDragOver, setPlayerDragOver] = useState(null);

  function handlePlayerDragStart(i) { playerDragIdx.current = i; }
  function handlePlayerDragOver(i) { setPlayerDragOver(i); }
  function handlePlayerDrop() {
    const from = playerDragIdx.current;
    const to = playerDragOver;
    if (from === null || to === null || from === to) {
      playerDragIdx.current = null; setPlayerDragOver(null); return;
    }
    const updated = [...team.players];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onTeamUpdate({ ...team, players: updated });
    playerDragIdx.current = null; setPlayerDragOver(null);
  }

  return (
    <div
      data-row-index={teamIndex}
      draggable
      onDragStart={() => onTeamDragStart(teamIndex)}
      onDragOver={e => { e.preventDefault(); onTeamDragOver(teamIndex); }}
      onDrop={() => onTeamDrop()}
      className="card"
      style={{ padding: '16px', opacity: isTeamDragging ? 0.4 : 1, transition: 'opacity 0.15s' }}
    >
      {/* Team header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <DragHandle
          index={teamIndex}
          listRef={teamListRef}
          onDragStart={onTeamDragStart}
          onDragOver={onTeamDragOver}
          onDrop={onTeamDrop}
        />
        <input
          placeholder={`Team ${teamIndex + 1} name`}
          value={team.name}
          onChange={e => onTeamUpdate({ ...team, name: e.target.value })}
          style={{ fontWeight: 600, flex: 1 }}
        />
        {totalTeams > 2 && (
          <button onClick={onTeamRemove} style={{ background: 'none', color: 'var(--danger)', fontSize: '18px', flexShrink: 0 }}>×</button>
        )}
      </div>

      {/* Players within team — also draggable */}
      <div style={{ marginBottom: '6px' }}>
        <p style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '8px' }}>
          PLAYERS · ⠿ drag to reorder
        </p>
        <div ref={playerListRef} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {team.players.map((p, pi) => (
            <div
              key={pi}
              data-row-index={pi}
              draggable
              onDragStart={() => handlePlayerDragStart(pi)}
              onDragOver={e => { e.preventDefault(); handlePlayerDragOver(pi); }}
              onDrop={() => handlePlayerDrop()}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                opacity: playerDragOver === pi && playerDragIdx.current !== null && playerDragIdx.current !== pi ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <DragHandle
                index={pi}
                listRef={playerListRef}
                onDragStart={handlePlayerDragStart}
                onDragOver={handlePlayerDragOver}
                onDrop={handlePlayerDrop}
              />
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: p.color || COLORS[pi % COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {p.name ? p.name[0].toUpperCase() : (pi + 1)}
              </div>
              <input
                placeholder={`Player ${pi + 1}`}
                value={p.name}
                style={{ flex: 1 }}
                onChange={e => {
                  const updated = team.players.map((pl, pIdx) => pIdx === pi ? { ...pl, name: e.target.value } : pl);
                  onTeamUpdate({ ...team, players: updated });
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Room panel ────────────────────────────────────────────────────────────────
function RoomPanel({ room, onClose, players, setPlayers }) {
  const [liveRoom, setLiveRoom] = useState(room);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const pollRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState('');

  const joinUrl = `${window.location.origin}/join/${room.code}`;

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#f0ede8', light: '#14141c' },
    }).then(setQrDataUrl).catch(console.error);
    pollRef.current = setInterval(async () => {
      try {
        const updated = await api.getRoom(room.code);
        setLiveRoom(updated);
      } catch (err) {
        console.warn('Room poll failed:', err.message);
      }
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
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: '42px', color: 'var(--accent)', letterSpacing: '0.2em', lineHeight: 1 }}>{room.code}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '2px' }}>Expires in</p>
          <p style={{ color: timeLeft === 'Expired' ? 'var(--danger)' : 'var(--text)', fontSize: '18px', fontWeight: 600, fontFamily: 'Barlow Condensed' }}>{timeLeft}</p>
        </div>
      </div>
      {qrDataUrl && (
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <img src={qrDataUrl} alt="Room QR" style={{ width: '160px', height: '160px', borderRadius: 'var(--radius-sm)' }} />
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

// ── Main Setup page ───────────────────────────────────────────────────────────
export default function Setup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [mode, setMode] = useState('singles');
  const [ruleset, setRuleset] = useState('double_out');
  const [format, setFormat] = useState('first_to');
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

  // Apply quick start shortcuts from Home page
  useEffect(() => {
    const s = location.state;
    if (!s) return;
    if (s.mode) setMode(s.mode);
    if (s.playerCount === 4) {
      setPlayers([
        { name: user?.name || '', color: COLORS[0], userId: user?.id || null, isOwner: !!user },
        { name: '', color: COLORS[1], userId: null, isOwner: false },
        { name: '', color: COLORS[2], userId: null, isOwner: false },
        { name: '', color: COLORS[3], userId: null, isOwner: false },
      ]);
    }
  }, []);

  // Singles drag state
  const playerListRef = useRef(null);
  const playerDragIdx = useRef(null);
  const [playerDragOver, setPlayerDragOver] = useState(null);

  function handlePlayerDragStart(i) { playerDragIdx.current = i; }
  function handlePlayerDragOver(i) { setPlayerDragOver(i); }
  function handlePlayerDrop() {
    const from = playerDragIdx.current;
    const to = playerDragOver;
    if (from === null || to === null || from === to) {
      playerDragIdx.current = null; setPlayerDragOver(null); return;
    }
    setPlayers(prev => {
      const a = [...prev];
      const [moved] = a.splice(from, 1);
      a.splice(to, 0, moved);
      return a;
    });
    playerDragIdx.current = null; setPlayerDragOver(null);
  }

  // Teams drag state
  const teamListRef = useRef(null);
  const teamDragIdx = useRef(null);
  const [teamDragOver, setTeamDragOver] = useState(null);

  function handleTeamDragStart(i) { teamDragIdx.current = i; }
  function handleTeamDragOver(i) { setTeamDragOver(i); }
  function handleTeamDrop() {
    const from = teamDragIdx.current;
    const to = teamDragOver;
    if (from === null || to === null || from === to) {
      teamDragIdx.current = null; setTeamDragOver(null); return;
    }
    setTeams(prev => {
      const a = [...prev];
      const [moved] = a.splice(from, 1);
      a.splice(to, 0, moved);
      return a;
    });
    teamDragIdx.current = null; setTeamDragOver(null);
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
    if (room) {
      try {
        await api.closeRoom(room.code);
      } catch (err) {
        console.warn('Room close failed:', err.message);
      }
      setRoom(null);
    }
  }

  async function resolvePlayerId(p) {
    if (p.userId) return p.userId;
    try {
      const r = await api.register({
        name: p.name.trim(),
        email: `guest_${Date.now()}_${Math.random()}@guest.local`,
      });
      const guestId = r.user.id;
      GuestSessionStore.saveGuestSession(guestId, r.token);
      GuestSessionStore.rememberGuestName(p.name, guestId);
      return guestId;
    } catch (err) {
      console.warn('Guest registration failed:', err.message);
      return null;
    }
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
        if (room) {
          try {
            await api.closeRoom(room.code);
          } catch (err) {
            console.warn('Room close after singles start failed:', err.message);
          }
        }
        const game = await api.createGame({ mode: 'singles', ruleset, format, legsPerSet, setsPerMatch, players: valid });
        GameAccess.rememberGameParticipants(game.id, valid);
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
        if (room) {
          try {
            await api.closeRoom(room.code);
          } catch (err) {
            console.warn('Room close after teams start failed:', err.message);
          }
        }
        const game = await api.createGame({ mode: 'teams', ruleset, format, legsPerSet, setsPerMatch, teams: teamData });
        GameAccess.rememberGameParticipants(
          game.id,
          teamData.flatMap(team => team.players)
        );
        navigate(`/game/${game.id}`);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>
      <button onClick={() => navigate('/')} style={{ background: 'none', color: 'var(--muted)', fontSize: '13px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>← Back</button>
      <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '48px', fontWeight: 800, color: 'var(--accent)', marginBottom: '24px' }}>NEW GAME</h1>

      {/* Mode */}
      <div style={{ marginBottom: '24px' }}>
        <p className="label-xs" style={{ marginBottom: '10px' }}>GAME MODE</p>
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
        <p className="label-xs" style={{ marginBottom: '10px' }}>FINISH RULE</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {RULESETS.map(r => <button key={r.value} className={`tag ${ruleset === r.value ? 'active' : ''}`} onClick={() => setRuleset(r.value)}>{r.label}</button>)}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '8px' }}>{RULESETS.find(r => r.value === ruleset)?.desc}</p>
      </div>

      {/* Match format */}
      <div style={{ marginBottom: '24px' }}>
        <p className="label-xs" style={{ marginBottom: '10px' }}>MATCH FORMAT</p>
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

      {/* ── Singles players ── */}
      {mode === 'singles' && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <p className="label-xs">PLAYERS (max 4)</p>
            {user && !room && (
              <button onClick={handleCreateRoom} disabled={roomLoading}
                style={{ background: 'none', color: 'var(--accent)', fontSize: '12px', border: '1px solid var(--accent)', borderRadius: '99px', padding: '4px 12px', cursor: 'pointer' }}>
                {roomLoading ? '...' : '🔗 Create room'}
              </button>
            )}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '12px' }}>⠿ Drag to reorder · Player 1 throws first</p>
          {room && <RoomPanel room={room} onClose={handleCloseRoom} players={players} setPlayers={setPlayers} />}
          <div ref={playerListRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {players.map((p, i) => (
              <PlayerRow
                key={i}
                player={p} index={i} total={players.length}
                listRef={playerListRef}
                onUpdate={updated => setPlayers(prev => prev.map((pl, idx) => idx === i ? updated : pl))}
                onRemove={() => setPlayers(prev => prev.filter((_, idx) => idx !== i))}
                onDragStart={handlePlayerDragStart}
                onDragOver={handlePlayerDragOver}
                onDrop={handlePlayerDrop}
                isDragging={playerDragOver === i && playerDragIdx.current !== null && playerDragIdx.current !== i}
              />
            ))}
          </div>
          {players.length < 4 && (
            <button className="btn-ghost" style={{ marginTop: '12px' }}
              onClick={() => setPlayers(prev => [...prev, { name: '', color: COLORS[prev.length % COLORS.length], userId: null, isOwner: false }])}>
              + Add Player
            </button>
          )}
        </div>
      )}

      {/* ── Teams ── */}
      {mode === 'teams' && (
        <div style={{ marginBottom: '24px' }}>
          <p className="label-xs" style={{ marginBottom: '6px' }}>TEAMS (max 4)</p>
          <p style={{ color: 'var(--muted)', fontSize: '11px', marginBottom: '12px' }}>⠿ Drag teams or players to reorder · Team 1 throws first</p>
          <div ref={teamListRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {teams.map((t, ti) => (
              <TeamCard
                key={ti}
                team={t} teamIndex={ti} totalTeams={teams.length}
                teamListRef={teamListRef}
                onTeamUpdate={updated => setTeams(prev => prev.map((tm, idx) => idx === ti ? updated : tm))}
                onTeamRemove={() => setTeams(prev => prev.filter((_, idx) => idx !== ti))}
                onTeamDragStart={handleTeamDragStart}
                onTeamDragOver={handleTeamDragOver}
                onTeamDrop={handleTeamDrop}
                isTeamDragging={teamDragOver === ti && teamDragIdx.current !== null && teamDragIdx.current !== ti}
              />
            ))}
          </div>
          {teams.length < 4 && (
            <button className="btn-ghost" style={{ marginTop: '12px' }}
              onClick={() => setTeams(prev => [...prev, {
                name: `Team ${prev.length + 1}`,
                players: [
                  { name: '', color: COLORS[prev.length * 2 % COLORS.length], userId: null },
                  { name: '', color: COLORS[(prev.length * 2 + 1) % COLORS.length], userId: null },
                ],
              }])}>
              + Add Team
            </button>
          )}
        </div>
      )}

      {error && <p style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '14px' }}>{error}</p>}
      <button className="btn-primary" onClick={handleStart} disabled={loading}
        style={{ fontSize: '18px', padding: '16px', fontFamily: 'Barlow Condensed', letterSpacing: '0.05em', fontWeight: 800 }}>
        {loading ? 'STARTING...' : 'START GAME 🎯'}
      </button>
    </div>
  );
}
