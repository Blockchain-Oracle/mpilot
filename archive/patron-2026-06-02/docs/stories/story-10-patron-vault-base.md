# Story 10 — PatronVault.sol skeleton (openLoan + repay + access control)

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~2h
**Depends on:** story-04-foundry-init-and-ci

## BDD Acceptance Criteria

```
Given the contracts package builds
When `forge build` runs in packages/contracts/
Then exit code is 0
And the PatronVault artifact exists at packages/contracts/out/PatronVault.sol/PatronVault.json
And `jq '.abi | map(select(.name == "openLoan")) | length' packages/contracts/out/PatronVault.sol/PatronVault.json` returns 1
And `jq '.abi | map(select(.name == "repay")) | length' packages/contracts/out/PatronVault.sol/PatronVault.json` returns 1

Given the PatronVault contract is deployed in a Foundry test
When a non-AGENT_ROLE account calls openLoan(merchant, amount, recipient)
Then the call reverts with `AccessControlUnauthorizedAccount` (OpenZeppelin v5 error)
And `forge test --match-test test_openLoan_revertsForNonAgent` exits 0

Given the contract is paused via PAUSER_ROLE
When any account calls openLoan or repay
Then the call reverts with `EnforcedPause` (OZ v5 Pausable error)
And `forge test --match-test test_openLoan_revertsWhenPaused` exits 0

Given a valid AGENT_ROLE account calls openLoan inside a reentrant callback
When the reentrancy is attempted
Then the second call reverts with `ReentrancyGuardReentrantCall`
And `forge test --match-test test_openLoan_blocksReentrancy` exits 0
```

## File modification map

- `packages/contracts/src/PatronVault.sol` — NEW — Solidity 0.8.26 contract; inherits OZ `AccessControl`, `ReentrancyGuard`, `Pausable`; defines roles `AGENT_ROLE`, `PAUSER_ROLE`, `DEFAULT_ADMIN_ROLE`; structs `Position { address user; address merchant; uint256 collateralAmount; uint256 debtAmount; uint64 openedAt; bool closed; }`; storage `mapping(uint256 => Position) public positions; uint256 public nextPositionId;`; functions `openLoan(address merchant, uint256 amount, address recipient) external returns (uint256 positionId)`, `repay(uint256 positionId, uint256 amount) external returns (uint256 remainingDebt)`, `pause()`, `unpause()`, `setAaveAdapter(address)` (stub for story-11); events `LoanOpened(uint256 indexed positionId, address indexed user, address indexed merchant, uint256 amount)`, `LoanRepaid(uint256 indexed positionId, uint256 amountRepaid, uint256 remainingDebt)`; Aave/oracle integration LEFT AS STUBS that revert with `NotImplemented` (story-11 fills them in)
- `packages/contracts/src/interfaces/IPatronVault.sol` — NEW — public interface extracted for off-chain consumers + tests
- `packages/contracts/src/errors/PatronErrors.sol` — NEW — custom errors: `ZeroAmount()`, `ZeroAddress()`, `PositionClosed()`, `NotImplemented()`, `NotPositionOwner()`
- `packages/contracts/test/unit/PatronVaultBase.t.sol` — NEW — smoke tests for role gating, pause behaviour, reentrancy guard, and zero-amount / zero-address reverts (does NOT test Aave path — story-12)
- `packages/contracts/test/helpers/ReentrantAttacker.sol` — NEW — minimal attacker contract used by the reentrancy test
- `packages/contracts/remappings.txt` — UPDATE — confirm `@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/` mapping (added in story-04; verify here)

## Shell verification

```bash
cd packages/contracts
forge build
test $? -eq 0

# ABI surface check
jq '.abi | map(select(.name == "openLoan")) | length' out/PatronVault.sol/PatronVault.json | xargs test 1 -eq
jq '.abi | map(select(.name == "repay")) | length'    out/PatronVault.sol/PatronVault.json | xargs test 1 -eq
jq '.abi | map(select(.name == "pause")) | length'    out/PatronVault.sol/PatronVault.json | xargs test 1 -eq

# Role + pause + reentrancy tests
forge test --match-contract PatronVaultBaseTest -vvv
test $? -eq 0

# 400-LOC budget
wc -l src/PatronVault.sol | awk '{ exit ($1 > 400) }'
```

## Notes

- Per architecture.md stack table, Solidity **0.8.26+**. Use custom errors (cheaper than `require` strings).
- Per "Key libraries" section, use **OpenZeppelin Contracts v5.1.0** — that means `AccessControlUnauthorizedAccount`, `EnforcedPause`, and `ReentrancyGuardReentrantCall` errors (v5 is errors-not-strings).
- Aave wiring (pool + oracle) is intentionally a stub in this story; story-11 wires the actual `IPool.borrow` / `IPool.repay` calls + `IAaveOracle.getAssetPrice` (per ADR-003 — no Chainlink involved on Mantle). Keep the stub so the artifact compiles and downstream test stories have a target.
- Roles:
  - `DEFAULT_ADMIN_ROLE` — deployer multisig (for hackathon: deployer EOA, hand off to multisig before Mainnet per story-110)
  - `AGENT_ROLE` — granted to `AgentAuthorizer.sol` so individual user agent session keys can call `openLoan` indirectly
  - `PAUSER_ROLE` — Emergency Freeze backstop (separate from per-user freeze, which is in `AgentAuthorizer`)
- Do NOT add user-facing `freeze()` here — per-user freeze lives in `AgentAuthorizer` (story-19). The vault's `pause()` is the protocol-wide kill switch.
- `recipient` parameter in `openLoan` = the merchant's payout address; the borrowed USDC is sent directly there, not held in the vault.
- File MUST stay under 400 LOC per Biome rule (story-01). If approaching, split helper logic into a library.
