const config = require('../config');
const { lanAddresses } = require('../utils/helpers');
const { activeShareCount, storageUsed } = require('../services/share.service');

exports.health = (stats) => (req, res) => res.json({
  status: 'ok',
  name: config.name,
  version: config.version,
  uptimeSeconds: Math.round(process.uptime()),
  activeShares: activeShareCount(),
  storageUsedBytes: storageUsed(),
  websocket: stats(),
});

exports.config = (req, res) => res.json({
  name: config.name,
  version: config.version,
  maxFileSizeMB: config.maxFileSizeMB,
  maxFileSizeBytes: config.maxFileSizeBytes,
  maxFilesPerShare: config.maxFiles,
  keyLength: config.keyLength,
  defaultExpiryMinutes: config.defaultExpiryMin,
  maxExpiryMinutes: config.maxExpiryMin,
  defaultMaxDownloads: config.defaultMaxDownloads,
  maxDownloadsCap: config.maxDownloadsCap,
  blockedExtensions: config.blockedExtensions,
  websocketPath: config.ws.path,
  lanAddresses: lanAddresses().map((ip) => `http://${ip}:${config.port}`),
});

exports.iceConfig = (req, res) => res.json({ iceServers: config.iceServers });
