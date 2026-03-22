import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

const router = express.Router();

function validateUsername(username) {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 30) return 'Username must be 30 characters or less';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers and underscores';
  return null;
}

function makeToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, first_name, last_name, username, email, password, birthday, country, city } = req.body;

  // Guest registration
  const isGuest = email && email.includes('@guest.local');
  if (isGuest) {
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const hash = await bcrypt.hash(password || 'guest', 10);
      const result = await query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3) RETURNING id, name, email, avatar_color, theme_color, created_at`,
        [name.trim(), email.toLowerCase(), hash]
      );
      const user = result.rows[0];
      await query('INSERT INTO player_stats (user_id) VALUES ($1)', [user.id]);
      return res.status(201).json({ user, token: makeToken(user) });
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

  // Birthday validation
  let parsedBirthday = null;
  if (birthday) {
    parsedBirthday = new Date(birthday);
    if (isNaN(parsedBirthday)) return res.status(400).json({ error: 'Invalid birthday date' });
    const age = (new Date() - parsedBirthday) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 13) return res.status(400).json({ error: 'You must be at least 13 to register' });
    if (age > 120) return res.status(400).json({ error: 'Invalid birthday date' });
  }

  try {
    const existingEmail = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingEmail.rows.length > 0)
      return res.status(409).json({ error: 'Email already registered' });

    const existingUsername = await query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]
    );
    if (existingUsername.rows.length > 0)
      return res.status(409).json({ error: `@${username} is already taken — try a different username` });

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, first_name, last_name, username, email, password_hash, birthday, country, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, first_name, last_name, username, email, avatar_color, theme_color, theme_color, birthday, country, city, created_at`,
      [
        name.trim(),
        first_name?.trim() || null,
        last_name?.trim() || null,
        username.toLowerCase().trim(),
        email.toLowerCase(),
        hash,
        parsedBirthday || null,
        country?.trim() || null,
        city?.trim() || null,
      ]
    );
    const user = result.rows[0];
    await query('INSERT INTO player_stats (user_id) VALUES ($1)', [user.id]);
    res.status(201).json({ user, token: makeToken(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password)
    return res.status(400).json({ error: 'Username/email and password are required' });

  try {
    const result = await query(
      `SELECT id, name, first_name, last_name, username, email, password_hash, avatar_color, theme_color,
              birthday, country, city, bio, preferred_hand, avatar_url
       FROM users
       WHERE email = $1 OR LOWER(username) = LOWER($1)`,
      [login.toLowerCase()]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid username/email or password' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username/email or password' });

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token: makeToken(safeUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
