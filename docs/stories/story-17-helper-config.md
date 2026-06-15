# Story — `HelperConfig.s.sol` (chain-id routed dependency addresses)

**ID:** story-17-helper-config
**Epic:** Epic E1 — Smart Contracts
**Depends on:** story-14-mock-aave-pool, story-15-mock-susde-usdc-usdy-meth, story-16-mock-aave-oracle
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge contracts deployer
**I want to** a single `HelperConfig.s.sol` resolves dependency addresses (Aave Pool, Aave Oracle, sUSDe, USDC, USDY, mETH, ERC-8004 registries) per chain id
**So that** `DeployAll.s.sol` deploys identically across Mainnet (5000 → real addresses) and Sepolia (5003 → mock addresses) without per-chain branching in the deploy script itself

---

## File modification map

- `contracts/script/HelperConfig.s.sol` — NEW — `forge-std/Script.sol`-based. Exports `NetworkConfig { address aavePool; address aaveOracle; address aaveAddressesProvider; address aaveProtocolDataProvider; address sUSDe; address USDC; address USDe; address USDY; address mETH; address WMNT; address erc8004Identity; address erc8004Reputation; address lifiDiamond; uint8 emodeStablecoinCategory; }`. Function `getConfig() public returns (NetworkConfig memory)` dispatches on `block.chainid`. Three cases:
  - `5000` (Mantle Mainnet) — returns the verified Mainnet addresses (constants, NOT magic literals — all imported from `Addresses.sol`)
  - `5003` (Mantle Sepolia) — first call deploys all 4 mocks (MockAavePool, MockSUSDe/USDC/USDY/mETH/USDe, MockAaveOracle), seeds them with Mainnet-snapshot prices, then returns those mock addresses. Caches in storage so subsequent calls don't redeploy.
  - default (unknown) — reverts with `UnsupportedChain(uint256 chainId)`
- `contracts/script/lib/Addresses.sol` — NEW — Solidity constants for the Mainnet addresses (sourced from `research/concierge/03-providers/*.md` verified facts). Single source of truth — never duplicate addresses elsewhere.
- `contracts/script/lib/SepoliaSeedPrices.sol` — NEW — `function getSeedPrices() returns (address[], uint256[])` returning the seed price array for `MockAaveOracle` to load (matches the Mainnet 2026-06-03 snapshot for sUSDe $1.232, USDC $0.99968, etc.)
- Custom error: `UnsupportedChain(uint256 chainId)`.

---

## Acceptance criteria (BDD)

```
Given HelperConfig.s.sol exists
When `forge build` runs
Then exit code is 0

Given `vm.chainId(5000)` is set in a test
When `helperConfig.getConfig()` runs
Then it returns the verified Mainnet addresses: `aavePool == 0x458F293454fE0d67EC0655f3672301301DD51422`, `aaveOracle == 0x47a063CfDa980532267970d478EC340C0F80E8df`, `sUSDe == 0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2`, `USDC == 0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`, `USDY == 0x5bE26527e817998A7206475496fDE1E68957c5A6`, `mETH == 0xcDA86A272531e8640cD7F1a92c01839911B90bb0`, `erc8004Identity == 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, `erc8004Reputation == 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`, `lifiDiamond == 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE`, `emodeStablecoinCategory == 1`

Given vm.chainId(5003) is set
When helperConfig.getConfig() runs
Then it deploys 4 mocks + MockAaveOracle, seeds the oracle with Mainnet-snapshot prices, and returns the mock addresses (for Sepolia, ERC-8004 registries remain real Sepolia addresses: `erc8004Identity == 0x8004A818BFB912233c491871b3d84c89A494BD9e`, `erc8004Reputation == 0x8004B663056A597Dffe9eCcC1965A193B7388713`)

Given chainid 5003 + getConfig() was already called once
When getConfig() runs a second time
Then it returns the cached mock addresses without redeploying (verified via deploy-counter assertion)

