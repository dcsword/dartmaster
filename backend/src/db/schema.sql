-- DartMaster Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users / Players
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(30) UNIQUE,
  password_hash VARCHAR(255),
  avatar_color VARCHAR(7) DEFAULT '#e8593c',
  theme_color VARCHAR(7) DEFAULT '#e8293c',
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  bio VARCHAR(160),
  country VARCHAR(50),
  city VARCHAR(50),
  birthday DATE,
  preferred_hand VARCHAR(5) CHECK (preferred_hand IN ('left', 'right')),
  avatar_url TEXT,
  google_id TEXT UNIQUE,
  apple_id TEXT UNIQUE,
  meta_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player lifetime stats (updated after each game)
CREATE TABLE player_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  total_darts INT DEFAULT 0,
  total_score INT DEFAULT 0,
  highest_checkout INT DEFAULT 0,
  best_game_darts INT,
  max_180s INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('singles', 'teams')),
  ruleset VARCHAR(12) NOT NULL CHECK (ruleset IN ('straight_out', 'double_out', 'triple_out')),
  starting_score INT DEFAULT 501,
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'abandoned')),
  winner_id UUID REFERENCES users(id),
  winner_team_id UUID,
  format VARCHAR(10) NOT NULL DEFAULT 'best_of' CHECK (format IN ('best_of', 'first_to')),
  legs_per_set INT NOT NULL DEFAULT 1,
  sets_per_match INT NOT NULL DEFAULT 1,
  current_set INT NOT NULL DEFAULT 1,
  current_leg INT NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- Teams (only used in team mode games)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  score INT DEFAULT 501,
  legs_won INT NOT NULL DEFAULT 0,
  sets_won INT NOT NULL DEFAULT 0,
  "order" INT NOT NULL
);

-- Junction: which players are in which team
CREATE TABLE team_players (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  "order" INT NOT NULL,
  PRIMARY KEY (team_id, user_id)
);

-- Game participants (for singles mode)
CREATE TABLE game_players (
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  score INT DEFAULT 501,
  legs_won INT NOT NULL DEFAULT 0,
  sets_won INT NOT NULL DEFAULT 0,
  "order" INT NOT NULL,
  PRIMARY KEY (game_id, user_id)
);

CREATE TABLE legs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  set_number INT NOT NULL DEFAULT 1,
  leg_number INT NOT NULL DEFAULT 1,
  winner_id UUID REFERENCES users(id),
  winner_team_id UUID REFERENCES teams(id),
  current_thrower_id UUID REFERENCES users(id) ON DELETE SET NULL,
  current_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- Rounds: groups of up to 3 darts per player/team turn
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  leg_id UUID REFERENCES legs(id),
  round_number INT NOT NULL,
  player_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  score_before INT NOT NULL,
  score_after INT NOT NULL,
  is_bust BOOLEAN DEFAULT FALSE,
  is_winning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual darts within a round
CREATE TABLE darts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  dart_number INT NOT NULL CHECK (dart_number IN (1, 2, 3)),
  score INT NOT NULL CHECK (score >= 0 AND score <= 60),
  multiplier INT NOT NULL DEFAULT 1 CHECK (multiplier IN (1, 2, 3)),
  is_bull BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE room_members (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- Indexes for common queries
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_legs_game_id ON legs(game_id);
CREATE INDEX idx_rounds_game_id ON rounds(game_id);
CREATE INDEX idx_darts_round_id ON darts(round_id);
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_team_players_team_id ON team_players(team_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
