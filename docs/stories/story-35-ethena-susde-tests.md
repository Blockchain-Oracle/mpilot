# Story — `@concierge-mantle/ethena-susde` integration tests

**ID:** story-35-ethena-susde-tests
**Epic:** Epic E3 — Action Providers
**Depends on:** story-34-ethena-susde-provider
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** the ethena-susde provider has Vitest integration tests covering wrap/unwrap on a Sepolia mock fork, yield-rate derivation, and the carry-vs-Aave spread-floor logic across positive/inverted/zero cases
**So that** the spread-floor primitive (which the agent's plan() phase uses to refuse new borrow positions) is provably correct against every edge case judges will probe

---

## File modification map

- `packages/providers/ethena-susde/src/__tests__/provider.test.ts` — NEW — construction + action surface
- `packages/providers/ethena-susde/src/__tests__/actions/wrapToSusde.test.ts` — NEW — fork test on Sepolia mocks: wrap 100 USDe → assert sUSDe balance + attestation
- `packages/providers/ethena-susde/src/__tests__/actions/unwrapToUSDe.test.ts` — NEW — fork test: instant unwrap on Sepolia (no cooldown assertion) + decimals handling
- `packages/providers/ethena-susde/src/__tests__/actions/getYieldRate.test.ts` — NEW — pure-compute yield derivation from baseline + current rate
- `packages/providers/ethena-susde/src/__tests__/actions/getCarryVsAave.test.ts` — NEW — composition test: positive carry, inverted carry, spread-floor breach
- `packages/providers/ethena-susde/src/__tests__/selectors.test.ts` — NEW — convertToShares/convertToAssets math
- `packages/providers/ethena-susde/src/__tests__/setup.ts` — NEW — Anvil fork from Sepolia + deploy mocks (uses HelperConfig output addresses)
- `packages/providers/ethena-susde/vitest.config.ts` — NEW — `pool: 'forks'`, 30s timeout

---

## Acceptance criteria (BDD)

```
Given Vitest is configured
When `pnpm --filter @concierge-mantle/ethena-susde run test` runs
Then exit code is 0 AND ≥ 18 test cases pass

Given test_wrap_HappyPath
When 100 USDe is wrapped
Then USDe balance -= 100e18, sUSDe balance += convertToShares(100e18), attestation schema === "concierge.ethena.wrap.v1"

Given test_unwrap_NoCooldownOnMantle
When unwrap is called immediately after wrap (no time delay)
Then it succeeds (no cooldown revert) — verified by the absence of any cooldown event/revert

Given test_unwrap_DecimalsExact
When unwrap is called with an oddly-precise share amount (e.g., 12345678901234567n)
Then the returned USDe equals `convertToAssets(12345678901234567n)` exactly (no rounding loss; integer division semantics asserted)

Given test_yieldRate_DerivationFromBaseline
When baseline rate = 1.0e18 (1 sUSDe = 1 USDe at t0), current rate = 1.04e18 (1 sUSDe = 1.04 USDe at t0+1yr)
Then derived yieldBps === 400 (4.00% annualized)

Given test_yieldRate_ShortInterval
When elapsed = 1 day + delta rate = 0.0001 (1 bps daily)
Then annualized yieldBps ≈ 365 (asserted with tolerance ±5 bps)

Given test_carry_PositiveCase
When susdeYieldBps=380, usdcBorrowBps=351
Then result === { susdeYieldBps: 380, usdcBorrowBps: 351, carryBps: 29, spreadFloorPassing: true } with default floor=0

Given test_carry_InvertedCase
When susdeYieldBps=200, usdcBorrowBps=400
Then carryBps === -200 AND spreadFloorPassing === false

Given test_carry_BreachAgainstNonZeroFloor
When susdeYieldBps=380, usdcBorrowBps=351, spreadFloor=50 (require ≥0.5%)
Then carryBps === 29 (< 50) AND spreadFloorPassing === false

Given test_provider_ComposesAaveSelectors
When the provider is constructed without an Aave selector dependency injected
Then it fails fast at construction with `MissingDependency('@concierge-mantle/aave-v3-mantle')` (NEVER silently returns undefined from getCarryVsAave at call time)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given coverage
When `pnpm --filter @concierge-mantle/ethena-susde run test --coverage` runs
Then line coverage on `src/` ≥ 85%
```

---

## Shell verification

```bash
pnpm --filter @concierge-mantle/ethena-susde run test --reporter=verbose
test $? -eq 0

pnpm --filter @concierge-mantle/ethena-susde run test --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 18 {exit 0} {exit 1}'

# Critical tests present
for tn in "NoCooldownOnMantle" "InvertedCase" "BreachAgainstNonZeroFloor"; do
  pnpm --filter @concierge-mantle/ethena-susde run test --reporter=verbose 2>&1 | grep "$tn" | grep -q "✓" || { echo "missing $tn"; exit 1; }
done

# Coverage ≥ 85%
cov=$(pnpm --filter @concierge-mantle/ethena-susde run test --coverage 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 85

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **`MissingDependency` fail-fast at construction.** This is the standard pattern for cross-provider composition. If `createEthenaSusdeProvider({aaveProvider})` is called without `aaveProvider`, fail at construction NOT when `getCarryVsAave` is invoked. Silent undefined returns from a tick-loop phase cause hard-to-debug "agent stops ticking" bugs. Per `feedback_audits_can_be_wrong.md` + CLAUDE.md no-silent-failures rule.
- **`spreadFloorPassing` is a boolean, NOT a number.** The agent's plan() phase needs a clean predicate to gate borrow decisions. `if (carry.spreadFloorPassing === false)` is the canonical guard.
- **Yield rate derivation precision** — for small intervals, the naive `(current/baseline)^(year/elapsed) - 1` can over-amplify. Use natural-log approximation for elapsed < 1 day: `yieldAnnualized = (current - baseline) / baseline * (year_seconds / elapsed_seconds)`. Tolerance of ±5 bps absorbs the small linearization error.
- **decimals are critical for stable-pair math.** USDe = 18, USDC = 6. The conversion in attestation payloads always uses the token's native decimals — `amountBase` is the on-chain amount, NOT a USD-normalized number.
- **Sepolia setup detail:** MockAaveOracle exposes a `setAssetPrice` admin function (story-16). Tests use it to simulate sUSDe price drift, which drives yield-rate derivation. For the inverted-carry test, set sUSDe price low + USDC borrow rate high via MockAavePool's `mockSetReserveData`.
- **Time travel on Anvil:** `anvilClient.setNextBlockTimestamp(t)` + `mine(1)` advances time deterministically. Use for elapsed-time tests on yield derivation.
- Cross-ref: `research/concierge/03-providers/ethena-susde.md` § Risks (every test case maps to one).
