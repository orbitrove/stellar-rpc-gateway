const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { createRateLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { healthRoutes } = require('./routes/health');
const { networkRoutes } = require('./routes/network');
const { feeEstimateRoutes } = require('./routes/feeEstimate');
const { simulateRoutes } = require('./routes/simulate');
const { accountRoutes } = require('./routes/account');
const { ok } = require('./utils/response');

const ENDPOINTS = [
  'GET /health',
  'GET /network',
  'GET /network/health',
  'GET /fee-estimate',
  'POST /simulate',
  'GET /account/:id',
];

/**
 * Build the Express app. `rpcService` is injected so tests can use a fake.
 */
function createApp({ config, rpcService }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : true }));
  if (config.env !== 'test') app.use(morgan('combined'));
  app.use(express.json({ limit: '100kb' }));

  // Liveness check is mounted before the rate limiter on purpose.
  app.use(healthRoutes());

  app.use(createRateLimiter(config));

  app.get('/', (req, res) =>
    ok(res, { name: 'stellar-rpc-gateway', network: config.network, endpoints: ENDPOINTS })
  );
  app.use(networkRoutes(rpcService));
  app.use(feeEstimateRoutes(rpcService));
  app.use(simulateRoutes(rpcService));
  app.use(accountRoutes(rpcService));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
