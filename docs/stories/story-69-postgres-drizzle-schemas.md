# Story — Postgres + Drizzle ORM schemas (agents, ticks, proposals, executions, attestations, session_keys, eoa_tx_queue)

**ID:** story-69-postgres-drizzle-schemas
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-22-sdk-skeleton
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** Drizzle schemas for all 7 tables (agents, ticks, proposals, executions, attestations, session_keys, eoa_tx_queue) with migrations checked into the repo
**So that** the off-chain state model is a single source of truth (consumed by tick orchestrator, web app, BullMQ worker, MCP server) and schema changes flow through proper migrations

---

## File modification map

- `packages/db/package.json` — NEW — workspace deps + `drizzle-orm`, `drizzle-kit`, `pg`
- `packages/db/src/index.ts` — NEW — barrel exports
- `packages/db/src/schema/agents.ts` — NEW — Drizzle table: `agents { id (uuid pk); userId (text); smartAccountAddr (text); erc8004AgentId (bigint); ownerEoa (text); policyJson (jsonb); goalJson (jsonb); chain (text: 'mantle-mainnet' | 'mantle-sepolia'); activatedAt (timestamp); pausedAt (timestamp nullable); createdAt }`
- `packages/db/src/schema/ticks.ts` — NEW — `ticks { id (uuid pk); agentId (fk → agents); startedAt; phase (text); status (text: 'noop' | 'awaiting_approval' | 'awaiting_signature' | 'executed' | 'failed'); payloadJsonb; durationMs; completedAt }`
- `packages/db/src/schema/proposals.ts` — NEW — `proposals { id (uuid pk); agentId (fk); tickId (fk); kind (text); amountUsd (numeric); protocol (text); planJsonb; simJsonb; status (text: 'pending' | 'approved' | 'rejected' | 'expired'); requiresApproval (bool); expiresAt (timestamp); createdAt; resolvedAt }` + unique index on `(agentId, status) WHERE status='pending'`
- `packages/db/src/schema/executions.ts` — NEW — `executions { id (uuid pk); proposalId (fk); txHash (text); blockNumber (bigint); gasUsed (bigint); attestationUid (text nullable); attestationTxHash (text nullable); status (text: 'submitted' | 'confirmed' | 'failed'); recordedAt }`
- `packages/db/src/schema/attestations.ts` — NEW — `attestations { uid (text pk); schemaUid (text); agentId (text); payloadJson (jsonb); txHash (text); recordedAt }` — mirrors on-chain ERC-8004 for fast off-chain queries
- `packages/db/src/schema/sessionKeys.ts` — NEW — `session_keys { id (uuid pk); agentId (fk); publicAddress (text); encryptedPrivateKey (bytea); policyJsonb; signature (text); validUntil (timestamp); revokedAt (timestamp nullable); createdAt }`
- `packages/db/src/schema/eoaTxQueue.ts` — NEW — `eoa_tx_queue { id (uuid pk); userId (text); agentId (fk); to (text); data (text); value (text); status (text: 'pending' | 'signed' | 'confirmed' | 'failed'); signedTx (text nullable); txHash (text nullable); blockNumber (bigint nullable); error (text nullable); createdAt; updatedAt }`
- `packages/db/src/client.ts` — NEW — `createDbClient(databaseUrl)` returns the Drizzle client
- `packages/db/drizzle.config.ts` — NEW — Drizzle Kit config
- `packages/db/migrations/0001_initial.sql` — NEW — initial migration generated via `bunx drizzle-kit generate`

---

## Acceptance criteria (BDD)

```
Given drizzle.config.ts exists
When `bunx drizzle-kit generate` runs
Then a new migration file is generated in packages/db/migrations/

Given the initial migration is applied to a test Postgres
When `bunx drizzle-kit push` runs
Then all 7 tables exist with the correct schemas (assert via `\d agents` etc. in psql)

Given the agents table
When inspected
Then it has columns: id, userId, smartAccountAddr, erc8004AgentId, ownerEoa, policyJson, goalJson, chain, activatedAt, pausedAt, createdAt

Given the unique index on proposals(agentId) WHERE status='pending'
When two proposals with status='pending' for the same agent are inserted
Then the second insert fails with unique constraint violation (catches the duplicate-proposal regression)

Given the ticks foreign key
When a tick row references a deleted agent
Then the database raises FK violation (NOT silently orphans)

Given the encrypted_private_key column in session_keys
When inspected
Then it is type BYTEA (NOT text — prevents accidental plaintext storage)

Given the migrations are idempotent
When the migration is run twice
Then the second run is a no-op (NOT a duplicate-table error)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/db
test -f package.json
test -f drizzle.config.ts
for schema in agents ticks proposals executions attestations sessionKeys eoaTxQueue; do
  test -f src/schema/$schema.ts
done

cd ../..

pnpm --filter @mpilot/db run build
test $? -eq 0
pnpm run typecheck

# Migration generation works
cd packages/db
bunx drizzle-kit generate --dry-run
test $? -eq 0
cd ../..

# Unique constraint on proposals
grep -qE "(uniqueIndex|UNIQUE.*WHERE)" packages/db/src/schema/proposals.ts

# encrypted_private_key is bytea
grep -q "bytea" packages/db/src/schema/sessionKeys.ts

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **All 7 tables come from `research/concierge/04-agent-runtime.md` § 4 state persistence.** Don't reinvent the schema; mirror the documented one.
- **`encryptedPrivateKey` is bytea**, not text. Bytea is bytes-as-stored; text could be silently encoded with charset issues. Per CLAUDE.md no-silent-failures.
- **Unique index on `(agentId, status) WHERE status='pending'`** is the idempotence guard for story-65's propose phase. Without it, a re-tick before the user resolves the prior proposal could insert a duplicate. Per `research/concierge/04-agent-runtime.md` § 4.
- **FK constraints are mandatory.** Drizzle's `.references()` on the relevant columns. Without them, an agent delete could orphan ticks/proposals/executions and silently corrupt the audit trail.
- **`policyJsonb` and `goalJsonb`** are JSONB columns for query-ability. Postgres can index inside JSONB (`@>` operator) — useful for "find all agents with autoApprovalThresholdUSD > $100".
- **Generated migrations are committed.** Drizzle generates SQL; commit it to the repo so production deploys run the same migration that was tested in CI.
- **Use Neon for hosting** per ADR-009. Neon's branching feature lets us spin up per-PR test databases.
- Cross-ref: `research/concierge/04-agent-runtime.md` § 4, ADR-009.
