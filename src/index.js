const { rpc } = require('@stellar/stellar-sdk');
const { loadConfig } = require('./config');
const { RpcService } = require('./services/rpcService');
const { createApp } = require('./app');

const config = loadConfig();

const server = new rpc.Server(config.rpcUrl, { allowHttp: config.allowHttp });
const rpcService = new RpcService({
  server,
  network: config.network,
  networkPassphrase: config.networkPassphrase,
});

const app = createApp({ config, rpcService });

const httpServer = app.listen(config.port, () => {
  console.log(`stellar-rpc-gateway listening on :${config.port} (${config.network})`);
});

function shutdown() {
  httpServer.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
