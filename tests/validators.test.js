const { Keypair } = require('@stellar/stellar-sdk');
const { isValidAccountId, isPlausibleXdr } = require('../src/utils/validators');

describe('isValidAccountId', () => {
  it('accepts a real G... address', () => {
    expect(isValidAccountId(Keypair.random().publicKey())).toBe(true);
  });

  it('rejects junk, secrets and non-strings', () => {
    expect(isValidAccountId('not-an-address')).toBe(false);
    expect(isValidAccountId(Keypair.random().secret())).toBe(false);
    expect(isValidAccountId(undefined)).toBe(false);
    expect(isValidAccountId(123)).toBe(false);
  });
});

describe('isPlausibleXdr', () => {
  it('accepts base64', () => {
    expect(isPlausibleXdr('AAAAAgAAAA==')).toBe(true);
  });

  it('rejects empty, non-base64 and non-strings', () => {
    expect(isPlausibleXdr('')).toBe(false);
    expect(isPlausibleXdr('hello world!')).toBe(false);
    expect(isPlausibleXdr(null)).toBe(false);
  });
});
