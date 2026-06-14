# Story — `@concierge-mantle/mantle-dex` integration tests

**ID:** story-33-mantle-dex-tests
**Epic:** Epic E3 — Action Providers
**Depends on:** story-32-mantle-dex-provider
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** the mantle-dex provider has integration tests that exercise quote + swap end-to-end against an Anvil fork of Mantle Mainnet, asserting best-venue selection, slippage enforcement, and the re-quote-on-execute pattern
**So that** the aggregation logic is provably correct against real on-chain liquidity, not just a mocked happy path

---

## File modification map

- `packages/providers/mantle-dex/src/__tests__/provider.test.ts` — NEW — provider construction + action surface
- `packages/providers/mantle-dex/src/__tests__/actions/quote.test.ts` — NEW — fork test: USDC↔sUSDe, USDC↔USDe, USDC↔WMNT, USDC↔mETH — each asserts ≥ 2 venues return non-null quotes
- `packages/providers/mantle-dex/src/__tests__/actions/swap.test.ts` — NEW — fork test: happy path (USDC → sUSDe, $10) + slippage breach (artificially squeeze post-quote price) + re-quote case (force best venue to change between quote and execute)
- `packages/providers/mantle-dex/src/__tests__/venues/merchantMoe.test.ts` — NEW — fork test against Merchant Moe-only routes
- `packages/providers/mantle-dex/src/__tests__/venues/agni.test.ts` — NEW — Agni fee-tier picker test (stable pair picks 100 bps; volatile pair picks 3000 bps)
- `packages/providers/mantle-dex/src/__tests__/venues/woofi.test.ts` — NEW — WOOFi quote + null-on-no-route case
- `packages/providers/mantle-dex/src/__tests__/venues/fusionx.test.ts` — NEW — FusionX V3 quote + swap
- `packages/providers/mantle-dex/src/__tests__/aggregation.test.ts` — NEW — best-of-N selection unit tests with fixture data (no chain — pure compute on mock venue outputs)
- `packages/providers/mantle-dex/src/__tests__/setup.ts` — NEW — spawns Anvil fork from Mantle Mainnet (`MANTLE_RPC_URL` required env), seeds wallets with test tokens via direct storage manipulation (`anvil_setStorageAt`)
- `packages/providers/mantle-dex/vitest.config.ts` — NEW — `pool: 'forks'`, 60s timeout (Mainnet fork is slower to spin up than Sepolia)

---

## Acceptance criteria (BDD)

```
Given Vitest is configured
When `pnpm --filter @concierge-mantle/mantle-dex run test` runs
Then exit code is 0 AND ≥ 25 test cases pass

Given quote_USDC_to_sUSDe
When called with 100e6 USDC against fork of Mainnet
Then ≥ 2 venues return non-null quotes AND bestAmountOut > 0 AND bestRoute names the venue that actually returned the max amountOut (no silent best-of-null bug)

Given test_swap_HappyPath_USDC_to_sUSDe
When swap 10 USDC against the fork
Then user's sUSDe balance increases by ≥ quote.amountOutMin, attestation payload matches `concierge.mantle-dex.<venue>.swap.v1`, txHash is valid

Given test_swap_SlippageBreach_RevertsBeforeSubmit
When swap is called with extremely tight slippage (1 bps) on a pair with material spread
Then `SwapSlippageBreach({ expected, actual, slippageBps })` is thrown BEFORE any tx is submitted (assert via Anvil mempool count == pre-call count)

Given test_swap_RequoteOnExecute_PicksFreshBest
When the test force-changes the best venue between quote and execute (via direct pool-state poke on the fork)
Then swap routes through the NEW best venue, not the stale one — verified by checking the actual router address invoked

Given test_quote_NoRouteVenueReturnsNullCleanly
When quoting a niche pair where WOOFi has no listing
Then `allRoutes.woofi === null` (not undefined, not throw, not 0n), and bestRoute selection ignores it

Given test_agni_FeeTierPicker_StablePair
When quoting USDC → USDe via Agni
Then the 100 bps (0.01%) fee tier returns the best quote

Given test_agni_FeeTierPicker_VolatilePair
When quoting USDC → WMNT
Then the 3000 bps tier returns the best quote (or 500 bps depending on actual Mainnet pool state; assert via reading currently-deepest pool)

Given test_aggregation_PureCompute
When the venue-agnostic best-of-N selector is called with hand-crafted fixture data (3 venues, known amounts)
Then it picks the venue with max amountOut and rejects null entries

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every test file ≤ 400 LOC

Given coverage gate
When `pnpm --filter @concierge-mantle/mantle-dex run test --coverage` runs
Then line coverage on `src/` is ≥ 80% (lower than Aave's 85% because off-chain quote logic has wider permutation space)
```

