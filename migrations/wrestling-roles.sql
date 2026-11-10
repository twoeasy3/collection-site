-- Run ONCE on an existing database: adds non-competing participant roles (corner, interference, run-ins)
-- and the tournament tables. Fresh installs get all of this from schema.sql already.
ALTER TABLE wr_match_participants ADD COLUMN role TEXT NOT NULL DEFAULT 'competitor';
ALTER TABLE wr_match_participants ADD COLUMN note TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS wr_tournaments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  brand_id     INTEGER,
  title_id     INTEGER,
  entrant_size INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'active',
  description  TEXT NOT NULL DEFAULT '',
  winner_entrant_id INTEGER,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wr_tournament_entrants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  seed          INTEGER NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  team_id       INTEGER,
  members       TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_wr_tent_t ON wr_tournament_entrants (tournament_id);
CREATE TABLE IF NOT EXISTS wr_tournament_ties (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  round         INTEGER NOT NULL,
  pos           INTEGER NOT NULL,
  a_entrant_id  INTEGER,
  b_entrant_id  INTEGER,
  winner_entrant_id INTEGER,
  match_id      INTEGER,
  UNIQUE (tournament_id, round, pos)
);
