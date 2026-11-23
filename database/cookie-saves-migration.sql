-- Run this once in the existing Groupcat Games D1 database.
CREATE TABLE IF NOT EXISTS cookie_saves (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  save_data TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cookie_saves_user_updated ON cookie_saves(user_id, updated_at);
