const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const { generateKey, generateToken, hashPassword } = require('./key.service');

const q = {
  exists: db.prepare('SELECT 1 FROM shares WHERE key = ?'),
  insertShare: db.prepare(`INSERT INTO shares (key, delete_token, password_hash, max_downloads, total_size, uploader_ip, created_at, expires_at)
                           VALUES (@key, @delete_token, @password_hash, @max_downloads, @total_size, @uploader_ip, @created_at, @expires_at)`),
  insertFile: db.prepare(`INSERT INTO files (id, share_key, original_name, stored_name, mime_type, size)
                          VALUES (@id, @share_key, @original_name, @stored_name, @mime_type, @size)`),
  active: db.prepare('SELECT * FROM shares WHERE key = ? AND expires_at > ?'),
  raw: db.prepare('SELECT * FROM shares WHERE key = ?'),
  files: db.prepare('SELECT * FROM files WHERE share_key = ? ORDER BY rowid'),
  consume: db.prepare(`UPDATE shares SET downloads = downloads + 1
                       WHERE key = ? AND expires_at > ? AND (max_downloads = 0 OR downloads < max_downloads)`),
  del: db.prepare('DELETE FROM shares WHERE key = ?'),
  expired: db.prepare('SELECT key FROM shares WHERE expires_at <= ?'),
  used: db.prepare('SELECT COALESCE(SUM(total_size), 0) AS n FROM shares'),
  count: db.prepare('SELECT COUNT(*) AS n FROM shares WHERE expires_at > ?'),
  storedNames: db.prepare('SELECT stored_name FROM files'),
};

const filePath = (storedName) => path.join(config.uploadDir, storedName);

function createShare({ files, expiryMinutes, maxDownloads, password, ip }) {
  let key = null;
  for (let i = 0; i < 20 && !key; i++) {
    const k = generateKey(config.keyLength);
    if (!q.exists.get(k)) key = k;
  }
  if (!key) throw new AppError(503, 'Could not allocate a unique key, try again', 'KEY_EXHAUSTED');

  const now = Date.now();
  const deleteToken = generateToken();
  db.transaction(() => {
    q.insertShare.run({
      key,
      delete_token: deleteToken,
      password_hash: password ? hashPassword(password) : null,
      max_downloads: maxDownloads,
      total_size: files.reduce((s, f) => s + f.size, 0),
      uploader_ip: ip || null,
      created_at: now,
      expires_at: now + expiryMinutes * 60_000,
    });
    for (const f of files) {
      q.insertFile.run({
        id: crypto.randomBytes(6).toString('hex'),
        share_key: key,
        original_name: f.originalName,
        stored_name: f.storedName,
        mime_type: f.mimeType,
        size: f.size,
      });
    }
  })();
  return { share: q.raw.get(key), deleteToken };
}

const getActiveShare = (key) => q.active.get(key, Date.now());
const getShareRaw = (key) => q.raw.get(key);
const getFiles = (key) => q.files.all(key);
const consumeDownload = (key) => q.consume.run(key, Date.now()).changes === 1;
const storageUsed = () => q.used.get().n;
const activeShareCount = () => q.count.get(Date.now()).n;

function deleteShare(key) {
  const files = q.files.all(key);
  q.del.run(key);
  for (const f of files) fs.unlink(filePath(f.stored_name), () => {});
}

function purgeExpired() {
  const rows = q.expired.all(Date.now());
  rows.forEach((r) => deleteShare(r.key));
  if (rows.length) logger.info(`cleanup: removed ${rows.length} expired share(s)`);
  return rows.length;
}

/** Remove files on disk that no DB row references (crashed/aborted uploads). */
function sweepOrphans() {
  const known = new Set(q.storedNames.all().map((r) => r.stored_name));
  let removed = 0;
  for (const name of fs.readdirSync(config.uploadDir)) {
    if (name === '.gitkeep' || known.has(name)) continue;
    const p = filePath(name);
    try {
      if (Date.now() - fs.statSync(p).mtimeMs > 60 * 60_000) { fs.unlinkSync(p); removed++; }
    } catch (_) { /* ignore */ }
  }
  if (removed) logger.info(`cleanup: removed ${removed} orphan file(s)`);
}

module.exports = {
  createShare, getActiveShare, getShareRaw, getFiles, consumeDownload, deleteShare,
  purgeExpired, sweepOrphans, storageUsed, activeShareCount, filePath,
};