---

## Shell verification

```bash
# Pre-flight
test -n "$MANTLE_RPC_URL"

# Tests pass
pnpm --filter @concierge-mantle/mantle-dex run test --reporter=verbose
test $? -eq 0

# ≥ 25 test cases
pnpm --filter @concierge-mantle/mantle-dex run test --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 25 {exit 0} {exit 1}'

# Slippage-breach + re-quote tests are present and passing
for tn in SlippageBreach_RevertsBeforeSubmit RequoteOnExecute_PicksFreshBest NoRouteVenueReturnsNullCleanly; do
  pnpm --filter @concierge-mantle/mantle-dex run test --reporter=verbose 2>&1 | grep "$tn" | grep -q "✓" || { echo "missing $tn"; exit 1; }
done

# Coverage ≥ 80%
cov=$(pnpm --filter @concierge-mantle/mantle-dex run test --coverage 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 80

# No file exceeds 400 LOC
bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Fork from Mainnet, not Sepolia** for this test suite — the DEXes only have meaningful liquidity on Mainnet. Sepolia has thin/no liquidity for stable pairs. Set `MANTLE_RPC_URL` env on CI.
- **`anvil_setStorageAt`** seeds tokens via direct slot writes — faster than running real DEX swaps to acquire test balances. The slot numbers for ERC-20 balances on each token live in `src/__tests__/fixtures/token-slots.ts` (mapping address → balance-slot-number; canonical for OpenZeppelin tokens is slot 0 or 9 depending on inheritance order).
- **Re-quote test is load-bearing.** Without it, a future refactor could break the freshness guard and ship a regression where quote→execute uses stale routing. Force the test by: (1) quote once → captured best venue, (2) `anvil_setStorageAt` to drain liquidity from that venue's pool, (3) call swap, (4) assert the router address invoked is NOT the stale venue's. Reference: `research/concierge/03-providers/mantle-dex.md` § Risks.
- **Slippage-breach test asserts NO TX is submitted** — same pattern as the E-Mode trap test (story-31). Assert against Anvil's mempool: `await anvilClient.getPendingTransactionCount()` before and after the call must be unchanged.
- **Aggregation pure-compute test** decouples best-of-N logic from chain state. Hand-craft inputs `[{ venue: 'a', amountOut: 100n }, { venue: 'b', amountOut: null }, { venue: 'c', amountOut: 150n }]` → assert bestRoute === 'c'. Catches silent null-comparison bugs (e.g., `null > 100` evaluates to `false` in JS but `Math.max(null, 100) === NaN` in some paths).
- **WOOFi nuance:** WooPPV2 reverts on no-route instead of returning 0. Wrap in try/catch in `venues/woofi.ts` → return `null`. Test verifies the wrap is in place.
- **Coverage gate 80%** because the venue-specific routing paths multiply quickly (5 venues × 2 actions × multiple fee tiers). 80% catches the main paths; exhaustive coverage is the integration test's job, not the unit test's.
- **60s timeout** because Mainnet fork startup + first quote round is slow (~10-15s). Per-test 2-5s.
- Cross-ref: `research/concierge/03-providers/mantle-dex.md` § Risks + edge cases (every test case maps to one).
