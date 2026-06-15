# Story — Docs agent loop deep dive (each phase explained + live state machine)

**ID:** story-172-docs-agent-loop-deepdive
**Epic:** Epic E10 — Docs Site
**Depends on:** story-171-docs-concept-overview
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** developer evaluating Concierge's runtime architecture
**I want to** a deep-dive doc covers each tick phase (plan, simulate, propose, decide, execute, record) with: phase input/output types, phase-scoped toolset, LLM model used, expected duration, failure modes, recovery semantics
**So that** I can answer "what happens if the simulate phase reverts?" or "which model handles plan?" from the docs alone — no reading code required

---

## File modification map

- `apps/web/content/docs/concepts/phases/plan.mdx` — NEW — plan phase deep dive
- `apps/web/content/docs/concepts/phases/simulate.mdx` — NEW — simulate phase deep dive
- `apps/web/content/docs/concepts/phases/propose.mdx` — NEW — propose phase deep dive
- `apps/web/content/docs/concepts/phases/decide.mdx` — NEW — decide phase (off-tick user approval) deep dive
- `apps/web/content/docs/concepts/phases/execute.mdx` — NEW — execute phase deep dive
- `apps/web/content/docs/concepts/phases/record.mdx` — NEW — record phase deep dive (ERC-8004 attestation)
- `apps/web/content/docs/concepts/phases/_meta.tsx` — NEW — section nav
- `apps/web/components/docs/PhaseStateMachine.tsx` — NEW — live React Flow diagram of the phase state machine (showing transitions, conditions, recovery paths)
- `apps/web/components/docs/__tests__/PhaseStateMachine.test.tsx` — NEW — RTL test

---

## Acceptance criteria (BDD)

```
Given each phase page
When read
Then it includes: phase purpose, input type, output type, LLM model (or "no LLM" for execute), tools available (scoped subset), expected duration, failure modes table

Given the plan phase page
When inspected
Then it explicitly states: model = Sonnet 4.6, tools = read-only (no execute tools), output = Plan with intent enum

Given the decide phase page
When inspected
Then it makes clear: decide is OFF-TICK (user approval happens between propose and execute) AND when riskFlagged, model escalates to Opus 4.7

Given the record phase page
When inspected
Then it explains: ERC-8004 attestation is non-blocking for the executions row, retry on failure, never silent

Given the state machine diagram
When rendered
Then it shows all phase transitions including: NOOP early-return, simulate failure, propose-awaiting-approval, execute timeout, record retry

Given each failure mode is documented
When the failure-modes table is inspected
Then it includes: failure type, what happens, recovery action, observability hint (e.g., "look for `phase_error` in Pino logs")

Given the docs link to the source code
When clicking "view source for runPlan()"
Then the link target is the GitHub permalink to packages/runtime/src/phases/plan.ts (NOT a hash-less link that drifts)

Given file size budget per MDX file
When inspected
Then no phase deep-dive page exceeds 250 lines
```

---

## Shell verification

```bash
cd apps/web/content/docs/concepts/phases
for phase in plan simulate propose decide execute record; do
  test -f $phase.mdx || { echo "missing $phase.mdx"; exit 1; }
done

cd ../../../../../..

pnpm --filter @mpilot/web run build
test $? -eq 0

# Each phase doc mentions its load-bearing model + scoping
grep -q "Sonnet" apps/web/content/docs/concepts/phases/plan.mdx
grep -q "Opus" apps/web/content/docs/concepts/phases/decide.mdx
grep -q "read-only" apps/web/content/docs/concepts/phases/plan.mdx
grep -q "ERC-8004" apps/web/content/docs/concepts/phases/record.mdx

# Tests pass
pnpm --filter @mpilot/web run test 2>&1 | grep "PhaseStateMachine" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Each phase page = one source of truth** for that phase. If a developer wants to understand "what does propose do?", this page tells them everything they need without grepping the source.
- **Phase-scoped toolset is the critical detail** for plan vs execute. Plan has read-only tools (by architectural design — prevents hallucinations); execute has the action tools. State this loudly per page.
- **Failure-modes table** is the most-consulted part of the docs at debug time. Be explicit: what error you'll see, what's actually wrong, what to do about it. Maps to the runtime's typed errors.
- **GitHub permalinks** (with commit hash) — `github.com/.../blob/<hash>/packages/runtime/src/phases/plan.ts`. NOT `blob/main/...` because main drifts and breaks the link. Use a build-time helper that fetches the current commit hash.
- **React Flow for the state machine diagram** is the canonical lib (reactflow.dev). Interactive: click a node to see the phase details; click a transition to see the condition.
- **The decide phase is special** — it's OFF-TICK (user action between propose and execute). Document this clearly per `research/concierge/04-agent-runtime.md` § 3: many devs will assume decide runs inside tick() and be confused when it doesn't.
- **Cross-link generously** to story-176 SDK reference (function signatures) and story-175 tutorials (end-to-end examples).
- Cross-ref: `research/concierge/04-agent-runtime.md` § 3 (phase table), stories 63-67 (phase implementations).
