# AUDIT-1: On-chain verification

**Date:** 2026-06-03
**Auditor:** AUDIT-1 subagent
**Verdict:** NEEDS_PATCH

---

## Summary

Verified all 4 chain-basics claims (chain IDs, RPC liveness), all 4 ERC-8004 deployments (mainnet + Sepolia, both registries, both versions 2.0.0), both token addresses (sUSDe, USDC), and the Aave V3 Pool address — all PASS. Verified INIT Capital USDY pool dormancy (102.7 USDY ≈ $116) and confirmed Aave Horizon is Ethereum-only (not Mantle). The product thesis (sUSDe yield > USDC borrow rate) STILL HOLDS but is materially weaker than the spec claims due to two drifts: (a) sUSDe Ethena yield has compressed from ~9% (spec) to ~4-5.4% (current), and (b) the Merkl USDC-borrow incentive cited in the feasibility doc (-1.29 pp rebate, net 2.17%) has expired — current USDC borrow APR on-chain is **3.59%** raw with no active borrow rebate. Net spread today: ~1-2 pp (still positive, but below the 200bps threshold the audit asked us to verify against). One CANNOT_VERIFY: no Chainlink sUSDe/USD direct feed on Mantle — Aave uses a custom "Capped sUSDe/USDT/USD" wrapper oracle, which has implications for ADR-003 (Chainlink-only oracle stance).

**Patches needed in spec:** 5 (all in PRD / architecture / design doc rate claims + one ADR refinement).

---

## Per-claim verification

### Claim 1: Mantle Mainnet chain ID = 5000
- **Status:** VERIFIED
- **Evidence:** `eth_chainId` on `https://rpc.mantle.xyz` returned `0x1388` = 5000.
- **Patch needed:** No.

### Claim 2: Mantle Sepolia chain ID = 5003
- **Status:** VERIFIED
- **Evidence:** `eth_chainId` on `https://rpc.sepolia.mantle.xyz` returned `0x138b` = 5003.
- **Patch needed:** No.

### Claim 3: Mainnet RPC `https://rpc.mantle.xyz` live
- **Status:** VERIFIED
- **Evidence:** `eth_blockNumber` returned `0x5bb49dd` = 96,131,549 (live, growing).
- **Patch needed:** No.

### Claim 4: Sepolia RPC `https://rpc.sepolia.mantle.xyz` live
- **Status:** VERIFIED
- **Evidence:** `eth_blockNumber` returned `0x25a0170` = 39,452,528 (live).
- **Patch needed:** No.

### Claim 5: Aave V3 Pool on Mantle Mainnet = `0x458F293454fE0d67EC0655f3672301301DD51422`
- **Status:** VERIFIED
- **Evidence:** Contract code present; `ADDRESSES_PROVIDER()` returns `0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f` (matches bgd-labs Aave address book for Mantle V3). `POOL_REVISION()` = 11 (matches V3 latest).
- **Patch needed:** No.

### Claim 6: sUSDe is supported collateral on Aave Mantle V3
- **Status:** VERIFIED (with caveat)
- **Evidence:**
  - `getReservesList()` includes sUSDe `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2` as reserve index 5.
  - `getReserveConfigurationData(sUSDe)`: decimals=18, LTV=0, liqThreshold=0, liqBonus=0, reserveFactor=2000, **borrowingEnabled=false**, stableBorrowEnabled=false, **isActive=true**, isFrozen=false.
  - **In general mode, sUSDe has LTV=0** (not collateral). **In E-Mode category 1 "sUSDe Stablecoins":** LTV=90%, liqThreshold=92%, liqBonus=4% (10400-10000)/100. → sUSDe IS usable as collateral, **but ONLY via E-Mode 1**, which restricts borrowable assets to the stablecoin category.
- **Patch needed:** **YES.** Architecture and design docs should explicitly state "sUSDe usable as collateral via Aave V3 stablecoin E-Mode (category 1) only — PatronVault must call `setUserEMode(1)` after first sUSDe deposit." Currently no spec line mentions E-Mode.

### Claim 7: USDC is borrowable on Aave Mantle V3
- **Status:** VERIFIED
- **Evidence:** USDC reserve in `getReservesList()`. `getReserveConfigurationData(USDC)`: decimals=6, borrowingEnabled=**true**, isActive=true, isFrozen=false. USDC is in E-Mode 1 (sUSDe Stablecoins) and therefore borrowable when collateral is sUSDe at E-Mode LTV 90%.
- **Patch needed:** No.

