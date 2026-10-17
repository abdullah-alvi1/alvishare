const http = require('http');
const config = require('./config');
const logger = require('./utils/logger');
const createApp = require('./app');
const attachSignaling = require('./ws/signaling');
const shares = require('./services/share.service');
const { lanAddresses } = require('./utils/helpers');

let signaling = { stats: () => ({}), close() {} };
const app = createApp(() => signaling.stats());
const server = http.createServer(app);
signaling = attachSignaling(server);

// Large uploads/downloads need generous timeouts
server.requestTimeout = 0;
server.headersTimeout = 65_000;
server.keepAliveTimeout = 65_000;

shares.purgeExpired();
shares.sweepOrphans();
const cleanup = setInterval(() => {
  try { shares.purgeExpired(); } catch (e) { logger.error('cleanup failed', e); }
}, config.cleanupIntervalMs);
const orphanSweep = setInterval(() => { try { shares.sweepOrphans(); } catch (_) {} }, 60 * 60_000);

server.listen(config.port, '0.0.0.0', () => {
  logger.info(`${config.name} v${config.version} running (${config.env})`);
  logger.info(`  Local:   http://localhost:${config.port}`);
  lanAddresses().forEach((ip) => logger.info(`  Network: http://${ip}:${config.port}   <- open this on other devices`));
  logger.info(`  WebSocket: ws://localhost:${config.port}${config.ws.path}`);
  logger.info(`  Max file size: ${config.maxFileSizeMB} MB, key length: ${config.keyLength}`);
});

function shutdown(sig) {
  logger.info(`${sig} received, shutting down...`);
  clearInterval(cleanup);
  clearInterval(orphanSweep);
  signaling.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (e) => logger.error('unhandledRejection', e));
