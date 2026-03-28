import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { createClientError, getHeadToHead, getPlayerStats } from '../services/statsService.js';

const router = express.Router();

router.get('/:userId', optionalAuth, async (req, res) => {
  try {
    const result = await getPlayerStats(req.params.userId, req.query.range || 'all');
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/h2h/compare', optionalAuth, async (req, res) => {
  try {
    const result = await getHeadToHead(req.query.player1, req.query.player2);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
