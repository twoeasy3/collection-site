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
