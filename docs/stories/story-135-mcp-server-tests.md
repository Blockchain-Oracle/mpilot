# Story — MCP server e2e tests (full client → server flow)

**ID:** story-135-mcp-server-tests
**Epic:** Epic E8 — MCP Server
**Depends on:** story-134-mcp-oauth-and-rate-limit
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** end-to-end tests use the actual MCP SDK client to talk to a locally-running mcp-server (via wrangler dev's local runtime), exercising the full path: discovery → initialize → OAuth → tools/list → tools/call (read + write) → token refresh → rate limit
**So that** the MCP server's contract with real MCP clients (Claude Code, claude.ai/mcp, custom integrations) is verified before submission

---

## File modification map

- `apps/mcp-server/src/__tests__/e2e/clientFlow.test.ts` — NEW — uses `@modelcontextprotocol/sdk` client to talk to local server; full happy-path flow
- `apps/mcp-server/src/__tests__/e2e/oauthFlow.test.ts` — NEW — full PKCE OAuth flow with mocked user consent
- `apps/mcp-server/src/__tests__/e2e/rateLimitEnforcement.test.ts` — NEW — verifies 429 after 60 req/min
- `apps/mcp-server/src/__tests__/e2e/tokenRefresh.test.ts` — NEW — token expiry → refresh → success
- `apps/mcp-server/src/__tests__/e2e/setup.ts` — NEW — spawns wrangler dev process, waits for readiness, yields client, teardown
- `apps/mcp-server/vitest.config.ts` — UPDATE — `pool: 'forks'`, 60s timeout

---

## Acceptance criteria (BDD)

```
Given Vitest is configured for e2e
When `pnpm --filter @mpilot/mcp-server run test:e2e` runs
Then exit code is 0 AND ≥ 8 e2e test cases pass

Given test_e2e_ClientFlow
When the full happy path runs (initialize → OAuth → tools/list → tools/call)
Then every step succeeds AND the tool call returns the expected result

Given test_e2e_OAuthFlow
When the PKCE flow runs (authorize → exchange code for token → use token)
Then the bearer token is bound to the userId AND subsequent calls succeed

Given test_e2e_RateLimitEnforcement
When 61 requests are made in 60 seconds
Then the 61st returns 429 AND has the correct Retry-After header

Given test_e2e_TokenRefresh
When a token expires and the client refreshes
Then a new token is issued AND the old refresh token is invalidated

Given test_e2e_OwnershipEnforcement
When user A tries to pause agent owned by user B
Then 403 (Forbidden) is returned AND the agent is NOT paused

Given test_e2e_PublicReadsNoAuth
When tools/call for get_reputation is made WITHOUT auth
Then it succeeds (reads are public)

Given test_e2e_WriteNoAuth
When tools/call for pause_agent is made WITHOUT auth
Then 401 is returned

Given test_e2e_AuditLog
When a write tool succeeds
Then a row exists in D1's audit_log with the correct userId, tool, agentId, timestamp

Given coverage gate
When `pnpm --filter @mpilot/mcp-server run test --coverage` runs
Then line coverage on `src/` ≥ 80%

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every test file ≤ 400 LOC
```

---

## Shell verification

```bash
# Run e2e tests
pnpm --filter @mpilot/mcp-server run test:e2e --reporter=verbose
test $? -eq 0

pnpm --filter @mpilot/mcp-server run test:e2e --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 8 {exit 0} {exit 1}'

# Critical load-bearing tests
for tn in "OAuthFlow" "RateLimitEnforcement" "OwnershipEnforcement" "PublicReadsNoAuth" "AuditLog"; do
  pnpm --filter @mpilot/mcp-server run test:e2e --reporter=verbose 2>&1 | grep "$tn" | grep -q "✓" || { echo "missing $tn"; exit 1; }
done

# Coverage ≥ 80%
cov=$(pnpm --filter @mpilot/mcp-server run test --coverage 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 80

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Use the real MCP SDK client** (`@modelcontextprotocol/sdk/client/index.js`), not raw HTTP. The point of these tests is to verify the SDK<->server contract; HTTP-level tests would miss SDK behaviors like auto-retry on 401.
- **`wrangler dev --local`** spawns the Workers runtime simulator. Tests connect to localhost:8787 like a real client would. This is the highest-fidelity test setup short of deploying to actual Workers.
- **OAuth flow test mocks the consent step.** The real consent is user interactive; the test programmatically POSTs the "approve" action with a test user's session. Documented as a known limitation in the test setup.
- **Rate limit test runs 61 requests fast** — need to be conscious of test wall-time. Use `await Promise.all(...)` for parallel requests; the rate limiter should reject the 61st regardless of timing nuances.
- **Audit log test verifies D1 row creation.** Query D1 directly after the tool call to confirm the row is there with the right fields.
- **OwnershipEnforcement is the security regression guard.** Without it, a future bug where the ownership check is silently bypassed (e.g., a refactor that drops a middleware) would let user A pause user B's agent. The test makes the regression impossible.
- **`PublicReadsNoAuth`** confirms the explicit security model decision (reads = public). If someone later "fixes" the missing auth on reads (thinking it's a bug), the test fails — surfaces the deliberate design.
- **Coverage 80%** is the floor. Critical paths (auth, rate limit, ownership) should be 100% covered.
- Cross-ref: `research/concierge/07-mcp-server-pattern.md` § testing, story-130-134 (everything this story verifies).
