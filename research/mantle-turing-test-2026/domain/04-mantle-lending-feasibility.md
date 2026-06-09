# Mantle Lending Feasibility — Yield-Funded Stablecoin Loans

**Research date:** 2026-06-02
**Research window:** ~30 min
**Scope:** Can a smart-contract product on Mantle lock USDY (or mUSD) as collateral and borrow USDC/USDT at a rate below USDY's native yield, such that the yield pays off the loan?

---

## TOP-LINE VERDICT: **CONDITIONAL-GO**

There IS a viable path, but it is **NOT** the one a naive "just use Aave" plan assumes.

- **Aave V3 on Mantle is live (since Feb 11, 2026)** with USDC at ~2.17% borrow APY and ~$550M total market size. But **Aave Mantle does NOT currently list USDY or mUSD as collateral.** Listed collateral on Aave Mantle: WETH, WMNT, USDT0, USDC, USDe, sUSDe, FBTC, syrupUSDT, wrsETH, GHO. ([address book](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Mantle.sol), [Aavescan](https://aavescan.com/mantle-v3))
- **INIT Capital DOES have a USDY lending pool deployed** (`0xf084813F1be067d980a0171F067f084f27B3F63A`) but it holds only ~$116 of USDY and the official Mantle parameter page lists USDY under "Yield Bearing Assets" *without* a published collateral/borrow factor — i.e., it is technically deployed but operationally dormant. ([INIT dev docs](https://dev.init.capital/contract-addresses/mantle), [INIT Mantle parameters](https://docs.init.capital/borrowing/health-factor/mantle-parameters))
- **Aave Horizon (RWA-permissioned) is on Ethereum mainnet, not Mantle.** Horizon's launch collateral is Superstate USTB/USCC + Centrifuge JTRSY/JAAA, with Circle USYC coming soon. **USDY is NOT a Horizon collateral asset.** ([Horizon launch blog](https://aave.com/blog/horizon-launch))
- **Lendle is shutting down** (homepage banner). ([lendle.xyz](https://lendle.xyz/))
- **ZeroLend has ceased operations** (Feb 17, 2026). ([CoinDesk](https://www.coindesk.com/markets/2026/02/17/defi-protocol-zerolend-shuts-down-after-3-years-citing-inactive-chains-and-hacks))

The economics work in principle — USDY pays 4.65% APY and USDC borrows at 2.17% on Aave Mantle, a **~2.48 pp positive spread**. But the *infrastructure* to use USDY as the collateral leg in that trade is the bottleneck.

**Path forward (recommended at infrastructure level):**

Use **mETH or sUSDe as the listed Aave Mantle collateral** in the v1 demo while we wait for/lobby for USDY listing — or alternatively, build the integration *on INIT Capital* and lobby INIT to publish a USDY collateral factor (lowest-friction path because USDY is already a pool there).

For the hackathon prototype, the cleanest demo is: **deposit USDe or sUSDe (~native ~6% yield) on Aave Mantle, borrow USDC at 2.17%, disburse loan, let supply yield pay it down.** This is the same economic shape as the USDY pitch, demonstrably works *today*, and avoids the USDY listing blocker.

---

## Q1 — Aave V3 on Mantle Mainnet

**Deployed: YES.** Launched **2026-02-11** via joint Bybit + Mantle + Aave partnership. ([PR Newswire](https://www.prnewswire.com/news-releases/bybit-mantle-and-aave-launch-strategic-mainnet-integration-to-scale-institutional-grade-defi-liquidity-302685269.html))

**Canonical contracts** (from [bgd-labs/aave-address-book/src/AaveV3Mantle.sol](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Mantle.sol)):

| Component | Address |
|---|---|
| PoolAddressesProvider | `0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f` |
| **Pool** | **`0x458F293454fE0d67EC0655f3672301301DD51422`** |
| PoolConfigurator | `0x719755fC1ACf2f9079B0Cbc56e23712c09Ab8626` |
| AaveOracle | `0x47a063CfDa980532267970d478EC340C0F80E8df` |
| AaveProtocolDataProvider | `0x487c5c669D9eee6057C44973207101276cf73b68` |
| L2Encoder | `0x1F25c3f23D05984DBA88EC59F2109fC4F29833eA` |
| WETH Gateway | `0x9C6cCAC66b1c9AbA4855e2dD284b9e16e41E06eA` |

**Listed assets** (live Aavescan snapshot, 2026-06-02):

| Asset | Underlying address | Supply APY | Borrow APY | Supplied | Borrowed |
|---|---|---|---|---|---|
| USDT0 | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` | 5.20% | **2.28%** | $203.1M | $170.3M |
| sUSDe | `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2` | 0.00%* | — | $90.7M | — |
| syrupUSDT | `0x051665f2455116e929b9972c36d23070F5054Ce0` | 0.00%* | — | $90.2M | — |
| WETH | `0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111` | 1.68% | 2.35% | $70.3M | $59.3M |
| wrsETH | `0x93e855643e940D025bE2e529272e4Dbd15a2Cf74` | 0.00%* | — | $64.4M | — |
| USDC | `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9` | 6.79% | **2.17%** | $16.2M | $12.5M |
| GHO | `0xfc421aD3C883Bf9E7C4f42dE845C4e4405799e73` | 6.72% | 1.50% | $9.00M | $5.30M |
| FBTC | `0xC96dE26018A54D51c097160568752c4E3BD6C364` | 0.00%* | — | $2.99M | — |
| USDe | `0x5d3a1Ff2b6BAb83b63cd9AD0987...e0F9b16C2a` (variant) | 2.70% | 2.30% | $2.14M | $1.04M |
| WMNT | `0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8` | 0.00%* | — | $894K | — |

*Note: sUSDe, syrupUSDT, wrsETH, FBTC, WMNT show 0.00% supply APY in protocol terms — they are collateral-only listings (supply allowed but cannot be borrowed) plus emission-driven rewards via Merkl.*

**USDY: NOT LISTED.** ❌
**mUSD: NOT LISTED.** ❌

**Risk parameters** (from the ARFC deployment proposal, [governance.aave.com](https://governance.aave.com/t/arfc-deploy-aave-v3-on-mantle/20542) and the follow-up [Direct-to-AIP collateral enablement](https://governance.aave.com/t/direct-to-aip-aave-v3-mantle-collateral-enablement-emode-expansion-and-isolation-updates-usdt0-usde-eth-xaut/24153)):

- **Stablecoins** (USDC, USDT0, USDe, GHO): launched with LTV = 0% in general mode (i.e., not collateral by default), with **E-Mode** stablecoin category providing LTV 72–90%, liquidation threshold 75–93%, liquidation bonus 5.5–8.5%. The stablecoin E-Mode is the on-ramp to use them as collateral against each other.
- **WETH**: LTV 80%, Liq Threshold 83%, Liq Bonus 8.5%.
- **MNT** (isolation mode): LTV 55%, Liq Threshold 60%, debt ceiling $10M.
- XAUT-Stablecoin E-Mode is being added (collateral: XAUT; borrowable: USDT0, USDC, GHO).

There is currently **no governance proposal on file to list USDY or mUSD on Aave Mantle.** Phase 2.0 of the original ARFC mentions "Real World Assets (permissionless)" and "Yield Bearing Stablecoins" as a category but does not name USDY/mUSD specifically.

**Aave Mantle incentive program:** 8M MNT + 1.5M GHO allocated for supplier/borrower incentives. This is reflected in the deposit/borrow APY tables above (the "rewards" component of the rate is Merkl emissions). USDC: ~4.38% of the 6.79% supply APY is Merkl rewards. ([Chainwire announcement](https://chainwire.org/2026/02/11/bybit-mantle-and-aave-launch-strategic-mainnet-integration-to-scale-institutional-grade-defi-liquidity/))

---

## Q2 — Aave V3 on Mantle Sepolia (testnet)

**Deployed: NO** — there is no Mantle-Sepolia entry in the bgd-labs/aave-address-book or in the official Aave testnet docs. Confirmed testnet deployments are limited to Sepolia, Arbitrum Sepolia, Base Sepolia, Scroll Sepolia, Optimism Sepolia, Avalanche Fuji, Fantom Testnet. ([Aave V3 testnet docs](https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses/), [aave-address-book](https://github.com/bgd-labs/aave-address-book))

**Implication for hackathon:** We cannot prototype against an "Aave Mantle Sepolia" instance because it does not exist. Options:
1. Fork Mantle mainnet locally (Anvil/Hardhat) and prototype against the real Pool address `0x458F293454fE0d67EC0655f3672301301DD51422`. This is the standard approach and works for demo.
2. Prototype on Ethereum Sepolia using the real Aave Sepolia deployment (different chain, but same Aave V3 interface).
3. Live-deploy small to Mantle mainnet — gas costs are negligible (see Q6), so demo against mainnet with $1 positions is realistic.

Mantle Sepolia faucets exist ([faucet.sepolia.mantle.xyz](https://faucet.sepolia.mantle.xyz/), [Chainlink](https://faucets.chain.link/mantle-sepolia), [QuickNode](https://faucet.quicknode.com/mantle/sepolia)) but Aave is not on them.

---

## Q3 — Aave Horizon (institutional RWA collateral)

**Deployed: YES, on Ethereum mainnet only.** Aave Horizon is the permissioned RWA market launched ~Aug 2025, reached ~$423M TVL by March 2026. ([Aave Horizon launch](https://aave.com/blog/horizon-launch), [The Block](https://www.theblock.co/post/368440/aave-labs-horizon-stablecoin-borrowing-tokenized-rwas))

**Supported collateral at launch:**
- Superstate **USTB** (tokenized short-duration Treasuries)
- Superstate **USCC** (crypto carry)
- Centrifuge **JTRSY** (Janus Henderson AAA CLO – Treasury)
- Centrifuge **JAAA** (Janus Henderson AAA CLO)
- Circle **USYC** — coming soon

**USDY: NOT a Horizon collateral asset.** ❌
**mUSD: NOT a Horizon collateral asset.** ❌
**mETH: NOT a Horizon collateral asset.** ❌
**MI4: NOT a Horizon collateral asset.** ❌

**Access:** Permissioned. Suppliers of the RWA collateral must be KYC'd. Borrowers (of stablecoins) and stablecoin liquidity providers can be permissionless on the borrow side per Aave's blog, but the RWA side is institutional-only. ([BeInCrypto](https://beincrypto.com/aave-unveils-horizon-permissioned-rwa-market-for-institutions/))

**Implication:** Horizon is not a path for a consumer Mantle BNPL flow. Not on Mantle and not permissionless on the collateral side.

---

## Q4 — Alternative Mantle lending protocols

### Lendle — **SHUTTING DOWN** ❌

Homepage banner reads "Lendle is shutting down. Please close your positions and remove your liquidity." Date of shutdown not in public statement. ([lendle.xyz](https://lendle.xyz/), DeFi Llama profile still exists but TVL is dropping)

Historically Lendle was the largest Mantle-native money market (~$50M+ TVL at peak) and was the most likely candidate for USDY listing. Its shutdown narrows the field meaningfully.

### ZeroLend — **DEFUNCT** ❌

Announced cessation of operations 2026-02-17, set most markets to 0% LTV, urged users to withdraw. Never had a meaningful Mantle deployment to begin with. ([CoinDesk](https://www.coindesk.com/markets/2026/02/17/defi-protocol-zerolend-shuts-down-after-3-years-citing-inactive-chains-and-hacks), [Kucoin](https://www.kucoin.com/news/flash/zerolend-announces-cease-of-operations-sets-most-markets-to-0-ltv-and-urges-users-to-withdraw-funds))

### INIT Capital — **LIVE but tiny** ⚠️

- **TVL:** $4.45M total ($4.33M on Mantle, $0.12M on Blast). Borrows: $1.14M. ([DefiLlama](https://defillama.com/protocol/init-capital))
- **Audited:** Yes (multiple audits via Secure3 and similar).
- **Assets supported as lending pools** (from [INIT dev docs](https://dev.init.capital/contract-addresses/mantle)): WETH, WBTC, WMNT, USDC, USDT, mETH, **USDY**, USDe, fBTC.
- **USDY lending pool:** `0xf084813F1be067d980a0171F067f084f27B3F63A` (proxy, impl `0x423bB757...44b3329FD`). Currently holds only **102.71 USDY (~$116)** — operationally dormant.
- **Modes:** General Mode, Non-Stable Mode, Stable Mode, LST Mode. ([Mantle parameters](https://docs.init.capital/borrowing/health-factor/mantle-parameters))
  - General Mode collateral factors: USDC 0.93, USDT 0.90, WETH 0.85, WBTC/MNT/mETH/wstETH 0.80.
  - Stable Mode collateral factors: USDC 0.95, USDT 0.92.
  - **USDY is listed under "Yield Bearing Assets" without a published collateral/borrow factor** — meaning the pool exists but it is not assigned to a usable mode with risk parameters. This is the biggest infrastructure gap for our product.
- INIT MIP-28 grants INIT access to up to 300M USDx, 250K ETH, 2K BTC, 400M MNT from Mantle Treasury for liquidity bootstrapping — meaningful runway. ([Medium](https://medium.com/@InitCapital_/init-capital-secures-position-in-200m-catalyzed-capital-pool-from-mantle-ecofund-paving-way-to-1353d98e6028))

### Pendle — **NOT a lending protocol** (yield trading)

Pendle is integrated on Mantle and supports PT/YT tokenization of yield-bearing assets including USDe and USDY. PT tokens are tradable claims on principal (lendable in spirit, but on Pendle you trade yield, you don't deposit collateral and take a loan). Pendle PT-USDY could in principle be used as Aave collateral, but **no PT-USDY market is listed on Aave Mantle currently.** ([Pendle docs](https://docs.pendle.finance/pendle-v2/Introduction))

### Compound — **NOT deployed on Mantle.**

### Morpho / Euler / Silo — Not currently deployed on Mantle (none surfaced in DefiLlama's Mantle lending rankings).

### Summary of viable Mantle lending markets

| Protocol | Live | TVL | USDC borrow | USDY collateral | USDC borrow against USDY |
|---|---|---|---|---|---|
| Aave V3 Mantle | ✅ | $550M | 2.17% | ❌ NOT LISTED | impossible today |
| INIT Capital | ✅ | $4.45M | (interactive, ~variable) | ⚠️ pool exists, no risk params | technically deployed, unsafe |
| Lendle | ❌ shutting down | dropping | n/a | n/a | n/a |
| ZeroLend | ❌ defunct | n/a | n/a | n/a | n/a |
| Pendle (PT trade) | ✅ | — | n/a (not a lender) | n/a | n/a |
| Aave Horizon | ✅ (Ethereum, not Mantle) | $423M | n/a (institutional) | ❌ | n/a |

---

## Q5 — Borrow rate vs USDY yield differential

### Current rates (2026-06-02)

- **USDY APY (Ondo official):** **4.65%** (April 2026 snapshot; April 25, 2026 reading). Yield is "3-month T-bill (~4.30%) + blended bank-deposit yield − 25bps Ondo fee." ([RWA.xyz USDY](https://app.rwa.xyz/assets/USDY), [Ondo blog](https://ondo.finance/usdy))
- **Aave Mantle USDC borrow APY:** **2.17%** total (3.45% protocol rate minus 1.29% Merkl rewards rebate). ([Aavescan USDC](https://aavescan.com/mantle-v3/usdc))
- **Aave Mantle USDT0 borrow APY:** **2.28%**.
- **Aave Mantle GHO borrow APY:** **1.50%** (cheapest borrow on the market thanks to GHO incentive).

### Spread analysis

| Configuration | Collateral yield | Borrow rate | Net spread | Viable? |
|---|---|---|---|---|
| USDY → Aave USDC borrow | 4.65% | 2.17% | **+2.48 pp** | ❌ USDY not listed |
| USDY → Aave USDT0 borrow | 4.65% | 2.28% | **+2.37 pp** | ❌ USDY not listed |
| USDY → Aave GHO borrow | 4.65% | 1.50% | **+3.15 pp** | ❌ USDY not listed |
| USDY → INIT USDC borrow | 4.65% | INIT rate (n/a) | unknown | ⚠️ No risk param for USDY |
| **sUSDe → Aave USDC borrow** | ~7-12% (Ethena) | 2.17% | **+5-10 pp** | ✅ both listed (sUSDe is collateral-only on Aave Mantle, USDC borrowable) |
| **USDe → Aave USDC borrow** | 2.70% (Aave deposit, not native sUSDe yield) | 2.17% | +0.53 pp | ✅ both listed, thin spread |
| **mETH → Aave USDC borrow** | mETH ~3-4% staking yield | 2.17% | ~+1-2 pp | ✅ both listed |
| WETH → Aave USDC borrow | 1.68% | 2.17% | -0.49 pp | ❌ negative spread |
| GHO supply → USDC borrow | 6.72% | 2.17% | +4.55 pp | requires same-asset stablecoin loop |

### Stability of the spread

- The Merkl reward layer on Aave Mantle is **time-limited** (Mantle's 8M MNT incentive). When emissions end, USDC borrow rate will rise toward the unadulterated protocol rate of ~3.45%. The spread USDY→USDC narrows to ~1.2 pp post-incentive but stays positive.
- USDY yield tracks 3-month T-bills. Historical range over the past 18 months: 4.30% (today) to 5.45% (April 2024 peak). It only goes below 2% in a zero-rate environment, which is not the current regime.
- **Inversion risk:** Most material in a sudden Fed cut combined with Mantle borrow demand spike. Mitigation: top-up requirement at health factor < 1.5, OR auto-unwind position at HF < 1.3.

### What happens if the spread inverts mid-loan?

- Net interest becomes negative: the loan grows faster than the collateral.
- Health factor still depends on collateral *price*, not yield, so the position is not immediately at liquidation.
- Product-side mitigation: monitor the spread off-chain, force-close position when spread < 50bps cumulative (auto-close to lock the gain).

---

## Q6 — Gas cost analysis on Mantle

### Mantle gas (snapshot 2026-06-02)

- **Default L2 gas price:** 0.001 Gwei to 0.05 Gwei normal range; cap at 200 Gwei. ([Mantle docs](https://mantlenetworkio.github.io/mantle-tutorial/sdk-estimate-gas/), [Quicknode tracker](https://www.quicknode.com/gas-tracker/mantle))
- **Current observed average:** ~8.2 Gwei.
- **Dominant cost component:** L1 data fee (calldata posting to Ethereum), not L2 execution.
- **Mantle's claim:** >80% reduction vs Ethereum mainnet via data compression + EigenDA modular data availability.

### Rough USD cost estimates

| Operation | Gas used (est.) | Cost (8.2 Gwei × MNT price ~$0.50) |
|---|---|---|
| ERC20 transfer | ~50K | ~$0.001 |
| Aave supply (first time) | ~200K | ~$0.005 |
| Aave borrow | ~250K | ~$0.006 |
| Aave repay | ~150K | ~$0.004 |
| Aave liquidation | ~400K | ~$0.010 |
| **All-in BNPL open** (approve + supply + borrow + transfer to merchant) | ~700K | **~$0.02-0.05** |

**For comparison on Ethereum mainnet** (typical ~10 Gwei × ETH ~$3000):

| Operation | Gas | Cost |
|---|---|---|
| Aave supply | ~200K | ~$6.00 |
| Aave borrow | ~250K | ~$7.50 |
| All-in BNPL open | ~700K | **~$21.00** |

**Conclusion:** Mantle gas cost is **~400-700x cheaper than Ethereum mainnet** for the same flow. A $50 BNPL loan on Mantle costs $0.02-0.05 in gas (0.04-0.1%); on Ethereum it costs $21 (42% of the loan). The "Mantle gas makes small loans viable" thesis is strongly validated.

### Bridging gas cost (one-time per user)

User onboarding requires bridging USDY (or USDC) to Mantle: ~$0.50 Ethereum gas + 0.05% bridge fee. ([Datawallet](https://www.datawallet.com/crypto/bridge-to-mantle))

---

## Q7 — Liquidation mechanics

### Aave V3 Mantle (standard Aave V3 mechanics)

- **Health Factor:** sum(collateral_value × liq_threshold) / sum(debt_value). HF < 1.0 = liquidatable.
- **Liquidation thresholds** (per ARFC): stablecoins 75-93% (E-Mode), WETH 83%, MNT 60%.
- **Liquidation bonus:** 5.5-8.5% stablecoins, 8.5% WETH (i.e., liquidator buys collateral at 5.5-8.5% discount).
- **Liquidators:** Permissionless. Anyone running a keeper bot can call `liquidationCall`.
- **Liquidation history on Mantle:** ~4 months old market. No known cascade events reported. Risk providers Chaos Labs flagged "shallow Mantle liquidity" (e.g., 5% slippage on $220K WETH sale) as a material concern, which is why initial caps are conservative.
- **Mitigation pattern in our product:** keep HF > 2.0 by sizing borrows at 50% of max LTV — meaning collateral price would need to drop ~50% (which for a stablecoin like USDY is implausible barring depeg).

### INIT Capital

- "Liquidation premium linearly increases as health factor decreases" — dynamic liq bonus, not a flat percentage.
- Permissionless liquidations.
- Modes-based: each silo independent, so a USDY position in one mode does not cross-collateralize a position in another. (Multi-silo architecture is actually a feature for our use case — we can build dedicated user vaults.)

---

## Q8 — USDY transfer restrictions and lending implications

From [Ondo's Mantle integration guidelines](https://docs.ondo.finance/developer-guides/mantle-integration-guidelines):

- **USDY restriction model:** **Blocklist-based at the ERC-20 contract level.** Users must not be on the blocklist to hold, send, or receive USDY. **There is NO active KYC allowlist gate on contract-held USDY** — it is permissionless except for explicitly blocklisted addresses.
- **mUSD:** Inherits USDY's blocklist via `beforeTransfer` hook. Same restriction model.
- **Implication for smart contracts:** A lending protocol pool contract CAN hold USDY, as long as the pool contract itself is not on the blocklist (which it would only be if it had been involved in sanctions, fraud, etc.). This explains why INIT Capital was technically able to deploy a USDY pool.
- **Liquidation implication:** A liquidator buying USDY collateral at the discount must also pass the blocklist check (they must not be on the blocklist). For a 99.99% retail user case this is fine; for an institutional adversary it doesn't change.
- **mUSD design choice:** Rebases daily at 12:00am GMT, $1 fixed peg, interest paid as new token units. Apps integrate via `wrap()` USDY→mUSD and `unwrap()` mUSD→USDY. Recommended integration patterns:
  1. **Native integration**: protocol accepts mUSD directly, handles wrapping internally.
  2. **Informative integration**: user swaps mUSD↔USDY off-protocol before depositing.

**Net:** USDY's restriction design is NOT the reason it's missing from Aave Mantle. The reason is more mundane — no governance proposal has been filed yet. This is an action item: **a USDY listing AIP for Aave Mantle would be the highest-leverage thing to lobby for**, but it is out-of-scope for a hackathon-week build.

---

## Recommendations for the architect

Order by feasibility for the hackathon build:

1. **Demo v1: sUSDe collateral + USDC borrow on Aave Mantle.**
   - sUSDe is listed (supply-only, 0% protocol APY on Aave because Ethena's native yield ~7-12% lives outside Aave — but the user keeps Ethena rebases AND Aave Merkl rewards).
   - USDC borrowable at 2.17%.
   - Pool: `0x458F293454fE0d67EC0655f3672301301DD51422`, sUSDe underlying `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2`, USDC underlying `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`.
   - Spread well-positive in all market conditions.
   - **This demo works TODAY with zero infra changes.**

2. **Demo v2 (pitch narrative): USDY collateral.**
   - Requires either (a) a USDY listing on Aave Mantle (governance AIP, not hackathon-week feasible) or (b) using INIT Capital with custom risk params (requires INIT team coordination), or (c) building a custom thin lending vault that wraps the position (most code, most risk).
   - For the demo: pitch this as the v2 unlock and use sUSDe as a fungible stand-in for the live demo.

3. **For storytelling / pitch deck:** The Aave Horizon expansion to Mantle is on the Aave roadmap (Aave founder's 2026 priorities: V4 + Horizon + mobile). Frame the product as "consumer BNPL on the rails that Horizon is building for institutions." ([Bitget News](https://www.bitget.com/amp/news/detail/12560605114610))

### Highest-risk finding

**USDY is not listed on Aave Mantle, and the only protocol that has a USDY pool (INIT Capital) has it deployed without published risk parameters and only $116 of USDY in it.** This means the *literal* product pitch ("USDY as collateral, USDC as loan, on Mantle") is not buildable end-to-end against live infra today. Either pivot the demo to sUSDe (works today) or pivot the chain to Aave Ethereum-mainnet (where there is still no USDY listing but Horizon is at least closer in spirit).

---

## Sources

- [Bybit/Mantle/Aave V3 mainnet launch — PRNewswire](https://www.prnewswire.com/news-releases/bybit-mantle-and-aave-launch-strategic-mainnet-integration-to-scale-institutional-grade-defi-liquidity-302685269.html)
- [Aave V3 Mantle market — Aavescan](https://aavescan.com/mantle-v3)
- [Aave V3 Mantle USDC parameters — Aavescan](https://aavescan.com/mantle-v3/usdc)
- [Aave address book — bgd-labs/aave-address-book](https://github.com/bgd-labs/aave-address-book/blob/main/src/AaveV3Mantle.sol)
- [ARFC Deploy Aave v3 on Mantle](https://governance.aave.com/t/arfc-deploy-aave-v3-on-mantle/20542)
- [Direct-to-AIP Aave V3 Mantle Collateral Enablement (USDT0/USDe/ETH/XAUT)](https://governance.aave.com/t/direct-to-aip-aave-v3-mantle-collateral-enablement-emode-expansion-and-isolation-updates-usdt0-usde-eth-xaut/24153)
- [Aave Horizon launch announcement](https://aave.com/blog/horizon-launch)
- [INIT Capital Mantle contract addresses](https://dev.init.capital/contract-addresses/mantle)
- [INIT Capital Mantle parameters](https://docs.init.capital/borrowing/health-factor/mantle-parameters)
- [INIT Capital TVL — DefiLlama](https://defillama.com/protocol/init-capital)
- [Lendle homepage — shutdown notice](https://lendle.xyz/)
- [ZeroLend cessation — CoinDesk](https://www.coindesk.com/markets/2026/02/17/defi-protocol-zerolend-shuts-down-after-3-years-citing-inactive-chains-and-hacks)
- [Ondo Finance Mantle integration guidelines](https://docs.ondo.finance/developer-guides/mantle-integration-guidelines)
- [USDY yield + supply — RWA.xyz](https://app.rwa.xyz/assets/USDY)
- [Mantle gas tracker — QuickNode](https://www.quicknode.com/gas-tracker/mantle)
- [Mantle transaction fee docs](https://mantlenetworkio.github.io/mantle-tutorial/sdk-estimate-gas/)
- [Bridge to Mantle cost — Datawallet](https://www.datawallet.com/crypto/bridge-to-mantle)
- [Aave founder 2026 priorities — Bitget News](https://www.bitget.com/amp/news/detail/12560605114610)
- [Mantle USDY/mUSD announcement](https://www.mantle.xyz/blog/announcements/rwa-backed-usdy-live-on-mantle-musd-to-follow)
- [inUSDY proxy on Mantlescan](https://mantlescan.xyz/address/0xf084813F1be067d980a0171F067f084f27B3F63A)
