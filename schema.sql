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
  broken_image INTEGER NOT NULL DEFAULT 0
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
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
