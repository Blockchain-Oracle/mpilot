# Story 44 — Tool: external API wrappers (Nansen, Allora, sanction-screen) + MSW mocks

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-40-claude-agent-sdk-bootstrap

## BDD Acceptance Criteria

```
Given the agent registry is initialized
When `registerExternalApiTools()` is called at boot
Then 3 tools are registered: nansenAddressLabels, alloraDepegProbability, sanctionScreen
(Note: a 4th `chainlinkPriceProof`-style tool was originally scoped here but removed per AUDIT-1 — no direct Chainlink sUSDe/USD feed exists on Mantle; on-chain Aave Oracle reads are covered by story-42's `getOraclePrices` and that is the single source of price truth.)
And each tool has a Zod input schema + output schema
And missing API keys cause boot-time zod env validation failure (NOT first-call failure)

Given the agent calls `nansenAddressLabels({ address })`
When the handler runs
Then it calls Nansen's address-labels endpoint with NANSEN_API_KEY in the header
And the result is `{ address, labels: string[], riskScore: number, isContract: boolean }`
And the response is cached in Redis with a 24h TTL keyed by lowercased address
And rate-limit headers (X-RateLimit-Remaining) are observed; when < 5 the call defers and returns `{ error: 'rate_limited', retryAfterSeconds }`

Given the agent calls `alloraDepegProbability({ asset: 'sUSDe' })`
When the handler runs
Then it calls Allora's inference endpoint for the depeg-probability topic for `asset`
And the result is `{ asset, probability: number, confidence: number, windowMinutes: number, inferenceId: string }`
And the inferenceId is logged so the on-chain receipt (story-52) can attest to the exact inference

Given the agent calls `sanctionScreen({ address })`
When the handler runs
Then it checks the address against OFAC SDN list (via Chainalysis API or a local snapshot) AND against Nansen's high-risk labels
And the result is `{ address, sanctioned: boolean, sources: string[], matchedListEntries: string[] }`
And if sanctioned=true, the tool result is also written to the events table with event_name='SanctionMatched'

Given any external API returns 5xx
When the handler retries up to 3 times with exponential backoff (200ms, 800ms, 2000ms)
Then if all retries fail the tool returns `{ error: 'upstream_unavailable', source: 'nansen' }`
And the agent loop continues — does NOT crash the runner
```

## File modification map

- `apps/api/src/agent/tools/external/nansen.ts` — NEW — `nansenAddressLabels` tool: fetch via `undici` request; Redis-backed cache; rate-limit observation
- `apps/api/src/agent/tools/external/allora.ts` — NEW — `alloraDepegProbability` tool: fetch from Allora topic endpoint; result includes inferenceId for on-chain attestation
- `apps/api/src/agent/tools/external/sanctionScreen.ts` — NEW — `sanctionScreen` tool: layered check (OFAC + Nansen high-risk + local snapshot); writes events row on match
- `apps/api/src/agent/tools/external/httpClient.ts` — NEW — shared retry-with-backoff wrapper around `undici.request`; standardizes rate-limit handling + error shape
- `apps/api/src/agent/tools/external/cache.ts` — NEW — Redis cache helpers `cacheGet`, `cacheSet` with TTL; uses existing ioredis client from story-39
- `apps/api/src/agent/tools/external/schemas.ts` — NEW — Zod input + output schemas for all 4 tools
- `apps/api/src/agent/tools/external/registerExternal.ts` — NEW — `registerExternalApiTools(registry)` wires all 4
- `apps/api/src/agent/bootstrap.ts` — UPDATE — call `registerExternalApiTools` after read + write tools
- `apps/api/src/lib/env.ts` — UPDATE — add `NANSEN_API_KEY: z.string().min(1)`, `ALLORA_API_KEY: z.string().min(1)`, `CHAINALYSIS_API_KEY: z.string().min(1).optional()` (sanction screen has OFAC-only fallback)
- `apps/api/src/agent/tools/external/__mocks__/handlers.ts` — NEW — MSW request handlers for Nansen, Allora, Chainalysis with realistic happy + failure responses
- `apps/api/src/agent/tools/external/__tests__/external.test.ts` — NEW — Vitest using MSW: per tool covers (1) happy path with cache miss → cache hit, (2) rate-limited deferral, (3) 5xx retry exhaustion, (4) sanctioned-address match writes events row

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/tools/external/nansen.ts
test -f src/agent/tools/external/allora.ts
test -f src/agent/tools/external/sanctionScreen.ts
test -f src/agent/tools/external/httpClient.ts
test -f src/agent/tools/external/__mocks__/handlers.ts

# Retry backoff is explicit
grep -q "200\|800\|2000\|backoff" src/agent/tools/external/httpClient.ts

# Rate limit handling present
grep -q "X-RateLimit-Remaining\|rate_limited" src/agent/tools/external/nansen.ts

# 24h cache TTL on Nansen
grep -q "86400\|24" src/agent/tools/external/nansen.ts

# Inference ID surfaced for attestation
grep -q "inferenceId" src/agent/tools/external/allora.ts

# Tests pass with MSW (no live calls)
pnpm vitest run src/agent/tools/external/__tests__/external.test.ts
test $? -eq 0

# Typecheck
pnpm typecheck
test $? -eq 0
```

## Notes

- Per architecture stack: Nansen for address labels + risk scores, Allora for depeg probability inference. **Prices are sourced via story-42's `getOraclePrices` (Aave Oracle on Mantle per ADR-003) — not via an external Chainlink wrapper, because no direct Chainlink sUSDe/USD feed exists on Mantle.**
- Per security domain §1 (oracle landscape): Aave Oracle (Capped sUSDe/USDT/USD composite, per ADR-003) is the canonical on-chain price source on Mantle; Allora is a SECONDARY signal for depeg probability (don't rotate on Allora alone — confirm with an Aave Oracle price deviation).
- Per security domain §3.5 (Sybil reputation): `sanctionScreen` is the gate at merchant verification time (story-49). OFAC alone is insufficient for crypto-native risk; Nansen labels catch known exploit addresses, mixers, and high-risk DEX users.
- All 4 tools wrap external APIs that can be down, rate-limited, or wrong. The retry + cache + structured error pattern is consistent across all 4 — extract to `httpClient.ts` so subsequent tools don't reimplement.
- Allora's `inferenceId` is the receipt primitive — story-52's ERC-8004 entry includes it so anyone auditing the agent's decision can verify the exact inference that triggered a rotation.
- MSW handlers MUST cover happy + failure modes so story-53's fixture recorder can snapshot deterministic responses. NEVER make live API calls in CI.
- Redis cache key for Nansen: `nansen:labels:<lowercase-address>`; for Allora: short TTL (60s) because depeg probability changes rapidly; for Chainalysis: 1h.
- File MUST stay under 400 LOC each. If a single tool grows beyond, split into `<tool>/handler.ts` + `<tool>/types.ts`.
