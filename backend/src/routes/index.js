const router = require('express').Router();
const { upload, quotaGuard } = require('../middleware/upload');
const { uploadLimiter, lookupLimiter } = require('../middleware/rateLimiter');
const shares = require('../controllers/shares.controller');
const qr = require('../controllers/qr.controller');
const system = require('../controllers/system.controller');

module.exports = (wsStats) => {
  // System
  router.get('/health', system.health(wsStats));
  router.get('/config', system.config);
  router.get('/webrtc/ice-config', system.iceConfig);

  // Shares
  router.post('/shares', uploadLimiter, quotaGuard, upload.any(), shares.create);
  router.get('/shares/:key', lookupLimiter, shares.info);
  router.get('/shares/:key/download', lookupLimiter, shares.download);
  router.get('/shares/:key/qr', lookupLimiter, qr.forShare);
  router.delete('/shares/:key', lookupLimiter, shares.remove);

  // QR utilities
  router.get('/qr', qr.generic);
  router.get('/qr/connect', qr.connect);
  return router;
};
