# Story — Vercel AI SDK chat API endpoint (`/api/chat` with tool registration)

**ID:** story-61-vercel-ai-sdk-chat-api
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-60-anthropic-sdk-bootstrap, **story-300-tools-registry** (AMENDED 2026-06-09), **story-301-vercel-ai-adapter**, **story-320-model-agnostic-provider**

---

## ⚠️ 2026-06-09 UPDATE — read this BEFORE the original story body

Per AUDIT-2026-06-09 §1 + architecture.md ADR-016/017:

- `ai` is on **v6**, not v5. `@ai-sdk/react` is on **v3**. Verified npm latest 2026-06-08.
- Tool definitions require **`outputSchema`** (load-bearing for `tool-${name}` UI parts + MCP `structuredContent` + `@concierge/react-ui` parse-then-render).
- Model is supplied via `model: LanguageModelV2` from `defaultModel()` (story-320) — NOT a hardcoded Anthropic client.
- Tools sourced from `@concierge/vercel-ai`'s `getVercelAITools(agent)` (story-301), NOT hand-registered per-provider in `apps/web/lib/chat/tools.ts`.
- The original story's per-provider `tools: { actionName: tool({...}) }` aggregation is OBSOLETE — replace with `tools: getVercelAITools(agent)`.
- Cross-ref: stories 300, 301, 320; ADRs 014, 016, 017.

### Updated file modification map

- `apps/web/app/api/chat/route.ts` — UPDATE — `model: defaultModel()` + `tools: getVercelAITools(agent)` + `stopWhen: stepCountIs(8)`. ~15 LOC total.
- `apps/web/lib/chat/tools.ts` — DELETE — replaced by `@concierge/vercel-ai`'s exported function.

---

**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge user
**I want to** the web app's chat surface streams an Anthropic Claude response with all 7 providers' actions registered as tools, four UI states (`input-streaming`, `input-available`, `output-available`, `output-error`) wired through to React components
**So that** when I message "supply 100 USDC to Aave", the agent picks the right tool, the simulation streams in real time, and the proposal card renders mid-response

---

## File modification map

- `apps/web/app/api/chat/route.ts` — NEW — Next.js App Router POST handler. Uses Vercel AI SDK `streamText` + `tool()` definitions + `convertToModelMessages` + `stopWhen: stepCountIs(8)` (multi-step tool loop cap)
- `apps/web/lib/chat/tools.ts` — NEW — registers all 7 providers' actions as Vercel AI SDK tools. Imports each provider's `tool()` definitions from `@concierge/<provider>` packages and combines into a single `ChatTools` ToolSet. Type via `InferUITools<typeof tools>` so the React side gets typed tool-part rendering.
- `apps/web/lib/chat/systemPrompt.ts` — NEW — exports the Concierge system prompt template per `research/concierge/04-agent-runtime.md` § 2.3 system prompt skeleton, with the hard rules + tool availability injected dynamically per user/agent
- `apps/web/lib/chat/types.ts` — NEW — `ChatMessage` typed via `UIMessage<never, UIDataTypes, ChatTools>`
- `apps/web/lib/chat/auth.ts` — NEW — bearer-token + Privy session auth for the chat endpoint (reuses Privy server SDK from the app's existing setup)

---

## Acceptance criteria (BDD)

```
Given /api/chat receives a POST with valid auth
When `messages: [{ role: 'user', content: 'supply 100 USDC to Aave' }]` is sent
Then the response streams in SSE format (`x-vercel-ai-ui-message-stream: v1`)
AND the stream includes a `tool-supply` part transitioning through input-streaming → input-available → output-available

Given the chat endpoint
When the request lacks bearer token / Privy session
Then it returns 401 (NOT 200 with empty stream)

Given `stopWhen: stepCountIs(8)` is set
When an LLM loop attempts a 9th tool call
Then the runtime stops without executing it (no runaway loops)

Given `tools` is the combined ToolSet
When iterated
Then it includes tools from ALL 7 providers (e.g., 'supply', 'borrow', 'swap', 'wrapToSusde', 'bridge', 'attestAction', 'getBalance', etc.) — counted via `Object.keys(tools).length >= 28` (7 providers × ~4 actions each minimum)

Given a tool execution fails
When the underlying provider throws a typed error
Then the streamed part transitions to `output-error` with `errorText` populated (NOT silently swallowed)

Given the system prompt
When rendered with `{ providers: ['aave', 'lifi', ...] }` context
Then it lists the available action surfaces inline (the LLM knows what's wired)

Given the multi-step loop cap
When the LLM produces a multi-step sequence ending with a non-tool-call response
Then stopWhen is honored and the assistant response is returned

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f app/api/chat/route.ts
test -f lib/chat/tools.ts
test -f lib/chat/systemPrompt.ts

cd ../..

pnpm --filter @concierge/web run build
test $? -eq 0
pnpm run typecheck

# stopWhen cap is set
grep -q "stepCountIs(8)" apps/web/app/api/chat/route.ts

# All 7 providers registered
for prov in aave-v3-mantle mantle-dex ethena-susde ondo-usdy meth-staking lifi-bridge erc8004; do
  grep -q "@concierge/$prov" apps/web/lib/chat/tools.ts || { echo "missing provider import: $prov"; exit 1; }
done

# Auth gate
grep -qE "(return new Response|status: 401)" apps/web/app/api/chat/route.ts

# Tests pass
pnpm --filter @concierge/web run test 2>&1 | grep "chat" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Vercel AI SDK 6 pattern** per `research/concierge/04-agent-runtime.md` § 1.1: `tools = { actionName: tool({ description, inputSchema: z.object(...), execute: async (args) => {...} }) } satisfies ToolSet`. Each provider exports its tools — combine here.
- **Four UI states** per `research/concierge/04-agent-runtime.md` § 1.2: `input-streaming`, `input-available`, `output-available`, `output-error`. React components in story-108 switch on `part.state` to render correctly. The API endpoint produces these states automatically through `streamText`; no manual emit needed.
- **`stopWhen: stepCountIs(8)`** caps multi-step tool loops. Per ADR-006 (token budget) + research/concierge/04-agent-runtime.md § Risks. Without it, an LLM loop could chain 50 tool calls and blow the per-tick budget.
- **`systemPrompt.ts`** is the canonical Concierge system prompt. Edits here propagate to every chat session. Reference: `research/concierge/04-agent-runtime.md` § 2.3 — the hard rules + tool inventory + agent identity all live here.
- **Auth**: bearer token (worker process calling /api/chat from within the cluster) OR Privy session cookie (browser). Both paths supported; auth gate fails fast for unauthenticated requests with 401.
- **Hobby plan SSE timeout is 25s**, Pro is 60s. The chat surface is interactive (short responses); the autonomous tick loop runs out-of-band (story-62, BullMQ worker on Fly.io). Don't conflate.
- Cross-ref: `research/concierge/04-agent-runtime.md` § 1 Vercel AI SDK 6, ADR-002.
