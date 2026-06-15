# Story — MCP read tools (`get_agent_state`, `get_reputation`, `get_attestation`)

**ID:** story-131-mcp-tools-read
**Epic:** Epic E8 — MCP Server
**Depends on:** story-130-mcp-server-bootstrap, story-84-reputation-read-sdk
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Claude Code user with the Concierge MCP server installed
**I want to** I can call `get_agent_state(agentId)`, `get_reputation(agentId, limit, offset)`, and `get_attestation(uid)` from any Claude tool-using conversation
**So that** Claude can answer "what is agent X doing right now?" or "show me the last 10 actions of this agent" without any custom integration — the MCP server is the read-only audit surface

---

## File modification map

- `packages/mcp/src/tools/read/getAgentState.ts` — NEW — tool definition: input { agentId }, returns current state (current goal, policy, open positions, last 5 ticks summary)
- `packages/mcp/src/tools/read/getReputation.ts` — NEW — tool definition: input { agentId, limit?, offset? }, returns paginated attestation history via loadAgentHistory (story-84)
- `packages/mcp/src/tools/read/getAttestation.ts` — NEW — tool definition: input { uid }, returns a single attestation including decoded payload
- `packages/mcp/src/tools/read/index.ts` — NEW — barrel export + tool registration helper
- `packages/mcp/src/server.ts` — UPDATE — registers all read tools via `mcp.registerTool()`
- `packages/mcp/src/__tests__/tools-read.test.ts` — NEW — integration tests (in-memory transport) for each tool

---

## Acceptance criteria (BDD)

```
Given the MCP server is running
When `tools/list` is called
Then the response includes `get_agent_state`, `get_reputation`, `get_attestation` with proper input schemas (Zod-derived JSON Schema)

Given `tools/call` for get_agent_state with valid agentId
When the tool executes
Then it returns the current agent state including goal, policy, open positions, last 5 tick summaries

Given get_reputation with limit=10
When called
Then exactly 10 (or fewer, if less exist) attestations are returned, ordered most recent first

Given get_reputation with offset=10
When called
Then it returns the next page (NOT the first 10 again)

Given get_attestation with a valid uid
When called
Then the response includes the decoded payload (from IPFS), tx hash, and chain

Given get_attestation with an unknown uid
When called
Then it returns a typed error `attestation_not_found` (NOT throws an internal server error)

Given the input schema for get_agent_state
When inspected
Then it requires `agentId: string` AND rejects extra unknown fields (strict)

Given a malformed input (missing agentId)
When the tool is called
Then the MCP server returns a JSON-RPC 2.0 error with `code: -32602` (Invalid params) AND a clear message

Given the tools have no auth requirement (these are PUBLIC reads)
When called without bearer token
Then they succeed (matches the public /agent/[id] page from story-113)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/mcp-server
test -f src/tools/read/getAgentState.ts
test -f src/tools/read/getReputation.ts
test -f src/tools/read/getAttestation.ts

cd ../..

pnpm --filter @mpilot/mcp run build
test $? -eq 0

# Tools registered
for tool in get_agent_state get_reputation get_attestation; do
  grep -q "$tool" packages/mcp/src/server.ts || { echo "missing $tool registration"; exit 1; }
done

# Tests pass
pnpm --filter @mpilot/mcp run test 2>&1 | grep "tools-read" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Read tools are PUBLIC** — no auth required. The data is already on-chain + IPFS; gating it is security theater. Matches the public reputation page (story-113).
- **Pagination defaults: limit=50, offset=0**. Same as the SDK function. Don't lower the default; Claude users querying a long-lived agent will want to scroll.
- **Strict input schemas** via Zod `.strict()` — rejects extra unknown fields. Prevents typos like `agent_id` (with underscore) from silently being ignored.
- **Typed error response for unknown attestation**: `code: -32000, data: { error: 'attestation_not_found' }`. JSON-RPC custom errors live in the -32000 to -32099 range.
- **The tools should be IDEMPOTENT.** Two calls with same args = same result. Cache aggressively (story-84's IPFS cache + Postgres read-through).
- **Workers CPU budget**: each tool call must complete in <10s (free) or <30s (paid). loadAgentHistory with 50 entries + IPFS fetches needs to fit. Use cached IPFS payloads (story-84) to stay under budget.
- **No mutation tools in this story** — those are story-132. Keeping read/write split is important for the auth model (story-134 OAuth gates writes).
- Cross-ref: `research/concierge/07-mcp-server-pattern.md` § tool design, story-84 loadAgentHistory.

---

## ⚠️ Spec drift (2026-06-14, accepted by implementation)

Original spec named `apps/mcp-server/` + `@mpilot/mcp-server`; the as-built code lives at `packages/mcp/` + `@mpilot/mcp` per ADR-011 amended (stdio-first packaging). Story rewritten in-place.

**`get_attestation` input also changed** from `{ uid }` to `{ agentId, feedbackHash }`. ERC-8004 ReputationRegistry has no by-UID index — lookup MUST scan the agent's feedback list and filter. Surfacing this required input makes the cost obvious to the caller.
