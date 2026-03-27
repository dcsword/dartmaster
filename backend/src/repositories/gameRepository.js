import { query } from '../db/pool.js';

export async function hasGameParticipant(client, gameId, userId) {
  const result = await client.query(
    `SELECT 1
     FROM games g
     WHERE g.id = $1
       AND (
         EXISTS (
           SELECT 1 FROM game_players gp
           WHERE gp.game_id = g.id AND gp.user_id = $2
         )
         OR EXISTS (
           SELECT 1
           FROM teams t
           JOIN team_players tp ON tp.team_id = t.id
           WHERE t.game_id = g.id AND tp.user_id = $2
         )
       )`,
    [gameId, userId]
  );
  return result.rows.length > 0;
}

export async function getOrderedPlayerIds(client, gameId) {
  const result = await client.query(
    `SELECT user_id FROM game_players WHERE game_id = $1 ORDER BY "order"`,
    [gameId]
  );
  return result.rows.map(row => row.user_id);
}

export async function getOrderedTeamIds(client, gameId) {
  const result = await client.query(
    `SELECT id FROM teams WHERE game_id = $1 ORDER BY "order"`,
    [gameId]
  );
  return result.rows.map(row => row.id);
}

export async function createGameRecord(client, { mode, ruleset, format, legsPerSet, setsPerMatch }) {
  const result = await client.query(
    `INSERT INTO games (mode, ruleset, format, legs_per_set, sets_per_match)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [mode, ruleset, format, legsPerSet, setsPerMatch]
  );
  return result.rows[0];
}

export async function addSinglesPlayers(client, gameId, players) {
  for (let playerIndex = 0; playerIndex < players.length; playerIndex += 1) {
    await client.query(
      `INSERT INTO game_players (game_id, user_id, "order") VALUES ($1, $2, $3)`,
      [gameId, players[playerIndex], playerIndex]
    );
  }
}

export async function addTeams(client, gameId, teams) {
  for (let teamIndex = 0; teamIndex < teams.length; teamIndex += 1) {
    const team = teams[teamIndex];
    const teamResult = await client.query(
      `INSERT INTO teams (game_id, name, "order") VALUES ($1, $2, $3) RETURNING id`,
      [gameId, team.name, teamIndex]
    );
    const teamId = teamResult.rows[0].id;

    for (let playerIndex = 0; playerIndex < team.players.length; playerIndex += 1) {
      await client.query(
        `INSERT INTO team_players (team_id, user_id, "order") VALUES ($1, $2, $3)`,
        [teamId, team.players[playerIndex], playerIndex]
      );
    }
  }
}

export async function createInitialLeg(client, game) {
  if (game.mode === 'singles') {
    const firstPlayerResult = await client.query(
      `SELECT user_id FROM game_players WHERE game_id = $1 ORDER BY "order" LIMIT 1`,
      [game.id]
    );
    await client.query(
      `INSERT INTO legs (game_id, set_number, leg_number, current_thrower_id) VALUES ($1, 1, 1, $2)`,
      [game.id, firstPlayerResult.rows[0]?.user_id || null]
    );
    return;
  }

  const firstTeamResult = await client.query(
    `SELECT id FROM teams WHERE game_id = $1 ORDER BY "order" LIMIT 1`,
    [game.id]
  );
  await client.query(
    `INSERT INTO legs (game_id, set_number, leg_number, current_team_id) VALUES ($1, 1, 1, $2)`,
    [game.id, firstTeamResult.rows[0]?.id || null]
  );
}

export async function getGameById(gameId) {
  const result = await query('SELECT * FROM games WHERE id = $1', [gameId]);
  return result.rows[0] || null;
}

export async function getGameMeta(gameId) {
  const result = await query('SELECT id, status FROM games WHERE id = $1', [gameId]);
  return result.rows[0] || null;
}

export async function getGameForUpdate(client, gameId) {
  const result = await client.query('SELECT * FROM games WHERE id = $1 FOR UPDATE', [gameId]);
  return result.rows[0] || null;
}

export async function getCurrentLeg(client, game) {
  const result = await client.query(
    `SELECT * FROM legs WHERE game_id = $1 AND set_number = $2 AND leg_number = $3`,
    [game.id, game.current_set, game.current_leg]
  );
  return result.rows[0] || null;
}

export async function getParticipantTeam(client, gameId, userId) {
  const result = await client.query(
    `SELECT t.id
     FROM teams t
     JOIN team_players tp ON tp.team_id = t.id
     WHERE t.game_id = $1 AND tp.user_id = $2
     LIMIT 1`,
    [gameId, userId]
  );
  return result.rows[0] || null;
}

export async function getEntityScore(client, game, playerId, teamId) {
  if (game.mode === 'singles') {
    const playerScoreResult = await client.query(
      'SELECT score FROM game_players WHERE game_id = $1 AND user_id = $2',
      [game.id, playerId]
    );
    return playerScoreResult.rows[0]?.score ?? null;
  }

  const teamScoreResult = await client.query(
    'SELECT score FROM teams WHERE id = $1 AND game_id = $2',
    [teamId, game.id]
  );
  return teamScoreResult.rows[0]?.score ?? null;
}

export async function getRoundCount(client, legId, playerId, teamId) {
  const result = await client.query(
    'SELECT COUNT(*) FROM rounds WHERE leg_id = $1 AND (player_id = $2 OR team_id = $3)',
    [legId, playerId || null, teamId || null]
  );
  return parseInt(result.rows[0].count, 10);
}

export async function createRound(client, { gameId, legId, roundNumber, playerId, teamId, scoreBefore, scoreAfter, turnResult }) {
  const result = await client.query(
    `INSERT INTO rounds (game_id, leg_id, round_number, player_id, team_id, score_before, score_after, is_bust, is_winning)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [gameId, legId, roundNumber, playerId || null, teamId || null, scoreBefore, scoreAfter, turnResult.isBust, turnResult.isWin]
  );
  return result.rows[0].id;
}

