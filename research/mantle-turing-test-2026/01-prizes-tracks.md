# 01 — Prizes & Tracks

## Prize structure (verified — DoraHacks `bonusPrice` + OCR of prize image)

### Phase 2 — AI Awakening ($100,000 cash)

| Award | Amount | Per-place | Notes |
|---|---|---|---|
| Grand Champion | **$9,000** | 1 winner | "Top Overall Business Potential, Completion, And Mantle Ecosystem Fit" |
| Track First Prize | **$51,000** | 6 tracks × **$8,500** | One winner per track |
| Community Voting | **$17,000** | 2 × **$8,500** | Highest engagement + highest total votes on X |
| Best UI/UX | **$3,000** | 1 winner | Best UX + smoothest Web2 onboarding |
| Finalist & Deployment Award | **$20,000** | 20 × **$1,000** | **First-come-first-served**, objective bar — no judging |
| **TOTAL CASH** | **$100,000** | | |

### Phase 2 — Computing / API credits (~$110,000 in-kind)

| Provider | Credits | What they sponsor |
|---|---|---|
| Elfa AI | $36,000 | Inference credits — likely AI Alpha track |
| Surf AI | $30,000 | (specific area not public) |
| Orbit AI | $30,000 | (specific area not public) |
| Nansen AI | $7,000 | API access for Smart Money / Token God Mode / etc. |
| AltLLM | $7,000 | LLM API credits |
| **Total in-kind** | **~$110,000** | |

Tencent Cloud also a credit sponsor — exact allocation not public; assume hackathon-specific allocations announced at kickoff. Z.ai's standard tier (1000 req/day free) is the floor.

### Phase 1 — ClawHack ($20,000, already concluded)

Pool paid Apr 30, 2026. Per-place breakdown not on any canonical page. Three sub-categories per the Byreal RealClaw PR. Invite-only. Winners not publicly announced as of 2026-06-02.

### Grand total event value

**~$223,000** (100K cash + ~110K credits + 20K Phase 1 already paid). Press-release headline of "$120,000 total prize pool" understates the credit pool by ~$103K.

---

## Track-by-track judging rubrics

> **Major gap:** 3 of 6 tracks have **no published rubric** on the canonical Requirements & Criteria tab. Default assumption is the Grand Champion rubric applies, but this is unconfirmed.

### Grand Champion (cross-cutting, open to all tracks)

| Dimension | Weight | Description |
|---|---|---|
| Technical Depth | **30%** | AI × on-chain integration, architecture completeness, code quality |
| Innovation | **25%** | Originality; whether it proposes a new AI × Web3 paradigm |
| Mantle Ecosystem Contribution | **25%** | Substantive use of Mantle + long-term ecosystem value |
| Product Completeness | **20%** | Runnable demo, UX, scalability |

**Requirements:** deployed on Mantle Network · open-source repo + runnable demo + project pitch · must be nominated from ≥1 track.

---

### Track 1 — AI Trading & Strategy (BGA + Bybit API)

**Rubric: NOT PUBLISHED.** Defaults to Grand Champion criteria.

One-liner (from track image): AI quant bots + macro-driven smart contracts; Python + Solidity templates; Bybit API support.

Sponsor signal: BGA frames trading as "for good" via better access — narrative angle worth borrowing ("agent gives retail traders the edge institutions have").

Judge proximity: Mirana Ventures cares about derivatives volume → Bybit. Caladan is a market maker → favors execution-quality work.

---

### Track 2 — AI Alpha & Data (Mirana Ventures)

**Two paths:**
- **A. [Human-Driven] Data & Analytics** — AI-powered on-chain analytics/monitoring/prediction tools
- **B. [AI-Driven] Trading Strategy** — Executable AI agents that generate verifiable on-chain Alpha

**Scoring:**
- **General 60%:** data-source quality / AI analysis depth / technical completeness / sustainability
- **Track-specific 40%:**
  - Data & Analytics → **Insight Value:** uniqueness + data viz quality
  - Trading Strategy → **Strategy Alpha:** complexity + verifiability (backtests / live trading / on-chain records)

