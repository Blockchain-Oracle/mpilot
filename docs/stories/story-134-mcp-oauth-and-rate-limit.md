# Story — MCP OAuth flow + per-token rate limit

**ID:** story-134-mcp-oauth-and-rate-limit
**Epic:** Epic E8 — MCP Server
**Depends on:** story-132-mcp-tools-write, story-133-mcp-cloudflare-worker
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** Concierge user installing the MCP server in Claude Code
**I want to** the first tool call triggers an OAuth flow (redirect to concierge.xyz/oauth/mcp-authorize), I sign in via Privy, and a token is bound to my user — subsequent tool calls work without re-prompting, and per-token rate limits prevent abuse
**So that** the MCP write tools have a real auth model that's not just "trust the bearer token", and per-user rate limits prevent one user from exhausting Workers' free-tier quota for everyone

---

## File modification map

- `apps/mcp-server/src/auth/oauth.ts` — NEW — OAuth flow handlers: /oauth/authorize, /oauth/token, /oauth/refresh per RFC 6749 + RFC 8252 (PKCE required)
- `apps/mcp-server/src/auth/middleware.ts` — NEW — Hono middleware: extracts Bearer token, validates against KV, populates `c.var.userId`; rejects with 401 if invalid
- `apps/mcp-server/src/auth/rateLimit.ts` — NEW — per-token rate limit: 60 req/min, 1000 req/day; uses Durable Objects or KV with sliding window
- `apps/web/app/oauth/mcp-authorize/page.tsx` — NEW — the user-facing OAuth consent screen on the web app side (NOT in mcp-server — the consent UI lives on concierge.xyz)
- `apps/web/app/api/oauth/mcp-token/route.ts` — NEW — token issuance endpoint (called by MCP server's /oauth/token via server-to-server)
- `apps/mcp-server/src/__tests__/oauth.test.ts` — NEW — integration tests: full PKCE flow, token expiry, refresh flow, rate-limit enforcement

---

## Acceptance criteria (BDD)

```
Given the user runs `claude mcp add concierge https://mcp.concierge.xyz/mcp`
When the first tool call is made
Then the MCP server returns 401 with a WWW-Authenticate header pointing to the OAuth authorize URL

Given the OAuth authorize URL is opened in the browser
When the user signs in via Privy
Then the consent screen shows which tools the MCP client is requesting (read scope vs write scope) AND the user can approve or deny

Given the user approves
When the OAuth code is exchanged for a token at /oauth/token
Then a bearer token is issued; bound to userId via KV; expires in 30 days

Given subsequent tool calls with the bearer token
When called
Then they succeed (authenticated as the bound userId)

Given the token expires
When a tool call is made with the expired token
Then the server returns 401 AND the MCP client triggers token refresh automatically (per MCP OAuth spec)

Given a token has made > 60 requests in 60 seconds
When the 61st request comes in
Then it returns 429 (Too Many Requests) with Retry-After header

Given a token has made > 1000 requests in 24 hours
When the 1001st request comes in
Then it returns 429 (per-day cap)

Given PKCE is enforced
When an authorize request lacks code_challenge
Then it returns invalid_request

Given the consent screen
When the user denies
Then they are redirected back to Claude with error=access_denied

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/mcp-server
test -f src/auth/oauth.ts
test -f src/auth/middleware.ts
test -f src/auth/rateLimit.ts

cd ../..

test -f apps/web/app/oauth/mcp-authorize/page.tsx
test -f apps/web/app/api/oauth/mcp-token/route.ts

pnpm --filter @mpilot/mcp-server run build
test $? -eq 0
pnpm --filter @mpilot/web run build
test $? -eq 0

# PKCE referenced in OAuth code
grep -qE "(code_challenge|PKCE)" apps/mcp-server/src/auth/oauth.ts

# Rate limit thresholds
grep -qE "60.*1000|60_000.*1000" apps/mcp-server/src/auth/rateLimit.ts

# Tests pass
pnpm --filter @mpilot/mcp-server run test 2>&1 | grep "oauth" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **PKCE is REQUIRED** (RFC 8252). MCP clients are public clients (no client secret); without PKCE the authorization code is interceptable. Per OAuth best practice + MCP spec.
- **30-day token expiry + refresh** balances UX (don't re-auth weekly) with security (revocable). Refresh tokens are single-use (rotation pattern).
- **Sliding window rate limit** preferred over fixed window — fairer to bursty usage. Cloudflare's recommended pattern uses Durable Objects for atomic counter ops; KV is acceptable for smaller-volume use cases.
- **Token storage in KV**: key = token hash; value = { userId, scope, issuedAt, expiresAt }. NEVER store the token plaintext — hash it (SHA-256) so a KV breach doesn't immediately leak tokens.
- **Consent screen on web app, NOT mcp-server.** Per OAuth best practice: the user-facing consent UI lives on the origin the user already trusts (concierge.xyz), not on a subdomain they've never seen. The mcp-server redirects to web app for consent; web app POSTs the granted code back to mcp-server's /oauth/token via server-to-server.
- **`access_denied` redirect on user-decline.** Critical UX: the MCP client must know the user explicitly declined (vs network failure) — different recovery paths.
- **`WWW-Authenticate` header on 401** is the standard signal for MCP clients to initiate OAuth. Format: `Bearer realm="concierge", authorization_uri="https://concierge.xyz/oauth/authorize"`.
- **Workers' KV eventual consistency** is okay for OAuth state (10min TTL is generous) and tokens (stale reads worst case = a revoked token works for ~60s). NOT okay for nonces or single-use tokens — use Durable Objects there.
- Cross-ref: `research/concierge/07-mcp-server-pattern.md` § OAuth, RFC 8252.
