# Story — MCP server bootstrap (transport-agnostic core in `packages/mcp/`)

**ID:** story-130-mcp-server-bootstrap
**Epic:** Epic E8 — MCP Server
**Depends on:** story-22-sdk-skeleton, **story-300-tools-registry** (NEW)
**Estimate:** ~1.5h
**Status:** PENDING (AMENDED 2026-06-09)

---

## ⚠️ 2026-06-09 UPDATE — read this BEFORE the original story body

Per architecture.md ADR-011 amendment (rework 2026-06-09), the MCP server architecture changed: **stdio-first, hosted Cloudflare Worker optional**. This story is now about building the **transport-agnostic core** in `packages/mcp/`, not a Worker.

### What changes
1. **MCP core moves to `packages/mcp/`** (not `apps/mcp-server/`). It is an npm-publishable package.
2. **Two binaries / entry points share one server factory**:
   - `packages/mcp/src/server.ts` — the `createConciergeMcpServer({ tools, env })` factory consuming `@concierge/tools`
   - `packages/mcp/src/stdio.ts` — stdio bin entry (the **DEFAULT** install path: `claude mcp add concierge -- npx -y @concierge/mcp`)
   - `apps/mcp/src/index.ts` — Cloudflare Worker wrapper consuming the same factory (the **OPTIONAL secondary** install: `https://mcp.concierge.xyz/mcp`)
3. **`packages/mcp/package.json` `bin` field**:
   ```jsonc
   { "bin": { "concierge-mcp": "./dist/stdio.js" } }
   ```
   `npx -y @concierge/mcp` runs the stdio bin by default.
4. **`@modelcontextprotocol/sdk` version pinned to 1.29.x** (audit verified 2026-06-09). v2 API: `server.registerTool(name, { description, inputSchema, outputSchema }, handler)` with `outputSchema` MANDATORY per ADR-014 / 017.
5. **Tools come from `@concierge/tools`** (story-200), not hand-registered here. The MCP adapter just loops: `for (const t of tools) server.registerTool(t.name, { description: t.description, inputSchema: t.inputSchema.shape, outputSchema: t.outputSchema.shape }, async args => ({ content: [{ type: 'text', text: bigintSafeStringify(await t.invoke(args)) }], structuredContent: await t.invoke(args) }))`.
6. **Worker app is moved to story-133** (already exists), this story now scaffolds the core + stdio bin.

### Updated file modification map (replaces below)

- `packages/mcp/package.json` — NEW — `"type": "module"`, `"sideEffects": false`, `bin: { "concierge-mcp": "./dist/stdio.js" }`, deps on `@concierge/tools` + `@concierge/agent` + `@concierge/shared`, peer dep on `@modelcontextprotocol/sdk ^1.29` + `zod ^3.25 || ^4.1`
- `packages/mcp/src/server.ts` — NEW — `createConciergeMcpServer({ agent }: { agent: ConciergeAgent })` factory; returns `McpServer` with all `@concierge/tools` registered + `outputSchema` per tool
- `packages/mcp/src/stdio.ts` — NEW — stdio bin: `new StdioServerTransport()` connected to `createConciergeMcpServer({ agent: bootstrapAgent() })`; reads `AI_MODEL`, `ANTHROPIC_API_KEY`, `CONCIERGE_RPC_URL` from env
- `packages/mcp/src/streamable-http.ts` — NEW — `createStreamableHttpHandler({ agent })` for use by `apps/mcp/` Worker (story-133)
- `packages/mcp/src/ui-resources/` — NEW directory; one HTML file per `ui://concierge/*` resource (deferred to story-137)
- `packages/mcp/src/__tests__/server.test.ts` — NEW — unit test confirms `createConciergeMcpServer()` registers tools with valid `outputSchema` and `tools/list` returns the expected names
- `packages/mcp/README.md` — NEW — install snippet, stdio default

### Updated BDD criteria (replaces below)

```
Given `packages/mcp/package.json` exists
When `node -e "const p = require('./packages/mcp/package.json'); console.log(p.bin['concierge-mcp'])"` runs
Then output is "./dist/stdio.js"

Given the package builds
When `pnpm --filter @concierge/mcp build` runs
Then exit code is 0 AND `packages/mcp/dist/stdio.js` exists with a shebang `#!/usr/bin/env node` line

Given the stdio bin is invoked
When `node packages/mcp/dist/stdio.js` runs piped with a JSON-RPC `initialize` request
Then it responds with a valid `initialize` result describing server capabilities (`tools.listChanged: true`)

Given the createConciergeMcpServer factory is called with a mock agent
When `await server.listTools()` runs
Then ALL registered tools have non-null `inputSchema` AND `outputSchema`

Given a tool is invoked
When the tool's `outputSchema` parse fails on the result
Then the server returns a JSON-RPC error with explanatory message — does NOT crash

