# Story — `@mpilot/openai` adapter (covers OpenAI Chat Completions AND Anthropic raw tool-use)

**ID:** story-303-openai-adapter
**Epic:** Epic E13 — Composable Primitive
**Depends on:** story-300-tools-registry
**Estimate:** ~30min
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** developer using OpenAI Chat Completions directly (or Anthropic Messages API raw tool-use)
**I want to** call `getOpenAITools(agent)` and get `{ tools, dispatch }` ready for either runtime
**So that** I can drop Concierge tools into my custom agent loop without an SDK layer between me and the LLM API

---

## File modification map

- `packages/openai/package.json` — NEW — ESM-only; NO runtime dep on `openai` or `@openai/agents` (stale per audit §7); peer dep on `zod`
- `packages/openai/src/index.ts` — NEW — `getOpenAITools(agent): { tools: OpenAITool[]; dispatch: (name: string, args: string | object) => Promise<unknown> }`
- `packages/openai/src/__tests__/index.test.ts` — NEW — ≥ 6 cases including Anthropic Messages format compatibility check
- `packages/openai/README.md` — NEW — TWO quickstart sections: OpenAI Chat Completions + Anthropic Messages

---

## Acceptance criteria (BDD)

```
Given `getOpenAITools(mockAgent)` runs
When the result is inspected
Then it is `{ tools: OpenAITool[], dispatch }` where each tool is `{ type: 'function', function: { name, description, parameters } }` with `parameters` being valid OpenAPI 3 JSON Schema

Given dispatch is called with `dispatch('proposeAction', '{"asset":"USDC","amount":100}')`
When the args are JSON-parseable
Then it routes to the underlying ConciergeTool.invoke()

Given dispatch is called with object args (not string)
When `dispatch('proposeAction', { asset: 'USDC', amount: 100 })` runs
Then it works (handles both string and object args)

Given a tool result is returned for Anthropic Messages API format
When the consumer passes the tools array to `{ tools: getOpenAITools(agent).tools }` in an Anthropic Messages call
Then the SAME JSON Schema works (cross-runtime — verified per AUDIT-2026-06-09 §7)

Given typecheck + build + tests
When `pnpm --filter @mpilot/openai build && pnpm --filter @mpilot/openai test` runs
Then ≥ 6 cases pass and exit 0
```

---

## Shell verification

```bash
test -f packages/openai/package.json
test -f packages/openai/src/index.ts

# Anti-regression: NO @openai/agents dep (stale per AUDIT §7)
! node -e "const p = require('./packages/openai/package.json'); if (p.dependencies?.['@openai/agents'] || p.devDependencies?.['@openai/agents']) process.exit(1);"

# Anti-regression: NO openai SDK dep (we emit raw JSON Schema; consumer brings their own client)
! node -e "const p = require('./packages/openai/package.json'); if (p.dependencies?.openai) process.exit(1);"

pnpm --filter @mpilot/openai build
pnpm --filter @mpilot/openai test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 6 {exit 0} {exit 1}'
```

---

## Notes for coding agent

Implementation (verbatim from architecture.md ADR-014):

```typescript
import { createConciergeTools, toJsonSchema } from '@mpilot/tools';
import type { ConciergeAgent } from '@mpilot/agent';

export function getOpenAITools(agent: ConciergeAgent) {
  const conciergeTools = createConciergeTools(agent);
  const byName = new Map(conciergeTools.map(t => [t.name, t]));

  const tools = conciergeTools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: toJsonSchema(t),
    },
  }));

  return {
    tools,
    dispatch: async (name: string, args: string | object) =>
      byName.get(name)!.invoke(typeof args === 'string' ? JSON.parse(args) : args),
  };
}
```

~15 LOC. Same JSON Schema shape works for BOTH OpenAI Chat Completions (`tools: [{ type: 'function', function: {...} }]`) AND Anthropic Messages API raw tool-use (`tools: [{ name, description, input_schema }]` — slight key renames the consumer handles, but the schema CONTENT is identical). One adapter, two runtimes.

Cross-ref: ADR-014, AUDIT-2026-06-09 §7 (OpenAI Agents dropped).
