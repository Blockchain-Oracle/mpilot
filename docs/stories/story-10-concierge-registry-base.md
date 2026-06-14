# Story — `ConciergeRegistry.sol` base contract

**ID:** story-10-concierge-registry-base
**Epic:** Epic E1 — Smart Contracts
**Depends on:** story-03-foundry-init-and-remappings, story-05-ci-contracts-pipeline
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** Concierge agent runtime
**I want to** a Mantle smart contract stores each agent's goal + policy + active state under their `agentId`, with role-gated mutation and global pause
**So that** the tick loop reads canonical on-chain state every tick and policy changes survive any off-chain database loss

---

## File modification map

- `contracts/src/ConciergeRegistry.sol` — NEW — main contract. Inherits OZ v5.1 `AccessControlUpgradeable`, `PausableUpgradeable`, `ReentrancyGuardUpgradeable`. Storage: `mapping(uint256 agentId => AgentRecord) agents`, `uint256 nextAgentId`, role constants (`ADMIN_ROLE`, `AGENT_OPERATOR_ROLE`, `PAUSER_ROLE`). Struct `AgentRecord { address owner; address sessionKeyValidator; bytes32 goalHash; bytes policyData; uint256 activatedAt; bool active; }`. Functions: `registerAgent(address owner, address validator, bytes32 goalHash, bytes policyData)`, `updateGoal(uint256 agentId, bytes32 newGoalHash)`, `updatePolicy(uint256 agentId, bytes calldata newPolicy)`, `setActive(uint256 agentId, bool active)`, `transferAgent(uint256 agentId, address newOwner)`, `pause()`, `unpause()`. Reads: `getAgent(uint256 agentId)`, `agentsByOwner(address)`. Events: `AgentRegistered`, `GoalUpdated`, `PolicyUpdated`, `ActiveSet`, `AgentTransferred`. Custom errors (NOT require strings) per OZ v5 convention.
- `contracts/src/interfaces/IConciergeRegistry.sol` — NEW — interface mirror for SDK consumption + downstream contracts
- `contracts/src/errors/ConciergeErrors.sol` — NEW — typed errors: `NotAgentOwner(uint256 agentId, address caller)`, `AgentInactive(uint256 agentId)`, `InvalidValidator(address validator)`, `EmptyGoalHash()`, `PolicyTooLarge(uint256 size)`, `AgentNotFound(uint256 agentId)`
- `contracts/src/ConciergeRegistryProxy.sol` — NEW — UUPS proxy deployment helper (small wrapper around `ERC1967Proxy`)

---

## Acceptance criteria (BDD)

```
Given a fresh deployment via `forge script script/DeployLocal.s.sol`
When `forge build` runs
Then exit code is 0 with no warnings (and `forge build --sizes` shows ConciergeRegistry < 24576 bytes — under EIP-170 contract size limit)

Given the contract is deployed and the admin grants AGENT_OPERATOR_ROLE to address X
When X calls `registerAgent(owner, validator, goalHash, policyData)` with valid inputs
Then a new agentId is minted (incrementing from 1), the AgentRecord is populated, `active = true`, `activatedAt = block.timestamp`, and `AgentRegistered(agentId, owner, validator, goalHash)` is emitted

Given an existing agent owned by Alice
When Bob (not owner) calls `updateGoal(agentId, newHash)`
Then it reverts with `NotAgentOwner(agentId, bob)` (the typed error, NOT a require string)

Given an existing agent
When the owner calls `updatePolicy(agentId, newPolicyBytes)` where `newPolicyBytes.length > 4096`
Then it reverts with `PolicyTooLarge(size)` and storage is unchanged

Given the contract is paused via PAUSER_ROLE
When ANY mutation (`registerAgent`, `updateGoal`, `updatePolicy`, `setActive`, `transferAgent`) is called
Then it reverts with `EnforcedPause()` (OZ v5 custom error)

Given the contract is paused
When `getAgent(agentId)` is called (a read)
Then it succeeds and returns the AgentRecord (reads are NEVER pause-gated)

Given an agent is registered by Alice
When Alice calls `transferAgent(agentId, charlie)`
Then `agents[agentId].owner == charlie`, `agentsByOwner(alice)` no longer contains the id, `agentsByOwner(charlie)` does, and `AgentTransferred(agentId, alice, charlie)` is emitted

Given an inactive agent (`setActive(agentId, false)` was called)
When the tick loop attempts to read it via `getAgent(agentId)`
Then it returns the record with `active = false` (callers check this; contract does NOT auto-revert on inactive reads)

Given the typed errors are all defined
When `forge inspect ConciergeRegistry errors` runs
Then output includes `NotAgentOwner`, `AgentInactive`, `InvalidValidator`, `EmptyGoalHash`, `PolicyTooLarge`, `AgentNotFound`
```

---

## Shell verification

```bash
cd contracts
forge build
test $? -eq 0

# Contract bytecode under EIP-170 limit
size=$(forge inspect ConciergeRegistry bytecode | wc -c)
test "$size" -lt 24576

# All required functions exist
for fn in registerAgent updateGoal updatePolicy setActive transferAgent pause unpause getAgent agentsByOwner; do
  forge inspect ConciergeRegistry methods | grep -q "$fn" || { echo "missing $fn"; exit 1; }
done

# All typed errors exist
for err in NotAgentOwner AgentInactive InvalidValidator EmptyGoalHash PolicyTooLarge AgentNotFound; do
  forge inspect ConciergeRegistry errors | grep -q "$err" || { echo "missing $err"; exit 1; }
done

# Interface compiles
forge build src/interfaces/IConciergeRegistry.sol
test $? -eq 0
```

---

## Notes for coding agent

- Per ADR-009 + 02-architecture.md § Repo structure: this contract is the on-chain anchor for Concierge agent identity + policy. ERC-8004 attestations (from story-83) reference `agentId` from this contract via `setMetadata(agentId, "concierge.registry", abi.encode(registryAddress))` — they don't replace it.
- `goalHash` is `keccak256(canonicalJSON(goal))` — the canonical JSON form is computed off-chain in `packages/sdk`; the contract only stores the hash. Full goal text lives in Postgres + IPFS (referenced via the policy data field).
- `policyData` is opaque bytes (max 4096) — typically `abi.encode(Policy)` from the SDK. Decoded off-chain. Cap enforced on-chain so we don't have unbounded SSTORE costs.
- **Use OZ v5 errors-not-strings.** Reference: `archive/patron-2026-06-02/docs/architecture.md` confirms OZ v5.1 gives us `AccessControlUnauthorizedAccount`, `EnforcedPause`, `ReentrancyGuardReentrantCall` as native errors. Mirror this in our custom errors.
- **UUPS-upgradeable** because we may need to fix bugs post-deploy in hackathon window without a full redeploy of the proxy (which would break `@concierge-mantle/shared/addresses.ts`). The proxy uses OZ's `ERC1967Proxy` + `UUPSUpgradeable`. `_authorizeUpgrade` is gated on `ADMIN_ROLE`.
- **Storage gap** of `__gap[50]` at the end for future field additions (standard upgradeable contracts pattern). Don't skip — Sepolia mocks won't expose the issue, but it bites on Mainnet upgrade.
- Solidity `0.8.26` per ADR + foundry.toml.
- File MUST stay under 400 LOC (per Biome rule). If approaching, extract structs to a separate `ConciergeTypes.sol` file.
- Cross-ref: `research/concierge/02-architecture.md` ADR-009 + `04-agent-runtime.md` § tick loop (the `record()` phase reads `agentId` from this contract).
