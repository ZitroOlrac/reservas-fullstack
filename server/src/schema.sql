-- Esquema de la base de datos (SQLite).
-- Las fechas se guardan como texto ISO 8601 en UTC, que se ordena y compara bien como texto.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS classes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  type         TEXT    NOT NULL CHECK (type IN ('yoga', 'spinning', 'crossfit', 'pilates', 'boxeo')),
  instructor   TEXT    NOT NULL,
  room         TEXT    NOT NULL,
  starts_at    TEXT    NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 15 AND 180),
  capacity     INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_classes_starts_at ON classes (starts_at);

CREATE TABLE IF NOT EXISTS bookings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  class_id   INTEGER NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_class ON bookings (class_id);
