# Story — `@concierge/meth-staking` integration tests

**ID:** story-39-meth-staking-tests
**Epic:** Epic E3 — Action Providers
**Depends on:** story-38-meth-staking-provider, story-33-mantle-dex-tests
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** the meth-staking provider has tests verifying read accuracy, the MissingDependency fail-fast pattern, the no-native-unstake invariant, and the unwrap-via-DEX composition
**So that** the L2-bridge-image semantics are provably enforced (no agent confuses Mantle mETH with L1 stETH) and the dependency injection contract holds

---

## File modification map

- `packages/providers/meth-staking/src/__tests__/provider.test.ts` — NEW — construction + MissingDependency fail-fast + action surface assertions
- `packages/providers/meth-staking/src/__tests__/actions/getBalance.test.ts` — NEW — fork test: known mETH holder, balance × rate math
- `packages/providers/meth-staking/src/__tests__/actions/getExchangeRate.test.ts` — NEW — fork test: rate in valid range + monotonic
- `packages/providers/meth-staking/src/__tests__/actions/getYieldRate.test.ts` — NEW — pure-compute APY math with fixture data
- `packages/providers/meth-staking/src/__tests__/actions/unwrapToWETH.test.ts` — NEW — fork test: unwrap routes via dex provider, attestation has both schemas captured
- `packages/providers/meth-staking/src/__tests__/no-l1-actions.test.ts` — NEW — invariant test: no 'stake', 'nativeUnstake', 'unstake', 'claimEth' actions
- `packages/providers/meth-staking/src/__tests__/setup.ts` — NEW — Anvil fork from Mantle Mainnet + spawn mantle-dex provider for composition tests
- `packages/providers/meth-staking/vitest.config.ts` — NEW — `pool: 'forks'`, 60s timeout

---

## Acceptance criteria (BDD)

```
Given Vitest is configured
When `pnpm --filter @concierge/meth-staking run test` runs
Then exit code is 0 AND ≥ 14 test cases pass

Given test_constructor_MissingDexProvider
When `createMethStakingProvider({rpcUrl})` runs without `{dexProvider}`
Then it throws `MissingDependency('@concierge/mantle-dex')` IMMEDIATELY (no lazy late binding)

Given test_NoL1Actions
When iterating Object.keys(provider.actions)
Then NONE of {'stake', 'nativeUnstake', 'unstake', 'claimEth'} are present

Given test_getExchangeRate_InValidRange
When called against Mantle Mainnet fork
Then rate >= 1e18 AND rate <= 2e18 (sane bounds; real-world value is ~1.0929e18 per AUDIT-2026-06-04)

Given test_getExchangeRate_Monotonic
When sampled at block N and block N+1000
Then rate(N+1000) >= rate(N) (staking accrues over time)

Given test_getBalance_KnownHolder
When called against a known mETH holder
Then returns { raw: nonZero, ethValue: raw * rate / 1e18 } — ethValue > raw because rate > 1

Given test_getYieldRate_FixtureMath
When rate_now = 1.10e18, rate_7d_ago = 1.0992e18, elapsed = 7 days
Then APY ≈ 380 bps ± 50 bps tolerance (matches ETH staking ~3-5% range)

Given test_unwrapToWETH_RoutesThroughDexProvider
When unwrap({ amountMeth: 1e18, slippageBps: 50 }) runs
Then the spied dexProvider.swap was called once with { tokenIn: mETH, tokenOut: WETH, amountIn: 1e18, slippageBps: 50 }, and the returned attestation has schema 'concierge.meth.unwrap-via-dex.v1' with dexTxHash captured

Given test_unwrapToWETH_AttestationCaptures_ExpectedEthOut
When unwrap runs
Then attestation.payload.expectedEthOut === rate * amountMeth / 1e18 (asserts the unwrap was priced via the exchange rate, not blindly executed)

Given test_unwrapToWETH_PropagatesSlippageBreach
When the dex swap reverts with SwapSlippageBreach
Then the unwrap action re-throws as the SAME error type (no swallowing or silent transform)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every test file ≤ 400 LOC

Given coverage
When `pnpm --filter @concierge/meth-staking run test --coverage` runs
Then line coverage on `src/` ≥ 80%
```

---

## Shell verification

```bash
pnpm --filter @concierge/meth-staking run test --reporter=verbose
test $? -eq 0

pnpm --filter @concierge/meth-staking run test --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 14 {exit 0} {exit 1}'

# Critical load-bearing tests
for tn in "MissingDexProvider" "NoL1Actions" "RoutesThroughDexProvider"; do
  pnpm --filter @concierge/meth-staking run test --reporter=verbose 2>&1 | grep "$tn" | grep -q "✓" || { echo "missing $tn"; exit 1; }
done

# Coverage ≥ 80%
cov=$(pnpm --filter @concierge/meth-staking run test --coverage 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 80

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **The `NoL1Actions` invariant test** parallels Ondo's `NoMutationActions`. Single test, blocks future regressions that add nativeUnstake to Concierge agent (which would break across the entire Sepolia path — mETH on L2 has no such function).
- **The `RoutesThroughDexProvider` spy test** uses Vitest's `vi.spyOn(dexProvider.actions.swap, 'execute')` to verify the unwrap composes correctly. If a future PR silently routes unwrap to a custom contract instead of the dex provider, this test catches it.
- **`PropagatesSlippageBreach`** is the no-silent-failure guard for cross-provider composition. If the dex swap throws, the unwrap should propagate, not eat the error and return a successful-looking response.
- **Tolerance windows** are wide on yield rate (50 bps) because live Mantle rate is volatile across days. The MATH is asserted on hardcoded fixtures; the live-data test is a sanity check.
- **No native staking flow tests** — there's nothing to test on L2 mETH. The user acquires mETH off-chain (bridge or buy); Concierge observes + can unwrap-via-DEX.
- Cross-ref: `research/concierge/03-providers/meth-staking.md` § Open questions.
