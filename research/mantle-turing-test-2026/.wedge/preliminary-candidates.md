# Preliminary Wedge Candidates — drafted in main thread before subagent return

**Author:** main-thread agent
**Date:** 2026-06-02
**Status:** PRELIMINARY — to be refined / augmented / refuted after subagents A/B/C return

> These are 8 candidates drafted from the existing research folder alone (CONTEXT.md, 06-hidden-field.md, 02-sponsor-docs.md). When the inspiration subagents return with `.wedge/cross-ecosystem-winners.md`, `.wedge/web2-inspirations.md`, `.wedge/problem-signals.md`, the synthesis pass should:
> 1. Add new candidates surfaced by subagents (likely 3-5 more)
> 2. Refute candidates here that subagents reveal as already-shipped duplicates
> 3. Re-score everything with subagent evidence
> 4. Pick top 2-3 for novelty gate

---

## Core architectural pattern every candidate inherits

A single agent that:
- Registers an **ERC-8004 identity** on Mantle mainnet (Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`)
- Accumulates **reputation** on Mantle (Reputation Registry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`)
- Executes via **Byreal Skills CLI** on Solana (`byreal-cli` for CLMM swap/LP) and/or Hyperliquid (`byreal-perps-cli`)
- Settles/parks capital in **Mantle RWA primitives** (USDY for stable yield, mUSD for rebasing, MI4 for diversified, mETH for ETH-denominated)
- Pays for compute via **x402 micropayments** (Mantle Questflow integration)

This is the platform stack. Every candidate below specifies what the agent USES this stack FOR.

---

## Scoring rubric (multiplicative floor)

Each candidate scored 1-5 on each dimension. **Lowest single dimension = the "floor"**, candidates with floor ≤ 2 disqualified.

| Dim | What it measures |
|---|---|
| Lane | Hits Track 3 + Track 6 cross-pairing OR Grand Champion + 1 green track? |
| Sponsor | Consumes credit-sponsor APIs (Nansen/Elfa/Surf/Orbit/Allora) AND integrates ≥2 Mantle/Byreal primitives? |
| Complement | Free of direct competition with Virtuals/Nansen/Animoca/Allora? Reads as gift to their infra? |
| Demo | Visible value moment in 90 seconds live on stage Jul 2-3? |
| Build | Achievable solo or with 2-3 person team in 10 days (3 buffer)? |
| Riskiest | Riskiest assumption testable Day 1-2 with simple harness? |
| Novelty | Differentiated from inferred competitor archetypes (ClawHack alumni rebuilds, Virtuals porters, ERC-8004 reference impl users)? |
| Narrative | Fits in one tweet that an APAC retail audience can understand? |

---

## Candidate 1 — AgenticTreasury (Personal CFO for crypto-native solo founders)

**What:** User points their crypto income at this agent's wallet. Agent automatically (a) splits into emergency fund (USDY) + monthly burn (kept liquid) + growth (mETH + Byreal LP positions on Solana), (b) rebalances on Allora volatility regime signals, (c) generates tax-export-ready logs.

**Tracks:** Track 3 (RWA settlement) + Track 6 (Byreal LP execution) + Grand Champion eligible.

**Web2 inspiration:** Mercury Treasury AI, Multis, Den Wallet AI features.

**Complement check:** Consumes Nansen wallet labels for "what kind of person are you" personalization, Allora for regime signals, Byreal for execution. Doesn't compete with anyone direct.

**Riskiest assumption:** LLM reliably emitting correct Byreal CLI command sequences without hallucination. Testable Day 1 with a fixed-fixture harness.

**90s demo:** "Just sent $5,000 USDC to this agent. Watch what it does." → split, deposit, LP open, all visible. Tax ledger updates live.

**Score:** Lane 5 · Sponsor 5 · Complement 5 · Demo 4 · Build 4 · Riskiest 4 · Novelty 3 · Narrative 4 → Floor 3, Sum 34

---

## Candidate 2 — GiveMeMyYield (Western Union killer + yield-while-in-transit)

