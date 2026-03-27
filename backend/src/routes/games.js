import express from 'express';
import { getClient } from '../db/pool.js';
import { optionalAuth } from '../middleware/auth.js';
import {
  createClientError,
  createGame,
  getFinishedGames,
  getGameDetail,
  getGameState,
  getLiveGameForUser,
  processGameTurn,
} from '../services/gameService.js';
import { getCheckout } from '../logic/gameLogic.js';

const router = express.Router();

function sendClientError(res, err, fallbackMessage) {
  console.error(err);
  const status = err.status || 400;
  const message = err.expose ? err.message : fallbackMessage;
  res.status(status).json({ error: message });
}

router.post('/', optionalAuth, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const game = await createGame(client, req.body);
    await client.query('COMMIT');
    res.status(201).json(game);
  } catch (err) {
    await client.query('ROLLBACK');
    sendClientError(res, err, 'Could not create game');
  } finally {
    client.release();
  }
});

router.get('/:id/detail', optionalAuth, async (req, res) => {
  try {
    const detail = await getGameDetail(req.params.id);
    if (!detail) return res.status(404).json({ error: 'Game not found' });
    res.json(detail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  const client = await getClient();
  try {
    const game = await getLiveGameForUser(client, req.params.id, req.user?.id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (err) {
    if (err.expose) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.post('/:id/turn', optionalAuth, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await processGameTurn(client, req.params.id, req.user, req.body);
    await client.query('COMMIT');
    res.json(result);
  } catch (err) {
    await client.query('ROLLBACK');
    sendClientError(res, err, 'Could not process turn');
  } finally {
    client.release();
  }
});

router.get('/', optionalAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = parseInt(req.query.offset, 10) || 0;
  const userIds = req.query.userIds ? req.query.userIds.split(',').filter(Boolean) : [];

  if (userIds.length > 50) {
    return res.status(400).json({ error: 'Too many user IDs' });
  }

  try {
    if (userIds.length === 0) return res.json([]);
    const result = await getFinishedGames(limit, offset, userIds);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/checkout', async (req, res) => {
  const score = parseInt(req.query.score, 10);
  const ruleset = req.query.ruleset || 'double_out';
  res.json({ score, suggestion: getCheckout(score, ruleset) });
});

export default router;
