const request = require('supertest');
const {
  Keypair,
  Account,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
} = require('@stellar/stellar-sdk');

const { createApp } = require('../src/app');
const { RpcService } = require('../src/services/rpcService');
const { loadConfig } = require('../src/config');

const feeDist = (base) => ({
  max: String(base * 10),
  min: String(base),
  mode: String(base),
  p10: String(base),
  p20: String(base),
  p30: String(base),
  p40: String(base),
  p50: String(base * 2),
  p60: String(base * 2),
  p70: String(base * 2),
  p80: String(base * 3),
  p90: String(base * 4),
  p95: String(base * 5),
  p99: String(base * 8),
  transactionCount: '10',
  ledgerCount: 5,
});

function makeFakeServer(overrides = {}) {
  return {
    getHealth: jest.fn().mockResolvedValue({
      status: 'healthy',
      latestLedger: 100,
      oldestLedger: 1,
      ledgerRetentionWindow: 17280,
    }),
    getNetwork: jest.fn().mockResolvedValue({
      passphrase: Networks.TESTNET,
      protocolVersion: 23,
    }),
    getLatestLedger: jest.fn().mockResolvedValue({ id: 'abc', sequence: 100, protocolVersion: 23 }),
    getFeeStats: jest.fn().mockResolvedValue({
      inclusionFee: feeDist(100),
      sorobanInclusionFee: feeDist(200),
      latestLedger: 100,
    }),
    getAccount: jest.fn(),
    simulateTransaction: jest.fn(),
    ...overrides,
  };
}

function buildApp({ server = makeFakeServer(), env = {} } = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    STELLAR_NETWORK: 'testnet',
    RATE_LIMIT_MAX: '1000',
    ...env,
  });
  const rpcService = new RpcService({
    server,
    network: config.network,
    networkPassphrase: config.networkPassphrase,
  });
  return { app: createApp({ config, rpcService }), server };
}

function buildTxXdr() {
  const source = Keypair.random();
  const account = new Account(source.publicKey(), '1');
  return new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(
      Operation.payment({
        destination: Keypair.random().publicKey(),
        asset: Asset.native(),
        amount: '1',
      })
    )
    .setTimeout(30)
    .build()
    .toXDR();
}

describe('basics', () => {
  it('GET /health works without calling RPC', async () => {
    const { app, server } = buildApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, data: { status: 'ok' } });
    expect(server.getHealth).not.toHaveBeenCalled();
  });

  it('GET / lists endpoints', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.data.endpoints).toContain('POST /simulate');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rate limits non-health routes', async () => {
    const { app } = buildApp({ env: { RATE_LIMIT_MAX: '2' } });
    await request(app).get('/');
    await request(app).get('/');
    const limited = await request(app).get('/');
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
  });
});

describe('GET /network', () => {
  it('returns network info and latest ledger', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/network');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      network: 'testnet',
      passphrase: Networks.TESTNET,
      protocolVersion: 23,
      latestLedger: 100,
    });
  });

  it('GET /network/health returns node health', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/network/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.ledgerRetentionWindow).toBe(17280);
  });

  it('maps upstream failures to 502 without leaking details', async () => {
    const server = makeFakeServer({
      getNetwork: jest.fn().mockRejectedValue(new Error('secret internal detail')),
    });
    const { app } = buildApp({ server });
    const res = await request(app).get('/network');
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('RPC_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secret internal detail');
  });
});

describe('GET /fee-estimate', () => {
  it('normalizes classic and soroban fee stats with suggestions', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/fee-estimate');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.unit).toBe('stroops');
    expect(d.classic.min).toBe('100');
    expect(d.soroban.min).toBe('200');
    expect(d.suggested.classic).toEqual({ economy: '200', standard: '400', priority: '800' });
    expect(d.suggested.soroban).toEqual({ economy: '400', standard: '800', priority: '1600' });
  });
});

describe('POST /simulate', () => {
  it('rejects a missing or malformed body', async () => {
    const { app } = buildApp();
    const a = await request(app).post('/simulate').send({});
    expect(a.status).toBe(400);
    expect(a.body.error.code).toBe('INVALID_BODY');
    const b = await request(app).post('/simulate').send({ xdr: 'not base64!!' });
    expect(b.status).toBe(400);
  });

  it('rejects invalid JSON', async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post('/simulate')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('rejects base64 that is not a transaction', async () => {
    const { app, server } = buildApp();
    const res = await request(app).post('/simulate').send({ xdr: 'AAAAAgAAAA==' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_XDR');
    expect(server.simulateTransaction).not.toHaveBeenCalled();
  });

  it('returns a cleaned-up successful simulation', async () => {
    const server = makeFakeServer({
      simulateTransaction: jest.fn().mockResolvedValue({
        latestLedger: 100,
        minResourceFee: '12345',
        transactionData: {},
        cost: { cpuInsns: '1000', memBytes: '2000' },
        result: { retval: { toXDR: () => 'AAAAAQ==' } },
      }),
    });
    const { app } = buildApp({ server });
    const res = await request(app).post('/simulate').send({ xdr: buildTxXdr() });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      success: true,
      latestLedger: 100,
      minResourceFee: '12345',
      cost: { cpuInstructions: '1000', memoryBytes: '2000' },
      restoreRequired: false,
      returnValueXdr: 'AAAAAQ==',
    });
  });

  it('returns simulation errors as data, not as HTTP errors', async () => {
    const server = makeFakeServer({
      simulateTransaction: jest
        .fn()
        .mockResolvedValue({ latestLedger: 100, error: 'HostError: Error(Contract, #1)' }),
    });
    const { app } = buildApp({ server });
    const res = await request(app).post('/simulate').send({ xdr: buildTxXdr() });
    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(false);
    expect(res.body.data.error).toMatch(/HostError/);
  });
});

describe('GET /account/:id', () => {
  it('rejects invalid account ids', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/account/not-valid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ACCOUNT_ID');
  });

  it('returns id and sequence', async () => {
    const id = Keypair.random().publicKey();
    const server = makeFakeServer({
      getAccount: jest.fn().mockResolvedValue({
        accountId: () => id,
        sequenceNumber: () => '123456',
      }),
    });
    const { app } = buildApp({ server });
    const res = await request(app).get(`/account/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id, sequence: '123456' });
  });

  it('maps a missing account to 404', async () => {
    const id = Keypair.random().publicKey();
    const server = makeFakeServer({
      getAccount: jest.fn().mockRejectedValue(new Error(`Account not found: ${id}`)),
    });
    const { app } = buildApp({ server });
    const res = await request(app).get(`/account/${id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });
});
