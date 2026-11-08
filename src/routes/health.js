const { Router } = require('express');
const { ok } = require('../utils/response');

/** Liveness only: does not call RPC. */
function healthRoutes() {
  const router = Router();
  router.get('/health', (req, res) => ok(res, { status: 'ok' }));
  return router;
}

module.exports = { healthRoutes };
