# 06 — Hidden Field: Per-Track Lane Saturation Verdict

**Method:** Lane verdict is derived from (a) sponsor concentration, (b) judge competitive overlap, (c) inferred competitor archetypes (`04-competitor-analysis.md`), (d) thesis-judge alignment, (e) sponsor-API credit gravity. **Not from the public BUIDL gallery — which is empty as of 2026-06-02 — so these verdicts will need refresh after the T-72h re-scrape.**

Legend:
- 🟩 **GREEN** — open lane, low density, high judge interest. Pick this if your edge fits.
- 🟧 **YELLOW** — warm; uncertain density; rubric or judging risk
- 🟥 **RED** — saturated; sponsor-aligned teams already entrenched; outsized effort needed

---

## Track 1 — AI Trading & Strategy 🟥 RED

**Sponsor:** BGA (+Bybit API)
**Prize:** $8,500 (1 winner)
**Rubric:** NOT PUBLISHED → defaults to Grand Champion criteria

### Why RED
- Phase 1 ClawHack was a $20K dress rehearsal for exactly this track — same trading-bot leaderboard archetype
- Pro quants with Bybit API infrastructure already in production will dominate
- Mirana Ventures judging biases toward derivatives-volume strategies (which favors incumbents)
- Caladan is a real market maker — their bar for "interesting trading infra" is operator-grade
- 80%+ of retail trading bots underperform buy-and-hold per crypto.news 2026 — and judges know this, so they're calibrated against bot-shaped pitches
- The "Human vs AI" demo-day mechanism here likely means live trading challenge — Phase 1 alumni have practiced this

### When to pick anyway
Only if you have **all** of: production Bybit V5 API ops experience · verifiable backtest + walk-forward validation infra · novel ML strategy (not rule-based dressed in LLM language) · willingness to compete against ClawHack alumni live on Jul 2-3.

### Realistic prize EV
$0–$1,000 (Deployment Award only) without strong differentiation.

---

## Track 2 — AI Alpha & Data 🟧 YELLOW (warm)

**Sponsor:** Mirana Ventures
**Prize:** $8,500 (1 winner)
**Rubric:** Published — 60% general / 40% track-specific (Insight Value OR Strategy Alpha)

### Why YELLOW
- Real user pain documented (Telegram alpha = "cesspools of fake signals" per MEXC News)
- Nansen sponsors with $7K credits + judges with Hurcan Polat → API consumption is direct judge-favor
- BUT: Nansen just launched their own conversational AI agent on Base/Solana — anything that looks like an alternative to Nansen AI will read as competition
- Telegram/Discord bot competition is scam-densest crypto vertical → easy to differentiate on honesty + verifiability, hard to differentiate on novelty

### When to pick
If you can ship:
- **Verifiable signal provenance** (every alert traces to on-chain event or Smart Money flow)
- **Mantle-specific data sources** (track says "Mantle on-chain data as core source")
- **Pitched as *complement* to Nansen** — e.g., a Mantle-specific Smart Money tracker that calls Nansen API for cross-chain context

### Realistic prize EV
$0–$10K range. Solid execution on Mantle-specific anomaly detection has a real shot.

---

## Track 3 — AI × RWA 🟩 GREEN

**Sponsor:** Mantle Network (the chain itself)
**Prize:** $8,500 (1 winner) + strong Grand Champion eligibility
**Rubric:** Published — 60% general / 40% track-specific (Technical Feasibility OR Real-World Validity)

### Why GREEN
- **Mantle's own 2026 narrative is "we are the liquidity + RWA distribution chain"** — winning this track is winning the sponsor's main thesis
- RWA primitives are concrete and ready: USDY ($29M), mUSD, mETH ($791M), MI4 ($400M), fBTC ($1.5B) — all with documented integration paths
- Hashed's 2026 Protocol Economy report explicitly stamps **stablecoins + AI agents** as the dual macro themes → judge thesis alignment
- Mantle Global Hackathon 2025: 22.21% of submissions were RWA, the largest single category → historical sponsor pattern
- Few hackathon projects integrate the RWA primitives despite the docs being public → genuine novelty space
- Mantle is a "whale chain" (low DAU, high $/user) — retail-facing RWA tools are *underbuilt*

