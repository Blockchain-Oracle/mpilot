# 04 — Competitor Analysis

**Status:** No visible Phase 2 submissions as of 2026-06-02 (`buidlsCount = 0`). This file documents *inferred* competitor shapes from indirect signals — Phase 1 participants, OpenClaw ecosystem activity, GitHub trend lines, and sponsor public roadmaps. Re-run on real Phase 2 incumbents after T-72h re-scrape (see `03-project-gallery.md`).

---

## Inferred competitor archetypes

### Archetype 1: ClawHack alumni rebuild
**Profile:** Teams that competed in Phase 1 (invite-only April 15-30) and are retooling their RealClaw trading agents for Phase 2.
**Track concentration:** Track 1 (AI Trading), Track 6 (Agentic Economy).
**Edge:** Already know the Byreal CLI ergonomics; pre-built backtest infra; sponsor relationship.
**Weakness:** Phase 1 was a leaderboard sprint; few teams will have invested in UX, narrative, or anything beyond ROI. A non-trading-bot team can out-design them on UX, accuracy validation, and multi-track placement.
**Estimated count:** small — Phase 1 was invite-only, likely <30 teams total, perhaps 5-15 returning.

### Archetype 2: Pro quant w/ Bybit API
**Profile:** Quant traders with existing Bybit API infrastructure adapting their bot to fit the hackathon shape.
**Track concentration:** Track 1 (AI Trading).
**Edge:** Real trading systems; can ship verifiable backtests; understand Bybit V5 auth.
**Weakness:** Their "AI" is often rule-based ML hidden behind LLM framing; they'll get caught if judges probe the actual model architecture. Per crypto.news 2026 reporting, 80%+ of retail bots underperform buy-and-hold.
**Estimated count:** medium — Bybit's API is widely used and Mirana judging draws quants.

### Archetype 3: Virtuals/Base agent porters
**Profile:** Teams with existing Virtuals Protocol agents on Base, porting them to Mantle for the hackathon.
**Track concentration:** Tracks 4, 6.
**Edge:** Battle-tested agents; ERC-8004 + ERC-8183 already implemented; cross-chain narrative.
**Weakness:** Judges include Virtuals' COO — pitching as alternative to Virtuals is dead; pitching as cross-chain commerce is fine.
**Estimated count:** low — porting cost is non-trivial; Mantle ERC-8004 mainnet only since Feb 2026.

### Archetype 4: Animoca Minds-adjacent consumer teams
**Profile:** Web3 gaming / consumer teams aiming for the **$10M Minds dev investment program** more than the $8.5K Track 4 prize.
**Track concentration:** Track 4 (Consumer & Viral DApps).
**Edge:** Consumer UX, viral mechanics, gaming integration with The Sandbox/Mocaverse/Yuga.
**Weakness:** "Viral" is squishy as a judging criterion; rubric not published. Animoca-favored consumer apps will draw on tropes (token-gated communities, agent-as-mascot) that don't match Mantle's RWA/finance positioning.
**Estimated count:** medium — Animoca's program is a real attractor.

### Archetype 5: APAC student teams (returning from Mantle Global 2025)
**Profile:** University teams from APAC, especially Indonesia/Korea/China. Pattern matches Mantle Global Hackathon 2025 winner OwnaFarm (UKDW + Universitas Amikom Purwokerto, dual-track placement).
**Track concentration:** Cross-track — they bias toward multi-track placements (the `tracksLimitForBuidl=2` rule favors them).
**Edge:** Cheap labor, deep engagement, willing to build for prestige + portfolio.
**Weakness:** Tend to lack original technical insights; often reskinned tutorials. Less polished pitches.
**Estimated count:** high (volume) — but few will medal.

### Archetype 6: ERC-8004 reference implementers
**Profile:** Teams using `Eversmile12/create-8004-agent`, `agent0lab/agent0-ts`, or `ChaosChain/chaoschain-genesis-studio` as a scaffolding base.
**Track concentration:** Track 3 (RWA), Track 6 (Agentic Economy), Grand Champion.
**Edge:** Standards-compliant agent identity from day zero; reusable A2A + MCP + USDC payment scaffolding.
**Weakness:** Many will look the same — same scaffolding produces same-shape products. Differentiator becomes the *application*, not the identity layer.
**Estimated count:** medium-high — the `npx create-8004-agent` flow is fast.

### Archetype 7: Korean/Hashed thesis-stamped teams
**Profile:** Teams reading Hashed's 2026 Protocol Economy report and aiming explicitly at the **stablecoins + AI agents** intersection — RWA yield strategies, USDY/mUSD agents, cross-currency settlement agents.
**Track concentration:** Track 3 (RWA), Grand Champion.
**Edge:** Thesis-judge alignment; Hashed cares about exactly this lane.
**Weakness:** A small number of teams will read the same thesis; first-mover on a specific RWA + agent angle has structural advantage.
**Estimated count:** small but dangerous (high judge-alignment).

