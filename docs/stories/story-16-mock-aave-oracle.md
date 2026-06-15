# Story — `MockAaveOracle` for Sepolia playground

**ID:** story-16-mock-aave-oracle
**Epic:** Epic E1 — Smart Contracts
**Depends on:** story-03-foundry-init-and-remappings
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** mPilot agent runtime ticking on Sepolia
**I want to** a mock contract implements `IAaveOracle.getAssetPrice(asset)` returning deterministic but admin-tunable USD prices for sUSDe / USDC / USDY / mETH
**So that** the agent's plan + simulate phases produce consistent demo results AND admins can simulate price drift (depeg, mETH appreciation) for compelling judge demos

---

## File modification map

- `contracts/src/mocks/MockAaveOracle.sol` — NEW — implements `aave-v3-origin/contracts/interfaces/IAaveOracle.sol`. Storage: `mapping(address asset => uint256 priceUsd8) prices` (8-decimal USD prices, matching Aave Oracle's `BASE_CURRENCY_UNIT() = 1e8` convention). Functions:
  - `getAssetPrice(address asset) external view returns (uint256)` — returns price, reverts with `AssetPriceUnavailable(asset)` if unset (matches real Aave behavior on stale composite revert)
  - `getAssetsPrices(address[] calldata) external view returns (uint256[])` — batch read
  - `getSourceOfAsset(address) external view returns (address)` — returns `address(this)` always (mock has no underlying source)
  - `setAssetPrice(address asset, uint256 priceUsd8) external onlyRole(ORACLE_ADMIN_ROLE)` — admin can simulate price drift
  - `setAssetPrices(address[] calldata, uint256[] calldata) external onlyRole(ORACLE_ADMIN_ROLE)` — batch update
  - `BASE_CURRENCY() external pure returns (address)` — returns `address(0)` (USD base, matching Aave)
  - `BASE_CURRENCY_UNIT() external pure returns (uint256)` — returns `1e8`
- Custom errors: `AssetPriceUnavailable(address asset)`, `BatchLengthMismatch()`.

---

## Acceptance criteria (BDD)

```
Given MockAaveOracle is deployed via the Sepolia deploy script with seeded prices
When `forge build` runs
Then exit code is 0

Given the Sepolia seed prices match research/concierge/03-providers/aave-v3-mantle.md verified values
When `oracle.getAssetPrice(mockSUSDe)` is called
Then output is `123214617` ($1.232 — matches Mainnet snapshot from 2026-06-03)

Given oracle.getAssetPrice(mockUSDC)
Then output is `99968000` ($0.99968 — matches Mainnet snapshot)

Given oracle.getAssetPrice(mockMETH)
Then output is `109297978` (~$1.093 — derived from mETH/ETH rate 1.0929 × ETH base $1; for demo, treat ETH base as $1 so mETH ≈ $1.09 — easier for judges to follow than full ETH pricing)

Given oracle.getAssetPrice(unsetAsset)
Then it reverts with `AssetPriceUnavailable(unsetAsset)` (NEVER returns 0 silently — that would let downstream HF math produce phantom values)

Given the BASE_CURRENCY_UNIT
When `oracle.BASE_CURRENCY_UNIT()` is called
Then it returns `1e8` (matches real Aave Oracle convention)

Given admin (ORACLE_ADMIN_ROLE) sets a new price
When `oracle.setAssetPrice(mockSUSDe, 95000000)` runs (depeg to $0.95)
Then subsequent reads return 95000000 AND `PriceUpdated(mockSUSDe, oldPrice, 95000000)` is emitted

Given non-admin attempts setAssetPrice
When the call runs
Then it reverts with `AccessControlUnauthorizedAccount(caller, ORACLE_ADMIN_ROLE)`

Given batch update with mismatched array lengths
When `oracle.setAssetPrices(assets, prices)` is called with arrays of different lengths
Then it reverts with `BatchLengthMismatch()`

Given unit tests run
When `forge test --match-contract MockAaveOracleTest` runs
Then ≥ 10 test cases pass
```

---

## Shell verification

```bash
cd contracts
forge build
test $? -eq 0

# IAaveOracle surface matches
for fn in getAssetPrice getAssetsPrices getSourceOfAsset setAssetPrice BASE_CURRENCY BASE_CURRENCY_UNIT; do
  forge inspect MockAaveOracle methods | grep -q "$fn" || { echo "missing $fn"; exit 1; }
done

# BASE_CURRENCY_UNIT returns 1e8 (asserted via test)
forge test --match-test test_BaseCurrencyUnit_Is1e8 -vvv 2>&1 | grep -q "PASS"

# Seeded prices match Mainnet snapshot
forge test --match-test test_SeededPrices_MatchMainnetSnapshot -vvv 2>&1 | grep -q "PASS"

# Admin-only setAssetPrice
forge test --match-test test_SetAssetPrice_RolesGated -vvv 2>&1 | grep -q "PASS"

# Unit tests pass
forge test --match-contract MockAaveOracleTest 2>&1 | grep -E "\[PASS\]" | wc -l | awk '$1 >= 10 {exit 0} {exit 1}'
```

---

## Notes for coding agent

- **The `Capped sUSDe/USDT/USD` composite mechanic is NOT replicated.** The mock just returns the final 8-decimal USD price. The agent runtime (via `@mpilot/aave-v3-mantle` provider) calls `getAssetPrice(asset)` which is the same interface real Aave Oracle exposes — so the agent doesn't branch.
- **Seeded prices match Mainnet snapshot from 2026-06-03 audit** so Sepolia demos feel real-shaped. If Abu wants to demo a depeg, he calls `setAssetPrice(mockSUSDe, 95000000)` mid-demo and the agent's depeg monitor (story-48 in the original Patron stories — equivalent will live in mPilot's tick loop story-65 propose phase) fires the rotate path.
- **`AssetPriceUnavailable` is a typed error, NOT a silent `return 0`.** Real Aave Oracle reverts on stale composite reads; the mock does the same. The agent's `simulate()` phase catches this and treats it as `oracle_unavailable` per ADR-008 + `research/concierge/03-providers/aave-v3-mantle.md` § IAaveOracle staleness caveat.
- **`PriceUpdated` event** lets off-chain observers (mPilot dashboard / Sepolia faucet UI) react to admin price changes.
- **`ORACLE_ADMIN_ROLE`** is granted to the deployer in story-18's deploy script. A dedicated role (not just DEFAULT_ADMIN_ROLE) lets us delegate price-curation without granting broader admin authority.
- **NO Chainlink / Redstone integration.** Per ADR-008, mPilot never reads raw Chainlink anywhere. The mock is a flat key-value store; price drift is admin-driven, not feed-driven.
- Cross-ref: ADR-008 (Aave Oracle is the price source on Mantle), `research/concierge/03-providers/aave-v3-mantle.md` § Verified facts (Mainnet AaveOracle = `0x47a063CfDa980532267970d478EC340C0F80E8df`, returns 8-decimal prices, base = USD).
- File MUST stay under 400 LOC.
