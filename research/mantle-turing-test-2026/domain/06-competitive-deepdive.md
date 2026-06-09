# Competitive Deep-Dive — Mantle Turing Test 2026

Documenting the five closest competitors to the wedge-shape in their own terms. No editorialization, no "we differ from X" — that's the next agent's job. Just observation and verbatim quotation.

---

### 1. Kite (ETHGlobal LFGHO 2024)

**Type:** Hackathon submission
**Status:** Abandoned — repo at `acgodson/kite` last commit `2024-02-06`; the ETHGlobal-linked GitHub appears to be a pivot/rename to a Lightlink savings-pool project. No GHO/Aave/BNPL code remains in the public repo named "kite."
**Chain(s):** Sepolia testnet (Aave GHO market), Avalanche Fuji (campaigns), cross-chain via Chainlink CCIP
**Source(s):**
- https://ethglobal.com/showcase/kite-g5fnj
- https://github.com/acgodson/kite (repo, but content mismatch — README is a savings-pool product, not BNPL)
- https://crosschain-kite.vercel.app (demo, 404)
- https://kite-ext.vercel.app (extension landing, minimal)

#### What it does (in plain language)
Kite is the project that most directly anticipates the Mantle wedge. From the ETHGlobal showcase: "A BNPL integration with a GHO-backed ERC-4626 vault. Users can conveniently offset interests accrued on their installment payments with yields earned from the Aave marketplace."

In practice, the merchant creates a campaign with payment terms, the buyer pays in installments, and a GHO-denominated ERC-4626 vault sits behind the scenes. The vault deposits its GHO into Aave's lending market; the yield generated is used to offset the interest the buyer owes on installments. So the BNPL credit is "cheaper" because the collateral side is yielding.

#### Architecture / mechanism in their own words
From the showcase: "Kite Core contract holds ownership of the vault and uses the GHO within the total supply to liquidate unhealthy loans on the lending markets."

Off-chain Chainlink Automation bots monitor Aave health factors and trigger liquidations when conditions are met; the liquidation profits + lending yield together offset buyer interest. They use Chainlink CCIP for cross-chain message passing so the Avalanche-side campaign can settle against a Sepolia-side GHO vault.

#### Their UX
A merchant configures a campaign defining payment terms (number of installments, period, interest %). The buyer connects a wallet, picks "pay in installments," and presumably the vault auto-deposits GHO on their behalf to begin earning yield while paying down the schedule. The wallet-extension component (`kite-ext.vercel.app`) implies a checkout-flow browser extension was envisioned, but the live demo is offline.

#### What problem they articulate solving
Two stacked goals: (1) bring real BNPL on-chain using GHO as the credit currency, (2) make the credit "free or near-free" to buyers by routing Aave yield/liquidation profit into the interest line. The implicit thesis: GHO needs real consumer use cases beyond DeFi-native.

#### Notable strengths (just observed)
- The earliest documented hackathon attempt at GHO-as-BNPL-rail.
- Used Chainlink Automation for liquidation triggering (production-grade keeper pattern).
- Cross-chain by design (CCIP between Avalanche campaigns and Sepolia Aave market).
- ERC-4626 vault standard chosen for composability.

#### Documented limitations / gaps (just observed)
- Liquidation bots are off-chain; relies on bot operator economics.
- Testnet-only deployment (Sepolia, Avalanche Fuji).
- No KYC, no real merchant onboarding flow, no fiat off-ramp.
- README/repo doesn't actually contain the BNPL code in its current state — appears the team either pivoted or this was a sprint demo never hardened.

#### What we know about post-launch traction
None. No mainnet deployment, no follow-on funding, no Twitter activity by the team about Kite specifically. Last commit Feb 6, 2024. Demo URL returns 404. The team member `acgodson` has continued building in unrelated areas (Internet Computer projects, AI agents) — has not returned to BNPL.

