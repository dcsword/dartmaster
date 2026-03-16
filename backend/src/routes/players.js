import express from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/players/search?q=name — find players to add to a game
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2)
    return res.status(400).json({ error: 'Query must be at least 2 characters' });

  try {
    const result = await query(
      `SELECT id, name, avatar_color FROM users
       WHERE name ILIKE $1 LIMIT 10`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/players/:id — get player profile + stats
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT u.id, u.name, u.avatar_color, u.created_at,
              ps.games_played, ps.games_won, ps.total_darts,
              ps.total_score, ps.highest_checkout, ps.best_game_darts
       FROM users u
       LEFT JOIN player_stats ps ON ps.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Player not found' });

    const player = result.rows[0];
    player.win_rate = player.games_played > 0
      ? Math.round((player.games_won / player.games_played) * 100)
      : 0;
    player.avg_per_dart = player.total_darts > 0
      ? Math.round((player.total_score / player.total_darts) * 10) / 10
      : 0;

    res.json(player);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/players/:id/games — recent games for a player
router.get('/:id/games', async (req, res) => {
  const { id } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  try {
    const result = await query(
      `SELECT g.id, g.mode, g.ruleset, g.status, g.started_at, g.finished_at,
              g.winner_id,
              CASE WHEN g.winner_id = $1 THEN true ELSE false END as won
       FROM games g
       JOIN game_players gp ON gp.game_id = g.id AND gp.user_id = $1
       WHERE g.status = 'finished'
       ORDER BY g.finished_at DESC
       LIMIT $2`,
      [id, limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/players/me — update own profile
router.patch('/me', authMiddleware, async (req, res) => {
  const { name, avatar_color } = req.body;
  const updates = [];
  const values = [];
  let idx = 1;

  if (name) { updates.push(`name = $${idx++}`); values.push(name.trim()); }
  if (avatar_color) { updates.push(`avatar_color = $${idx++}`); values.push(avatar_color); }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

  values.push(req.user.id);
  try {
    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING id, name, email, avatar_color`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
