# Story — Mock tokens (`MockSUSDe` / `MockUSDC` / `MockUSDY` / `MockMETH`) + faucet

**ID:** story-15-mock-susde-usdc-usdy-meth
**Epic:** Epic E1 — Smart Contracts
**Depends on:** story-03-foundry-init-and-remappings
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** judge or community user wanting to try mPilot on Mantle Sepolia
**I want to** four mock ERC-20 tokens (sUSDe, USDC, USDY, mETH) with a faucet I can mint from
**So that** I can fund my Sepolia smart account in seconds and watch the agent operate end-to-end without buying real tokens

---

## File modification map

- `contracts/src/mocks/MockSUSDe.sol` — NEW — ERC-20 (OZ v5) with `name="Staked USDe"`, `symbol="sUSDe"`, `decimals=18`. Public `faucet(address to, uint256 amount)` (rate-limited: 1000 sUSDe per address per 24h) + admin-only `mint(address, uint256)`.
- `contracts/src/mocks/MockUSDC.sol` — NEW — `name="USD Coin"`, `symbol="USDC"`, `decimals=6`. Faucet: 10,000 USDC per address per 24h.
- `contracts/src/mocks/MockUSDY.sol` — NEW — `name="Ondo U.S. Dollar Yield"`, `symbol="USDY"`, `decimals=18`. Faucet: 1,000 USDY per address per 24h.
- `contracts/src/mocks/MockMETH.sol` — NEW — `name="mETH"`, `symbol="mETH"`, `decimals=18`. Faucet: 5 mETH per address per 24h.
- `contracts/src/mocks/base/MockFaucetToken.sol` — NEW — abstract base contract that all 4 mocks inherit. Implements the rate-limited faucet (`mapping(address => uint256) lastFaucetAt`, `FAUCET_COOLDOWN = 1 days`, `event FaucetClaim(address,uint256)`). Custom errors: `FaucetCooldownActive(uint256 remainingSeconds)`, `FaucetAmountExceedsCap(uint256 requested, uint256 cap)`.

---

## Acceptance criteria (BDD)

```
Given each mock token contract exists
When `forge build` runs
Then exit code is 0 and all four mocks deploy cleanly

Given MockSUSDe is deployed
When `symbol()` is called
Then output is "sUSDe"

Given MockSUSDe.decimals()
Then output is 18

Given MockUSDC.decimals()
Then output is 6 (matches real Mainnet USDC decimals)

Given a user has never faucet-claimed before
When they call `mockSUSDe.faucet(self, 500e18)`
Then the call succeeds, balance increases by 500e18, `lastFaucetAt[user] = block.timestamp`, and `FaucetClaim(user, 500e18)` is emitted

Given a user just claimed 5 minutes ago
When they call faucet again
Then it reverts with `FaucetCooldownActive(remainingSeconds)` where `remainingSeconds ≈ 86100`

Given a user claims more than the per-call cap (1000 sUSDe for MockSUSDe)
When the faucet runs
Then it reverts with `FaucetAmountExceedsCap(requested, 1000e18)`

Given 24h+1 second has passed since last claim
When the user calls faucet again
Then it succeeds

Given the deploy script grants admin role to the deployer
When admin calls `mockSUSDe.mint(targetUser, 100000e18)` (bypassing faucet cap for tests)
Then it succeeds and balance increases

Given a non-admin attempts mint
When the call runs
Then it reverts with `AccessControlUnauthorizedAccount(caller, MINTER_ROLE)`

Given all 4 mocks
When unit tests run
Then ≥ 16 test cases pass (4 mocks × ~4 cases each: deploy, faucet happy, faucet cooldown, mint role-gated)
```

---

## Shell verification

```bash
cd contracts
forge build
test $? -eq 0

# All four mock contracts exist
for tok in MockSUSDe MockUSDC MockUSDY MockMETH; do
  forge inspect $tok methods | grep -q "faucet" || { echo "$tok missing faucet"; exit 1; }
  forge inspect $tok methods | grep -q "mint" || { echo "$tok missing mint"; exit 1; }
done

# Decimals correctness (forge inspect can't read constants directly; test via test contract)
forge test --match-test test_decimals_AllCorrect -vvv 2>&1 | grep -q "PASS"

# Faucet cooldown enforced
forge test --match-test test_faucet_CooldownEnforced -vvv 2>&1 | grep -q "PASS"

# Unit tests pass
forge test --match-contract MockTokenTest 2>&1 | grep -E "\[PASS\]" | wc -l | awk '$1 >= 16 {exit 0} {exit 1}'
```

---

## Notes for coding agent

- **`MockFaucetToken.sol` abstract base** keeps the 4 mocks under 400 LOC each (a single token is ~80 LOC if it inherits the base; ~200 LOC if it reimplements faucet logic).
- **Decimals match Mainnet** for each token (USDC = 6, sUSDe/USDY/mETH = 18). Verified via `research/concierge/03-providers/*.md` + the AUDIT-2026-06-04.md re-verification.
- **Faucet caps + cooldowns** are intentionally generous for a demo. The 24h cooldown stops trivial Sybil drain; the per-call cap stops one wallet draining the supply with massive mints. Tune later if abuse surfaces.
- **`MINTER_ROLE` is granted to the deployer** (typically OPS multisig) so admin-mint can be used for test setup (`script/SeedSepolia.s.sol` in story-18 calls `mint()` to fund demo accounts that bypass the faucet rate limit).
- **No fancy rebasing or yield mechanics** — these are simple ERC-20s. The agent treats them as flat tokens; yield illusion comes from MockAaveOracle's price drift (story-16), not from token-side rebasing.
- **Reference contracts to mirror interface compatibility:**
  - Real sUSDe: `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2` (Mainnet) — get `name()` / `symbol()` / `decimals()` to match exactly
  - Real USDC on Mantle: `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`
  - Real USDY: `0x5bE26527e817998A7206475496fDE1E68957c5A6`
  - Real mETH: `0xcDA86A272531e8640cD7F1a92c01839911B90bb0`
- The agent runtime's address resolution (story-20's `@mpilot/shared/addresses.ts`) routes by chain id — Mainnet (5000) → real addresses, Sepolia (5003) → these mock addresses populated by deploy script (story-18).
- Cross-ref: ADR-012 (Sepolia playground), `archive/patron-2026-06-02/docs/stories/story-15-mock-susde-usdc-usdy-meth.md` (Patron-pattern reference).
- All files MUST stay under 400 LOC.
