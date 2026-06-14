# Story — `@concierge-mantle/react-copilotkit` adapter (covers AG-UI / LangGraph / CrewAI / Mastra / Pydantic AI)

**ID:** story-314-react-copilotkit
**Epic:** Epic E14 — Composable UI
**Depends on:** story-310-react-headless
**Estimate:** ~45min
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** developer using CopilotKit / AG-UI Protocol (which transitively covers LangGraph, CrewAI, Mastra, Pydantic AI, AutoGen2, MS Agent Framework)
**I want to** `pnpm add @concierge-mantle/react-copilotkit` and call `useConciergeActions()` inside my `<CopilotKit>` provider
**So that** all Concierge cards register as CopilotKit frontend tools and render automatically when the agent emits them

---

## File modification map

- `packages/react-copilotkit/package.json` — NEW — ESM-only; peer deps on `@copilotkit/react-core ^1.59`, `react`, `@concierge-mantle/react`
- `packages/react-copilotkit/src/useConciergeActions.tsx` — NEW — hook calling `useCopilotAction` (or `useFrontendTool` v2 — pin at impl time per AUDIT §10) for each Concierge card
- `packages/react-copilotkit/src/__tests__/useConciergeActions.test.tsx` — NEW — ≥ 5 cases (renderHook)
- `packages/react-copilotkit/README.md` — NEW — quickstart

---

## Acceptance criteria (BDD)

```
Given a React tree with `<CopilotKit>` provider
When `useConciergeActions()` is called inside a descendant
Then `useCopilotAction` (or `useFrontendTool`) is called for each Concierge card: proposeAction, executeTick, portfolioRead, recordAttestation

Given the agent emits a tool call for `proposeAction`
When CopilotKit's runtime resolves the registered action
Then ProposalPart from @concierge-mantle/react is rendered with the args + result

Given API naming decision
When the impl is reviewed
Then it pins consistently to one of `useCopilotAction` or `useFrontendTool` (NOT both) AND the README explains the pin decision per AUDIT §10

Given typecheck + build + tests
When `pnpm --filter @concierge-mantle/react-copilotkit build && pnpm --filter @concierge-mantle/react-copilotkit test` runs
Then ≥ 5 cases pass and exit 0
```

---

## Shell verification

```bash
test -f packages/react-copilotkit/src/useConciergeActions.tsx

node -e "
  const p = require('./packages/react-copilotkit/package.json');
  if (!p.peerDependencies?.['@copilotkit/react-core']?.startsWith('^1.59')) process.exit(1);
"

# Verify a single API path is used (not mixed)
useCopilotAction_count=$(grep -rE "useCopilotAction\b" packages/react-copilotkit/src/ | wc -l)
useFrontendTool_count=$(grep -rE "useFrontendTool\b" packages/react-copilotkit/src/ | wc -l)
if [ "$useCopilotAction_count" -gt 0 ] && [ "$useFrontendTool_count" -gt 0 ]; then
  echo "ERROR: both APIs used; pin to one"
  exit 1
fi

pnpm --filter @concierge-mantle/react-copilotkit build
pnpm --filter @concierge-mantle/react-copilotkit test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 5 {exit 0} {exit 1}'
```

---

## Notes for coding agent

Implementation skeleton:

```typescript
'use client';
import { useCopilotAction /* OR useFrontendTool */ } from '@copilotkit/react-core';
import { ProposalPart, TickPart, PortfolioPart, ReputationPart } from '@concierge-mantle/react';

export function useConciergeActions() {
  useCopilotAction({
    name: 'proposeAction',
    description: 'Show a Concierge proposal card with Approve/Reject/Edit',
    parameters: [/* derived from @concierge-mantle/tools ConciergeTool inputSchema */],
    render: (args, result, status) => <ProposalPart part={{ /* mapped */ }} />,
  });
  useCopilotAction({ name: 'executeTick', /* ... */ });
  useCopilotAction({ name: 'portfolioRead', /* ... */ });
  useCopilotAction({ name: 'recordAttestation', /* ... */ });
}
```

~30 LOC. Cross-runtime via AG-UI Protocol — CopilotKit transitively bridges to LangGraph + CrewAI + Mastra + Pydantic AI + AutoGen2 + Microsoft Agent Framework. Read `@copilotkit/react-core@1.59.5` source before pinning `useCopilotAction` vs `useFrontendTool` (audit §10 flagged this).

Cross-ref: ADR-015, AUDIT-2026-06-09 §10, SPEC-REWORK-BRIEF Thread 5.
