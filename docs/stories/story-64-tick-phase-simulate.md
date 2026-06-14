# Story — `simulate()` tick phase (dry-run via `eth_call` + delta state computation)

**ID:** story-64-tick-phase-simulate
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-62-tick-loop-orchestrator, story-30-aave-v3-mantle-provider, story-32-mantle-dex-provider
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge tick orchestrator
**I want to** a `runPhase('simulate', plan)` function dry-runs the plan's suggested actions via `eth_call` (or Tenderly bundle simulation if configured), computes the predicted delta state (HF before/after, balance changes, slippage), and refuses if simulation reverts
**So that** the agent NEVER submits a tx that would revert on-chain (wasted gas, MEV exposure) and the propose phase has accurate predicted outcomes to show the user

---

## File modification map

- `packages/runtime/src/phases/simulate.ts` — NEW — `runSimulate(plan: Plan, state: AgentState): Promise<Sim>`. For each suggestedAction in plan, builds the tx calldata via the provider's `simulate()` selector (provider has the ABI encoding logic), calls viem `publicClient.simulateContract({ ... })`, captures `result` + `gasUsed`. Aggregates delta state across all actions. Returns `{ ok: boolean, gasUsed: bigint, deltaState: DeltaState, error?: SimError }`.
- `packages/runtime/src/phases/deltaState.ts` — NEW — `computeDeltaState({ preState, simResults })` returns predicted `{ healthFactorBefore, healthFactorAfter, balanceDeltas: Record<token, bigint>, debtDeltas: Record<token, bigint>, oracleChecks: { stale: boolean } }`. Used by propose phase to render the "before/after" comparison in the UI.
- `packages/runtime/src/phases/__tests__/simulate.test.ts` — NEW — unit tests with viem testClient: simulate a supply → assert deltaState; simulate a revert path (oracle stale, HF would break) → assert ok=false + error captured

---

## Acceptance criteria (BDD)

```
Given runSimulate is called with a plan containing 1 supply action against a fork
When the simulation runs
Then it returns { ok: true, gasUsed: > 0n, deltaState: { balanceDeltas: { USDC: -100e6 }, healthFactorBefore, healthFactorAfter } }

Given runSimulate where the action would revert (e.g., insufficient collateral for borrow)
When the eth_call returns revert
Then result is { ok: false, error: { revertReason, action } } (NEVER throws — captured for the propose phase to surface)

Given runSimulate where multiple actions in the plan
When the simulation runs sequentially with intermediate state updates
Then deltaState reflects the cumulative effect (assert: sum of individual deltas equals deltaState totals)

Given runSimulate's first action reverts
When it processes the rest of the plan
Then it returns ok=false EARLY (don't waste time simulating downstream actions when the first one fails); error.failedAtIndex captured

Given the oracle is stale (mock the oracle to return stale data)
When runSimulate checks oracleChecks
Then deltaState.oracleChecks.stale === true AND ok === false (refuse to act on stale prices per ADR-008)

Given HF would drop below the user's floor (1.5 default)
When runSimulate checks deltaState
Then ok === false with error indicating WouldBreakHealthFactor

Given gas estimation
When the simulation succeeds
Then gasUsed is captured AND > 0 AND less than block gas limit (sanity bound)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/runtime
test -f src/phases/simulate.ts
test -f src/phases/deltaState.ts

cd ../..

pnpm --filter @concierge-mantle/agent run build
test $? -eq 0

# Tests pass
pnpm --filter @concierge-mantle/agent run test 2>&1 | grep "simulate" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **`eth_call` is the canonical dry-run path.** For Mantle Mainnet ticks, `eth_call` against the live state is sufficient. Tenderly bundle simulation is an upgrade for multi-tx atomic simulations; v1 uses sequential `eth_call`. Reference: `research/concierge/04-agent-runtime.md` § 3 simulate row.
- **Sequential simulation with intermediate state** — for plans with multiple actions, the second action's simulation must reflect the first action's effects. Use viem's `simulateContract` with `stateOverride` to inject the first action's predicted balance changes.
- **NEVER throw on revert** — capture as `{ ok: false, error }`. The propose phase needs the structured error to render a meaningful "would have failed because X" message to the user.
- **Early-exit on first revert** saves time. If supply reverts, no point simulating the borrow that depends on the supply.
- **Oracle staleness check** is per ADR-008 + `research/concierge/03-providers/aave-v3-mantle.md` § Oracle latency. If the Aave Oracle reverts (composite stale), simulate should set `oracleChecks.stale = true` AND `ok = false`. Per CLAUDE.md no-silent-failures.
- **`computeDeltaState` is pure compute** — no chain reads beyond what simulate captured. Lets the propose phase iterate on "what if we did N less USDC?" without burning RPC calls.
- **HF floor check** is post-simulation: read the user's policy floor from AgentState, compare to deltaState.healthFactorAfter. If below, ok=false. Per `research/concierge/03-providers/aave-v3-mantle.md` § HF mechanic.
- Cross-ref: `research/concierge/04-agent-runtime.md` § 3 (simulate row), ADR-008 (oracle), `feedback_audits_can_be_wrong.md` (silent failure prevention).
