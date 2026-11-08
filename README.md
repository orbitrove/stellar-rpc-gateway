# stellar-rpc-gateway

A small Express service that sits in front of [Stellar RPC](https://developers.stellar.org/docs/data/apis/rpc) and gives application developers **clean, consistent responses** for the things they do most: estimating fees, simulating transactions, and checking network and account state.

> **Why RPC and not Horizon?** Stellar's docs list Horizon as deprecated in favor of Stellar RPC. This project is built on RPC from day one.

Status: early (v0.1). Contributions welcome, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Why this exists

Raw RPC responses are accurate but low-level: fee stats are full percentile tables, simulation results are SDK objects, and errors come back in different shapes. This gateway normalizes them into a small, predictable JSON API that frontends and backends can call directly.

## Quick start

Requires **Node.js 20+**.

```bash
git clone <your-repo-url>
cd stellar-rpc-gateway
npm install
cp .env.example .env
npm run dev
```

The server starts on `http://localhost:3000` against Stellar **testnet** using the public SDF testnet RPC.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `STELLAR_NETWORK` | `testnet` | `testnet` or `mainnet` |
| `STELLAR_RPC_URL` | public testnet RPC | **Required on mainnet.** Use an RPC provider or your own node |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window |
| `RATE_LIMIT_MAX` | `60` | Max requests per window per IP |
| `CORS_ORIGINS` | empty (allow all) | Comma-separated allowed origins |

## API

All responses use one envelope:

```json
{ "ok": true,  "data": { } }
{ "ok": false, "error": { "code": "INVALID_BODY", "message": "..." } }
```

### `GET /health`
Liveness check. Does not call RPC.

### `GET /network`
Network name, passphrase, protocol version and latest ledger.

### `GET /network/health`
RPC node health, including the ledger retention window.

### `GET /fee-estimate`
Normalized fee statistics for classic and Soroban transactions, in stroops.

```json
{
  "ok": true,
  "data": {
    "network": "testnet",
    "latestLedger": 123456,
    "unit": "stroops",
    "classic": { "min": "100", "p50": "100", "p90": "200", "p99": "1000", "max": "5000", "mode": "100", "transactionCount": "50", "ledgerCount": 10 },
    "soroban": { "...": "same shape" },
    "suggested": {
      "classic": { "economy": "100", "standard": "200", "priority": "1000" },
      "soroban": { "economy": "...", "standard": "...", "priority": "..." }
    }
  }
}
```

`suggested` is a **simple heuristic** over recent inclusion fees (economy = p50, standard = p90, priority = p99). Treat it as a starting point, not a guarantee.

### `POST /simulate`
Simulate a base64 transaction envelope.

```bash
curl -X POST http://localhost:3000/simulate \
  -H "Content-Type: application/json" \
  -d '{ "xdr": "<base64 transaction envelope>" }'
```

Successful simulation:

```json
{
  "ok": true,
  "data": {
    "success": true,
    "latestLedger": 123456,
    "minResourceFee": "12345",
    "cost": { "cpuInstructions": "1000", "memoryBytes": "2000" },
    "restoreRequired": false,
    "returnValueXdr": "AAAAAQ=="
  }
}
```

A transaction that *would fail* is still a valid answer: it returns HTTP 200 with `"success": false` and the simulation `error`. Malformed input returns HTTP 400.

### `GET /account/:id`
Returns the account ID and current sequence number. Unknown accounts return 404.

## Project structure

```
src/
  index.js            entry point: wires config, RPC client and app
  app.js              Express app factory (dependency-injected for tests)
  config/             environment parsing and network selection
  services/           all Stellar RPC calls live here
  routes/             thin HTTP handlers
  middleware/         rate limiter, error handler, 404
  utils/              validators, response envelope, AppError
tests/                Jest + Supertest, RPC is mocked (runs offline)
```

## Testing

```bash
npm test
```

Tests mock the RPC server, so they run offline and fast.

## Known limitations

- `GET /account/:id` returns only ID and sequence for now. Balances need ledger-entry reads (see roadmap).
- RPC only retains a limited recent window of data. This gateway is not a historical indexer.
- There is no public default RPC for mainnet. You must provide `STELLAR_RPC_URL`.
- No authentication or caching yet. Put it behind your own auth if you expose it publicly.
- Pinned to `@stellar/stellar-sdk` v15 for now: v16+ requires Node 22+, and v17 ships an ESM-only dependency that Jest 30 cannot load on Node 22. Upgrading is a tracked task.

## Roadmap

See [GITHUB_ISSUES.md](GITHUB_ISSUES.md) for the first set of scoped issues.

## License

MIT, see [LICENSE](LICENSE).
