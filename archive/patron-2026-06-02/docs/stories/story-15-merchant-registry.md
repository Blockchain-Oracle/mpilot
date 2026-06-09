# Story 15 — MerchantRegistry.sol (register + USDC bond + suspend + reputation read)

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~2h
**Depends on:** story-04-foundry-init-and-ci

## BDD Acceptance Criteria

```
Given the contracts package builds
When `forge build` runs
Then the MerchantRegistry artifact exists at packages/contracts/out/MerchantRegistry.sol/MerchantRegistry.json
And the ABI contains functions: register, suspend, reinstate, slashBond, refundBond, checkReputation, getMerchant
And `jq '.abi | map(select(.type == "function")) | length' out/MerchantRegistry.sol/MerchantRegistry.json` returns >= 7

Given a merchant calls register(slug, payoutAddress) with the required USDC bond pre-approved
When the register function executes
Then USDC bond is transferred from caller to the registry
And a Merchant record is stored: {owner, slug, payoutAddress, bondAmount, status: Active, registeredAt}
And event MerchantRegistered(bytes32 indexed slugHash, address indexed owner, uint256 bondAmount) is emitted
And `forge test --match-test test_register_pullsBondAndStoresMerchant` exits 0

Given a registered merchant
When ADMIN_ROLE calls suspend(slug, reason)
Then status flips to Suspended
And event MerchantSuspended(slugHash, reason) is emitted
And subsequent checkReputation returns isActive=false

Given a suspended merchant
When ADMIN_ROLE calls slashBond(slug, recipient)
Then the bond USDC is transferred to recipient
And bondAmount is set to 0
And the merchant cannot be reinstated until a fresh bond is posted

Given a merchant tries to register with the same slug twice
When the second register call runs
Then the call reverts with `SlugAlreadyTaken(bytes32 slugHash)`
```

## File modification map

- `packages/contracts/src/MerchantRegistry.sol` — NEW — Solidity 0.8.26 contract; inherits OZ `AccessControl`, `ReentrancyGuard`, `Pausable`; roles `ADMIN_ROLE`, `PAUSER_ROLE`; struct `Merchant { address owner; address payoutAddress; uint256 bondAmount; uint64 registeredAt; uint8 status; uint128 reputationScore; }`; storage `mapping(bytes32 => Merchant) public merchants; uint256 public minBondAmount;` (configurable, default 100e6 = $100 USDC per PRD/design); functions `register(string calldata slug, address payoutAddress)`, `suspend(string calldata slug, bytes32 reason)`, `reinstate(string calldata slug)`, `slashBond(string calldata slug, address recipient)`, `refundBond(string calldata slug)` (callable by merchant owner after offboarding cooldown), `checkReputation(string calldata slug) external view returns (bool isActive, uint128 score, uint256 bond)`, `getMerchant(string calldata slug) external view returns (Merchant memory)`, `setMinBondAmount(uint256)`, `setReputationProxy(address)`; events `MerchantRegistered`, `MerchantSuspended`, `MerchantReinstated`, `BondSlashed`, `BondRefunded`; uses `SafeERC20` for USDC transfers
- `packages/contracts/src/interfaces/IMerchantRegistry.sol` — NEW — public interface; used by `PatronVault.openLoan` to validate merchant before borrow + by backend onboarding service
- `packages/contracts/src/errors/PatronErrors.sol` — UPDATE — add `SlugAlreadyTaken(bytes32)`, `MerchantNotFound(bytes32)`, `MerchantNotActive(bytes32)`, `BondTooLow(uint256 provided, uint256 required)`, `CooldownNotElapsed(uint64 until)`
- `packages/contracts/src/lib/SlugLib.sol` — NEW — `hashSlug(string memory) returns (bytes32)` helper using `keccak256(bytes(slug))`; centralises slug→key hashing so backend + contracts agree
- `packages/contracts/test/helpers/MerchantRegistryFixture.sol` — NEW — abstract base that deploys MockERC20 (USDC), MerchantRegistry, wires roles, mints + approves test USDC

## Shell verification

```bash
cd packages/contracts
forge build
test $? -eq 0

# Verify ABI surface
jq '.abi | map(select(.type == "function")) | map(.name)' out/MerchantRegistry.sol/MerchantRegistry.json > /tmp/fns.json
for fn in register suspend reinstate slashBond refundBond checkReputation getMerchant; do
  jq -e --arg fn "$fn" 'index($fn)' /tmp/fns.json > /dev/null || { echo "MISSING $fn"; exit 1; }
done

# 400-LOC budget
wc -l src/MerchantRegistry.sol src/lib/SlugLib.sol | awk 'NR<=2 { if ($1 > 400) exit 1 }'
```

## Notes

- Slug is `string` at the ABI surface (merchant-friendly: `threads-by-mara`); storage key is `keccak256(bytes(slug))` so map lookups are O(1) bytes32. The `SlugLib` helper guarantees backend (`packages/shared`) and contracts compute the same hash.
- Default `minBondAmount` = `100e6` (100 USDC, 6 decimals). Per architecture.md "Banned patterns" no hardcoded magic numbers — store as immutable or settable storage with an event.
- USDC address on Mantle per architecture.md: `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`. Do NOT hardcode in the contract; inject via constructor (so the same contract code works on Mainnet + Sepolia + local Anvil with a mock USDC).
- `refundBond` requires a cooldown (default 7 days post-offboarding) so disputes can still be initiated; cooldown is also a configurable storage var.
- `reputationScore` is updated by `ReputationProxy` (story-17) via a privileged setter. Do NOT compute reputation in this contract — it is a denormalised cache for cheap reads.
- Status enum: `0 = None, 1 = Active, 2 = Suspended, 3 = Offboarded`. Use `uint8` for storage packing with the rest of the struct.
- The `reason` argument on `suspend` is a `bytes32` (small key like `"FRAUD_REPORT"` or a hash of an off-chain document) so it indexes cleanly in events for the indexer (story-38) to surface in the admin UI.
- Per `Banned patterns`, no `console.log` in production; use custom errors not require strings.
- File MUST stay under 400 LOC.
