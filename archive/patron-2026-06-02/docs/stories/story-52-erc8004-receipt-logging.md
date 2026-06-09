# Story 52 — ERC-8004 receipt logging (every decision writes a reputation entry)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-18-reputation-proxy-tests, story-41-agent-context-loader

## BDD Acceptance Criteria

```
Given the agent completes any intent (OpenPosition, RepayPosition, MonitorDepeg, VerifyMerchant, PersonalizeLimits, HandleDispute)
When `logReputationEntry({ userId, action, parameters, txHash, success, reputationDelta })` is called
Then it computes a canonical JSON payload `{ agentIdentityNftId, actionType, parameters, success, timestamp, txHash, taskId, reputationDelta }`
And uploads the payload to IPFS via web3.storage (or a fallback HTTP gateway); returns `cid`
And calls `ReputationProxy.logAction(agentIdentityNftId, actionType, cid, success, reputationDelta)` via viem with the ops wallet
And inserts a row into `reputation_entries` table with all fields + receipt_uri = `ipfs://${cid}`
And returns `{ receiptUri, txHash, cid }`

Given the IPFS upload fails
When the helper retries 3x with exponential backoff
Then if all retries fail it falls back to storing the payload in `reputation_payloads_fallback` table
And the on-chain call still proceeds using `cid = sha256(payload)` as a content-address placeholder
And the row is marked `ipfs_pending=true` so a backfill job can re-upload later
And the receipt URI returned is `pg://reputation_payloads_fallback/<id>` so consumers know it's pending

Given a write tool (openLoan, repayLoan, rotatePosition) completes successfully
When its handler invokes `logReputationEntry`
Then reputationDelta is +1 (success bumps reputation)
And the action is logged BEFORE the handler returns its result
And if logging fails, the handler logs an error but does NOT undo the on-chain tx (logging is best-effort, not transactional)

Given a write tool fails (simulation revert, agent_frozen, cap_exceeded)
When the handler invokes `logReputationEntry` with success=false
Then reputationDelta is 0 (no penalty for safe refusal; only -1 for actual on-chain failure with broadcast)
And the action_type is suffixed with `_refused` or `_failed` to discriminate
And the failure is part of the reputation history (transparent track record)

