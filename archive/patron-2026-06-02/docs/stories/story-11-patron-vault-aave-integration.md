# Story 11 — PatronVault Aave V3 integration + Aave Oracle wrapper

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~2h
**Depends on:** story-10-patron-vault-base

## BDD Acceptance Criteria

```
Given the PatronVault is deployed against a Mantle Sepolia fork
When AGENT_ROLE calls openLoan(merchant, 75e6, merchantPayoutAddr)
Then sUSDe collateral is supplied to Aave V3 Pool (sUSDe address per architecture.md)
And USDC is borrowed at variable rate (interestRateMode = 2)
And the borrowed USDC is transferred to merchantPayoutAddr
And the Position record stores collateralAmount, debtAmount, openedAt
And event LoanOpened is emitted with the correct positionId
And `forge test --match-test test_openLoan_borrowsViaAaveAndPaysMerchant --fork-url $MANTLE_SEPOLIA_RPC_URL` exits 0

Given a position has debt and the AGENT_ROLE calls repay(positionId, debtAmount)
When the repay function executes
Then USDC is pulled from the caller, approved on the Aave Pool, and `IPool.repay` is invoked with the user's debt
Then remainingDebt is returned (0 for full repayment)
And event LoanRepaid is emitted
And `forge test --match-test test_repay_clearsDebtViaAave --fork-url $MANTLE_SEPOLIA_RPC_URL` exits 0

Given the Aave Oracle is unreachable or returns zero for sUSDe (proxy for staleness on a composite oracle)
When openLoan runs
Then it reverts with `OraclePriceUnavailable()` (we cannot use `updatedAt` because `IAaveOracle.getAssetPrice` does not surface staleness — see Notes for the rationale)
And `forge test --match-test test_openLoan_revertsOnOracleUnavailable` exits 0

Given the Aave Oracle sUSDe/USD price is below the depeg floor (configurable, default 0.97e8 for 8-decimal IAaveOracle reads)
When openLoan runs
Then it reverts with `DepegBelowFloor(uint256 price, uint256 floor)`
And `forge test --match-test test_openLoan_revertsBelowDepegFloor` exits 0
```

## File modification map

- `packages/contracts/src/PatronVault.sol` — UPDATE — replace `NotImplemented` stubs from story-10 with real `IPool.supply` + `IPool.borrow` + `IPool.repay` calls; integrate `IAaveOracle.getAssetPrice(sUSDe)` for price reads in `openLoan` (per ADR-003); add `depegFloor` storage; use `SafeERC20.safeIncreaseAllowance` for Aave approvals
- `packages/contracts/src/oracles/PriceFeed.sol` — NEW — thin wrapper around `IAaveOracle.getAssetPrice(address)` with `safePrice(address asset) returns (uint256 priceE8)` that reverts on `price == 0` (Aave Oracle returns uint256 with 8 decimals; staleness handled by Aave at the source-feed level, not exposed at the aggregator interface — see Notes); reused by `MerchantRegistry` later
- `packages/contracts/src/errors/PatronErrors.sol` — UPDATE — add `OraclePriceUnavailable()`, `DepegBelowFloor(uint256 price, uint256 floor)`, `AaveBorrowFailed()`
- `packages/contracts/script/HelperConfig.s.sol` — NEW — central config: Aave Pool addr, sUSDe addr, USDC addr, **Aave Oracle aggregator** addr per chainId (Sepolia 5003, Mainnet 5000 — `0x47a063CfDa980532267970d478EC340C0F80E8df` for Mainnet); used by tests + deploy script
- `packages/contracts/test/unit/PatronVaultAaveFork.t.sol` — NEW — fork tests against Mantle Sepolia using `vm.createSelectFork`; covers happy path + oracle-unavailable revert + depeg floor revert
- `packages/contracts/test/mocks/MockAaveOracle.sol` — NEW — programmable mock implementing `IAaveOracle.getAssetPrice(address) returns (uint256)` for non-fork tests
- `packages/contracts/foundry.toml` — UPDATE — add `[rpc_endpoints]` table: `mantle_sepolia = "${MANTLE_SEPOLIA_RPC_URL}"`; add `fs_permissions` if reading address JSON

