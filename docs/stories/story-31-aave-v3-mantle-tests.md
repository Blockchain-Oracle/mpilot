# Story — `@concierge/aave-v3-mantle` integration tests

**ID:** story-31-aave-v3-mantle-tests
**Epic:** Epic E3 — Action Providers
**Depends on:** story-30-aave-v3-mantle-provider
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** the aave-v3-mantle provider has Vitest integration tests against a Mantle Sepolia Anvil fork covering happy paths + the E-Mode silent-fail trap + health-factor edge cases
**So that** behavioral regressions in the provider surface at PR time, not when the agent runtime breaks mid-tick on Sepolia

---

## File modification map

- `packages/providers/aave-v3-mantle/src/__tests__/provider.test.ts` — NEW — top-level provider construction + action surface tests (no chain)
- `packages/providers/aave-v3-mantle/src/__tests__/actions/supply.test.ts` — NEW — fork test: deploy mocks → supply → assert aToken balance + attestation payload
- `packages/providers/aave-v3-mantle/src/__tests__/actions/borrow.test.ts` — NEW — fork test: the E-Mode silent-fail-trap case (borrow w/o setUserEMode throws client-side) + happy path (with setUserEMode → borrow → assert debt token + attestation)
- `packages/providers/aave-v3-mantle/src/__tests__/actions/repay.test.ts` — NEW — fork test: partial repay + `amount: 'max'` repay
- `packages/providers/aave-v3-mantle/src/__tests__/actions/withdraw.test.ts` — NEW — fork test: HF-floor refusal + clean withdraw
- `packages/providers/aave-v3-mantle/src/__tests__/actions/setUserEMode.test.ts` — NEW — toggle 0↔1↔2 + post-state read
- `packages/providers/aave-v3-mantle/src/__tests__/selectors.test.ts` — NEW — `getHealthFactor` + `maxSafeBorrow` pure-compute tests with known fixtures
- `packages/providers/aave-v3-mantle/src/__tests__/attestation.test.ts` — NEW — schema-name + payload-shape assertions
- `packages/providers/aave-v3-mantle/src/__tests__/setup.ts` — NEW — Vitest setup: spawn Anvil fork via `viem/test`, deploy mocks fresh per suite, fund test wallets, expose `testClient`/`walletClient`/`publicClient` helpers
- `packages/providers/aave-v3-mantle/vitest.config.ts` — NEW — pulls test setup, runs in `--pool=forks` mode (Anvil sub-processes per worker), sets `testTimeout: 30_000`

---

## Acceptance criteria (BDD)

