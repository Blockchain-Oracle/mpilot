# Story — Session-key revocation flow (Emergency Stop)

**ID:** story-54-session-key-revocation-flow
**Epic:** Epic E4 — Smart Account Layer
**Depends on:** story-53-session-key-issuance-flow
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge user
**I want to** an `Emergency Stop` flow that (1) marks all my agent's session keys as revoked in Postgres, (2) submits an on-chain revocation tx so any in-flight UserOps with my session keys fail, and (3) halts the BullMQ cron worker for my agent
**So that** if I suspect my session key is compromised or my agent is acting wrong, I can stop everything in one click

---

## File modification map

- `packages/smart-account/src/revokeSessionKey.ts` — NEW — `revokeSessionKey({ sessionKeyId, ownerAccount, conciergeAccount })` does three things:
  1. UPDATE Postgres: `session_keys SET revoked_at = NOW() WHERE id = $1` (immediate; any subsequent loadSessionKey throws SessionKeyRevoked)
  2. Submit on-chain: call `Kernel.uninstallValidator({ validator: sessionKeyValidator })` via owner-signed UserOp (immutably invalidates the validator on the smart account)
  3. Halt cron: emit `agent.revoked` event on the worker's event channel (BullMQ pause job for this agent's queue)
- `packages/smart-account/src/__tests__/revokeSessionKey.test.ts` — NEW — integration test on a Sepolia fork: issue key → submit a test UserOp (succeeds) → revoke → submit a second UserOp (fails with `UnauthorizedValidator`)
- `packages/smart-account/src/emergencyStop.ts` — NEW — `emergencyStop({ userId, ownerAccount, conciergeAccount })` — orchestrates revocation across ALL session keys for the user's agent (calls revokeSessionKey for each row), emits a single `EmergencyStopExecuted` event for downstream UI updates (the dashboard from story-115).

---

## Acceptance criteria (BDD)

```
Given a session key is issued and persisted
When revokeSessionKey runs
Then the Postgres row's revoked_at is non-null AND the on-chain validator is uninstalled (verify by re-reading kernel.getValidators())

Given a revoked session key
When loadSessionKey is called on it later
Then it throws SessionKeyRevoked (NOT returns the key)

Given a revoked session key
When the agent worker tries to submit a UserOp using the revoked key
Then the UserOp fails with the bundler's UnauthorizedValidator error AND the worker logs the failure as `revoked-key-attempt` (audit trail)

Given emergencyStop is called with 3 active session keys
When the function runs
Then ALL 3 session keys are revoked (3 db rows updated, 3 on-chain uninstall txs submitted), and the BullMQ worker pauses the agent's queue

Given emergencyStop is called when the agent has no active session keys
When the function runs
Then it returns `{ revokedCount: 0, ok: true }` (NOT throw — idempotent)

Given the on-chain revocation tx fails (e.g., bundler 5xx)
When the function runs
Then it RETRIES once after 5 seconds; if still fails, throws `RevocationPartialFailure({ dbRevoked: true, onChainRevoked: false })` — caller knows to retry the on-chain step

Given the BullMQ pause fails (e.g., Redis down)
When emergencyStop runs
Then it logs the failure but does NOT throw — the database revocation is the source of truth; cron will catch up when Redis recovers

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/smart-account
test -f src/revokeSessionKey.ts
test -f src/emergencyStop.ts

cd ../..

pnpm --filter @concierge-mantle/smart-account run build
test $? -eq 0

pnpm --filter @concierge-mantle/smart-account run test 2>&1 | grep "revoke" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Database revocation comes FIRST**, before the on-chain tx. Even if the on-chain step fails, the DB flag prevents the runtime from loading the revoked key in any subsequent tick. Idempotence pattern.
- **On-chain `uninstallValidator`** is the canonical ZeroDev method. The session key is enforced by the validator contract; removing the validator from the kernel invalidates all session keys it controlled. Atomic on-chain — no UserOp signed by that validator can succeed after the uninstall.
- **`RevocationPartialFailure`** typed error tells the caller exactly what state we're in (db done, on-chain not). The UI (Emergency Stop button from story-115) can show "revocation pending — retrying in 30s" or surface a manual retry button.
- **BullMQ pause failures are non-fatal.** Cron's job is to re-fire on schedule; if it's paused or down, the agent just doesn't tick — which is the desired post-revoke state anyway. Log + continue.
- **`agent.revoked` event** is the bridge between the smart-account layer and the worker layer. The worker subscribes to this event channel (Redis pub/sub) and pauses its agent's queue. Decoupled — neither package directly imports the other.
- **Audit logging is critical**: every revocation produces a structured Pino log entry with userId, sessionKeyId, revokedAt, and on-chain txHash. Per CLAUDE.md observability requirement.
- Cross-ref: ADR-010 (session-key lifecycle), `research/concierge/05-zerodev-erc4337.md` § Revocation.