#### Public artifacts (repo, demo, docs)
- ETHGlobal page: https://ethglobal.com/showcase/kite-g5fnj
- GitHub: https://github.com/acgodson/kite (last push 2024-02-06, content mismatched)
- Demo (dead): https://crosschain-kite.vercel.app
- Wallet extension landing: https://kite-ext.vercel.app

---

### 2. Orbit Finance (HackMoney 2026)

**Type:** Hackathon submission, still under development
**Status:** Active — last commit `2026-04-02`, 59 commits total. Frontend deployed on Vercel. Testnet contracts deployed on Mantle Sepolia.
**Chain(s):** Mantle Sepolia (Chain ID 5003) — relevant: same chain family as the Mantle Turing Test target.
**Source(s):**
- https://ethglobal.com/showcase/orbit-finance-7f55o
- https://github.com/ItachiOnChain/orbitfinance
- https://0xorbitfinance.vercel.app/
- Demo video: https://youtu.be/B7UIw3j0QiE

#### What it does (in plain language)
Orbit Finance is "A Hybrid Self-Repaying Lending Protocol Combining DeFi + Real-World Assets … debt reduces over time through yield generation." The user posts collateral (DeFi token or tokenized RWA), borrows the protocol's stablecoin `orUSD`, and the collateral is then deployed to yield-bearing strategies (DeFi vaults or SPV-managed RWA cashflows). Yield from those strategies is automatically routed to a repayment engine that pays down the borrower's debt without manual intervention.

They are explicit about the lineage: "Orbit Finance is inspired by Alchemix but extends the self-repaying loan concept to Real-World Assets."

#### Architecture / mechanism in their own words
Six-step flow from their README:
1. Collateral Deposit — user posts yield-generating crypto or RWA.
2. Loan Issuance — borrower receives `orUSD` (the protocol stablecoin).
3. Collateral Investment — assets deployed to yield strategies or SPVs.
4. Yield Generation — continuous income from DeFi or real-world cashflows.
5. Automatic Repayment — yield routed to the Auto-Repayment Engine reduces debt.
6. Debt Elimination — full repayment unlocks collateral.

Contract surface (Mantle Sepolia deployments):
- `AccountFactory: 0xda796117bf6905dd8db2ff1ab4397f6d2c4adda3`
- `DebtManager: 0xa7240bcff60eef40f31b8ed5d921bad6db13b199`
- `orUSD Token: 0xc565eb7363769f8ffae0005285ccd854c631a0a0`
- `IdentityRegistry: 0x5edb3ff1ea450d1ff6d614f24f5c760761f7f688`
- `OrbitRWAPool: 0x98f74b7c96497070ba5052e02832ef9892962e62`
- `SeniorTranche: 0xf47e3b0a1952a81f1afc41172762cb7ce8700133`
- `JuniorTranche: 0xc63db9682ff11707cadbd72bf1a0354a7fef143b`
- WaterfallDistributor (referenced but addr not extracted)

The RWA side uses an ERC-3643-style `IdentityRegistry` (KYC gating), a senior/junior tranche pair (`srORB` 6–8% APY, `jrORB` 12–18% APY with the junior absorbing first 20% loss), and a waterfall distributor that splits cashflows.

The RWA implementations described (rental income NFTs, invoice-backed assets, bonds) appear to be framework scaffolding rather than live integrations — there are no public mappings of `OrbitRWAPool` to real-world counterparties.

#### Their UX
From the deployed app (`0xorbitfinance.vercel.app`): the user lands on a "Self-Repaying Loans" headline, can deposit collateral and select a strategy, and a dashboard shows outstanding debt declining over time as yield accrues. The flow visually treats yield-debt reduction as the headline gauge.

#### What problem they articulate solving
"Traditional lending requires manual repayment and carries liquidation risk." The Orbit thesis is the Alchemix one applied to a larger collateral base (RWAs in addition to DeFi assets) on a Mantle-native deployment.

#### Notable strengths (just observed)
- Already deployed on Mantle Sepolia (same chain family as Mantle Turing Test).
- Native protocol stablecoin (`orUSD`) is internally minted — they own the credit primitive.
- Senior/junior tranching structure for RWA pools — risk segmentation built in.
- Identity registry built into the architecture, signaling compliance intent.
- Demo video published.

