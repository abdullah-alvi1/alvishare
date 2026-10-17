const multer = require('multer');
const config = require('../config');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

const notFound = (req, res) => res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE: [413, `File exceeds the ${config.maxFileSizeMB} MB limit`, 'FILE_TOO_LARGE'],
      LIMIT_FILE_COUNT: [400, `Maximum ${config.maxFiles} files per share`, 'TOO_MANY_FILES'],
      LIMIT_UNEXPECTED_FILE: [400, 'Unexpected file field', 'UNEXPECTED_FIELD'],
    };
    const [status, error, code] = map[err.code] || [400, err.message, err.code];
    return res.status(status).json({ error, code });
  }
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message, code: err.code });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body', code: 'BAD_JSON' });

  logger.error(err);
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
}

module.exports = { notFound, errorHandler };
