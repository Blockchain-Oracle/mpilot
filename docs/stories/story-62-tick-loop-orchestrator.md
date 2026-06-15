# Story — `tick(agentId)` orchestrator (Redis NX lock + 6-phase sequencing)

**ID:** story-62-tick-loop-orchestrator
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-60-anthropic-sdk-bootstrap, story-69-postgres-drizzle-schemas
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** Concierge BullMQ worker
**I want to** a single `tick(agentId)` function orchestrates the 6-phase agent run with a Redis NX lock to prevent double-runs across worker processes, structured logging at each phase, and clean fall-through when a phase returns NOOP
**So that** the tick loop is the canonical entry point for agent execution — testable as a unit, observable in structured logs, and safe under concurrent worker scaling

---

## File modification map

- `packages/runtime/package.json` — NEW — peer deps + workspace deps on `@mpilot/sdk`, `@mpilot/llm`, all 7 providers, `@mpilot/smart-account`, `@mpilot/shared`, `drizzle-orm`, `ioredis`, `pino`
- `packages/runtime/src/index.ts` — NEW — barrel exports
- `packages/runtime/src/tick.ts` — NEW — `tick(agentId: string): Promise<TickResult>`. Sequence: acquire Redis NX lock (`lock:agent:${agentId}` with 60s TTL) → loadState → runPhase('plan') → if NOOP return early → runPhase('simulate') → if NOT OK return early → runPhase('propose') → if requiresApproval return early (awaiting user) → runPhase('execute') → runPhase('record') → release lock → return result. Each phase wrapped in try/catch; phase failure breaks the chain (NEVER silently continues to next phase). Pino structured logging per phase with `agentId`, `phase`, `tickId`, `durationMs`.
- `packages/runtime/src/lock.ts` — NEW — Redis NX lock helpers: `acquireLock(key, ttlMs)`, `releaseLock(key)`. Uses `ioredis` `SET key value NX EX ttl`. Returns boolean for acquireLock (true = acquired, false = already held).
- `packages/runtime/src/state.ts` — NEW — `loadAgentState(agentId)` reads from Postgres: agent record, current goal/policy, recent ticks (last 5 for context), open positions. Returns typed AgentState object.
- `packages/runtime/src/types.ts` — NEW — `TickResult`, `TickPhase`, `Plan`, `Sim`, `Proposal`, `Exec`, `Attestation`, `AgentState`
- `packages/runtime/src/__tests__/tick.test.ts` — NEW — unit tests with mocked phase functions: assert phase sequencing, NOOP early-return, NOT-OK early-return, lock contention behavior

---

## Acceptance criteria (BDD)

```
Given tick is called for a fresh agent
When the function runs
Then it acquires `lock:agent:${agentId}` in Redis with 60s TTL AND runs phases in order: plan → simulate → propose → (decide is out-of-loop) → execute → record

Given plan returns NOOP
When tick continues
Then it returns `{ phase: 'plan', noop: true }` early WITHOUT running simulate/propose/execute/record

Given simulate returns NOT OK
When tick continues
Then it returns `{ phase: 'simulate', error: sim.error }` early WITHOUT running propose/execute/record

Given propose requires user approval
When tick continues
Then it returns `{ phase: 'propose', awaiting: proposal.id }` early WITHOUT running execute (the user approval triggers a separate `executeApprovedProposal` flow)

Given two workers call tick(sameAgentId) simultaneously
When both reach the Redis acquireLock call
Then ONE succeeds and the other returns `{ skipped: 'already_running' }` (NOT both run; no double-execute on the same agent)

Given the lock was acquired
When the function returns or throws
Then the lock is released in a finally block (no orphan lock blocking next tick)

Given a phase throws an unexpected error
When tick continues
Then it returns `{ phase: '<failedPhase>', error: <typed-error> }` AND structured log entry includes the agentId + phase + error stack

Given tick result for a successful execute
When the record phase completes
Then the result includes attestationUid (from ERC-8004) and the full chain is structured-logged

Given the lock TTL expires before tick completes (60s isn't enough)
When subsequent ticks come in
Then they succeed because the lock auto-expired (graceful degradation; no permanent block)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/runtime
test -f package.json
test -f src/tick.ts
test -f src/lock.ts
test -f src/state.ts
test -f src/types.ts

cd ../..

pnpm --filter @mpilot/agent run build
test $? -eq 0
pnpm run typecheck

# Phase sequence enforced
grep -q "plan" packages/runtime/src/tick.ts
grep -q "simulate" packages/runtime/src/tick.ts
grep -q "propose" packages/runtime/src/tick.ts
grep -q "execute" packages/runtime/src/tick.ts
grep -q "record" packages/runtime/src/tick.ts

# Redis NX lock
grep -qE "(SET.*NX|setNX|setnx)" packages/runtime/src/lock.ts

# finally block for lock release
grep -q "finally" packages/runtime/src/tick.ts

# Unit tests pass
pnpm --filter @mpilot/agent run test 2>&1 | grep "tick" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Redis NX lock is non-negotiable.** Per `research/concierge/04-agent-runtime.md` § 3: BullMQ runs ticks across multiple worker processes; without the lock, two workers could tick the same agent simultaneously and double-execute actions (e.g., supply 100 USDC twice). The lock is the safety belt.
- **60s lock TTL** matches the default tick cadence. If a tick legitimately takes longer (Mainnet congestion), the lock auto-expires and a new tick can fire — but the in-flight tick keeps running; its writes are idempotent at the DB level (UPSERT on `ticks.id`) so no corruption.
- **Phase sequencing is strict** — never call execute() before propose() returns approved. Each phase is a checkpoint; the runtime can pause-and-resume between any two phases by serializing AgentState to Postgres.
- **NOOP from plan() is a valid outcome.** Per `research/concierge/04-agent-runtime.md` § 3: the agent may decide nothing needs doing this tick. Return early; don't waste tokens running simulate/propose for nothing.
- **Pino structured logs per phase**: `{ agentId, tickId, phase, durationMs, status: 'ok' | 'error' | 'noop', ...metadata }`. Critical for observability — the worker process emits a single log line per phase that can be queried via SQL.
- **Phase failure breaks the chain.** Per CLAUDE.md no-silent-failures: if simulate throws, the runtime does NOT skip ahead to propose. It returns the error and the next tick re-tries.
- **`decide` is out-of-loop** — user approval happens off-tick. The runtime checks the proposal's approval status at the next tick; if approved within window, executes; if expired, re-plans. Don't put decide inside tick().
- Cross-ref: `research/concierge/04-agent-runtime.md` § 3 (the canonical pseudocode), ADR-009 (Postgres + Redis state).
