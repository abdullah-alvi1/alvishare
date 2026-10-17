const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const logger = require('./utils/logger');
const buildRoutes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp(wsStats = () => ({})) {
  const app = express();
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'", 'ws:', 'wss:'],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': null, // app is used over plain http on a LAN
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: false,
  }));
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','), exposedHeaders: ['Content-Disposition', 'RateLimit-Remaining'] }));
  app.use(compression());
  app.use(express.json({ limit: '10kb' }));
  app.use((req, res, next) => {
    const t = Date.now();
    res.on('finish', () => logger.http(req, res, Date.now() - t));
    next();
  });

  app.use('/api/v1', apiLimiter, buildRoutes(wsStats));
  app.use('/api', notFound);

  app.use(express.static(config.publicDir));
  // SPA fallback: React router handles /r/:key, /about, /usage ...
  app.get('*', (req, res) => res.sendFile(path.join(config.publicDir, 'index.html')));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
