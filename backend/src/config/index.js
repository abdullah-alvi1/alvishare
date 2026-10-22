require('dotenv').config();
const path = require('path');

const int = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);
const root = path.resolve(__dirname, '../..');

const turn = process.env.TURN_URL
  ? [{ urls: process.env.TURN_URL, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL }]
  : [];
const stunUrls = list(process.env.STUN_URLS || 'stun:stun.l.google.com:19302');

const tp = process.env.TRUST_PROXY;
const trustProxy = tp === undefined || tp === 'false' ? false : tp === 'true' ? true : (/^\d+$/.test(tp) ? parseInt(tp, 10) : tp);

module.exports = {
  name: 'Alvishare',
  version: '1.0.0',
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 3000),
  trustProxy,
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/+$/, ''),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  root,
  uploadDir: path.join(root, 'uploads'),
  dbPath: path.join(root, 'data', 'alvishare.db'),
  publicDir: path.join(root, 'public'),
  maxFileSizeMB: int(process.env.MAX_FILE_SIZE_MB, 500),
  maxFileSizeBytes: int(process.env.MAX_FILE_SIZE_MB, 500) * 1024 * 1024,
  maxFiles: int(process.env.MAX_FILES_PER_SHARE, 10),
  maxStorageBytes: int(process.env.MAX_STORAGE_GB, 20) * 1024 ** 3,
  blockedExtensions: list(process.env.BLOCKED_EXTENSIONS).map((e) => e.replace(/^\./, '').toLowerCase()),
  keyLength: Math.min(Math.max(int(process.env.KEY_LENGTH, 6), 4), 12),
  defaultExpiryMin: int(process.env.DEFAULT_EXPIRY_MINUTES, 30),
  maxExpiryMin: int(process.env.MAX_EXPIRY_MINUTES, 1440),
  defaultMaxDownloads: int(process.env.DEFAULT_MAX_DOWNLOADS, 0),
  maxDownloadsCap: int(process.env.MAX_DOWNLOADS_CAP, 100),
  cleanupIntervalMs: int(process.env.CLEANUP_INTERVAL_SECONDS, 60) * 1000,
  rate: {
    api: int(process.env.RATE_LIMIT_API_PER_MIN, 300),
    upload: int(process.env.RATE_LIMIT_UPLOAD_PER_MIN, 20),
    lookup: int(process.env.RATE_LIMIT_KEY_LOOKUP_PER_MIN, 30),
  },
  iceServers: [{ urls: stunUrls }, ...turn],
  ws: { path: '/ws', maxPayload: 64 * 1024, maxPerIp: int(process.env.WS_MAX_CONNECTIONS_PER_IP, 20) },
};
