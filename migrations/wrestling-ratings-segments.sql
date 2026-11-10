-- Run ONCE on an existing database (after wrestling-roles.sql): adds
--  * card_rating 0-99 (replaces the tier labels; backfilled from the old tier)
--  * promo/segment kinds + headlines
--  * planned alignment turns, and the alignment / rating change logs
ALTER TABLE wr_wrestlers ADD COLUMN card_rating INTEGER NOT NULL DEFAULT 50;
UPDATE wr_wrestlers SET card_rating = CASE tier WHEN 'main_event' THEN 85 WHEN 'upper_card' THEN 70 WHEN 'mid_card' THEN 50 WHEN 'lower_card' THEN 30 WHEN 'enhancement' THEN 12 ELSE 50 END;
ALTER TABLE wr_matches ADD COLUMN segment_kind TEXT NOT NULL DEFAULT '';
ALTER TABLE wr_matches ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE wr_match_participants ADD COLUMN turn_to TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS wr_alignment_changes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  wrestler_id    INTEGER NOT NULL,
  from_alignment TEXT NOT NULL,
  to_alignment   TEXT NOT NULL,
  match_id       INTEGER,
  event_date     TEXT NOT NULL,
  reason         TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wr_align_w ON wr_alignment_changes (wrestler_id);
CREATE INDEX IF NOT EXISTS idx_wr_align_m ON wr_alignment_changes (match_id);
CREATE TABLE IF NOT EXISTS wr_rating_changes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  wrestler_id INTEGER NOT NULL,
  old_rating  INTEGER NOT NULL,
  new_rating  INTEGER NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT 'manual',
  event_id    INTEGER,
  event_date  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wr_rating_w ON wr_rating_changes (wrestler_id);