**What:** Telegram-native agent. User says "send 5000 PHP to my mom" in plain English. Agent (a) converts via off-ramp partner sims at the demo, (b) parks USDY/mUSD during transit so the money EARNS YIELD while moving, (c) settles into recipient's preferred local rail, (d) emits on-chain receipt for both ends.

**Tracks:** Track 3 (USDY/mUSD core asset) + Track 6 (Byreal CLMM execution + RealClaw real-life expansion).

**Web2 inspiration:** Western Union ($14B/yr revenue), Wise transfer optimizer, Remitly, GCash AI, Sendwave.

**Differentiator vs anything that exists:** **Yield WHILE the money is moving.** Nobody does this. WU charges 6-10% + 1-3 days. Crypto rails are faster but don't earn yield during transit. We earn USDY's ~5% APY on the float during the 2-5 minute transit window. Numerically tiny per-transaction but DRAMATIC as a demo statement and architecturally novel.

**Complement check:** Hits BGA (literal social good — diaspora remittance), Hashed (stablecoin + agent intersection — their exact thesis), APAC judge panel (Indonesia/Philippines/Vietnam volume), Animoca (consumer + viral).

**Riskiest assumption:** Whether we can show a credible off-ramp endpoint in 13 days. Probably: partner-API mocked for demo + real Mantle/Solana legs on testnet. Testable Day 1-2.

**90s demo:** Split-screen on stage. Left: pay $1,000 USD with Western Union — $80 fee, 2 days. Right: pay $1,000 with our agent — $1.50 fee, 2 minutes, earned $0.30 yield while in transit. The visual difference IS the pitch.

**Score:** Lane 5 · Sponsor 4 · Complement 5 · Demo 5 · Build 3 · Riskiest 3 · Novelty 5 · Narrative 5 → Floor 3, Sum 35

> **Front-runner of the preliminary set.** Highest sum at floor 3. The novelty is structural (yield-while-transiting), the narrative is one sentence, the demo is dramatic, the judge fit is high.

---

## Candidate 3 — AgentBazaar (agent-to-agent commerce hub using ERC-8004 + ERC-8183 + x402)

**What:** A directory where AI agents list services for sale ("I'll write your trading strategy for 50 USDC"). Agents pay each other via x402 micropayments and earn ERC-8004 reputation. Live cross-chain (Mantle settlement, Solana execution via Byreal).

