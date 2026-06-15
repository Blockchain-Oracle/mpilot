# Story — `@mpilot/agentkit` adapter (Coinbase AgentKit, `customActionProvider` path)

**ID:** story-304-agentkit-adapter
**Epic:** Epic E13 — Composable Primitive
**Depends on:** story-300-tools-registry
**Estimate:** ~30min
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** developer using Coinbase AgentKit
**I want to** call `getConciergeActionProvider(agent)` and drop the result into my AgentKit `agentKitFromWallet(...).withActionProviders([...])` chain
**So that** Concierge tools are first-class actions in my AgentKit agent without decorator/class boilerplate

---

## File modification map

- `packages/agentkit/package.json` — NEW — ESM-only; peer deps on `@coinbase/agentkit ^1`, `zod`
- `packages/agentkit/src/index.ts` — NEW — `getConciergeActionProvider(agent): ActionProvider` using `customActionProvider`
- `packages/agentkit/src/__tests__/index.test.ts` — NEW — ≥ 5 cases
- `packages/agentkit/README.md` — NEW — quickstart explaining customActionProvider escape hatch

---

## Acceptance criteria (BDD)

```
Given `getConciergeActionProvider(mockAgent)` runs
When the result is inspected
Then it is a valid AgentKit ActionProvider with `getActions()` method returning an Action array

Given the returned ActionProvider is used in `agentKit.withActionProviders([conciergeProvider])`
When the agent invokes a Concierge action by name
Then the action's `invoke(args)` routes to `ConciergeTool.invoke()` from @mpilot/tools

Given decorator anti-pattern check
When grep runs against packages/agentkit/src/
Then NO @CreateAction decorator usage AND NO `class extends ActionProvider` AND NO `reflect-metadata` import

Given typecheck + build + tests
When `pnpm --filter @mpilot/agentkit build && pnpm --filter @mpilot/agentkit test` runs
Then ≥ 5 cases pass and exit 0
```

---

## Shell verification

```bash
test -f packages/agentkit/package.json
test -f packages/agentkit/src/index.ts

# Anti-regression: NO decorator path (per audit + DX study)
! grep -rE "@CreateAction" packages/agentkit/src/
! grep -rE "reflect-metadata" packages/agentkit/src/
! grep -rE "class\s+\w+\s+extends\s+ActionProvider" packages/agentkit/src/

# Anti-regression: NO dep on stale @coinbase/agentkit-* framework extensions
! node -e "
  const p = require('./packages/agentkit/package.json');
  for (const dep of Object.keys(p.dependencies || {})) {
    if (dep.startsWith('@coinbase/agentkit-')) process.exit(1);
  }
"

pnpm --filter @mpilot/agentkit build
pnpm --filter @mpilot/agentkit test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 5 {exit 0} {exit 1}'
```

---

## Notes for coding agent

Implementation (verbatim from architecture.md ADR-014):

```typescript
import { customActionProvider } from '@coinbase/agentkit';
import { createConciergeTools } from '@mpilot/tools';
import type { ConciergeAgent } from '@mpilot/agent';

export function getConciergeActionProvider(agent: ConciergeAgent) {
  return customActionProvider(
    createConciergeTools(agent).map(t => ({
      name: t.name,
      description: t.description,
      schema: t.inputSchema,
      invoke: async (args) => JSON.stringify(await t.invoke(args)),
    }))
  );
}
```

~12 LOC. **`customActionProvider` is the ESCAPE HATCH** from AgentKit's documented-but-burdensome `@CreateAction` decorator + class hierarchy path. Concierge takes the escape hatch because:
- No `reflect-metadata` import
- No `experimentalDecorators: true` in tsconfig
- No class hierarchy required
- Identical to the shape we use for Vercel AI SDK / LangChain / OpenAI adapters

CDR-Kit, Pokaldot, Kwala all use this path. Cross-ref: ADR-014, AUDIT-2026-06-09 §5 (AgentKit framework extensions abandoned; core is active; escape hatch confirmed), SDK-DX-STUDY §H.
