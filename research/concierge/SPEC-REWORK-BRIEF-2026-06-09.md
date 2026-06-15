# Spec Rework Brief — 2026-06-09

**Trigger:** Abu PR-feedback session, 2026-06-09 ~11:20am GMT+1, after reading the current PRD and noticing component / SDK / MCP-shape inconsistencies with how he ships every other multi-surface repo. He explicitly asked for **research, not patches**: *"there's no point of you making allegations yet. It's just you doing thorough research and finding out what everything looks like."*

**Status:** RESEARCH SYNTHESIS — superseded by `AUDIT-2026-06-09.md` for library/version specifics. This brief = the synthesis; AUDIT = the version-pinned reality check.

**Audit pass applied 2026-06-09 ~11:40am:** `ai 5.x` → `ai 6.x`; dropped `@mpilot/goat` (GOAT SDK 4-15 months stale); `@mpilot/openai` now covers both OpenAI + Anthropic raw tool-use (single adapter, two runtimes); Elicitation supports `mode: 'form'` AND `mode: 'url'` (SEP-1036). Full audit at `AUDIT-2026-06-09.md`.

**Tool-UI investigation 2026-06-09 ~12:50pm (Abu-requested):** `@assistant-ui/tool-ui` is a **shadcn-style registry**, NOT an npm package — components install via `npx shadcn@latest add https://tool-ui.com/r/<name>.json`. Path **C selected**: build `@mpilot/react-ui` as npm-published (primary) using tool-ui's PATTERNS as design reference (schema-driven tool output via `SerializableConciergeXxxSchema`, lifecycle states, parse-then-render gating). Same `SerializableConciergeXxxSchema` schemas live in `@mpilot/tools` and feed MCP `outputSchema` — single source of schema truth across tool definition + MCP server + Vercel AI SDK tool-parts + React component props. v1.1 stretch: complementary shadcn registry at `mpilot.xyz/r/*.json` for copy-paste consumers. No new package added; tool-ui is design reference only.

**SDK DX study in flight 2026-06-09 ~12:55pm (Abu-flagged gap):** background agent studying canonical SDK developer-experience patterns across Vercel AI SDK, LangChain, Mastra, Strands Agents, Anthropic SDK, OpenAI SDK, Stripe Node, Coinbase AgentKit. Output → `research/concierge/SDK-DX-STUDY-2026-06-09.md`. Architecture rewrite paused until study returns, so adapter shapes + model-agnostic config + error handling + streaming patterns can be grounded in primary-source evidence, not guesswork.

**Scope:** Decide whether and how to rework PRD + architecture.md (ADR-011 + package list) + epics + stories to ship mPilot as a **composable primitive** rather than a closed product, so other devs can plug it into LangChain / Vercel AI / OpenAI / Claude Desktop / etc.

---

## TL;DR (5 firm conclusions + 1 architectural pivot)

1. **MCP should default to LOCAL stdio, not hosted SaaS.** Abu was right. All three of his shipped MCP repos (`pokaldot`, `kwala`, `story-cdr`) install via `npx -y @<pkg>/mcp` into the user's MCP client. Hosted is the exception, not the default. The current ADR-011 collapses to Cloudflare-only — and `07-mcp-server-pattern.md` §3 already specified the stdio variant; the architecture just didn't carry it forward.

2. **Components belong in the SDK as TWO separate npm packages** (`@mpilot/react` headless + `@mpilot/react-ui` styled), not buried in `apps/web/components/`. Abu's `cdr-kit` repo ships exactly this split: `@cdr-kit/react` (hooks + headless `<VaultGate>`) + `@cdr-kit/react-ui` (styled drop-ins). Currently we have neither.

