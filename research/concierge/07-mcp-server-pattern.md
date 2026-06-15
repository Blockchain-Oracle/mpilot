# 07 — MCP Server as Agent Surface

**Purpose:** Concrete patterns for shipping mPilot as an MCP server consumable by Claude Code, Claude Desktop, Cursor, OpenClaw, and any other MCP host. This is the strategic distribution moat — judges already use Claude Code daily, so a working MCP makes the demo land. Read by `sahil-spec-writer` before generating the MCP surface story.

**Stack:** `@modelcontextprotocol/sdk` (TypeScript) with the `McpServer` high-level API + Streamable HTTP transport + OAuth via the SDK's `mcpAuthRouter` + Redis-backed session store + Cloudflare Workers (preferred) or Fly.io.

---

## 1. MCP in one paragraph

Model Context Protocol (MCP) is an open standard for connecting LLM hosts (Claude Desktop, Claude Code, Cursor, OpenClaw, …) to *tools, resources, and prompts* exposed by external servers. Specification + protocol schema live at `modelcontextprotocol/modelcontextprotocol`. The reference TypeScript SDK is `modelcontextprotocol/typescript-sdk`. The host (e.g. Claude Code) maintains a persistent connection to one or more MCP servers; the LLM running inside the host can call any server-registered tool the same way it'd call a local one.

For mPilot: instead of (or in addition to) shipping a CLI + Skill, we expose the agent's primitives directly as MCP tools, hosted publicly so any Claude Code user can `claude mcp add concierge https://mcp.concierge.app/mcp` and immediately have agent-controlled DeFi from their chat.

---

## 2. Package + minimal server

```bash
npm install @modelcontextprotocol/sdk zod
```

Minimal stdio server (from `modelcontextprotocol/typescript-sdk` README, v2 API):

```typescript
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'concierge', version: '0.1.0' });

server.registerTool(
  'agent_status',
  {
    title: 'Agent status',
    description: 'Read current state of the user\'s mPilot agent.',
    inputSchema: z.object({ agentId: z.string().describe('Agent id (agt_...)') }),
  },
  async ({ agentId }) => {
    const state = await getAgentState(agentId);
    return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**v2 API note:** Use `server.registerTool(name, config, callback)` with an explicit config object (description + `inputSchema` Zod). The v1 variadic `server.tool(name, schema, callback)` is deprecated. See `modelcontextprotocol/typescript-sdk/docs/migration-SKILL.md`.

---

## 3. Transports

Three transports the SDK supports:

| Transport          | When to use                                                       | Class                                     |
| ------------------ | ----------------------------------------------------------------- | ----------------------------------------- |
| **stdio**          | Local install. Host spawns the server as a subprocess.           | `StdioServerTransport`                    |
| **Streamable HTTP**| Hosted server. Single `/mcp` endpoint, full-duplex over POST + SSE. | `NodeStreamableHTTPServerTransport` / `WebStandardStreamableHTTPServerTransport` |
| **SSE (legacy)**   | Older clients that don't speak Streamable HTTP. **Deprecated.**  | `SSEServerTransport` (legacy package)     |

**mPilot ships both:**
- **stdio** — for power users who want zero network latency and don't care about hosting. Distributed via `npm install -g @mpilot/mcp` and invoked from the MCP host's config.
- **Streamable HTTP** — for the hosted moat. `https://mcp.concierge.app/mcp`. One-line install for any user.

### 3.1 Stateless Streamable HTTP (the easy mode)

From `modelcontextprotocol/typescript-sdk/packages/middleware/express/README.md`:

