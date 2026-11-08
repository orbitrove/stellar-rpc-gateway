require('dotenv').config({ quiet: true });
const { Networks } = require('@stellar/stellar-sdk');

const NETWORKS = {
  testnet: {
    passphrase: Networks.TESTNET,
    defaultRpcUrl: 'https://soroban-testnet.stellar.org',
  },
  // There is no public default RPC for mainnet: bring your own provider or node.
  mainnet: {
    passphrase: Networks.PUBLIC,
    defaultRpcUrl: null,
  },
};

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Build the app configuration from environment variables.
 * Pass a custom `env` object in tests.
 */
function loadConfig(env = process.env) {
  const network = (env.STELLAR_NETWORK || 'testnet').toLowerCase();
  const net = NETWORKS[network];
  if (!net) {
    throw new Error(
      `Invalid STELLAR_NETWORK "${env.STELLAR_NETWORK}". Use "testnet" or "mainnet".`
    );
  }

  const rpcUrl = env.STELLAR_RPC_URL || net.defaultRpcUrl;
  if (!rpcUrl) {
    throw new Error(
      'STELLAR_RPC_URL is required when STELLAR_NETWORK=mainnet (no public default exists).'
    );
  }

  return {
    env: env.NODE_ENV || 'development',
    port: toInt(env.PORT, 3000),
    network,
    networkPassphrase: net.passphrase,
    rpcUrl,
    allowHttp: rpcUrl.startsWith('http://'),
    rateLimit: {
      windowMs: toInt(env.RATE_LIMIT_WINDOW_MS, 60000),
      max: toInt(env.RATE_LIMIT_MAX, 60),
    },
    corsOrigins: (env.CORS_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

module.exports = { loadConfig };
