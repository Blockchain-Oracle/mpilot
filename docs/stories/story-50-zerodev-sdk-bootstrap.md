# Story — ZeroDev SDK + Kernel v3.1 account bootstrap

**ID:** story-50-zerodev-sdk-bootstrap
**Epic:** Epic E4 — Smart Account Layer
**Depends on:** story-22-sdk-skeleton, story-21-shared-abi-imports
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge agent runtime
**I want to** a `packages/smart-account` package wraps ZeroDev SDK + Kernel v3.1 + permission validator into ergonomic `createConciergeAccount({ owner, chain })` and `connectToConciergeAccount({ address, chain })` helpers
**So that** every action provider gets a chain-aware ERC-4337 smart account client without each provider re-implementing the boilerplate

---

## File modification map

- `packages/smart-account/package.json` — NEW — peer deps + workspace deps + `@zerodev/sdk` + `@zerodev/permissions` + `@zerodev/ecdsa-validator` (all pinned to current minors)
- `packages/smart-account/src/index.ts` — NEW — barrel exports
- `packages/smart-account/src/createAccount.ts` — NEW — `createConciergeAccount({ owner: PrivateKeyAccount | EOAClient, chain: 'mantle-mainnet' | 'mantle-sepolia' })` returns `{ smartAccountAddress: Address; kernelAccount: KernelSmartAccount; clientPromise: Promise<KernelAccountClient> }`. Internally: instantiates `signerToEcdsaValidator` → `createKernelAccount` (Kernel v3.1 + entrypoint v0.7) → `createKernelAccountClient` (bundler from story-51).
- `packages/smart-account/src/connectAccount.ts` — NEW — `connectToConciergeAccount({ address, chain, owner })` for re-attaching to a previously-deployed account (returns same shape as createConciergeAccount but skips redeploy).
- `packages/smart-account/src/types.ts` — NEW — types for `ConciergeAccount`, `PermissionAccount` (used by story-52), chain config types
- `packages/smart-account/src/constants.ts` — NEW — entrypoint v0.7 address, Kernel v3.1 factory address (the Kernel factory is identical across all chains via CREATE2 deploy: `0xaac5D4240AF87249B3f71BC8E4A2cae074A3E419`)
- `packages/smart-account/src/__tests__/createAccount.test.ts` — NEW — unit test: createConciergeAccount returns valid shape, smartAccountAddress is deterministic (CREATE2)

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @mpilot/smart-account run build` runs
Then exit code is 0

Given createConciergeAccount on Sepolia
When called with a fresh EOA owner
Then returns { smartAccountAddress: validAddress, kernelAccount: object, clientPromise: pending Promise }; smartAccountAddress is CREATE2-deterministic (same owner + chain → same address)

Given Kernel v3.1 is used
When the underlying account info is read
Then accountVersion === '0.3.1' (NOT '0.2.x' or '0.3.0-beta')

Given entrypoint v0.7 is used
When createConciergeAccount completes
Then `entrypointVersion === '0.7'` AND the entrypoint address is the canonical v0.7 address (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`)

Given connectToConciergeAccount with an existing deployed account
When called with the address of a previously-created account
Then it returns the same KernelSmartAccount object without firing a new deployment tx

Given the chain is mantle-mainnet
When createConciergeAccount runs
Then the resolved bundler endpoint targets `https://api.pimlico.io/v2/mantle/rpc` (from story-51 config)

Given the chain is mantle-sepolia
When createConciergeAccount runs
Then it uses the sepolia bundler endpoint

Given an unknown chain identifier
When createConciergeAccount({chain: 'ethereum-mainnet'}) is called
Then it throws `UnsupportedChain('ethereum-mainnet')` (NOT silent fallthrough)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/smart-account
test -f package.json
test -f src/createAccount.ts
test -f src/connectAccount.ts
test -f src/types.ts
test -f src/constants.ts

cd ../..

pnpm --filter @mpilot/smart-account run build
test $? -eq 0
pnpm run typecheck

# Pinned ZeroDev versions
node -e "
  const pkg = require('./packages/smart-account/package.json');
  for (const dep of ['@zerodev/sdk', '@zerodev/permissions', '@zerodev/ecdsa-validator']) {
    const v = pkg.dependencies?.[dep] ?? pkg.peerDependencies?.[dep];
    if (!v) { console.error('Missing dep:', dep); process.exit(1); }
    if (v.startsWith('^') || v.startsWith('~')) { console.error('Unpinned:', dep, v); process.exit(1); }
  }
"

# EntryPoint v0.7 address is correct
grep -q "0x0000000071727De22E5E9d8BAf0edAc6f37da032" packages/smart-account/src/constants.ts

# Tests pass
pnpm --filter @mpilot/smart-account run test
test $? -eq 0

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Kernel v3.1 is non-negotiable.** Per ADR-010 + `research/concierge/05-zerodev-erc4337.md`: v3.0-beta lacks session-key permission validator stability. v3.0.x has known bugs in spending limit policy. Pimlico's Mantle support is verified specifically for Kernel 0.3.1.
- **EntryPoint v0.7** is the singleton across chains at `0x0000000071727De22E5E9d8BAf0edAc6f37da032`. Hardcoded as constant; never derived dynamically.
- **CREATE2-deterministic addresses** mean the same owner + chain combination always produces the same smartAccountAddress. This is critical for the recovery flow (story-54): if a user loses their session key, the EOA can connect to the SAME account from anywhere without first knowing the address.
- **`@zerodev/permissions`** package wraps the Permission Validator + policies. The actual session-key issuance happens in story-53; this story just makes the dependency available + wires the imports.
- **`@zerodev/ecdsa-validator`** is the default root validator (EOA-signed). Session keys are layered on top via the Permission Validator in story-52.
- **No bundler client here** — the bundler integration is story-51's responsibility. This package exposes a `clientPromise` that resolves when the bundler client (created in story-51) is wired in. Cross-package composition via async loading.
- **Pinned versions** (no `^` or `~`) — ZeroDev's API has breaking changes between minors; pinning protects against silent breakage on `pnpm install`.
- **No L1 dependency** — these are pure Mantle Mainnet/Sepolia smart accounts. No Ethereum L1 RPC calls.
- Cross-ref: `research/concierge/05-zerodev-erc4337.md` § Verified facts + integration pattern.
