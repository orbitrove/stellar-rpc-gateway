const { Router } = require('express');
const { ok } = require('../utils/response');

function networkRoutes(service) {
  const router = Router();

  // GET /network: network info and latest ledger
  router.get('/network', async (req, res) => {
    ok(res, await service.getNetworkInfo());
  });

  // GET /network/health: RPC node health and retention window
  router.get('/network/health', async (req, res) => {
    ok(res, await service.getHealth());
  });

  return router;
}

module.exports = { networkRoutes };
