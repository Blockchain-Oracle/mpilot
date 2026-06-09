# Story — Typed error hierarchy for SDK + providers

**ID:** story-23-sdk-error-types
**Epic:** Epic E2 — Shared SDK Core
**Depends on:** story-22-sdk-skeleton
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge runtime author
**I want to** every error from the SDK + providers is a typed class with a stable `code`
**So that** the tick loop + UI can switch on error type without parsing strings

---

## File modification map

- `packages/sdk/src/errors.ts` — NEW — error class hierarchy
- `packages/sdk/src/errors.test.ts` — NEW — tests for instance checks + serialization
- `packages/sdk/src/index.ts` — UPDATE — re-export errors

---

## Acceptance criteria (BDD)

```
Given typed errors are defined
When `pnpm -e "import { ConciergeError, ConfigError } from './packages/sdk/src/errors.ts'; const e = new ConfigError('bad'); console.log(e instanceof ConciergeError)"` runs
Then output is "true"

Given an error has a stable code
When `console.log(new ConfigError('bad').code)` runs
Then output is "CONCIERGE_CONFIG_ERROR"

Given an error is serializable
When `JSON.stringify(new ConfigError('bad', { field: 'chain' }))` runs
Then output contains `"code":"CONCIERGE_CONFIG_ERROR"` and `"field":"chain"`

Given specific provider errors exist
When the test asserts AaveBorrowFailed extends ProviderError extends ConciergeError
Then exit code is 0

Given oracle errors exist
When the test asserts OraclePriceUnavailable extends ProviderError
Then exit code is 0

Given session-key errors exist
When the test asserts SessionKeyExpired extends ConciergeError
Then exit code is 0

Given attestation errors exist
When the test asserts AttestationWriteFailed extends ConciergeError
Then exit code is 0

Given tests pass
When `pnpm test packages/sdk/src/errors.test.ts` runs
Then ≥ 12 test cases pass
```

---

## Shell verification

```bash
test -f packages/sdk/src/errors.ts
test -f packages/sdk/src/errors.test.ts

# Error hierarchy compiles
bun -e "
  import {
    ConciergeError, ConfigError, ProviderError,
    AaveBorrowFailed, OraclePriceUnavailable,
    SessionKeyExpired, AttestationWriteFailed,
    SimulationFailed, BridgeFailed,
  } from './packages/sdk/src/errors.ts';
  const checks = [
    new ConfigError('x') instanceof ConciergeError,
    new AaveBorrowFailed('x') instanceof ProviderError,
    new OraclePriceUnavailable('x') instanceof ProviderError,
    new SessionKeyExpired('x') instanceof ConciergeError,
    new AttestationWriteFailed('x') instanceof ConciergeError,
    new SimulationFailed('x') instanceof ConciergeError,
    new BridgeFailed('x') instanceof ProviderError,
  ];
  if (checks.some(c => c !== true)) process.exit(1);
"

# Tests pass with ≥ 12 cases
pnpm test packages/sdk/src/errors.test.ts --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 12 {exit 0} {exit 1}'

# Typecheck passes
pnpm run typecheck
test $? -eq 0
```

---

## Notes for coding agent

- Hierarchy:
  ```
  ConciergeError (base)
    ├── ConfigError
    ├── ProviderError (base for provider-level errors)
    │     ├── AaveBorrowFailed
    │     ├── AaveSupplyFailed
    │     ├── OraclePriceUnavailable
    │     ├── BridgeFailed
    │     ├── SwapFailed
    │     └── AttestationWriteFailed
    ├── SessionKeyExpired
    ├── SessionKeyRevoked
    ├── SimulationFailed
    ├── BudgetExceeded (per-tick token budget)
    └── ApprovalTimeout
  ```
- Each error class has:
  - `code: string` (stable enum-like ID, e.g., `"CONCIERGE_AAVE_BORROW_FAILED"`)
  - `message: string` (human-readable)
  - `cause?: unknown` (original error if wrapped)
  - `metadata?: Record<string, unknown>` (structured context for telemetry)
  - `toJSON()` method returning a serializable object
- `code` strings follow `CONCIERGE_<DOMAIN>_<NAME>` convention.
- Error metadata for `AaveBorrowFailed` should include: `asset`, `amount`, `attemptedHF`, `reason` (parsed revert reason if available).
- The base `ConciergeError` includes a `static fromUnknown(e: unknown)` static method that wraps any caught error as a `ConciergeError`.
- Errors must NOT contain raw RPC URLs or private keys in their messages — those leak into logs. Use placeholders.
