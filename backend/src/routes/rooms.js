import express from 'express';
import { query, getClient } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Generate a random 6-char code: uppercase letters + numbers, no ambiguous chars (0,O,I,1)
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Clean up expired rooms
async function cleanExpiredRooms() {
  await query(`DELETE FROM rooms WHERE expires_at < NOW()`);
}

// ── POST /api/rooms — create a room ─────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  await cleanExpiredRooms();

  // Check if user already has an active room
  const existing = await query(
    `SELECT * FROM rooms WHERE host_id = $1 AND expires_at > NOW()`,
    [req.user.id]
  );

  if (existing.rows.length > 0) {
    // Return existing room
    const room = existing.rows[0];
    const members = await getRoomMembers(room.id);
    return res.json({ ...room, members });
  }

  // Generate unique code
  let code;
  let attempts = 0;
  while (attempts < 10) {
    code = generateRoomCode();
    const taken = await query('SELECT id FROM rooms WHERE code = $1', [code]);
    if (!taken.rows.length) break;
    attempts++;
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO rooms (code, host_id, expires_at) VALUES ($1, $2, $3) RETURNING *`,
      [code, req.user.id, expiresAt]
    );
    const room = result.rows[0];

    // Host is automatically a member
    await client.query(
      `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)`,
      [room.id, req.user.id]
    );

    await client.query('COMMIT');

    const members = await getRoomMembers(room.id);
    res.status(201).json({ ...room, members });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not create room' });
  } finally {
    client.release();
  }
});

// ── POST /api/rooms/join — join a room by code ───────────────────────────────
router.post('/join', authMiddleware, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const roomResult = await query(
    `SELECT * FROM rooms WHERE code = $1 AND expires_at > NOW()`,
    [code.toUpperCase().trim()]
  );

  if (!roomResult.rows.length) {
    return res.status(404).json({ error: 'Room not found or expired' });
  }

  const room = roomResult.rows[0];

  // Add member if not already in
  await query(
    `INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [room.id, req.user.id]
  );

  const members = await getRoomMembers(room.id);
  res.json({ ...room, members });
});

// ── GET /api/rooms/:code — get room members (host polls this) ────────────────
router.get('/:code', authMiddleware, async (req, res) => {
  const roomResult = await query(
    `SELECT * FROM rooms WHERE code = $1 AND expires_at > NOW()`,
    [req.params.code.toUpperCase()]
  );

  if (!roomResult.rows.length) {
    return res.status(404).json({ error: 'Room not found or expired' });
  }

  const room = roomResult.rows[0];
  const members = await getRoomMembers(room.id);
  res.json({ ...room, members });
});

// ── DELETE /api/rooms/:code — close room ─────────────────────────────────────
router.delete('/:code', authMiddleware, async (req, res) => {
  const roomResult = await query(
    `SELECT * FROM rooms WHERE code = $1 AND host_id = $2`,
    [req.params.code.toUpperCase(), req.user.id]
  );

  if (!roomResult.rows.length) {
    return res.status(404).json({ error: 'Room not found' });
  }

  await query('DELETE FROM rooms WHERE id = $1', [roomResult.rows[0].id]);
  res.json({ success: true });
});

// ── Helper ────────────────────────────────────────────────────────────────────
async function getRoomMembers(roomId) {
  const result = await query(
    `SELECT u.id, u.name, u.avatar_color, rm.joined_at
     FROM room_members rm
     JOIN users u ON u.id = rm.user_id
     WHERE rm.room_id = $1
     ORDER BY rm.joined_at ASC`,
    [roomId]
  );
  return result.rows;
}

export default router;
