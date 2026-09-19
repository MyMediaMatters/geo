-- @mmm/geo — answer-engine visibility tracker.
--
-- The schema only. The QUERY SET is client-specific and is seeded by the client
-- site, not here: the version this replaces shipped one client's ten questions
-- inside the shared migration, which is how a roofing account ended up running
-- a med spa's extraction prompt.
--
-- `rank` and `competitors` exist because mention alone only says a company
-- exists. Rank says whether anyone would call them first, and the competitor
-- list says who gets called instead.

CREATE TABLE IF NOT EXISTS geo_queries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  query      TEXT    NOT NULL,
  active     INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS geo_results (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  query_id    INTEGER REFERENCES geo_queries(id) ON DELETE CASCADE,
  query       TEXT    NOT NULL,
  engine      TEXT    NOT NULL,        -- claude | perplexity | openai
  mentioned   INTEGER NOT NULL DEFAULT 0,
  cited       INTEGER NOT NULL DEFAULT 0,
  excerpt     TEXT,
  sources     TEXT,                    -- JSON array of source URLs
  rank        INTEGER,                 -- 1-based position, NULL if not recommended
  competitors TEXT,                    -- JSON array of the businesses named instead
  checked_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_geo_results_recent ON geo_results (checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_results_query  ON geo_results (query_id, engine, checked_at DESC);