Given vm.chainId(1) (Ethereum Mainnet)
When getConfig() runs
Then it reverts with `UnsupportedChain(1)` (NOT a default fallthrough to mock-Sepolia behavior — silent fallthrough would mask deploy-script misconfigurations)

Given seedPrices array
When getSeedPrices() is called
Then it returns 6 addresses (sUSDe, USDC, USDe, USDY, mETH, WMNT) paired with 6 prices, all > 0

Given the Addresses.sol constants
When `cast call` would attempt to resolve them on Mantle Mainnet
Then every address has bytecode (verified via integration test against fork) — no broken pointers
```

---

## Shell verification

```bash
cd contracts
forge build
test $? -eq 0

# HelperConfig exports the right struct
forge inspect HelperConfig methods | grep -q "getConfig" || exit 1

# Mainnet config returns verified addresses (via mainnet-fork test)
forge test --match-test test_HelperConfig_Mainnet_ReturnsVerifiedAddresses --fork-url https://rpc.mantle.xyz 2>&1 | grep -q "PASS" || true  # may skip if no RPC

# Sepolia config deploys mocks
forge test --match-test test_HelperConfig_Sepolia_DeploysMocks --fork-url https://rpc.sepolia.mantle.xyz 2>&1 | grep -q "PASS" || true

# Unsupported chain reverts
forge test --match-test test_HelperConfig_UnsupportedChain_Reverts 2>&1 | grep -q "PASS"

# Addresses.sol has NO inline literal addresses outside the constants file
files=$(grep -lE "0x[a-fA-F0-9]{40}" contracts/script/*.sol contracts/script/lib/*.sol)
test "$files" = "contracts/script/lib/Addresses.sol"
```

---

## Notes for coding agent

- **Addresses are constants, NOT magic literals.** All hex addresses live in `contracts/script/lib/Addresses.sol` as `address constant AAVE_V3_POOL_MAINNET = 0x458F293454fE0d67EC0655f3672301301DD51422;`. Other contracts/scripts import them by name. Reference: `story-cdr/packages/contracts/src/addresses.ts` for the TS-side equivalent + `@mpilot/shared/addresses.ts` (story-20) which auto-syncs.
- **Sepolia mock caching** prevents `getConfig()` from redeploying mocks on every call. Cache pattern:
  ```solidity
  NetworkConfig private _sepoliaConfig;
  bool private _sepoliaCached;

  function getSepoliaConfig() internal returns (NetworkConfig memory) {
      if (_sepoliaCached) return _sepoliaConfig;
      // deploy mocks...
      _sepoliaCached = true;
      return _sepoliaConfig;
  }
  ```
- **`UnsupportedChain` reverts on unknown chain ids** — no silent fallthrough. Reference: `research/concierge/AUDIT-2026-06-04.md` § findings (no-silent-failures principle).
- **Mainnet seed prices on Sepolia mocks** make demos feel real-shaped without dragging in oracle complexity. If Abu wants drift, he calls `MockAaveOracle.setAssetPrice` post-deploy (story-16).
- **mETH on Mantle is technically a bridge image** (per `research/concierge/03-providers/meth-staking.md`); Concierge treats it as a regular ERC-20 token for the action surface. The Sepolia mock is a simplified ERC-20 — no L1 bridge mechanics replicated.
- **E-Mode stablecoin category id (1) is a constant in the struct** so the agent runtime can read it once per chain via `helperConfig.getConfig().emodeStablecoinCategory` instead of hardcoding `1` everywhere.
- Cross-ref: ADR-012 (Sepolia mock-deploy pattern); `archive/patron-2026-06-02/docs/stories/story-17-helper-config.md` (predecessor implementation — similar shape, Patron-specific reserves).
- File MUST stay under 400 LOC. If `HelperConfig.s.sol` approaches limit, extract Sepolia-deploy logic to `script/lib/SepoliaDeploy.sol`.
