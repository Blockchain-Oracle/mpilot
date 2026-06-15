# Story — ConciergeRegistry unit tests (happy paths + revert paths)

**ID:** story-11-concierge-registry-tests-unit
**Epic:** Epic E1 — Smart Contracts
**Depends on:** story-10-concierge-registry-base
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** mPilot maintainer
**I want to** every public function on `ConciergeRegistry` has unit tests asserting happy paths, role-gating, pause behavior, and every typed-error revert path
**So that** behavioral regressions surface at PR time, not at Mainnet-deploy time

---

## File modification map

- `contracts/test/unit/ConciergeRegistry.t.sol` — NEW — Foundry test contract. Inherits `forge-std/Test.sol`. `setUp()` deploys the UUPS proxy + grants roles to test addresses (ALICE, BOB, CHARLIE, OPERATOR, PAUSER). Imports the IConciergeRegistry interface so tests are type-safe.
- `contracts/test/helpers/AgentFixtures.sol` — NEW — fixture helpers: `makeGoalHash(string)`, `makePolicy(uint256 maxSpend, bool[3] flags)` (returns abi-encoded bytes), `registerTestAgent(address owner)` (returns agentId)
- `contracts/test/helpers/Events.sol` — NEW — event signatures for `vm.expectEmit` assertions

---

## Acceptance criteria (BDD)

```
Given the unit test file exists
When `forge test --match-contract ConciergeRegistryTest -vvv` runs
Then ≥ 20 test cases pass (covering all 7 mutating functions × happy + revert + role-gate + pause-gate paths)

Given test_registerAgent_HappyPath_MintsIdOneAndEmits
When the test runs
Then agentId == 1, AgentRecord fields match inputs, `activatedAt == block.timestamp`, `active == true`, and `AgentRegistered(1, ALICE, validator, goalHash)` is emitted

Given test_registerAgent_Reverts_OnEmptyGoalHash
When the test calls register with `bytes32(0)` goalHash
Then it reverts with `EmptyGoalHash()`

Given test_registerAgent_Reverts_WithoutAgentOperatorRole
When BOB (no role) calls register
Then it reverts with `AccessControlUnauthorizedAccount(bob, AGENT_OPERATOR_ROLE)` (OZ v5 native error)

Given test_updateGoal_HappyPath_StorageUpdatedAndEmits
When the owner calls updateGoal with a new hash
Then the hash is updated AND `GoalUpdated(agentId, oldHash, newHash)` is emitted

Given test_updateGoal_Reverts_WhenCallerNotOwner
When a non-owner calls updateGoal
Then it reverts with `NotAgentOwner(agentId, caller)` (typed error, exact arguments asserted via `vm.expectRevert(abi.encodeWithSelector(...))`)

Given test_updatePolicy_Reverts_OnOversizedBytes
When updatePolicy is called with 4097 bytes
Then it reverts with `PolicyTooLarge(4097)` and storage is unchanged (assert via re-reading)

Given test_pause_Then_AllMutationsRevert
When PAUSER calls pause(), then any of registerAgent / updateGoal / updatePolicy / setActive / transferAgent runs
Then each reverts with `EnforcedPause()` and storage is unchanged

Given test_pause_Reads_StillWork
When the contract is paused and `getAgent(1)` is called
Then it returns the AgentRecord normally (reads ARE NOT pause-gated)

Given test_transferAgent_HappyPath_OwnerMapsUpdate
When ALICE transfers agentId to CHARLIE
Then `agents[agentId].owner == charlie`, `agentsByOwner(alice)` is empty, `agentsByOwner(charlie)` has the id, `AgentTransferred(agentId, alice, charlie)` is emitted

Given coverage report runs after all tests
When `forge coverage --match-contract ConciergeRegistry --report summary` runs
Then `src/ConciergeRegistry.sol` line coverage is ≥ 95%
```

---

## Shell verification

```bash
cd contracts
forge build
test $? -eq 0

# ≥ 20 test cases passing
forge test --match-contract ConciergeRegistryTest -vvv 2>&1 | grep -E "\[PASS\]" | wc -l | awk '$1 >= 20 {exit 0} {exit 1}'

# All tests passing (no FAIL lines)
forge test --match-contract ConciergeRegistryTest -vvv 2>&1 | grep -E "\[FAIL\]" | wc -l | awk '$1 == 0 {exit 0} {exit 1}'

# Coverage ≥ 95% on the contract
cov=$(forge coverage --match-contract ConciergeRegistry --report summary 2>&1 | grep "src/ConciergeRegistry.sol" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 95
```

---

## Notes for coding agent

- Test naming convention: `test_<function>_<expectedOutcome>_<contextOrInput>`. Foundry's verbose output groups by function — keeps related tests visually grouped.
- Use `vm.expectEmit(true, true, false, true)` (3 indexed checks + data) when asserting events. The 4th param `true` means assert the data payload exactly.
- For typed-error reverts with arguments, use `vm.expectRevert(abi.encodeWithSelector(ConciergeErrors.NotAgentOwner.selector, agentId, caller))` — asserts the EXACT error data, not just the selector. Catches the silent bug where the contract reverts with the right selector but wrong arguments.
- Use OZ v5's native `AccessControlUnauthorizedAccount` selector for role-gate reverts: `bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)"))`. The contract emits this automatically; tests should assert against the OZ selector, NOT a mPilot-custom one.
- Fixtures live in a separate file because the test file MUST stay under 400 LOC (Biome rule applies to Solidity too via the LOC script — verify by running `pnpm scripts/check-file-loc.mjs`).
- Reference test patterns: bgd-labs Aave V3 Origin tests + OZ v5 AccessControl test fixtures.
- Cross-ref: `research/concierge/02-architecture.md` ADR-007 (400 LOC) + ADR-009 (Postgres + Redis off-chain mirrors; on-chain is canonical).
