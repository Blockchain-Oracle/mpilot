# Story 19 — AgentAuthorizer.sol v1 (scoped API key model)

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~2h
**Depends on:** story-04-foundry-init-and-ci

## BDD Acceptance Criteria

```
Given the contracts package builds
When `forge build` runs
Then AgentAuthorizer artifact exists at packages/contracts/out/AgentAuthorizer.sol/AgentAuthorizer.json
And the ABI contains: issueSessionKey, revokeSessionKey, freezeAgent, unfreezeAgent, isAuthorized, getScope

Given the user (owner of agent NFT) calls issueSessionKey(agentId, sessionKey, scope)
When the function executes
Then a SessionKey record is stored with (sessionKey, scope, issuedAt, revokedAt=0)
And event SessionKeyIssued(agentId, sessionKey, scopeHash) is emitted
And `forge test --match-test test_issueSessionKey_happyPath` exits 0

Given an active session key
When a contract calls isAuthorized(agentId, sessionKey, target, selector, value, timestamp)
Then it returns true iff: agent not frozen AND key not revoked AND target ∈ allowlist AND selector ∈ allowlist AND value <= remaining spend cap in current window AND timestamp <= expiry
And returns false otherwise (no revert; pure predicate)
And `forge test --match-test test_isAuthorized_enforcesAllScopeRules` exits 0

Given the user calls freezeAgent(agentId)
When freezeAgent executes
Then frozenAt is set to block.timestamp
And every subsequent isAuthorized returns false until unfreezeAgent is called
And event AgentFrozen(agentId) is emitted
And `forge test --match-test test_freezeAgent_blocksAllAuthorization` exits 0

Given a non-owner address calls issueSessionKey for an agent they do not own
When the call executes
Then it reverts with NotAgentOwner(uint256 agentId)
```

## File modification map

- `packages/contracts/src/AgentAuthorizer.sol` — NEW — Solidity 0.8.26; inherits OZ `AccessControl`, `ReentrancyGuard`, `Pausable`; struct `Scope { address[] allowedTargets; bytes4[] allowedSelectors; uint128 spendCapPerWindow; uint64 windowSeconds; uint64 expiry; }`; struct `SessionKey { bytes32 scopeHash; uint64 issuedAt; uint64 revokedAt; uint128 spentInWindow; uint64 windowStart; }`; storage `IERC8004IdentityRegistry public identityRegistry; mapping(uint256 => mapping(address => SessionKey)) public sessionKeys; mapping(uint256 => uint64) public frozenAt; mapping(bytes32 => Scope) private _scopes;`; functions `issueSessionKey(uint256 agentId, address sessionKey, Scope calldata scope) external returns (bytes32 scopeHash)`, `revokeSessionKey(uint256 agentId, address sessionKey)`, `freezeAgent(uint256 agentId)`, `unfreezeAgent(uint256 agentId)`, `isAuthorized(uint256 agentId, address sessionKey, address target, bytes4 selector, uint256 value, uint64 timestamp) external view returns (bool)`, `getScope(bytes32 scopeHash) external view returns (Scope memory)`, `accountSpend(uint256 agentId, address sessionKey, uint256 amount)` (called by PatronVault on a successful loan to debit the window cap); events `SessionKeyIssued`, `SessionKeyRevoked`, `AgentFrozen`, `AgentUnfrozen`, `SpendAccounted`
- `packages/contracts/src/interfaces/IAgentAuthorizer.sol` — NEW — public interface; consumed by PatronVault to check authorization before executing openLoan from a session-key call path
- `packages/contracts/src/errors/PatronErrors.sol` — UPDATE — add `NotAgentOwner(uint256 agentId)`, `SessionKeyRevoked()`, `AgentIsFrozen(uint256 agentId, uint64 frozenAt)`, `ScopeExpired(uint64 expiry)`, `TargetNotAllowed(address target)`, `SelectorNotAllowed(bytes4 selector)`, `SpendCapExceeded(uint256 requested, uint256 remaining)`
- `packages/contracts/src/lib/ScopeHash.sol` — NEW — pure library `hashScope(Scope memory) returns (bytes32)` deterministic over all fields (sorted allowlists for canonical ordering)

## Shell verification

```bash
cd packages/contracts
forge build
test $? -eq 0

# ABI surface checks
jq '.abi | map(select(.type == "function")) | map(.name)' out/AgentAuthorizer.sol/AgentAuthorizer.json > /tmp/aa-fns.json
for fn in issueSessionKey revokeSessionKey freezeAgent unfreezeAgent isAuthorized getScope accountSpend; do
  jq -e --arg fn "$fn" 'index($fn)' /tmp/aa-fns.json > /dev/null || { echo "MISSING $fn"; exit 1; }
done

# Event surface
for evt in SessionKeyIssued SessionKeyRevoked AgentFrozen AgentUnfrozen; do
  jq -e --arg evt "$evt" '.abi | map(select(.type == "event")) | map(.name) | index($evt)' out/AgentAuthorizer.sol/AgentAuthorizer.json > /dev/null || { echo "MISSING event $evt"; exit 1; }
done

# 400-LOC budget
wc -l src/AgentAuthorizer.sol src/lib/ScopeHash.sol | awk 'NR<=2 { if ($1 > 400) exit 1 }'
```

## Notes

- Per **ADR-004** (architecture.md): EIP-7702 session keys are the long-term plan, but **v1 falls back to a scoped API-key model if EIP-7702 integration burns too much time**. This story IS that v1 fallback. EIP-7702 lands in a v2 story (not part of the hackathon scope unless time permits).
- `sessionKey` is a plain EVM address (the backend generates an ephemeral keypair per user agent; the address registers here, the private key signs the backend's outbound transactions). NOT an EOA the user controls directly.
- `Scope` defines exactly what a key can do:
  - `allowedTargets` — typically `[PatronVault, MerchantRegistry]`
  - `allowedSelectors` — typically `[openLoan.selector, repay.selector]`
  - `spendCapPerWindow` — e.g. 200 USDC = `200e6`
  - `windowSeconds` — e.g. 86400 (per-day cap)
  - `expiry` — absolute unix timestamp after which the key is dead regardless of revoke
- `freezeAgent` is the **Emergency Freeze** primitive surfaced in the dashboard (`story-71` web; `story-85` mini). Frozen state blocks ALL session keys for the agent atomically. Per PRD demo step 4: "judge clicks Emergency Freeze; dashboard shows all session keys revoked in real time".
- `accountSpend` MUST be callable only by the `target` contracts in scope (whitelist by `AGENT_VAULT_ROLE`). Otherwise a malicious caller could fake spend accounting and drain caps.
- `isAuthorized` is a **pure predicate** (returns bool, no revert) so callers can branch on the result. Revert-style versions exist as private helpers that surface the specific error code for better debuggability.
- Identity Registry (per architecture.md): used only via `IERC8004IdentityRegistry.ownerOf(agentId)` to enforce that only the NFT holder can issue/revoke/freeze. Do not re-implement NFT logic here.
- File MUST stay under 400 LOC. If approaching, extract window-accounting math into a separate library.
