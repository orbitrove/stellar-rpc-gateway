const { Router } = require('express');
const { ok } = require('../utils/response');

function feeEstimateRoutes(service) {
  const router = Router();

  // GET /fee-estimate
  router.get('/fee-estimate', async (req, res) => {
    ok(res, await service.getFeeEstimate());
  });

  return router;
}

module.exports = { feeEstimateRoutes };
