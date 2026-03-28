import * as statsRepository from '../repositories/statsRepository.js';

function createClientError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  return error;
}

function parseCount(value) {
  return parseInt(value, 10) || 0;
}

function parseAverage(value) {
  return parseFloat(value) || 0;
}

function validateRange(range) {
  if (!['all', '30d', '7d'].includes(range)) {
    throw createClientError('Invalid range');
  }
}

export async function getPlayerStats(userId, range = 'all') {
  validateRange(range);

  const [gamesResult, averageResult, checkoutResult, playerStatsResult] = await Promise.all([
    statsRepository.getWinLossSummary(userId, range),
    statsRepository.getAveragePerDart(userId, range),
    statsRepository.getCheckoutSummary(userId, range),
    statsRepository.getPlayer180s(userId),
  ]);

  const gameSummary = gamesResult.rows[0];
  const totalGames = parseCount(gameSummary.total_games);
  const wins = parseCount(gameSummary.wins);
  const losses = parseCount(gameSummary.losses);
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const checkoutSummary = checkoutResult.rows[0];
  const checkoutOpps = parseCount(checkoutSummary.opportunities);
  const checkoutHits = parseCount(checkoutSummary.checkouts);

  return {
    range,
    totalGames,
    wins,
    losses,
    winRate,
    avgPerDart: parseAverage(averageResult.rows[0]?.avg_per_dart),
    checkoutPercent: checkoutOpps > 0 ? Math.round((checkoutHits / checkoutOpps) * 100) : 0,
    checkoutHits,
    checkoutOpps,
    max180s: parseCount(playerStatsResult.rows[0]?.max_180s),
  };
}

export async function getHeadToHead(player1, player2) {
  if (!player1 || !player2) {
    throw createClientError('player1 and player2 required');
  }

  const gamesResult = await statsRepository.getH2HGames(player1, player2);
  const h2hGames = gamesResult.rows;
  const totalH2H = h2hGames.length;
  const player1Wins = h2hGames.filter(game => game.winner_id === player1).length;
  const player2Wins = h2hGames.filter(game => game.winner_id === player2).length;
  const gameIds = h2hGames.map(game => game.id);

  const [player1AvgResult, player2AvgResult, playerRows] = await Promise.all([
    statsRepository.getAverageInGames(player1, gameIds),
    statsRepository.getAverageInGames(player2, gameIds),
    statsRepository.getPlayersByIds([player1, player2]),
  ]);

  const playersById = {};
  playerRows.rows.forEach(player => {
    playersById[player.id] = player;
  });

  return {
    totalH2H,
    player1: {
      ...playersById[player1],
      wins: player1Wins,
      avgPerDart: parseAverage(player1AvgResult.rows[0]?.avg),
    },
    player2: {
      ...playersById[player2],
      wins: player2Wins,
      avgPerDart: parseAverage(player2AvgResult.rows[0]?.avg),
    },
    recentGames: h2hGames.slice(0, 5),
  };
}

export { createClientError };
