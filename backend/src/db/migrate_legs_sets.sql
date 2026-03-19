-- DartMaster Migration: Legs & Sets support
-- Run this against your existing database on Railway

-- Add match format columns to games table
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS format VARCHAR(10) NOT NULL DEFAULT 'best_of'
    CHECK (format IN ('best_of', 'first_to')),
  ADD COLUMN IF NOT EXISTS legs_per_set INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sets_per_match INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_set INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_leg INT NOT NULL DEFAULT 1;

-- Legs table: tracks each individual leg within a match
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

-- Leg scores: score per player/team at the start of each leg (always 501)
-- and tracks current score within the leg
ALTER TABLE game_players
  ADD COLUMN IF NOT EXISTS legs_won INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sets_won INT NOT NULL DEFAULT 0;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS legs_won INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sets_won INT NOT NULL DEFAULT 0;

-- Add leg_id to rounds so we know which leg each round belongs to
ALTER TABLE rounds
  ADD COLUMN IF NOT EXISTS leg_id UUID REFERENCES legs(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_legs_game_id ON legs(game_id);
