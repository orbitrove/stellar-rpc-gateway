const { StrKey } = require('@stellar/stellar-sdk');

// A base64-encoded transaction envelope. Generous upper bound to avoid abuse.
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_XDR_LENGTH = 100000;

/** True if `value` is a valid Stellar account ID (G... ed25519 public key). */
function isValidAccountId(value) {
  return typeof value === 'string' && StrKey.isValidEd25519PublicKey(value);
}

/** True if `value` looks like a base64 string of a sane length. */
function isPlausibleXdr(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_XDR_LENGTH &&
    BASE64_RE.test(value)
  );
}

module.exports = { isValidAccountId, isPlausibleXdr, MAX_XDR_LENGTH };
