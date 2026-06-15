# Story — Cloudflare Workers deploy (HOSTED variant — optional secondary install path)

**ID:** story-133-mcp-cloudflare-worker
**Epic:** Epic E8 — MCP Server
**Depends on:** story-130-mcp-server-bootstrap (now produces `packages/mcp/`), **story-136-mcp-stdio-publish** (stdio is the README default)
**Estimate:** ~1h
**Status:** PENDING (REFRAMED 2026-06-09)

---

## ⚠️ 2026-06-09 UPDATE — read this BEFORE the original story body

Per architecture.md ADR-011 amendment, this story is now about the **HOSTED variant** — an optional secondary install path for users who want a URL-paste alternative to the stdio default. **This is no longer THE MCP server.**

### What changes

1. **Files move from `apps/mcp-server/` to `apps/mcp/`** (no `-server` suffix). The "server" lives in `packages/mcp/` (per story-130 amendment); `apps/mcp/` is just the Worker wrapper.
2. **`apps/mcp/src/index.ts` is THIN** — imports `createStreamableHttpHandler` from `@mpilot/mcp` and wraps it in a Hono app with Workers-specific bindings (KV / D1 / secrets / custom domain).
3. **Auth:** bearer token v0 (read from `c.env.CONCIERGE_BEARER_TOKEN_HASH` map). OAuth (PKCE) is v1 follow-up.
4. **NEVER overwrite the stdio path.** The hosted Worker is a CONVENIENCE, not THE MCP. README defaults to stdio per ADR-011.
5. **Demo URL:** Still useful for judges who don't want to install Node tools. `https://mcp.mpilot.xyz/mcp` is the demo URL — but the README's primary install line is the stdio command.

### Updated file modification map (replaces below)

