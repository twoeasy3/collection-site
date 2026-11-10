CREATE TABLE IF NOT EXISTS makes (
  name      TEXT PRIMARY KEY,
  countries TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS cars (
  id          INTEGER PRIMARY KEY,
  year        TEXT,
  make        TEXT,
  model       TEXT,
  supername   TEXT,
  brand       TEXT,
  series      TEXT,
  country     TEXT,
  category    TEXT,
  description TEXT,
  broken_image INTEGER NOT NULL DEFAULT 0,
  ai_suggested TEXT NOT NULL DEFAULT '{}', -- JSON {field: confidence} for AI-suggested fields still pending review
  ai_rejected  TEXT NOT NULL DEFAULT ''    -- plain-text note left when rejecting an AI suggestion on this car, surfaced to the next AI attempt then cleared
);

CREATE TABLE IF NOT EXISTS coffee_stops (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  lat          REAL NOT NULL,
  lng          REAL NOT NULL,
  rating       REAL NOT NULL DEFAULT 0,     -- overall, 0-5 in 0.5 steps
  genre        INTEGER NOT NULL DEFAULT 5,  -- spectrum, 0 Dessert - 5 Kopi - 10 Exotic
  price        INTEGER NOT NULL DEFAULT 5,  -- 1-10
  notes        TEXT,
  location     TEXT,                        -- mall/building name, optional
  image_url    TEXT,                        -- banner image, optional
  date_visited TEXT,                        -- deprecated, superseded by visit_dates; left in place, unused
  visit_dates  TEXT NOT NULL DEFAULT '[]',   -- JSON array of ISO date strings, one per visit
  is_lunch     INTEGER NOT NULL DEFAULT 0,   -- 1 if this is a lunch spot rather than a coffee stop
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Per-vehicle stats, keyed like statsKeyFor() in src/utils/carStats.js. Shared by
-- every car with the same Make|Model|Year. Rating is not stored: the site computes
-- it from the stats plus hd. Seeded by stats_to_sql.py; rows with edited = 1 keep
-- their stats on re-seed, and base holds the pipeline values for Reset.
CREATE TABLE IF NOT EXISTS vehicle_stats (
  key        TEXT PRIMARY KEY,
  cl         TEXT NOT NULL DEFAULT 'U',
  ar         TEXT NOT NULL DEFAULT 'balanced',
  ts         REAL NOT NULL DEFAULT 0,
  ac         REAL NOT NULL DEFAULT 0,
  ha         REAL NOT NULL DEFAULT 0,
  ni         REAL NOT NULL DEFAULT 0,
  st         REAL NOT NULL DEFAULT 0,
  cr         REAL NOT NULL DEFAULT 0,
  hd         INTEGER NOT NULL DEFAULT 0,
  base       TEXT NOT NULL DEFAULT '{}',
  edited     INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Secret Santa (private page at /secret-santa). One row per possible entrant,
-- loaded from the admin panel on that page (paste a JSON list of {name, code}).
-- The code itself is never stored, only a SHA-256 of it. `pairing` is the
-- giver's assigned giftee id, AES-GCM-encrypted (see src/secretSanta/api.js) so
-- browsing this table doesn't show who has whom. It's NULL until the draw;
-- a non-NULL `pairing` on any row means the pool is closed.
CREATE TABLE IF NOT EXISTS santa_entrants (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  code_hash  TEXT NOT NULL UNIQUE,
  joined     INTEGER NOT NULL DEFAULT 0,
  wants      TEXT NOT NULL DEFAULT '[]',  -- JSON array of strings
  avoid      TEXT NOT NULL DEFAULT '[]',  -- JSON array of strings: "please don't buy me"
  pairing    TEXT,                        -- encrypted giftee id, NULL before the draw
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════════════
-- Plushie Wrestling booking league (admin-only page at /wrestling, API at
-- /api/wr/*, see src/wrestling/). All tables are prefixed wr_. Relations are
-- by id with no FOREIGN KEY constraints (same as the rest of this schema); the
-- Worker does the cascading deletes. Apply with:
--   wrangler d1 execute collection-data --remote --file=schema.sql
-- (every statement is IF NOT EXISTS / INSERT OR IGNORE, so it is safe to re-run)
-- ═══════════════════════════════════════════════════════════════════════════

-- 2 major brands + 1 developmental. brand_id NULL elsewhere = cross-brand /
-- free agent.
CREATE TABLE IF NOT EXISTS wr_brands (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL DEFAULT 'major',   -- 'major' | 'developmental'
  color       TEXT NOT NULL DEFAULT '#888888',
  description TEXT NOT NULL DEFAULT ''
);

-- A recurring programme: a weekly TV show on one brand, or a Pay-Per-View /
-- special (brand_id NULL = cross-brand, drawing from both majors).
CREATE TABLE IF NOT EXISTS wr_shows (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  brand_id    INTEGER,                         -- NULL = cross-brand
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'weekly',  -- 'weekly' | 'ppv' | 'special'
  weekday     INTEGER,                         -- 0=Sun..6=Sat for weeklies, else NULL
  description TEXT NOT NULL DEFAULT ''
);

-- The plushies. `image` is a PNG file name (placeholder shown until it exists).
CREATE TABLE IF NOT EXISTS wr_wrestlers (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  species   TEXT NOT NULL DEFAULT '',          -- the animal, e.g. 'Bear'
  brand_id  INTEGER,                           -- NULL = free agent
  image     TEXT NOT NULL DEFAULT '',          -- e.g. 'bruno.png'
  alignment TEXT NOT NULL DEFAULT 'face',      -- 'face' | 'heel' | 'tweener'
  tier      TEXT NOT NULL DEFAULT 'mid_card',  -- 'main_event' | 'upper_card' | 'mid_card' | 'lower_card' | 'enhancement'
  status    TEXT NOT NULL DEFAULT 'active',    -- 'active' | 'injured' | 'retired'
  finisher  TEXT NOT NULL DEFAULT '',
  gimmick   TEXT NOT NULL DEFAULT '',
  bio       TEXT NOT NULL DEFAULT ''
);

-- Championships. holders_count: 1 singles, 2 tag, 3 trios.
CREATE TABLE IF NOT EXISTS wr_titles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  brand_id     INTEGER,                        -- NULL = cross-brand
  type         TEXT NOT NULL DEFAULT 'singles',-- 'singles' | 'tag' | 'trios'
  holders_count INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'active', -- 'active' | 'retired'
  description  TEXT NOT NULL DEFAULT ''
);

-- One row per reign; end_date NULL = current champion(s). Vacant = no open reign.
CREATE TABLE IF NOT EXISTS wr_title_reigns (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id     INTEGER NOT NULL,
  start_date   TEXT NOT NULL,                  -- ISO yyyy-mm-dd
  end_date     TEXT,
  won_match_id INTEGER,                        -- the match that crowned them, if any
  notes        TEXT NOT NULL DEFAULT ''
);
-- Holders of a reign (1 for singles, 2+ for tag/trios).
CREATE TABLE IF NOT EXISTS wr_reign_holders (
  reign_id    INTEGER NOT NULL,
  wrestler_id INTEGER NOT NULL,
  PRIMARY KEY (reign_id, wrestler_id)
);

-- Tag teams, stables and alliances.
CREATE TABLE IF NOT EXISTS wr_teams (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'tag_team',-- 'tag_team' | 'stable' | 'alliance'
  brand_id    INTEGER,
  status      TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'disbanded'
  formed_date TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS wr_team_members (
  team_id     INTEGER NOT NULL,
  wrestler_id INTEGER NOT NULL,
  role        TEXT NOT NULL DEFAULT '',        -- e.g. 'leader'
  PRIMARY KEY (team_id, wrestler_id)
);

-- Rivalries. heat 1-5 drives how soon the AI builds toward a blow-off.
CREATE TABLE IF NOT EXISTS wr_feuds (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  brand_id       INTEGER,
  status         TEXT NOT NULL DEFAULT 'building', -- 'building' | 'active' | 'blow_off' | 'ended'
  heat           INTEGER NOT NULL DEFAULT 1,
  description    TEXT NOT NULL DEFAULT '',     -- the story so far / intent
  planned_finale TEXT NOT NULL DEFAULT '',     -- e.g. 'Winter Crush PPV, Ladder match'
  started_date   TEXT NOT NULL DEFAULT '',
  ended_date     TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS wr_feud_participants (
  feud_id     INTEGER NOT NULL,
  wrestler_id INTEGER NOT NULL,
  side        TEXT NOT NULL DEFAULT 'A',       -- 'A' vs 'B' (or more)
  PRIMARY KEY (feud_id, wrestler_id)
);

-- Match types: singles, tag, multi-animal, handicap, N-way, gimmick matches.
CREATE TABLE IF NOT EXISTS wr_stipulations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL DEFAULT 'standard',-- 'standard' | 'multi' | 'handicap' | 'n_way' | 'gimmick'
  description TEXT NOT NULL DEFAULT '',
  min_sides   INTEGER NOT NULL DEFAULT 2,
  max_sides   INTEGER NOT NULL DEFAULT 2
);

-- One occurrence of a show on a date = one booked card. UNIQUE(show, date).
CREATE TABLE IF NOT EXISTS wr_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  show_id      INTEGER NOT NULL,
  event_date   TEXT NOT NULL,                  -- ISO yyyy-mm-dd
  name         TEXT NOT NULL DEFAULT '',       -- episode title / PPV name
  status       TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'booked' | 'completed'
  notes        TEXT NOT NULL DEFAULT '',
  ai_rationale TEXT NOT NULL DEFAULT '',       -- why the AI booked it this way
  UNIQUE (show_id, event_date)
);
CREATE INDEX IF NOT EXISTS idx_wr_events_date ON wr_events (event_date);

-- A card segment. Planned fields are set when booking; the result fields and
-- `report` are filled in after the show and are what the AI reads back to keep
-- storylines coherent.
CREATE TABLE IF NOT EXISTS wr_matches (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      INTEGER NOT NULL,
  card_order    INTEGER NOT NULL DEFAULT 0,
  segment_type  TEXT NOT NULL DEFAULT 'match', -- 'match' | 'promo' | 'angle'
  stipulation_id INTEGER,
  title_id      INTEGER,                       -- set = championship match
  feud_id       INTEGER,
  is_main_event INTEGER NOT NULL DEFAULT 0,
  planned_notes TEXT NOT NULL DEFAULT '',      -- booking intent / storyline beat
  status        TEXT NOT NULL DEFAULT 'booked',-- 'booked' | 'completed' | 'cancelled'
  finish_type   TEXT NOT NULL DEFAULT '',      -- 'pinfall' | 'submission' | 'dq' | 'countout' | 'no_contest' | 'other'
  duration_min  INTEGER,
  rating        REAL,                          -- 0-5 stars
  title_changed INTEGER NOT NULL DEFAULT 0,
  report        TEXT NOT NULL DEFAULT ''       -- match report / what happened
);
CREATE INDEX IF NOT EXISTS idx_wr_matches_event ON wr_matches (event_id);

-- Who is in a match. N-way: every participant gets a distinct side. Tag/handicap:
-- partners share a side. result is set when the match is completed.
CREATE TABLE IF NOT EXISTS wr_match_participants (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id    INTEGER NOT NULL,
  wrestler_id INTEGER NOT NULL,
  team_id     INTEGER,                         -- set when they entered as a team
  side        INTEGER NOT NULL DEFAULT 1,
  result      TEXT NOT NULL DEFAULT ''         -- '' | 'win' | 'loss' | 'draw' | 'nc'
);
CREATE INDEX IF NOT EXISTS idx_wr_mp_match ON wr_match_participants (match_id);
CREATE INDEX IF NOT EXISTS idx_wr_mp_wrestler ON wr_match_participants (wrestler_id);

-- History of Claude booking suggestions (for review / debugging).
CREATE TABLE IF NOT EXISTS wr_ai_runs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  show_id    INTEGER,
  event_date TEXT NOT NULL,
  notes      TEXT NOT NULL DEFAULT '',
  response   TEXT NOT NULL DEFAULT '',         -- JSON suggestion
  model      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed data: the three brands and a starter set of stipulations.
INSERT OR IGNORE INTO wr_brands (name, kind, color, description) VALUES
  ('Velvet Thunder', 'major', '#c0392b', 'Red brand: big heavy-hitters and spectacle.'),
  ('Fuzzy Fury', 'major', '#2980b9', 'Blue brand: technical wrestlers and high flyers.'),
  ('Stitch Academy', 'developmental', '#27ae60', 'Developmental brand: newcomers earning their stripes.');

INSERT OR IGNORE INTO wr_stipulations (name, kind, description, min_sides, max_sides) VALUES
  ('Singles', 'standard', 'One plushie vs one plushie.', 2, 2),
  ('Tag Team', 'multi', '2 vs 2.', 2, 2),
  ('Trios', 'multi', '3 vs 3.', 2, 2),
  ('Handicap 2-on-1', 'handicap', 'Two plushies against one.', 2, 2),
  ('Handicap 3-on-1', 'handicap', 'Three plushies against one.', 2, 2),
  ('Triple Threat', 'n_way', 'Three plushies, every one for themselves.', 3, 3),
  ('Fatal 4-Way', 'n_way', 'Four plushies, one fall decides it.', 4, 4),
  ('Six-Pack Challenge', 'n_way', 'Six plushies, every one for themselves.', 6, 6),
  ('Battle Royal', 'n_way', 'Many plushies, over-the-top-rope eliminations.', 6, 20),
  ('Ladder Match', 'gimmick', 'Retrieve the prize hung above the ring.', 2, 6),
  ('Cage Match', 'gimmick', 'Steel cage; escape or pinfall.', 2, 2),
  ('Last Plushie Standing', 'gimmick', 'Falls count only once the opponent cannot answer the ten-count.', 2, 2),
  ('I Quit', 'gimmick', 'Win only when the opponent says it.', 2, 2),
  ('Tables Match', 'gimmick', 'Put your opponent through a table.', 2, 2);