**Encouraged:** smart money tracking agent · Mantle protocol dashboard · AI-driven market sentiment analysis · automated arb / MM strategies.

**Required:** Mantle on-chain data as core source · deploy on Mantle · open-source repo + demo + one-line pitch.

**Submission must answer:** which data sources are used, what role AI plays, how it generates verifiable value on Mantle.

---

### Track 3 — AI × RWA (Mantle Network)

**Two paths:**
- **A. [Human-Driven] RWA Infrastructure** — AI-powered tools for RWA tokenization, pricing, or compliance
- **B. [AI-Driven] RWA Application** — End-user-facing AI × RWA products

**Scoring:**
- **General 60%:** depth of AI × RWA integration / technical completeness / Mantle integration / compliance awareness
- **Track-specific 40%:**
  - Infrastructure → **Technical Feasibility:** completeness of asset tokenization flow + innovation
  - Application → **Real-World Validity:** clear asset category + well-defined users + complete UX

**Encouraged:** AI-driven tokenization (real estate / bonds / commodities) · intelligent RWA portfolio agent · automated KYC/compliance · RWA yield aggregator.

**Required:** project must involve RWA · deploy on Mantle Network · open-source repo + demo + one-line pitch.

**Submission must answer:** what RWA is being brought on-chain, AI's role, how realized on Mantle.

**Useful Mantle RWA primitives (addresses in `02-sponsor-docs.md`):**
- USDY (Ondo) — `0x5bE26527e817998A7206475496fDE1E68957c5A6`
- mUSD (rebasing USDY) — `0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3`
- Redemption Price Oracle — `0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f`
- mETH (~$791M TVL) · MI4 ($400M index) · fBTC (~$1.5B)

---

### Track 4 — Consumer & Viral DApps (Animoca, per devhub)

**Rubric: NOT PUBLISHED.** Defaults to Grand Champion criteria.

One-liner: Gamified trading UIs + shareable consumer apps.

Sponsor signal: Animoca's **Minds** platform (persistent AI agents) + **$10M dev investment programme** (announced March 2026) is the real upside — winning the track is one prize; getting Minds funding is another. Animoca thesis quote (per Cointelegraph): *"AI agents serve as the interface layer between human intent and on-chain execution."*

---

### Track 5 — AI DevTools (Tencent Cloud, per devhub)

**Rubric: NOT PUBLISHED.** Defaults to Grand Champion criteria.

One-liner: Smart gas optimisation + Mantle-specific audit assistants.

Sponsor signal: Tencent Cloud favors projects that consume cloud LLM APIs and target other devs as users.

---

### Track 6 — Agentic Wallets & Economy (Byreal)

"No DeFi expertise required — we provide the full Skills and CLI toolkit."

**Two paths:**
- **A. [Human-Driven] DeFi Deep Dive** — Use Byreal Agent Skills / Byreal Perps CLI / RealClaw for advanced trading strategies
- **B. [AI-Driven] RealClaw Real-Life Expansion** — Take RealClaw beyond DeFi into real-world everyday use cases

**Must use ≥1 of:**
- Byreal Agent Skills — CLMM, LP & Swap (**Solana**) — https://github.com/byreal-git/byreal-agent-skills
- Byreal Perps CLI — perpetual futures (**Hyperliquid**) — https://github.com/byreal-git/byreal-perps-cli
- RealClaw — OpenClaw + pre-installed Byreal Skills — https://www.byreal.io/en/realclaw

**Scoring:**
- **General 70%:** Byreal integration depth / agent autonomy / technical completeness / sustainability
- **Track-specific 30%:**
  - DeFi Deep Dive → **Strategy Alpha:** complexity + verifiability
  - RealClaw Expansion → **Real-World Validity:** genuine on-chain use + clear real-life target

