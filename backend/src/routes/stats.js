import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { query } from '../db/pool.js';

const router = express.Router();

// ── GET /api/stats/:userId?range=all|30d|7d ───────────────────────────────────
router.get('/:userId', optionalAuth, async (req, res) => {
  const { userId } = req.params;
  const range = req.query.range || 'all';

  // Explicit allowlist — prevents SQL injection via string concatenation
  if (!['all', '30d', '7d'].includes(range))
    return res.status(400).json({ error: 'Invalid range' });

  // Date filter
  let dateFilter = '';
  if (range === '30d') dateFilter = `AND g.finished_at >= NOW() - INTERVAL '30 days'`;
  if (range === '7d')  dateFilter = `AND g.finished_at >= NOW() - INTERVAL '7 days'`;

  try {
    // ── Basic win/loss from games the player participated in ─────────────────
    const gamesResult = await query(
      `SELECT
        COUNT(*)                                                      AS total_games,
        COUNT(*) FILTER (WHERE g.winner_id = $1)                     AS wins,
        COUNT(*) FILTER (WHERE g.status = 'finished' AND g.winner_id != $1) AS losses
       FROM games g
       JOIN game_players gp ON gp.game_id = g.id AND gp.user_id = $1
       WHERE g.status = 'finished' ${dateFilter}`,
      [userId]
    );

    const g = gamesResult.rows[0];
    const totalGames = parseInt(g.total_games) || 0;
    const wins       = parseInt(g.wins)        || 0;
    const losses     = parseInt(g.losses)      || 0;
    const winRate    = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    // ── Avg per dart — last 10 finished games in range ───────────────────────
    const avgResult = await query(
      `SELECT
        ROUND(SUM(r.score_before - r.score_after)::numeric /
          NULLIF(COUNT(d.id), 0), 1) AS avg_per_dart
       FROM rounds r
       JOIN darts d ON d.round_id = r.id
       JOIN games g ON g.id = r.game_id
       WHERE r.player_id = $1
         AND g.status = 'finished'
         AND r.is_bust = false
         ${dateFilter}
         AND g.id IN (
           SELECT gp2.game_id FROM game_players gp2
           WHERE gp2.user_id = $1
           ORDER BY (SELECT finished_at FROM games WHERE id = gp2.game_id) DESC
           LIMIT 10
         )`,
      [userId]
    );

    const avgPerDart = parseFloat(avgResult.rows[0]?.avg_per_dart) || 0;

    // ── Checkout % ────────────────────────────────────────────────────────────
    // Opportunities: rounds where score_before <= 170 and player is at the oche
    // Successes: those rounds that ended in a win (is_winning = true)
    const coResult = await query(
      `SELECT
        COUNT(*) FILTER (WHERE r.is_winning = true)  AS checkouts,
        COUNT(*)                                      AS opportunities
       FROM rounds r
       JOIN games g ON g.id = r.game_id
       WHERE r.player_id = $1
         AND r.score_before <= 170
         AND g.status = 'finished'
         ${dateFilter}`,
      [userId]
    );

    const coRow = coResult.rows[0];
    const coOpps = parseInt(coRow.opportunities) || 0;
    const coHits = parseInt(coRow.checkouts)     || 0;
    const coPercent = coOpps > 0 ? Math.round((coHits / coOpps) * 100) : 0;

    // ── 180s — from player_stats column (resets with DB) ─────────────────────
    const statsResult = await query(
      `SELECT max_180s FROM player_stats WHERE user_id = $1`,
      [userId]
    );
    const max180s = parseInt(statsResult.rows[0]?.max_180s) || 0;

    res.json({
      range,
      totalGames,
      wins,
      losses,
      winRate,
      avgPerDart,
      checkoutPercent: coPercent,
      checkoutHits: coHits,
      checkoutOpps: coOpps,
      max180s,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/stats/h2h?player1=id&player2=id ─────────────────────────────────
router.get('/h2h/compare', optionalAuth, async (req, res) => {
  const { player1, player2 } = req.query;
  if (!player1 || !player2)
    return res.status(400).json({ error: 'player1 and player2 required' });

  try {
    // Games where BOTH players participated
    const gamesResult = await query(
      `SELECT g.id, g.winner_id, g.finished_at
       FROM games g
       JOIN game_players gp1 ON gp1.game_id = g.id AND gp1.user_id = $1
       JOIN game_players gp2 ON gp2.game_id = g.id AND gp2.user_id = $2
       WHERE g.status = 'finished'
       ORDER BY g.finished_at DESC`,
      [player1, player2]
    );

    const h2hGames = gamesResult.rows;
    const totalH2H = h2hGames.length;
    const p1Wins = h2hGames.filter(g => g.winner_id === player1).length;
    const p2Wins = h2hGames.filter(g => g.winner_id === player2).length;

    // Avg per dart for each player in those specific games
    async function getAvgInGames(userId, gameIds) {
      if (!gameIds.length) return 0;
      const result = await query(
        `SELECT ROUND(SUM(r.score_before - r.score_after)::numeric / NULLIF(COUNT(d.id), 0), 1) AS avg
         FROM rounds r
         JOIN darts d ON d.round_id = r.id
         WHERE r.player_id = $1
           AND r.game_id = ANY($2)
           AND r.is_bust = false`,
        [userId, gameIds]
      );
      return parseFloat(result.rows[0]?.avg) || 0;
    }

    const gameIds = h2hGames.map(g => g.id);
    const [p1Avg, p2Avg] = await Promise.all([
      getAvgInGames(player1, gameIds),
      getAvgInGames(player2, gameIds),
    ]);

    // Get player names
    const namesResult = await query(
      `SELECT id, name, avatar_color, theme_color FROM users WHERE id = ANY($1)`,
      [[player1, player2]]
    );
    const players = {};
    namesResult.rows.forEach(p => { players[p.id] = p; });

    res.json({
      totalH2H,
      player1: { ...players[player1], wins: p1Wins, avgPerDart: p1Avg },
      player2: { ...players[player2], wins: p2Wins, avgPerDart: p2Avg },
      recentGames: h2hGames.slice(0, 5),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
