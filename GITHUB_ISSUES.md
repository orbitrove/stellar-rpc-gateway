# Starter issues

Copy each of these into GitHub as its own issue. Each has context, scope, and a way to verify the result. Suggested Wave complexity is in brackets.

---

## 1. Add in-memory caching for `/fee-estimate` [Trivial]

**Context**
`GET /fee-estimate` calls RPC on every request. Fee stats change at most once per ledger (about every 5 seconds), so repeated calls waste RPC quota.

**Scope**
- Add a small TTL cache (default 5 seconds) inside `RpcService.getFeeEstimate()`.
- Make the TTL configurable via `FEE_CACHE_TTL_MS`; `0` disables caching.
- No new dependencies are needed.

**Files:** `src/services/rpcService.js`, `src/config/index.js`, `.env.example`, `tests/api.test.js`

**Acceptance criteria**
- Two requests within the TTL cause only one `getFeeStats` call (assert on the mock).
- After the TTL expires, a new call is made.
- README configuration table is updated.

---

## 2. Return account balances from `/account/:id` [Medium]

**Context**
The endpoint currently returns only `id` and `sequence`. Most users want balances too.

**Scope**
- Read the account ledger entry (and trustline entries for known assets, if feasible) via RPC `getLedgerEntries`.
- Return the native balance as a string in stroops plus a human-readable XLM value.
- Keep the response backward compatible: existing fields must not change.

**Files:** `src/services/rpcService.js`, `src/routes/account.js`, `tests/api.test.js`, `README.md`

**Constraints:** RPC calls must stay inside `RpcService`; tests must mock the RPC server.

**Acceptance criteria**
- `GET /account/:id` includes a `balances` array with at least the native balance.
- Unknown accounts still return 404 `ACCOUNT_NOT_FOUND`.
- Tests cover found, not found, and RPC failure.

---

## 3. Improve error mapping for common RPC failures [Medium]

**Context**
Every unknown error currently becomes `502 RPC_ERROR`. Users can't tell timeouts from bad endpoints or rate limits.

**Scope**
- Distinguish at least: upstream timeout (`504 RPC_TIMEOUT`), upstream rate limiting (`503 RPC_RATE_LIMITED`), and connection refused (`502 RPC_UNREACHABLE`).
- Keep generic `RPC_ERROR` as the fallback.
- Never include upstream error text in the response body.

**Files:** `src/middleware/errorHandler.js`, `src/utils/errors.js`, `tests/api.test.js`

**Acceptance criteria**
- Each mapped case has a test that throws a representative error from the mocked server.
- No internal details appear in any response.

---

## 4. Add a request timeout for RPC calls [Trivial]

**Context**
A hung RPC node can hold requests open indefinitely.

**Scope**
- Wrap RPC calls in `RpcService` with a configurable timeout (`RPC_TIMEOUT_MS`, default 10000).
- On timeout, throw an `AppError` with status 504.

**Files:** `src/services/rpcService.js`, `src/config/index.js`, `.env.example`, `tests/api.test.js`

**Acceptance criteria**
- A mocked call that never resolves produces a 504 within the timeout.
- Timeout is documented in the README.

---

## 5. Add `POST /simulate` support for fee-bump and multi-operation summaries [High]

**Context**
Simulation currently returns resource cost and return value only. Developers also want to know which operations were simulated and the total expected fee.

**Scope**
- Include `operationCount` and an `estimatedTotalFee` (base fee plus `minResourceFee`) in the simulate response.
- Reject fee-bump envelopes with a clear 400 `UNSUPPORTED_ENVELOPE`, unless you implement correct handling.
- Document how `estimatedTotalFee` is calculated.

**Files:** `src/services/rpcService.js`, `src/routes/simulate.js`, `tests/api.test.js`, `README.md`

**Acceptance criteria**
- Tests cover a multi-operation transaction and a fee-bump envelope.
- Existing response fields are unchanged.

---

## 6. Add an OpenAPI spec and serve it at `/openapi.json` [Medium]

**Context**
Consumers currently rely on the README. A machine-readable spec enables client generation and testing.

**Scope**
- Write an OpenAPI 3.x document describing every endpoint, the response envelope, and the error codes.
- Serve it at `GET /openapi.json`.
- Add a test that validates the document has all routes listed in `GET /`.

**Files:** new `src/openapi.js` (or `openapi.json`), `src/app.js`, `tests/`, `README.md`

**Acceptance criteria**
- Every route in the app appears in the spec.
- The spec's error codes match those actually emitted.

---

## 7. Add a Dockerfile and `docker-compose.yml` [Trivial]

**Context**
Running the service in a container is the most common deployment path.

**Scope**
- Multi-stage `Dockerfile` using a supported Node LTS image, running as a non-root user.
- `docker-compose.yml` with env vars from `.env`.
- Short "Run with Docker" section in the README.

**Acceptance criteria**
- `docker compose up` starts the service and `GET /health` returns 200.
- Image does not include dev dependencies or `.env`.

---

## 8. Upgrade `@stellar/stellar-sdk` and make tests work on the new version [High]

**Context**
The project is pinned to SDK v15 because newer versions require Node 22+ and v17 depends on an ESM-only package that Jest 30 can't load on Node 22.

**Scope**
- Upgrade to the latest SDK.
- Fix the test setup (for example via Jest ESM support, a transform for the affected package, or a different runner) without weakening the tests.
- Update `engines` and the CI matrix to match.

**Files:** `package.json`, Jest config, `.github/workflows/ci.yml`, `README.md`

**Acceptance criteria**
- All existing tests pass on the upgraded SDK in CI.
- README "Known limitations" no longer mentions the pin.
