import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import playerRoutes from './routes/players.js';
import gameRoutes from './routes/games.js';
import roomRoutes from './routes/rooms.js';
import statsRoutes from './routes/stats.js';

dotenv.config();

const app = express();

// ── Security headers (#4) ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // needed for QR image loading
  contentSecurityPolicy: false,     // managed by Vercel on the frontend
}));

// ── CORS — localhost only in development (#9) ────────────────────────────────
const allowed = [process.env.FRONTEND_URL].filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  allowed.push('http://localhost:5173', 'http://localhost:3000');
}

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ── Body size limit (#16) ────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));

// ── Rate limiting (#1) ───────────────────────────────────────────────────────
// Strict limiter for auth endpoints — 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts — please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Room join limiter — 5 attempts per minute per IP
const roomJoinLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many room join attempts — please wait a moment' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global API limiter — 200 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests — please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/google', authLimiter);
app.use('/api/rooms/join', roomJoinLimiter);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/stats', statsRoutes);

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`DartMaster backend running on port ${PORT}`));