export async function createDarts(client, roundId, parsedDarts) {
  for (let dartIndex = 0; dartIndex < parsedDarts.length; dartIndex += 1) {
    const dart = parsedDarts[dartIndex];
    await client.query(
      `INSERT INTO darts (round_id, dart_number, score, multiplier, is_bull) VALUES ($1, $2, $3, $4, $5)`,
      [roundId, dartIndex + 1, dart.score, dart.multiplier, dart.isBull]
    );
  }
}

export async function updateEntityScore(client, game, playerId, teamId, scoreAfter) {
  if (game.mode === 'singles') {
    await client.query(
      'UPDATE game_players SET score = $1 WHERE game_id = $2 AND user_id = $3',
      [scoreAfter, game.id, playerId]
    );
    return;
  }

  await client.query('UPDATE teams SET score = $1 WHERE id = $2', [scoreAfter, teamId]);
}

export async function getSetsWon(client, game, playerId, teamId) {
  if (game.mode === 'singles') {
    const result = await client.query(
      'SELECT sets_won FROM game_players WHERE game_id = $1 AND user_id = $2',
      [game.id, playerId]
    );
    return result.rows[0]?.sets_won ?? 0;
  }

  const result = await client.query('SELECT sets_won FROM teams WHERE id = $1', [teamId]);
  return result.rows[0]?.sets_won ?? 0;
}

