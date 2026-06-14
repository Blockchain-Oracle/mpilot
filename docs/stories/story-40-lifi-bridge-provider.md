# Story — `@concierge-mantle/lifi-bridge` action provider

**ID:** story-40-lifi-bridge-provider
**Epic:** Epic E3 — Action Providers
**Depends on:** story-22-sdk-skeleton, story-21-shared-abi-imports
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** Concierge agent runtime
**I want to** an `@concierge-mantle/lifi-bridge` package exposes `quote`, `bridge`, `getStatus` actions that wrap the Li.Fi HTTP API for cross-chain bridging (Mantle ↔ Ethereum / Base / Arbitrum / Polygon / Optimism), with two-stage attestation (sent + completed) because bridges take minutes to settle
**So that** the agent can bridge user assets to/from Mantle without managing per-bridge integrations (Stargate, Across, Connext) and the on-chain audit trail captures both the source-chain tx AND the destination-chain settlement

---

## File modification map

- `packages/providers/lifi-bridge/package.json` — NEW — peer deps + workspace deps + `@lifi/sdk` (pinned to current minor)
- `packages/providers/lifi-bridge/src/index.ts` — NEW — barrel exports
- `packages/providers/lifi-bridge/src/provider.ts` — NEW — `createLifiBridgeProvider(opts)` returns ProviderInterface with 3 actions + status-polling helper
- `packages/providers/lifi-bridge/src/actions/quote.ts` — NEW — `quote({ fromChain, toChain, fromToken, toToken, amount, slippageBps, recipient })` calls Li.Fi `/v1/quote` endpoint. Returns `{ routes: Route[]; bestRoute: Route; estimatedDuration: number; bridges: string[] }`. Filters routes by user policy (e.g., exclude certain bridges if the agent has been told to avoid Connext after the 2023 hack).
- `packages/providers/lifi-bridge/src/actions/bridge.ts` — NEW — `bridge({ ...quoteParams, route? })`. Re-quotes if route is stale (>30s old), submits the source-chain tx via viem `walletClient.sendTransaction({ to: lifiDiamond, data, value })`, and returns `{ sourceTxHash, lifiOperationId, expectedCompletionTime, attestationPayload }`. Diamond address: `0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE` (verified 2026-06-04).
- `packages/providers/lifi-bridge/src/actions/getStatus.ts` — NEW — `getStatus({ sourceTxHash, lifiOperationId })` polls Li.Fi `/v1/status` endpoint. Returns `{ status: 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND'; destinationTxHash?: string; bridgeUsed?: string }`. Used by the agent's record() phase to track completion.
- `packages/providers/lifi-bridge/src/sessionKey.ts` — NEW — exports the canonical session-key call policy for Li.Fi: allows ONLY `lifiDiamond` as target, ONLY specific function selectors parsed from the route's `data` field (per ADR-010 + research/concierge/03-providers/lifi-bridge.md § Session-key scoping).
- `packages/providers/lifi-bridge/src/attestation.ts` — NEW — schemas: `concierge.lifi.bridge.sent.v1` (immediately after source tx), `concierge.lifi.bridge.completed.v1` (after destination confirmed). The two-stage attestation captures both events.

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @concierge-mantle/lifi-bridge run build` runs
Then exit code is 0

Given the provider has 3 actions
When createLifiBridgeProvider({rpcUrl, apiKey}) returns
Then Object.keys(provider.actions).sort() === ['bridge','getStatus','quote']

Given the Li.Fi Diamond address resolution
When provider runs on Mantle Mainnet (chainId 5000)
Then it uses '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE' (verified 2026-06-04)

Given quote action against Li.Fi API (live)
When called with `{ fromChain: 5000, toChain: 1, fromToken: USDC_MANTLE, toToken: USDC_ETH, amount: 100e6, recipient }`
Then returns `{ routes: array.length > 0, bestRoute: { gasCostUSD < 50, bridgesUsed }, estimatedDuration: < 1800 }` (under 30 minutes for USDC bridges)

Given bridge action with a fresh quote
When called
Then it submits the source-chain tx, returns immediately with `sourceTxHash` + `attestationPayload` (sent schema), and DOES NOT wait for destination confirmation in this call

Given bridge action with a stale quote (>30s old)
When called with a `route` that's past TTL
Then it re-quotes BEFORE submitting (re-uses logic from quote action), preventing stale-route-execution

Given getStatus polling
When called with valid `{ sourceTxHash, lifiOperationId }`
Then it returns status; if status === 'DONE', the destinationTxHash is populated

Given the two-stage attestation
When bridge() returns with the sent attestation
Then `attestationPayload.schema === 'concierge.lifi.bridge.sent.v1'` AND payload includes `{ sourceTxHash, lifiOperationId, fromChain, toChain, expectedCompletionTime }`

Given getStatus returns DONE
When the runtime calls back to attest the completion
Then the agent records a SECOND attestation with `schema: 'concierge.lifi.bridge.completed.v1'` linking to the original lifiOperationId

Given the session-key call policy is exported
When the runtime initializes a session key for this provider
Then `sessionKey.callPolicy.targets === [lifiDiamond]` AND `sessionKey.callPolicy.selectors` is non-empty (the policy is restrictive, NOT a wildcard)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/providers/lifi-bridge
test -f package.json
test -f src/provider.ts
for action in quote bridge getStatus; do
  test -f src/actions/$action.ts
done
test -f src/sessionKey.ts

cd ../../..

pnpm --filter @concierge-mantle/lifi-bridge run build
test $? -eq 0
pnpm run typecheck

# Diamond address present
grep -q "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE" packages/providers/lifi-bridge/src/provider.ts

# Two-stage attestation schemas present
grep -q "concierge.lifi.bridge.sent.v1" packages/providers/lifi-bridge/src/attestation.ts
grep -q "concierge.lifi.bridge.completed.v1" packages/providers/lifi-bridge/src/attestation.ts

# Session-key policy restricts to lifiDiamond
grep -q "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE" packages/providers/lifi-bridge/src/sessionKey.ts

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Li.Fi is an HTTP-API-first integration**, not pure on-chain. Per `research/concierge/03-providers/lifi-bridge.md`. The `@lifi/sdk` npm package wraps the HTTP API; we use it to avoid hand-rolling JSON contracts. Pinned version is critical — Li.Fi's API has evolved and old SDK versions silently drop new route options.
- **Two-stage attestation is the load-bearing design choice.** A bridge is NOT one action — it's two distinct events (source-chain submission, destination-chain settlement). Attesting only the source tx would leave gaps in the on-chain audit trail. The agent's record() phase fires the `sent` attestation immediately and queues a follow-up that fires the `completed` attestation once getStatus returns DONE.
- **Stale-route guard (30s TTL)** prevents the agent from executing a quote that's been sitting in the proposal queue. Bridge prices move fast; a 5-minute-old quote could be 1% off. Re-quote inside bridge().
- **Session-key call-policy is RESTRICTIVE.** Per ADR-010 + research/concierge/03-providers/lifi-bridge.md § Session-key scoping: the policy allows ONLY the Li.Fi Diamond contract as a call target. Function selectors are parsed from the route's `data` field (Li.Fi calls swap-and-bridge functions; we whitelist exactly those selectors, not all of Diamond's selectors). This prevents a compromised session key from calling arbitrary Diamond functions.
- **No bridge name hardcoded.** Li.Fi routes through Stargate / Across / Connext / etc. transparently; the agent doesn't care which. The status response includes `bridgeUsed` for the attestation payload — but the agent does NOT branch on it.
- **API key from env**: `LIFI_API_KEY` (optional for read endpoints, recommended for write to avoid rate limits). Read from config-loader (story-24).
- **Mantle is supported as both source and destination chain.** Verified via Li.Fi `/v1/chains` endpoint per AUDIT-2026-06-04.
- Cross-ref: ADR-010 (session-key scoping), `research/concierge/03-providers/lifi-bridge.md` (every API endpoint + integration pattern + two-stage attestation rationale).