- `apps/mcp/wrangler.toml` — NEW — Workers config + custom domain `mcp.mpilot.xyz`
- `apps/mcp/src/index.ts` — NEW — Hono app, imports `createStreamableHttpHandler` from `@mpilot/mcp`, wires bearer-token middleware reading from `c.env.CONCIERGE_BEARER_TOKEN_HASH_MAP` (KV) and `c.env.MAINNET_RPC_URL` (secret)
- `apps/mcp/src/env.ts` — NEW — Workers env types
- `apps/mcp/src/auth.ts` — NEW — bearer-token validation middleware (constant-time compare, agentId binding via KV lookup)
- `.github/workflows/deploy-mcp.yml` — NEW — Workers deploy on push to main
- `apps/mcp/migrations/0001_audit_log.sql` — NEW — D1 migration for audit log (Workers can't reach Postgres)

### Updated BDD criteria additions

```
Given the Worker deploys
When `wrangler deploy --dry-run` runs
Then exit code is 0 AND the bundle size is < 1MB (Workers free-tier limit)

Given a request to /mcp with NO Authorization header
When the request body is a valid MCP `initialize` call
Then response is 401 with JSON-RPC error code -32000 and message hints at bearer-token requirement

Given a request to /mcp with a valid bearer token bound to agent agt_xyz
When the request body is `tools/list`
Then response includes all @mpilot/tools tools AND the response context references agt_xyz

Given the same code path runs locally and on Workers
When `pnpm --filter @mpilot/mcp test` runs the StreamableHTTP transport in a unit test
Then the same handler works (the factory is environment-agnostic)
```

### Updated notes

- **DO NOT re-implement tool registration here.** Import `createStreamableHttpHandler` from `@mpilot/mcp` (built in story-130 amended).
- **The 10s Vercel limit is irrelevant** — we're on Workers. But document the bundle size constraint (1MB free tier) so the orchestrator doesn't push deps that blow it.
- **OAuth is v1.1 — bearer token is fine for hackathon demo.** README "hosted install" instruction includes the bearer-token paste line.
- **Custom domain `mcp.mpilot.xyz`** can be added later if DNS isn't ready. `workers.dev` subdomain is fine for v0 demo.
- Cross-ref: ADR-011 (amended — stdio-first hosted-optional), story-130 (now produces `packages/mcp/`), story-136 (stdio publish — the DEFAULT install).

---

## (original story preserved below for reference — see UPDATE above for current direction)

---

## User story

**As a** mPilot maintainer
**I want to** the MCP server deploys to Cloudflare Workers with proper bindings (KV for OAuth state, D1 for audit_log, secrets for DB connections, env-scoped configs), and a deploy CI step that runs on every merge to main
**So that** the MCP server is publicly reachable at `https://mcp.mpilot.xyz/mcp` with SSE working (no 10s Vercel timeout) AND deploys are automated

---

## File modification map

- `apps/mcp-server/wrangler.toml` — UPDATE — full Workers config: KV namespace, D1 database, secret references, custom domain binding for mcp.mpilot.xyz
- `apps/mcp-server/src/index.ts` — UPDATE — `export default { fetch: app.fetch }` for Workers runtime
- `apps/mcp-server/src/env.ts` — NEW — env type definitions tied to wrangler bindings
- `.github/workflows/deploy-mcp.yml` — NEW — Workers deploy CI: on push to main → wrangler deploy
- `apps/mcp-server/migrations/0001_audit_log.sql` — NEW — D1 migration for the audit_log table (separate from main Postgres because Workers can't connect to Postgres directly)
- `apps/mcp-server/scripts/setup-workers.sh` — NEW — one-time setup: creates KV namespace, creates D1 db, sets secrets via wrangler

---

## Acceptance criteria (BDD)

```
Given wrangler.toml is configured
When `bunx wrangler deploy --dry-run` runs from apps/mcp-server
Then exit code is 0 (config validates; no deploy yet)

Given the deploy CI on push to main
When the workflow runs
Then it executes `wrangler deploy` after `pnpm run build` passes AND posts the deploy URL to the PR comment (if main was pushed from a PR merge)

Given KV namespace `OAUTH_STATE` is configured
When the code reads `env.OAUTH_STATE`
Then it has the KVNamespace interface (verified via TypeScript)

Given D1 database `audit_log` is configured
When `wrangler d1 migrations apply audit_log --local` runs
Then the migration is applied successfully

Given the production deploy
When the server is reached at https://mcp.mpilot.xyz/mcp with a proper initialize request
Then it returns the capability descriptor (production smoke test)

Given the SSE endpoint
When tested with a long-running connection (60s) against the production URL
Then it stays open the entire 60s (NO 10s timeout, unlike Vercel)

Given the secret bindings
When the worker code reads `env.DATABASE_URL`
Then it gets the Postgres URL (set via `wrangler secret put`)

Given the Workers free tier limits (100k requests/day, 10ms CPU per request)
When normal usage levels are simulated
Then the server stays within limits; the metrics are observable in Cloudflare dashboard

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/mcp-server
test -f wrangler.toml
test -f migrations/0001_audit_log.sql
test -f scripts/setup-workers.sh

cd ../..

test -f .github/workflows/deploy-mcp.yml

# Wrangler config validates
cd apps/mcp-server
bunx wrangler deploy --dry-run
test $? -eq 0
cd ../..

# Deploy workflow uses wrangler-action
grep -q "wrangler" .github/workflows/deploy-mcp.yml

# D1 migration exists
test -s apps/mcp-server/migrations/0001_audit_log.sql

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **CLOUDFLARE WORKERS, NOT VERCEL.** Per CLAUDE.md load-bearing gotcha: Vercel's 10s SSE timeout would kill MCP tool sessions. Cloudflare Workers SSE has no such limit. This decision is irreversible without major rework.
- **D1 for audit_log** instead of Postgres because Workers don't have direct TCP access to Postgres (would need a connection proxy like Hyperdrive — extra cost + latency). D1 is co-located, fast, and free for the volume we'll see in a hackathon.
- **KV for OAuth state** is the canonical Workers OAuth pattern: short-lived (10min TTL) state tokens. KV reads are fast (single ms) at the edge.
- **`mcp.mpilot.xyz` subdomain** is the production endpoint. Set up via Cloudflare DNS + custom domain binding. Per architecture.md.
- **Wrangler deploy uses Workers' bindings**: KV, D1, secrets — all configured in `wrangler.toml` + applied via the deploy step. Production secrets are set via `wrangler secret put` (one-time setup script `setup-workers.sh`).
- **Free tier limits**: 100k requests/day, 10ms CPU per request (median; bursts to 50ms allowed). For hackathon traffic this is plenty; upgrade to paid only if usage explodes.
- **The deploy CI uses `cloudflare/wrangler-action@v3`** (verified per Context7). API token + account ID stored as GH secrets.
- **DO NOT use Cloudflare's MCP starter template literally** — it's outdated; uses MCP SDK v1. Our pattern (story-130) uses v2.
- Cross-ref: `research/concierge/07-mcp-server-pattern.md` § Cloudflare Workers, ADR-011.
