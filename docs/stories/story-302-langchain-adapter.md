# Story — `@concierge/langchain` adapter

**ID:** story-302-langchain-adapter
**Epic:** Epic E13 — Composable Primitive
**Depends on:** story-300-tools-registry
**Estimate:** ~30min
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** developer with a LangChain JS agent
**I want to** `pnpm add @concierge/langchain @concierge/sdk` and call `getLangChainTools(agent)` to get `StructuredToolInterface[]`
**So that** my LangChain agent has all Concierge actions composable into its existing toolset

---

## File modification map

- `packages/langchain/package.json` — NEW — ESM-only; peer deps on `@langchain/core ^1`, `zod`; runtime dep on `@concierge/tools`
- `packages/langchain/src/index.ts` — NEW — `getLangChainTools(agent: ConciergeAgent): StructuredToolInterface[]`
- `packages/langchain/src/__tests__/index.test.ts` — NEW — ≥ 5 cases
- `packages/langchain/README.md` — NEW — 3-line quickstart

---

## Acceptance criteria (BDD)

```
Given `getLangChainTools(mockAgent)` runs
When the result is inspected
Then it is `StructuredToolInterface[]` with one tool per @concierge/tools entry AND each has `name`, `description`, `schema` (zod), `invoke`/`call` method

Given the result is passed to a LangChain `Runnable.bindTools(result)`
When the model emits a tool call for `proposeAction`
Then the LangChain runtime calls `invoke(args)` which routes to `t.invoke(args)` from @concierge/tools

Given a tool returns a JSON-serializable object
When the LangChain tool's wrapper receives it
Then the output is JSON-stringified (LangChain's contract is string-returning tool execs)

Given typecheck + build + tests
When `pnpm --filter @concierge/langchain build && pnpm --filter @concierge/langchain test` runs
Then ≥ 5 cases pass and exit 0
```

---

## Shell verification

```bash
test -f packages/langchain/package.json
test -f packages/langchain/src/index.ts

node -e "
  const p = require('./packages/langchain/package.json');
  if (p.dependencies?.['@langchain/core']) process.exit(1);  // PEER not runtime
  if (!p.peerDependencies?.['@langchain/core']?.startsWith('^1')) process.exit(2);
"

pnpm --filter @concierge/langchain build
pnpm --filter @concierge/langchain test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 5 {exit 0} {exit 1}'
```

---

## Notes for coding agent

Implementation (verbatim from architecture.md ADR-014):

```typescript
import { tool as lcTool } from '@langchain/core/tools';
import { createConciergeTools } from '@concierge/tools';
import type { ConciergeAgent } from '@concierge/agent';

export function getLangChainTools(agent: ConciergeAgent) {
  return createConciergeTools(agent).map(t =>
    lcTool(
      async (args) => JSON.stringify(await t.invoke(args)),
      { name: t.name, description: t.description, schema: t.inputSchema }
    )
  );
}
```

~10 LOC. JSON.stringify the output because LangChain's tool wrapper expects a string return (vs Vercel AI SDK's any). Cross-ref: ADR-014, SDK-DX-STUDY §H.