**Encouraged (DeFi):** news-driven trading agent · MM / arb · automated portfolio rebalancing.
**Encouraged (Real-life):** Personal CFO Agent · on-chain life manager · health data management · everyday decision assistant.

**Required:** ≥1 Byreal component · **deploy on Mantle OR Solana** (only track allowing Solana) · open-source repo + demo + one-line pitch.

**Submission must answer:** which Byreal capabilities are used, what scenario.

> ⚠️ **Critical clarification:** Byreal CLMM lives on **Solana**, Byreal Perps routes to **Hyperliquid**. The "Mantle" piece is via RealClaw packaging + ERC-8004 identity + settlement/yield. A Mantle-only DeFi agent does not satisfy the Byreal integration requirement.

---

### Community Voting (cross-cutting)

- All submitted projects automatically eligible
- Open vote on **X (Twitter)** — "X Platform Voting"
- Two winners get $8,500 each (highest engagement + highest total votes)
- Wins on: clear/compelling demo · resonance with real pain points · community presence & shareability

**Optimization angle:** thread quality + replies + saves matter more than follower count. Schedule the launch thread for max engagement window (Tue–Thu morning UTC for global crypto X).

---

### Best UI/UX Award (cross-cutting)

| Dimension | Weight | Description |
|---|---|---|
| Visual Design | **30%** | Aesthetic, consistency, brand identity |
| Interaction & Flow | **30%** | Smoothness, user guidance, responsiveness |
| AI Interaction Design | **25%** | Natural, user-friendly presentation of AI |
| Accessibility | **15%** | Beginner-friendly, lowers Web3 barrier |

**Required:** runnable frontend + demo video or public link.

---

### Deployment Award — 20 × $1,000 (no judging)

Meet **all** to qualify (first 20 only):

**Technical Deployment**
- Smart contract deployed on Mantle **Mainnet OR Testnet** (testnet acceptable)
- Contract verified on Mantle Explorer
- ≥1 AI-powered function callable on-chain

**Product Completeness**
- Frontend demo publicly accessible (not localhost)
- Deployment address included in DoraHacks submission
- Demo video ≥ 2 min walking core use case

**Documentation**
- Open-source GitHub repo with README (setup + architecture + deployed contract address)

> **Strategic note:** This is the **floor lane**. Any serious team should design their submission to clear this bar as a "guaranteed $1K + qualification proof," even if their main shot is at a higher prize. The bar is objective — no judge taste, no rubric ambiguity.

---

## Cross-track strategy implications

1. **Multi-track entries allowed (max 2)** — one well-architected project enters 2 tracks. Smart pairings: AI × RWA + Grand Champion; Agentic Economy + AI × RWA (if the RealClaw expansion targets RWA); Agentic Economy + Best UI/UX.
2. **Deployment Award is orthogonal** — every team should clear its bar regardless of main track. $1K guaranteed for objective execution.
3. **Three unpublished rubrics** create judging risk for Tracks 1, 4, 5. Pick tracks with published rubrics unless you have a specific edge.
4. **Sponsor proximity = passive judge favor.** Consuming Nansen / Elfa / Surf / Orbit / Bybit / Z.ai APIs is a signal credit-pool sponsors will surface in eval.
5. **Live "Human vs. AI" mechanism** on Demo Day Jul 2-3 — design for live performance, not just video walkthroughs. An agent that crashes on stream is catastrophic.

---

## Confirmed timeline

| Phase | Event | Date (UTC) |
|---|---|---|
| Phase I — ClawHack | Register & Submit | Apr 15 – Apr 30, 2026 (closed) |
| Phase I | Winner Announcement | **May 5, 2026 (per timeline image)** — STILL UNANNOUNCED on canonical pages |
| Phase II — AI Awakening | Register & Submit | **May 1 – Jun 15 15:59 UTC, 2026** |
| Phase II | Demo Day | **Jul 2 – Jul 3, 2026** (live-streamed) |
| Phase II | Winner Announcement | **Jul 10, 2026** |
