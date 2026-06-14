# Story — `@concierge-mantle/ondo-usdy` integration tests

**ID:** story-37-ondo-usdy-tests
**Epic:** Epic E3 — Action Providers
**Depends on:** story-36-ondo-usdy-provider
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** the ondo-usdy provider has tests verifying read accuracy against real USDY state, KYC-allowlist correctness, and the explicit absence of mint/redeem actions
**So that** the v1 read-only scope is provably enforced (no future PR can silently introduce a mint action that bypasses KYC) and yield-rate derivation matches Ondo's actual ~5% APY

---

## File modification map

- `packages/providers/ondo-usdy/src/__tests__/provider.test.ts` — NEW — construction + action surface assertions + the "no mutation actions" guard
- `packages/providers/ondo-usdy/src/__tests__/actions/getBalance.test.ts` — NEW — fork test against Mantle Mainnet (live USDY): query a known holder address (use Ondo's deployer or a public whale from Nansen)
- `packages/providers/ondo-usdy/src/__tests__/actions/getRateAccrual.test.ts` — NEW — fork test: assert multiplier > 1e18 and monotonic across two blocks
- `packages/providers/ondo-usdy/src/__tests__/actions/getYieldRate.test.ts` — NEW — pure-compute test with fixture multipliers + time deltas → assert APY math correctness
- `packages/providers/ondo-usdy/src/__tests__/selectors.test.ts` — NEW — `isUserEligible` for known-eligible (whale) and known-ineligible (random EOA) addresses
- `packages/providers/ondo-usdy/src/__tests__/no-mutations.test.ts` — NEW — invariant test: `Object.keys(provider.actions)` has no 'mint', 'redeem', 'transfer', or 'burn'. Will catch any future regression that adds a mutation action against v1 scope.
- `packages/providers/ondo-usdy/src/__tests__/setup.ts` — NEW — Anvil fork from Mantle Mainnet
- `packages/providers/ondo-usdy/vitest.config.ts` — NEW — `pool: 'forks'`, 30s timeout

---

## Acceptance criteria (BDD)

```
Given Vitest is configured
When `pnpm --filter @concierge-mantle/ondo-usdy run test` runs
Then exit code is 0 AND ≥ 12 test cases pass

Given test_provider_NoMutationActions
When iterating provider.actions
Then NONE of {'mint', 'redeem', 'transfer', 'burn', 'approve'} are present in the action keys

Given test_getBalance_KnownHolder
When called against a Mantle Mainnet fork for a known USDY holder
Then returns nonZero balance, usdValue == raw * multiplier / 1e18, yieldAccrued is non-negative

Given test_getRateAccrual_Monotonic
When called at block N, then at block N+1000
Then multiplier(N+1000) >= multiplier(N) (USDY accrues; never decreases)

Given test_getYieldRate_FixtureMath
When derived from `multiplier_now = 1.05e18, multiplier_7d_ago = 1.001e18`
Then APY ≈ 500 bps ± 50 bps tolerance (weekly compounding math: (1.05/1.001)^52 - 1 ≈ 11x annual; the test uses smaller deltas reflecting real-world ~5% APY)

Given test_isUserEligible_KnownIneligible
When called with a random EOA (vm.addr(0xdeadbeef))
Then returns false

Given test_isUserEligible_KnownEligible
When called with a known KYC'd address from on-chain history (filter Transfer events for any successful USDY transfer recipient)
Then returns true

Given the integration sanity test
When the full read-flow runs (getBalance + getRateAccrual + getYieldRate)
Then no calls revert AND all return values have consistent types (every bigint field is actually a bigint, not a number)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every test file ≤ 400 LOC

Given coverage
When `pnpm --filter @concierge-mantle/ondo-usdy run test --coverage` runs
Then line coverage on `src/` ≥ 80%
```

---

## Shell verification

```bash
pnpm --filter @concierge-mantle/ondo-usdy run test --reporter=verbose
test $? -eq 0

pnpm --filter @concierge-mantle/ondo-usdy run test --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 12 {exit 0} {exit 1}'

# Critical guard: no mutation actions
pnpm --filter @concierge-mantle/ondo-usdy run test --reporter=verbose 2>&1 | grep "NoMutationActions" | grep -q "✓"

# Coverage ≥ 80%
cov=$(pnpm --filter @concierge-mantle/ondo-usdy run test --coverage 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 80

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **The `NoMutationActions` invariant test is the load-bearing guard.** It's a single test, but it's the only thing standing between "v1 read-only scope" and a future PR that quietly adds a mint action bypassing KYC. Keep it brittle (fail-fast on any added mutation) — DON'T make it a soft warning.
- **Known holder lookup pattern**: query `Transfer` events from block 0 on USDY contract, take the most recent recipient as the test fixture. The agent runtime should never need to know specific addresses; this is test-only.
- **APY tolerance** is intentionally wide (±50 bps) because real Mantle Mainnet multiplier changes block-by-block. A perfect 500-bps assertion would flake. Test the MATH on hardcoded fixture data, then a smoke check (within reason) on live data.
- **No mocks** — USDY is a real ERC-20 with real on-chain state. Anvil fork from Mainnet gives us deterministic-enough test fixtures.
- **`isUserEligible` whale lookup**: Mainnet has ~25M USDY supply (per CLAUDE.md verification). Any address with nonzero balance has passed KYC (otherwise the transfer would have reverted). Use `balanceOf > 0` as the eligibility heuristic for finding a test address.
- Cross-ref: `research/concierge/03-providers/ondo-usdy.md` § KYC mechanic.
