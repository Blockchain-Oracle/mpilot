# Stablecoin Yield Domain Reference — 2026

Reference material for the architecture phase of a BNPL-on-yield product. Document only — no recommendations. The architect will select a collateral asset after reading this.

All rate citations include a source date. Where a figure is current to "April 2026" or "Q1 2026", that is the publication date of the source. Crypto rate data is volatile; treat figures as point-in-time anchors, not commitments.

---

## 1. USDY (Ondo Finance) — Full Mechanics

### 1.1 What it is

USDY ("Ondo US Dollar Yield") is a tokenized debt note issued by Ondo USDY LLC. Each token represents a debt claim on the issuer, secured by a portfolio of short-duration US Treasury securities (maturities under six months) and demand deposits at insured US banks. USDY launched on Ethereum in August 2023.

As of April 2026, the underlying portfolio composition is approximately 92% US Treasuries and 8% bank demand deposits, with the deposit allocation functioning as redemption-day liquidity. Source: [Top Tokenized Treasury Funds 2026](https://eco.com/support/en/articles/15210582-top-tokenized-treasury-funds-2026-buidl-ousg-usdy-benji-compared) (April 2026).

### 1.2 Issuer and regulatory structure

Two legal entities front USDY:

- **Ondo USDY LLC** — Delaware-domiciled debt issuer. Handles USD wire redemptions to non-US bank accounts.
- **Ondo Global Markets (BVI) Limited** — British Virgin Islands entity. Handles USDC mint/redeem flow for retail.

Ondo Global Markets (BVI) Limited is **not** registered as an investment company under the US Investment Company Act of 1940, **not** registered as an Alternative Investment Fund or UCITS in the EEA, and not registered under any other jurisdiction's securities or financial instrument laws. The BVI structure is what allows USDY to operate with a non-US retail target market without falling under SEC investment-company rules. Source: [USDY Basics — Ondo Docs](https://docs.ondo.finance/general-access-products/usdy/basics).

### 1.3 Transfer restrictions

USDY is **not** subject to the full KYC regime that gates OUSG/OMMF. Instead, transfers are gated by three on-chain checks:

1. **Allowlist** — wallets must self-certify and be added before holding USDY.
2. **Blocklist** — protocol-controlled exclusion of known bad actors.
3. **Sanctions list** — Ondo uses the Chainalysis sanctions oracle as the live screen.

US persons are explicitly prohibited from subscribing, acquiring, or redeeming USDY. Persons located in or placing orders from inside the United States are also prohibited. The token is "permissionless" only in the narrow sense that non-US users can self-certify into the allowlist without bespoke onboarding. Source: [Ondo Onboarding & KYC docs](https://docs.ondo.finance/general-access-products/usdy/faq/onboarding-and-kyc).

The contract retains protocol-admin powers to seize tokens held by sanctioned or court-ordered wallets — a compliance feature, not a bug, flagged in Cyfrin's audit notes. Source: [Cyfrin RWA audit blog](https://www.cyfrin.io/blog/rwa-protocol-audits-why-real-world-asset-security-requires-specialized-expertise).

### 1.4 Mint and redemption flow

**Minting:**
- Subscription accepted in USDC (and USD bank wires for amounts ≥ $100,000).
- Retail minimum: $500 (subject to reductions over time per Ondo).
- Wire-based primary minimum: $100,000.
- T+0 mint via Ondo Global Markets app for USDC subscriptions.

**Redemption:**
- USD wire redemption: T+1 settlement, $100K minimum, non-US bank accounts only.
- USDC redemption via Ondo Global Markets (BVI): processed on the app at a $100K minimum at the primary tier; smaller balances rely on secondary-market liquidity (Curve, Uniswap, CEXs).
- For non-Ethereum chains (Sui, Aptos, Stellar, XRP, Noble): $5,000 minimum mint/redeem.

Source: [Altrady USDY guide 2026](https://www.altrady.com/blog/cryptocurrency/ondo-finance-tokenized-treasuries-guide), [USDY Basics](https://docs.ondo.finance/general-access-products/usdy/basics).

### 1.5 Yield mechanism — non-rebasing, price-accumulating

USDY accrues yield via redemption-price appreciation. The token's redemption price rises continuously; holders end up with the same balance but each token is worth more. This is critical to contrast with rebasing — USDY is **not** rebasing.

The redemption price is computed and posted on-chain by `RWADynamicRateOracle.sol`. The oracle accepts a `Range` input from a trusted admin describing a daily compounding rate; the live redemption price is `Range.dailyInterestRate ^ (days_elapsed + 1) * Range.lastSetPrice`. Source: [Ondo Mantle integration guidelines](https://docs.ondo.finance/developer-guides/mantle-integration-guidelines).

The yield tracks the front-end Treasury curve **minus a 25 bps issuer fee**. A 25 bps Fed cut translates to roughly 22 bps of APY compression on USDY (the lag reflects the portfolio rolling into newly issued bills).

### 1.6 Historical APY trend

| Date | Headline APY | Reference rate context |
|------|-------------|------------------------|
| Sep 2023 | 5.35% | Early supply ramp |
| Apr 2024 | 5.45% | Peak Fed funds, pre-Sep 2024 cut |
| Oct 2024 | 5.05% | 3M T-bill 4.85% pre-cuts |
| Jul 2025 | 4.29% | Post-cuts |
| Apr 2026 | 4.65% | 3M T-bill 4.30% + blended bank yield |

Sources: [Ondo USDY explained — Eco](https://eco.com/support/en/articles/14798657-ondo-usdy-tokenized-treasuries-explained), [Bitget Academy USDY](https://web3.bitget.com/en/academy/usdy-token-what-is-ondo-us-dollar-yield-and-how-to-earn-passive-income-with-4-25-percentage-apy).

### 1.7 Mantle deployment

- **USDY on Mantle:** `0x5bE26527e817998A7206475496fDE1E68957c5A6`
- **Total supply on Mantle (snapshot from Mantlescan):** 21,293,712.85 USDY
- **Holders (snapshot):** 2,365
- **Live token price at snapshot:** ~$1.069 (reflects accumulated yield since launch)

Source: [Mantlescan USDY token tracker](https://mantlescan.xyz/token/0x5be26527e817998a7206475496fde1e68957c5a6).

Mantle deployment launched mid-2024 alongside an Ondo–Mantle partnership announcement; mUSD (the rebasing variant) followed. Source: [Mantle blog — RWA-backed USDY live on Mantle](https://www.mantle.xyz/blog/announcements/rwa-backed-usdy-live-on-mantle-musd-to-follow), [The Block](https://www.theblock.co/post/261943/mantle-ondo-finance-launch-rwa-backed-usdy).

### 1.8 Cross-chain availability and supply

Total USDY supply across all chains was ~$740M as of April 2026.

| Chain | Approx. supply share | Launch period |
|-------|---------------------|---------------|
| Ethereum | ~40% (residual) | Aug 2023 |
| Solana | ~35% | Early 2024 |
| Mantle | ~12% | Mid 2024 |
| Sui | ~10% | Mid 2024 |
| Aptos | ~3% | Late 2024 |
| Stellar, XRP, Noble | minimal | Later additions |

USDY is fungible across Ethereum, Mantle, and Arbitrum via LayerZero's omnichain standard (integrated November 2025). Source: [Eco — USDY explained](https://eco.com/support/en/articles/14798657-ondo-usdy-tokenized-treasuries-explained).

### 1.9 Audit history and incidents

- **Spearbit** — Ethereum and Solana deployments.
- **OpenZeppelin** — core token contracts.
- **Cyfrin** — April 2024 (core tokenization infra including BUIDL integration) and July 2025 (securities tokenization platform).
- **Bug bounty:** [Immunefi Ondo Finance](https://immunefi.com/bug-bounty/ondofinance/).

No reported smart-contract exploit affecting USDY through April 2026. No reported depeg event of USDY's redemption-price floor. The token has historically traded slightly above $1 (its accumulated redemption value), occasionally drifting to small discounts in thin secondary markets but recovering on primary-redemption arbitrage.

---

## 2. mUSD (Rebasing USDY Variant on Mantle)

### 2.1 What it is

mUSD is a rebasing ERC-20 wrapper around USDY, deployed exclusively on Mantle and designed for DeFi composability. Where USDY's token price increases over time, mUSD's token price is fixed at $1 and the **balance** of each holder grows daily to reflect accrued yield.

- **mUSD token:** `0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3` (Mantle)
- **Redemption Price Oracle:** `0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f` (Mantle) — same `RWADynamicRateOracle.sol` that backs USDY price discovery.

Holders wrap USDY into mUSD via the contract's `wrap` function; unwrap is symmetrical. The wrap/unwrap is free of fees beyond gas. Source: [USDY and mUSD Conversion — Ondo Docs](https://docs.ondo.finance/tools/converter/usdy-musd-conversion).

### 2.2 Why rebasing matters

A rebasing token maintains a constant unit price (here, $1) while balances change. From a payment UX perspective, rebasing is friendlier — a wallet that holds 100 mUSD today and 100.014 mUSD tomorrow shows yield as balance growth, not as a moving price. From a smart-contract perspective, rebasing is **dangerous** because most lending and DEX math assumes static balances unless triggered by `transfer`/`transferFrom`. See section 5.5 for the composability risk.

mUSD calls into `RWADynamicRateOracle.sol` to fetch the current USDY redemption price and rebases supply such that each mUSD remains worth $1 in underlying USDY. Source: [Ondo Mantle integration guidelines](https://docs.ondo.finance/developer-guides/mantle-integration-guidelines).

### 2.3 Lending-protocol interactions

Lending protocols that take rebasing tokens as collateral generally need one of:

1. **Wrap to a non-rebasing share token** (e.g., wstETH wraps stETH) — most common.
2. **Custom accounting** that explicitly tracks rebases (e.g., Aave's stETH listing supports stETH as collateral but disables stETH **borrowing** to avoid the math breaking).
3. **Snapshot balances at every block** — too expensive on-chain.

Naive integrations break when:
- A user deposits 100 mUSD, the token rebases to 100.5 mUSD in the user's wallet but **not** in the pool's accounting → 0.5 mUSD of yield gets stuck in the pool.
- Interest-bearing collateral gets double-counted against itself.
- Liquidation thresholds become drift-sensitive.

Sources: [Lido Aave specification](https://docs.lido.fi/integrations/aave/specification/), [Code4rena rebasing share-token issue](https://github.com/code-423n4/2021-12-sublime-findings/issues/137).

### 2.4 mUSD vs USDY — when to use which

- Use **USDY** for direct hold, OTC settlement, cross-chain bridging, or integrations that already understand price-accruing tokens.
- Use **mUSD** for retail-facing balances, payment UX, and DeFi venues that explicitly support rebasing (or that you can wrap into a share-token primitive).

Yield is identical in both directions (same underlying portfolio, same 25 bps fee). mUSD APY tracked at ~5.1% in early 2026 per Mantle ecosystem reporting. Source: [Pistachio Fi 2026 yield comparison](https://www.pistachio.fi/blog/best-crypto-yield-platforms-2026).

---

## 3. Stablecoin Yield Landscape Comparison (2026)

All figures are point-in-time anchors with source dates. Rates fluctuate daily.

### 3.1 USDY / mUSD (Ondo, treasuries-backed)

- **Mechanism:** Tokenized debt note backed 92% short-duration UST + 8% insured bank deposits.
- **APY (Apr 2026):** ~4.65% net (gross treasury yield − 25 bps fee).
- **Risk profile:** Issuer credit risk (BVI/DE LLC), counterparty risk on custodian, minimal smart-contract risk.
- **Supply (Apr 2026):** ~$740M across all chains.
- **Audits:** Spearbit, OpenZeppelin, Cyfrin (2024, 2025).
- **Incidents:** None reported.
- **Regulatory:** Non-US only; allowlist + blocklist + Chainalysis sanctions.

### 3.2 USDC on Coinbase (rewards / institutional yield)

- **Mechanism:** Off-chain Coinbase-paid reward funded from Circle revenue share + Coinbase lending.
- **APY (Q1 2026):** ~4.0–4.5% retail (Coinbase One members up to ~4.5%); 3.40% on Coinbase Prime simple rewards; up to 5.75% on PrimePlus for institutions.
- **Risk profile:** Custodial — Coinbase platform risk and policy risk (Coinbase has reduced rewards for free users, restricted access).
- **Audit history:** N/A — centralized custodial product.
- **Incidents:** No depeg of underlying USDC since the SVB scare of March 2023 (~$0.87 at lowest).
- **Source:** [Coinbase USDC Rewards](https://help.coinbase.com/en/coinbase/coinbase-staking/rewards/usd-coin-rewards-faq), [Coinbase Wallet 4.7% APY rewards](https://www.theblock.co/post/327488/coinbase-wallet-introduces-4-7-apy-reward-for-usdc-holders).

### 3.3 Pendle PT-stables (fixed-yield wrapped)

- **Mechanism:** Pendle splits any yield-bearing token (sUSDe, sUSDS, aUSDC, yvUSDC) into a Principal Token (PT, fixed yield to maturity) and a Yield Token (YT, the floating yield stream). PT holders lock in a fixed APY.
- **APY (2026):** PT-sUSDe and PT-sUSDS regularly trade at 8–18% fixed yield depending on maturity. PT-sUSDe Mar-2026 traded at ~11.2% implied APY. Implied PT yield typically sits 1–3 points below spot to compensate PT-buyer-paid premium.
- **Risk profile:** Inherits the underlying asset's risk (sUSDe inherits Ethena risk) **plus** Pendle contract risk **plus** maturity/liquidity risk (selling PT pre-maturity is at market price).
- **TVL (Apr 2026):** $1.499B (down from a Sep 2025 peak of $13.1B).
- **Audits:** Multiple including Ackee and Spearbit.
- **Incidents:** No PT exploit; PT prices have whipsawed during underlying asset stress (e.g., PT-sUSDe during Oct 11 2025).
- **Source:** [Pendle docs](https://docs.pendle.finance/ProtocolMechanics/YieldTokenization/PT), [Earnpark Pendle 2026 guide](https://earnpark.com/en/posts/what-is-pendle-finance-the-complete-2026-guide-to-yield-tokenisation-pt-yt-mechanics-and-boros/).

### 3.4 Ethena USDe / sUSDe (delta-neutral basis trade)

- **Mechanism:** USDe is minted against a portfolio of long crypto (stETH and spot BTC) hedged 1:1 by perpetual-futures shorts on Binance, Bybit, OKX, Deribit. Yield comes from (a) staked-ETH consensus rewards (~3% on the LST share) and (b) funding-rate income paid by leveraged longs on perps (typically the larger leg). sUSDe is the staked, yield-bearing variant.
- **USDe APY (Apr 2026):** Headline 0% (non-yielding stablecoin variant).
- **sUSDe APY:** 7-day trailing avg 9.4%, 90-day trailing avg 11.8% as of April 2026. Compressed from peaks of 25%+ in 2024. Messari reports ~3.72% spot in early 2026 reflecting compression.
- **Supply (post-Oct 2025):** Dropped from $14.7B (Oct 10 peak) to $5.6B–$6.4B by early 2026.
- **Risk profile:** Funding-rate risk, exchange counterparty risk (Binance, Bybit, OKX), custodian risk (Copper, Ceffu), liquidation cascade risk on oracle/order-book divergence. Insurance fund: $61M against $5.6B supply (~1.1%) as of March 2026.
- **Audit history:** Quantstamp, Spearbit, Pashov, Cantina. Independent Proof-of-Reserves by Chaos Labs, Chainlink, Llama Risk, Harris & Trotter.
- **Incidents:** **October 11 2025 depeg to $0.65 on Binance** (see Section 4). Prior smaller stress events in April 2024 and May 2024 during negative funding.
- **Source:** [Ethena docs — USDe overview](https://docs.ethena.fi/solution-overview/usde-overview), [Stablecoin Insider Q1 2026 report](https://stablecoininsider.org/ethena-usde-q1-2026-report/).

### 3.5 Mountain USDM (treasuries-backed, rebasing)

- **Mechanism:** Bermuda-regulated yield-bearing stablecoin, treasuries-backed. Rebases daily at 14:00 UTC.
- **APY (peak):** ~5.0% net (slightly higher than USDY due to lower custody cost structure).
- **Supply (Mar 2026 snapshot):** $185M — distribution ~62% Ethereum, ~24% Polygon, ~14% Base.
- **STATUS — WINDING DOWN:** Mountain Protocol is in orderly wind-down following the Anchorage Digital acquisition; Phase 2 of the wind-down concluded August 22, 2025. USDM is **not** an active asset to integrate against as of 2026.
- **Source:** [Mooloo — Anchorage acquires Mountain Protocol](https://mooloo.net/articles/third-party-custody/anchorage-digital-acquires-mountain-protocol-to-bolster-stablecoin-capabilities/), [Mountain Protocol — USDM](https://mountainprotocol.com/), [Eco USDM by Mountain](https://eco.com/support/en/articles/14798659-usdm-by-mountain-yield-bearing-stablecoin).

### 3.6 Frax sFRAX

- **Mechanism:** ERC-4626 staking vault. Targets the Fed's IORB rate as risk-free benchmark via an on-chain oracle. Yield blends DeFi strategies and RWA deployments.
- **APY:** Settled in ~5–10% range since late 2024. Governance-controlled utilization curve.
- **Risk profile:** FRAX peg risk (FRAX itself has migrated from algorithmic to over-collateralized), governance risk, RWA counterparty risk.
- **Source:** [Frax docs — sFRAX](https://docs.frax.finance/frax-v3-100-cr-and-more/sfrax).

### 3.7 sUSDS (Sky / Maker rebrand)

- **Mechanism:** ERC-20 wrapper around USDS deposited into Sky's Savings Rate (SSR) contract. Each sUSDS represents a pro-rata claim on the USDS pool plus accumulated SSR. Redemption ratio rises as savings revenue accrues — non-rebasing, similar to USDY's price-accrual style. Underlying yield from real-world assets (T-bills via Monetalis and BlockTower), crypto-collateralized vaults, and protocol-owned liquidity.
- **APY (Apr 2026):** 3.75% (governance-set). SSR ranged 3.75–4.5% through Q1 2026; historically has spiked to 12.5%.
- **Supply (Apr 2026):** ~$6.5B sUSDS deposits, ~$9B total USDS supply (3rd-largest stablecoin per DeFiLlama).
- **Audits:** Spearbit, ChainSecurity for migration code. Savings module is a fork of the DSR (live since 2019, no incidents).
- **Source:** [Sky sUSDS page](https://sky.money/susds), [Eco sUSDS 2026 guide](https://eco.com/support/en/articles/15197989-susds-yield-explained-2026-sky-s-savings-token).

### 3.8 Aave aUSDC / aUSDT (variable lending yield)

- **Mechanism:** Variable-rate supply yield based on utilization. aTokens rebase 1:1 against underlying as interest accrues.
- **APY (2026):** USDC supply 3.8–5.2% trailing 30-day on Ethereum mainnet, occasionally higher on L2s (Arbitrum, Base) due to demand. USDT tracks similarly.
- **Risk profile:** Smart-contract risk (Aave V3, multiple audits; Aave has had isolated incidents but no protocol-loss events on stables since launch), liquidity risk (high utilization can delay withdrawals), oracle risk, listed-collateral risk (cross-contagion).
- **Mantle deployment:** Aave V3 on Mantle reached $1.25B TVL in its first month (early 2026 launch).
- **Source:** [Aave app](https://app.aave.com/), [Mantle Vault on Bybit announcement](https://www.benzinga.com/content/51449024/mantle-vault-on-bybit-powered-by-aave-and-cian-bridges-1-25b-in-defi-depth-to-80m-cefi-users).

### 3.9 Morpho vaults (curated stable yield)

- **Mechanism:** Morpho Blue is a primitive lending engine; curated vaults sit on top with curator-defined market exposure and isolated liquidation parameters. Depositors earn the spread.
- **APY (2026):** 4–8.5% on stables, 50–150 bps premium over Aave equivalent.
- **Risk profile:** Curator-selection risk, isolated-market collateral risk, smart-contract risk.
- **Source:** [Eco — Aave vs Morpho vs Spark vs Fluid 2026](https://eco.com/support/en/articles/15253994-aave-vs-morpho-vs-spark-vs-fluid-2026-lending-protocol-comparison).

### 3.10 Sentora Smart Yield (April 2026 launch)

- **Mechanism:** Curated DeFi vault platform — Direct Vaults (single-strategy, e.g., lending) and Smart Vaults (multi-step strategies: Supervised Loans, Leveraged Loops). Sentora handles risk parameters; Veda provides protocol-level execution infrastructure.
- **Launched publicly:** April 30, 2026 (previously institutional-only).
- **TVL:** ~$2B public vaults; nearly $7B in curated vault structures across the broader Sentora ecosystem.
- **Partners:** Kraken (DeFi Earn), Upshift, Morpho.
- **APY:** 3–8% for conservative stablecoin vaults; up to 8% via Kraken DeFi Earn Veda vaults.
- **Risk profile:** Curator risk, Veda contract risk, underlying-strategy risk.
- **Source:** [Sentora Smart Yield press release](https://cointelegraph.com/press-releases/sentora-brings-institutional-defi-to-the-public-with-the-launch-of-its-smart-yield-platform), [Veda docs](https://veda.tech/blog/what-is-a-defi-vault-how-veda-yield-vaults-work).

### 3.11 DAI Savings Rate (DSR)

- **Mechanism:** Original Maker DSR contract. Co-exists with the new Sky Savings Rate during the DAI→USDS migration window.
- **APY:** Tracks SSR closely (since the same governance sets both). 3.75–4.5% range in Q1 2026, historically up to 12.5%.
- **Status:** Operational but Sky is migrating liquidity to sUSDS.
- **Audits:** DSR contract has been live since November 2019 with no incidents.
- **Source:** [Eco USDS vs DAI 2026](https://eco.com/support/en/articles/15197990-usds-vs-dai-2026-sky-s-migration-from-makerdao).

### 3.12 Others worth knowing in 2026

- **BUIDL (BlackRock USD Institutional Digital Liquidity Fund):** ~$2.6B AUM, qualified-purchaser only, T+0 USDC redemption via Circle facility. Live on Ethereum, Polygon, Arbitrum, Optimism, Avalanche, Aptos.
- **OUSG (Ondo Short-Term Treasuries):** Accredited US investors only; mostly BUIDL + USYC + Superstate USTB.
- **USYC (Circle, ex-Hashnote):** Circle's tokenized money market fund.
- **BENJI (Franklin Templeton):** Tokenized money market fund.
- **Coinbase USDC (Onchain):** 4.7% APY in Coinbase Wallet program.
- **USDT yield:** Tether does not pay yield directly, but on-chain markets quote USDT supply yields similar to USDC.

---

## 4. The USDe October 11 2025 Depeg Incident

### 4.1 Headline

USDe traded as low as **$0.65 on Binance** on October 11, 2025 during a $19B liquidation cascade. The depeg lasted approximately 90 minutes (with USDe in the $0.75–$0.98 range outside the brief $0.65 print) on Binance order books. On Curve and other DEXs, USDe moved at most 0.3% from peg. Ethena's mint/redeem functionality stayed operational throughout with USDe overcollateralized by ~$66M per third-party attestations. USDe lost ~$8.3B in supply over the following two months (from $14.7B to $6.4B).

### 4.2 Timeline

| UTC time | Event |
|---|---|
| Oct 10 ~21:00 | US President Trump announces 100% additional tariff on Chinese imports. |
| Oct 11 ~05:00 | Markets heavily long and lightly liquid; BTC begins falling from ~$122,000. |
| Oct 11 ~05:00–05:40 | BTC drops to ~$100,000 within 60 minutes. |
| Oct 11 ~05:30 (approx) | Cascading liquidations on Binance Unified Account begin. wBETH and BNSOL devalue rapidly on Binance internal order books. |
| Oct 11 ~05:40 | Within 40 minutes ~1.7M traders liquidated; $19.3B in liquidations across crypto. USDe prints as low as **$0.65** on Binance spot. |
| Oct 11 (~90-minute window) | USDe trades in $0.75–$0.98 range on Binance with 780M+ tokens traded. Other venues show negligible deviation. |
| Oct 11 (recovery) | USDe peg restored on Binance as primary-redemption arbitrage and external liquidity catches up. |
| Oct 11 (post-event) | Binance announces compensation for users who held USDe, BNSOL, or WBETH as collateral during the 40-minute crash window — paying the gap between midnight Oct 11 market price and each user's liquidation price, within 72 hours. |
| Oct 12–13 | Ethena publishes off-cycle Proof-of-Reserves confirming USDe overcollateralized by ~$66M, third-party attested by Chaos Labs, Chainlink, Llama Risk, Harris & Trotter. |
| Oct 11 → Q1 2026 | USDe supply contracts ~$8.3B from $14.7B to ~$6.4B as participants rotate to fiat-backed alternatives. |

Sources: [CoinDesk Oct 11 2025](https://www.coindesk.com/markets/2025/10/11/ethena-s-usde-briefly-loses-peg-during-usd19b-crypto-liquidation-cascade), [CCN — USDe depeg explained](https://www.ccn.com/education/crypto/ethena-usde-depeg-binance-crash-explained/), [Joao Teixeira post-mortem](https://medium.com/@joaotx/anatomy-of-a-meltdown-lessons-from-the-october-11-crash-59dc7bfb522e), [ArkStream Capital — 90 Minutes of USDe](https://x.com/ark_stream/status/1977655268810142182), [Ethena Labs PoR tweet](https://x.com/ethena_labs/status/1976988523598385528).

### 4.3 What actually triggered it

The proximate trigger was the tariff announcement. The depeg mechanism, per multiple post-mortems, was **Binance-specific and not protocol-level**:

1. **Margin engine design.** Binance's Unified Account used internal spot order books to mark collateral (including USDe, wBETH, BNSOL). When the cascade kicked off, these internal markets thinned out.
2. **Collateral price collapse.** Forced liquidations dumped wBETH and BNSOL into thin Binance order books, gutting collateral value in Unified Accounts and triggering further liquidations.
3. **USDe sold into thin liquidity.** USDe got dumped as users scrambled to delever; on Binance the order book couldn't absorb without printing as low as $0.65.
4. **Cross-venue feedback.** Market makers hedged the dislocation across venues, delta-neutral bots replicated the flow, and every major derivatives venue joined the spiral.
5. **No primary-redemption failure.** Ethena's mint/redeem stayed up at $1. The protocol was overcollateralized. The depeg was a venue-specific liquidity event, not a collateral-failure event.

Source: [BraveNewCoin — Was it a coordinated attack?](https://bravenewcoin.com/insights/usde-depeg-on-binance-was-it-a-coordinated-attack), [Yellow.com — Binance under siege?](https://yellow.com/research/binance-under-siege-theory-behind-dollar1b-crypto-meltdown-explained), [TradingView — margin exploit theory](https://www.tradingview.com/news/newsbtc:edd5e2f2a094b:0-crypto-crash-triggered-by-binance-margin-exploit-uphold-research-chief-claims/).

### 4.4 Who got rugged, who got out

- **Liquidated:** ~1.7M Binance accounts holding wBETH, BNSOL, or USDe as Unified Account collateral during the 40-minute window. Partially compensated by Binance.
- **Spared:** Holders on DEXes (Curve depth absorbed flow at 0.3% deviation). Holders on Aave, where USDe was **hardcoded to $1** as the oracle price — Aave's risk-management decision insulated borrowers from a Binance-specific dislocation but is its own architectural choice with tradeoffs.
- **Profited:** Market makers and traders who bought USDe at $0.65–$0.85 on Binance and either redeemed primary (mint/redeem at $1) or arbitraged via cross-venue routes.

### 4.5 Ethena response

- Maintained mint/redeem at $1 throughout.
- Published off-cycle Proof-of-Reserves within 24–48 hours, attested by four independent firms.
- No emergency parameter changes to the protocol itself were required (collateral was sufficient).
- Reserve Fund stood at ~$60M at the time; was not materially drawn down (the loss was on Binance, not on the protocol's balance sheet).
- ENA governance token fell ~40% intraday, closed down ~25% on the day.

### 4.6 Predictive signals (what a future architect should watch)

- **Internal-orderbook price vs. external price spread on major exchanges.** Binance's reliance on internal pricing for margin calls was load-bearing in the cascade. Anyone using USDe as collateral should hardcode at $1, use external time-weighted oracles, or use depth-aware oracles.
- **Funding rate sustained negative streaks** (more than ~7 consecutive days; longest historical negative streak was 13 days). Negative funding compresses sUSDe yield and pressures the insurance fund.
- **Insurance fund coverage ratio vs. supply.** $60M / $5.6B = ~1.1% in Mar 2026. Historical lows pre-crash were thinner.
- **Concentration of perpetual-short positions on a single venue.** Single-venue counterparty risk is the primary architectural risk.
- **Curve depth on USDe pairs.** Deep Curve liquidity acted as the price discovery anchor on Oct 11.
- **Sentiment proxies.** ETH spot funding, ENA price action, social-volume spikes.

### 4.7 Was the depeg purely USDe-specific?

No — wBETH and BNSOL co-depegged on Binance for the same reason (forced unwinds against thin internal liquidity). USDC, USDT, DAI/USDS, USDY did **not** depeg materially on October 11. The depeg was a margin-engine + Binance-specific-liquidity failure that hit assets used as Unified Account collateral, not a stablecoin-design failure.

---

## 5. Risk Taxonomy Across Stablecoin Yield

A future architect must reason about each vector independently. Real losses come from correlated failures across vectors.

### 5.1 Depeg risk

- **Collateral failure** — the underlying assets lose value (e.g., SVB/Circle scare, USDC at $0.87 in March 2023; algorithmic collapse, UST in May 2022).
- **Oracle failure** — a price feed used by lending protocols misreads the stable's price, triggering liquidations or mispricings (e.g., Aave's choice to hardcode USDe at $1 to avoid this).
- **Run scenario** — primary redemptions clog due to off-chain plumbing, secondary markets price the panic before primary catches up (USDC March 2023, USDe October 2025 on Binance).
- **Liquidity-event-induced depeg** — venue-specific orderbook thinning even when collateral is fine (USDe Oct 11 2025).

### 5.2 Smart contract risk

- Audit quality and reviewer reputation.
- Time in production without exploit (e.g., DSR has been live since Nov 2019 without incident).
- Admin powers (USDY/mUSD have token-seizure powers for compliance; this is normal for RWA but is a centralization vector).
- Composability — is the token's behavior compatible with downstream systems (rebasing is the canonical issue).

### 5.3 Regulatory risk

- **Issuer jurisdiction** — BVI (Ondo USDY), Bermuda (Mountain USDM), Delaware (Circle/Coinbase), Cayman (Ethena), Netherlands/Singapore (sUSDS via Sky Foundation).
- **Transfer restrictions** — allowlist/blocklist (USDY); none (USDe, USDC, USDT); accredited-only (OUSG, BUIDL).
- **US-person exclusion** — USDY explicitly excludes US persons; using USDY in a product serving US users is non-trivial.
- **Securities classification** — yield-bearing stablecoins risk being classified as securities; OUSG is structured to be a security; USDY structured as a note offering exempt from US rules; USDe sits in a gray zone.
- **Sanctions screening** — Chainalysis sanctions oracle integrated into USDY; less common on USDC/USDT (which rely on issuer freezes).

### 5.4 Yield-source risk

| Source | Stability | Cap | Failure mode |
|---|---|---|---|
| Short Treasuries | Very high | Fed funds rate | Issuer credit, fee compression |
| Bank demand deposits | High | Deposit rate | Bank failure (SVB-style) |
| Perp funding rate | Volatile | No floor, no cap | Negative funding, exchange counterparty |
| Lending utilization | Moderate | Market demand | Bad debt, oracle failure |
| LP fees | Variable | Volume | Impermanent loss, exotic-pool risk |
| Real-world assets via DAO allocators | Moderate | Governance-set | Counterparty, custody, governance attack |
| Curated vault strategies | Variable | Strategy-dependent | Curator selection error, looping unwind |

### 5.5 Composability risk

- **Rebasing tokens in lending protocols** — see Section 2.3. Naive integration breaks balance accounting.
- **Bridged tokens with non-canonical pegs** — wrapped versions can depeg from their native versions (wBETH, BNSOL on Oct 11 2025 are the canonical recent example).
- **Oracle freshness** — stale oracles can pin a stale price during volatility; fresh oracles can transmit a venue-specific dislocation into a lending market.
- **Cross-chain bridging** — LayerZero / CCTP have their own risk surfaces; bridge exploits are a top historical loss category.

### 5.6 Liquidity risk

- **Primary redemption throughput** — can the issuer absorb $1B of redemptions in a day? BUIDL has $2.6B AUM but redeems T+0 via Circle facility; USDY redeems T+1 via wire with a $100K minimum.
- **Secondary market depth** — Curve, Uniswap, CEX order books at peg.
- **Concentration risk** — single-venue (USDe on Binance pre-Oct-11), single-curator (Morpho vaults), single-LP-provider.
- **Withdrawal delays in lending markets** — high utilization can mean you can't exit quickly.

### 5.7 Counterparty risk

- **Custodian risk** — Coinbase Custody, BitGo, Anchorage, Copper, Ceffu hold off-chain assets that back many stables.
- **Market maker risk** — Ethena depends on perp markets on Binance, Bybit, OKX, Deribit; concentrated short positions are a single point of failure.
- **Issuer risk** — Circle, Tether, Ondo Global Markets BVI, Sky Foundation, Ethena Labs Cayman.
- **Bank risk** — bank demand deposits backing USDY, USDM, and USDC reserves; SVB 2023 is the modern reference event.
- **Governance risk** — Sky token holders set SSR; Frax governance sets sFRAX rate; Aave governance sets risk parameters. A captured or careless DAO is a counterparty.

---

## Sources cited

- [Ondo USDY Basics docs](https://docs.ondo.finance/general-access-products/usdy/basics)
- [Ondo Mantle integration guidelines](https://docs.ondo.finance/developer-guides/mantle-integration-guidelines)
- [Ondo onboarding & KYC](https://docs.ondo.finance/general-access-products/usdy/faq/onboarding-and-kyc)
- [USDY/mUSD conversion](https://docs.ondo.finance/tools/converter/usdy-musd-conversion)
- [Mantlescan USDY token tracker](https://mantlescan.xyz/token/0x5be26527e817998a7206475496fde1e68957c5a6)
- [Mantle blog — USDY live on Mantle](https://www.mantle.xyz/blog/announcements/rwa-backed-usdy-live-on-mantle-musd-to-follow)
- [The Block — Mantle and Ondo USDY launch](https://www.theblock.co/post/261943/mantle-ondo-finance-launch-rwa-backed-usdy)
- [Eco — USDY explained](https://eco.com/support/en/articles/14798657-ondo-usdy-tokenized-treasuries-explained)
- [Eco — sUSDS 2026 guide](https://eco.com/support/en/articles/15197989-susds-yield-explained-2026-sky-s-savings-token)
- [Eco — Aave vs Morpho vs Spark vs Fluid 2026](https://eco.com/support/en/articles/15253994-aave-vs-morpho-vs-spark-vs-fluid-2026-lending-protocol-comparison)
- [Eco — Top Tokenized Treasury Funds 2026](https://eco.com/support/en/articles/15210582-top-tokenized-treasury-funds-2026-buidl-ousg-usdy-benji-compared)
- [Eco — Best Stablecoin Yield Aggregators 2026](https://eco.com/support/en/articles/15002231-best-stablecoin-yield-aggregators-2026)
- [Ethena docs — USDe overview](https://docs.ethena.fi/solution-overview/usde-overview)
- [Ethena docs — Funding risk](https://docs.ethena.fi/solution-overview/risks/funding-risk)
- [Stablecoin Insider — Ethena USDe Q1 2026 Report](https://stablecoininsider.org/ethena-usde-q1-2026-report/)
- [Sky — sUSDS](https://sky.money/susds)
- [Frax docs — sFRAX](https://docs.frax.finance/frax-v3-100-cr-and-more/sfrax)
- [Pendle docs — PT](https://docs.pendle.finance/ProtocolMechanics/YieldTokenization/PT)
- [Mountain Protocol](https://mountainprotocol.com/)
- [Coinbase USDC Rewards FAQ](https://help.coinbase.com/en/coinbase/coinbase-staking/rewards/usd-coin-rewards-faq)
- [Coinbase Wallet 4.7% APY rewards — The Block](https://www.theblock.co/post/327488/coinbase-wallet-introduces-4-7-apy-reward-for-usdc-holders)
- [Sentora Smart Yield press release](https://cointelegraph.com/press-releases/sentora-brings-institutional-defi-to-the-public-with-the-launch-of-its-smart-yield-platform)
- [Veda — DeFi vault docs](https://veda.tech/blog/what-is-a-defi-vault-how-veda-yield-vaults-work)
- [CoinDesk — USDe depeg Oct 11 2025](https://www.coindesk.com/markets/2025/10/11/ethena-s-usde-briefly-loses-peg-during-usd19b-crypto-liquidation-cascade)
- [CCN — USDe depeg explained](https://www.ccn.com/education/crypto/ethena-usde-depeg-binance-crash-explained/)
- [Joao Teixeira — Anatomy of a Meltdown](https://medium.com/@joaotx/anatomy-of-a-meltdown-lessons-from-the-october-11-crash-59dc7bfb522e)
- [BraveNewCoin — Coordinated attack analysis](https://bravenewcoin.com/insights/usde-depeg-on-binance-was-it-a-coordinated-attack)
- [99bitcoins — Ethena $8.3B outflow](https://99bitcoins.com/news/altcoins/ethena-usde-8b-outflows/)
- [CoinGecko — October 10 crash explained](https://www.coingecko.com/learn/october-10-crypto-crash-explained)
- [Llama Risk — Ethena USDe addendum](https://research.llamarisk.com/research/asset-risk-usde-addendum1)
- [Chaos Labs — Edge PoR integration](https://chaoslabs.xyz/posts/ethena-integrates-edge-proof-of-reserves)
- [Ethena Labs PoR tweet — Oct 2025](https://x.com/ethena_labs/status/1976988523598385528)
- [Lido Aave specification](https://docs.lido.fi/integrations/aave/specification/)
- [Code4rena — rebasing share tokens issue](https://github.com/code-423n4/2021-12-sublime-findings/issues/137)
- [Anchorage acquires Mountain Protocol](https://mooloo.net/articles/third-party-custody/anchorage-digital-acquires-mountain-protocol-to-bolster-stablecoin-capabilities/)
- [Mantle Vault on Bybit](https://www.benzinga.com/content/51449024/mantle-vault-on-bybit-powered-by-aave-and-cian-bridges-1-25b-in-defi-depth-to-80m-cefi-users)
- [Bitget Academy — USDY 4.25% APY](https://web3.bitget.com/en/academy/usdy-token-what-is-ondo-us-dollar-yield-and-how-to-earn-passive-income-with-4-25-percentage-apy)
- [Immunefi — Ondo bug bounty](https://immunefi.com/bug-bounty/ondofinance/)
- [Cyfrin — RWA audit blog](https://www.cyfrin.io/blog/rwa-protocol-audits-why-real-world-asset-security-requires-specialized-expertise)
