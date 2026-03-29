import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAccessToken } from '../utils/api';
import { GameAccess } from '../utils/gameAccess';

function buildTurnOptions(gameId, game, player) {
  const currentSessionToken = getAccessToken();
  const authToken = GameAccess.getCurrentTurnToken(game, player)
    || (!currentSessionToken ? GameAccess.getViewToken(gameId) : null);
  return authToken ? { authToken } : undefined;
}

export function useGameState(gameId) {
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [currentPlayerInTeam, setCurrentPlayerInTeam] = useState(0);
  const [darts, setDarts] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [checkout, setCheckout] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [legResult, setLegResult] = useState(null);

  function getViewOptions() {
    const authToken = getAccessToken() ? null : GameAccess.getViewToken(gameId);
    return authToken ? { authToken } : undefined;
  }

  function syncTurnState(nextGame) {
    if (!nextGame) return;

    if (nextGame.mode === 'singles') {
      const nextIndex = nextGame.players?.findIndex(
        player => player.id === nextGame.currentLeg?.current_thrower_id
      );
      setCurrentPlayerIdx(nextIndex >= 0 ? nextIndex : 0);
      return;
    }

    const nextTeamIndex = nextGame.teams?.findIndex(
      team => team.id === nextGame.currentLeg?.current_team_id
    );
    const safeTeamIndex = nextTeamIndex >= 0 ? nextTeamIndex : 0;
    const activeTeam = nextGame.teams?.[safeTeamIndex];
    // Teams rotate throwers within the active team, so we derive the next player
    // from how many rounds that team has already recorded in the current leg.
    const turnsThisLeg = (nextGame.recentRounds || []).filter(
      round => round.leg_id === nextGame.currentLeg?.id && round.team_id === activeTeam?.id
    ).length;

    setCurrentTeamIdx(safeTeamIndex);
    setCurrentPlayerInTeam(
      activeTeam?.players?.length ? turnsThisLeg % activeTeam.players.length : 0
    );
  }

  function currentScore() {
    if (!game) return 501;
    if (game.mode === 'singles') {
      const currentPlayer = game.players?.[currentPlayerIdx];
      return (currentPlayer?.score ?? 501) - darts.reduce((sum, dart) => sum + dart.score, 0);
    }

    const currentTeam = game.teams?.[currentTeamIdx];
    return (currentTeam?.score ?? 501) - darts.reduce((sum, dart) => sum + dart.score, 0);
  }

  function getCurrentPlayer() {
    if (!game) return null;
    if (game.mode === 'singles') return game.players?.[currentPlayerIdx];
    return game.teams?.[currentTeamIdx]?.players?.[currentPlayerInTeam];
  }

  function getCurrentTeam() {
    if (!game || game.mode !== 'teams') return null;
    return game.teams?.[currentTeamIdx];
  }

  async function refreshGame() {
    const nextGame = await api.getGame(gameId, getViewOptions());
    GameAccess.rememberGameFromState(nextGame);
    syncTurnState(nextGame);
    setGame(nextGame);
    return nextGame;
  }

  useEffect(() => {
    refreshGame()
      .then(() => setLoading(false))
      .catch(err => {
        setError(err.message || 'Game not found');
        setLoading(false);
      });
  }, [gameId]);

  useEffect(() => {
    if (!game) return;
    const score = currentScore();
    if (score <= 170 && score > 1) {
      api.getCheckout(gameId, score, game.ruleset)
        .then(result => setCheckout(result.suggestion))
        .catch(err => console.warn('Checkout fetch failed:', err.message));
      return;
    }

    setCheckout(null);
  }, [game, currentPlayerIdx, currentTeamIdx, darts, gameId]);

  function addDart(scoreValue, selectedMultiplier, isBull = false) {
    if (darts.length >= 3) return;

    const remaining = currentScore();
    if (isBull) {
      const bullScore = scoreValue === 50 ? 50 : 25;
      const display = scoreValue === 50 ? 'Bull' : '25';
      if (bullScore > remaining) {
        setError(`${bullScore} exceeds ${remaining}`);
        setTimeout(() => setError(''), 2000);
        return;
      }
      setDarts(prev => [...prev, { display, value: display, score: bullScore, multiplier: 1, isBull: true }]);
      setError('');
      return;
    }

    const dartScore = scoreValue * selectedMultiplier;
    if (dartScore > remaining) {
      setError(`${dartScore} exceeds ${remaining}`);
      setTimeout(() => setError(''), 2000);
      return;
    }

    const display = selectedMultiplier === 1
      ? `${scoreValue}`
      : selectedMultiplier === 2
        ? `D${scoreValue}`
        : `T${scoreValue}`;

    setDarts(prev => [...prev, { display, value: display, score: dartScore, multiplier: selectedMultiplier, isBull: false }]);
    setError('');
  }

  function undoDart() {
    setDarts(prev => prev.slice(0, -1));
  }

  async function submitTurn(dartValues) {
    if (dartValues.length === 0) return;

    setSubmitting(true);
    setError('');
    try {
      const player = getCurrentPlayer();
      const team = getCurrentTeam();
      const result = await api.submitTurn(
        gameId,
        { darts: dartValues, playerId: player?.id, teamId: team?.id },
        buildTurnOptions(gameId, game, player)
      );

      if (result.gameStatus === 'finished') {
        navigate(`/win/${gameId}`, {
          state: { winnerName: player?.name, teamName: team?.name, result },
        });
        return;
      }

      const nextGame = await refreshGame();
      setDarts([]);
      setMultiplier(1);

      if (result.legWon) {
        setLegResult({
          setWon: result.setWon,
          winnerName: player?.name || team?.name,
          updatedGame: nextGame,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCurrentTurn() {
    const dartValues = darts.map(dart => (
      dart.isBull || dart.multiplier === 2 || dart.multiplier === 3
        ? dart.value
        : dart.score
    ));
    await submitTurn(dartValues);
  }

  async function handleBust() {
    setDarts([]);
    setMultiplier(1);
    await submitTurn(['0']);
  }

  return {
    game,
    loading,
    error,
    checkout,
    darts,
    multiplier,
    submitting,
    legResult,
    currentPlayer: getCurrentPlayer(),
    currentTeam: getCurrentTeam(),
    currentPlayerIdx,
    currentTeamIdx,
    currentScore: currentScore(),
    setMultiplier,
    addDart,
    undoDart,
    submitTurn: submitCurrentTurn,
    handleBust,
    dismissLegResult: () => {
      syncTurnState(legResult?.updatedGame);
      setLegResult(null);
    },
  };
}