#### Documented limitations / gaps (just observed)
- Testnet only.
- RWA implementations described as "framework scaffolding" — no live institutional counterparty named in the README.
- Auto-Repayment Engine internal logic not documented in README (frequency, trigger, gas cost not described).
- No team members publicly named ("Built with ❤️ by the Orbit Finance Team").
- No mention of merchant integration or BNPL — this is a lending protocol, not a checkout flow.

#### What we know about post-launch traction
- Repo still receiving commits (most recent README update April 2, 2026).
- Frontend deployed and live.
- No Twitter / community / governance presence found in surface research.
- No mention of prizes or follow-on funding.

#### Public artifacts (repo, demo, docs)
- ETHGlobal page: https://ethglobal.com/showcase/orbit-finance-7f55o
- GitHub: https://github.com/ItachiOnChain/orbitfinance
- App: https://0xorbitfinance.vercel.app/
- Demo: https://youtu.be/B7UIw3j0QiE

---

### 3. Aave Horizon (live institutional product)

**Type:** Live product (permissioned RWA market within the Aave protocol)
**Status:** Live — launched **August 2025**. As of week 27 (late 2025/early 2026): TVL ~$424.6M, net borrows $110.1M.
**Chain(s):** Ethereum mainnet only. No L2 deployments (and Aave V4 itself, launched March 2026, has no plans for an Aave-bespoke L2 per Kulechov).
**Source(s):**
- https://aave.com/blog/horizon-launch
- https://defillama.com/protocol/aave-horizon-rwa
- https://app.aave.com/?marketName=proto_horizon_v3
- https://centrifuge.io/blog/centrifuge-aave-horizon
- https://stablecoininsider.org/aave-horizon-complete-breakdown-2025/
- https://www.coindesk.com/business/2025/08/25/aave-labs-debuts-horizon-to-let-institutions-borrow-stablecoins-against-tokenized-assets
- LlamaRisk Horizon weekly: https://x.com/LlamaRisk/status/2031000609889865884

#### What it does (in plain language)
Aave Horizon is "a new lending market on Ethereum where institutions or other qualified users borrow stablecoins against real-world assets (RWAs)." It is built on Aave V3.3 and operates as a parallel permissioned market alongside the regular Aave V3/V4 deployments.