Given typecheck + LOC
When `pnpm typecheck` and `pnpm check-file-loc` run
Then both exit 0
```

### Updated notes for the coding agent

- **DO NOT scaffold `apps/mcp-server/` here.** That goes to story-133 (Worker wrapper).
- **DO use `outputSchema` mandatorily** per tool. The tool comes from `@concierge/tools` which already requires it — just pass `t.outputSchema.shape` to `registerTool`.
- **DO use bigint-safe stringify** when serializing tool results (on-chain reads return bigints).
- **Stdio bin must NOT prompt or `console.log` to stdout** — stdio is reserved for MCP messages. All logs go to stderr.
- **Wallet bootstrap** at stdio launch: if `CONCIERGE_SESSION_KEY` env var is unset, generate ephemeral session key + store at `~/.concierge/config.json` per the pokaldot pattern. (Real Mainnet session-key import flow is story-138 via Elicitation `mode: 'url'`.)
- Cross-ref: ADR-011 amended, ADR-014 (tools), ADR-018 (ESM-only), ADR-019 (errors).

---

## (original story preserved below for reference — see UPDATE above for current direction)

---

## User story

**As a** Claude Code user wanting Concierge as an MCP tool
**I want to** the MCP server skeleton at `apps/mcp-server` is built with Hono + `@modelcontextprotocol/sdk` v2, exposes the canonical MCP endpoints (`/mcp` for JSON-RPC, `/sse` for streaming), and runs locally for development
**So that** subsequent stories (read tools, write tools, OAuth) have a working scaffold to build on, and the Track-3 MCP listing has a concrete artifact to point at

---

## File modification map

- `apps/mcp-server/package.json` — NEW — workspace package; deps: `hono`, `@modelcontextprotocol/sdk` v2, `@concierge/sdk`, `@concierge/shared`
- `apps/mcp-server/src/index.ts` — NEW — Hono app entrypoint; binds MCP transport handlers
- `apps/mcp-server/src/server.ts` — NEW — `createConciergeMcpServer({ env })` factory returning the configured McpServer instance with tool registrations
- `apps/mcp-server/src/transport.ts` — NEW — Hono adapter for `@modelcontextprotocol/sdk`'s StreamableHTTPServerTransport
- `apps/mcp-server/src/types.ts` — NEW — `Env`, `Bindings` types (Cloudflare Workers bindings populated in story-133)
- `apps/mcp-server/wrangler.toml` — NEW — Cloudflare Workers config (compiled in story-133; here as a placeholder)
- `apps/mcp-server/tsconfig.json` — NEW — extends base; target ES2022 (Workers runtime)
- `apps/mcp-server/src/__tests__/server.test.ts` — NEW — unit test: createConciergeMcpServer returns a server that responds to `initialize` JSON-RPC

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @concierge/mcp-server run build` runs
Then exit code is 0

Given the local dev server runs
When `pnpm --filter @concierge/mcp-server dev` runs
Then it serves at http://localhost:8787 (Workers convention) AND POST /mcp with an `initialize` JSON-RPC returns the server's capability descriptor

Given the server is initialized
When a client calls `tools/list`
Then it returns the registered tools list (even if empty in this story; structure is correct)

Given the SSE endpoint
When GET /sse is called with proper headers
Then a server-sent-events stream opens (Content-Type: text/event-stream)

Given the JSON-RPC endpoint
When a malformed request is sent
Then it returns a proper JSON-RPC 2.0 error response (NOT a generic 500)

Given typecheck
When `pnpm --filter @concierge/mcp-server run typecheck` runs
Then exit code is 0

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/mcp-server
test -f package.json
test -f src/index.ts
test -f src/server.ts
test -f src/transport.ts
test -f wrangler.toml
test -f tsconfig.json

cd ../..

pnpm --filter @concierge/mcp-server run build
test $? -eq 0
pnpm run typecheck

# MCP SDK pinned
node -e "
  const pkg = require('./apps/mcp-server/package.json');
  const v = pkg.dependencies['@modelcontextprotocol/sdk'];
  if (!v || v.startsWith('^') || v.startsWith('~')) { process.exit(1); }
"

# Tests pass
pnpm --filter @concierge/mcp-server run test 2>&1 | grep "server" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Use `@modelcontextprotocol/sdk` v2 (not v1)** — v2 has the StreamableHTTPServerTransport which is the canonical pattern for HTTP-based MCP servers. v1's stdio-only transport doesn't work on Cloudflare Workers. Per `research/concierge/07-mcp-server-pattern.md` § verified facts.
- **Hono is the HTTP framework** because it's edge-native (works on Workers, Deno, Bun, Node) and ~10kb. Per ADR-011 in architecture.md.
- **Pin the MCP SDK version.** SDK is pre-1.0; minor versions have had breaking changes. Pinning prevents surprise breakage.
- **Workers runtime constraints**: no Node APIs (no `fs`, no `process.env` directly — use `c.env`); 10s CPU limit for free tier (paid lifts to 30s). Tool calls must complete inside this window. Long-running operations belong elsewhere.
- **`createConciergeMcpServer` factory pattern** lets the same code run locally (with mocked env) and on Workers (with real bindings). Single source of truth.
- **Local dev via wrangler dev** — even though Workers deploy is story-133, the local dev server runs against the wrangler runtime simulator, so this story's dev experience matches production from day 1.
- Cross-ref: `research/concierge/07-mcp-server-pattern.md` § Hono + Workers, ADR-011.
