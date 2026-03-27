-- ============================================================
-- DartMaster — All Database Migrations
-- Run these IN ORDER against your Railway PostgreSQL database
-- Each block is idempotent (safe to re-run)
-- ============================================================


-- ── Migration 1: Legs & Sets ─────────────────────────────────
-- Adds match format, legs tracking, sets tracking

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS format VARCHAR(10) NOT NULL DEFAULT 'best_of'
    CHECK (format IN ('best_of', 'first_to')),
  ADD COLUMN IF NOT EXISTS legs_per_set INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sets_per_match INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_set INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_leg INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS legs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  set_number INT NOT NULL DEFAULT 1,
  leg_number INT NOT NULL DEFAULT 1,
  winner_id UUID REFERENCES users(id),
  winner_team_id UUID REFERENCES teams(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

ALTER TABLE game_players
  ADD COLUMN IF NOT EXISTS legs_won INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sets_won INT NOT NULL DEFAULT 0;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS legs_won INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sets_won INT NOT NULL DEFAULT 0;

ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS leg_id UUID REFERENCES legs(id);

CREATE INDEX IF NOT EXISTS idx_legs_game_id ON legs(game_id);


-- ── Migration 2: Username & Extended Profile ──────────────────
-- Adds username, profile fields, social login IDs

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE,
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bio VARCHAR(160),
  ADD COLUMN IF NOT EXISTS country VARCHAR(50),
  ADD COLUMN IF NOT EXISTS city VARCHAR(50),
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS preferred_hand VARCHAR(5) CHECK (preferred_hand IN ('left', 'right')),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS apple_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS meta_id TEXT UNIQUE;

-- Fix duplicate usernames from guest accounts (run once)
UPDATE users
SET username = NULL
WHERE email LIKE '%@guest.local' AND username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
  ON users (LOWER(username))
  WHERE username IS NOT NULL;


-- ── Migration 3: Theme Color ──────────────────────────────────
-- Adds per-user app accent color

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) DEFAULT '#e8293c';


-- ── Migration 4: 180s Tracking ────────────────────────────────
-- Adds 180s (maximum score) counter to player stats

ALTER TABLE player_stats
  ADD COLUMN IF NOT EXISTS max_180s INT NOT NULL DEFAULT 0;


-- ── Migration 5: Refresh Tokens ──────────────────────────────
-- Enables JWT token revocation (logout, stolen token protection)

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON refresh_tokens(expires_at);


-- ── Migration 6: Server-side Turn Order ──────────────────────
-- Tracks whose turn it is in the database (prevents cheating)

ALTER TABLE legs
  ADD COLUMN IF NOT EXISTS current_thrower_id UUID
    REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_team_id UUID
    REFERENCES teams(id) ON DELETE SET NULL;


-- ── Done ──────────────────────────────────────────────────────
-- Verify all tables exist:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
