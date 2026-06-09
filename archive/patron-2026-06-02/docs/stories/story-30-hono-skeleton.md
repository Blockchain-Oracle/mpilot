# Story 30 — Hono skeleton + health endpoint + Pino structured logging

**Epic:** Epic 2 — Backend Foundation
**Estimated:** ~1.5h
**Depends on:** story-00-monorepo-scaffold, story-06-env-and-secrets-setup

## BDD Acceptance Criteria

```
Given the api package exists with valid .env
When `pnpm --filter @patron/api dev` runs
Then the Hono server binds to PORT (default 3001)
And stdout contains a structured JSON log line: {"level":"info","msg":"api listening","port":3001}
And the process is still running after 3s (no boot crash)

Given the api server is running
When `curl -s http://localhost:3001/health` runs
Then the response is 200
And the JSON body is exactly `{"ok":true,"version":"<version>","uptimeSeconds":<number>}`
And `curl -sI http://localhost:3001/health | head -1 | grep '200 OK'` exits 0

Given any request hits the api
When the request is processed
Then a Pino log line is emitted with {requestId, method, path, status, durationMs}
And the requestId is propagated to the response as the `x-request-id` header

Given a request hits an unknown route
When the handler runs
Then the response is 404
And the body is `{"error":"not_found","path":"/whatever"}` (Zod-schema-validated error envelope)
And no stack trace is leaked
```

## File modification map

- `apps/api/src/index.ts` — NEW — boot file: import env (validated via zod, story-06), build Hono app, attach middleware, attach routes, start server with `serve({ fetch: app.fetch, port: env.PORT })` from `@hono/node-server`
- `apps/api/src/app.ts` — NEW — `createApp()` factory returning a configured Hono instance (so tests can import without binding a port)
- `apps/api/src/routes/health.ts` — NEW — `GET /health` handler returning `{ok, version, uptimeSeconds}` using `process.uptime()`
- `apps/api/src/middleware/requestId.ts` — NEW — generates ULID per request, attaches to `c.set('requestId', id)` + response header
- `apps/api/src/middleware/logger.ts` — NEW — Pino-based request logger middleware: logs on response with `{requestId, method, path, status, durationMs}`
- `apps/api/src/middleware/errorHandler.ts` — NEW — global `app.onError` handler returning Zod-validated error envelope; 404 handler via `app.notFound`
- `apps/api/src/lib/logger.ts` — NEW — Pino instance with pretty transport in dev (`pino-pretty`) and JSON in prod (`NODE_ENV === 'production'`)
- `apps/api/src/lib/env.ts` — UPDATE (file scaffolded in story-06) — add `PORT: z.coerce.number().int().positive().default(3001)`, `NODE_ENV: z.enum(['development','test','production']).default('development')`, `LOG_LEVEL: z.enum(['debug','info','warn','error']).default('info')`
- `apps/api/src/schemas/errors.ts` — NEW — Zod schemas for the error envelope (`ErrorResponse = z.object({error: z.string(), path: z.string().optional(), details: z.unknown().optional()})`)
- `apps/api/package.json` — UPDATE — add deps: `hono@^4`, `@hono/node-server`, `@hono/zod-validator`, `zod`, `pino`, `pino-pretty`, `ulid`; add scripts: `dev` (tsx watch), `build` (tsup or tsc), `start` (node dist), `test` (vitest)
- `apps/api/tsup.config.ts` — NEW — bundles `src/index.ts` to `dist/index.js` (Node 22, ESM)
- `apps/api/src/__tests__/health.test.ts` — NEW — Vitest test: spin up app via `createApp()`, call `/health` via `app.request('/health')` (Hono test client), assert shape
- `apps/api/src/__tests__/errorHandler.test.ts` — NEW — Vitest: unknown route returns 404 envelope

## Shell verification

```bash
cd apps/api

# Install + build
pnpm install
pnpm build
test -f dist/index.js

# Vitest passes
pnpm test
test $? -eq 0

# Boot + health probe
pnpm dev &
DEV_PID=$!
sleep 3
curl -sf http://localhost:3001/health | jq -e '.ok == true'
test $? -eq 0
curl -sI http://localhost:3001/health | head -1 | grep -q '200 OK'

# x-request-id header present
curl -sI http://localhost:3001/health | grep -i '^x-request-id:'

# 404 envelope
curl -s http://localhost:3001/does-not-exist | jq -e '.error == "not_found"'

kill $DEV_PID
wait $DEV_PID 2>/dev/null || true
```

## Notes

- Per architecture.md stack: **Hono 4.x** as the backend framework, **Node 22 LTS**, **Pino** for structured logs. No Express, no Fastify.
- Use `@hono/node-server` (the official Node adapter) — Hono is runtime-agnostic by default.
- `pino-pretty` is dev-only; production logs MUST be JSON-line so Railway log aggregation indexes them.
- ULID over UUID for request IDs — lexicographically sortable + URL-safe + still 128-bit.
- Per architecture.md "Banned patterns": no `console.log` on the backend. Use the Pino logger everywhere.
- Error envelope MUST be Zod-validated so consumers (the web/mini apps + SDKs in Epic 6) get typed errors. Export the Zod schemas from `apps/api/src/schemas/errors.ts` so frontends can import via a barrel.
- File MUST stay under 400 LOC each (Biome rule from story-01).
- This story is the bedrock for stories 31-39; the schema-validated env + error envelope + logger middleware are reused across every subsequent endpoint.
- Sentry wiring is NOT in this story — added in a later observability story (out of Epic 2 scope).