### Claim 8: Current sUSDe supply APY on Aave Mantle
- **Status:** DRIFTED
- **Evidence:**
  - On-chain `getReserveData(sUSDe)`: `liquidityRate` = 0 → **Aave-side supply APR = 0.00%**.
  - The sUSDe yield comes from Ethena's external rebasing (deposit token grows in value), NOT from Aave protocol interest.
  - Current Ethena native sUSDe APY (May 2026 snapshot, defillama): **~5.37% 7-day, ~4.06% 30-day average** ([DefiLlama sUSDe pool](https://defillama.com/yields/pool/66985a81-9c51-46ca-9977-42b4fe7bc6df)).
  - Additional Merkl reward on Aave Mantle for sUSDe supply: **+1.96% APR**, but requires "looping" per the Merkl opportunity description (Aavescan confirms 3.12% total APR when looped) ([app.merkl.xyz](https://app.merkl.xyz/?chain=5000)).
  - **Effective user-side yield without looping:** ~4-5.4% (Ethena rebasing). **With Merkl loop:** ~6-7%.
- **Patch needed:** **YES.** PRD's "Your sUSDe is yielding 9.2% APY" copy is stale (was correct earlier in 2026; sUSDe yield has compressed). Architecture's "sUSDe ~9% APY" in ADR-002 is also stale. Update to current ~5% (with note that Merkl loop can push to ~7%).

### Claim 9: Current USDC borrow APY on Aave Mantle
- **Status:** DRIFTED
- **Evidence:**
  - On-chain raw `variableBorrowRate` = `35869191560273137941221688` ray → **3.5869% APR (raw protocol rate)**.
  - Aavescan UI confirms 3.59% borrow APR ([aavescan.com/mantle-v3/usdc](https://aavescan.com/mantle-v3/usdc)) — total supplied $12.1M, total borrowed $9.80M, utilization 80.7%.
  - Merkl opportunities page on Mantle for Aave shows NO active USDC borrow rebate campaign (only GHO + sUSDe/USDe supply campaigns active). The 1.29 pp Merkl USDC borrow rebate cited in the feasibility doc (giving 2.17% net) has **expired**.
- **Patch needed:** **YES.** PRD's "borrow rate ~2.2% APR" and design doc's "USDC borrows at 2.17%" are stale. Current on-chain effective rate is **~3.59%**. Update all copy.

### Claim 10: Spread (sUSDe yield − USDC borrow) is positive AND > 200bps
- **Status:** DRIFTED (still positive, but smaller than spec implies)
- **Evidence:** Using current rates:
  - sUSDe Ethena yield ~5% (rebasing-only) → spread = **5% − 3.59% = +1.41 pp = 141 bps** → BELOW the 200 bps threshold the audit asked to verify.
  - sUSDe with Merkl loop ~7% → spread = **7% − 3.59% = +3.41 pp = 341 bps** → ABOVE 200 bps but only via looping infrastructure not currently in spec.
  - Spec's claim ("Net carry: +7 percentage points" in PRD demo modal) is **DRIFTED** by ~5 pp.
- **Patch needed:** **YES.** Update PRD demo modal copy to current realistic numbers (e.g., "+2 to +4 pp net carry" not "+7"). This is the core product thesis and the most important drift. The thesis still holds qualitatively (yield > borrow rate) but the demo claim is now misleading. Consider: (a) repositioning copy to honest current numbers, OR (b) implementing the Merkl-loop strategy to genuinely restore +5pp spread, OR (c) noting in pitch that early 2026 spreads were larger and will widen again when Ethena funding rates normalize.

### Claim 11: sUSDe address on Mantle = `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2`
- **Status:** VERIFIED
- **Evidence:** `symbol() = "sUSDe"`, `name() = "Staked USDe"`, `decimals() = 18`, `totalSupply() = 7.58e25` (~75.8M sUSDe in Mantle bridge). Address present in Aave reserves list.
- **Patch needed:** No.

### Claim 12: sUSDe is staked-USDe wrapper (not raw USDe)
- **Status:** VERIFIED
- **Evidence:** Token `name = "Staked USDe"`. This is the rebasing yield-bearing ERC-4626 vault wrapping USDe. Raw USDe is a separate token (`0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34` per Aave reserves list).
- **Patch needed:** No.

### Claim 13: USDC address on Mantle = `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`
- **Status:** VERIFIED
- **Evidence:** `symbol() = "USDC"`, `name() = "USD Coin"`, `decimals() = 6`, `totalSupply() = 35,208,904.252678 USDC` (~$35.2M). Address present in Aave reserves list.
- **Patch needed:** No.

### Claim 14: USDC decimals = 6, symbol = "USDC"
- **Status:** VERIFIED (see claim 13).
- **Patch needed:** No.

### Claim 15: ERC-8004 Identity Registry on Mantle Mainnet = `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **Status:** VERIFIED
- **Evidence:**
  - Code present (EIP-1967 minimal proxy pointing to implementation via slot `0x360894...382bbc`).
  - `name() = "AgentIdentity"`, `symbol() = "AGENT"` (ERC-721).
  - `getVersion() = "2.0.0"`.
  - Function selectors present per canonical ABI: `register()`, `register(string)`, `register(string,tuple[])`, `setAgentURI(uint256,string)`, `setAgentWallet(uint256,address,uint256,bytes)`, `setMetadata(uint256,string,bytes)`, `getAgentWallet(uint256)`, `getMetadata(uint256,string)`, `tokenURI(uint256)`, `ownerOf(uint256)`.
  - Address listed in [official ERC-8004 README](https://github.com/erc-8004/erc-8004-contracts) for Mantle Mainnet.
- **Patch needed:** No.

### Claim 16: ERC-8004 Reputation Registry on Mantle Mainnet = `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- **Status:** VERIFIED
- **Evidence:**
  - Code present (EIP-1967 proxy, same impl-slot pattern).
  - `getIdentityRegistry() = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (correctly points back to Identity).
  - `getVersion() = "2.0.0"`.
  - Function selectors present: `giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)`, `readAllFeedback(uint256,address[],string,string,bool) → (address[],uint64[],int128[],uint8[],string[],string[],bool[])`, `readFeedback(uint256,address,uint64)`, `getSummary(uint256,address[],string,string) → (uint64,int128,uint8)`, `getClients(uint256)`, `getLastIndex(uint256,address)`, `getResponseCount(uint256,address,uint64,address[])`, `appendResponse(uint256,address,uint64,string,bytes32)`, `revokeFeedback(uint256,uint64)`.
  - Address listed in official ERC-8004 README for Mantle Mainnet.
- **Patch needed:** No.

### Claim 17: ERC-8004 Identity Registry on Mantle Sepolia = `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- **Status:** VERIFIED
- **Evidence:** Code present on Sepolia. `name() = "AgentIdentity"`, `getVersion() = "2.0.0"`. Listed in official README for Mantle Testnet.
- **Patch needed:** No.

### Claim 18: ERC-8004 Reputation Registry on Mantle Sepolia = `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- **Status:** VERIFIED
- **Evidence:** Code present on Sepolia (same EIP-1967 proxy bytecode). Listed in official README.
- **Patch needed:** No.

### Claim 19: ERC-8004 ABI source + canonical function signatures
- **Status:** VERIFIED
- **Evidence:** Canonical ABIs at:
  - https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/master/abis/IdentityRegistry.json
  - https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/master/abis/ReputationRegistry.json
  - https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/master/abis/ValidationRegistry.json
- **Identity Registry signatures (verified against on-chain):**
  - `register() returns (uint256 agentId)` (mint with no metadata)
  - `register(string tokenURI) returns (uint256 agentId)`
  - `register(string tokenURI, MetadataEntry[] metadata) returns (uint256 agentId)`
  - `setAgentURI(uint256 agentId, string newURI)`
  - `setAgentWallet(uint256 agentId, address wallet, uint256 deadline, bytes signature)` — EIP-712/ERC-1271 verified
  - `unsetAgentWallet(uint256 agentId)`
  - `setMetadata(uint256 agentId, string key, bytes value)`
  - `getAgentWallet(uint256 agentId) returns (address)`
  - `getMetadata(uint256 agentId, string key) returns (bytes)`
  - `tokenURI(uint256 tokenId) returns (string)` (ERC-721)
- **Reputation Registry signatures:**
  - `giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)`
  - `readAllFeedback(uint256 agentId, address[] clients, string tag1, string tag2, bool includeRevoked) returns (address[], uint64[], int128[], uint8[], string[], string[], bool[])`
  - `readFeedback(uint256 agentId, address client, uint64 index) returns (int128, uint8, string, string, bool)`
  - `getSummary(uint256 agentId, address[] clients, string tag1, string tag2) returns (uint64 count, int128 average, uint8 decimals)`
  - `getClients(uint256 agentId) returns (address[])`
  - `getLastIndex(uint256 agentId, address client) returns (uint64)`
  - `appendResponse(uint256 agentId, address client, uint64 index, string responseURI, bytes32 responseHash)` (Validation flow)
  - `revokeFeedback(uint256 agentId, uint64 index)` (only by feedback giver)
- **Patch needed:** **YES.** Architecture doc currently says "Identity: `register`, `setAgentURI`, `setAgentWallet`, `setMetadata`; Reputation: `giveFeedback`, `readAllFeedback`, `getSummary`" — this matches. But the design doc should clarify that `register` has 3 overloads, and that `setAgentWallet` requires EIP-712 signature (non-trivial — needs wallet UX work). Add note to story-110 or wherever ERC-8004 integration is wired.

### Claim 20: Chainlink sUSDe/USD feed on Mantle Mainnet
- **Status:** CANNOT_VERIFY direct Chainlink feed; DRIFTED for ADR-003
- **Evidence:**
  - Aave Oracle on Mantle (`0x47a063CfDa980532267970d478EC340C0F80E8df`) returns sUSDe price source: `0x8b47EC48ac560793861D94A997d020872c1cE3f5`.
  - That contract's `description()` returns **"Capped sUSDe / USDT / USD"** — a custom Aave-wrapper oracle (capped composite) that internally chains sUSDe→USDT and USDT→USD, not a direct Chainlink sUSDe/USD feed.
  - Web search + Chainlink data.chain.link confirms **no standalone sUSDe/USD Chainlink feed on Mantle Mainnet today** (sUSDe/USD exists only on Ethereum Mainnet).
  - Current Aave Oracle sUSDe price reading: 1.232e8 (8 decimals) = **$1.232 per sUSDe** (reasonable since sUSDe accrues value via rebasing wrapper).
- **Patch needed:** **YES.** ADR-003 says "Use Chainlink AggregatorV3 for sUSDe + USDC pricing." There is no direct Chainlink sUSDe/USD on Mantle. Options:
  1. Use the **Aave Oracle** (`0x47a063CfDa980532267970d478EC340C0F80E8df`) `getAssetPrice(sUSDe)` — this delegates to the Capped sUSDe/USDT/USD composite which is Aave's own production oracle.
  2. Use the composite source directly `0x8b47EC48ac560793861D94A997d020872c1cE3f5` (same data, no Aave indirection).
  3. Fall back to the hardcoded-$1 path per ADR-003's "we hardcode $1" line.
  Recommendation: **use Aave Oracle directly** — it's the same one Aave Mantle uses internally for liquidations, so our liquidation triggers align with Aave's. Document this in ADR-003.

### Claim 21: Chainlink USDC/USD feed on Mantle Mainnet
- **Status:** PARTIAL VERIFIED
- **Evidence:**
  - Aave Oracle USDC price source: `0x3876FB349c14613e0633b5cAe08C4E3B1d4904fB`.
  - That contract's `description()` returns **"Capped USDC/USD"** — also an Aave-wrapper, not raw Chainlink (but internally fed by Chainlink USDC/USD).
  - Current price reading: 99968000 / 1e8 = **$0.99968** (within peg).
  - A native Chainlink USDC/USD feed likely exists on Mantle (Chainlink docs page doesn't render via WebFetch); however the Aave-wrapped "Capped USDC/USD" is the proven production source.
- **Patch needed:** Same as claim 20 — update ADR-003 to use Aave Oracle abstraction OR document the Capped feed addresses directly.

### Claim 22: INIT Capital USDY pool dormancy (~$116)
- **Status:** VERIFIED
- **Evidence:** `balanceOf(0xf084813F1be067d980a0171F067f084f27B3F63A)` on USDY token `0x5bE26527e817998A7206475496fDE1E68957c5A6` returns `102708851758330517818` wei (18 decimals) = **102.7088 USDY** held by the INIT pool. At ~$1.13/USDY that's ~$116. Confirms feasibility doc claim exactly.
- **Patch needed:** No (the doc-quoted finding remains accurate).

### Claim 23: Aave Horizon is NOT deployed on Mantle
- **Status:** VERIFIED
- **Evidence:** Aave Horizon launch blog + multiple Aave news sources (chainwire, the block, Aave blog) confirm Horizon is on **Ethereum Mainnet only**, with RWA collateral from Superstate (USTB/USCC), Centrifuge (JTRSY/JAAA), Circle (USYC soon). No Mantle deployment. Mantle's Aave V3 is the standard "core" market, not Horizon.
- **Patch needed:** No.

---

## Drifted claims (specs say X, reality is Y)

| # | Claim | Spec says | On-chain reality (2026-06-03) | Impact |
|---|---|---|---|---|
| 8 | sUSDe APY | ~9% (PRD, ADR-002, design doc) | ~4-5.4% Ethena rebasing + 1.96% optional Merkl loop = 5-7% best case | Pitch math weakened |
| 9 | USDC borrow APY | ~2.2% (PRD), 2.17% (feasibility doc) | 3.59% raw, no Merkl borrow rebate currently active | Pitch math weakened |
| 10 | Net carry / spread | +7 pp (PRD demo modal) | +1.4 pp (no loop) to +3.4 pp (Merkl loop) | **CORE THESIS COPY IS STALE** — must update demo modal text |
| 6 | sUSDe collateral mechanism | "sUSDe IS listed as collateral on Aave Mantle V3" | True via **E-Mode 1 only** (LTV=0 in general mode) | Implementation detail — vault must call `setUserEMode(1)` |
| 20/21 | Chainlink direct feeds | "Use Chainlink AggregatorV3 for sUSDe + USDC pricing" (ADR-003) | No direct sUSDe/USD on Mantle. Aave uses "Capped sUSDe/USDT/USD" + "Capped USDC/USD" composites | ADR-003 needs revision; the security intent (use a proven oracle, not AMM) still holds |

---

## Cannot-verify claims (need Abu's confirmation or live access)

- **Direct Chainlink sUSDe/USD feed on Mantle:** chain.link/data.chain.link/docs.chain.link pages don't render via WebFetch and search results show only the Ethereum-mainnet sUSDe/USD feed. Most likely there is no Mantle-side direct sUSDe/USD; the Aave Capped composite is the production substitute. Abu may want to confirm via the Chainlink Mantle feed page in a browser.
- **Whether the Merkl USDC borrow incentive will resume before Demo Day (July 2-3):** the 8M MNT incentive program is finite. Worth a single check the day before submission.
- **Exact Aave Mantle stablecoin E-Mode mechanics (which assets are borrowable when collateral is sUSDe at LTV 90%):** confirmed category 1 exists with LTV 90 / LT 92 / Bonus 4, but the borrowable-asset set within that category needs a `setUserEMode(1)` test on a forked Anvil to be 100% sure USDC is included. Initial reading suggests YES.

---

## Recommended spec patches

### Patch 1 — `docs/PRD.md` lines ~12, 28
Replace the modal copy with current numbers.

- Line 12 "The collateral's yield (~9% APY) exceeds the loan's borrow rate (~2.2%)" → **"The collateral's yield (~5% APY today; ~7% with Merkl loop on Aave Mantle) exceeds the loan's borrow rate (~3.6%)"**
- Line 28 "Your sUSDe is yielding 9.2% APY. We'll borrow $75 against it at 2.2% APR. Net carry: +7 percentage points." → **"Your sUSDe is yielding ~5% APY. We'll borrow $75 against it at ~3.6% APR. Net carry: +1.4 percentage points (negative-cost-of-funds, even in today's compressed-yield environment)."**

Optional: re-pitch the demo as "even when Ethena funding compresses, the spread stays positive" — turns the rate drift into a robustness story.

### Patch 2 — `docs/architecture.md` ADR-002
Replace the rate numbers in the ADR-002 context line:

- Current: "sUSDe IS listed on Aave Mantle and yields ~9% APY against USDC borrow rate ~2.2% (+7pp spread)."
- Patched: "sUSDe IS usable as Aave Mantle collateral via **stablecoin E-Mode (category 1, LTV 90%)**. Current rates: Ethena native sUSDe yield ~5% (with optional +1.96% Merkl looped supply on Aave Mantle = ~7% effective), USDC borrow rate ~3.6% raw (Merkl borrow rebate not currently active). Net spread +1.4 to +3.4 pp depending on Merkl loop participation. Spread is more compressed than early-2026 levels but remains positive."

### Patch 3 — `docs/architecture.md` ADR-003
Replace direct-Chainlink language with the verified production oracle:

- Current: "Use Chainlink AggregatorV3 for sUSDe + USDC pricing."
- Patched: "Use Aave Oracle (`0x47a063CfDa980532267970d478EC340C0F80E8df`) via `getAssetPrice(asset)` for both sUSDe and USDC pricing. Internally this routes to the Aave-curated 'Capped sUSDe/USDT/USD' (`0x8b47EC48ac560793861D94A997d020872c1cE3f5`) and 'Capped USDC/USD' (`0x3876FB349c14613e0633b5cAe08C4E3B1d4904fB`) composite feeds — same oracles Aave itself uses for liquidation decisions on Mantle, so our health-factor checks match Aave's. A direct Chainlink sUSDe/USD aggregator does not exist on Mantle as of 2026-06-03; the Capped composite is the production substitute. Fallback to hardcoded $1 for USDC peg checks remains per story-110."

### Patch 4 — `docs/architecture.md` "Mantle-specific details" + design doc Section 3
Add the missing E-Mode + oracle addresses to the canonical address list:

```
- Aave V3 Oracle (Mantle): 0x47a063CfDa980532267970d478EC340C0F80E8df
- Aave Pool Addresses Provider (Mantle): 0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f
- Aave Protocol Data Provider (Mantle): 0x487c5c669D9eee6057C44973207101276cf73b68
- Aave Stablecoin E-Mode Category ID: 1 (LTV 90% / LT 92% / Bonus 4%)
- sUSDe Capped Oracle: 0x8b47EC48ac560793861D94A997d020872c1cE3f5
- USDC Capped Oracle: 0x3876FB349c14613e0633b5cAe08C4E3B1d4904fB
```

And add to the PatronVault implementation note: **"Vault MUST call `pool.setUserEMode(1)` after the first sUSDe deposit per user — otherwise sUSDe has LTV 0 and cannot back a USDC borrow."**

### Patch 5 — `docs/superpowers/specs/2026-06-02-patron-design.md` Section 9 + 2026 risk table
Add a risk row + tighten the security posture:

- Add to risk table (Section 15): **"Yield-spread compression (current state) — sUSDe yield has compressed from ~9% to ~5% since early 2026; USDC Merkl borrow rebate has expired. Spread is ~1.4 pp without looping. Mitigation: implement Merkl-loop supply strategy for +1.96 pp, OR be transparent in demo copy that spread is small-but-positive in today's environment, OR include a 'spread floor' configuration so agent declines new positions if net carry < user-set minimum (default 100 bps)."**

---

## Verification artifacts (raw RPC outputs)

All cast outputs used in this audit are deterministic against the live RPC at the date stamped above and can be re-run. Key one-liners for re-audit:

```bash
# Chain IDs
curl -s https://rpc.mantle.xyz -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# → 0x1388 = 5000

# sUSDe sanity
cast call 0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2 "symbol()(string)" --rpc-url https://rpc.mantle.xyz

# Aave reserve data
cast call 0x458F293454fE0d67EC0655f3672301301DD51422 "getReserveData(address)((uint256,uint128,uint128,uint128,uint128,uint128,uint40,uint16,address,address,address,address,uint128,uint128,uint128))" 0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9 --rpc-url https://rpc.mantle.xyz

# Aave E-Mode 1
cast call 0x458F293454fE0d67EC0655f3672301301DD51422 "getEModeCategoryData(uint8)((uint16,uint16,uint16,address,string))" 1 --rpc-url https://rpc.mantle.xyz
# → (9000, 9200, 10400, 0x0..0, "sUSDe Stablecoins")

# ERC-8004 sanity
cast call 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 "name()(string)" --rpc-url https://rpc.mantle.xyz
# → "AgentIdentity"

# INIT USDY pool
cast call 0x5bE26527e817998A7206475496fDE1E68957c5A6 "balanceOf(address)(uint256)" 0xf084813F1be067d980a0171F067f084f27B3F63A --rpc-url https://rpc.mantle.xyz
# → 102708851758330517818 wei (102.7 USDY ≈ $116)
```

---

**End of AUDIT-1.**