```typescript
import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { McpServer } from '@modelcontextprotocol/server';

const app = createMcpExpressApp();
const server = buildConciergeServer(); // tools registered

app.post('/mcp', async (req, res) => {
  // Stateless: new transport per request, no sessionId
  const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

Stateless is fine when every tool call is fully parameterized (agentId in args, auth in headers). For mPilot most calls fit that shape, so we start stateless.

### 3.2 Stateful mode (sessions)

When the LLM has a multi-turn flow on the server side (e.g. a "draft a proposal, then submit it"), we keep one transport instance per session id:

```typescript
const transports = new Map<string, NodeStreamableHTTPServerTransport>();

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport = sessionId ? transports.get(sessionId) : undefined;
  if (!transport) {
    transport = new NodeStreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => transports.set(id, transport!),
    });
    await server.connect(transport);
  }
  await transport.handleRequest(req, res, req.body);
});
```

For session storage across multiple server instances, back it with Redis (see §6).

### 3.3 Hono / Web-standard transport

If we deploy on Cloudflare Workers (recommended — no 10s limit) we use the web-standard variant:

```typescript
import { McpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';
import { Hono } from 'hono';

const server = new McpServer({ name: 'concierge', version: '0.1.0' });
const transport = new WebStandardStreamableHTTPServerTransport();
await server.connect(transport);

const app = new Hono();
app.all('/mcp', (c) => transport.handleRequest(c.req.raw));
export default app; // Cloudflare Workers entry
```

This is the cleanest deploy target for hosted MCP.

---

## 4. Tool registration — the real surface

mPilot MCP tools (proposed):

```typescript
server.registerTool('agent_status', {
  description: 'Get current state of the user\'s mPilot agent.',
  inputSchema: z.object({ agentId: z.string() }),
}, async ({ agentId }) => ({ content: [{ type: 'text', text: JSON.stringify(await getState(agentId)) }] }));

server.registerTool('proposals_list', {
  description: 'List pending proposals awaiting user approval.',
  inputSchema: z.object({ agentId: z.string(), status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional() }),
}, async ({ agentId, status }) => ({ content: [{ type: 'text', text: JSON.stringify(await listProposals(agentId, status)) }] }));

server.registerTool('proposal_approve', {
  description: 'Approve a pending proposal. After approval the agent will execute on the next tick.',
  inputSchema: z.object({ proposalId: z.string() }),
}, async ({ proposalId }) => {
  await approveProposal(proposalId, currentUserAddress());
  return { content: [{ type: 'text', text: `Approved ${proposalId}` }] };
});

server.registerTool('yields_list', {
  description: 'List current stablecoin yield opportunities on Mantle.',
  inputSchema: z.object({ asset: z.enum(['USDC', 'USDT', 'USDe']).optional() }),
}, async ({ asset }) => ({ content: [{ type: 'text', text: JSON.stringify(await listYields(asset)) }] }));

server.registerTool('policy_show', {
  description: 'Show the current session-key policy for the agent.',
  inputSchema: z.object({ agentId: z.string() }),
}, async ({ agentId }) => ({ content: [{ type: 'text', text: JSON.stringify(await getPolicy(agentId)) }] }));

server.registerTool('attestations_lookup', {
  description: 'Lookup ERC-8004 attestations recorded by the agent.',
  inputSchema: z.object({ agentId: z.string(), limit: z.number().int().min(1).max(100).default(20) }),
}, async ({ agentId, limit }) => ({ content: [{ type: 'text', text: JSON.stringify(await listAttestations(agentId, limit)) }] }));
```

Read-only tools (`*_list`, `*_show`, `*_status`, `*_lookup`) are safe to expose with read-only auth. Write tools (`proposal_approve`, `agent_start`, `policy_revoke`) require user-authenticated OAuth (see §5).

---

## 5. OAuth — the hosted-MCP unlock

Hosted MCP is multi-tenant by definition; each user's agent state is theirs. OAuth is how we know which user is calling. The MCP TypeScript SDK ships `mcpAuthRouter` (Express middleware):

```typescript
import { mcpAuthRouter } from '@modelcontextprotocol/server-legacy/auth';

app.use('/auth', mcpAuthRouter({
  issuer: 'https://mcp.concierge.app',
  clients: { /* ... */ },
  authorize: async ({ user, scopes }) => { /* ... */ },
}));
```

For the hackathon we can shortcut OAuth via a single static **bearer token** the user generates in the mPilot web app and pastes into Claude Code's MCP config:

```json
{
  "mcpServers": {
    "concierge": {
      "url": "https://mcp.concierge.app/mcp",
      "headers": { "Authorization": "Bearer ck_live_..." }
    }
  }
}
```

The server middleware validates the token, looks up the bound `agentId`, and injects it into every tool call. This is the fastest demo path. Real OAuth (PKCE flow with consent screen) is the v1 upgrade.

The hosted reference Giza is described as hosting at `https://mcp.gizatech.xyz/api/sse` (Next.js + OAuth + Redis sessions, Vercel). [UNVERIFIED — homepage didn't expose docs we could fetch]. The mPilot target endpoint shape: `https://mcp.concierge.app/mcp` (Streamable HTTP, not deprecated SSE).

---

## 6. Deployment — where to host

The killer constraint is **request lifetime**. Streamable HTTP responses can stream for minutes if the tool is slow. Vercel's *default* serverless functions cap at 10s (Hobby) / 60s Fluid (Pro). That's *fine* for most mPilot tools (read state, list proposals — sub-second), but `proposal_approve` could wait on a tick that takes longer.

| Host                | Pros                                                                   | Cons                                                              |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Cloudflare Workers** | No request-duration cap, edge-routed, free tier generous. Web-standard transport works natively. | No long-lived process state — back sessions with Workers KV / Durable Objects or external Redis. |
| **Fly.io**          | Long-lived Node process. Simple Express setup. Easy Redis colocation.  | Not edge-distributed. One region by default.                      |
| **Vercel Functions**| Easiest to ship from existing Next.js. Pro Fluid up to 800s.           | 60s default; Fluid pricing unclear at scale.                      |
| **Render / Railway**| Long-running, like Fly.io.                                             | Cold starts, less polished DX.                                    |

**Recommendation:** Cloudflare Workers + Hono + `WebStandardStreamableHTTPServerTransport`. Free tier covers hackathon traffic. Workers KV for sessions in stateless mode; Upstash Redis if we need richer session state.

---

## 7. How hosts consume MCP

### 7.1 Claude Code

```bash
claude mcp add concierge https://mcp.concierge.app/mcp --header "Authorization: Bearer ck_live_..."
```

Or edit `~/.config/claude/mcp.json` directly. Once added, Claude Code surfaces every mPilot tool to the model on every turn.

### 7.2 Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "concierge": {
      "command": "npx",
      "args": ["-y", "@mpilot/mcp"]
    }
  }
}
```

(For the stdio variant — Desktop also supports HTTP in recent versions.)

### 7.3 OpenClaw / RealClaw

Same MCP standard. Config file path differs but the contract is identical. RealClaw users who installed the **skill** also get the MCP automatically if we bundle a `claude_mcp.json` entry in the skill manifest. [UNVERIFIED — need to check RealClaw's exact MCP discovery path; for safety document both rails.]

### 7.4 Cursor

`~/.cursor/mcp.json`, same shape as Claude Desktop. Most Cursor users won't run our MCP, but the surface area is free.

---

## 8. Why MCP is the distribution moat

1. **Judges already live in Claude Code / Cursor.** A working `claude mcp add concierge ...` line in the demo is the difference between "interesting project" and "I want this in my IDE right now."
2. **Composability.** A user with our MCP and someone else's MCP (e.g. an Etherscan MCP, a Curve MCP, a Telegram MCP) can have Claude orchestrate cross-service workflows — "if my mPilot yield drops below 6%, message me on Telegram and propose a rebalance." We don't have to ship Telegram. We just have to be on the bus.
3. **Friction-free trial.** No npm install, no CLI setup. Paste URL + bearer token, done.
4. **Track 6 multiplier.** Track 6 rewards agent infra. A skill + an SDK + a CLI + an MCP server is four checkboxes, not one.
5. **Long tail.** Every MCP host that ships gets mPilot for free. We don't have to court Cursor or Codex — they all speak the same protocol.

---

## 9. Risks

| Risk                                                          | Mitigation                                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Vercel SSE 10s limit kills long-running tools                 | Cloudflare Workers (no cap) or split long ops into proposal + tick.    |
| Bearer-token leak gives full agent control                    | Tokens are scoped to read-only by default; write tools require fresh token + 2FA in v1. |
| Hosted MCP becomes a single point of failure                  | Ship stdio variant in parallel; advanced users can self-host.          |
| MCP spec churn breaks integration                             | Pin `@modelcontextprotocol/sdk` minor version; CI test against latest. |
| Session id collisions across multi-tenant deploys             | Use cryptographically random session ids (`randomUUID()`), Redis-backed map. |
| Auth bypass via missing middleware on a route                 | Centralize auth in Hono/Express middleware; all routes go through it.   |
| Idempotency — same approve hit twice                          | Use proposal `nonce` in tool input; idempotency key in DB.             |

---

## 10. Open questions for spec writer

1. **Hosted endpoint URL** — `mcp.concierge.app/mcp`? Reserve domain now.
2. **Stateless vs stateful** — start stateless. Decide if any tool needs server-side multi-turn (e.g. interactive policy update) — if yes, move that one to stateful.
3. **Bearer token vs OAuth for v0** — bearer token for hackathon (2 days to ship), real OAuth for v1.
4. **Hosting target** — Cloudflare Workers (recommended) or Fly.io? Choose before writing code; the transport differs (`WebStandard*` vs `Node*`).
5. **Should the MCP and the Next.js app share a deployment?** — No. Separate concerns: web app on Vercel, MCP on Workers. Same Postgres + Redis backend.
6. **Tool naming convention** — `verb_noun` (`proposals_list`) or `domain.verb` (`proposals.list`)? Recommend `verb_noun` snake_case (matches the existing MCP examples in the SDK).
7. **Read-only vs write tool split** — read tools work with bearer-readonly; write tools (anything that creates/approves/revokes) require write-bearer. Document the scope matrix.
8. **Resource exposure** — `registerResource('agent://{agentId}/state', ...)` for the agent's state as an MCP *resource* (Claude can read it directly into context without a tool call). Worth it? Recommend yes for `agent://{id}/state` and `agent://{id}/policy` since they're frequently read.
9. **Prompts** — `registerPrompt` lets the server ship reusable prompt templates. Worth shipping a `concierge://recommend-yield` prompt? Recommend deferring; tools cover the surface.
