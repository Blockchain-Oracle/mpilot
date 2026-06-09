# 00 — Overview

**Hackathon:** The Turing Test Hackathon 2026 — Phase 2 "AI Awakening"
**Sponsor coalition:** Mantle Network · Bybit · Byreal · Blockchain for Good Alliance (BGA) · supported by DoraHacks (registration) + HackQuest (no mirror live)
**Status:** OPEN — registration since 2026-05-01
**Today:** 2026-06-02
**Submission deadline:** **2026-06-15 15:59 UTC** (13 days remaining; `isExtended=false`)
**Demo Day:** 2026-07-02 → 2026-07-03 (live-streamed)
**Winner announcement:** 2026-07-10

---

## What it is, one paragraph

A two-phase AI agent hackathon on Mantle. Phase 1 (ClawHack, Apr 15–30) was an **invite-only** on-chain trading-bot leaderboard via Byreal's RealClaw on Merchant Moe / Agni / Fluxion — $20K pool, winners still unannounced as of 2026-06-02. Phase 2 (AI Awakening) is the **open** general hackathon: $100K cash + ~$110K computing/API credits across 6 tracks + 4 cross-cutting awards. Submission is on DoraHacks. The thesis is "agents as sovereign economic participants" — Mantle deployed ERC-8004 (Trustless Agents) at canonical addresses on mainnet Feb 16 2026, and the hackathon is the public stress-test of that infrastructure.

## Headline facts table

| Field | Value | Source |
|---|---|---|
| DoraHacks listing | `dorahacks.io/hackathon/mantleturingtesthackathon2026` | verified live |
| Mantle landing | `devhub.mantle.xyz` | verified live |
| HackQuest mirror | NOT LIVE despite press-release attribution | confirmed missing |
| Total event value | **$100K cash + ~$110K credits ≈ $223K** (Phase 2 only) | DoraHacks + devhub |
| Cash split | $9K Grand · $51K tracks (6×$8.5K) · $17K community (2×$8.5K) · $3K UX · $20K finalist (20×$1K) | verified prize image |
| Compute credits | $36K Elfa · $30K Surf · $30K Orbit · $7K Nansen · $7K AltLLM | devhub |
| Applications | **179** registered (842 hackers, 9 teams, 0 BUIDLs visible) | DoraHacks Nuxt state |
| Team size cap | NOT SPECIFIED on platform | open question |
| Multi-track | **Allowed, max 2 tracks per project** (`tracksLimitForBuidl=2`) | DoraHacks |
| GitHub repo | Required by track rubrics; NOT enforced at platform level | mixed |
| Demo video | Required for Deployment Award (≥2 min); not platform-enforced | mixed |
| Open-source license | Required by all rubrics; specific license (MIT/Apache) NOT specified | open question |
| Mainnet vs testnet | **Testnet acceptable** for Deployment Award; Grand Champion says "deployed on Mantle Network" generically | mixed |
| Submission required artifacts | DoraHacks form + X thread tagged `#MantleAIHackathon` + repo + demo video + Mantle contract address | press release |
| Sponsor-tool requirements | **Agentic Economy:** Byreal Agent Skills OR Perps CLI OR RealClaw required. **Agentic Economy only:** Solana allowed alongside Mantle. **All other tracks:** Mantle Network required. | Requirements tab |
| Eligibility | Open globally (Phase 2). Phase 1 was invite-only. | devhub |
| Contact | `finn.li@mantle.xyz`, `stella.zhou@mantle.xyz`; WeChat 2698817790; @MantleOfficial on X | press release |

## Six tracks at a glance

| # | Track | Sponsor | Lane verdict | Notes |
|---|---|---|---|---|
| 1 | AI Trading & Strategy | BGA (+Bybit API) | 🟥 SATURATED | Pro quants + Bybit insiders; Phase 1 was a $20K dress rehearsal. Track rubric not published. |
| 2 | AI Alpha & Data | Mirana Ventures | 🟧 WARM | Real user pain; Nansen API gives free signal; Telegram/Discord bot scam-shape competition. |
| 3 | AI × RWA | Mantle Network | 🟩 OPEN | Hashed's 2026 thesis; USDY/mUSD/mETH/MI4 ready; few hackathon projects integrate them. |
| 4 | Consumer & Viral DApps | Animoca (per devhub) | 🟧 NOISY | "Viral" is squishy; Animoca's Minds $10M follow-on is the upside; rubric not published. |
| 5 | AI DevTools | Tencent Cloud (per devhub) | 🟧 WARM | Small crowd; rubric not published; useful infra for Mantle devs wins. |
| 6 | Agentic Wallets & Economy | Byreal | 🟩 OPEN | Direct Byreal sponsor pipeline; Solana allowed; RealClaw + Skills CLI is the explicit path. |

