# Story — `@mpilot/vercel-ai` adapter

**ID:** story-301-vercel-ai-adapter
**Epic:** Epic E13 — Composable Primitive
**Depends on:** story-300-tools-registry
**Estimate:** ~30min
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** developer building on Vercel AI SDK (`ai` v6)
**I want to** `pnpm add @mpilot/vercel-ai @mpilot/sdk` and call `getVercelAITools(agent)` to get a `ToolSet` ready to drop into `streamText({ tools: ... })`
**So that** my AI SDK app has all 30+ Concierge tools in 3 lines

---

## File modification map

- `packages/vercel-ai/package.json` — NEW — ESM-only per ADR-018, peer deps on `ai ^6`, `zod`, runtime dep on `@mpilot/tools` workspace
- `packages/vercel-ai/src/index.ts` — NEW — exports `getVercelAITools(agent: ConciergeAgent): Record<string, ReturnType<typeof tool>>`
- `packages/vercel-ai/src/__tests__/index.test.ts` — NEW — ≥ 6 cases
- `packages/vercel-ai/README.md` — NEW — 3-line quickstart

---

## Acceptance criteria (BDD)

```
Given `getVercelAITools(mockAgent)` runs
When the result is inspected
Then it is `Record<string, Tool>` with one entry per `@mpilot/tools` tool AND each entry has `inputSchema`, `description`, `execute` matching Vercel AI SDK v6's `tool()` shape

Given the result is passed to `streamText({ tools: result })`
When the LLM emits a tool call for `proposeAction`
Then `execute(args)` runs and returns the resolved value from `t.invoke(args)`

Given a tool with `outputSchema` defined
When the AI SDK consumer accesses `tool-proposeAction` in their `messages.parts` and uses `InferUITools`
Then the inferred output type matches the tool's `z.infer<outputSchema>`

Given the package builds + tests + typecheck
When `pnpm --filter @mpilot/vercel-ai build && pnpm --filter @mpilot/vercel-ai test && pnpm typecheck` runs
Then all exit 0 with ≥ 6 cases passing
```

---

## Shell verification

```bash
test -f packages/vercel-ai/package.json
test -f packages/vercel-ai/src/index.ts
test -f packages/vercel-ai/README.md

# ai is PEER not runtime
node -e "
  const p = require('./packages/vercel-ai/package.json');
  if (p.dependencies?.ai) process.exit(1);
  if (!p.peerDependencies?.ai?.startsWith('^6')) process.exit(2);
"

# Tests + build
pnpm --filter @mpilot/vercel-ai build
pnpm --filter @mpilot/vercel-ai test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 6 {exit 0} {exit 1}'

# Anti-regression: do NOT add `dispatch` to this adapter (that's OpenAI's pattern, not Vercel AI SDK's)
! grep -E "dispatch" packages/vercel-ai/src/index.ts
```

---

## Notes for coding agent

Implementation (verbatim from architecture.md ADR-014):

```typescript
import { tool as aiTool } from 'ai';
import { createConciergeTools, type ConciergeTool } from '@mpilot/tools';
import type { ConciergeAgent } from '@mpilot/agent';

export function getVercelAITools(agent: ConciergeAgent) {
  return Object.fromEntries(
    createConciergeTools(agent).map(t => [t.name, aiTool({
      description: t.description,
      inputSchema: t.inputSchema,
      outputSchema: t.outputSchema,  // load-bearing per ADR-014
      execute: (args) => t.invoke(args),
    })])
  );
}
```

~15 LOC. The `outputSchema` field is what powers `InferUITools` typing for the consumer's `messages.parts.find(p => p.type === 'tool-proposeAction')?.output` autocomplete.

Cross-ref: ADR-014, SDK-DX-STUDY-2026-06-09 §H, AUDIT-2026-06-09 §1 (Vercel AI SDK v6 `tool({ description, inputSchema, outputSchema, execute })` verified).
