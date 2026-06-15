# Story — IPFS pinning via Pinata (with web3.storage fallback)

**ID:** story-81-ipfs-pinning-pinata
**Epic:** Epic E6 — ERC-8004 Attestation Flow
**Depends on:** story-80-feedback-uri-schema
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge agent runtime
**I want to** a `pinFeedback(envelope)` function uploads the canonical JSON to Pinata (primary) AND web3.storage (fallback), returns the IPFS CID, and persists both pin receipts to Postgres
**So that** the off-chain attestation content is permanently retrievable via `ipfs://<cid>` even if one pinning service has an outage, and judges can verify any attestation by fetching the JSON from a standard IPFS gateway

---

## File modification map

- `packages/attestation/src/pin.ts` — NEW — `pinFeedback(envelope)`: canonicalize → pin to Pinata via JSON Pinning API (auth via `PINATA_JWT`) → on success, return CID; on failure, try web3.storage (auth via `WEB3_STORAGE_TOKEN`). Returns `{ cid: string; primaryPin: { service: 'pinata'; pinId: string; ok: boolean }; fallbackPin: { service: 'web3.storage'; pinId?: string; ok: boolean } }`. Throws `IPFSPinFailed` only if BOTH services fail.
- `packages/attestation/src/pinReceipt.ts` — NEW — `recordPinReceipt({ cid, envelope, primary, fallback })` inserts a row in `pin_receipts` table (added in this story's migration) with the pin services + timestamps. Used for post-hoc audit "did we pin everything?".
- `packages/db/src/schema/pinReceipts.ts` — NEW — `pin_receipts { id; cid; agentId; primaryService; primaryPinId; primaryOk; fallbackService; fallbackPinId; fallbackOk; createdAt }`
- `packages/db/migrations/0002_pin_receipts.sql` — NEW — Drizzle-generated migration
- `packages/attestation/src/__tests__/pin.test.ts` — NEW — unit tests with MSW: happy path (Pinata succeeds), Pinata fails + web3.storage succeeds, both fail → throws, CID matches expected for a known fixture

---

## Acceptance criteria (BDD)

```
Given pinFeedback is called with a valid envelope
When Pinata returns success
Then result.cid is a valid IPFS CIDv1 (starts with 'bafy') AND result.primaryPin.ok === true AND result.fallbackPin.ok === true (web3.storage is also pinned for redundancy, NOT skipped)

Given Pinata returns 503 (down)
When pinFeedback runs
Then web3.storage is called; result.cid is valid; primaryPin.ok === false AND fallbackPin.ok === true

Given BOTH Pinata and web3.storage fail
When pinFeedback runs
Then it throws `IPFSPinFailed({ primary: { ... }, fallback: { ... } })` (typed; includes both failure details for debugging)

Given a known envelope fixture
When pinned to a local IPFS node + retrieved
Then the canonical JSON matches the original envelope byte-for-byte (round-trip integrity)

Given the pin receipt is recorded
When the DB is queried by CID
Then the pin_receipts row exists with both service IDs (or fallback null if primary succeeded)

Given the canonical JSON is what's pinned
When the IPFS content is fetched and re-hashed
Then `keccak256(content)` === the hash computed locally before pinning (the on-chain feedbackHash matches the actual IPFS content — verifiability holds)

Given PINATA_JWT is missing
When pinFeedback runs
Then it skips Pinata entirely AND goes directly to web3.storage (graceful degradation; logs warning)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/attestation
test -f src/pin.ts
test -f src/pinReceipt.ts

cd ../..

test -f packages/db/src/schema/pinReceipts.ts
test -f packages/db/migrations/0002_pin_receipts.sql

pnpm --filter @mpilot/attestation run build
test $? -eq 0

# Tests pass with the dual-pin redundancy test + both-fail-throws test
pnpm --filter @mpilot/attestation run test --reporter=verbose 2>&1 | grep -E "(Pinata.*succeeds|Pinata.*fails|both.*fail)" | grep -q "✓"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Dual-pin redundancy.** Even on the happy path, pin to BOTH services. Pinata is faster/cheaper; web3.storage is the backup. If Pinata's CDN goes down for a day, judges can still fetch via web3.storage gateway. The cost (2× pin operations) is negligible for the trust gain.
- **`IPFSPinFailed` only thrown if BOTH fail.** Per CLAUDE.md no-silent-failures + research/concierge/03-providers/erc8004.md § Open questions: pinning failure for ONE service is degraded service (logged), failure for BOTH is a true error.
- **CIDv1 format** (`bafy...`) is the modern standard. Pinata + web3.storage both return CIDv1 by default. Validate via regex `^bafy[a-z2-7]{52,}$`.
- **Round-trip integrity test** is the critical correctness check. If the canonicalize → pin → fetch → hash chain produces a different hash, on-chain verification breaks silently. Test this on every PR via the fixture.
- **`PINATA_JWT` is the auth token.** Pinata's JWT auth is more secure than API key + secret pair; use JWT. Get from Pinata dashboard.
- **`WEB3_STORAGE_TOKEN` is the auth token.** API token from web3.storage dashboard.
- **No retries on a single service.** If Pinata returns 503, immediately fall back to web3.storage; don't burn time retrying Pinata. Speed matters for the user-facing flow.
- **`pin_receipts` table** is for post-hoc audit. Lets us answer "for every attestation in the executions table, did we successfully pin both services?" via a SQL join. Helps detect silent pin-degradation over time.
- Cross-ref: `research/concierge/03-providers/erc8004.md` § Open questions.
