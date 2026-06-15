# Story — `@mpilot/lifi-bridge` integration tests

**ID:** story-41-lifi-bridge-tests
**Epic:** Epic E3 — Action Providers
**Depends on:** story-40-lifi-bridge-provider
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** mPilot maintainer
**I want to** the lifi-bridge provider has tests covering quote accuracy + bridge tx submission + two-stage attestation + stale-route refresh + session-key policy restrictiveness, with the Li.Fi HTTP API mocked via MSW (so tests don't depend on live API uptime)
**So that** behavioral guarantees hold even when Li.Fi's API is rate-limiting or down, and the policy assertions catch any future loosening of the session-key scope

---

## File modification map

- `packages/providers/lifi-bridge/src/__tests__/provider.test.ts` — NEW — construction + action surface + chain address resolution
- `packages/providers/lifi-bridge/src/__tests__/actions/quote.test.ts` — NEW — happy quote + filtered-bridges policy + no-route case
- `packages/providers/lifi-bridge/src/__tests__/actions/bridge.test.ts` — NEW — bridge submits tx + returns sent attestation + DOES NOT wait for completion
- `packages/providers/lifi-bridge/src/__tests__/actions/getStatus.test.ts` — NEW — status polling: PENDING → DONE state transition + FAILED path
- `packages/providers/lifi-bridge/src/__tests__/two-stage-attestation.test.ts` — NEW — full flow: bridge → attest sent → poll status → attest completed; assert both attestations link via lifiOperationId
- `packages/providers/lifi-bridge/src/__tests__/stale-route.test.ts` — NEW — provide a route with `timestamp: 31 seconds ago`, assert bridge() re-quotes BEFORE submitting
- `packages/providers/lifi-bridge/src/__tests__/session-key-policy.test.ts` — NEW — assert the exported call policy has `targets.length === 1` (just lifiDiamond) and `selectors.length > 0` (specific, NOT wildcard)
- `packages/providers/lifi-bridge/src/__tests__/setup.ts` — NEW — Anvil fork from Mantle Mainnet + MSW handlers for `https://li.quest/v1/*` endpoints
- `packages/providers/lifi-bridge/src/__tests__/__mocks__/lifi-api.ts` — NEW — MSW handlers with realistic responses (5 routes, varied bridges, PENDING/DONE/FAILED status fixtures)
- `packages/providers/lifi-bridge/vitest.config.ts` — NEW — `pool: 'forks'`, 30s timeout, MSW setup imported in setup.ts

---

## Acceptance criteria (BDD)

```
Given Vitest is configured
When `pnpm --filter @mpilot/lifi-bridge run test` runs
Then exit code is 0 AND ≥ 18 test cases pass

Given test_quote_HappyPath
When the MSW handler returns 3 routes for USDC Mantle → USDC Ethereum
Then quote returns `{ routes: array.length === 3, bestRoute: routes[0] (cheapest gas), estimatedDuration: 600 }` from the fixture

Given test_quote_FilteredBridges
When the agent policy excludes 'connext' bridge
Then the returned bestRoute does NOT include Connext in its bridgesUsed (filter applied client-side)

Given test_quote_NoRoute
When the MSW handler returns empty routes
Then quote returns `{ routes: [], bestRoute: null }` (NOT throw — empty is a valid no-route signal)

Given test_bridge_SubmitsAndReturnsSentAttestation
When bridge() runs with a fresh route fixture
Then a tx is submitted to lifiDiamond on the Anvil fork, the returned attestation schema === 'concierge.lifi.bridge.sent.v1', and the function returns IMMEDIATELY (does NOT poll getStatus)

Given test_bridge_StaleRouteRefresh
When bridge() is called with a route whose `timestamp` is 31 seconds in the past
Then a fresh quote() is invoked BEFORE the tx is submitted (verify via MSW request count assertion: quote endpoint hit twice — once by the test setup, once by bridge re-quote)

Given test_getStatus_StateTransitions
When MSW returns 'PENDING' on first poll and 'DONE' on second poll
Then getStatus() returns 'PENDING' first call, 'DONE' with destinationTxHash on second call

Given test_two_stage_attestation_Linkage
When the full flow runs: quote → bridge (sent attestation A) → poll status → record completed attestation B
Then both A and B have the SAME `lifiOperationId` in their payloads (allows cross-attestation linkage on-chain)

Given test_sessionKey_PolicyRestrictive
When `sessionKey.callPolicy` is imported
Then `targets.length === 1` AND `targets[0] === '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE'` (case-insensitive match) AND `selectors.length >= 1` AND `selectors[0]` is a 4-byte hex string (NOT wildcard 0x00000000)

Given test_attestation_LinksSourceAndDestination
When the sent attestation has `sourceTxHash: 0xabc...` and the completed attestation references the same `lifiOperationId`
Then `completedAttestation.payload.sourceTxHash === sentAttestation.payload.sourceTxHash`

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every test file ≤ 400 LOC

Given coverage
When `pnpm --filter @mpilot/lifi-bridge run test --coverage` runs
Then line coverage on `src/` ≥ 85%
```

---

## Shell verification

```bash
pnpm --filter @mpilot/lifi-bridge run test --reporter=verbose
test $? -eq 0

pnpm --filter @mpilot/lifi-bridge run test --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 18 {exit 0} {exit 1}'

# Critical tests present
for tn in "StaleRouteRefresh" "two_stage_attestation_Linkage" "sessionKey_PolicyRestrictive" "FilteredBridges"; do
  pnpm --filter @mpilot/lifi-bridge run test --reporter=verbose 2>&1 | grep "$tn" | grep -q "✓" || { echo "missing $tn"; exit 1; }
done

# Coverage ≥ 85%
cov=$(pnpm --filter @mpilot/lifi-bridge run test --coverage 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 85

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **MSW handlers cover the Li.Fi HTTP API** so tests don't depend on live API uptime. CLAUDE.md "no mocks in the hot path" rule applies to production code paths; tests legitimately mock external services. Document this carve-out in the test setup.
- **The `StaleRouteRefresh` test is load-bearing.** Without it, a future regression could ship code that uses stale routes — 30 seconds of staleness can result in 1% slippage on volatile pairs. Test asserts the re-quote actually happens (via MSW request counter).
- **`sessionKey_PolicyRestrictive` is the security guard.** If a future PR loosens the call policy (e.g., adds a wildcard target), this test fails immediately. Same pattern as Ondo's NoMutationActions invariant test.
- **Two-stage attestation linkage** ensures the on-chain audit trail is complete. Without the linkage assertion, future regressions could break the cross-attestation reference and leave bridges as "half-attested" (sent without completed) — undetectable from on-chain reads without the lifiOperationId.
- **Anvil-fork is for the SOURCE-CHAIN tx submission only.** We don't simulate the destination chain — that's Li.Fi's HTTP API job (mocked via MSW). The fork just confirms the source-chain Diamond call has the right shape.
- **MSW fixtures should include realistic data** — actual route shapes, actual bridge names, actual gas estimates. Reference: Li.Fi's `/v1/quote` response schema in their docs.
- **Use `vi.useFakeTimers()`** for the stale-route test to advance time deterministically without `await new Promise(setTimeout)` hackery.
- Cross-ref: `research/concierge/03-providers/lifi-bridge.md` § Two-stage attestation rationale, ADR-010.
