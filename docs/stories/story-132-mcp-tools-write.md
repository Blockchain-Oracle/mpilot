# Story — MCP write tools (`pause_agent`, `resume_agent`, `revoke_session_key`)

**ID:** story-132-mcp-tools-write
**Epic:** Epic E8 — MCP Server
**Depends on:** story-131-mcp-tools-read, story-54-session-key-revocation-flow
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge user using Claude Code as my management surface
**I want to** I can call `pause_agent`, `resume_agent`, and `revoke_session_key` via MCP — only after OAuth authentication scoping me to my own agents
**So that** I can stop/start the agent or kill all permissions from natural-language Claude conversations without leaving my terminal, with all the same auth + audit guarantees the web app enforces

---

## File modification map

- `apps/mcp-server/src/tools/write/pauseAgent.ts` — NEW — tool: input { agentId }, validates ownership, removes BullMQ schedule, returns success
- `apps/mcp-server/src/tools/write/resumeAgent.ts` — NEW — tool: input { agentId }, validates ownership, re-adds BullMQ schedule (uses existing session keys), returns success
- `apps/mcp-server/src/tools/write/revokeSessionKey.ts` — NEW — tool: input { agentId, sessionKeyId? (optional; if absent → revoke all) }, validates ownership, calls revoke flow (story-54), returns success
- `apps/mcp-server/src/tools/write/index.ts` — NEW — barrel + registration helper
- `apps/mcp-server/src/auth/ownership.ts` — NEW — `assertOwnership({ userId, agentId, db })`: throws AccessDenied if userId doesn't own agentId
- `apps/mcp-server/src/auth/__tests__/ownership.test.ts` — NEW — unit tests for ownership check (allows owner, denies non-owner, denies unauthenticated)
- `apps/mcp-server/src/__tests__/tools-write.test.ts` — NEW — integration tests for each write tool with ownership scenarios

---

## Acceptance criteria (BDD)

```
Given an unauthenticated request to `tools/call` with a write tool
When called
Then it returns JSON-RPC error code -32001 (Unauthorized) (NOT a 200 with empty result)

Given an authenticated user trying to pause an agent they DON'T own
When called
Then it returns -32002 (Forbidden) with message "Agent not owned by authenticated user"

Given an authenticated owner calling pause_agent
When called
Then the BullMQ repeatable job is removed AND the agent's pausedAt is set in DB AND the response confirms paused=true

Given an authenticated owner calling resume_agent
When called
Then the BullMQ repeatable job is re-added (using existing session keys; no re-sign needed) AND pausedAt is null AND the response confirms paused=false

Given resume_agent on an agent with all session keys revoked
When called
Then it returns a typed error `no_active_session_keys` AND the agent stays paused (resume requires keys; the user must re-onboard)

Given revoke_session_key with sessionKeyId=null (revoke all)
When called
Then ALL active session keys for the agent are revoked on-chain (via story-54) AND the agent is paused

Given revoke_session_key for a specific sessionKeyId
When called
Then only that specific session key is revoked; others remain active

Given a tool call succeeds
When the response is returned
Then a row is inserted in `audit_log` table with { userId, tool, agentId, args, timestamp } (audit trail for all writes)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/mcp-server
test -f src/tools/write/pauseAgent.ts
test -f src/tools/write/resumeAgent.ts
test -f src/tools/write/revokeSessionKey.ts
test -f src/auth/ownership.ts

cd ../..

pnpm --filter @concierge/mcp-server run build
test $? -eq 0

# Ownership check used in every write tool
for tool in pauseAgent resumeAgent revokeSessionKey; do
  grep -q "assertOwnership" apps/mcp-server/src/tools/write/$tool.ts || { echo "missing ownership check: $tool"; exit 1; }
done

# Tests pass
pnpm --filter @concierge/mcp-server run test 2>&1 | grep "tools-write" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **EVERY write tool requires auth + ownership.** Per CLAUDE.md security: no unauthenticated writes; no cross-agent writes. The `assertOwnership` helper is mandatory — it's not optional defense in depth.
- **`revoke_session_key` is the security kill switch.** If a user suspects compromise, this single MCP call from their Claude session shuts everything down. Make sure it works under all conditions, including DB inconsistencies (e.g., if a session_keys row says active but the on-chain validator was already revoked — log the discrepancy, continue with the revoke).
- **`resume_agent` does NOT issue new session keys** — it reuses existing ones. If all keys are revoked, resume is impossible; users must re-onboard. This is intentional: prevents a malicious resume after a revoke.
- **`audit_log` table is the write-trail.** Schema: `audit_log { id; userId; tool; agentId; args (jsonb); timestamp; result; }`. Lets us answer "who paused this agent at 3am?" without log archaeology. Add to packages/db/schema in this story (small migration).
- **MCP error codes**: -32001 (Unauthorized), -32002 (Forbidden). Match HTTP semantics: 401 = no auth; 403 = auth but not allowed. Don't conflate.
- **Workers CPU budget for writes**: BullMQ queue operation + DB write + (for revoke) on-chain tx submission. Use the async UserOp submission pattern (return UserOp hash; client polls for receipt) to stay under the 30s budget.
- **No "execute action" MCP tool yet.** That's a deliberate scope cut: the agent's actions go through the tick loop with simulate → propose → approve. Adding direct "execute" via MCP would bypass the approval flow and undermine the trust primitive.
- Cross-ref: `research/concierge/07-mcp-server-pattern.md` § mutation surface, story-54 (revocation), story-68 (BullMQ schedule).
