# Contributing

Thanks for helping improve stellar-rpc-gateway!

## Getting set up

```bash
npm install
cp .env.example .env
npm test
npm run dev
```

Node.js 20+ is required.

## Picking something to work on

- Look for issues labeled `good first issue`, or any issue that clearly states its scope and acceptance criteria.
- Comment on the issue before starting so work isn't duplicated. A short note on your approach is enough.
- Keep pull requests focused: one issue, one PR.

## Guidelines

- **Routes stay thin.** All Stellar RPC calls go through `src/services/rpcService.js`.
- **Add tests.** New behavior needs a test in `tests/`. RPC must be mocked: tests must pass offline.
- **Keep the response envelope.** Success is `{ ok: true, data }`, errors are `{ ok: false, error: { code, message } }`.
- **Don't leak internals.** Unknown errors map to a generic `RPC_ERROR`; log details server-side only.
- **Validate input** at the route edge using `src/utils/validators.js`.
- **Document user-facing changes** in the README.

## Pull request checklist

- [ ] `npm test` passes
- [ ] New or changed behavior has tests
- [ ] README updated if the API changed
- [ ] The PR description links the issue and says how you verified the change

## Reviews

Maintainers aim to respond quickly and give specific, actionable feedback. If a review takes longer than expected, a polite ping on the PR is welcome.

## Reporting bugs

Open an issue with: what you did, what you expected, what happened, your Node version, and which network (testnet or mainnet).
