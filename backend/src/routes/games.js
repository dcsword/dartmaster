import express from 'express';
import { query, getClient } from '../db/pool.js';
import { optionalAuth } from '../middleware/auth.js';
import { processTurn, getCheckout, checkMatchProgress } from '../logic/gameLogic.js';

const router = express.Router();

router.post('/', optionalAuth, async (req, res) => {
  const { mode = 'singles', ruleset = 'double_out', format = 'best_of', legsPerSet = 1, setsPerMatch = 1, players, teams } = req.body;

  if (!['singles', 'teams'].includes(mode)) return res.status(400).json({ error: 'mode must be singles or teams' });
  if (!['straight_out', 'double_out', 'triple_out'].includes(ruleset)) return res.status(400).json({ error: 'Invalid ruleset' });
  if (!['best_of', 'first_to'].includes(format)) return res.status(400).json({ error: 'format must be best_of or first_to' });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const gameResult = await client.query(
      `INSERT INTO games (mode, ruleset, format, legs_per_set, sets_per_match) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [mode, ruleset, format, legsPerSet, setsPerMatch]
    );
    const game = gameResult.rows[0];

    if (mode === 'singles') {
      if (!players || players.length < 1 || players.length > 4) throw new Error('singles requires 1–4 players');
      for (let i = 0; i < players.length; i++) {
        await client.query(`INSERT INTO game_players (game_id, user_id, "order") VALUES ($1, $2, $3)`, [game.id, players[i], i]);
      }
    } else {
      if (!teams || teams.length < 2 || teams.length > 4) throw new Error('teams mode requires 2–4 teams');
      for (let t = 0; t < teams.length; t++) {
        const team = teams[t];
        if (!team.name) throw new Error(`Team ${t + 1} needs a name`);
        if (!team.players || team.players.length !== 2) throw new Error(`Team "${team.name}" must have exactly 2 players`);
        const teamResult = await client.query(`INSERT INTO teams (game_id, name, "order") VALUES ($1, $2, $3) RETURNING id`, [game.id, team.name, t]);
        const teamId = teamResult.rows[0].id;
        for (let p = 0; p < team.players.length; p++) {
          await client.query(`INSERT INTO team_players (team_id, user_id, "order") VALUES ($1, $2, $3)`, [teamId, team.players[p], p]);
        }
      }
    }

    await client.query(`INSERT INTO legs (game_id, set_number, leg_number) VALUES ($1, 1, 1)`, [game.id]);
    await client.query('COMMIT');
    const fullGame = await getGameState(game.id);
    res.status(201).json(fullGame);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message || 'Could not create game' });
  } finally {
    client.release();
  }
});

router.get('/:id/detail', async (req, res) => {
  try {
    const gameResult = await query('SELECT * FROM games WHERE id = $1', [req.params.id]);
    if (!gameResult.rows.length) return res.status(404).json({ error: 'Game not found' });
    const game = gameResult.rows[0];
    const allRounds = await query(
      `SELECT r.id, r.round_number, r.score_before, r.score_after, r.is_bust, r.is_winning, r.created_at, r.leg_id,
        u.name as player_name, t.name as team_name,
        json_agg(json_build_object('dart_number', d.dart_number, 'score', d.score, 'multiplier', d.multiplier, 'is_bull', d.is_bull) ORDER BY d.dart_number) as darts
       FROM rounds r
       LEFT JOIN users u ON u.id = r.player_id
       LEFT JOIN teams t ON t.id = r.team_id
       JOIN darts d ON d.round_id = r.id
       WHERE r.game_id = $1 GROUP BY r.id, u.name, t.name ORDER BY r.created_at ASC`,
      [req.params.id]
    );
    const legsResult = await query(
      `SELECT l.*, u.name as winner_name, t.name as winner_team_name FROM legs l
       LEFT JOIN users u ON u.id = l.winner_id LEFT JOIN teams t ON t.id = l.winner_team_id
       WHERE l.game_id = $1 ORDER BY l.set_number, l.leg_number`,
      [req.params.id]
    );
    res.json({ game, rounds: allRounds.rows, legs: legsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const game = await getGameState(req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/turn', async (req, res) => {
  const { playerId, teamId, darts } = req.body;
  if (!darts || !Array.isArray(darts) || darts.length === 0 || darts.length > 3)
    return res.status(400).json({ error: 'darts must be an array of 1–3 values' });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const gameResult = await client.query('SELECT * FROM games WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!gameResult.rows.length) throw new Error('Game not found');
    const game = gameResult.rows[0];
    if (game.status !== 'active') throw new Error('Game is not active');

    const legResult = await client.query(
      `SELECT * FROM legs WHERE game_id = $1 AND set_number = $2 AND leg_number = $3`,
      [game.id, game.current_set, game.current_leg]
    );
    if (!legResult.rows.length) throw new Error('Active leg not found');
    const currentLeg = legResult.rows[0];

    let scoreBefore;
    if (game.mode === 'singles') {
      const r = await client.query('SELECT score FROM game_players WHERE game_id = $1 AND user_id = $2', [game.id, playerId]);
      if (!r.rows.length) throw new Error('Player not in game');
      scoreBefore = r.rows[0].score;
    } else {
      const r = await client.query('SELECT score FROM teams WHERE id = $1 AND game_id = $2', [teamId, game.id]);
      if (!r.rows.length) throw new Error('Team not in game');
      scoreBefore = r.rows[0].score;
    }

    const turnResult = processTurn(scoreBefore, darts, game.ruleset);
    const scoreAfter = turnResult.scoreAfter;

    const roundCountResult = await client.query(
      'SELECT COUNT(*) FROM rounds WHERE leg_id = $1 AND (player_id = $2 OR team_id = $3)',
      [currentLeg.id, playerId || null, teamId || null]
    );
    const roundNumber = parseInt(roundCountResult.rows[0].count) + 1;

    const roundResult = await client.query(
      `INSERT INTO rounds (game_id, leg_id, round_number, player_id, team_id, score_before, score_after, is_bust, is_winning)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [game.id, currentLeg.id, roundNumber, playerId || null, teamId || null, scoreBefore, scoreAfter, turnResult.isBust, turnResult.isWin]
    );
    const roundId = roundResult.rows[0].id;

    for (let i = 0; i < turnResult.parsedDarts.length; i++) {
      const d = turnResult.parsedDarts[i];
      await client.query(`INSERT INTO darts (round_id, dart_number, score, multiplier, is_bull) VALUES ($1, $2, $3, $4, $5)`,
        [roundId, i + 1, d.score, d.multiplier, d.isBull]);
    }

    if (!turnResult.isBust) {
      if (game.mode === 'singles') {
        await client.query('UPDATE game_players SET score = $1 WHERE game_id = $2 AND user_id = $3', [scoreAfter, game.id, playerId]);
      } else {
        await client.query('UPDATE teams SET score = $1 WHERE id = $2', [scoreAfter, teamId]);
      }
    }

    let legWon = false, setWon = false, matchWon = false;

    if (turnResult.isWin) {
      legWon = true;

      let legWinsInSet, setsWon;
      if (game.mode === 'singles') {
        const r = await client.query('SELECT sets_won FROM game_players WHERE game_id = $1 AND user_id = $2', [game.id, playerId]);
        const lc = await client.query(`SELECT COUNT(*) FROM legs WHERE game_id = $1 AND set_number = $2 AND winner_id = $3`, [game.id, game.current_set, playerId]);
        legWinsInSet = parseInt(lc.rows[0].count);
        setsWon = r.rows[0].sets_won;
      } else {
        const r = await client.query('SELECT sets_won FROM teams WHERE id = $1', [teamId]);
        const lc = await client.query(`SELECT COUNT(*) FROM legs WHERE game_id = $1 AND set_number = $2 AND winner_team_id = $3`, [game.id, game.current_set, teamId]);
        legWinsInSet = parseInt(lc.rows[0].count);
        setsWon = r.rows[0].sets_won;
      }

      const progress = checkMatchProgress(game.format, game.legs_per_set, game.sets_per_match, legWinsInSet, setsWon);
      setWon = progress.wonSet;
      matchWon = progress.wonMatch;

      await client.query(
        `UPDATE legs SET winner_id = $1, winner_team_id = $2, finished_at = NOW() WHERE id = $3`,
        [game.mode === 'singles' ? playerId : null, game.mode === 'teams' ? teamId : null, currentLeg.id]
      );

      if (game.mode === 'singles') {
        await client.query('UPDATE game_players SET legs_won = legs_won + 1 WHERE game_id = $1 AND user_id = $2', [game.id, playerId]);
        if (setWon) await client.query('UPDATE game_players SET sets_won = sets_won + 1 WHERE game_id = $1 AND user_id = $2', [game.id, playerId]);
      } else {
        await client.query('UPDATE teams SET legs_won = legs_won + 1 WHERE id = $1', [teamId]);
        if (setWon) await client.query('UPDATE teams SET sets_won = sets_won + 1 WHERE id = $1', [teamId]);
      }

      if (matchWon) {
        await client.query(
          `UPDATE games SET status = 'finished', winner_id = $1, winner_team_id = $2, finished_at = NOW() WHERE id = $3`,
          [game.mode === 'singles' ? playerId : null, game.mode === 'teams' ? teamId : null, game.id]
        );
        if (game.mode === 'singles') {
          await client.query(`UPDATE player_stats SET games_won = games_won + 1, highest_checkout = GREATEST(highest_checkout, $1) WHERE user_id = $2`, [scoreBefore, playerId]);
          await client.query(`UPDATE player_stats SET games_played = games_played + 1 WHERE user_id IN (SELECT user_id FROM game_players WHERE game_id = $1)`, [game.id]);
        }
      } else {
        let nextSet = game.current_set;
        let nextLeg = game.current_leg + 1;
        if (setWon) { nextSet = game.current_set + 1; nextLeg = 1; }
        const resetScore = game.starting_score || 501;
        if (game.mode === 'singles') {
          await client.query('UPDATE game_players SET score = $1 WHERE game_id = $2', [resetScore, game.id]);
        } else {
          await client.query('UPDATE teams SET score = $1 WHERE game_id = $2', [resetScore, game.id]);
        }
        await client.query('UPDATE games SET current_set = $1, current_leg = $2 WHERE id = $3', [nextSet, nextLeg, game.id]);
        await client.query(`INSERT INTO legs (game_id, set_number, leg_number) VALUES ($1, $2, $3)`, [game.id, nextSet, nextLeg]);
      }
    }

    const scoreThisTurn = scoreBefore - scoreAfter;
    if (!turnResult.isBust && playerId) {
      await client.query(`UPDATE player_stats SET total_darts = total_darts + $1, total_score = total_score + $2 WHERE user_id = $3`,
        [turnResult.dartsThrown, scoreThisTurn, playerId]);
    }

    await client.query('COMMIT');

    const nextScore = turnResult.isWin ? null : scoreAfter;
    const checkout = nextScore ? getCheckout(nextScore, game.ruleset) : null;

    res.json({ turnResult, scoreAfter, checkout, legWon, setWon, matchWon, gameStatus: matchWon ? 'finished' : 'active' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  // Accept comma-separated list of user IDs to filter by (supports guest IDs from localStorage)
  const userIds = req.query.userIds ? req.query.userIds.split(',').filter(Boolean) : [];

  try {
    let result;
    if (userIds.length > 0) {
      // Return only games where at least one of the given user IDs participated
      result = await query(
        `SELECT DISTINCT g.id, g.mode, g.ruleset, g.format, g.legs_per_set, g.sets_per_match,
                g.status, g.started_at, g.finished_at,
                u.name as winner_name, t.name as winner_team_name
         FROM games g
         LEFT JOIN users u ON u.id = g.winner_id
         LEFT JOIN teams t ON t.id = g.winner_team_id
         LEFT JOIN game_players gp ON gp.game_id = g.id
         LEFT JOIN team_players tp ON tp.team_id IN (SELECT id FROM teams WHERE game_id = g.id)
         WHERE g.status = 'finished'
           AND (gp.user_id = ANY($3) OR tp.user_id = ANY($3))
         ORDER BY g.finished_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset, userIds]
      );
    } else {
      // No IDs provided — return empty, never expose all games
      return res.json([]);
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/checkout', async (req, res) => {
  const { score, ruleset } = req.query;
  const suggestion = getCheckout(parseInt(score), ruleset || 'double_out');
  res.json({ score: parseInt(score), suggestion });
});

async function getGameState(gameId) {
  const gameResult = await query('SELECT * FROM games WHERE id = $1', [gameId]);
  if (!gameResult.rows.length) return null;
  const game = gameResult.rows[0];

  if (game.mode === 'singles') {
    const players = await query(
      `SELECT gp.score, gp.order, gp.legs_won, gp.sets_won, u.id, u.name, u.avatar_color
       FROM game_players gp JOIN users u ON u.id = gp.user_id
       WHERE gp.game_id = $1 ORDER BY gp.order`,
      [gameId]
    );
    game.players = players.rows;
  } else {
    const teams = await query(
      `SELECT t.id, t.name, t.score, t.order, t.legs_won, t.sets_won,
              json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_color', u.avatar_color, 'order', tp.order) ORDER BY tp.order) as players
       FROM teams t JOIN team_players tp ON tp.team_id = t.id JOIN users u ON u.id = tp.user_id
       WHERE t.game_id = $1 GROUP BY t.id ORDER BY t.order`,
      [gameId]
    );
    game.teams = teams.rows;
  }

  const legResult = await query(
    `SELECT * FROM legs WHERE game_id = $1 AND set_number = $2 AND leg_number = $3`,
    [gameId, game.current_set, game.current_leg]
  );
  game.currentLeg = legResult.rows[0] || null;

  const allLegs = await query(
    `SELECT l.*, u.name as winner_name, t.name as winner_team_name FROM legs l
     LEFT JOIN users u ON u.id = l.winner_id LEFT JOIN teams t ON t.id = l.winner_team_id
     WHERE l.game_id = $1 ORDER BY l.set_number, l.leg_number`,
    [gameId]
  );
  game.legs = allLegs.rows;

  const rounds = await query(
    `SELECT r.*, json_agg(d ORDER BY d.dart_number) as darts FROM rounds r
     JOIN darts d ON d.round_id = r.id WHERE r.game_id = $1
     GROUP BY r.id ORDER BY r.created_at DESC LIMIT 20`,
    [gameId]
  );
  game.recentRounds = rounds.rows;

  return game;
}

export default router;
