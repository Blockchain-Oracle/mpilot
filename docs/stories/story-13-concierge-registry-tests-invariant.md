# Story — ConciergeRegistry invariant tests (state-machine integrity)

**ID:** story-13-concierge-registry-tests-invariant
**Epic:** Epic E1 — Smart Contracts
**Depends on:** story-11-concierge-registry-tests-unit
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** invariant tests prove that no sequence of calls (in any order) can violate the registry's state-machine invariants
**So that** liveness + safety properties hold even under adversarial action sequences the unit/fuzz tests don't enumerate

---

## File modification map

- `contracts/test/invariant/ConciergeRegistryInvariant.t.sol` — NEW — `forge-std/StdInvariant.sol`-based invariant test. `setUp()` deploys the proxy, deploys a handler, and `targetContract(handler)` so Foundry's invariant fuzzer drives action sequences through it.
- `contracts/test/invariant/handlers/ConciergeRegistryHandler.sol` — NEW — handler contract that exposes `registerAgent_h`, `updateGoal_h`, `updatePolicy_h`, `transferAgent_h`, `setActive_h`, `pause_h`, `unpause_h`. Each handler function bound-checks inputs (no out-of-domain rejections that just waste runs), tracks ghost variables (`ghost_totalRegistered`, `ghost_activeCount`, `ghost_ownersPerAgent`), and may legitimately revert (the invariant must still hold over post-revert state).
- `contracts/foundry.toml` — UPDATE — `[invariant]` section: `runs = 256`, `depth = 32` (32 calls per run), `fail_on_revert = false` (handler may revert; invariants are checked on resulting state).

---

## Acceptance criteria (BDD)

```
Given the invariant test file + handler exist
When `forge test --match-contract ConciergeRegistryInvariantTest -vvv` runs
Then ≥ 6 invariant functions pass, all running 256 × 32 = 8192 call sequences

Given invariant_NextAgentIdMonotonicallyIncreasing
When any sequence of calls runs
Then `registry.nextAgentId() >= ghost_totalRegistered + 1` at all times (no gaps in id allocation)

Given invariant_NoOrphanedAgents
When any sequence of calls runs
Then for every agentId in [1, nextAgentId), `agents[id].owner != address(0)` (every minted id has a real owner — no zeroed-out records)

Given invariant_OwnerMappingsConsistent
When any sequence of calls runs
Then for every agentId, `agentsByOwner(agents[id].owner)` contains id (the reverse mapping is never stale)

Given invariant_ActiveCountMatchesGhost
When any sequence of calls runs
Then the on-chain count of `active == true` agents equals `ghost_activeCount` (no silent state drift between setActive and storage)

Given invariant_PausedStateRestored
When pause+unpause toggles randomly in a sequence
Then the contract is never permanently locked — every pause is followed (within depth) by an unpause OR the sequence ends in paused state with all mutations correctly reverted

Given invariant_PolicyBytesSizeRespected
When any sequence of updatePolicy calls runs
Then no stored `agents[id].policyData.length > 4096` (the cap holds even under adversarial sequences)

Given invariant runs complete
When `forge test --match-contract ConciergeRegistryInvariantTest --invariant-runs 256 --invariant-depth 32` runs
Then exit code is 0 and no invariant property is violated across all 8192 sequences
```

---

## Shell verification

```bash
cd contracts

# Invariant tests pass with default config
forge test --match-contract ConciergeRegistryInvariantTest -vvv 2>&1 | grep -E "\[PASS\]" | wc -l | awk '$1 >= 6 {exit 0} {exit 1}'

# No failures
forge test --match-contract ConciergeRegistryInvariantTest 2>&1 | grep -E "\[FAIL\]" | wc -l | awk '$1 == 0 {exit 0} {exit 1}'

# Higher run count (1000) still green
forge test --match-contract ConciergeRegistryInvariantTest --invariant-runs 1000 --invariant-depth 32 2>&1 | grep -E "\[FAIL\]" | wc -l | awk '$1 == 0 {exit 0} {exit 1}'

# foundry.toml has invariant config
grep -qE "^\s*\[invariant\]" foundry.toml
grep -qE "runs\s*=\s*256" foundry.toml
grep -qE "depth\s*=\s*32" foundry.toml
grep -qE "fail_on_revert\s*=\s*false" foundry.toml
```

---

## Notes for coding agent

- **Handler pattern is non-negotiable for meaningful invariant testing.** Without a handler, Foundry's fuzzer calls `targetContract()` functions directly with random args — most of which get rejected (wrong role, paused, bad agent id, etc.) and produce trivial coverage. The handler bounds inputs to plausible values + tracks ghost variables.
- **`fail_on_revert = false`** — handler functions may legitimately revert (e.g., `updateGoal` from a non-owner). The invariant must hold on the *post-revert* state. Reference: `bgd-labs/aave-v3-origin/tests/invariant/*` for the canonical pattern.
- **Ghost variables** are state on the handler that mirrors what the contract should hold. The invariant compares ghost vs actual. Discrepancies = bug.
- **`targetSelector(handler)`** can narrow which handler functions are called — useful if certain sequences blow up the search space. Start without; narrow if depth feels shallow.
- **`bound(seed, 1, registry.nextAgentId() - 1)`** is the canonical pattern for picking an existing agent — avoids the "register zero, try to update id 5" rejection rate.
- Per ADR-007, no `console.log` survives into committed code. Use `console2.log` from forge-std for debug; remove before commit.
- This story closes out the Foundry test pyramid for ConciergeRegistry (unit → fuzz → invariant). Subsequent contracts (mocks, session-key validator) get unit + fuzz tests but invariant tests are reserved for contracts with continuous-value math (mocks don't qualify; the registry does because of the owner-mapping double-bookkeeping).
- Cross-ref: `archive/patron-2026-06-02/docs/stories/story-14-patron-vault-tests-invariant.md` for a working invariant test in the predecessor codebase (the `collateral × LTV ≥ debt` invariant — same pattern, different state).
- File MUST stay under 400 LOC.
