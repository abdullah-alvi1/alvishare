const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const { AppError } = require('../utils/errors');
const { sanitizeFilename } = require('../utils/helpers');
const { storageUsed } = require('../services/share.service');

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (req, file, cb) => cb(null, crypto.randomUUID()), // no extension, no user-controlled name
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(sanitizeFilename(file.originalname)).slice(1).toLowerCase();
  if (ext && config.blockedExtensions.includes(ext)) {
    return cb(new AppError(415, `Files of type .${ext} are not allowed`, 'BLOCKED_TYPE'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxFileSizeBytes, files: config.maxFiles },
});

/** Reject early (before reading the body) if the server disk quota would be exceeded. */
function quotaGuard(req, res, next) {
  const incoming = parseInt(req.headers['content-length'] || '0', 10);
  if (storageUsed() + incoming > config.maxStorageBytes) {
    return next(new AppError(507, 'Server storage is full, try again later', 'STORAGE_FULL'));
  }
  next();
}

module.exports = { upload, quotaGuard };
