import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { GameAccess } from '../utils/gameAccess';
import { GuestSessionStore } from '../utils/guestSessions';
import { COLORS } from '../constants/setupOptions';

function createSinglesPlayers(user) {
  return [
    { name: user?.name || '', color: COLORS[0], userId: user?.id || null, isOwner: !!user },
    { name: '', color: COLORS[1], userId: null, isOwner: false },
  ];
}

function createFourPlayerSingles(user) {
  return [
    { name: user?.name || '', color: COLORS[0], userId: user?.id || null, isOwner: !!user },
    { name: '', color: COLORS[1], userId: null, isOwner: false },
    { name: '', color: COLORS[2], userId: null, isOwner: false },
    { name: '', color: COLORS[3], userId: null, isOwner: false },
  ];
}

function createTeams(user) {
  return [
    {
      name: 'Team 1',
      players: [
        { name: user?.name || '', color: COLORS[0], userId: user?.id || null },
        { name: '', color: COLORS[1], userId: null },
      ],
    },
    {
      name: 'Team 2',
      players: [
        { name: '', color: COLORS[2], userId: null },
        { name: '', color: COLORS[3], userId: null },
      ],
    },
  ];
}

function reorderItems(items, from, to) {
  if (from === null || to === null || from === to) return items;
  const nextItems = [...items];
  const [moved] = nextItems.splice(from, 1);
  nextItems.splice(to, 0, moved);
  return nextItems;
}

