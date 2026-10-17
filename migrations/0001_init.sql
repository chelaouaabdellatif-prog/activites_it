-- Profils de l'équipe IT (3 emplacements). Le mot de passe est défini à la création du profil.
CREATE TABLE IF NOT EXISTS profiles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slot          INTEGER NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  poste         TEXT    NOT NULL DEFAULT '',
  destinataire  TEXT    NOT NULL DEFAULT 'Direction générale',
  pass_hash     TEXT    NOT NULL,
  pass_salt     TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id   INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category     TEXT    NOT NULL,
  subcategory  TEXT    NOT NULL DEFAULT '',
  title        TEXT    NOT NULL,
  beneficiary  TEXT    NOT NULL DEFAULT '',
  start_date   TEXT    NOT NULL,
  end_date     TEXT,
  status       TEXT    NOT NULL DEFAULT 'en_cours',
  progress     INTEGER NOT NULL DEFAULT 0,
  count        INTEGER NOT NULL DEFAULT 1,
  details      TEXT    NOT NULL DEFAULT '',
  highlight    INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_profile ON tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_dates ON tasks(start_date, end_date);

-- Clé de signature des sessions générée au premier démarrage.
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
