# Story — `@mpilot/react-assistant-ui` adapter

**ID:** story-313-react-assistant-ui
**Epic:** Epic E14 — Composable UI
**Depends on:** story-310-react-headless
**Estimate:** ~45min
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** developer using `@assistant-ui/react` for my chat UI
**I want to** `pnpm add @mpilot/react-assistant-ui` and call `getConciergeToolkit()` to register mPilot cards as `defineToolkit` backend tools
**So that** my assistant-ui chat instantly renders mPilot proposal/tick/portfolio cards without me building any glue

---

## File modification map

- `packages/react-assistant-ui/package.json` — NEW — ESM-only; peer deps on `@assistant-ui/react ^0.14`, `react`, `@mpilot/react`
- `packages/react-assistant-ui/src/index.ts` — NEW — `getConciergeToolkit()` returns assistant-ui `Toolkit` registering each mPilot card via `defineToolkit({ proposeAction: { type: 'backend', render: ProposalPart }, ... })`
- `packages/react-assistant-ui/src/__tests__/index.test.ts` — NEW — ≥ 5 cases
- `packages/react-assistant-ui/README.md` — NEW — quickstart

---

## Acceptance criteria (BDD)

```
Given `getConciergeToolkit()` runs
When the result is inspected
Then it is a `Toolkit` with one entry per mPilot card (proposal, tick, portfolio, reputation) AND each is `{ type: 'backend', render: <PartComponent> }`

Given a consumer does `useAui({ tools: Tools({ toolkit: getConciergeToolkit() }) })`
When the LLM emits a `tool-proposeAction` part
Then assistant-ui renders the mPilot `<ProposalPart>` component automatically

Given API name verification
When grep runs for `makeAssistantToolUI`
Then NO match (that API was deprecated; we use `defineToolkit` per AUDIT §9)

Given typecheck + build + tests
When `pnpm --filter @mpilot/react-assistant-ui build && pnpm --filter @mpilot/react-assistant-ui test` runs
Then ≥ 5 cases pass
```

---

## Shell verification

```bash
test -f packages/react-assistant-ui/src/index.ts
node -e "
  const p = require('./packages/react-assistant-ui/package.json');
  if (!p.peerDependencies?.['@assistant-ui/react']?.startsWith('^0.14')) process.exit(1);
"

# Anti-regression: deprecated API not used
! grep -rE "makeAssistantToolUI" packages/react-assistant-ui/src/

pnpm --filter @mpilot/react-assistant-ui build
pnpm --filter @mpilot/react-assistant-ui test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 5 {exit 0} {exit 1}'
```

---

## Notes for coding agent

Implementation:

```typescript
import { defineToolkit } from '@assistant-ui/react';
import { ProposalPart, TickPart, PortfolioPart, ReputationPart } from '@mpilot/react';

export function getConciergeToolkit() {
  return defineToolkit({
    proposeAction: { type: 'backend', render: ProposalPart },
    executeTick:   { type: 'backend', render: TickPart },
    portfolioRead: { type: 'backend', render: PortfolioPart },
    recordAttestation: { type: 'backend', render: ReputationPart },
  });
}
```

~15 LOC. Pin `@assistant-ui/react` to `^0.14` minor (still 0.x, breaking changes per audit). Covers assistant-ui users + LangGraph + LangChain users transitively (via assistant-ui's `react-langgraph` / `react-langchain` adapters). Cross-ref: ADR-015, AUDIT-2026-06-09 §9.
