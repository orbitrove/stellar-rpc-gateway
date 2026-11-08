const { loadConfig } = require('../src/config');

describe('loadConfig', () => {
  it('defaults to testnet with the public testnet RPC', () => {
    const c = loadConfig({});
    expect(c.network).toBe('testnet');
    expect(c.rpcUrl).toMatch(/^https:\/\//);
    expect(c.port).toBe(3000);
  });

  it('requires an RPC URL on mainnet', () => {
    expect(() => loadConfig({ STELLAR_NETWORK: 'mainnet' })).toThrow(/STELLAR_RPC_URL/);
  });

  it('accepts a custom RPC URL on mainnet', () => {
    const c = loadConfig({ STELLAR_NETWORK: 'mainnet', STELLAR_RPC_URL: 'https://rpc.example.com' });
    expect(c.network).toBe('mainnet');
    expect(c.rpcUrl).toBe('https://rpc.example.com');
  });

  it('rejects unknown networks', () => {
    expect(() => loadConfig({ STELLAR_NETWORK: 'moonnet' })).toThrow(/Invalid STELLAR_NETWORK/);
  });

  it('parses CORS origins', () => {
    const c = loadConfig({ CORS_ORIGINS: 'https://a.com, https://b.com' });
    expect(c.corsOrigins).toEqual(['https://a.com', 'https://b.com']);
  });
});
