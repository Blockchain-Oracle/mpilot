# Story — Reputation read SDK (fetch attestations + payloads from chain + IPFS)

**ID:** story-84-reputation-read-sdk
**Epic:** Epic E6 — ERC-8004 Attestation Flow
**Depends on:** story-42-erc8004-provider, story-83-attestation-write-pipeline
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge dashboard + agent reputation page + judge auditor
**I want to** a `loadAgentHistory({ agentId, chain })` function returns ALL attestations for an agent (paginated by 50), each enriched with the IPFS-fetched payload, with caching to avoid re-fetching IPFS content
**So that** the agent dashboard renders fast (cached), the reputation page shows full history, and judges can audit the agent's track record via a single SDK call

---

## File modification map

- `packages/attestation/src/loadAgentHistory.ts` — NEW — `loadAgentHistory({ agentId, chain, limit = 50, offset = 0 })`. Reads from ReputationRegistry via erc8004Provider.readFeedback → for each attestation, fetches `dataURI` content via IPFS gateway (`https://ipfs.io/ipfs/<cid>` with fallback `https://cloudflare-ipfs.com/ipfs/<cid>`) → parses + validates against FeedbackEnvelope Zod schema → returns enriched list.
- `packages/attestation/src/ipfsCache.ts` — NEW — `getOrFetchPayload(cid)`: checks Postgres `ipfs_cache` table first; if hit, returns cached; if miss, fetches via gateway, validates schema, caches, returns. TTL: 30 days (immutable IPFS content; long TTL is safe).
- `packages/db/src/schema/ipfsCache.ts` — NEW — `ipfs_cache { cid (text pk); content (text); fetchedAt; lastAccessedAt }`
- `packages/db/migrations/0003_ipfs_cache.sql` — NEW — Drizzle migration
- `packages/attestation/src/__tests__/loadAgentHistory.test.ts` — NEW — integration test on Sepolia fork: pre-attest 5 actions across 3 schemas → loadAgentHistory returns all 5 with payloads decoded → second call uses cache (verified via spy on IPFS gateway calls)

---

## Acceptance criteria (BDD)

```
Given loadAgentHistory is called for an agent with 5 attestations
When the function runs
Then it returns an array of 5 entries, each with { attestationUid, schema, payload (decoded JSON), txHash, blockNumber }

Given the IPFS payload validates against the FeedbackEnvelope schema
When loadAgentHistory parses it
Then the typed payload is exposed (TypeScript type per schema discriminator)

Given an IPFS gateway returns 404 (CID not pinned anywhere)
When loadAgentHistory encounters it
Then it returns { ...partial, payload: null, payloadError: 'NOT_FOUND' } for that entry (NOT throw; partial results are better than complete failure)

Given an IPFS payload is malformed (doesn't pass FeedbackEnvelope schema)
When loadAgentHistory parses it
Then payload: null, payloadError: 'SCHEMA_VIOLATION' (typed; surfaces in the dashboard as "malformed attestation" rather than silent skip)

Given the cache table is populated from a previous fetch
When loadAgentHistory is called for the same agent within 30 days
Then NO IPFS gateway HTTP calls are made (verified via spy); all payloads come from cache

Given pagination
When `loadAgentHistory({ agentId, limit: 10, offset: 0 })` then `{ ..., offset: 10 }`
Then the two responses contain different entries (next 10) AND total count is consistent

Given the cache lastAccessedAt
When a cached payload is read
Then lastAccessedAt is updated (for LRU eviction later — out of scope for v1, but the column is populated correctly)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/attestation
test -f src/loadAgentHistory.ts
test -f src/ipfsCache.ts

cd ../..

test -f packages/db/src/schema/ipfsCache.ts
test -f packages/db/migrations/0003_ipfs_cache.sql

pnpm --filter @concierge-mantle/attestation run build
test $? -eq 0

# Integration test passes
pnpm --filter @concierge-mantle/attestation run test 2>&1 | grep "loadAgentHistory" | grep -q "PASS"

# Cache hit avoids IPFS calls
pnpm --filter @concierge-mantle/attestation run test --reporter=verbose 2>&1 | grep "cache.*hit" | grep -q "✓"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **IPFS cache is a Postgres table**, not Redis. Per ADR-009: Postgres for durable state; Redis for ephemeral. IPFS-cached content is durable (immutable content, addressed by hash) — belongs in Postgres.
- **30-day TTL is safe** because IPFS content is content-addressed (CID = hash of content). If the content ever changes, the CID changes — so a cached entry can never be stale.
- **Partial results > complete failure.** Per CLAUDE.md no-silent-failures + UX: if 1 of 50 attestations has a broken CID, return 49 + 1 with `payloadError: 'NOT_FOUND'`. The dashboard renders the broken one as a placeholder; the rest are fine.
- **`payloadError` field is typed**, NOT a free-form string. Possible values: `'NOT_FOUND' | 'SCHEMA_VIOLATION' | 'TIMEOUT' | 'INVALID_HASH'`. Enables structured handling on the dashboard side.
- **Two IPFS gateways with fallback.** Primary: `ipfs.io`. Fallback: `cloudflare-ipfs.com`. Both are free; if one is throttled, try the other.
- **The hash verification is critical** but added in v1.1: compute `keccak256(canonicalize(fetched_payload))` and compare to the on-chain dataHash. If they differ, the payload was tampered with at the gateway — `payloadError: 'INVALID_HASH'`. For v1, trust the gateway; v1.1 adds this anti-tamper check.
- **Pagination defaults to 50** — the typical dashboard page size. Agents may have 1000s of attestations; loading all upfront would be slow.
- Cross-ref: `research/concierge/03-providers/erc8004.md` § Open questions (pagination), § dataURI fetching.