### When to pick
This is the most-aligned-with-judges track. Pick if you can:
- Integrate ≥1 Mantle RWA primitive (USDY/mUSD/mETH/MI4) meaningfully
- Make the AI role specific and verifiable (not "GPT recommends portfolios")
- Articulate compliance awareness (the rubric calls it out explicitly)
- Pair with Grand Champion eligibility — every Track 3 entry is automatically a Grand Champion candidate

### Realistic prize EV
$8,500 (track) + $9,000 (Grand Champion) + $1,000 (Deployment Award) = up to **$18,500** for one well-aligned project. Plus Mantle ecosystem-grant follow-on after the hackathon.

### Specific opportunity vectors
- **Retail RWA yield agent** — convert USDY/mUSD/MI4 into Telegram-bot-friendly subscription yield product for non-DeFi users
- **Compliance-aware tokenization agent** — KYC + jurisdiction-aware RWA issuance
- **Cross-asset portfolio rebalancer** — agent that maintains a target allocation across mETH/USDY/MI4 based on volatility regime
- **RWA-backed credit/lending agent** — collateralize USDY/mETH against on-chain credit

---

## Track 4 — Consumer & Viral DApps 🟧 YELLOW (noisy)

**Sponsor:** Animoca (per devhub copy)
**Prize:** $8,500 (1 winner) + potential follow-on to Animoca's **$10M Minds dev investment program**
**Rubric:** NOT PUBLISHED → defaults to Grand Champion criteria

### Why YELLOW
- "Viral" is squishy as a judging criterion → high variance
- Rubric not published → judging risk
- Animoca thesis (Minds platform, $10M dev program, "agents as interface layer") gives clear sponsor signal but track-specific bar is unclear
- Likely high competition from teams chasing the Minds follow-on funding rather than the $8.5K prize

### When to pick
If you have:
- A consumer wedge with genuine **viral mechanic** (referral economics, social proof loop, share-native UX)
- A clear plug-in story to Animoca portfolio (The Sandbox, Mocaverse, Yuga, Mocaa, etc.)
- Frontend craft (Best UI/UX is a $3K orthogonal prize you could stack)

### Realistic prize EV
$0–$8,500 with high variance. Animoca Minds follow-on is the real prize — could be 6-7 figures if you fit their thesis.

---

## Track 5 — AI DevTools 🟧 YELLOW (warm)

**Sponsor:** Tencent Cloud (per devhub copy)
**Prize:** $8,500 (1 winner)
**Rubric:** NOT PUBLISHED → defaults to Grand Champion criteria

### Why YELLOW
- Small crowd likely (devtools tracks are usually less-attended)
- Tencent Cloud favors LLM-consuming projects + enterprise readiness
- Rubric not published → judging risk
- Caladan + DoraHacks among judges → both will value real shipping discipline
- Track theme is "smart gas optimisation tools and Mantle-specific audit assistants" — narrow but defensible if you actually build one

### When to pick
If you can ship:
- A Mantle-specific tool that *Mantle's own developers will use* (test scaffolding, gas optimizer, audit assistant for OP-stack/EigenDA quirks)
- A measurable improvement (X% gas savings, Y% bug-catch rate)
- Real CI/CD integration story

### Realistic prize EV
$3,000–$8,500. Lower competition density means a focused submission can win.

---

## Track 6 — Agentic Wallets & Economy 🟩 GREEN

**Sponsor:** Byreal (the agent platform itself)
**Prize:** $8,500 (1 winner) + direct Byreal sponsor pipeline
**Rubric:** Published — 70% general / 30% track-specific (Strategy Alpha OR Real-World Validity)

### Why GREEN
- **Byreal-sponsored = direct sponsor advocacy.** Emily Bao (Byreal founder) is a Bybit/Mantle advisor and the public face of the hackathon
- "No DeFi expertise required" framing in the rubric → barrier to entry is intentionally low
- **Solana allowed** alongside Mantle (only track) → opens cross-chain agent-commerce angle
- RealClaw repo is empty + Byreal CLIs are new → first-mover advantage on novel integrations
- 70% general / 30% track-specific weighting means execution quality + autonomy depth wins more than novel use case
- The two paths split the field — "DeFi Deep Dive" attracts quants, "RealClaw Real-Life Expansion" attracts UX-strong consumer teams. Pick the latter for less competition.

