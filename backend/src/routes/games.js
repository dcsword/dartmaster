import express from 'express';
import { query, getClient } from '../db/pool.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { processTurn, getCheckout, calcAvgPerDart } from '../logic/gameLogic.js';

const router = express.Router();

// ─── POST /api/games — create a new game ────────────────────────────────────
router.post('/', optionalAuth, async (req, res) => {
  const { mode = 'singles', ruleset = 'double_out', players, teams } = req.body;

  if (!['singles', 'teams'].includes(mode))
    return res.status(400).json({ error: 'mode must be singles or teams' });
  if (!['straight_out', 'double_out', 'triple_out'].includes(ruleset))
    return res.status(400).json({ error: 'Invalid ruleset' });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const gameResult = await client.query(
      `INSERT INTO games (mode, ruleset) VALUES ($1, $2) RETURNING *`,
      [mode, ruleset]
    );
    const game = gameResult.rows[0];

    if (mode === 'singles') {
      if (!players || players.length < 1 || players.length > 4)
        throw new Error('singles requires 1–4 players');

      for (let i = 0; i < players.length; i++) {
        await client.query(
          `INSERT INTO game_players (game_id, user_id, "order") VALUES ($1, $2, $3)`,
          [game.id, players[i], i]
        );
      }
    } else {
      // Teams mode
      if (!teams || teams.length < 2 || teams.length > 4)
        throw new Error('teams mode requires 2–4 teams');

      for (let t = 0; t < teams.length; t++) {
        const team = teams[t];
        if (!team.name) throw new Error(`Team ${t + 1} needs a name`);
        if (!team.players || team.players.length !== 2)
          throw new Error(`Team "${team.name}" must have exactly 2 players`);

        const teamResult = await client.query(
          `INSERT INTO teams (game_id, name, "order") VALUES ($1, $2, $3) RETURNING id`,
          [game.id, team.name, t]
        );
        const teamId = teamResult.rows[0].id;

        for (let p = 0; p < team.players.length; p++) {
          await client.query(
            `INSERT INTO team_players (team_id, user_id, "order") VALUES ($1, $2, $3)`,
            [teamId, team.players[p], p]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Return full game state
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

    // GET /api/games/:id/detail — full turn by turn breakdown
    router.get('/:id/detail', async (req, res) => {
      try {
        const gameResult = await query('SELECT * FROM games WHERE id = $1', [req.params.id]);
        if (!gameResult.rows.length) return res.status(404).json({ error: 'Game not found' });
        const game = gameResult.rows[0];
    
        // Get all rounds with player/team info and their darts
        const rounds = await query(
          `SELECT
            r.id, r.round_number, r.score_before, r.score_after, r.is_bust, r.is_winning, r.created_at,
            u.name as player_name,
            t.name as team_name,
            json_agg(
              json_build_object(
                'dart_number', d.dart_number,
                'score', d.score,
                'multiplier', d.multiplier,
                'is_bull', d.is_bull
              ) ORDER BY d.dart_number
            ) as darts
           FROM rounds r
           LEFT JOIN users u ON u.id = r.player_id
           LEFT JOIN teams t ON t.id = r.team_id
           JOIN darts d ON d.round_id = r.id
           GROUP BY r.id, u.name, t.name
           ORDER BY r.created_at ASC`,
          []
        );
    
        // Filter by game id
        const allRounds = await query(
          `SELECT
            r.id, r.round_number, r.score_before, r.score_after, r.is_bust, r.is_winning, r.created_at,
            u.name as player_name,
            t.name as team_name,
            json_agg(
              json_build_object(
                'dart_number', d.dart_number,
                'score', d.score,
                'multiplier', d.multiplier,
                'is_bull', d.is_bull
              ) ORDER BY d.dart_number
            ) as darts
           FROM rounds r
           LEFT JOIN users u ON u.id = r.player_id
           LEFT JOIN teams t ON t.id = r.team_id
           JOIN darts d ON d.round_id = r.id
           WHERE r.game_id = $1
           GROUP BY r.id, u.name, t.name
           ORDER BY r.created_at ASC`,
          [req.params.id]
        );
    
        res.json({ game, rounds: allRounds.rows });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
      }
    });
    
// ─── GET /api/games/:id — get current game state ────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const game = await getGameState(req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/games/:id/turn — submit a turn (up to 3 darts) ───────────────
router.post('/:id/turn', async (req, res) => {
  const { playerId, teamId, darts } = req.body;
  if (!darts || !Array.isArray(darts) || darts.length === 0 || darts.length > 3)
    return res.status(400).json({ error: 'darts must be an array of 1–3 values' });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const gameResult = await client.query('SELECT * FROM games WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (gameResult.rows.length === 0) throw new Error('Game not found');
    const game = gameResult.rows[0];
    if (game.status !== 'active') throw new Error('Game is not active');

    // Get current score for player/team
    let scoreRow, scoreBefore;
    if (game.mode === 'singles') {
      const r = await client.query(
        'SELECT score FROM game_players WHERE game_id = $1 AND user_id = $2',
        [game.id, playerId]
      );
      if (!r.rows.length) throw new Error('Player not in game');
      scoreBefore = r.rows[0].score;
    } else {
      const r = await client.query(
        'SELECT score FROM teams WHERE id = $1 AND game_id = $2',
        [teamId, game.id]
      );
      if (!r.rows.length) throw new Error('Team not in game');
      scoreBefore = r.rows[0].score;
    }



    // Process the turn through game logic
    const turnResult = processTurn(scoreBefore, darts, game.ruleset);
    const scoreAfter = turnResult.scoreAfter;

    // Round number
    const roundCountResult = await client.query(
      'SELECT COUNT(*) FROM rounds WHERE game_id = $1 AND (player_id = $2 OR team_id = $3)',
      [game.id, playerId || null, teamId || null]
    );
    const roundNumber = parseInt(roundCountResult.rows[0].count) + 1;

    // Insert round
    const roundResult = await client.query(
      `INSERT INTO rounds (game_id, round_number, player_id, team_id, score_before, score_after, is_bust, is_winning)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [game.id, roundNumber, playerId || null, teamId || null, scoreBefore, scoreAfter, turnResult.isBust, turnResult.isWin]
    );
    const roundId = roundResult.rows[0].id;

    // Insert individual darts
    for (let i = 0; i < turnResult.parsedDarts.length; i++) {
      const d = turnResult.parsedDarts[i];
      await client.query(
        `INSERT INTO darts (round_id, dart_number, score, multiplier, is_bull)
         VALUES ($1, $2, $3, $4, $5)`,
        [roundId, i + 1, d.score, d.multiplier, d.isBull]
      );
    }

    // Update score
    if (!turnResult.isBust) {
      if (game.mode === 'singles') {
        await client.query(
          'UPDATE game_players SET score = $1 WHERE game_id = $2 AND user_id = $3',
          [scoreAfter, game.id, playerId]
        );
      } else {
        await client.query(
          'UPDATE teams SET score = $1 WHERE id = $2',
          [scoreAfter, teamId]
        );
      }
    }

    // Handle win
    if (turnResult.isWin) {
      await client.query(
        `UPDATE games SET status = 'finished', winner_id = $1, winner_team_id = $2, finished_at = NOW()
         WHERE id = $3`,
        [game.mode === 'singles' ? playerId : null, game.mode === 'teams' ? teamId : null, game.id]
      );

      // Update player stats
      if (game.mode === 'singles' && playerId) {
        await client.query(
          `UPDATE player_stats SET
            games_won = games_won + 1,
            highest_checkout = GREATEST(highest_checkout, $1)
          WHERE user_id = $2`,
          [scoreBefore, playerId]
        );
      }
    }

    // Update games_played for all participants on win
    if (turnResult.isWin) {
      if (game.mode === 'singles') {
        await client.query(
          `UPDATE player_stats SET games_played = games_played + 1
           WHERE user_id IN (SELECT user_id FROM game_players WHERE game_id = $1)`,
          [game.id]
        );
      }
    }

    // Update total darts + score stats
    const scoreThisTurn = scoreBefore - scoreAfter;
    if (!turnResult.isBust && playerId) {
      await client.query(
        `UPDATE player_stats SET
          total_darts = total_darts + $1,
          total_score = total_score + $2
         WHERE user_id = $3`,
        [turnResult.dartsThrown, scoreThisTurn, playerId]
      );
    }

    await client.query('COMMIT');

    // Checkout suggestion for next player's score (or same if not won)
    const nextScore = turnResult.isWin ? null : scoreAfter;
    const checkout = nextScore ? getCheckout(nextScore, game.ruleset) : null;

    res.json({
      turnResult,
      scoreAfter,
      checkout,
      gameStatus: turnResult.isWin ? 'finished' : 'active',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── GET /api/games — game history ──────────────────────────────────────────
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await query(
      `SELECT g.id, g.mode, g.ruleset, g.status, g.started_at, g.finished_at,
      u.name as winner_name,
      t.name as winner_team_name
      FROM games g
      LEFT JOIN users u ON u.id = g.winner_id
      LEFT JOIN teams t ON t.id = g.winner_team_id
      WHERE g.status = 'finished'
      ORDER BY g.finished_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/games/:id/checkout — get checkout suggestion ──────────────────
router.get('/:id/checkout', async (req, res) => {
  const { score, ruleset } = req.query;
  const suggestion = getCheckout(parseInt(score), ruleset || 'double_out');
  res.json({ score: parseInt(score), suggestion });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getGameState(gameId) {
  const gameResult = await query('SELECT * FROM games WHERE id = $1', [gameId]);
  if (!gameResult.rows.length) return null;
  const game = gameResult.rows[0];

  if (game.mode === 'singles') {
    const players = await query(
      `SELECT gp.score, gp.order, u.id, u.name, u.avatar_color
       FROM game_players gp JOIN users u ON u.id = gp.user_id
       WHERE gp.game_id = $1 ORDER BY gp.order`,
      [gameId]
    );
    game.players = players.rows;
  } else {
    const teams = await query(
      `SELECT t.id, t.name, t.score, t.order,
              json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_color', u.avatar_color, 'order', tp.order)
                ORDER BY tp.order) as players
       FROM teams t
       JOIN team_players tp ON tp.team_id = t.id
       JOIN users u ON u.id = tp.user_id
       WHERE t.game_id = $1
       GROUP BY t.id ORDER BY t.order`,
      [gameId]
    );
    game.teams = teams.rows;
  }

  // Recent rounds
  const rounds = await query(
    `SELECT r.*, json_agg(d ORDER BY d.dart_number) as darts
     FROM rounds r
     JOIN darts d ON d.round_id = r.id
     WHERE r.game_id = $1
     GROUP BY r.id
     ORDER BY r.created_at DESC LIMIT 20`,
    [gameId]
  );
  game.recentRounds = rounds.rows;

  return game;
}

export default router;
