# Story — `plan()` tick phase (read-only LLM decision; returns Plan)

**ID:** story-63-tick-phase-plan
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-62-tick-loop-orchestrator
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge tick orchestrator
**I want to** a `runPhase('plan', state)` function calls Claude Sonnet 4.6 with a phase-scoped read-only toolset (get_state, get_yields, get_loan_terms, get_carry_vs_aave, get_health_factor) and a single phase-system-prompt segment, returning either `{ intent: 'noop' }` or `{ intent: 'rebalance' | 'top_up_reserve' | 'pay_lender' | 'unwind', hypothesis, suggestedActions[] }`
**So that** the agent's decision-making is observable, phase-scoped (no execute tools available in plan), and the LLM cannot hallucinate actions it doesn't have read context for

---

## File modification map

- `packages/runtime/src/phases/plan.ts` — NEW — `runPlan(state: AgentState): Promise<Plan>`. Internally: builds the plan-phase system prompt (Concierge identity + hard rules + "you are in the PLAN phase, you may only call read tools, no execute"), assembles read-only toolset from provider selectors (NOT the full executable actions), calls `llm.streamText({ model: routeModelForPhase('plan'), tools, system, messages, stopWhen: stepCountIs(3) })`. Parses LLM JSON output via Zod schema validation.
- `packages/runtime/src/phases/planTools.ts` — NEW — read-only tool definitions composed from provider selectors: `get_state` (from runtime state.ts), `get_yields_susde`, `get_carry_vs_aave`, `get_health_factor`, `get_reserve_data`, `get_aave_user_account_data`. NO supply, borrow, swap, bridge, attest — those are for execute phase only.
- `packages/runtime/src/phases/planSchema.ts` — NEW — Zod schema for the Plan output: `Plan { intent: enum, hypothesis: string, suggestedActions: ActionDescriptor[] }`. ActionDescriptor is { providerName, actionName, args } — descriptive, not executable.
- `packages/runtime/src/phases/__tests__/plan.test.ts` — NEW — unit tests with mocked LLM: assert phase-scoped toolset (no execute tools), NOOP return path, malformed LLM output handling

---

## Acceptance criteria (BDD)

```
Given runPlan is called with a state where carry is positive and HF > 1.5
When the LLM determines no action needed
Then it returns `{ intent: 'noop', hypothesis: <reasoning string> }` (NOOP is the most common outcome; explicit return)

Given a state where carry has inverted (susdeYield < usdcBorrow)
When runPlan runs
Then the returned Plan has `intent: 'unwind'` AND suggestedActions includes a borrow-repay action descriptor

Given runPlan's toolset
When inspected via the LLM call's tools parameter
Then it contains ONLY read tools (no 'supply', 'borrow', 'swap', 'bridge' present)

Given the LLM returns malformed JSON (not matching the Plan Zod schema)
When runPlan parses it
Then it throws `PlanSchemaViolation({ rawOutput, zodErrors })` (NOT silently coerces)

Given `stopWhen: stepCountIs(3)` is set
When the LLM tries to chain a 4th tool call
Then it stops; the plan phase is read-only and shouldn't need more than 3 read steps

Given the LLM call respects model routing
When runPlan is called
Then the model is MODEL_SONNET (per routeModelForPhase('plan'))

Given the system prompt explicitly forbids execute tools
When the LLM tries to call a 'supply' tool that isn't in the toolset
Then the runtime catches it (tool name not registered) AND the plan returns `intent: 'noop'` with an audit log entry noting the attempted hallucination

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/runtime
test -f src/phases/plan.ts
test -f src/phases/planTools.ts
test -f src/phases/planSchema.ts

cd ../..

pnpm --filter @concierge-mantle/agent run build
test $? -eq 0

# Tools in plan phase are read-only
bun -e "
  import { planTools } from './packages/runtime/src/phases/planTools.ts';
  const banned = ['supply','borrow','repay','withdraw','swap','bridge','wrapToSusde','attestAction'];
  for (const fn of banned) {
    if (planTools[fn]) { console.error('Execute tool leaked into plan phase:', fn); process.exit(1); }
  }
"

# stepCountIs(3)
grep -q "stepCountIs(3)" packages/runtime/src/phases/plan.ts

# Sonnet model
grep -q "MODEL_SONNET" packages/runtime/src/phases/plan.ts

# Tests pass
pnpm --filter @concierge-mantle/agent run test 2>&1 | grep "plan" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Phase-scoped toolsets are critical.** Per `research/concierge/04-agent-runtime.md` § 3: narrow toolsets per phase dramatically reduce wrong-tool hallucinations. If the LLM doesn't have a `supply` tool in plan phase, it cannot hallucinate calling it. This is the single biggest leverage point for reliability.
- **NOOP is the default expected outcome.** Most ticks should return NOOP because the agent's state doesn't usually need an action. Per Anthropic's tool-use patterns: the LLM is more reliable returning "nothing to do" than confabulating reasons to act.
- **`stopWhen: stepCountIs(3)`** because plan should be a quick reasoning chain (read state → read yields → conclude). If it tries to chain 4+ reads, something's off — fail fast.
- **Zod schema validation on LLM output** prevents silent malformed-output bugs. Strict schema → typed error → audit log → next tick re-tries. Reference: `feedback_audits_can_be_wrong.md` — silent data validation failures bite hardest.
- **Sonnet 4.6 model routing.** Plan is high-volume but not high-stakes; Sonnet is the right tier per ADR-006.
- **Phase system prompt is appended to base prompt.** Format: "You are in the PLAN phase. You have access to read tools only. Return one of: {intent: 'noop'} OR {intent: 'rebalance' | 'top_up_reserve' | ..., hypothesis, suggestedActions}."
- **`hypothesis` is a string explaining the reasoning** — surfaces in the UI proposal card so users understand why the agent wants to act. Don't skip; it's the trust primitive.
- Cross-ref: `research/concierge/04-agent-runtime.md` § 3 phase table.
