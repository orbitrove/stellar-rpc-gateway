const { Router } = require('express');
const { ok } = require('../utils/response');
const { AppError } = require('../utils/errors');
const { isPlausibleXdr } = require('../utils/validators');

function simulateRoutes(service) {
  const router = Router();

  // POST /simulate  { "xdr": "<base64 transaction envelope>" }
  router.post('/simulate', async (req, res) => {
    const xdr = req.body && req.body.xdr;
    if (!isPlausibleXdr(xdr)) {
      throw new AppError(
        400,
        'INVALID_BODY',
        'Body must be JSON with an "xdr" field containing a base64 transaction envelope.'
      );
    }
    ok(res, await service.simulate(xdr));
  });

  return router;
}

module.exports = { simulateRoutes };
