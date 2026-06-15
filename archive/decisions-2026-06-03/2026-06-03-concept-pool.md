# Mantle Turing Test 2026 — Final Candidate Pool (post-wave-2 research)

**Status: 2026-06-03 evening.** Two research waves complete. Three viable concepts with verified high-polish fork bases. Awaiting Abu's lock-in decision.

---

## Decision context

- Hackathon: Mantle Turing Test 2026 ("AI Awakening"), deadline 2026-06-15 15:59 UTC (~12 days)
- Prize: $100K cash + ~$110K credits, 3 prize tracks + Grand Champion + Community Voting + Best UI/UX + 20-Project Deployment Award
- Capacity: Abu solo + Claude/Codex agents, full-time daily
- Strategy: ecosystem-refactor (Abu's 3-of-4 win pattern) with hard polish bar (no mid-tier OSS — must clear "Series A diligence eye-test")
- Patron (BNPL wedge) paused; clean slate

---

## 🥇 Concept 1 · **AgentArena** (Kuest-base fork)

**Fork base:** [`kuestcom/prediction-market`](https://github.com/kuestcom/prediction-market) — 507★, pushed 2026-06-02, live demo at [demo.kuest.com](https://demo.kuest.com) + [kuest.com](https://kuest.com).

**Why this base:** publicly polished Polymarket-compatible white-label. Next.js + TS + wagmi/viem + Reown + Li.Fi + Tailwind. CLOB engine, USDC flows, UMA resolution, i18n, mobile-ready, branded marketing site. Audit lineage. "Shopify for prediction markets" framing.

**Reshape:** Polygon → Mantle EVM chain swap. Add ERC-8004 identity layer for AI agent operators that *create + resolve* markets. Integrate Byreal Skills for autonomous resolution. Agents debate token outcomes, users bet, ERC-8004 reputation persists across rounds.

**Pitch:** *"Spawn an AI agent with $5 USDC. It debates other users' agents about token outcomes. You bet on which agent wins. ERC-8004 records every win/loss on-chain forever — your agent's track record is real, permanent, and yours."*

**Differentiator vs Kuest (original):** Kuest is a market gallery; we make it agent-native — markets are agent-created, agent-resolved, agent-reputation-tracked. ERC-8004 is the scoreboard. Mantle has ZERO prediction markets today (gap analysis confirmed).

**Judging scorecard:**

| Dimension | Score | Rationale |
|---|---|---|
| Technical Depth (30%) | 7 | Fork de-risks; agent + ERC-8004 layer is the new build |
| Innovation (25%) | 8 | Agent-created/resolved PM is novel; ERC-8004 ideal fit |
| Mantle Ecosystem Contribution (25%) | 9 | ERC-8004 central; fills "zero PM on Mantle" gap; Byreal Skills resolution |
| Product Completeness (20%) | 9 | Kuest is launch-ready polished — we inherit polish + brand |
| **Weighted total** | **8.15** | |

**Sponsor fit:** Byreal Skills (3/3), ERC-8004 (3/3), Allora (3/3 — judge + oracle), Nansen (2/3 — agent signal source).

**Tracks:** Agentic Economy (Byreal) primary · Best UI/UX · Community Voting.

**Riskiest assumption:** agent-vs-agent debate generation is *entertaining enough* to make demos viral. **Fallback:** sealed predictions + ERC-8004 accuracy tracking (still PM, still 8004-native).

**12-day feasibility:** **HIGH.** Codebase is launch-ready; only need chain swap + ERC-8004 layer + agent integration.

---

## 🥈 Concept 2 · **WalletmPilot** (Morphic-base fork)

**Fork base:** [`miurla/morphic`](https://github.com/miurla/morphic) — 8,879★, pushed 2026-06-02, live demo at [morphic.sh](https://morphic.sh).

**Why this base:** Vercel OSS-badged. Generative UI primitives ready. Next.js + TS + shadcn/ui + Vercel AI SDK + Tavily/Brave/Exa search. Model-agnostic, dark/light, share-by-URL, guest mode. Trendshift-tier polish.

**Reshape:** Swap web search for on-chain Mantle reads (Goldsky/SubQuery indexers). Turn cited answers into signable transactions via wagmi. Add ERC-8004 identity for the agent. Route execution through Byreal Skills.

**Pitch:** *"Tell your AI in plain English: 'max my stablecoin yield, rebalance monthly.' It picks the right Byreal Skills + Aave + Pendle + sUSDe positions, executes, and every action is ERC-8004 receipted. Like Perplexity, but it actually does the trade."*

**Differentiator vs Morphic (original):** Morphic is a search engine; we make it a *transaction engine* — natural-language Mantle DeFi orchestrator. ERC-8004 makes every decision auditable.

**Judging scorecard:**

| Dimension | Score | Rationale |
|---|---|---|
| Technical Depth (30%) | 9 | Heavy AI × on-chain integration; deepest stack |
| Innovation (25%) | 7 | Port + the on-chain Perplexity wedge is fresh |
| Mantle Ecosystem Contribution (25%) | 9 | Byreal Skills + ERC-8004 + Aave + Pendle + sUSDe substantively |
| Product Completeness (20%) | 8 | Morphic is 8.9K-star polished chassis; orchestrator demo-risk remains |
| **Weighted total** | **8.30** | |

**Sponsor fit:** Byreal Skills (3/3 — IS the tool surface), ERC-8004 (3/3), Nansen (2/3), Mantle RWA (2/3 — positions, not pitched).

**Tracks:** Agentic Economy (Byreal) DeFi Deep Dive primary · Alpha & Data secondary · Grand Champion if execution lands.

**Riskiest assumption:** orchestrator picks the right Skill reliably enough to demo end-to-end without judge-visible failure. **Fallback:** narrow to "savings agent only" — one Skill (sUSDe yield), one decision (when to rotate).

**12-day feasibility:** **MEDIUM-HIGH.** Morphic chassis fully polished; new build = wagmi integration + Mantle tools + ERC-8004 attestation flow.

---

## 🥉 Concept 3 · **ClanArena** (Clan World refactor — NEW from wave 2)

**Fork base:** [`OmniPass-world/clan-world`](https://github.com/OmniPass-world/clan-world) — 4★, pushed 2026-05-06, live demo at app.clan-world.com. 109MB Solidity codebase. ETHGlobal Open Agents 2026 finalist.

**Why this base:** *highest polish artifact in either wave.* Pixi.js game frontend + EIP-2535 Diamond proxy contracts + Claude Sonnet 4.6 agents that actually negotiate alliances. Production-grade architecture with ERC-7857 iNFT memory transfer.

**Reshape:** Port to Mantle. Replace ERC-7857 memory with ERC-8004 identity for clan elders. Add **spectator betting layer** — users stake sUSDe on which clan wins. Agents earn yield while playing. Twitch-style livestreams of agent negotiations.

**Pitch:** *"Four AI agents play an on-chain strategy game as rival clan elders. They negotiate, betray, and form alliances autonomously. You stake sUSDe on which clan wins; you earn yield while the agents fight. Watch live on Twitch. ERC-8004 records every clan elder's reputation across seasons."*

**Differentiator vs Clan World (original):** Original is a closed game; we add the *spectator economy* — users participate without DeFi expertise, sUSDe yield funds the betting layer, ERC-8004 reputation is the meta-game across seasons.

**Judging scorecard:**

| Dimension | Score | Rationale |
|---|---|---|
| Technical Depth (30%) | 8 | Pixi.js MMO + Diamond proxy + multi-agent narrative + spectator betting layer |
| Innovation (25%) | 9 | Agent-MMO with spectator stakes is novel; ERC-8004 perfect fit for rival agent personas |
| Mantle Ecosystem Contribution (25%) | 7 | ERC-8004 yes; Byreal Skills less central; sUSDe in betting |
| Product Completeness (20%) | 8 | Gorgeous Pixi.js frontend exists; we add betting + on-chain settlement |
| **Weighted total** | **8.00** | |

**Sponsor fit:** ERC-8004 (3/3), Animoca (3/3 — gaming sponsor judge!), Allora (2/3 — could resolve game outcomes), Byreal Skills (1/3 — peripheral).

**Tracks:** Agentic Economy (Byreal) RealClaw Real-Life Expansion + Community Voting (viral livestream) + Best UI/UX (Pixi.js polish auto-qualifies).

**Riskiest assumption:** spectator betting layer doesn't ship in time / Pixi.js codebase is harder to extend than it looks. **Fallback:** read-only viewer + ERC-8004 leaderboard without on-chain stakes.

**12-day feasibility:** **MEDIUM.** Polished game frontend exists; spectator betting + Mantle port is the new build. Higher upside ceiling than 1 or 2 but more execution risk.

---

## Comparison table

| Concept | Fork base (stars · push) | Weighted | Top judges aligned | Build risk | Demo wow factor |
|---|---|---|---|---|---|
| **1. AgentArena** | kuest (507★ · yesterday) | 8.15 | Allora, Virtuals, Nansen, Animoca | **LOW** | Medium (depends on debate UX) |
| **2. WalletmPilot** | morphic (8.9K★ · yesterday) | **8.30** | Byreal, Allora, Nansen, Virtuals | Medium | Medium (depends on orchestrator) |
| **3. ClanArena** | clan-world (4★ · May 2026) | 8.00 | Animoca, Virtuals, Allora, Z.ai | Medium-high | **HIGH** (gorgeous Pixi.js + live agent drama) |

---

## Recommendation

**By weighted math: WalletmPilot wins (8.30) by a hair over AgentArena (8.15).**

**By judge-wow + Community Voting upside: ClanArena (8.00) has the highest demo ceiling** — Pixi.js polish + live agent drama is unmatched. Animoca on the judging panel makes this an automatic Best UI/UX play.

**By delivery probability + ecosystem-gap fit: AgentArena (8.15) is the safest blockbuster** — Kuest's "launch-ready" status drops the risk floor; PM is the loudest unfilled category on Mantle; ERC-8004 native fit is unbeatable.

**My honest pick: AgentArena (Kuest fork).** Combination of (a) verified high-polish base with port complexity 2, (b) lowest risk to ship clean by Day 12, (c) category-creator narrative ("first prediction market on Mantle, powered by AI agents"), (d) judge-density across Allora + Virtuals + Nansen + Animoca, (e) the held-concept that survived your gut check from wave 1. Weighted score is within 0.15 of #2 but delivery confidence is materially higher.

**Dual-pursue hedge still viable:** AgentArena + ClanArena share ~40% of build (ERC-8004 layer, Byreal Skill wrappers, Mantle deploy infrastructure, frontend chrome). If you want maximum prize coverage, build the shared layer days 1-5, fork into a final-pick + a postscript repo around day 6.

---

## What's been ruled out

**Concepts dropped from wave 1:**
- PrizePool Mantle (Pumpkin port) — Innovation + Tech Depth too low (6.60 weighted); Abu's gut rejected it
- "Reputation Oracle as public good" infra primitive — high ecosystem score but infra products don't demo viral; would lose Community Voting

**Concepts from wave 2 inspiration-only (no public repos):**
- Capitola, Melee Markets, Corpus, Toaster.trade — no fork base, would be greenfield builds; doesn't match ecosystem-refactor pattern

**Repos surfaced but declined:**
- `Polymarket/agents` (3.6K★) — archived 2026-05-11
- `langchain-ai/open-canvas` (5.5K★) — live demo decommissioned
- `piotrostr/listen` (1.1K★) — >6 months stale, demo 403s
- `TauricResearch/TradingAgents` (82K★) — Python only, no shippable frontend
