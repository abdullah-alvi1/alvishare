const fs = require('fs');
const fsp = fs.promises;
const archiver = require('archiver');
const config = require('../config');
const svc = require('../services/share.service');
const { verifyPassword, normalizeKey } = require('../services/key.service');
const { AppError, asyncHandler } = require('../utils/errors');
const { getBaseUrl, sanitizeFilename, safeEqual } = require('../utils/helpers');

const urls = (req, key) => {
  const base = getBaseUrl(req);
  return {
    receive: `${base}/r/${key}`,
    info: `${base}/api/v1/shares/${key}`,
    download: `${base}/api/v1/shares/${key}/download`,
    qr: `${base}/api/v1/shares/${key}/qr`,
  };
};

function view(req, share, files) {
  return {
    key: share.key,
    files: files.map((f) => ({ id: f.id, name: f.original_name, size: f.size, mimeType: f.mime_type })),
    totalSize: share.total_size,
    downloads: share.downloads,
    maxDownloads: share.max_downloads,
    remainingDownloads: share.max_downloads === 0 ? null : Math.max(share.max_downloads - share.downloads, 0),
    passwordProtected: !!share.password_hash,
    createdAt: new Date(share.created_at).toISOString(),
    expiresAt: new Date(share.expires_at).toISOString(),
    expiresInSeconds: Math.max(Math.round((share.expires_at - Date.now()) / 1000), 0),
    urls: urls(req, share.key),
  };
}

function parseOptions(body = {}) {
  const num = (v, name, min, max, dflt) => {
    if (v === undefined || v === '') return dflt;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) {
      throw new AppError(400, `${name} must be an integer between ${min} and ${max}`, 'INVALID_OPTION');
    }
    return n;
  };
  const expiryMinutes = num(body.expiryMinutes, 'expiryMinutes', 1, config.maxExpiryMin, config.defaultExpiryMin);
  const maxDownloads = num(body.maxDownloads, 'maxDownloads', 0, config.maxDownloadsCap, config.defaultMaxDownloads);
  let password = body.password ? String(body.password) : '';
  if (password && (password.length < 4 || password.length > 128)) {
    throw new AppError(400, 'password must be 4-128 characters', 'INVALID_OPTION');
  }
  return { expiryMinutes, maxDownloads, password };
}

/** Loads an active share or throws. Also enforces the password if one is set. */
function requireShare(req, { needPassword = false } = {}) {
  const key = normalizeKey(req.params.key);
  const share = svc.getActiveShare(key);
  if (!share) throw new AppError(404, 'Invalid or expired key', 'KEY_NOT_FOUND');
  if (share.max_downloads > 0 && share.downloads >= share.max_downloads) {
    throw new AppError(410, 'This share has reached its download limit', 'LIMIT_REACHED');
  }
  if (needPassword && share.password_hash) {
    const supplied = req.get('x-share-password') || req.query.password;
    if (!supplied) throw new AppError(401, 'Password required', 'PASSWORD_REQUIRED');
    if (!verifyPassword(supplied, share.password_hash)) throw new AppError(403, 'Wrong password', 'INVALID_PASSWORD');
  }
  return share;
}

exports.create = asyncHandler(async (req, res) => {
  const uploaded = req.files || [];
  const cleanup = () => Promise.all(uploaded.map((f) => fsp.unlink(f.path).catch(() => {})));
  let result;
  try {
    if (!uploaded.length) {
      throw new AppError(400, 'No files received. Send multipart/form-data with one or more "files" fields.', 'NO_FILES');
    }
    const opts = parseOptions(req.body);
    const total = uploaded.reduce((s, f) => s + f.size, 0);
    if (svc.storageUsed() + total > config.maxStorageBytes) {
      throw new AppError(507, 'Server storage is full, try again later', 'STORAGE_FULL');
    }
    result = svc.createShare({
      ...opts,
      ip: req.ip,
      files: uploaded.map((f) => ({
        originalName: sanitizeFilename(f.originalname),
        storedName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
      })),
    });
  } catch (err) {
    await cleanup();
    throw err;
  }
  res.status(201).json({
    ...view(req, result.share, svc.getFiles(result.share.key)),
    deleteToken: result.deleteToken, // shown once - needed for early deletion
  });
});

exports.info = asyncHandler(async (req, res) => {
  const share = requireShare(req);
  res.json(view(req, share, svc.getFiles(share.key)));
});

exports.download = asyncHandler(async (req, res, next) => {
  const share = requireShare(req, { needPassword: true });
  let files = svc.getFiles(share.key);
  if (req.query.file) {
    files = files.filter((f) => f.id === req.query.file);
    if (!files.length) throw new AppError(404, 'File not found in this share', 'FILE_NOT_FOUND');
  }
  if (!svc.consumeDownload(share.key)) throw new AppError(410, 'This share has reached its download limit', 'LIMIT_REACHED');

  res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  // When the final allowed download finishes, remove the share and its files.
  res.on('close', () => {
    const s = svc.getShareRaw(share.key);
    if (s && s.max_downloads > 0 && s.downloads >= s.max_downloads) svc.deleteShare(share.key);
  });

  if (files.length === 1) {
    const f = files[0];
    return res.download(svc.filePath(f.stored_name), f.original_name, { dotfiles: 'allow' }, (err) => {
      if (err && !res.headersSent) next(new AppError(410, 'File is no longer available', 'FILE_GONE'));
    });
  }

  const archive = archiver('zip', { zlib: { level: 1 } });
  archive.on('error', () => res.destroy());
  res.attachment(`alvishare-${share.key}.zip`);
  res.type('application/zip');
  archive.pipe(res);
  const seen = new Map();
  for (const f of files) {
    let name = f.original_name;
    const n = seen.get(name) || 0;
    seen.set(name, n + 1);
    if (n) name = name.replace(/(\.[^.]*)?$/, ` (${n})$1`);
    archive.file(svc.filePath(f.stored_name), { name });
  }
  archive.finalize();
});

exports.remove = asyncHandler(async (req, res) => {
  const key = normalizeKey(req.params.key);
  const share = svc.getShareRaw(key);
  if (!share) throw new AppError(404, 'Invalid or expired key', 'KEY_NOT_FOUND');
  const token = req.get('x-delete-token') || '';
  if (!safeEqual(token, share.delete_token)) throw new AppError(403, 'Invalid delete token', 'INVALID_TOKEN');
  svc.deleteShare(key);
  res.json({ deleted: true, key });
});

exports.requireShare = requireShare;
