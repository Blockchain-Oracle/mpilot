# Story — `record()` tick phase (ERC-8004 attestation + audit row + tick close)

**ID:** story-67-tick-phase-record
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-62-tick-loop-orchestrator, story-66-tick-phase-execute, story-42-erc8004-provider
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge tick orchestrator
**I want to** a `runPhase('record', proposal, exec)` function inserts an `executions` row with the tx receipt, calls the ERC-8004 attest action with the provider-specific schema + EIP-712 typed-data hash, and closes the tick with structured logging
**So that** every Mainnet execution produces a permanent on-chain reputation receipt (the wedge's verifiability claim per ADR-004) and the off-chain audit trail mirrors it

---

## File modification map

- `packages/runtime/src/phases/record.ts` — NEW — `runRecord(proposal, exec, state)`. Builds the attestation payload by calling the originating provider's `buildAttestationPayload()` (from story-30/32/34/36/38/40 — each provider knows its schema). Calls erc8004Provider.attestAction({ agentId, actionPayload, providerSchema }). Inserts an `executions` row with `{ proposalId, txHash, blockNumber, gasUsed, attestationUid, attestationTxHash, recordedAt }`. Returns `{ attestationUid, txHash }`.
- `packages/runtime/src/phases/recordFallback.ts` — NEW — for EOA-fallback executions: when the user-signed tx confirms (story-55 sender.ts triggers a callback), this function fires the attest action AFTER. Decoupled from the tick because the timing is user-driven.
- `packages/runtime/src/phases/__tests__/record.test.ts` — NEW — integration test on Sepolia fork: full record flow → attestationUid is captured → executions row matches → reputation read returns the new attestation

---

## Acceptance criteria (BDD)

```
Given runRecord is called with a successful execute result
When the function runs
Then it builds an attestation payload from the providers's schema, calls erc8004Provider.attestAction, inserts an executions row, returns { attestationUid, txHash }

Given the ERC-8004 attest tx confirms
When runRecord completes
Then readReputation(agentId) returns the new attestation in the latest list (round-trip verified)

Given the attest tx fails (e.g., ReputationRegistry paused, RPC failure)
When runRecord catches the error
Then it inserts the executions row anyway (the on-chain ACTION is recorded; attestation pending) AND queues a retry-attest job in BullMQ for the next 5 minutes
NOTE: this is one of the few places where retry is allowed — attestation is non-blocking for the agent's state machine

Given file budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given an EOA-fallback execution
When the user's signed tx confirms (out-of-tick)
Then runRecordFallback is called and fires the attestation just like normal — the audit trail is complete regardless of signing path

Given two attestations of the same action are submitted (e.g., retry after timeout)
When runRecord notices the executions row already has attestationUid
Then it skips re-attesting (idempotent — assert via mock that erc8004Provider.attestAction is called 0 times if row already attested)

Given the executions row insert
When the data is written
Then it includes the actual gasUsed from the receipt, the actual tx hash, and the attestationUid pointer

Given the structured log per record
When tick completes
Then a single info-level Pino entry contains { tickId, agentId, phase: 'record', durationMs, attestationUid, txHash }
```

---

## Shell verification

```bash
cd packages/runtime
test -f src/phases/record.ts
test -f src/phases/recordFallback.ts

cd ../..

pnpm --filter @mpilot/agent run build
test $? -eq 0

# attestAction called from record
grep -q "attestAction" packages/runtime/src/phases/record.ts

# Idempotent on retry
grep -qE "(attestationUid|already attested)" packages/runtime/src/phases/record.ts

# Tests pass
pnpm --filter @mpilot/agent run test 2>&1 | grep "record" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **THIS IS THE VERIFIABILITY CLAIM.** Per ADR-004 + CLAUDE.md load-bearing gotcha: every Mainnet execute() MUST be followed by record() writing giveFeedback. Without it, the wedge's "verifiable on-chain reputation" narrative breaks. Treat this story as the hardest deadline in E5 to get right.
- **Provider-specific schemas.** Each provider knows its own attestation schema (`concierge.aave.v3.borrow.v1`, etc.). record() doesn't hard-code; it calls `provider.buildAttestationPayload()` and trusts the result.
- **Attestation failure is non-blocking** for the agent state machine. Insert the executions row anyway; queue a retry. The tx already happened on-chain; the attestation is the on-chain receipt OF that tx — if it fails to land, the user's audit trail has a temporary gap but the action is still recorded off-chain and the attestation will land on retry.
- **Idempotence on retry**: if the executions row already has attestationUid, skip. Prevents double-attestation if the BullMQ retry job overlaps with a manual replay.
- **EOA fallback timing**: the user's signing happens out-of-tick; recordFallback is invoked by story-55's sender.ts when the tx confirms. Architecture allows both paths to fire the same attestation chain.
- **Structured log per record** is the single audit entry point. Per CLAUDE.md observability requirement.
- **`agentId`** is the user's ERC-8004 token id (story-42 registerAgent returned it during onboarding). Loaded from `agents` table during `loadAgentState`.
- Cross-ref: ADR-004 (verifiability), `research/concierge/03-providers/erc8004.md` (attestation flow), `research/concierge/04-agent-runtime.md` § 3 record row.
