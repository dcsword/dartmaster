import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

const router = express.Router();

// Username rules: 3-30 chars, letters/numbers/underscores only
function validateUsername(username) {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 30) return 'Username must be 30 characters or less';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers and underscores';
  return null;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, username, email, password } = req.body;

  // Guest registration — no username/email validation needed
  const isGuest = email && email.includes('@guest.local');
  if (isGuest) {
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const hash = await bcrypt.hash(password || 'guest', 10);
      const result = await query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3) RETURNING id, name, email, avatar_color, created_at`,
        [name.trim(), email.toLowerCase(), hash]
      );
      const user = result.rows[0];
      await query('INSERT INTO player_stats (user_id) VALUES ($1)', [user.id]);
      const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '30d' });
      return res.status(201).json({ user, token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Real registration — full validation
  if (!name || !username || !email || !password)
    return res.status(400).json({ error: 'Name, username, email and password are required' });

  const usernameError = validateUsername(username);
  if (usernameError) return res.status(400).json({ error: usernameError });

  try {
    // Check email uniqueness
    const existingEmail = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existingEmail.rows.length > 0)
      return res.status(409).json({ error: 'Email already registered' });

    // Check username uniqueness
    const existingUsername = await query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    if (existingUsername.rows.length > 0)
      return res.status(409).json({ error: `@${username} is already taken — try a different username` });

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, username, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, username, email, avatar_color, created_at`,
      [name.trim(), username.toLowerCase().trim(), email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    await query('INSERT INTO player_stats (user_id) VALUES ($1)', [user.id]);

    const token = jwt.sign(
      { id: user.id, name: user.name, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { login, password } = req.body; // login = email OR username
  if (!login || !password)
    return res.status(400).json({ error: 'Username/email and password are required' });

  try {
    // Try to find by email first, then by username
    const result = await query(
      `SELECT id, name, username, email, password_hash, avatar_color
       FROM users
       WHERE email = $1 OR LOWER(username) = LOWER($1)`,
      [login.toLowerCase()]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid username/email or password' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid username/email or password' });

    const token = jwt.sign(
      { id: user.id, name: user.name, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