**Tracks:** Track 6 (Agentic Economy) + Grand Champion (this IS Mantle's official thesis).

**Web2 inspiration:** Fiverr, Upwork, but for agents only. Or: GPT Store but with on-chain payments.

**Complement check:** Complements Virtuals Protocol (extends their ACP cross-chain to Mantle — Virtuals' COO is judging, they co-authored ERC-8183). Complements Mantle (uses every standard they shipped). Stamps Hashed's thesis.

**Riskiest assumption:** Can we get >1 real agent to use this in the live demo? Otherwise it's vaporware. Testable Day 1 only if we already control both buyer and seller agents — which is fine for demo but feels weak.

**90s demo:** Two agents trade live on stage — Agent A (UI for end-user) orders a research report from Agent B (specialized researcher). Payment flows in x402. Reputation updates. The "agent commerce future" is visible.

**Score:** Lane 5 · Sponsor 5 · Complement 5 · Demo 3 · Build 3 · Riskiest 2 · Novelty 4 · Narrative 4 → Floor 2, **DISQUALIFIED** (vaporware-shape risk on the demo)

> Could be revived if subagent A finds evidence that ERC-8183 / x402 agents already exist in the wild and we can integrate live with one of them.

---

## Candidate 4 — HealthCFO (RealClaw Real-Life expansion + USDY commitment device)

**What:** From the rubric's "RealClaw Real-Life Expansion" path. User connects Apple Health / Fitbit. Agent helps them set personal health goals. User stakes USDY/mUSD against goal completion — agent verifies via health-data oracle, returns stake + yield if hit, redirects yield to charity (BGA-affiliated) if missed.

**Tracks:** Track 6 (RealClaw real-life path) + Track 3 (USDY yield).

**Web2 inspiration:** StickK.com (commitment contracts), Beeminder, Habitica.

**Complement check:** Animoca consumer thesis, BGA social-good (charity yield redirect), Hashed stablecoin + agent.

**Riskiest assumption:** Health-data oracle integration. Gameable verification. Build complexity goes through the roof if we try to do real oracles.

**90s demo:** "Today I committed $100 USDY to walking 10K steps. Watch the agent verify it from my phone live." Clean stage moment.

**Score:** Lane 4 · Sponsor 3 · Complement 4 · Demo 4 · Build 2 · Riskiest 2 · Novelty 5 · Narrative 4 → Floor 2, **DISQUALIFIED** (build complexity + health-data oracle risk)

---

## Candidate 5 — MerchantGenie (yield-aware crypto checkout widget)

**What:** Merchants embed a 1-line widget. Customer pays in any stablecoin. Agent converts via Byreal Solana CLMM if needed, settles in USDY (yielding while held). Merchant withdraws in their preferred local stable. Yield earned during settlement window splits 80/20 merchant/protocol.

**Tracks:** Track 4 (Consumer & Viral) + Track 6 (Agentic Economy).

**Web2 inspiration:** Stripe, Square checkout, Shopify Payments.

**Complement check:** Doesn't compete with Stripe (different rails). Complements Animoca (consumer interface), Byreal (drives volume).

**Riskiest assumption:** Building a usable checkout widget in 13 days; finding a real merchant for the demo.

**90s demo:** Buy a $5 coffee on stage with the widget. Show fee comparison vs Stripe + yield earned during settlement.

**Score:** Lane 4 · Sponsor 4 · Complement 4 · Demo 4 · Build 3 · Riskiest 3 · Novelty 4 · Narrative 4 → Floor 3, Sum 30

---

## Candidate 6 — Cross-Venue Basis Arb Agent (Byreal CLMM ↔ Hyperliquid Perps)

**What:** Agent watches the basis between SOL/ETH/BTC spot on Byreal Solana CLMM vs perps on Hyperliquid. When spread > threshold, it captures the spread. Idle capital parks in USDY between trades.

**Tracks:** Track 6 (DeFi Deep Dive path) + Grand Champion.

**Web2 inspiration:** Jump Trading, Citadel, but as an agent any retail can run.

**Complement check:** Caladan (MM judge would love this), Mirana (favors derivatives strategies), Byreal (drives volume).

**Riskiest assumption:** Whether basis spreads are real, consistent, and profitable post-fees. Testable Day 1-2 with historical data.

**90s demo:** 5 minutes of live arb on stage with visible P&L counter ticking up. Dramatic if it works.

> **Watchout:** This is the ClawHack-alumni lane. They literally just spent 2 weeks doing trading-bot-on-Mantle-DEX. Pure trading agents are RED per `06-hidden-field.md`. Even cross-venue arb is "pro quant" territory where insiders have edge.

**Score:** Lane 4 · Sponsor 4 · Complement 4 · Demo 5 · Build 4 · Riskiest 3 · Novelty 3 · Narrative 3 → Floor 3, Sum 30

> Demoted because it lands in the inferred-saturated lane and competes with judges who do this professionally.

---

## Candidate 7 — AgentSmart (Nansen Smart Money tracker for Mantle, w/ auto-copy execution)

**What:** Agent monitors Nansen Smart Money flows on Mantle specifically. When a labeled wallet (Smart LP, Smart Trader, Fund) enters a position, agent emails/Telegrams the user with a 1-click copy option. Executes via Byreal CLMM (if Solana) or direct Mantle (if EVM). Auto-rebalances when Smart Money exits.

**Tracks:** Track 2 (AI Alpha & Data) + Track 6 (Agentic Economy).

**Web2 inspiration:** eToro CopyTrader, Nansen Alerts (paid product), Hyperliquid's leaderboard.

**Complement check:** **Direct gift to Nansen** — drives volume to their API (judge Hurcan Polat would love this). Doesn't compete with Nansen AI (different surface — Nansen AI is conversational, ours is execution-led).

**Riskiest assumption:** Nansen API granularity for Mantle wallets specifically. May not have full Smart Money labels for Mantle yet (need to verify). Testable Day 1 by hitting their API.

**90s demo:** "Smart Money just moved into this LP. Click here to copy. Done." Visible execution in 90 seconds.

**Score:** Lane 4 · Sponsor 5 · Complement 5 · Demo 4 · Build 4 · Riskiest 4 · Novelty 3 · Narrative 4 → Floor 3, Sum 33

---

## Candidate 8 — Hopper (memetic consumer yield rotator for retail)

**What:** Telegram bot with personality, mascot, brand. "Hi I'm Hopper. I take your USDC and find the best yield on Mantle today. Right now USDY = 4.8%. I'll move you there. If something better, I'll hop." Hopper is gamified, has a feed, has rewards.

**Tracks:** Track 4 (Consumer & Viral) + Track 3 (RWA) + Best UI/UX.

**Web2 inspiration:** Acorns (gamification), Stash, Robinhood gamification, Wealthfront robo-advisor — but consumer-friendly and Mantle-native.

**Complement check:** Animoca consumer thesis, doesn't compete with anyone direct, BGA (financial inclusion narrative).

**Riskiest assumption:** Whether retail actually wants this enough to demo with real users. Need at least 5-10 testers in the demo. Testable Day 1-2 by shipping a v0 to a Telegram group.

**90s demo:** Spin up Hopper live on stage, deposit $100 USDC, watch it move to USDY. Show yield ticker. Add personality moments (Hopper greets, explains, celebrates).

**Score:** Lane 4 · Sponsor 4 · Complement 5 · Demo 4 · Build 5 · Riskiest 4 · Novelty 3 · Narrative 5 → Floor 3, Sum 34

---

## Preliminary ranking (before subagent input)

After multiplicative-floor filtering (floor ≥ 3) and sum-tiebreak:

| Rank | Candidate | Floor | Sum | Notes |
|---|---|---|---|---|
| 1 | **GiveMeMyYield** | 3 | 35 | Remittance + yield-while-transiting. Structural novelty, dramatic demo, perfect APAC + BGA + Hashed fit. |
| 2 | **AgenticTreasury** | 3 | 34 | Personal CFO. Clean architecture, lower novelty risk. |
| 2 | **Hopper** | 3 | 34 | Consumer yield rotator. Best for UI/UX stacking. |
| 4 | **AgentSmart** | 3 | 33 | Nansen Smart Money tracker. Direct Nansen judge alignment. |
| 5 | MerchantGenie | 3 | 30 | Checkout widget. Lower novelty. |
| 5 | Cross-Venue Arb | 3 | 30 | Demoted — lands in saturated trading-bot lane. |
| DQ | AgentBazaar | 2 | — | Vaporware risk on demo. |
| DQ | HealthCFO | 2 | — | Health-data oracle complexity. |

## Open questions for subagent integration

When subagents return, look for:

1. **From Subagent A (cross-ecosystem winners):** Has anything resembling "GiveMeMyYield" or "AgenticTreasury" already won prizes elsewhere? If yes — that's *port-with-differentiation* material, not duplicate-shape.
2. **From Subagent B (Web2 inspirations):** Any APAC fintech we missed? GCash AI features? Toss / Coupang Pay angles?
3. **From Subagent C (problem signals):** What's the LOUDEST remittance / yield / treasury pain point in 2025-2026? Are users specifically complaining about Western Union? Quotes we can use in the pitch?
4. **All three:** Have I missed a CONSUMER-side angle that would unlock the Community Voting prize ($8.5K × 2)?

## Plan for synthesis pass

1. Read all 3 subagent outputs (`cross-ecosystem-winners.md`, `web2-inspirations.md`, `problem-signals.md`)
2. Add 3-5 new candidates surfaced by subagents
3. Re-score with subagent evidence — especially the novelty dimension
4. Pick top 2-3 finalists
5. For each finalist: write the 1-paragraph product description, the riskiest-assumption test plan for Day 1-2, the complement-to-judges framing
6. Hand off to novelty-gate subagent for final ETHGlobal/Devpost/DoraHacks duplicate check
7. Present to Abu with my personal recommendation