The structural innovation is asymmetric permissioning: the **borrow side is gated** (only KYC'd institutions whitelisted by the RWA issuer can post tokenized treasuries/credit as collateral and borrow stablecoins), while the **lend side is fully open** ("Supplying stablecoins to Aave Horizon requires no permissions. Anyone can supply RLUSD, USDC, or GHO for institutions to borrow"). Retail users get exposure to institutional credit spreads; institutions get a stablecoin liquidity venue against their RWA holdings.

#### Architecture / mechanism in their own words
- Built on Aave V3.3.
- `aTokens` representing RWA collateral deposits are **non-transferable** "to respect issuer transfer restrictions" — administrative powers "cannot approve trades or redirect funds."
- Each RWA issuer (Superstate, Centrifuge, Circle, VanEck) maintains its own whitelist and KYC.
- LTV ratios 70–85% for treasury-backed tokens (per StablecoinInsider).
- Interest rates 3–8% APR, algorithmically adjusted.
- Chainlink provides NAV feeds for real-time collateral valuation.
- Liquidation triggered automatically when health factor < 1.0.

#### Their UX
Two distinct UXs:

**Institutional borrower** — completes off-chain KYC with the RWA issuer (Superstate / Centrifuge / Circle / VanEck), gets whitelisted to hold the tokenized asset, posts as collateral inside Horizon, borrows GHO/RLUSD/USDC. Minimum investment $100k–$1M per StablecoinInsider.

**Retail lender** — connects a wallet to `app.aave.com?marketName=proto_horizon_v3`, supplies GHO/RLUSD/USDC with no KYC, earns institutional-credit-spread yield. No tokens of theirs are transferable to the RWA side; they only see the stablecoin supply pool.

#### What problem they articulate solving
"More than $25 billion worth of tokenized assets are on-chain but mostly underutilized within conventional setups." Tokenized treasuries and credit funds exist but lack a venue to be used as collateral for stablecoin liquidity inside DeFi — Horizon is that venue.

#### Notable strengths (just observed)
- Real institutional adoption: $424.6M TVL, $110.1M net borrows, growing.
- Marquee RWA issuers integrated: Superstate (USTB, USCC), Centrifuge (JAAA, JTRSY), Circle (USYC), VanEck (VBILL).
- Resolv + Centrifuge deployed up to $100M in JAAA on Horizon (Feb 2026, largest RWA deal in DeFi).
- 13 security audits (OpenZeppelin, Trail of Bits among them).
- Backed by Aave DAO's $125M reserve.
- 24/7 instant settlement vs T+2 traditional.

#### Documented limitations / gaps (just observed)
- Ethereum mainnet only — no L2, no Mantle.
- Institutional gating means retail can't borrow against RWAs themselves.
- No consumer checkout / payment / BNPL exposure — purely a stablecoin lending venue.
- TVL composition is heavily weighted toward RLUSD ($263.66M of $424.6M, ~62%) — single-asset concentration on the supply side.
- GHO supply is only $34.69M out of $424.6M (~8%) despite Aave being the issuer.

#### What we know about post-launch traction (current TVL composition)
- RLUSD: $263.66M
- USCC: $121.72M
- USTB: $66.58M
- GHO: $34.69M
- JAAA: $17.28M
- USDC: $8.14M
- VBILL: $6.25M

Current rates (Horizon market dashboard):
- RLUSD Supply 4.37% / Borrow 2.85%
- GHO Supply 2.51% / Borrow 2.79%
- USDC Supply 2.77% / Borrow 3.28%

#### Public artifacts (repo, demo, docs)
- Live market: https://app.aave.com/?marketName=proto_horizon_v3
- Launch blog: https://aave.com/blog/horizon-launch
- DeFiLlama: https://defillama.com/protocol/aave-horizon-rwa
- Centrifuge partnership: https://centrifuge.io/blog/centrifuge-aave-horizon

---

### 4. KlarnaUSD on Tempo

**Type:** Live product (testnet) / pre-launch (mainnet)
**Status:** **Testnet only as of mid-2026.** Mainnet launch scheduled for "2026" (no specific date confirmed). Currently not publicly available — only internal Klarna integration testing.
**Chain(s):** Tempo (Stripe + Paradigm's L1 blockchain). Not Ethereum, not an L2.
**Source(s):**
- https://atomicwallet.io/academy/articles/klarna-launches-klarnausd
- https://www.pymnts.com/blockchain/2025/klarna-debuts-first-stablecoin-klarnausd-on-tempo-blockchain/
- https://blockonomi.com/klarna-launches-klarnausd-stablecoin-on-stripe-tempo-blockchain/
- https://invezz.com/news/2025/11/25/klarna-launches-klarnausd-stablecoin-plans-2026-rollout-on-stripes-tempo-blockchain/

#### What it does (in plain language)
KlarnaUSD is "a US dollar-pegged stablecoin" issued by Klarna on Tempo, making Klarna "the first digital bank to issue a token on Stripe and Paradigm's Tempo blockchain." It is built on **Open Issuance by Bridge** (Bridge is a Stripe-owned stablecoin infrastructure platform). Bridge handles compliance, reserve management, and connectivity for institutions issuing branded stablecoins.

The interesting and load-bearing detail: Klarna has explicitly stated they will **not** integrate KlarnaUSD into their consumer BNPL product at launch. Per the Blockonomi reporting: "The company has no current plans to integrate stablecoins into its installment-payment services."

#### Architecture / mechanism in their own words
- Built via **Open Issuance by Bridge** (Stripe subsidiary).
- Tempo is a "layer-1 blockchain developed by Stripe and Paradigm" optimized for "transaction speed, settlement cost and the ability to support high-volume cross-border activity."
- Stablecoin "backed by short-term securities or cash-like assets" — specific collateral mix not publicly disclosed.
- Compliance framing: U.S. GENIUS Act (passed July 2025) is cited as the regulatory context.
- "Initial uses including merchant payouts, cross-border settlement, refunds, and internal funding flows."

#### Their UX
There is no consumer UX yet. KlarnaUSD on testnet is internal-only. The framing from Klarna CEO Sebastian Siemiatkowski: the goal is to "challenge old networks and make payments faster and cheaper," focused on the ~$120B/year fee pool in cross-border merchant payments.

When mainnet launches, the expected UX is invisible-to-consumer: KlarnaUSD is the rail Klarna uses internally to settle merchant payouts globally, bypassing SWIFT. Consumers using Klarna BNPL still pay in fiat; the stablecoin only appears in the backend reconciliation flow.

#### What problem they articulate solving
"The primary goal is reducing costs for international payments within Klarna's systems" — Klarna processes $112B GMV across 114M customers across 26 markets, and traditional cross-border settlement (SWIFT, correspondent banking) extracts an estimated $120B/year in industry fees. KlarnaUSD is a backend treasury and settlement instrument first, consumer product never (currently).

#### Notable strengths (just observed)
- Largest BNPL provider in the world doing stablecoin issuance — adoption funnel exists by default.
- Stripe + Paradigm backing on Tempo = highest-tier institutional support.
- Bridge handles compliance — regulated, GENIUS-Act-compatible stablecoin from day one.
- Internal first use case means real GMV through the token from launch ($112B/year addressable).

#### Documented limitations / gaps (just observed)
- Testnet only. Not publicly available.
- Tempo is a brand-new L1 — no DeFi ecosystem, no third-party tooling, no liquidity venues.
- Explicit "no consumer BNPL integration" stance limits the most interesting use case.
- Bridge / Open Issuance is opaque — collateral mix, redemption rules, holder eligibility not disclosed.
- No public-facing wallet, dApp, or developer SDK announced for KlarnaUSD specifically.

#### What we know about post-launch traction
Pre-launch on mainnet. Currently no on-chain TVL, no observable transaction volume (testnet only).

#### Public artifacts (repo, demo, docs)
- Klarna corporate announcement (Nov 25, 2025).
- Tempo blockchain: tempo.xyz (not deeply researched here).
- Bridge / Open Issuance: bridge.xyz (Stripe-owned).
- No public Klarna SDK or repo for KlarnaUSD.

---

### 5. UCP — Universal Commerce Protocol

**Type:** Open standard (Apache 2.0) with reference SDKs
**Status:** **Live as of May 2026.** v2026-04-08 release. ~3,078 stars on GitHub. Active development (177 commits, 60 open issues, 62 PRs).
**Chain(s):** None — UCP is web/API infrastructure, not a blockchain protocol. Payment rails are TradFi (Google Pay + Affirm + Klarna + Stripe).
**Source(s):**
- https://ucp.dev/
- https://github.com/Universal-Commerce-Protocol/ucp
- https://developers.google.com/merchant/ucp
- https://blog.google/products-and-platforms/products/shopping/shopping-updates-google-marketing-live/
- https://www.digitalcommerce360.com/2026/05/13/affirm-klarna-google-bnpl-agentic-commerce/
- https://searchengineland.com/google-expands-universal-commerce-protocol-and-launches-new-agentic-shopping-tools-478113
- https://www.pymnts.com/news/artificial-intelligence/2026/klarna-joins-google-universal-commerce-protocol-advance-agentic-ai

#### What it does (in plain language)
UCP is "an open standard enabling interoperability between various commerce entities to facilitate seamless commerce integrations." It's the protocol Google, Shopify, Stripe, Affirm, Klarna, and others built so that AI agents (specifically Google's Gemini and AI Mode) can discover, cart, check out, and pay across multiple merchants in one conversational flow.

Concrete shape: a transport-agnostic spec (REST + MCP + A2A) covering five core capabilities — Catalog Search, Cart Building, Identity Linking, Checkout, Order Management. AP2 (Agent Payments Protocol) handles the payment mandate side.

#### Architecture / mechanism in their own words
From the UCP GitHub repo description: "Specification and documentation for the Universal Commerce Protocol (UCP)" — written in Python (reference implementation), Apache 2.0 licensed, created Dec 31, 2025.

Core technical surface (from developers.google.com/merchant/ucp and ucp.dev):
- **Transports:** REST API, MCP (Model Context Protocol) binding, A2A (Agent-to-Agent), JSON-RPC.
- **Capabilities (commerce primitives):** Catalog Search, Cart Building, Identity Linking, Checkout, Order Management, Payment Token Exchange.
- **Identity:** OAuth 2.0 for delegated authorization. "OAuth 2.0 implementation for secure authorization without credential sharing."
- **Payments:** Built-in support for AP2 (Agent Payments Protocol) "payment mandates and verifiable credentials."
- **Architecture pattern:** Composable — splits into Capabilities (core) and Extensions (e.g., discounts).
- **Webhooks:** Real-time order lifecycle updates for fulfillment tracking.

Critical structural fact: **"The retailer always remains the merchant of record."** Money flow is non-custodial to Google — Google brokers the agent-driven interaction, but the actual payment flows merchant↔customer through Google Pay + the retailer's settlement, not a Google-held cart balance.

#### Their UX
The end-to-end "agentic shopping" flow as documented:
1. User asks Gemini / AI Mode a shopping question ("find me running shoes under $150 for trail use").
2. Google surfaces product listings with embedded buy buttons (UCP-aware).
3. User can build a "Universal Cart" across multiple retailers (e.g., one item from Nike, one from Ulta).
4. Checkout happens in-surface using Google Pay; Affirm or Klarna BNPL appears as a Google Pay payment option (real-time eligibility check, installment plans).
5. Each retailer remains the merchant of record; order lifecycle webhooks fire back to the agent surface.

Launch merchants confirmed: Nike, Sephora, Target, Ulta Beauty, Walmart, Wayfair, plus Shopify merchants (Fenty, Steve Madden). Expanded May 2026 to hotels, food delivery, and Canada/Australia/UK.

#### What problem they articulate solving
Fragmented commerce: AI agents cannot perform multi-merchant shopping because each retailer/PSP/wallet/identity provider has bespoke APIs. UCP is the lingua franca so a single agent (Gemini today, others tomorrow) can drive checkout across any participating merchant.

The Affirm CEO framing (May 12, 2026 launch): "As shopping moves into conversational and AI-driven environments, flexible payments become essential infrastructure" — Klarna's David Sykes.

#### Notable strengths (just observed)
- Backed by an unusual coalition: Google + Shopify (founding), with Amazon, Meta, Microsoft, Salesforce, Stripe joining the UCP Tech Council April 24, 2026.
- Real merchant adoption at launch: Nike, Walmart, Target, etc.
- Open source, Apache 2.0, governed openly via GitHub (3.1k stars).
- AP2 integration means payment mandates are baked into the agent flow.
- BNPL (Affirm + Klarna) is a first-class payment option, not an afterthought.
- "Merchant of record" stays with retailer — no antitrust / custody overhead for Google.

#### Documented limitations / gaps (just observed)
- Web / TradFi only. No crypto, no stablecoin, no on-chain settlement.
- Money flow uses Google Pay rails — same fee structure as current card networks (interchange).
- Identity = OAuth 2.0 only — no wallet-based or decentralized identity.
- Single dominant orchestrator (Google) despite "open standard" framing; Gemini/AI Mode is the only consumer surface live at launch.
- BNPL underwriting is still done by Affirm/Klarna with traditional credit checks — UCP doesn't redesign credit.
- Klarna's separate AI customer-service play was reversed (May 2025 — CEO said "we went too far" rehiring humans after a failed OpenAI-powered chatbot replacing 700 staff). That reversal is a separate story from UCP, but it's why Klarna doubled down on infra plays (KlarnaUSD, UCP) rather than consumer-AI products.

#### What we know about post-launch traction
- Released May 20, 2026 at Google Marketing Live.
- Expanded to hotels and food delivery within weeks.
- BNPL integration (Affirm + Klarna) added May 13, 2026.
- Tech Council expanded April 24, 2026 to include Amazon, Meta, Microsoft, Salesforce, Stripe.
- 273 retailers in DC360 Top 2000 accept Affirm; 203 accept Klarna (but only 24 use Affirm as an active vendor).
- UCP GitHub: latest push 2026-06-02 (today). Active.

#### Public artifacts (repo, demo, docs)
- Spec: https://github.com/Universal-Commerce-Protocol/ucp
- Docs: https://ucp.dev/
- Google developer guide: https://developers.google.com/merchant/ucp
- Launch announcement: https://blog.google/products-and-platforms/products/shopping/shopping-updates-google-marketing-live/

---

## Section 6 — Cross-cutting patterns

### Shared architectural patterns across these five competitors

1. **Asymmetric permissioning of credit vs liquidity.** Aave Horizon, Orbit Finance, and Kite all use an architecture where the credit side (borrowing / installment-receiving) is gated (KYC / merchant whitelist / qualified investor), while the lend / supply side is open. UCP applies the same idea outside crypto: merchants are gated participants in the protocol, but consumers are not.

2. **Yield-funded credit subsidy.** Three of the five (Kite, Orbit Finance, Aave Horizon implicitly) treat yield from collateral as the mechanism that offsets the borrower's cost. Kite uses Aave GHO vault yield to offset BNPL interest; Orbit uses collateral yield to auto-repay debt; Aave Horizon retail lenders earn the institutional spread that institutions are willing to pay for stablecoin liquidity.

3. **ERC-4626 or vault-like collateral wrappers.** Kite and Orbit both wrap their yield-bearing collateral in vault primitives. Aave Horizon uses non-transferable `aTokens` to similar effect.

4. **Open lend side as the on-ramp to retail.** When a retail user appears in any of these systems, they appear on the lend / supply side — never the borrow side. (Even UCP's consumer flow is technically the "merchant gets paid" side.)

5. **Stablecoin as the unit of credit.** GHO (Kite, Aave Horizon), `orUSD` (Orbit), USDC/RLUSD (Aave Horizon), KlarnaUSD (Klarna), Google Pay+BNPL fiat-equivalents (UCP). Every competitor denominates credit in a stablecoin or a stablecoin-equivalent.

### Where they diverge (decisions NOT shared)

1. **Where the credit relationship lives.** Kite and UCP put it at checkout (merchant-buyer-installments). Orbit puts it as a generic lending protocol (post collateral, borrow). Aave Horizon puts it as institutional treasury operations. KlarnaUSD puts it as internal Klarna backend settlement.

2. **Custody of the payment instrument.**
   - Kite / Orbit / Aave Horizon: non-custodial smart-contract on Ethereum-family chains.
   - KlarnaUSD: custodial (Bridge / Stripe holds reserves).
   - UCP: non-custodial to Google but custodial to PSPs and merchants in traditional terms.

3. **Chain selection.**
   - Mantle Sepolia: Orbit Finance only.
   - Ethereum mainnet: Aave Horizon only.
   - Sepolia/Avalanche cross-chain: Kite only.
   - Tempo L1: KlarnaUSD only.
   - No chain: UCP.

4. **Consumer-facing vs B2B/B2I.** Kite is the only one of the five that was clearly designed for the **consumer at checkout** with credit they can actually use to buy things. Orbit is consumer-facing but is a DeFi lending UX, not a commerce UX. Aave Horizon and KlarnaUSD are institutional / backend. UCP is consumer-facing but in fiat.

5. **RWA vs DeFi-native collateral.** Aave Horizon (RWA-only), Orbit (hybrid), Kite (DeFi-only, GHO), KlarnaUSD (collateral mix undisclosed), UCP (no collateral concept).

6. **Real-world traction.** Only Aave Horizon and UCP are live with material adoption ($424M TVL; live across major retailers). Kite is abandoned. Orbit is testnet. KlarnaUSD is testnet.

### What none of them do (gaps observed)

1. **No competitor combines on-chain consumer BNPL at checkout with a Mantle-native deployment.** Kite tried (different chain, abandoned). Orbit is on Mantle but is generic self-repaying lending, not BNPL. Aave Horizon is institutional and Ethereum-only. KlarnaUSD explicitly excludes consumer BNPL. UCP is fiat.

2. **No competitor exposes a real "agentic shopping" flow on-chain.** UCP does it in fiat. None of the crypto-native competitors have an AI agent at the front of the funnel selecting purchases on behalf of a user.

3. **No competitor uses Mantle's mETH/cmETH or Mantle-native yield primitives as the yield engine that subsidizes credit.** Orbit is on Mantle Sepolia but the README does not name Mantle-specific yield sources.

4. **No competitor combines the consumer side (UCP shape) with the on-chain credit side (Kite/Aave Horizon shape) in a single offering.** They are parallel universes — UCP routes to Affirm/Klarna for credit, who themselves are not on-chain. Aave Horizon routes credit to institutions, not consumers.

5. **No competitor has a merchant-facing instant settlement layer that uses RWA yield to fund consumer credit at the point of sale.** Aave Horizon is the closest but caps borrowers at institutions; Orbit is the closest on Mantle but lacks the checkout-merchant flow.

6. **None of the five have a live KYC-as-a-service primitive that consumer-grade users can complete inline.** Aave Horizon uses RWA-issuer-side KYC (hours/days). Orbit has an `IdentityRegistry` but no described enrollment UX. Kite has none. KlarnaUSD inherits Klarna's KYC but isn't consumer-facing. UCP uses OAuth.

---

## Sources

- ETHGlobal Kite: https://ethglobal.com/showcase/kite-g5fnj
- ETHGlobal Orbit Finance: https://ethglobal.com/showcase/orbit-finance-7f55o
- Aave Horizon blog: https://aave.com/blog/horizon-launch
- Aave Horizon app: https://app.aave.com/?marketName=proto_horizon_v3
- DeFiLlama Horizon: https://defillama.com/protocol/aave-horizon-rwa
- Centrifuge × Horizon: https://centrifuge.io/blog/centrifuge-aave-horizon
- StablecoinInsider Horizon breakdown: https://stablecoininsider.org/aave-horizon-complete-breakdown-2025/
- CoinDesk Horizon launch: https://www.coindesk.com/business/2025/08/25/aave-labs-debuts-horizon-to-let-institutions-borrow-stablecoins-against-tokenized-assets
- Blockonomi KlarnaUSD: https://blockonomi.com/klarna-launches-klarnausd-stablecoin-on-stripe-tempo-blockchain/
- PYMNTS KlarnaUSD: https://www.pymnts.com/blockchain/2025/klarna-debuts-first-stablecoin-klarnausd-on-tempo-blockchain/
- UCP GitHub: https://github.com/Universal-Commerce-Protocol/ucp
- UCP docs: https://ucp.dev/
- Google UCP guide: https://developers.google.com/merchant/ucp
- Google blog UCP launch: https://blog.google/products-and-platforms/products/shopping/shopping-updates-google-marketing-live/
- DC360 BNPL + UCP: https://www.digitalcommerce360.com/2026/05/13/affirm-klarna-google-bnpl-agentic-commerce/
- Search Engine Land UCP: https://searchengineland.com/google-expands-universal-commerce-protocol-and-launches-new-agentic-shopping-tools-478113
- PYMNTS Klarna+UCP: https://www.pymnts.com/news/artificial-intelligence/2026/klarna-joins-google-universal-commerce-protocol-advance-agentic-ai
- Klarna rehire-humans: https://fortune.com/2025/05/09/klarna-ai-humans-return-on-investment/