## Shell verification

```bash
cd packages/contracts
forge build
test $? -eq 0

# Non-fork unit tests (oracle + revert paths via mocks)
forge test --match-contract PatronVaultAaveFork --match-test 'test_openLoan_revertsOnOracleUnavailable|test_openLoan_revertsBelowDepegFloor' -vvv
test $? -eq 0

# Fork tests (require MANTLE_SEPOLIA_RPC_URL in env per story-06)
export MANTLE_SEPOLIA_RPC_URL="${MANTLE_SEPOLIA_RPC_URL:-https://rpc.sepolia.mantle.xyz}"
forge test --match-contract PatronVaultAaveFork --fork-url $MANTLE_SEPOLIA_RPC_URL -vvv
test $? -eq 0

# 400-LOC budget
wc -l src/PatronVault.sol src/oracles/PriceFeed.sol | awk 'NR<=2 { if ($1 > 400) exit 1 }'
```

## Notes

- Per **ADR-003** (architecture.md, REVISED 2026-06-03), use **Aave Oracle aggregator (`0x47a063CfDa980532267970d478EC340C0F80E8df`)** for sUSDe pricing — NOT direct Chainlink. There is NO direct Chainlink sUSDe/USD feed on Mantle; Aave uses a custom Capped sUSDe/USDT/USD composite at `0x8b47EC48ac560793861D94A997d020872c1cE3f5`. Routing through Aave Oracle keeps our health checks aligned with Aave's liquidation math. Hardcode USDC at $1.
- Per **ADR-002** (architecture.md, REVISED 2026-06-03), v1 collateral is **sUSDe gated by Aave stablecoin E-Mode (category 1)**. sUSDe LTV in general mode = 0 — borrow will silently return zero unless `pool.setUserEMode(1)` is called. **This story does NOT handle E-Mode setup; that's story-22-susde-emode-setup, which must run before this story's first openLoan succeeds.** This story's tests must call `setUserEMode(1)` in test setup; production flow relies on story-22 wiring.
- Exact Mantle Sepolia addresses (per architecture.md "Mantle-specific details"):
  - Aave V3 Pool: `0x458F293454fE0d67EC0655f3672301301DD51422`
  - sUSDe: `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2`
  - USDC: `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`
  - Aave Oracle aggregator: `0x47a063CfDa980532267970d478EC340C0F80E8df`
- **Spread monitor required.** Story-48 (MonitorDepeg) reads Aave Oracle every 60s; if `borrow_rate >= sUSDe_yield - 50bps` for 2 consecutive reads, agent must refuse new positions and surface a banner. Existing positions allowed to mature.
- **IAaveOracle staleness caveat:** `IAaveOracle.getAssetPrice(asset)` returns a single `uint256` (8 decimals) with no `updatedAt`. Staleness is enforced by Aave at the source-feed level (its Capped composites have their own heartbeat checks); reverts there propagate back as a low-level revert from the aggregator. We therefore detect oracle failure as "returns 0 or reverts" rather than "older than X seconds." If we want a per-source heartbeat check on our side later, we'd need to call the source feed directly via `IAaveOracle.getSourceOfAsset(asset)` and read its `latestRoundData()` if it implements Chainlink's V3 interface (the Capped composite does not, per AUDIT-1 verification).
- Aave V3 `interestRateMode`: use `2` (variable rate). Stable rate (`1`) is being phased out across Aave deployments.
- Use `SafeERC20.safeIncreaseAllowance` rather than `approve` — some ERC-20 implementations (USDT-style) revert on non-zero-to-non-zero approvals.
- Aave returns no boolean on `borrow`; failure manifests as a revert. Wrap in `try/catch` if you want a typed `AaveBorrowFailed()` error surfaced; otherwise let it bubble.
- File MUST stay under 400 LOC. If `PatronVault.sol` approaches the limit after Aave integration, extract the oracle helpers into `oracles/PriceFeed.sol` (already in the file map).