3. **Model-agnostic is non-negotiable for an SDK + MCP product**, and was wrongly deferred to v1.1 in PRD line 54. Both `pokaldot` and `kwala` auto-detect provider from env (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`) and let the user override via `AI_MODEL="provider:model"`. The autonomous tick loop can still pick its own model per phase; the SDK / MCP surface must NOT lock the consumer to Anthropic.

4. **Plugin architecture should mirror CDR-Kit's `@cdr-kit/tools` + N-adapters pattern.** One framework-agnostic registry (`@mpilot/tools`) defines each mPilot action once with a Zod schema + handler. Then thin adapters (`@mpilot/vercel-ai`, `@mpilot/langchain`, `@mpilot/openai`, `@mpilot/agentkit`, `@mpilot/goat`, `@mpilot/mcp`) wrap that single source for each runtime. **This is the pattern that makes mPilot composable into other devs' agent stacks** — exactly what Abu was pointing at when he said "lan chain will have an MCP… cdr-kit will help you."

5. **Generative UI = THREE rails, NOT one.** **Rail 1** = Vercel AI SDK v5+ `tool-${toolName}` UI message parts in the web app (already in stack; verified in pokaldot + kwala). **Rail 2** = MCP Apps (SEP-1865, merged 2026-01-28) `ui://concierge/*` HTML resources rendered in sandboxed iframes by Claude Desktop / ChatGPT / Goose / VS Code Insiders. **Rail 3** = MCP Elicitation (stable since 2025-06-18) for high-value `execute()` confirmation flows. All three are built on a structured-JSON tool-result contract (`outputSchema` per tool) as the load-bearing primitive. Spec contract to adopt: *"every mPilot tool ships with structured JSON + a Vercel AI SDK card + (optional) a `ui://` HTML resource."*

**Architectural pivot:** mPilot is currently spec'd as **an app that happens to expose an SDK + MCP + skill on the side**. The four-surface phrasing in PRD line 17 implies parity, but the *implementation* in architecture.md privileges `apps/web/` and lets the other surfaces inherit. The rework reframes mPilot as **a core (`@mpilot/tools` + `@mpilot/sdk` + `@mpilot/react`) that ships across N runtimes via thin adapters; the web app is the flagship reference consumer of the core, not the source of truth.** This is the same shape as `cdr-kit` → `apps/site/` (flagship dashboard built from the SDK), `pokaldot` → `packages/web` (reference chat built from `packages/core`), `kwala` → `packages/web` (reference UI built from `@kwala-ai/cli`).

---

## Gap analysis — what the existing research already said vs what the spec captured

| Gap | Research said | Spec says | Source |
|---|---|---|---|
| MCP stdio rail | "Ship BOTH stdio (`npm install -g @mpilot/mcp`) AND hosted Streamable HTTP" | ADR-011: "MCP server on Cloudflare Workers (NOT Vercel)" — stdio not mentioned | `07-mcp-server-pattern.md` §3.0 vs `architecture.md` lines 268-270 |
| Component library | "Designer picks Tambo / assistant-ui / Vercel AI SDK + custom shadcn" — designer's call | `apps/web/components/` private + `packages/ui/` (brand tokens only) | `08-ux-component-intent.md` line 3 vs `architecture.md` line 100 |
| Framework adapters | Not mentioned (gap in original research) | Not in package list | n/a — new finding from `cdr-kit`/`pokaldot`/`kwala` cross-read |
| Model-agnostic | `_RUNTIME_SUMMARY.md` lists "Model per phase: Opus plan / Sonnet sim+exec / Haiku rec" (Anthropic-only) | PRD line 54: explicit "Multi-LLM provider abstraction — defer to v1.1" | `_RUNTIME_SUMMARY.md` Decision #6 vs `PRD.md` line 54 |
| Generative-UI contract | `08-ux-component-intent.md` describes 18 components in detail but ONLY as private app primitives | Stories 107-115 = web app components; no story exporting them as `@mpilot/react` | `08-ux-component-intent.md` vs `docs/stories/story-1XX-*.md` |

---

## Thread 1 — MCP local-CLI vs hosted SaaS (FIRM)

### Evidence

**Pokaldot (`portaldot-mcp`):**
- `packages/mcp` = MCP server, stdio transport, headless signing via auto-generated wallet at `~/.portaldot-mcp/config.json`
- Install: `claude mcp add portaldot -- npx -y portaldot-mcp`
- Web is SEPARATE: `packages/web` is Next.js + AI SDK v6 generative-UI chat, browser-signed via injected wallet
- Shared core: `packages/core` (zero `next` dependency, zero MCP SDK dependency — transport-agnostic)

**Kwala (`@kwala-ai/mcp`):**
- `packages/mcp` = thin stdio wrapper; all logic lives in `@kwala-ai/cli` which exports `createMcpServer()` factory
- Install: `claude mcp add kwala npx @kwala-ai/mcp` OR `npm install -g @kwala-ai/cli`
- Wallet auto-generated on first run at `~/.kwala-mcp/config.json`, never leaves machine
- Web app is separate `packages/web/`, AI SDK v5+, browser-signed

**Story-cdr (`@cdr-kit/mcp`):**
- "Stdio MCP server (Claude Desktop / Cursor / Windsurf / OpenClaw) — 34 tools" (README line 68)
- Install: `claude mcp add cdr-kit -- npx -y @cdr-kit/mcp`
- All 34 tools sourced from `@cdr-kit/tools` (framework-agnostic registry)

### Why stdio is the right default

1. **Zero infra cost for the consumer.** No URL to remember, no auth token to manage. Just `npx -y`.
2. **Privacy.** Session-key private key never leaves the user's machine. Critical for a DeFi agent.
3. **No 10s SSE limit, no Cloudflare Worker cold-start, no Workers KV / Durable Objects choreography.**
4. **Universal install across MCP hosts.** Same stdio config shape works in Claude Code, Claude Desktop, Cursor, Windsurf, VS Code Copilot, Zed, Cline, Goose, Gemini CLI.
5. **Demoable offline.** Judge can clone and `pnpm install && pnpm dev:mcp` without any deploy.

### Why ALSO keep hosted (don't kill the Cloudflare path)

1. **One-line install for users who don't want to install Node tools.** Paste URL + bearer token.
2. **Multi-tenant analytics + abuse rate-limit.** Centralized observability.
3. **Demo URL for judges who don't want to install anything.** `claude mcp add concierge https://mcp.mpilot.xyz/mcp` is dramatic.

**Recommendation:** **Ship both. Default the README + docs install to stdio.** Hosted is for users who explicitly want a URL.

### Recommended ADR-011 amendment

```
ADR-011 — MCP server: stdio-first, hosted optional

mPilot MCP ships as @mpilot/mcp (stdio, npx-installable, the default in all docs)
AND a hosted Streamable-HTTP endpoint at mcp.mpilot.xyz/mcp (Cloudflare Workers + Hono,
the same code with WebStandard transport).

Stdio variant:
- packages/mcp/, depends on @mpilot/tools (framework-agnostic registry)
- Auto-generates a local wallet at ~/.concierge/config.json on first run
- For Mainnet writes, prompts the user to import their own session key (no auto-key in hot path)
- Install: claude mcp add concierge -- npx -y @mpilot/mcp

Hosted variant:
- apps/mcp/ (Cloudflare Worker), wraps the same packages/mcp factory
- Bearer-token auth v0; OAuth v1 (mcpAuthRouter or equivalent)
- The user generates a bearer token in mpilot.xyz/app/settings; pastes into their MCP client

The tool registry is identical; only transport + auth differ.

Why both: stdio is the default install path (zero infra, max privacy); hosted is the optional
URL-paste convenience path. Mirrors the pattern shipped in @cdr-kit/mcp, @kwala-ai/mcp,
portaldot-mcp.
```

---

## Thread 2 — Components in the SDK (FIRM)

### Evidence

**CDR-Kit splits:**
- `@cdr-kit/react` — headless: `<CdrProvider>`, `<VaultGate>`, `<Vault>` compound, condition components, 7+ hooks (README line 65)
- `@cdr-kit/react-ui` — styled drop-ins built on the headless layer (README line 66)
- App at `apps/site/` (cdrkit.xyz) is built FROM these two packages — the dashboard *dogfoods* the SDK

**Pokaldot:**
- One web app (`packages/web`) but the chat-card components are colocated and built using Vercel AI SDK v6 typed `tool-${name}` parts (CLAUDE.md line 21)
- Pattern: per-tool React card. *"Every tool ships with: impl (core) + a REAL end-to-end test (live chain, no mocks) + a generative-UI card (web)."*

### Why ship a separate React package

1. **Dev experience.** A Mantle dev building an agent app can `npm install @mpilot/react @mpilot/sdk` and render mPilot's tick stream + proposal cards in their own chat UI.
2. **MCP host gen-UI.** When Claude Desktop / Claude.ai render an MCP tool result, the host needs SOMETHING to render. (Verifying what MCP hosts actually render is **Thread A**, agent running in background.) Even if hosts only render JSON today, having React components shipped means devs *consuming* the MCP server in their own apps get the UI for free.
3. **Reputation page.** `mpilot.xyz/agent/:id` is currently in `apps/web`, but the agent reputation card is the kind of thing a third-party dApp would want to embed.
4. **AgentArena-style aggregator support.** If anyone builds an "all Mantle agents" leaderboard, they'd want to embed our `<AgentNFTCard>` + `<ReputationChart>` directly.

### Recommended package split

| Package | Purpose | Built on |
|---|---|---|
| `@mpilot/react` | Headless: hooks + state machines + ARIA contract. `useTickStream(agentId)`, `useProposal(proposalId)`, `useReputation(agentId)`, `<ConciergeProvider>`. No styling. | `ai` + `@ai-sdk/react` + `@tanstack/react-query` |
| `@mpilot/react-ui` | Styled drop-ins: `<TickCard>`, `<ProposalCard>`, `<PortfolioCard>`, `<ReputationChart>`, `<EmergencyStop>`, `<GoalInput>`. Tailwind v4 + shadcn primitives. | `@mpilot/react` + `tailwindcss` + `class-variance-authority` |
| `@mpilot/ui` (already in spec) | Brand tokens only — colors, spacing, typography vars. | n/a |

`apps/web/` rewrites `apps/web/app/app/*` to consume `@mpilot/react-ui` directly — proves the package works and removes dead code paths.

### Trade-off

Splitting headless + styled is more package surface to maintain (3 packages vs 1 monolithic UI). Recommended **only if we commit to dogfooding**: web app must import from `@mpilot/react-ui`, not duplicate.

---

## Thread 3 — Model-agnostic SDK (FIRM)

### Evidence

**Pokaldot env detection (README line 76-82):**
```bash
# Web chat — set any one provider. Auto-detected.
# Override with AI_MODEL="provider:model" (e.g. openai:gpt-5, xai:grok-4, google:gemini-2.5-pro).
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
XAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

**Kwala README line 209-215:**
```
ANTHROPIC_API_KEY | One of these | Anthropic API key for Claude
OPENAI_API_KEY    | One of these | OpenAI API key for GPT-4o
ANTHROPIC_MODEL   | No           | Model name (default: claude-sonnet-4-20250514)
OPENAI_MODEL      | No           | Model name (default: gpt-4o)
```

### How Vercel AI SDK enables this

`ai` v5+ exposes `streamText({ model: anthropic('claude-...') | openai('gpt-...') | google('gemini-...') | xai('grok-...') })`. The same `tool()` definitions, the same `useChat` hook, the same `tool-${name}` UI parts — all model-agnostic by construction. The only thing that locks in Anthropic is `@anthropic-ai/claude-agent-sdk` (currently in architecture.md line 18 as the **autonomous tick loop runtime**).

### What to actually keep Anthropic-only

- **Autonomous tick loop** (`apps/worker/`) — uses `@anthropic-ai/claude-agent-sdk` for multi-step tool-use with prompt caching. Anthropic-specific is fine here; users don't see it.
- **Default model for `/api/chat`** — Sonnet 4.6. Users / SDK consumers override.

### What to make model-agnostic

- **`@mpilot/sdk`** — accepts a `model` parameter typed as `LanguageModelV1` (Vercel AI SDK's universal model interface). Default Anthropic; SDK consumer plugs in any.
- **`@mpilot/mcp` (stdio)** — auto-detects `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / etc.; overrides via `CONCIERGE_AI_MODEL="provider:model"` env var.
- **`/api/chat` route in `apps/web/`** — accepts model override via header/query for power users.

### Recommended PRD line 54 amendment

**Strike:**
> Multi-LLM provider abstraction — Anthropic only for v1; defer to v1.1

**Replace with:**
> Multi-LLM provider abstraction — supported via Vercel AI SDK's `LanguageModelV1` interface across `@mpilot/sdk` + `@mpilot/mcp` + `/api/chat`. Auto-detect via env (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / `XAI_API_KEY`); override via `CONCIERGE_AI_MODEL="provider:model"`. The autonomous tick worker remains Anthropic-only (Claude Agent SDK).

---

## Thread 4 — Plugin architecture / cross-runtime adapters (FIRM — code-verified)

### The canonical tool shape (verified from CDR-Kit + Coinbase AgentKit + GOAT)

All three reference implementations converge on the same 4-field interface:

**CDR-Kit** (`Blockchain-Oracle/cdr-kit:packages/tools/src/types.ts`):
```ts
export interface CdrTool {
  name: string;
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  invoke: (input: unknown) => Promise<unknown>;
}
```

**AgentKit** (`coinbase/agentkit:typescript/agentkit/src/action-providers/actionProvider.ts`):
```ts
export interface Action<TActionSchema extends z.ZodSchema = z.ZodSchema> {
  name: string;
  description: string;
  schema: TActionSchema;
  invoke: (args: z.infer<TActionSchema>) => Promise<string>;
}
```

**GOAT** (`goat-sdk/goat:typescript/packages/core/src/classes/ToolBase.ts`): same 4 fields, named `parameters` instead of `schema`.

The two differences worth noting:
- **CDR-Kit returns `Promise<unknown>`; AgentKit returns `Promise<string>`.** CDR-Kit's choice is better for mPilot (we have bigints in positions / HF / prices; serialization happens at the adapter boundary).
- **AgentKit adds `supportsNetwork(chainId: number) => boolean`** on the action provider. Worth borrowing — mPilot providers are gated to chain 5000 (Mainnet) vs 5003 (Sepolia mocks).

### Recommended `ConciergeTool` shape — AMENDED with schema-aware UI gating (per Abu, 2026-06-09)

```ts
export interface ConciergeTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  /** Output schema — feeds MCP `outputSchema`, Vercel AI SDK `tool-${name}` typing, and `<XxxCard part={p} />` parse-then-render. The SAME schema is used everywhere. */
  outputSchema: z.ZodObject<z.ZodRawShape>;
  /** Optional mPilot-card binding. If set, `@mpilot/react-ui` can render the canonical card for this tool's output. */
  uiCardId?: string;  // e.g., 'proposal' | 'tick' | 'portfolio' | 'reputation'
  invoke: (input: TInput) => Promise<TOutput>;
  supportsNetwork?: (chainId: number) => boolean;
}
```

Plus:
```ts
export function createConciergeTools(agent: ConciergeAgent): ConciergeTool[];
export function toJsonSchema(tool: ConciergeTool): Record<string, unknown>;
// Per-tool serializable schema helpers (pattern borrowed from @assistant-ui/tool-ui):
export const SerializableProposalCardSchema = z.object({ /* ... */ });
export const SerializableTickCardSchema = z.object({ /* ... */ });
export const SerializablePortfolioCardSchema = z.object({ /* ... */ });
export const SerializableReputationCardSchema = z.object({ /* ... */ });
export function safeParseSerializableProposalCard(data: unknown) { /* ... */ }
// (etc.)
```

The agent (wallet + RPC + provider singletons) is closed over at construction time, keeping `invoke(args)` arity-1 and dispatchable. No decorators, no `reflect-metadata`, no class hierarchies.

**Why `outputSchema` is now mandatory (not optional):**
1. MCP SDK v1.29 `registerTool` accepts `outputSchema` and emits `structuredContent` — the load-bearing structured-JSON contract.
2. Vercel AI SDK v6 `tool-${name}` parts type `part.output` from the tool's output type — the same schema gives end-to-end typing.
3. `@mpilot/react-ui` cards parse the data via `safeParseSerializableXxx` before rendering — runtime validation + clear failure surface.
4. Future-proofs us for tool-ui's `@assistant-ui/tool-ui` style consumers, MCP Apps `ui://` HTML renderers, and assistant-ui / CopilotKit adapters — all use the same schema as the contract.

**Why this is better than the original bare 4-field shape:**
- End-to-end type safety from LLM tool result → Zod parse → React component props.
- One schema definition per tool serves: MCP `outputSchema`, Vercel AI SDK `tool({ outputSchema })`, MCP Apps iframe data, React card props. No duplication, no drift.
- Matches the schema-driven discipline that `@assistant-ui/tool-ui` proved (and we adopt as architectural pattern, not as a dependency).

### Adapter conversion functions (paste verbatim from CDR-Kit)

**Vercel AI** (`packages/vercel-ai/src/index.ts`):
```ts
tools[t.name] = tool({ description: t.description, inputSchema: t.inputSchema, execute: args => t.invoke(args) });
```

**OpenAI / Anthropic raw** (`packages/openai/src/index.ts`):
```ts
const tools = cdrTools.map(t => ({
  type: "function",
  function: { name: t.name, description: t.description, parameters: toJsonSchema(t) }
}));
return {
  tools,
  dispatch: async (name, args) => byName.get(name)!.invoke(
    typeof args === "string" ? JSON.parse(args) : args
  )
};
```

**LangChain** (`packages/langchain/src/index.ts`):
```ts
return cdrTools.map(t =>
  tool(async args => JSON.stringify(await t.invoke(args)),
       { name: t.name, description: t.description, schema: t.inputSchema })
);
```

**AgentKit** (`packages/agentkit/src/index.ts`): wrap the entire array in a single `customActionProvider([...])` — escape hatch for skipping decorator boilerplate.

**GOAT** (`packages/goat/src/index.ts`):
```ts
createTool({ name: t.name, description: t.description, parameters: t.inputSchema }, args => t.invoke(args));
```

**MCP** (`packages/cli/src/server.ts` — the real glue; `mcp/src/index.ts` is just the stdio bin):
```ts
server.registerTool(t.name, { description: t.description, inputSchema: t.inputSchema.shape },
  async args => ({ content: [{ type: "text", text: bigintSafeStringify(await t.invoke(args)) }] })
);
```

(Note: `bigintSafeStringify` because on-chain reads return `bigint` and `JSON.stringify` throws on bigints.)

Each adapter is **15-40 LOC**. The total adapter package count is small; the maintenance cost is low.

### Why this pattern is the right answer for mPilot

1. **The 7 mPilot action providers** (`@mpilot/aave-v3-mantle`, etc.) each expose 3-8 actions. Total ~30-40 actions. Defining them in 5 different framework formats is 5× the maintenance.
2. **The MCP server, the SDK, the chat API, and the Skill bundle ALL want the same actions.** Single source eliminates drift.
3. **Distribution leverage.** A LangChain dev who uses `@mpilot/langchain` can compose mPilot actions into their existing agent without learning our SDK. Same for OpenAI Assistants, AgentKit, GOAT, and Vercel AI users.
4. **MCP Apps `ui://` resources (per Thread 5 Rail 2)** key off the same tool name — one tool definition, one card, one HTML resource, one row in the docs.

### What NOT to do

- **Don't build on top of GOAT or AgentKit.** Both are TARGET adapters (CDR-Kit ships adapters for them). Build the framework-agnostic core and adapt OUT, not IN. Trying to extend AgentKit's `ActionProvider` class would force us into their decorator + `reflect-metadata` setup.
- **Don't invent.** Both reference implementations converged on the same shape. Deviating costs trust.
- **Don't support Eliza in v1.** Eliza's `Action` is runtime-specific (handler + validate + examples + similes). Adapter would be one-way and feature-loss. Defer.

### Why this is the right shape for mPilot

1. **The 7 mPilot action providers** (`@mpilot/aave-v3-mantle`, `@mpilot/mantle-dex`, etc.) each expose 3-8 actions. Total ~30 actions. Defining them in 5 different formats is 5× the maintenance.
2. **The MCP server, the SDK, and the Vercel AI SDK chat all want the same actions.** Single source eliminates drift.
3. **Distribution leverage.** A LangChain dev who uses our `@mpilot/langchain` package can compose mPilot actions into their existing agent without learning our SDK. Same for OpenAI Assistants and AgentKit users.

### Recommended package list (final, code-verified)

```
packages/
├── shared/         @mpilot/shared          # addresses + ABIs + types (existing — keep)
├── providers/                                 # 7 protocol packages (existing — keep)
│   ├── aave-v3-mantle/  @mpilot/aave-v3-mantle
│   ├── mantle-dex/      @mpilot/mantle-dex
│   ├── ethena-susde/    @mpilot/ethena-susde
│   ├── ondo-usdy/       @mpilot/ondo-usdy
│   ├── meth-staking/    @mpilot/meth-staking
│   ├── lifi-bridge/     @mpilot/lifi-bridge
│   └── erc8004/         @mpilot/erc8004
├── agent/          @mpilot/agent           # ConciergeAgent class (wallet + RPC + provider singletons)
├── tools/          @mpilot/tools           # framework-agnostic ConciergeTool[] registry (NEW)
├── vercel-ai/      @mpilot/vercel-ai       # → ai SDK ToolSet (NEW)
├── openai/         @mpilot/openai          # → OpenAI/Anthropic tools + dispatch (covers both — same JSON schema shape) (NEW)
├── langchain/      @mpilot/langchain       # → LangChain StructuredToolInterface[] (NEW)
├── agentkit/       @mpilot/agentkit        # → Coinbase AgentKit ActionProvider via customActionProvider (NEW)
├── goat/           @mpilot/goat            # → GOAT SDK ToolBase[] (NEW)
├── mcp/            @mpilot/mcp             # transport-agnostic core (stdio bin + Worker wrapper consume this) (NEW)
├── skill/          @mpilot/skill           # RealClaw skill (Track 6 per ADR-003) wrapping @mpilot/tools (existing — rewire)
├── react/                   @mpilot/react              # headless tool-part components (NEW)
├── react-ui/                @mpilot/react-ui           # styled drop-ins (cards per tool) (NEW)
├── react-assistant-ui/      @mpilot/react-assistant-ui # assistant-ui adapter (covers LangChain/LangGraph via lib) (NEW, optional)
├── react-copilotkit/        @mpilot/react-copilotkit   # CopilotKit adapter (covers AG-UI: LangGraph/CrewAI/Mastra/Pydantic AI) (NEW, optional)
├── ui/                      @mpilot/ui                 # brand tokens (existing — keep)
└── sdk/                     @mpilot/sdk                # convenience meta-package re-exporting agent + tools + vercel-ai (existing — refactor as meta)
```

Total: **5 existing + 11 new packages** (or 16 total). Each framework adapter is 15-40 LOC. Each component adapter is 15-30 LOC. The framework-agnostic packages (`@mpilot/tools`, `@mpilot/agent`, `@mpilot/react`) carry the load; everything else is thin glue.

---

## Thread 5 — Generative UI (FIRM — three rails)

There are THREE distinct generative-UI rails mPilot can ship, each targeting a different host. They are NOT mutually exclusive; the recommendation is to ship all three with structured JSON as the load-bearing contract.

### Rail 1 — Vercel AI SDK `tool-${toolName}` UI message parts (web app)

Working in both pokaldot and kwala. The pattern (verified from `Blockchain-Oracle/portaldot-mcp/packages/web/components/app/chat-app.tsx`):

1. Backend: `streamText({ tools: { takeAction: tool({ inputSchema: z.object({...}), execute: async (args) => result }) } })` returns a UI message stream.
2. Client: `const { messages } = useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }) })`.
3. Render: `messages.map(m => m.parts.map(p => p.type === 'tool-takeAction' ? <TakeActionCard {...p.input} state={p.state} /> : ...))`.
4. Each tool part has a state: `input-streaming → input-available → output-available → output-error` (already named in `architecture.md` line 17).

**This rail is for the web app (`mpilot.xyz/app` + `mpilot.xyz/chat`).** Already in stack, half-spec'd. Missing: the package boundary (move components to `packages/react/`) + the hard rule (every mPilot tool ships with a paired card).

### Rail 2 — MCP Apps `ui://` resources (Claude Desktop, ChatGPT, Goose, VS Code Insiders)

**SEP-1865 merged into the MCP spec 2026-01-28.** Source: https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865. Reference impl: https://github.com/modelcontextprotocol/ext-apps + community SDK https://mcpui.dev/.

How it works:
- A tool result can include `_meta.ui.resourceUri = "ui://concierge/tick-card"`.
- The same MCP server registers a resource at that URI returning `text/html; profile=mcp-app` with embedded JS.
- The MCP host (Claude Desktop, ChatGPT, Goose, etc.) renders the HTML in a **sandboxed iframe**, bi-directional over JSON-RPC, instead of just showing JSON.

**Caveats:**
- Spec is `draft`, NOT yet in the 2025-11-25 stable spec. Spec / host behavior will shift before stable.
- No Anthropic first-party MCP server using this pattern yet. Community SDK (`mcp-ui`) is the de-facto reference.
- Don't bet the wedge on it. Ship as an opportunistic bonus.

**For mPilot: ship 3-4 `ui://concierge/*` resources** (tick-card, proposal-card, portfolio-snapshot, reputation-receipt). Even if some hosts don't render them, the structured JSON fallback works everywhere. The hosts that DO render iframes give us a **major demo "wow" inside the judge's existing Claude Desktop** — they don't have to leave their IDE.

### Rail 3 — MCP Elicitation (stable, ship it)

**Real and stable since 2025-06-18.** Source: https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation.

How it works:
- Server sends `elicitation/create` with a **flat JSON schema** (primitives only — string/number/boolean/enum, no nested objects/arrays).
- Client (Claude Desktop, etc.) renders a structured form for the user.
- User responds with `accept` / `decline` / `cancel`.

**For mPilot:** use for **high-value `execute()` confirmation** (e.g., any action above a user-set $ threshold, any session-key revoke, any policy change). Schema: `{ confirm: boolean, maxSlippageBps: number, justification: string }`. Replaces the need for a custom approval modal when the user is in Claude Desktop instead of the web app.

This is **strictly better** than relying on the LLM to "remember to ask" — Elicitation gives the user a structured form, not a free-text prompt.

### Recommendation across the three rails

| Surface | Rail | Contract |
|---|---|---|
| `mpilot.xyz/app` web app | Rail 1 (Vercel AI SDK tool parts) | `@mpilot/react-ui` cards per tool |
| Claude Desktop / ChatGPT / Goose | Rail 2 (MCP Apps `ui://` resources) | `packages/mcp/src/ui/*.html` per card |
| Any MCP host with elicitation support | Rail 3 (Elicitation) | Used for high-value confirmation flows |
| Any MCP host (fallback) | Structured JSON tool result | `structuredContent` + `outputSchema` per tool — **the load-bearing contract every rail builds on** |

### What's missing in the spec

- **The contract:** every mPilot tool MUST ship with (a) structured JSON via `outputSchema`, (b) a Vercel AI SDK card in `@mpilot/react-ui`, and (c) an optional `ui://` HTML resource for MCP Apps. Adopt pokaldot's hard rule extended to three rails.
- **The package boundary:** components currently live in `apps/web/components/`. Move to `packages/react/` + `packages/react-ui/` so consumers can install them.
- **The Elicitation story:** new story for replacing the auto-approval/manual-approval logic in the MCP server with Elicitation when the host supports it.

### Library survey (FIRM — agent-verified 2026-06-09)

| Library | Tool-binding API | Native runtimes | Headless? | npm weekly | License |
|---|---|---|---|---|---|
| **Vercel AI SDK** (`ai` + `@ai-sdk/react`) | Discriminated union on `messages.parts` — `case 'tool-getWeather':` with `part.state` ∈ `input-streaming`/`input-available`/`output-available`/`output-error`. No registry — pattern-match in JSX. | Vercel AI SDK canonical; any provider via `@ai-sdk/openai`/`@ai-sdk/anthropic`/etc. | Yes — primitive only, you bring components. | `ai` **14.2M** + `@ai-sdk/react` **5.6M** | Apache-2.0 |
| **assistant-ui** (`@assistant-ui/react`) | `defineToolkit({ getWeather: { type: "backend", render: ({ args, result, status }) => <Card/> }})` + `useAui({ tools: Tools({ toolkit }) })`. (`makeAssistantToolUI` deprecated.) | First-party adapters: `react-ai-sdk`, `react-langgraph`, `react-langchain`, `react-ag-ui`, `react-a2a`, `react-google-adk`, `react-opencode`. | Mixed — primitives headless, default `<Thread>` styled. | 932K | MIT |
| **CopilotKit** (`@copilotkit/react-ui` + `react-core`) | `useCopilotAction({ name, parameters, handler, render: ({ status, args, result }) => <Card/> })` or `useFrontendTool({…})` (v2). | AG-UI Protocol native: LangGraph, CrewAI, Mastra, Pydantic AI, AutoGen2, Microsoft Agent Framework. Also direct-to-LLM. | Has headless mode; default ships styled. | 201K | MIT |
| **Tambo** (`@tambo-ai/react`) | `TamboProvider` with `components: [{ name, description, component, propsSchema }]`. **Tambo runtime PICKS the component and synthesizes props** — not a 1:1 tool-call binding. | Tambo hosted runtime by default. | Styled defaults. | 7.3K | MIT |
| **Crayon / Thesys C1** (`@thesysdev/genui-sdk`) | `<C1Component c1Response={…} onAction={…}/>` renders a JSON UI spec from C1 API (model-driven layout from OpenAI-compatible endpoint). | C1 API. | Primitives headless; rendering model isn't. | 4.6K | MIT |

### Decision

**Primary primitive: Vercel AI SDK typed `tool-${name}` parts.** Already the pattern in `portaldot-mcp` + `kwala`. 25× larger weekly downloads than next contender. Zero styling opinion. Apache-2.0.

**Skip Tambo + Crayon.** Both are *model-driven* (LLM picks the component / model returns the UI spec), which contradicts the mPilot contract that *every mPilot tool ALWAYS renders the same card*. Mixing the paradigms would break the per-tool acceptance criteria pattern.

**Ship TWO optional adapter packages** for the runtime fan-out:

- **`@mpilot/react-assistant-ui`** — registers each mPilot tool as an assistant-ui backend toolkit entry: `defineToolkit({ propose: { type: "backend", render: ProposalPart }, … })`. Covers assistant-ui users AND (via the lib's `react-langgraph` / `react-langchain` adapters) LangChain/LangGraph users transitively. 7-15 LOC.
- **`@mpilot/react-copilotkit`** — exposes `useConciergeActions()` that registers our tools via `useCopilotAction({ name, render })`. Covers AG-UI users — which means LangGraph + CrewAI + Mastra + Pydantic AI + AutoGen2 + Microsoft Agent Framework users transitively via CopilotKit's runtime fan-out. 15-30 LOC.

### Install snippet for an external Vercel AI SDK dev

```bash
pnpm add @mpilot/sdk @mpilot/react @mpilot/react-ui ai @ai-sdk/react
```

```tsx
import { ProposalPart, TickPart, PortfolioPart, ReputationPart } from "@mpilot/react-ui";
import { useChat } from "@ai-sdk/react";

const { messages } = useChat({ api: "/api/concierge" });
{messages.flatMap(m => m.parts.map((p, i) => {
  switch (p.type) {
    case "tool-propose":        return <ProposalPart   key={i} part={p} />;
    case "tool-execute":        return <TickPart       key={i} part={p} />;
    case "tool-portfolio_read": return <PortfolioPart  key={i} part={p} />;
    case "tool-record":         return <ReputationPart key={i} part={p} />;
  }
}))}
```

Assistant-ui devs: `pnpm add @mpilot/react-assistant-ui` then `useAui({ tools: Tools({ toolkit: conciergeToolkit }) })`.
CopilotKit devs: `pnpm add @mpilot/react-copilotkit` then `useConciergeActions()` inside their `<CopilotKit>` provider.

### Unverified items

- **CopilotKit `useFrontendTool` vs `useCopilotAction`** — v2 docs reference both; verify against `@copilotkit/react-core/v2` source before shipping the adapter.
- **assistant-ui breaking-change cadence** — still 0.x (currently 0.14.15). Pin major; re-audit per release.
- **Crayon standalone (no C1 backend)** — undocumented; treat as out of scope until verified.

---

## Bonus — MVP-worthy features that raise win odds (recommendations, not yet decisions)

These came out of reading the reference repos + thinking about what Mantle Track 6 judges will reward.

1. **First-class Claude Code plugin (story-cdr ships an 11-skill plugin).** `packages/plugin/concierge/` — multiple skills (yield-optimizer, risk-monitor, attestation-viewer) auto-installed via `npx skills add Blockchain-Oracle/mpilot`. Already partially scoped by stories 150-154 but only as a single skill. **Suggest:** expand to 4-5 skills (one per major use case) so users compose their own bundle.
2. **Built-in chat UI in the MCP package.** Pokaldot ships `packages/web` alongside `packages/mcp` — the same tools render as a standalone chat at `localhost:3000`. Users who don't have Claude Code can still drive mPilot. Already in spec as `apps/web/app/chat/`? Verify and if not, add.
3. **Composability demo: chain with a public MCP** (e.g. Etherscan MCP, Defi Llama MCP, Telegram MCP). Same `07-mcp-server-pattern.md` §8.2 calls this out. Concrete demo: *"if my mPilot yield drops below 6%, mPilot messages me on Telegram and proposes a rebalance"* — orchestrated by Claude Code stitching our MCP + a Telegram MCP. **Judges love a multi-MCP demo.**
4. **Scaffolder.** `npm create concierge-app@latest` — CDR-Kit ships 9 templates. We could ship: `starter` (web + SDK quickstart), `mcp-only` (just the MCP), `react-embed` (drop our components into an existing app), `vercel-ai-agent` (a Vercel AI agent app pre-wired to mPilot), `langchain-agent`. **Drastically lowers integration cost** for other Mantle devs.
5. **Live tick stream embed for any agent's reputation page.** Public `<iframe>` or React embed showing the agent's last N attestations. Other dApps can include this to show "this agent runs on mPilot." Reputation as a network effect.
6. **One-click "fork this strategy" from a public agent page.** A judge sees an agent with great reputation; clicks "fork goal." Their own agent boots with the same goal. Viral mechanic.
7. **Adapter for the OpenAI Apps SDK (`apps.openai.com`).** If we ship a Vercel AI adapter, an OpenAI Apps adapter is ~50 lines. mPilot becomes installable inside ChatGPT custom GPTs / Apps. **Distribution beyond Claude.**

---

## Concrete proposed deliverables (if Abu approves the rework)

### ADR amendments
- **ADR-011**: stdio-first, hosted optional (full text above).
- **ADR-014 (new)**: `@mpilot/tools` source of truth (`ConciergeTool[]` shape verbatim per Thread 4) + 5 framework adapters (vercel-ai / openai / langchain / agentkit / goat) + 1 MCP adapter.
- **ADR-015 (new)**: `@mpilot/react` (headless) + `@mpilot/react-ui` (styled) component packages.
- **ADR-016 (new)**: Model-agnostic via Vercel AI SDK `LanguageModelV1` (replaces PRD line 54 deferral).
- **ADR-017 (new)**: Three-rail generative UI — Vercel AI SDK tool-parts (web) + MCP Apps `ui://` resources (Claude Desktop / ChatGPT / Goose) + MCP Elicitation (high-value confirms). Structured JSON via `outputSchema` is the load-bearing contract every rail builds on.

### PRD changes
- Line 17 (four surfaces) — promote SDK + components + MCP + skill to equal billing with the web app.
- Line 54 (multi-LLM deferral) — strike, replace with model-agnostic-via-V-AI-SDK statement.

### New / amended stories (story IDs preserved; new IDs in 2XX range)

**MCP rework**
- `story-130-mcp-server-bootstrap.md` — amend to factor out a transport-agnostic core into `packages/mcp/`; the Cloudflare Worker becomes a thin wrapper around the same core.
- `story-133-mcp-cloudflare-worker.md` — keep, but reframe as "hosted variant" not "the MCP."
- `story-136-mcp-stdio-publish.md` (NEW) — npm publish `@mpilot/mcp` as stdio; verify `claude mcp add concierge -- npx -y @mpilot/mcp` works end-to-end across Claude Code / Claude Desktop / Cursor / Windsurf / Goose.
- `story-137-mcp-apps-ui-resources.md` (NEW) — register 4 `ui://concierge/*` HTML resources (tick-card, proposal-card, portfolio-snapshot, reputation-receipt) following SEP-1865 + `mcp-ui` SDK. Verify rendering in Claude Desktop + Goose + VS Code Insiders.
- `story-138-mcp-elicitation.md` (NEW) — replace MCP-side approval logic with `elicitation/create` for actions exceeding the user-configured $ threshold; fall back to LLM-asked confirmation if host lacks elicitation support.

**Tools registry + framework adapters**
- `story-300-tools-registry.md` (NEW) — `@mpilot/tools`: `ConciergeTool` interface + `createConciergeTools(agent)` + `toJsonSchema(tool)` + bigint-safe stringify helper.
- `story-301-vercel-ai-adapter.md` (NEW)
- `story-302-langchain-adapter.md` (NEW)
- `story-303-openai-adapter.md` (NEW) — covers Anthropic raw tool-use too (same JSON Schema shape).
- `story-304-agentkit-adapter.md` (NEW) — `customActionProvider(ConciergeTool[])` wrapper.
- `story-205-goat-adapter.md` (NEW)

**Components / generative UI**
- `story-310-react-headless.md` (NEW) — `@mpilot/react`: tool-part components `<ProposalPart>`, `<TickPart>`, `<PortfolioPart>`, `<ReputationPart>` + hooks (`useTickStream`, `useProposal`, `useReputation`) + `<ConciergeProvider>`. Takes typed `tool-${name}` parts as props. ARIA, keyboard nav, state machines. Zero CSS.
- `story-311-react-ui-styled.md` (NEW) — `@mpilot/react-ui`: styled re-exports + cards (`<TickCard>`, `<ProposalCard>`, `<PortfolioCard>`, `<ReputationChart>`, `<EmergencyStop>`, `<GoalInput>`, `<MCPInstallSnippet>`).
- `story-312-web-dogfood-react-ui.md` (NEW) — rewrite `apps/web/app/app/` pages to consume `@mpilot/react-ui` directly. Removes duplication path.
- `story-313-react-assistant-ui.md` (NEW) — assistant-ui toolkit adapter.
- `story-314-react-copilotkit.md` (NEW) — CopilotKit `useConciergeActions()` adapter.

**Model-agnostic + ergonomics**
- `story-320-model-agnostic-provider.md` (NEW) — env auto-detect (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / `XAI_API_KEY`) + `CONCIERGE_AI_MODEL` override in `@mpilot/sdk` + `@mpilot/mcp` + `/api/chat`. Tick worker stays Anthropic.
- `story-330-scaffolder.md` (NEW) — `npm create concierge-app@latest` with 3-5 templates (starter / mcp-only / vercel-ai-agent / langchain-agent / react-embed).

**Total: 17 new stories.** Each is small (1-2 PR-units). ~16% increase in story count for a meaningful architectural pivot.

---

## What I am NOT recommending

- **Killing the Cloudflare Workers hosted MCP.** Keep it as the "URL-paste" optional rail. Cost is one extra deploy target.
- **Dropping the Anthropic Claude Agent SDK from the tick worker.** Stay Anthropic-specific in the autonomous loop; users don't see it.
- **Building a whole-new component framework.** Vercel AI SDK's tool-parts pattern is good enough and already in stack. Don't add Tambo / Crayon unless Agent B's survey says we need it.
- **Coupling the MCP server to the web app deploy.** Keep `apps/web/` and `packages/mcp/` independent; the MCP must run without a web app reachable.

---

## Open / pending external research

**All three background research agents returned 2026-06-09:**
- **Agent A (Claude Desktop / MCP gen UI)** → MCP Apps SEP-1865 merged 2026-01-28 (draft spec, optional rail); Elicitation stable since 2025-06-18 (ship it). Integrated in Thread 5.
- **Agent B (gen-UI library survey)** → Vercel AI SDK wins primary; ship `@mpilot/react-assistant-ui` + `@mpilot/react-copilotkit` as optional adapters. Skip Tambo + Crayon. Integrated in Thread 5.
- **Agent C (cross-runtime adapter pattern)** → CDR-Kit shape verified code-line; mirror exactly + borrow AgentKit's `supportsNetwork`. Integrated in Thread 4.

### Unverified items to confirm at integration time

- **MCP Apps client capability negotiation** in current Claude Desktop build (2026-06-09). The blog post (2026-01-26) says "available today on web and desktop" but Agent A couldn't re-test against the user's specific build. Mitigation: structured JSON fallback works regardless.
- **GOAT SDK zod major alignment.** CDR-Kit comments that GOAT 0.5 was on a different zod major. Verify current GOAT zod peer before writing the adapter; if aligned, drop the `as unknown as` cast.
- **MCP SDK API surface drift.** `@modelcontextprotocol/sdk` `registerTool` API has churned twice in 2025. CDR-Kit pins to spec `2025-11-25`. Pin mPilot's version explicitly before publishing.
- **Vercel AI SDK v5 vs v6 peer pin.** Both CDR-Kit and AgentKit use `tool({ inputSchema, execute })` — v5+ shape. Pin `ai >= 5` in `@mpilot/vercel-ai`'s peerDeps; consider `>= 6` since pokaldot uses v6.

---

## Process notes for next iteration

1. **Memory patch:** Abu's CLAUDE.md rule *"Quality > deadline; no mocks in the hot path; no half-built features"* applies here — this rework adds ~12 stories with 6 days to deadline. Pacing per `feedback_no_deadline_pressure.md`: quality over clock. If we don't ship all 12, we ship the firm ones (Thread 1, 2, 4 packages) and document the rest as v1.1.

2. **PR review gate** — `pr-review-toolkit:review-pr` MUST fire on every package's first PR, since these are NEW surfaces with their own contracts (npm publish has supply-chain risk).

3. **Cross-project pattern to memorize:** the **`@<scope>/tools` + N-adapters + `@<scope>/react` (headless) + `@<scope>/react-ui` (styled) + stdio-default `@<scope>/mcp`** shape is now confirmed across THREE of Abu's shipped repos (cdr-kit, pokaldot, kwala). Worth saving as `feedback_multi_surface_package_layout.md` for future hackathon projects.

---

*Author: Claude Opus 4.7. Inputs: primary-source reads of `/Users/abu/dev/hackathon/{pokaldot,kwala,story-cdr}` + `mantel/research/concierge/` + `mantel/docs/`. External research in 3 parallel background agents (pending). No spec files patched — synthesis only, per Abu's brief.*
