# Story — ConciergeRegistry fuzz tests (input ranges + state machine)

**ID:** story-12-concierge-registry-tests-fuzz
**Epic:** Epic E1 — Smart Contracts
**Depends on:** story-11-concierge-registry-tests-unit
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** fuzz tests exercise wide input ranges for goal hashes, policy bytes, agent IDs, and addresses to catch edge cases hand-written unit tests miss
**So that** off-by-one + boundary + adversarial-input bugs surface before Mainnet

---

## File modification map

- `contracts/test/fuzz/ConciergeRegistryFuzz.t.sol` — NEW — Foundry fuzz test contract. `forge.config` already sets `fuzz.runs = 256`; this contract overrides to `runs = 1024` per `function modifier`. Reuses `AgentFixtures.sol` from story-11.
- `contracts/foundry.toml` — UPDATE — confirm `[fuzz]` section: `runs = 256`, `max_test_rejects = 65536`, `seed = "0x..."` (deterministic for CI reproducibility, can override with `--fuzz-seed` locally)

---

## Acceptance criteria (BDD)

```
Given the fuzz test file exists
When `forge test --match-contract ConciergeRegistryFuzzTest -vvv` runs
Then ≥ 8 fuzz test functions pass (one per non-trivial input dimension)

Given testFuzz_RegisterAgent_AcceptsAllNonZeroGoalHashes
When fuzzed with random `bytes32 hash` excluding `bytes32(0)` (via `vm.assume(hash != bytes32(0))`)
Then 256+ runs all register successfully without revert

Given testFuzz_UpdatePolicy_AcceptsAnySizeUnderCap
When fuzzed with `bytes policy` constrained via `vm.assume(policy.length <= 4096)`
Then 256+ runs all succeed

Given testFuzz_UpdatePolicy_RevertsOnOversize
When fuzzed with random size `uint16 size` where `size > 4096`
Then 256+ runs all revert with `PolicyTooLarge(size)`

Given testFuzz_TransferAgent_OwnerMapsAlwaysConsistent
When fuzzed with random `address newOwner` (assumed non-zero, non-current-owner)
Then after transfer: `agents[id].owner == newOwner`, `agentsByOwner(prevOwner)` does not contain id, `agentsByOwner(newOwner)` does (asserted on every run)

Given testFuzz_RegisterAgent_NextIdMonotonicAcrossCalls
When 50 fuzzed registrations are queued via `register(...)` calls
Then each returned agentId is exactly `prev + 1` (no gaps, no overflow within run)

Given testFuzz_SetActive_TogglesIdempotently
When fuzzed with random `bool active` and called twice with same value
Then the second call still emits the event but state is unchanged (assert `agents[id].active == active`)

Given testFuzz_GoalHash_AnyBytes32ExceptZeroAccepted
When fuzzed across the full `bytes32` range
Then either it registers OR reverts with `EmptyGoalHash()` (no silent failures, no panics)

Given the fuzz runs complete
When `forge test --match-contract ConciergeRegistryFuzzTest --fuzz-runs 1024 -vvv` runs
Then exit code is 0 (no rejected runs exceed `max_test_rejects`)
```

---

## Shell verification

```bash
cd contracts

# Fuzz tests pass with default 256 runs
forge test --match-contract ConciergeRegistryFuzzTest -vvv 2>&1 | grep -E "\[PASS\]" | wc -l | awk '$1 >= 8 {exit 0} {exit 1}'

# Higher run count (1024) still green
forge test --match-contract ConciergeRegistryFuzzTest --fuzz-runs 1024 2>&1 | grep -E "\[FAIL\]" | wc -l | awk '$1 == 0 {exit 0} {exit 1}'

# foundry.toml has fuzz config
grep -qE "^\s*\[fuzz\]" foundry.toml
grep -qE "runs\s*=\s*256" foundry.toml
grep -qE "max_test_rejects\s*=\s*65536" foundry.toml

# Deterministic seed pinned for reproducibility
grep -qE "seed\s*=" foundry.toml
```

---

## Notes for coding agent

- Test function naming: `testFuzz_<Function>_<Property>`. Foundry recognizes the `Fuzz` prefix and auto-treats unannotated args as fuzzed.
- Use `vm.assume(...)` for input constraints (e.g., non-zero address, non-current-owner). DON'T use `bound()` for constraints unrelated to ranges — `vm.assume` is the correct primitive for boolean filters.
- Use `bound(x, min, max)` to constrain numeric inputs without rejecting runs. Rejection rate climbs fast with multiple `vm.assume` — `bound` is the more efficient path when the input space is naturally constrained.
- `vm.expectRevert` with typed-error args fuzzed correctly: encode the expected error AFTER computing the inputs:
  ```solidity
  vm.expectRevert(abi.encodeWithSelector(ConciergeErrors.PolicyTooLarge.selector, size));
  registry.updatePolicy(id, policy);
  ```
- **Deterministic seed in CI** — without it, every CI run is a different random walk; a 1-in-5000 failure shows up as a non-reproducible flake. Reference: `find-evil/.github/workflows/ci.yml` Hypothesis cache rationale (same problem, different language).
- `max_test_rejects = 65536` lets `vm.assume` filter aggressively (~1% acceptance rate) without aborting the test. Lower values silently truncate the actual run count.
- Cross-ref: Foundry fuzz docs (`book.getfoundry.sh/forge/fuzz-testing`); bgd-labs `aave-v3-origin/tests/fuzz/*` patterns.
- File MUST stay under 400 LOC.
