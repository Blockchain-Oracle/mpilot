# Story — Anthropic SDK bootstrap (Sonnet/Opus/Haiku model routing + prompt caching)

**ID:** story-60-anthropic-sdk-bootstrap
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-22-sdk-skeleton
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge tick-loop runtime
**I want to** an `@concierge/llm` package wraps `@anthropic-ai/sdk` + `@anthropic-ai/claude-agent-sdk` with phase-specific model routing (Sonnet 4.6 default, Opus 4.7 for hard reasoning, Haiku 4.5 for recap) and prompt caching enabled by default
**So that** per-tick LLM cost is minimized + reasoning quality scales with phase complexity without each tick-phase file re-implementing model selection logic

---

## File modification map

- `packages/llm/package.json` — NEW — peer deps + workspace deps + `@anthropic-ai/sdk` (pinned to current minor) + `@anthropic-ai/claude-agent-sdk` (pinned)
- `packages/llm/src/index.ts` — NEW — barrel exports
- `packages/llm/src/client.ts` — NEW — `createLlmClient({ apiKey })` returns an `Anthropic` client configured with prompt caching enabled (`anthropic-beta: prompt-caching-2024-07-31` header set explicitly even if SDK handles it — for clarity)
- `packages/llm/src/models.ts` — NEW — model constants: `MODEL_SONNET = 'claude-sonnet-4-6'`, `MODEL_OPUS = 'claude-opus-4-7'`, `MODEL_HAIKU = 'claude-haiku-4-5-20251001'`. Per ADR-006 + memory[currentDate]. Plus `routeModelForPhase(phase: TickPhase): Model` returning Sonnet/Opus/Haiku per phase (plan→Sonnet, simulate→Sonnet, propose→Sonnet, decide→Opus when risk-flagged else Sonnet, execute→Sonnet, record→Haiku)
- `packages/llm/src/cache.ts` — NEW — helpers for prompt-caching markers on stable prefix content (system prompt, tool schemas). Per `research/concierge/04-agent-runtime.md` § 2.2 prompt caching for the tick loop.
- `packages/llm/src/types.ts` — NEW — `TickPhase` enum, `LlmCallContext`, `CompletionResult` types
- `packages/llm/src/__tests__/models.test.ts` — NEW — unit tests: routeModelForPhase returns the right model per phase; risk-flagged decide phase routes to Opus
- `packages/llm/src/__tests__/cache.test.ts` — NEW — unit tests: cache-control markers are inserted on the right content blocks (last block of stable prefix)

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @concierge/llm run build` runs
Then exit code is 0

Given createLlmClient is called with valid apiKey
When the function runs
Then it returns an Anthropic client with `defaultHeaders['anthropic-beta']` containing 'prompt-caching'

Given MODEL_SONNET is exported
When introspected
Then it equals 'claude-sonnet-4-6'

Given MODEL_OPUS is exported
When introspected
Then it equals 'claude-opus-4-7'

Given routeModelForPhase('plan')
Then returns MODEL_SONNET

Given routeModelForPhase('decide', { riskFlagged: true })
Then returns MODEL_OPUS

Given routeModelForPhase('record')
Then returns MODEL_HAIKU

Given cache-control insertion
When called with a system prompt of 6000 tokens + tool schemas of 4000 tokens
Then the last content block of the system prompt has `cache_control: { type: 'ephemeral' }` AND the last block of the tools array has the same marker

Given prompt caching is enabled
When two consecutive messages with the same stable prefix are sent within 5 minutes
Then the second response includes `usage.cache_read_input_tokens > 0` (the cache was hit)

Given the apiKey is missing
When createLlmClient is called without apiKey
Then it throws MissingEnvVar('ANTHROPIC_API_KEY')

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/llm
test -f package.json
test -f src/client.ts
test -f src/models.ts
test -f src/cache.ts

cd ../..

pnpm --filter @concierge/llm run build
test $? -eq 0
pnpm run typecheck

# Anthropic SDKs pinned
node -e "
  const pkg = require('./packages/llm/package.json');
  for (const dep of ['@anthropic-ai/sdk', '@anthropic-ai/claude-agent-sdk']) {
    const v = pkg.dependencies?.[dep] ?? pkg.peerDependencies?.[dep];
    if (!v) { console.error('Missing dep:', dep); process.exit(1); }
    if (v.startsWith('^') || v.startsWith('~')) { console.error('Unpinned:', dep, v); process.exit(1); }
  }
"

# Model constants correct
grep -q "claude-sonnet-4-6" packages/llm/src/models.ts
grep -q "claude-opus-4-7" packages/llm/src/models.ts
grep -q "claude-haiku-4-5-20251001" packages/llm/src/models.ts

# Tests pass
pnpm --filter @concierge/llm run test
test $? -eq 0

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Model routing per ADR-006**: Sonnet 4.6 is the default workhorse (fast + cheap enough for every tick phase). Opus 4.7 reserves for high-stakes reasoning (the `decide` phase when risk flagged, e.g., > $50 action). Haiku 4.5 for the `record` summarization phase (boring + repetitive).
- **Prompt caching is the single biggest cost lever.** Per `research/concierge/04-agent-runtime.md` § 2.2: the system prompt + tool schemas + policy doc will be 6-10k tokens; caching them drops per-tick cost by ~10× at the cache-hit rate Claude advertises. The 5-minute cache TTL aligns with our 60s tick cadence, so cache stays hot tick-to-tick.
- **`cache_control: { type: 'ephemeral' }`** marker goes on the LAST content block of the stable prefix. Up to 4 cache breakpoints supported per request — leave 3 for future flexibility (e.g., per-agent custom prompts). Reference: Anthropic SDK docs.
- **Pin SDK versions** — no `^` or `~`. Anthropic SDK has had breaking changes between minors; pinning prevents silent breakage on `pnpm install`.
- **Don't route Haiku to anything risky.** Haiku is the recap model only. Decision logic NEVER uses Haiku because it's not consistent enough for tool-use loops.
- **The `riskFlagged` parameter** comes from the propose phase's simulation output (e.g., HF would drop below 1.5, or amountUSD > policy.opusEscalationThreshold). Default false.
- **No streaming in this story** — streaming wiring lives in story-61 (the Vercel AI SDK chat surface). This package is for the non-streaming tick-loop API calls.
- Cross-ref: ADR-006 (model routing), `research/concierge/04-agent-runtime.md` § 2 Claude Agent SDK, CLAUDE.md model versions (Sonnet 4.6 / Opus 4.7 are current per memory).
