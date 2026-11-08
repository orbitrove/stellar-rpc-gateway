const rateLimit = require('express-rate-limit');

function createRateLimiter(config) {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down.' },
    },
  });
}

module.exports = { createRateLimiter };