Given the dashboard activity feed (story-70) renders an action
When the user clicks "view receipt"
Then the URI navigates to `/audit/:txHash` (story-77) which renders the ERC-8004 payload + on-chain proof
And the payload schema is documented in `packages/shared/src/reputationEntry.ts` (importable by web + mini)
```

## File modification map

- `apps/api/src/agent/reputation/logReputationEntry.ts` — NEW — main entrypoint: builds payload → uploads to IPFS → writes on-chain → inserts DB row; returns receipt URI
- `apps/api/src/agent/reputation/ipfsUploader.ts` — NEW — `uploadToIpfs(payload): Promise<string>` using web3.storage SDK; retry-with-backoff; falls back to DB on exhaustion
- `apps/api/src/agent/reputation/payloadBuilder.ts` — NEW — pure helper `buildReputationPayload(input): CanonicalPayload`; sorts keys for deterministic hashing; includes `version: '1'` field for future schema evolution
- `apps/api/src/agent/reputation/canonicalize.ts` — NEW — JSON canonicalization (sorted keys, no insignificant whitespace) so `sha256(payload)` is deterministic for content-addressing
- `apps/api/src/db/schema/reputationEntries.ts` — NEW — Drizzle table: id, user_id, agent_identity_nft_id, action_type, parameters jsonb, success bool, reputation_delta integer, tx_hash, cid, receipt_uri, ipfs_pending bool, created_at
- `apps/api/src/db/schema/reputationPayloadsFallback.ts` — NEW — Drizzle table: id, payload jsonb, computed_cid, uploaded_at (nullable; backfill job sets it)
- `apps/api/src/jobs/ipfsBackfillCron.ts` — NEW — BullMQ repeatable cron (every 15min): finds `ipfs_pending=true` rows, re-uploads, updates `cid + ipfs_pending=false`
- `packages/shared/src/reputationEntry.ts` — NEW — exported Zod schema `ReputationEntrySchema` + canonical TS type; consumed by api + web + mini
- `apps/api/src/agent/reputation/__tests__/logReputationEntry.test.ts` — NEW — Vitest: (1) happy path uploads + writes on-chain + inserts row, (2) IPFS failure → fallback table + pg URI, (3) success bumps reputation +1; refused = 0; on-chain failure = -1, (4) payload canonicalization deterministic
- `apps/api/src/agent/tools/onchain/openLoan.ts` — UPDATE — call `logReputationEntry` at end of handler regardless of outcome
- `apps/api/src/agent/tools/onchain/repayLoan.ts` — UPDATE — same
- `apps/api/src/agent/tools/onchain/rotatePosition.ts` — UPDATE — same
- `apps/api/src/agent/intents/openPosition.ts` — UPDATE — also call at intent boundary so decline decisions get a receipt too (success=true, action_type='OpenPosition_decline')

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/reputation/logReputationEntry.ts
test -f src/agent/reputation/ipfsUploader.ts
test -f src/agent/reputation/payloadBuilder.ts
test -f src/agent/reputation/canonicalize.ts
test -f src/db/schema/reputationEntries.ts
test -f src/jobs/ipfsBackfillCron.ts
test -f ../../packages/shared/src/reputationEntry.ts

# Required fields in payload
grep -q "agentIdentityNftId\|actionType\|parameters\|success\|txHash\|reputationDelta" src/agent/reputation/payloadBuilder.ts

# IPFS retry + fallback present
grep -q "ipfs_pending\|reputationPayloadsFallback" src/agent/reputation/ipfsUploader.ts

# Reputation delta semantics correct
grep -q "+1\|-1" src/agent/reputation/logReputationEntry.ts

# Tests pass
pnpm vitest run src/agent/reputation/__tests__/logReputationEntry.test.ts
test $? -eq 0

# Write tools all call the logger
grep -q "logReputationEntry" src/agent/tools/onchain/openLoan.ts
grep -q "logReputationEntry" src/agent/tools/onchain/repayLoan.ts
grep -q "logReputationEntry" src/agent/tools/onchain/rotatePosition.ts

# Typecheck
pnpm typecheck
test $? -eq 0
```

## Notes

- Per design spec §6, every agent decision logs a structured ERC-8004 reputation entry. This story is the single chokepoint — there is no other path to write reputation, so the audit trail is complete by construction.
- Per security domain §3.5 (Sybil reputation farming): the on-chain reputation is only as good as what is recorded. By logging refused / failed actions too (not just successes), the reputation is a true track record — not a curated highlight reel.
- Per security domain §3.7 (cross-agent collusion): the canonical JSON payload signed via the user's agent identity NFT is third-party-verifiable. Anyone can fetch the IPFS CID, re-canonicalize, and verify the on-chain log matches.
- Per ADR-001 + ADR-005: the reputation entry is the cross-product of agent decisions (Claude Agent SDK) and on-chain attestation (ReputationProxy). This story is the glue.
- IPFS-or-fallback design: hackathon networks are flaky. The fallback table + backfill job guarantees we don't lose payloads. On-chain we always log a `cid` (content-address of the canonical payload), even if it's not yet pinned to IPFS.
- `reputation_delta` semantics: +1 success, 0 refused (safe), -1 broadcast failure (on-chain revert after successful simulation). Refused decisions (decline / defer / noop / agent_frozen) are NOT penalties — they are correct behavior.
- `agentIdentityNftId` is per-user (one Identity NFT per user per design spec §6 line 169). Loaded from `users.erc8004_agent_id`.
- Payload `version: '1'` allows schema evolution without breaking historical receipts.
- File MUST stay under 400 LOC each.