export function useSetupState(user) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('singles');
  const [ruleset, setRuleset] = useState('double_out');
  const [format, setFormat] = useState('first_to');
  const [legsPerSet, setLegsPerSet] = useState(1);
  const [setsPerMatch, setSetsPerMatch] = useState(1);
  const [activePreset, setActivePreset] = useState('Casual');
  const [room, setRoom] = useState(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [players, setPlayers] = useState(() => createSinglesPlayers(user));
  const [teams, setTeams] = useState(() => createTeams(user));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const playerListRef = useRef(null);
  const playerDragIdx = useRef(null);
  const [playerDragOver, setPlayerDragOver] = useState(null);

  const teamListRef = useRef(null);
  const teamDragIdx = useRef(null);
  const [teamDragOver, setTeamDragOver] = useState(null);

  useEffect(() => {
    const shortcutState = location.state;
    if (!shortcutState) return;

    if (shortcutState.mode) setMode(shortcutState.mode);
    if (shortcutState.playerCount === 4) {
      setPlayers(createFourPlayerSingles(user));
    }
  }, [location.state, user]);

  function resetPlayerDrag() {
    playerDragIdx.current = null;
    setPlayerDragOver(null);
  }

  function resetTeamDrag() {
    teamDragIdx.current = null;
    setTeamDragOver(null);
  }

  function handlePlayerDragStart(index) {
    playerDragIdx.current = index;
  }

  function handlePlayerDragOver(index) {
    setPlayerDragOver(index);
  }

  function handlePlayerDrop() {
    setPlayers(prev => reorderItems(prev, playerDragIdx.current, playerDragOver));
    resetPlayerDrag();
  }

  function handleTeamDragStart(index) {
    teamDragIdx.current = index;
  }

  function handleTeamDragOver(index) {
    setTeamDragOver(index);
  }

  function handleTeamDrop() {
    setTeams(prev => reorderItems(prev, teamDragIdx.current, teamDragOver));
    resetTeamDrag();
  }

  function applyPreset(preset) {
    setActivePreset(preset.label);
    if (preset.format) setFormat(preset.format);
    if (preset.legs) setLegsPerSet(preset.legs);
    if (preset.sets) setSetsPerMatch(preset.sets);
  }

  function updateLegsPerSet(value) {
    if (format === 'best_of') {
      const increasing = value > legsPerSet;
      let nextValue = value;
      if (nextValue % 2 === 0) nextValue = increasing ? nextValue + 1 : nextValue - 1;
      if (nextValue < 1) nextValue = 1;
      setLegsPerSet(nextValue);
    } else {
      setLegsPerSet(value);
    }
    setActivePreset('Custom');
  }

  function updateSetsPerMatch(value) {
    if (format === 'best_of') {
      const increasing = value > setsPerMatch;
      let nextValue = value;
      if (nextValue % 2 === 0) nextValue = increasing ? nextValue + 1 : nextValue - 1;
      if (nextValue < 1) nextValue = 1;
      setSetsPerMatch(nextValue);
    } else {
      setSetsPerMatch(value);
    }
    setActivePreset('Custom');
  }

  function updateFormat(nextFormat) {
    setFormat(nextFormat);
    setActivePreset('Custom');

    if (nextFormat === 'best_of') {
      if (legsPerSet % 2 === 0) setLegsPerSet(legsPerSet + 1);
      if (setsPerMatch % 2 === 0) setSetsPerMatch(setsPerMatch + 1);
    }
  }

  function matchSummary() {
    const legsToWin = format === 'best_of' ? Math.ceil(legsPerSet / 2) : legsPerSet;
    const setsToWin = format === 'best_of' ? Math.ceil(setsPerMatch / 2) : setsPerMatch;
    const formatLabel = format === 'best_of' ? 'Best of' : 'First to';
    if (setsPerMatch === 1) {
      return `${formatLabel} ${legsPerSet} leg${legsPerSet > 1 ? 's' : ''} — first to ${legsToWin} wins`;
    }
    return `${formatLabel} ${setsPerMatch} sets · ${formatLabel} ${legsPerSet} legs per set — first to ${setsToWin} sets wins`;
  }

  async function handleCreateRoom() {
    if (!user) {
      setError('You must be signed in to create a room');
      return;
    }

    setRoomLoading(true);
    try {
      const nextRoom = await api.createRoom();
      setRoom(nextRoom);
    } catch (err) {
      setError(err.message);
    } finally {
      setRoomLoading(false);
    }
  }

  async function closeRoomByCode(roomCode, warningLabel) {
    try {
      await api.closeRoom(roomCode);
    } catch (err) {
      console.warn(`${warningLabel}:`, err.message);
    }
  }

  async function handleCloseRoom() {
    if (!room) return;
    await closeRoomByCode(room.code, 'Room close failed');
    setRoom(null);
  }

  async function resolvePlayerId(player) {
    if (player.userId) return player.userId;

    try {
      const response = await api.register({
        name: player.name.trim(),
        email: `guest_${Date.now()}_${Math.random()}@guest.local`,
      });
      const guestId = response.user.id;
      GuestSessionStore.saveGuestSession(guestId, response.token);
      GuestSessionStore.rememberGuestName(player.name, guestId);
      return guestId;
    } catch (err) {
      console.warn('Guest registration failed:', err.message);
      return null;
    }
  }

  async function buildSinglesPayload() {
    const filledPlayers = players.filter(player => player.name.trim());
    if (filledPlayers.length < 1) throw new Error('Add at least 1 player');

    const playerIds = await Promise.all(filledPlayers.map(resolvePlayerId));
    const validPlayers = playerIds.filter(Boolean);
    if (!validPlayers.length) throw new Error('Could not create player records');

    return validPlayers;
  }

  async function buildTeamsPayload() {
    const filledTeams = teams.filter(team => team.name.trim() && team.players.some(player => player.name.trim()));
    if (filledTeams.length < 2) throw new Error('Add at least 2 teams');

    return Promise.all(filledTeams.map(async team => {
      const filledPlayers = team.players.filter(player => player.name.trim());
      if (filledPlayers.length !== 2) {
        throw new Error(`Team "${team.name}" needs exactly 2 players`);
      }

      const playerIds = await Promise.all(filledPlayers.map(resolvePlayerId));
      return { name: team.name.trim(), players: playerIds.filter(Boolean) };
    }));
  }

  async function handleStart() {
    setError('');
    setLoading(true);

    try {
      const roomCode = room?.code;

      if (mode === 'singles') {
        const singlePlayers = await buildSinglesPayload();
        if (roomCode) {
          await closeRoomByCode(roomCode, 'Room close after singles start failed');
          setRoom(null);
        }

        const game = await api.createGame({
          mode: 'singles',
          ruleset,
          format,
          legsPerSet,
          setsPerMatch,
          players: singlePlayers,
        });
        GameAccess.rememberGameParticipants(game.id, singlePlayers);
        navigate(`/game/${game.id}`);
      } else {
        const teamData = await buildTeamsPayload();
        if (roomCode) {
          await closeRoomByCode(roomCode, 'Room close after teams start failed');
          setRoom(null);
        }

        const game = await api.createGame({
          mode: 'teams',
          ruleset,
          format,
          legsPerSet,
          setsPerMatch,
          teams: teamData,
        });
        GameAccess.rememberGameParticipants(game.id, teamData.flatMap(team => team.players));
        navigate(`/game/${game.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function addPlayer() {
    setPlayers(prev => [
      ...prev,
      { name: '', color: COLORS[prev.length % COLORS.length], userId: null, isOwner: false },
    ]);
  }

  function addTeam() {
    setTeams(prev => [
      ...prev,
      {
        name: `Team ${prev.length + 1}`,
        players: [
          { name: '', color: COLORS[(prev.length * 2) % COLORS.length], userId: null },
          { name: '', color: COLORS[(prev.length * 2 + 1) % COLORS.length], userId: null },
        ],
      },
    ]);
  }

  return {
    mode,
    ruleset,
    format,
    legsPerSet,
    setsPerMatch,
    activePreset,
    room,
    roomLoading,
    players,
    teams,
    loading,
    error,
    user,
    playerListRef,
    playerDragIdx,
    playerDragOver,
    teamListRef,
    teamDragIdx,
    teamDragOver,
    setMode,
    setRuleset,
    setPlayers,
    setTeams,
    applyPreset,
    updateFormat,
    updateLegsPerSet,
    updateSetsPerMatch,
    matchSummary,
    handleCreateRoom,
    handleCloseRoom,
    handleStart,
    addPlayer,
    addTeam,
    handlePlayerDragStart,
    handlePlayerDragOver,
    handlePlayerDrop,
    handleTeamDragStart,
    handleTeamDragOver,
    handleTeamDrop,
  };
}
