const rateLimit = require('express-rate-limit');
const config = require('../config');

const make = (limit, message) =>
  rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message, code: 'RATE_LIMITED' },
  });

module.exports = {
  apiLimiter: make(config.rate.api, 'Too many requests, slow down'),
  uploadLimiter: make(config.rate.upload, 'Too many uploads, try again in a minute'),
  lookupLimiter: make(config.rate.lookup, 'Too many key attempts, try again in a minute'),
};
