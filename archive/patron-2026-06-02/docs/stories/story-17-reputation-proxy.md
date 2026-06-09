# Story 17 — ReputationProxy.sol wrapping ERC-8004 Reputation Registry

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~2h
**Depends on:** story-04-foundry-init-and-ci

## BDD Acceptance Criteria

```
Given the contracts package builds
When `forge build` runs
Then ReputationProxy artifact exists at packages/contracts/out/ReputationProxy.sol/ReputationProxy.json
And the ABI contains: logAction, getActionCount, getActionByIndex, getReputationScore, setIdentityRegistry, setReputationRegistry

Given an AGENT_ROLE address calls logAction(agentId, actionType, paramsHash, success, deltaScore)
When the function executes
Then it calls into the ERC-8004 Reputation Registry at the configured address with the canonical setMetadata call
And it emits ActionLogged(agentId, actionType, paramsHash, success, deltaScore)
And `forge test --match-test test_logAction_callsErc8004Registry` exits 0

Given a non-AGENT_ROLE address calls logAction
When the call executes
Then it reverts with AccessControlUnauthorizedAccount

Given an action was logged
When getActionByIndex(agentId, 0) is queried
Then it returns the structured action record (actionType, timestamp, paramsHash, success, txHash)
And getActionCount(agentId) returns 1
And the receipt is verifiable on Mantlescan (fork test asserts event presence at the registry contract)

Given the contract is paused via PAUSER_ROLE
When logAction is called
Then it reverts with EnforcedPause
```

## File modification map

- `packages/contracts/src/ReputationProxy.sol` — NEW — Solidity 0.8.26; inherits OZ `AccessControl`, `Pausable`; roles `AGENT_ROLE`, `ADMIN_ROLE`, `PAUSER_ROLE`; storage `address public identityRegistry; address public reputationRegistry; mapping(uint256 => Action[]) public actionsByAgent; mapping(uint256 => uint128) public reputationScore;`; struct `Action { uint64 timestamp; bytes4 actionType; bytes32 paramsHash; bool success; int128 deltaScore; bytes32 receiptUri; }`; functions `logAction(uint256 agentId, bytes4 actionType, bytes32 paramsHash, bool success, int128 deltaScore, bytes32 receiptUri)`, `getActionCount(uint256 agentId) external view returns (uint256)`, `getActionByIndex(uint256 agentId, uint256 i) external view returns (Action memory)`, `getReputationScore(uint256 agentId) external view returns (uint128)`, `setIdentityRegistry(address)`, `setReputationRegistry(address)`; calls into ERC-8004 Reputation Registry via `IERC8004ReputationRegistry(reputationRegistry).setMetadata(agentId, metadataKey, metadataValue)`
- `packages/contracts/src/interfaces/IERC8004IdentityRegistry.sol` — NEW — minimal interface: `ownerOf(uint256 agentId) returns (address)`, `tokenURI(uint256) returns (string)`
- `packages/contracts/src/interfaces/IERC8004ReputationRegistry.sol` — NEW — minimal interface: `setMetadata(uint256 agentId, bytes32 key, bytes calldata value)`, `getMetadata(uint256 agentId, bytes32 key) external view returns (bytes memory)`
- `packages/contracts/src/interfaces/IReputationProxy.sol` — NEW — public interface for backend + other contracts
- `packages/contracts/src/errors/PatronErrors.sol` — UPDATE — add `InvalidAgentId(uint256)`, `RegistryNotSet()`, `ActionIndexOutOfRange(uint256 idx, uint256 length)`
- `packages/contracts/src/lib/ActionCodec.sol` — NEW — pure library encoding/decoding `Action` structs to/from the bytes-blob format expected by the ERC-8004 Reputation Registry's `setMetadata(uint256, bytes32, bytes)` ABI (keeps the codec testable in isolation)

## Shell verification

```bash
cd packages/contracts
forge build
test $? -eq 0

# ABI surface
jq '.abi | map(select(.type == "function")) | map(.name)' out/ReputationProxy.sol/ReputationProxy.json > /tmp/rp-fns.json
for fn in logAction getActionCount getActionByIndex getReputationScore setIdentityRegistry setReputationRegistry; do
  jq -e --arg fn "$fn" 'index($fn)' /tmp/rp-fns.json > /dev/null || { echo "MISSING $fn"; exit 1; }
done

# Event surface
jq '.abi | map(select(.type == "event")) | map(.name)' out/ReputationProxy.sol/ReputationProxy.json | grep -q "ActionLogged"

# 400-LOC budget
wc -l src/ReputationProxy.sol src/lib/ActionCodec.sol | awk 'NR<=2 { if ($1 > 400) exit 1 }'
```

## Notes

- ERC-8004 Registries are external contracts deployed canonically at CREATE2 addresses on Mantle (per architecture.md "Mantle-specific details"):
  - **Mainnet (5000):** Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
  - **Sepolia (5003):** Identity `0x8004A818BFB912233c491871b3d84c89A494BD9e`, Reputation `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- Per PRD scope: we use Identity + Reputation registries; the **Validation Registry is explicitly out of scope** (in flux per TEE community update — design spec line 36). Do NOT add a Validation interface.
- Coding agent MUST query Context7 for the actual ERC-8004 ABI before authoring the interface stubs. If Context7 has no ERC-8004 entry, fall back to reading the canonical contract source via `cast etherscan-source` against the Mantle Mainnet address or the official ERC-8004 specification repo. Do NOT guess the ABI shape from training data — see architecture.md "Context7 library research rule".
- `agentId` is a `uint256` (matches ERC-721 token IDs from the Identity Registry). Each Patron user owns 1 NFT = 1 agent identity.
- `actionType` is a `bytes4` enum-style discriminator (e.g. `bytes4(keccak256("OPEN_LOAN"))`, `bytes4(keccak256("REPAY"))`, `bytes4(keccak256("VERIFY_MERCHANT"))`). Documented in `ActionCodec.sol`.
- `receiptUri` is a `bytes32` that points to an IPFS CID or off-chain JSON containing the full agent reasoning chain (for the `/audit/:txHash` page in story-77). Storing the full reasoning on-chain is too expensive; the bytes32 is a content hash so any tamper is detectable.
- Only `PatronVault` (and later `MerchantRegistry`) gain `AGENT_ROLE` so they can log actions during their own state transitions. Backend services NEVER call `logAction` directly — actions are logged from the contract that executed them, so the on-chain receipt is atomically consistent with the action.
- File MUST stay under 400 LOC. The ActionCodec library exists partly to absorb encoding logic that would otherwise bloat the proxy.
