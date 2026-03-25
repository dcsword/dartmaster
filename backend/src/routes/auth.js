import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../db/pool.js';
import { sendWelcomeEmail } from '../services/email.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function validateUsername(username) {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 30) return 'Username must be 30 characters or less';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers and underscores';
  return null;
}

// Access token — short lived (15 min)
function makeAccessToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

// Refresh token — long lived (7 days), stored hashed in DB
async function createRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt]
  );
  return token; // return raw token to send to client
}

function tokenResponse(user, accessToken, refreshToken) {
  return { user, token: accessToken, refreshToken };
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, first_name, last_name, username, email, password, birthday, country, city } = req.body;

  const isGuest = email && email.includes('@guest.local');
  if (isGuest) {
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const hash = await bcrypt.hash(password || crypto.randomUUID(), 10);
      const result = await query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3) RETURNING id, name, email, avatar_color, theme_color, created_at`,
        [name.trim(), email.toLowerCase(), hash]
      );
      const user = result.rows[0];
      await query('INSERT INTO player_stats (user_id) VALUES ($1)', [user.id]);
      return res.status(201).json({ user, token: makeAccessToken(user), refreshToken: null });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (!name || !username || !email || !password)
    return res.status(400).json({ error: 'Name, username, email and password are required' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (password.length > 128)
    return res.status(400).json({ error: 'Password too long' });

  const usernameError = validateUsername(username);
  if (usernameError) return res.status(400).json({ error: usernameError });

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

    const existingUsername = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if (existingUsername.rows.length > 0)
      return res.status(409).json({ error: `@${username} is already taken — try a different username` });

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (name, first_name, last_name, username, email, password_hash, birthday, country, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, first_name, last_name, username, email, avatar_color, theme_color, birthday, country, city, created_at`,
      [
        name.trim(), first_name?.trim() || null, last_name?.trim() || null,
        username.toLowerCase().trim(), email.toLowerCase(), hash,
        parsedBirthday || null, country?.trim() || null, city?.trim() || null,
      ]
    );
    const user = result.rows[0];
    await query('INSERT INTO player_stats (user_id) VALUES ($1)', [user.id]);
    sendWelcomeEmail({ name: user.name, email: user.email });
    const accessToken = makeAccessToken(user);
    const refreshToken = await createRefreshToken(user.id);
    res.status(201).json(tokenResponse(user, accessToken, refreshToken));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password)
    return res.status(400).json({ error: 'Username/email and password are required' });

  try {
    const result = await query(
      `SELECT id, name, first_name, last_name, username, email, password_hash, avatar_color, theme_color,
              birthday, country, city, bio, preferred_hand, avatar_url
       FROM users WHERE email = $1 OR LOWER(username) = LOWER($1)`,
      [login.toLowerCase()]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid username/email or password' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username/email or password' });

    const { password_hash, ...safeUser } = user;
    const accessToken = makeAccessToken(safeUser);
    const refreshToken = await createRefreshToken(safeUser.id);
    res.json(tokenResponse(safeUser, accessToken, refreshToken));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, given_name, family_name } = ticket.getPayload();

    // Existing Google user
    let result = await query(
      `SELECT id, name, first_name, last_name, username, email, avatar_color, theme_color,
              birthday, country, city, bio, preferred_hand
       FROM users WHERE google_id = $1`,
      [googleId]
    );
    if (result.rows.length > 0) {
      const u = result.rows[0];
      const accessToken = makeAccessToken(u);
      const refreshToken = await createRefreshToken(u.id);
      return res.json(tokenResponse(u, accessToken, refreshToken));
    }

    // Email already registered — link Google to existing account
    const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (emailCheck.rows.length > 0) {
      await query('UPDATE users SET google_id = $1 WHERE email = $2', [googleId, email.toLowerCase()]);
      const linked = await query(
        `SELECT id, name, first_name, last_name, username, email, avatar_color, theme_color,
                birthday, country, city, bio, preferred_hand
         FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );
      const lu = linked.rows[0];
      const lat = makeAccessToken(lu);
      const lrt = await createRefreshToken(lu.id);
      return res.json({ ...tokenResponse(lu, lat, lrt), isNew: false, linked: true });
    }

    // New user — auto-generate unique username
    const baseUsername = (name || email.split('@')[0])
      .toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_').slice(0, 25);
    let username = baseUsername;
    let attempt = 0;
    while (true) {
      const taken = await query('SELECT id FROM users WHERE username = $1', [username]);
      if (taken.rows.length === 0) break;
      username = `${baseUsername}${++attempt}`;
    }

    const newUser = await query(
      `INSERT INTO users (name, first_name, last_name, username, email, google_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, first_name, last_name, username, email, avatar_color, theme_color, created_at`,
      [name || email.split('@')[0], given_name || null, family_name || null, username, email.toLowerCase(), googleId]
    );
    const user = newUser.rows[0];
    await query('INSERT INTO player_stats (user_id) VALUES ($1)', [user.id]);
    sendWelcomeEmail({ name: user.name, email: user.email });
    const gat = makeAccessToken(user);
    const grt = await createRefreshToken(user.id);
    res.status(201).json({ ...tokenResponse(user, gat, grt), isNew: true });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google sign-in failed — please try again' });
  }
});

export default router;

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
// Exchange a valid refresh token for a new access token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const result = await query(
      `SELECT rt.user_id, rt.expires_at, u.id, u.name, u.username, u.email,
              u.avatar_color, u.theme_color, u.first_name, u.last_name
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [hash]
    );

    if (!result.rows.length)
      return res.status(401).json({ error: 'Invalid refresh token' });

    const row = result.rows[0];
    if (new Date(row.expires_at) < new Date())
      return res.status(401).json({ error: 'Refresh token expired — please log in again' });

    // Issue new access token
    const accessToken = makeAccessToken(row);
    res.json({ token: accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
// Revoke the refresh token — truly invalidates the session
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(200).json({ ok: true }); // already logged out

  try {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
