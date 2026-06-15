# Story — Agent runtime integration tests (end-to-end tick)

**ID:** story-70-runtime-integration-tests
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-67-tick-phase-record, story-68-bullmq-cron-worker
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** mPilot maintainer
**I want to** end-to-end integration tests verify a full agent tick from BullMQ cron firing → plan → simulate → propose → execute → record → ERC-8004 attestation on-chain, against a Mantle Sepolia Anvil fork with a real Postgres test container and Redis
**So that** the agent runtime's 6 phases compose correctly under realistic conditions before any tick fires on Mainnet

---

## File modification map

- `packages/runtime/src/__tests__/e2e/fullTick.test.ts` — NEW — end-to-end: register agent → issue session key → schedule cron → fire one tick → assert it produced an executions row + attestation
- `packages/runtime/src/__tests__/e2e/noOpTick.test.ts` — NEW — agent with healthy position + no policy violations → tick returns NOOP early; no executions row created
- `packages/runtime/src/__tests__/e2e/manualApprovalTick.test.ts` — NEW — large action ($100) triggers requiresApproval=true → tick pauses at propose phase; user approves via API → next tick runs execute + record
- `packages/runtime/src/__tests__/e2e/spreadInversionRefusal.test.ts` — NEW — set MockAaveOracle to make susdeYield < usdcBorrow → tick's plan returns 'unwind' intent; simulate confirms; propose creates proposal; tick handles the refuse-new-borrow path
- `packages/runtime/src/__tests__/e2e/concurrentTickGuard.test.ts` — NEW — fire 2 ticks for the same agent simultaneously; assert one returns `skipped: 'already_running'`
- `packages/runtime/src/__tests__/e2e/attestationFailureRetry.test.ts` — NEW — execute succeeds but attest fails (simulate by pausing the ReputationRegistry) → executions row is inserted without attestationUid → BullMQ retry job fires → attestation lands → executions row updated with attestationUid
- `packages/runtime/src/__tests__/e2e/setup.ts` — NEW — spawns Anvil fork + Postgres test container + Redis test container + deploys mocks + seeds agent + sets up worker process
- `packages/runtime/vitest.config.ts` — NEW — `pool: 'forks'`, 120s timeout (e2e tests are slow)

---

## Acceptance criteria (BDD)

```
Given Vitest is configured
When `pnpm --filter @mpilot/agent run test:e2e` runs
Then exit code is 0 AND ≥ 10 e2e test cases pass

Given test_e2e_FullTick
When a single tick runs against the fork with a fresh agent + healthy carry
Then phases run in order, executions row is created, attestationUid is populated, structured logs include all 6 phases

Given test_e2e_NoOpTick
When tick runs with no actionable state
Then result is { phase: 'plan', noop: true } AND no executions row is created AND structured log shows plan duration only

Given test_e2e_ManualApprovalTick
When a $100 action is proposed
Then tick pauses at propose phase; the proposal row has requiresApproval=true; calling the approval API → status='approved' → next tick runs execute + record successfully

Given test_e2e_SpreadInversionRefusal
When carry is inverted (oracle set to invert susde vs usdc rates)
Then the plan's intent is 'unwind' OR 'noop' (depending on current debt) AND no new borrow is proposed

Given test_e2e_ConcurrentTickGuard
When 2 ticks fire for the same agentId at the same time
Then ONE returns { skipped: 'already_running' } (Redis NX lock held by the other)

Given test_e2e_AttestationFailureRetry
When execute succeeds but attest fails (simulated by ReputationRegistry being paused)
Then executions.attestationUid is null after first tick AND a BullMQ retry job is queued AND on retry the attestation lands AND attestationUid is updated

Given coverage gate
When `pnpm --filter @mpilot/agent run test --coverage` runs
Then line coverage on `src/` ≥ 85%

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every test file ≤ 400 LOC
```

---

## Shell verification

```bash
# Run e2e tests
pnpm --filter @mpilot/agent run test:e2e --reporter=verbose
test $? -eq 0

pnpm --filter @mpilot/agent run test:e2e --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 10 {exit 0} {exit 1}'

# Critical load-bearing tests
for tn in "FullTick" "NoOpTick" "ManualApprovalTick" "ConcurrentTickGuard" "AttestationFailureRetry"; do
  pnpm --filter @mpilot/agent run test:e2e --reporter=verbose 2>&1 | grep "$tn" | grep -q "✓" || { echo "missing $tn"; exit 1; }
done

# Coverage ≥ 85%
cov=$(pnpm --filter @mpilot/agent run test --coverage 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 85

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **120s timeout** because spinning up Anvil + Postgres container + Redis container + deploying mocks + executing a full tick is slow. The actual tick should complete in ~10-15s; the rest is setup overhead.
- **Each test gets fresh infrastructure** via `setup.ts` — no shared state across tests. Vitest's `--pool=forks` ensures isolation.
- **`ConcurrentTickGuard`** test is the critical regression guard for Redis NX lock from story-62. Without it, a future bug where the lock TTL is too short could let double-executions slip through silently. Test verifies via direct race condition.
- **`AttestationFailureRetry`** test verifies the recovery path for the verifiability claim. Per CLAUDE.md ADR-004: attestation MUST eventually land for every Mainnet execution. The retry mechanism is what makes this guarantee actually hold under real-world bundler/RPC flakiness.
- **`SpreadInversionRefusal`** test is the explicit verification of the agent's refuse-new-borrow logic. Catches regressions in the carry calculation (story-34 getCarryVsAave). Without this, a future provider change could silently make the agent ignore inverted spreads.
- **Postgres test container** via `@testcontainers/postgresql` — spawns a fresh Postgres instance per test suite. Slow but ISOLATED — no shared state means no flaky tests.
- **Redis test container** same pattern.
- **Coverage gate at 85%** for runtime because this is where the wedge lives. Higher than provider coverage (80%) because runtime errors propagate everywhere.
- Cross-ref: `research/concierge/04-agent-runtime.md` § 6 risks + guardrails (every test maps to one risk).
