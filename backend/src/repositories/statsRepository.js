import { query } from '../db/pool.js';

function buildDateFilter(range) {
  if (range === '30d') return `AND g.finished_at >= NOW() - INTERVAL '30 days'`;
  if (range === '7d') return `AND g.finished_at >= NOW() - INTERVAL '7 days'`;
  return '';
}

export async function getWinLossSummary(userId, range) {
  const dateFilter = buildDateFilter(range);
  return query(
    `SELECT
      COUNT(*) AS total_games,
      COUNT(*) FILTER (WHERE g.winner_id = $1) AS wins,
      COUNT(*) FILTER (WHERE g.status = 'finished' AND g.winner_id != $1) AS losses
     FROM games g
     JOIN game_players gp ON gp.game_id = g.id AND gp.user_id = $1
     WHERE g.status = 'finished' ${dateFilter}`,
    [userId]
  );
}

export async function getAveragePerDart(userId, range) {
  const dateFilter = buildDateFilter(range);
  return query(
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
}

export async function getCheckoutSummary(userId, range) {
  const dateFilter = buildDateFilter(range);
  return query(
    `SELECT
      COUNT(*) FILTER (WHERE r.is_winning = true) AS checkouts,
      COUNT(*) AS opportunities
     FROM rounds r
     JOIN games g ON g.id = r.game_id
     WHERE r.player_id = $1
       AND r.score_before <= 170
       AND g.status = 'finished'
       ${dateFilter}`,
    [userId]
  );
}

export async function getPlayer180s(userId) {
  return query(`SELECT max_180s FROM player_stats WHERE user_id = $1`, [userId]);
}

export async function getH2HGames(player1, player2) {
  return query(
    `SELECT g.id, g.winner_id, g.finished_at
     FROM games g
     JOIN game_players gp1 ON gp1.game_id = g.id AND gp1.user_id = $1
     JOIN game_players gp2 ON gp2.game_id = g.id AND gp2.user_id = $2
     WHERE g.status = 'finished'
     ORDER BY g.finished_at DESC`,
    [player1, player2]
  );
}

export async function getAverageInGames(userId, gameIds) {
  if (!gameIds.length) return { rows: [{ avg: 0 }] };

  return query(
    `SELECT ROUND(SUM(r.score_before - r.score_after)::numeric / NULLIF(COUNT(d.id), 0), 1) AS avg
     FROM rounds r
     JOIN darts d ON d.round_id = r.id
     WHERE r.player_id = $1
       AND r.game_id = ANY($2)
       AND r.is_bust = false`,
    [userId, gameIds]
  );
}

export async function getPlayersByIds(playerIds) {
  return query(
    `SELECT id, name, avatar_color, theme_color FROM users WHERE id = ANY($1)`,
    [playerIds]
  );
}
