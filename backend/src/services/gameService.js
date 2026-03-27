import { getCheckout, checkMatchProgress, processTurn } from '../logic/gameLogic.js';
import * as gameRepository from '../repositories/gameRepository.js';

function createClientError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  return error;
}

function getNextOrderedId(ids, currentId) {
  if (ids.length === 0) return null;
  const currentIndex = ids.indexOf(currentId);
  if (currentIndex < 0) return ids[0];
  return ids[(currentIndex + 1) % ids.length];
}

function validateGamePayload({ mode, ruleset, format }) {
  if (!['singles', 'teams'].includes(mode)) {
    throw createClientError('mode must be singles or teams');
  }
  if (!['straight_out', 'double_out', 'triple_out'].includes(ruleset)) {
    throw createClientError('Invalid ruleset');
  }
  if (!['best_of', 'first_to'].includes(format)) {
    throw createClientError('format must be best_of or first_to');
  }
}

function validateParticipants(mode, players, teams) {
  if (mode === 'singles') {
    if (!players || players.length < 1 || players.length > 4) {
      throw createClientError('singles requires 1–4 players');
    }
    return;
  }

  if (!teams || teams.length < 2 || teams.length > 4) {
    throw createClientError('teams mode requires 2–4 teams');
  }

  teams.forEach((team, teamIndex) => {
    if (!team.name) throw createClientError(`Team ${teamIndex + 1} needs a name`);
    if (!team.players || team.players.length !== 2) {
      throw createClientError(`Team "${team.name}" must have exactly 2 players`);
    }
  });
}

async function requireActiveGameAccess(client, gameId, userId) {
  if (!userId) {
    throw createClientError('Sign in or join as a guest to access this live game', 401);
  }

  const hasAccess = await gameRepository.hasGameParticipant(client, gameId, userId);
  if (!hasAccess) {
    throw createClientError('You do not have access to this live game', 403);
  }
}

async function resolveTurnActor(client, game, reqUser, body) {
  if (!reqUser?.id) {
    throw createClientError('Sign in or join as a guest to submit turns', 401);
  }

  if (game.mode === 'singles') {
    const playerId = body.playerId || reqUser.id;
    if (playerId !== reqUser.id) {
      throw createClientError('You can only submit darts for yourself', 403);
    }

    const isParticipant = await gameRepository.hasGameParticipant(client, game.id, reqUser.id);
    if (!isParticipant) {
      throw createClientError('You are not part of this game', 403);
    }

    return { playerId, teamId: null };
  }

  const participantTeam = await gameRepository.getParticipantTeam(client, game.id, reqUser.id);
  if (!participantTeam) {
    throw createClientError('You are not part of this game', 403);
  }

  if (body.teamId && body.teamId !== participantTeam.id) {
    throw createClientError('You can only submit darts for your own team', 403);
  }

  return { playerId: reqUser.id, teamId: participantTeam.id };
}

function verifyTurnOrder(game, currentLeg, playerId, teamId) {
  if (game.mode === 'singles' && currentLeg.current_thrower_id && playerId !== currentLeg.current_thrower_id) {
    throw createClientError('Not your turn');
  }

  if (game.mode === 'teams' && currentLeg.current_team_id && teamId !== currentLeg.current_team_id) {
    throw createClientError('Not your team\'s turn');
  }
}

async function advanceTurnOrder(client, game, currentLeg) {
  const orderedIds = game.mode === 'singles'
    ? await gameRepository.getOrderedPlayerIds(client, game.id)
    : await gameRepository.getOrderedTeamIds(client, game.id);

  const currentId = game.mode === 'singles'
    ? currentLeg.current_thrower_id
    : currentLeg.current_team_id;

  const nextId = getNextOrderedId(orderedIds, currentId);
  await gameRepository.updateCurrentThrower(client, game, currentLeg.id, nextId);
}

async function handleLegWin(client, game, currentLeg, playerId, teamId, scoreBefore) {
  const legWinsInSet = await gameRepository.getLegWinsInSet(client, game, playerId, teamId);
  const setsWon = await gameRepository.getSetsWon(client, game, playerId, teamId);
  // Match progression depends on both the current leg result and the configured
  // format, so we calculate the next state once and let the repository persist it.
  const progress = checkMatchProgress(
    game.format,
    game.legs_per_set,
    game.sets_per_match,
    legWinsInSet,
    setsWon
  );

  await gameRepository.finishLeg(client, game, currentLeg.id, playerId, teamId);

  if (playerId) {
    await gameRepository.updateBestLegDarts(client, currentLeg.id, playerId);
  }

  await gameRepository.incrementMatchWins(client, game, playerId, teamId, progress.wonSet);

  if (progress.wonMatch) {
    await gameRepository.finishMatch(client, game, playerId, teamId, scoreBefore);
    return progress;
  }

  const nextSet = progress.wonSet ? game.current_set + 1 : game.current_set;
  const nextLeg = progress.wonSet ? 1 : game.current_leg + 1;
  const resetScore = game.starting_score || 501;

  await gameRepository.resetScoresForNextLeg(client, game, resetScore);
  await gameRepository.updateMatchPosition(client, game.id, nextSet, nextLeg);
  await gameRepository.createNextLeg(client, game, nextSet, nextLeg, playerId, teamId);

  return progress;
}