```
Given Vitest is configured
When `pnpm --filter @concierge/aave-v3-mantle run test` runs
Then exit code is 0 AND ≥ 20 test cases pass

Given test_provider_ExposesSixActions
When the provider is constructed
Then assert ['supply','borrow','repay','withdraw','setUserEMode','claimRewards'] === Object.keys(p.actions).sort()

Given test_supply_HappyPath
When 100 USDC is supplied to a fresh test account
Then mockUSDC balance decreases by 100, mockAToken balance increases by 100, attestation payload schema is "concierge.aave.v3.supply.v1", and txHash is a 32-byte hex

Given test_borrow_WithoutEMode_ThrowsClientSide
When the test wallet supplies 100 sUSDe + immediately tries to borrow 50 USDC (no setUserEMode first)
Then the borrow action throws `AaveBorrowRequiresEMode1` BEFORE submitting the tx (assertion: zero new txs in the Anvil mempool after the call)

Given test_borrow_WithEMode_HappyPath
When supply 100 sUSDe → setUserEMode(1) → borrow 50 USDC
Then borrow succeeds, debt token balance = 50, HF > 1.5, attestation payload eMode === 1

Given test_repay_MaxAmount
When `repay({ asset: USDC, amount: 'max' })` runs on a wallet with 50 USDC debt
Then debt is fully cleared (postDebt === 0), only the actual debt amount is pulled (NOT max-uint256 worth of USDC)

Given test_withdraw_WouldBreakHealthFactor
When the wallet has minimal HF margin and attempts a withdraw that would drop HF below the policy floor (1.5)
Then `WithdrawWouldBreakHealthFactor` is thrown BEFORE tx submit; current and projected HF are in the error metadata

Given test_setUserEMode_PostStateMatches
When setUserEMode(1) runs
Then `getUserAccountData(user).userEModeCategory` === 1 in subsequent reads

Given test_getHealthFactor_KnownFixture
When called for $200 collateral / $100 debt / LT=92%
Then returns 1.84e18 ± 1e15 tolerance

Given test_maxSafeBorrow_PureCompute
When called for the same fixture with targetHF=1.5
Then returns the borrow amount that produces HF=1.5 exactly (asserted via reverse-computation)

Given test_attestation_SchemaMatchesSpec
When payload is built for each of the 6 actions
Then each payload's `schema` field matches the `concierge.aave.v3.<action>.v1` pattern exactly

Given file size budgets
When `pnpm scripts/check-file-loc.mjs` runs
Then every test file is ≤ 400 LOC

Given coverage report
When `pnpm --filter @concierge/aave-v3-mantle run test --coverage` runs
Then line coverage on `packages/providers/aave-v3-mantle/src/` is ≥ 85%
```

---

## Shell verification

```bash
# Tests pass
pnpm --filter @concierge/aave-v3-mantle run test --reporter=verbose
test $? -eq 0

# ≥ 20 test cases
pnpm --filter @concierge/aave-v3-mantle run test --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 20 {exit 0} {exit 1}'

# E-Mode silent-fail-trap test passes (load-bearing)
pnpm --filter @concierge/aave-v3-mantle run test --reporter=verbose 2>&1 | grep "WithoutEMode_ThrowsClientSide" | grep -q "✓"

# Coverage ≥ 85%
cov=$(pnpm --filter @concierge/aave-v3-mantle run test --coverage 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 85

# No file exceeds 400 LOC
bun scripts/check-file-loc.mjs
test $? -eq 0
```

---

## Notes for coding agent

- **Anvil fork pattern via viem/test:** spawn an Anvil sub-process forked from Mantle Sepolia (`MANTLE_SEPOLIA_RPC_URL`). Per test suite, deploy fresh mocks (`MockAavePool`, `MockSUSDe`, `MockUSDC`, etc.) via `walletClient.deployContract`. Faster than re-using a shared fork across tests because each suite's state is isolated.
- **`--pool=forks`** mode in Vitest config runs each test file in its own Anvil — true isolation, no inter-test pollution. Slower per-test but eliminates flaky-test debugging hell.
- **The E-Mode silent-fail-trap test is the most important assertion in this story.** It validates that the client-side pre-check from story-30 actually fires — assert via Anvil's `anvil_mempool` RPC that NO transaction is queued after the failed call (not just "the function threw"). A subtle bug would be: thrown error AFTER submitting the tx — which still costs gas. The test catches both.
- **`testTimeout: 30_000`** because Anvil-fork startup + deploy of mocks takes 5-10s; individual actions are fast. 30s leaves margin for slow CI.
- **No MSW / no API mocking** — all chain calls go to real Anvil. The mocks are deployed AS contracts, not as JS stubs. This is the "no mocks in the hot path" rule from CLAUDE.md applied: even tests use deployed mock CONTRACTS, not mocked SDKs.
- **Coverage gate at 85%** (not 95% because pure-fork tests can't trivially exercise every revert path — those go in unit tests of the selectors).
- **Reference test patterns:** `archive/patron-2026-06-02/docs/stories/story-11-patron-vault-aave-integration.md` for the Patron-era Aave provider test shape.
- Cross-ref: `research/concierge/03-providers/aave-v3-mantle.md` § Integration pattern + § Error handling table.
