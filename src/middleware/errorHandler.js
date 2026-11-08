const { AppError } = require('../utils/errors');
const { fail } = require('../utils/response');

function notFound(req, res) {
  return fail(res, 404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return fail(res, err.status, err.code, err.message);
  }

  // Body parser errors (bad JSON, payload too large)
  if (err && err.type === 'entity.parse.failed') {
    return fail(res, 400, 'INVALID_JSON', 'Request body is not valid JSON.');
  }
  if (err && err.type === 'entity.too.large') {
    return fail(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  // Anything else is treated as an upstream/internal failure. Never leak internals.
  return fail(res, 502, 'RPC_ERROR', 'Upstream Stellar RPC request failed.');
}

module.exports = { notFound, errorHandler };
