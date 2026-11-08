const { Router } = require('express');
const { ok } = require('../utils/response');
const { AppError } = require('../utils/errors');
const { isValidAccountId } = require('../utils/validators');

function accountRoutes(service) {
  const router = Router();

  // GET /account/:id
  router.get('/account/:id', async (req, res) => {
    if (!isValidAccountId(req.params.id)) {
      throw new AppError(400, 'INVALID_ACCOUNT_ID', 'Account ID must be a valid G... address.');
    }
    ok(res, await service.getAccount(req.params.id));
  });

  return router;
}

module.exports = { accountRoutes };