export async function getLegWinsInSet(client, game, playerId, teamId) {
  if (game.mode === 'singles') {
    const result = await client.query(
      `SELECT COUNT(*) FROM legs WHERE game_id = $1 AND set_number = $2 AND winner_id = $3`,
      [game.id, game.current_set, playerId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  const result = await client.query(
    `SELECT COUNT(*) FROM legs WHERE game_id = $1 AND set_number = $2 AND winner_team_id = $3`,
    [game.id, game.current_set, teamId]
  );
  return parseInt(result.rows[0].count, 10);
}

export async function finishLeg(client, game, currentLegId, playerId, teamId) {
  await client.query(
    `UPDATE legs SET winner_id = $1, winner_team_id = $2, finished_at = NOW() WHERE id = $3`,
    [game.mode === 'singles' ? playerId : null, game.mode === 'teams' ? teamId : null, currentLegId]
  );
}

export async function updateBestLegDarts(client, legId, playerId) {
  const result = await client.query(
    `SELECT COUNT(d.id) AS darts_thrown
     FROM rounds r
     JOIN darts d ON d.round_id = r.id
     WHERE r.leg_id = $1 AND r.player_id = $2 AND r.is_bust = false`,
    [legId, playerId]
  );

  const dartsThrown = parseInt(result.rows[0].darts_thrown, 10) || 0;
  if (dartsThrown === 0) return;

  await client.query(
    `UPDATE player_stats SET
       best_game_darts = CASE
         WHEN best_game_darts IS NULL OR best_game_darts = 0 THEN $1
         ELSE LEAST(best_game_darts, $1)
       END
     WHERE user_id = $2`,
    [dartsThrown, playerId]
  );
}

export async function incrementMatchWins(client, game, playerId, teamId, setWon) {
  if (game.mode === 'singles') {
    await client.query(
      'UPDATE game_players SET legs_won = legs_won + 1 WHERE game_id = $1 AND user_id = $2',
      [game.id, playerId]
    );
    if (setWon) {
      await client.query(
        'UPDATE game_players SET sets_won = sets_won + 1 WHERE game_id = $1 AND user_id = $2',
        [game.id, playerId]
      );
    }
    return;
  }

  await client.query('UPDATE teams SET legs_won = legs_won + 1 WHERE id = $1', [teamId]);
  if (setWon) {
    await client.query('UPDATE teams SET sets_won = sets_won + 1 WHERE id = $1', [teamId]);
  }
}

export async function finishMatch(client, game, playerId, teamId, scoreBefore) {
  await client.query(
    `UPDATE games SET status = 'finished', winner_id = $1, winner_team_id = $2, finished_at = NOW() WHERE id = $3`,
    [game.mode === 'singles' ? playerId : null, game.mode === 'teams' ? teamId : null, game.id]
  );

  if (game.mode !== 'singles') return;

  await client.query(
    `UPDATE player_stats SET games_won = games_won + 1, highest_checkout = GREATEST(highest_checkout, $1) WHERE user_id = $2`,
    [scoreBefore, playerId]
  );
  await client.query(
    `UPDATE player_stats SET games_played = games_played + 1 WHERE user_id IN (SELECT user_id FROM game_players WHERE game_id = $1)`,
    [game.id]
  );
}

export async function resetScoresForNextLeg(client, game, resetScore) {
  if (game.mode === 'singles') {
    await client.query('UPDATE game_players SET score = $1 WHERE game_id = $2', [resetScore, game.id]);
    return;
  }

  await client.query('UPDATE teams SET score = $1 WHERE game_id = $2', [resetScore, game.id]);
}

export async function updateMatchPosition(client, gameId, nextSet, nextLeg) {
  await client.query('UPDATE games SET current_set = $1, current_leg = $2 WHERE id = $3', [nextSet, nextLeg, gameId]);
}

export async function createNextLeg(client, game, nextSet, nextLeg, playerId, teamId) {
  if (game.mode === 'singles') {
    const playerIds = await getOrderedPlayerIds(client, game.id);
    const nextThrowerId = playerIds[(playerIds.indexOf(playerId) + 1) % playerIds.length];
    await client.query(
      `INSERT INTO legs (game_id, set_number, leg_number, current_thrower_id) VALUES ($1, $2, $3, $4)`,
      [game.id, nextSet, nextLeg, nextThrowerId]
    );
    return;
  }

  const teamIds = await getOrderedTeamIds(client, game.id);
  const nextTeamId = teamIds[(teamIds.indexOf(teamId) + 1) % teamIds.length];
  await client.query(
    `INSERT INTO legs (game_id, set_number, leg_number, current_team_id) VALUES ($1, $2, $3, $4)`,
    [game.id, nextSet, nextLeg, nextTeamId]
  );
}

export async function updateTurnTotals(client, playerId, turnResult, scoreThisTurn) {
  if (!playerId || turnResult.isBust) return;

  await client.query(
    `UPDATE player_stats SET total_darts = total_darts + $1, total_score = total_score + $2 WHERE user_id = $3`,
    [turnResult.dartsThrown, scoreThisTurn, playerId]
  );

  if (turnResult.dartsThrown === 3 && turnResult.parsedDarts.every(dart => dart.score === 60)) {
    await client.query(`UPDATE player_stats SET max_180s = max_180s + 1 WHERE user_id = $1`, [playerId]);
  }
}

export async function updateCurrentThrower(client, game, currentLegId, nextId) {
  if (game.mode === 'singles') {
    await client.query(`UPDATE legs SET current_thrower_id = $1 WHERE id = $2`, [nextId, currentLegId]);
    return;
  }

  await client.query(`UPDATE legs SET current_team_id = $1 WHERE id = $2`, [nextId, currentLegId]);
}

export async function getFinishedGames(limit, offset, userIds) {
  return query(
    `SELECT DISTINCT g.id, g.mode, g.ruleset, g.format, g.legs_per_set, g.sets_per_match,
            g.status, g.started_at, g.finished_at,
            u.name as winner_name, t.name as winner_team_name
     FROM games g
     LEFT JOIN users u ON u.id = g.winner_id
     LEFT JOIN teams t ON t.id = g.winner_team_id
     WHERE g.status = 'finished'
       AND (
         EXISTS (
           SELECT 1 FROM game_players gp
           WHERE gp.game_id = g.id AND gp.user_id = ANY($3)
         )
         OR
         EXISTS (
           SELECT 1 FROM team_players tp
           JOIN teams tm ON tm.id = tp.team_id
           WHERE tm.game_id = g.id AND tp.user_id = ANY($3)
         )
       )
     ORDER BY g.finished_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset, userIds]
  );
}

export async function getGamePlayers(gameId) {
  return query(
    `SELECT gp.score, gp.order, gp.legs_won, gp.sets_won, u.id, u.name, u.avatar_color
     FROM game_players gp JOIN users u ON u.id = gp.user_id
     WHERE gp.game_id = $1 ORDER BY gp.order`,
    [gameId]
  );
}

export async function getGameTeams(gameId) {
  return query(
    `SELECT t.id, t.name, t.score, t.order, t.legs_won, t.sets_won,
            json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_color', u.avatar_color, 'order', tp.order) ORDER BY tp.order) as players
     FROM teams t JOIN team_players tp ON tp.team_id = t.id JOIN users u ON u.id = tp.user_id
     WHERE t.game_id = $1 GROUP BY t.id ORDER BY t.order`,
    [gameId]
  );
}

export async function getLeg(gameId, currentSet, currentLeg) {
  return query(
    `SELECT * FROM legs WHERE game_id = $1 AND set_number = $2 AND leg_number = $3`,
    [gameId, currentSet, currentLeg]
  );
}

export async function getAllLegs(gameId) {
  return query(
    `SELECT l.*, u.name as winner_name, t.name as winner_team_name FROM legs l
     LEFT JOIN users u ON u.id = l.winner_id LEFT JOIN teams t ON t.id = l.winner_team_id
     WHERE l.game_id = $1 ORDER BY l.set_number, l.leg_number`,
    [gameId]
  );
}

export async function getRecentRounds(gameId) {
  return query(
    `SELECT r.*, json_agg(d ORDER BY d.dart_number) as darts FROM rounds r
     JOIN darts d ON d.round_id = r.id WHERE r.game_id = $1
     GROUP BY r.id ORDER BY r.created_at DESC LIMIT 20`,
    [gameId]
  );
}

export async function getGameDetailRows(gameId) {
  const rounds = await query(
    `SELECT r.id, r.round_number, r.score_before, r.score_after, r.is_bust, r.is_winning, r.created_at, r.leg_id,
      u.name as player_name, t.name as team_name,
      json_agg(json_build_object('dart_number', d.dart_number, 'score', d.score, 'multiplier', d.multiplier, 'is_bull', d.is_bull) ORDER BY d.dart_number) as darts
     FROM rounds r
     LEFT JOIN users u ON u.id = r.player_id
     LEFT JOIN teams t ON t.id = r.team_id
     JOIN darts d ON d.round_id = r.id
     WHERE r.game_id = $1 GROUP BY r.id, u.name, t.name ORDER BY r.created_at ASC`,
    [gameId]
  );
  const legs = await getAllLegs(gameId);
  return { rounds: rounds.rows, legs: legs.rows };
}