---

## Adjacent ecosystem signal — what to monitor

Until the BUIDL gallery fills, watch these signals daily:

### 1. `byreal-git` GitHub org commits
```bash
gh api orgs/byreal-git/events --jq '.[] | select(.created_at > "2026-05-01") | {type, repo: .repo.name, actor: .actor.login, time: .created_at}'
```
Any new repo or push to the ecosystem may signal organizer-blessed reference projects.

### 2. ClawHub skills registry
```bash
gh api repos/openclaw/clawhub/commits --jq '.[] | select(.commit.author.date > "2026-05-01") | {sha: .sha[0:7], msg: .commit.message, author: .commit.author.name, date: .commit.author.date}'
```
New skills landing during the hackathon window are likely contestants building in public.

### 3. ERC-8004 deployments on Mantle
```bash
# Query Mantlescan for IdentityRegistry.register() calls since hackathon start
# This is the most direct signal — every Phase 2 team that mints an agent identity
# leaves an on-chain breadcrumb
curl "https://api.mantlescan.xyz/api?module=logs&action=getLogs&fromBlock=<may-1-block>&toBlock=latest&address=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
```

### 4. X hashtag tracker
Every submission requires a thread tagged `#MantleAIHackathon`. Daily scan from T-7 onwards:
```bash
# When sahil-x is fixed:
python3 ~/.claude/skills/sahil-x/scripts/search.py --query "#MantleAIHackathon" --product Latest --n 50
# Until then: WebSearch with site:x.com or x.com search UI directly
```

### 5. Mantle Q1 2026 Nansen report
Already in `02-sponsor-docs.md`. Quotes Mantle's official "where we want builders to go." Anyone whose pitch echoes Mantle's report wording will read well to judges.

---

## Competitor weakness exploits

These are gaps in the inferred field that a well-architected entry can exploit:

| Gap | Why it exists | How to exploit |
|---|---|---|
| **Pure trading bots lack accuracy/risk validation** | Track 1 culture is "highest ROI wins"; few ship transparent backtest infra | Build the backtest harness *as part of* the submission. Verifiable Sharpe + max drawdown + walk-forward validation = automatic judging edge. |
| **ERC-8004 + Byreal stack is novel; few teams have both** | Mantle deployment Feb 2026; Byreal CLI is new | Combine both — agent registered with ERC-8004 identity, executing via Byreal CLI. Stamps two sponsor-favored vectors. |
| **RWA primitives undertargeted** | Only ~$29M USDY circulating; institutional bias means few retail-facing tools | Build a *retail-friendly* RWA yield agent over USDY/mUSD/MI4. Track 3 + Grand Champion eligible. |
| **Consumer track has no Mantle-specific wedge** | Animoca thesis is gaming/identity-led; most teams will pitch generic agent UX | Pitch a Mantle-native consumer flow — e.g., a Telegram bot that turns USDY into a Western Union replacement for APAC migrant workers. Animoca interface-layer thesis + RWA + viral mechanics. |
| **Cross-chain agent commerce is judge-bait** | Virtuals on Base, Byreal on Solana, Mantle on EVM — no team has the natural "all three" footprint | An agent that maintains a single ERC-8004 identity while transacting across Mantle (settlement) + Solana (Byreal CLMM) + Hyperliquid (Byreal Perps) is a structural moat. |
| **AI Alpha track is full of scam-shaped Telegram bots** | MEXC News: Telegram alpha groups are scam-densest crypto vertical | An *honest* Mantle-only signal bot with verifiable provenance (every signal traces to on-chain event or Nansen Smart Money flow) differentiates instantly. |

---

## What this means for our wedge

- **No visible competitor moat to defend against.** Field is wide open by visibility — but inferred densities at Tracks 1 and 4 are high. Tracks 3 and 6 are structurally less crowded.
- **Sponsor-aligned reference implementations exist but produce same-shape projects.** Picking a *novel application* on top of `npx create-8004-agent` or RealClaw is the differentiator, not the scaffolding choice.
- **The X hashtag is the late-stage intel channel.** From T-7 onward, daily hashtag scans replace the BUIDL gallery as primary signal.
- **APAC student teams are the volume; sponsor-aligned + pro quant teams are the threat.** Don't compete on volume; compete on technical novelty + sponsor-affinity stack.
- **Re-run this file after T-72h re-scrape** with real incumbents.