export async function createGame(client, payload) {
  const {
    mode = 'singles',
    ruleset = 'double_out',
    format = 'best_of',
    legsPerSet = 1,
    setsPerMatch = 1,
    players,
    teams,
  } = payload;

  validateGamePayload({ mode, ruleset, format });
  validateParticipants(mode, players, teams);

  const game = await gameRepository.createGameRecord(client, {
    mode,
    ruleset,
    format,
    legsPerSet,
    setsPerMatch,
  });

  if (mode === 'singles') {
    await gameRepository.addSinglesPlayers(client, game.id, players);
  } else {
    await gameRepository.addTeams(client, game.id, teams);
  }

  await gameRepository.createInitialLeg(client, game);
  return getGameState(game.id);
}

export async function getGameState(gameId) {
  const game = await gameRepository.getGameById(gameId);
  if (!game) return null;

  if (game.mode === 'singles') {
    const players = await gameRepository.getGamePlayers(gameId);
    game.players = players.rows;
  } else {
    const teams = await gameRepository.getGameTeams(gameId);
    game.teams = teams.rows;
  }

  const currentLeg = await gameRepository.getLeg(gameId, game.current_set, game.current_leg);
  game.currentLeg = currentLeg.rows[0] || null;

  const allLegs = await gameRepository.getAllLegs(gameId);
  game.legs = allLegs.rows;

  const recentRounds = await gameRepository.getRecentRounds(gameId);
  game.recentRounds = recentRounds.rows;

  return game;
}

export async function getGameDetail(gameId) {
  const game = await gameRepository.getGameById(gameId);
  if (!game) return null;

  const detailRows = await gameRepository.getGameDetailRows(gameId);
  return { game, rounds: detailRows.rounds, legs: detailRows.legs };
}

export async function getLiveGameForUser(client, gameId, userId) {
  const gameMeta = await gameRepository.getGameMeta(gameId);
  if (!gameMeta) return null;

  if (gameMeta.status === 'active') {
    await requireActiveGameAccess(client, gameId, userId);
  }

  return getGameState(gameId);
}

export async function processGameTurn(client, gameId, reqUser, body) {
  if (!body.darts || !Array.isArray(body.darts) || body.darts.length === 0 || body.darts.length > 3) {
    throw createClientError('darts must be an array of 1–3 values');
  }

  const game = await gameRepository.getGameForUpdate(client, gameId);
  if (!game) throw createClientError('Game not found', 404);
  if (game.status !== 'active') throw createClientError('Game is not active');

  const currentLeg = await gameRepository.getCurrentLeg(client, game);
  if (!currentLeg) throw createClientError('Active leg not found', 404);

  const { playerId, teamId } = await resolveTurnActor(client, game, reqUser, body);
  verifyTurnOrder(game, currentLeg, playerId, teamId);

  const scoreBefore = await gameRepository.getEntityScore(client, game, playerId, teamId);
  if (scoreBefore === null) {
    throw createClientError(game.mode === 'singles' ? 'Player not in game' : 'Team not in game');
  }

  const turnResult = processTurn(scoreBefore, body.darts, game.ruleset);
  const roundNumber = await gameRepository.getRoundCount(client, currentLeg.id, playerId, teamId) + 1;
  const roundId = await gameRepository.createRound(client, {
    gameId: game.id,
    legId: currentLeg.id,
    roundNumber,
    playerId,
    teamId,
    scoreBefore,
    scoreAfter: turnResult.scoreAfter,
    turnResult,
  });

  await gameRepository.createDarts(client, roundId, turnResult.parsedDarts);

  if (!turnResult.isBust) {
    await gameRepository.updateEntityScore(client, game, playerId, teamId, turnResult.scoreAfter);
  }

  let legWon = false;
  let setWon = false;
  let matchWon = false;

  if (turnResult.isWin) {
    legWon = true;
    const progress = await handleLegWin(client, game, currentLeg, playerId, teamId, scoreBefore);
    setWon = progress.wonSet;
    matchWon = progress.wonMatch;
  } else {
    await advanceTurnOrder(client, game, currentLeg);
  }

  const scoreThisTurn = scoreBefore - turnResult.scoreAfter;
  await gameRepository.updateTurnTotals(client, playerId, turnResult, scoreThisTurn);

  const nextScore = turnResult.isWin ? null : turnResult.scoreAfter;
  return {
    turnResult,
    scoreAfter: turnResult.scoreAfter,
    checkout: nextScore ? getCheckout(nextScore, game.ruleset) : null,
    legWon,
    setWon,
    matchWon,
    gameStatus: matchWon ? 'finished' : 'active',
  };
}

export async function getFinishedGames(limit, offset, userIds) {
  return gameRepository.getFinishedGames(limit, offset, userIds);
}

export { createClientError };