### When to pick
If you can build:
- **DeFi Deep Dive:** novel multi-venue strategy using Byreal CLMM (Solana) + Byreal Perps (Hyperliquid) + Mantle settlement — cross-venue arbitrage, news-driven trading, automated rebalancing
- **RealClaw Real-Life Expansion:** non-DeFi everyday agent powered by Byreal Skills CLI — Personal CFO Agent, on-chain life manager, health/wellness data agent, decision assistant

### Realistic prize EV
$8,500 (track) + $9,000 (Grand Champion eligibility if Mantle-deployed) + $1,000 (Deployment Award) = up to **$18,500**. Plus Byreal sponsor follow-on relationship (which could matter more than the prize).

### Specific opportunity vectors
- **Cross-chain settlement agent** — Byreal Solana CLMM swap → Mantle USDY yield deposit, atomic from agent's perspective
- **Mantle-anchored Personal CFO Agent** — uses Byreal Skills CLI for trading actions but ERC-8004 identity + USDY/mETH/MI4 for the user's actual portfolio
- **Cross-venue arbitrage agent** — Byreal CLMM (Solana) vs Byreal Perps (Hyperliquid) basis trading

---

## Cross-cutting awards

### Grand Champion ($9,000) — 🟧 YELLOW

Open to all tracks; eligibility = nominated from ≥1 track. Best stacked with Track 3 or Track 6 entries because those tracks already lean toward the Grand Champion rubric weighting (technical depth + Mantle ecosystem fit + innovation). Pure Track 1 or 4 entries are harder to win Grand Champion because they don't naturally amplify Mantle ecosystem contribution.

### Community Voting (2 × $8,500) — 🟧 YELLOW

X (Twitter) vote. Best for teams with built-in audience or memorable demo. Risk: voting is gameable; sponsors may apply credibility filters. Optimization angle: thread craft + content release cadence + community partner amplification > raw follower count.

### Best UI/UX ($3,000) — 🟧 YELLOW

Orthogonal to track. Worth stacking with Track 4 (Consumer) or Track 6 (RealClaw Expansion) where frontend exists. Rubric is published (30/30/25/15) → judging is more predictable than Tracks 1/4/5.

### Deployment Award (20 × $1,000) — 🟩 GREEN

**Floor lane. Every serious team should design to clear this bar.** Objective bar, no judging, testnet OK. First-come-first-served means earlier submission timing wins ties. Treat as guaranteed $1,000 + qualification signal.

---

## Combined verdict — recommended track pairings

Given `tracksLimitForBuidl = 2` allows entering 2 tracks per project:

| Pairing | Why it works | Build effort overlap | Total realistic EV |
|---|---|---|---|
| **🟩 Track 3 (RWA) + Grand Champion** | RWA project already optimizes for Mantle ecosystem contribution; thesis-aligned with Hashed/Mantle/Caladan | 100% — same project | up to $18,500 + ecosystem grant |
| **🟩 Track 6 (Agentic Economy) + Grand Champion** | Direct Byreal sponsor + cross-chain narrative; same code base | 100% — same project | up to $18,500 + Byreal relationship |
| **🟩 Track 6 + Best UI/UX** | RealClaw real-life expansion often has frontend; orthogonal $3K | 80% — frontend polish extra | up to $20,500 |
| **🟩 Track 3 + Track 6 (cross-track)** | RWA agent built on Byreal Skills CLI; hits both sponsor's hot lanes | 95% — same agent, two surfaces | up to $26,500 (if both win) |
| Track 5 (DevTools) standalone | Lower density; defensible if you ship something Mantle devs use | — | up to $8,500 |
| Track 1 + Mirana Track 2 | High overlap (both quant) but RED+YELLOW = effort/reward poor | — | not recommended |
| Track 4 + Best UI/UX | Consumer + frontend; chases Animoca Minds follow-on | 70% | $0–$8,500 + potential Minds funding |

**Defaults given the 13-day window:**
1. **Primary lane:** Track 3 (AI × RWA) — most thesis-aligned with Mantle + Hashed + Caladan
2. **Secondary lane:** Track 6 (Agentic Economy) — direct Byreal pipeline
3. **Always clear:** Deployment Award (20 × $1,000)
4. **Stack if frontend exists:** Best UI/UX ($3,000)

The **Track 3 + Track 6 dual entry**, if architected as a single agent (Byreal Skills CLI for execution + Mantle RWA primitives for the asset side + ERC-8004 for identity), captures the highest realistic EV envelope.