Plus cross-cutting: **Grand Champion** ($9K), **Community Voting** ($17K = 2×$8.5K, X-engagement-based), **Best UI/UX** ($3K), **Deployment Award** ($20K = 20×$1K, first-come, testnet OK, **objective bar — no judging**).

## Top-level open questions

1. **Phase 1 (ClawHack) winners still unannounced 33 days post-close.** We cannot reverse-engineer winning Phase 1 patterns.
2. **Three of six track rubrics not published** (AI Trading, Consumer DApps, DevTools). Default assumption: Grand Champion rubric.
3. **Judge names mostly anonymous.** Only Jack Poon (HKU) is publicly named; the other 11 are listed by org only. Some named judges surfaced via prior outreach: Hurcan Polat (Nansen), David Ching (Animoca), KK (Virtuals COO), Jonathan Breton (DoraHacks), Tristan Teo (Elfa).
4. **`buidlsCount = 0`** with 13 days left — gallery is empty. Either submissions are batch-at-end or DoraHacks BUIDL flow is admin-gated. Re-scrape at T-72h and T-24h.
5. **Validation Registry (third ERC-8004 registry) is in flux.** Don't build on it. Identity + Reputation are stable.

## File index

- `01-prizes-tracks.md` — every prize amount + every track's judging rubric (with weights), including the 3 unpublished rubrics
- `02-sponsor-docs.md` — Mantle chain primitives, Byreal stack, OpenClaw, ERC-8004 details, Bybit API, RWA primitives
- `03-project-gallery.md` — DoraHacks gallery scrape (currently empty); re-scrape plan
- `04-competitor-analysis.md` — inferred competitor shape since no visible incumbents
- `05-prior-winners.md` — Phase 1 ClawHack analysis + Mantle Global Hackathon 2025 winner pattern
- `06-hidden-field.md` — per-track lane saturation verdict (🟩 / 🟧 / 🟥) with reasoning
- `07-pre-commit-checklist.md` — decision-factors checklist before locking a wedge
- `refs/sdk-snippets.md` — paste-and-go code: viem config, USDY interaction, Byreal CLI install, ERC-8004 register, Bybit V5 signing
- `refs/sponsor-repos.md` — clone commands for every sponsor repo with "what to borrow" notes
- `refs/participant-repos.md` — currently empty; structural placeholder for Phase 2 re-scrape
- `CONTEXT.md` — **READ THIS FIRST.** Synthesized agent entrypoint.

## Primary URL ledger

- DoraHacks listing — https://dorahacks.io/hackathon/mantleturingtesthackathon2026
- DoraHacks BUIDLs — https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl
- Mantle dev hub — https://devhub.mantle.xyz
- Mantle docs — https://docs.mantle.xyz
- Mantlescan — https://mantlescan.xyz · Sepolia https://sepolia.mantlescan.xyz
- RealClaw — https://www.byreal.io/en/realclaw/mantle
- Byreal GitHub — https://github.com/byreal-git
- OpenClaw — https://github.com/openclaw/openclaw · Discord https://discord.gg/clawd
- ClawHub (Skills registry) — https://github.com/openclaw/clawhub
- ERC-8004 site — https://www.8004.org · canonical repo https://github.com/erc-8004/erc-8004-contracts
- Awesome ERC-8004 — https://github.com/sudeepb02/awesome-erc8004
- Ondo Mantle integration — https://docs.ondo.finance/developer-guides/mantle-integration-guidelines
- RWA.xyz Mantle view — https://app.rwa.xyz/networks/mantle
- Nansen API docs — https://docs.nansen.ai
- Press release (PRNewswire) — https://www.prnewswire.com/news-releases/mantle-unites-global-ai-tech-and-youth-communities-302750420.html
- Press release (Chainwire) — https://chainwire.org/2026/04/23/mantle-launches-turing-test-hackathon-2026/
- ERC-8004 mainnet deployment release — https://www.prnewswire.com/in/news-releases/mantle-unlocks-autonomous-economy-with-erc-8004-deployment-302688553.html
- Nansen Mantle Q1 2026 report — https://nansen.ai/post/mantle-q1-2026-report
