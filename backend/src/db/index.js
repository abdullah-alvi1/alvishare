const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

fs.mkdirSync(config.uploadDir, { recursive: true });
fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS shares (
  key            TEXT PRIMARY KEY,
  delete_token   TEXT NOT NULL,
  password_hash  TEXT,
  downloads      INTEGER NOT NULL DEFAULT 0,
  max_downloads  INTEGER NOT NULL DEFAULT 0,
  total_size     INTEGER NOT NULL,
  uploader_ip    TEXT,
  created_at     INTEGER NOT NULL,
  expires_at     INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS files (
  id             TEXT PRIMARY KEY,
  share_key      TEXT NOT NULL REFERENCES shares(key) ON DELETE CASCADE,
  original_name  TEXT NOT NULL,
  stored_name    TEXT NOT NULL,
  mime_type      TEXT,
  size           INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_share ON files(share_key);
CREATE INDEX IF NOT EXISTS idx_shares_expires ON shares(expires_at);
`);

module.exports = db;
