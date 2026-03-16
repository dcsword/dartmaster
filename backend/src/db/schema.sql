-- DartMaster Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users / Players
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  avatar_color VARCHAR(7) DEFAULT '#e8593c',
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
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- Teams (only used in team mode games)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  score INT DEFAULT 501,
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
  "order" INT NOT NULL,
  PRIMARY KEY (game_id, user_id)
);

-- Rounds: groups of up to 3 darts per player/team turn
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
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

-- Indexes for common queries
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_rounds_game_id ON rounds(game_id);
CREATE INDEX idx_darts_round_id ON darts(round_id);
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_team_players_team_id ON team_players(team_id);
