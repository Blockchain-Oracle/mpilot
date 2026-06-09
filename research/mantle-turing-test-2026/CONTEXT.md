# CONTEXT — Mantle Turing Test Hackathon 2026

> **You are a downstream agent loading this file as your only context. Read it top to bottom before reading anything else. Then pull the specific sub-doc you need from the file index at the bottom.**

---

## TL;DR (read this section even if you read nothing else)

- **Hackathon:** The Turing Test Hackathon 2026 — Phase 2 "AI Awakening"
- **Submission deadline:** **2026-06-15 15:59 UTC** (locked, `isExtended=false`)
- **Today is 2026-06-02 → 13 calendar days remain**
- **Total event value:** **$100K cash + ~$110K credits ≈ $223K**
- **Platform:** DoraHacks at `dorahacks.io/hackathon/mantleturingtesthackathon2026`
- **Gallery status:** **EMPTY (`buidlsCount=0`)** with 179 applications + 842 hackers registered. Visibility = zero. Re-scrape at T-72h.
- **Phase 1 winners:** **STILL NOT PUBLICLY ANNOUNCED** 33 days post-close. ClawHack was invite-only — operating assumption is sponsor-aligned teams have structural advantage.
- **Six tracks (lane verdicts):** 🟥 Track 1 (Trading) · 🟧 Track 2 (Alpha) · 🟩 Track 3 (RWA) · 🟧 Track 4 (Consumer) · 🟧 Track 5 (DevTools) · 🟩 Track 6 (Agentic Economy)
- **Multi-track entries allowed (max 2)** — pair smartly. See `06-hidden-field.md` for recommended pairings.
- **Deployment Award (20 × $1,000)** is the floor lane — objective bar, no judging, testnet OK. Every serious team clears this.
- **Critical clarification:** Byreal CLMM is on **Solana**, Byreal Perps routes to **Hyperliquid**. Mantle is the identity/settlement/RWA layer. A Mantle-only DeFi agent does NOT satisfy Byreal integration requirements for Track 6.
- **ERC-8004 (agent identity NFTs) is LIVE on Mantle mainnet** at canonical CREATE2 addresses since 2026-02-16. Identity + Reputation registries are stable. Validation Registry is in flux — don't build on it.
- **Mantle Mainnet:** chain ID `5000`, RPC `https://rpc.mantle.xyz`, explorer `mantlescan.xyz`. Sepolia: chain ID `5003`, RPC `https://rpc.sepolia.mantle.xyz`. **Testnet is acceptable for Deployment Award.**
- **Strategic posture:** Multiple judges (Virtuals, Nansen, Allora, Animoca) are commercial competitors to what you might build. **Pitch as complement, never alternative.**

---

## What this hackathon is, in one paragraph

A two-phase AI-agent hackathon on Mantle Network, the Ethereum L2 that has spent 2026 positioning itself as "the settlement layer for autonomous agent commerce." Phase 1 (ClawHack, Apr 15-30 2026) was an **invite-only** on-chain trading-bot leaderboard with $20K paid via Byreal's RealClaw on Mantle DEXes — winners are still not publicly announced as of today. Phase 2 (AI Awakening) is the **open** hackathon: $100K cash + ~$110K compute/API credits across 6 tracks + 4 cross-cutting awards, with finalists demoed live on July 2-3 and winners announced July 10. The thesis the hackathon is publicly stress-testing: **ERC-8004 identity NFTs + Byreal Skills CLI + Mantle RWA primitives = the infrastructure for AI agents as sovereign economic participants**. Mantle deployed ERC-8004 at canonical CREATE2 addresses on mainnet Feb 16 2026, and they're inviting the world to build agents on it.

## Headline verified facts

| Fact | Value | Verified source |
|---|---|---|
| Submission deadline | **2026-06-15 15:59 UTC** | DoraHacks `endTime` field |
| Demo Day | **2026-07-02 → 07-03** (live-streamed) | Timeline image OCR |
| Winner announcement | **2026-07-10** | Timeline image OCR |
| Multi-track allowed | **Yes, max 2 per project** | `tracksLimitForBuidl=2` |
| Solana allowed | **Track 6 only** (alongside Mantle) | Requirements & Criteria tab |
| Mainnet vs Testnet | Either acceptable for Deployment Award; Grand Champion implies Mantle Network broadly | Rubrics |
| Open-source license | Required by all rubrics; specific license unspecified | Rubrics (assume MIT or Apache 2.0) |
| Required X thread | Yes, tagged `#MantleAIHackathon` | Press release |
| ERC-8004 Identity Registry (Mantle Mainnet) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | Mainnet deployment Feb 16 2026 |
| ERC-8004 Reputation Registry (Mantle Mainnet) | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | Same |
| USDY on Mantle | `0x5bE26527e817998A7206475496fDE1E68957c5A6` | Ondo docs |
| mUSD (rebasing USDY) | `0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3` | Ondo docs |
| Redemption Price Oracle | `0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f` | Ondo docs |
| Mantle Mainnet chain ID | **5000** | chainlist.org/chain/5000 |
| Mantle Sepolia chain ID | **5003** | chainlist.org/chain/5003 |
| Mantle RPC | `https://rpc.mantle.xyz` | Mantle docs |
| Mantle Sepolia RPC | `https://rpc.sepolia.mantle.xyz` | Mantle docs |

## Prize structure (Phase 2 cash, $100K)

| Award | Amount | Per-place |
|---|---|---|
| Grand Champion | **$9,000** | 1 winner |
| 6× Track First Prize | **$51,000** | 6 × $8,500 |
| 2× Community Voting | **$17,000** | 2 × $8,500 (X-engagement-based) |
| Best UI/UX | **$3,000** | 1 winner |
| 20× Deployment Award | **$20,000** | 20 × $1,000 (first-come, no judging) |

Plus ~$110K credits: $36K Elfa · $30K Surf · $30K Orbit · $7K Nansen · $7K AltLLM (Tencent Cloud + Z.ai allocations TBD at kickoff).

## Six tracks at a glance with lane verdicts

| # | Track | Sponsor | Verdict | One-line strategic note |
|---|---|---|---|---|
| 1 | AI Trading & Strategy | BGA + Bybit API | 🟥 RED | Saturated with ClawHack alumni + pro quants; rubric not published; avoid unless unusual edge |
| 2 | AI Alpha & Data | Mirana Ventures | 🟧 YELLOW | Real pain, Nansen sponsor pipeline; differentiate on verifiable signal provenance |
| 3 | AI × RWA | Mantle Network | 🟩 GREEN | Mantle's 2026 thesis; Hashed-aligned; few hackathon projects integrate USDY/mUSD/MI4/mETH |
| 4 | Consumer & Viral DApps | Animoca | 🟧 YELLOW | Rubric not published; Animoca Minds $10M follow-on is real upside |
| 5 | AI DevTools | Tencent Cloud | 🟧 YELLOW | Smaller crowd; rubric not published; ship something Mantle devs actually use |
| 6 | Agentic Wallets & Economy | Byreal | 🟩 GREEN | Direct Byreal sponsor pipeline; Solana allowed; RealClaw + Byreal Skills CLI is the explicit path |

Full per-track rubrics + judging weights in `01-prizes-tracks.md`. Full saturation reasoning in `06-hidden-field.md`.

## Recommended track pairings (since `tracksLimitForBuidl=2`)

| Pairing | Realistic upper-bound EV | Why it works |
|---|---|---|
| Track 3 + Grand Champion | $18,500 | RWA project naturally maximizes Mantle ecosystem fit; Hashed-thesis aligned |
| Track 6 + Grand Champion | $18,500 | Direct Byreal advocacy; same agent codebase |
| Track 6 + Best UI/UX | $20,500 | RealClaw real-life expansion + frontend polish |
| **Track 3 + Track 6 (cross-track)** | **$26,500** | RWA agent built on Byreal Skills CLI; hits both green lanes simultaneously |
| Always-on: Deployment Award | +$1,000 | Floor lane; objective bar; testnet OK |

## What's in the field (visibility = zero, infer from indirect signals)

The DoraHacks BUIDL gallery is empty as of 2026-06-02. Reasoning:
- 842 hackers + 179 applications registered → real density
- 9 teams formed (5% formation rate) → most participants are solo
- `isBuidlsPrivate=false` → it's not a privacy issue, it's submission timing or admin gating
- **The empty gallery is itself the most useful single intel artifact: we cannot predict competitor density visually, so our wedge must be defensible on absolute merit, not relative novelty.**

Inferred competitor archetypes (full discussion in `04-competitor-analysis.md`):
1. ClawHack alumni rebuilding for Track 1/6
2. Pro quants with Bybit API for Track 1
3. Virtuals/Base agent porters for Tracks 4/6
4. Animoca-Minds-adjacent consumer teams for Track 4
5. APAC university teams (multi-track placement, OwnaFarm pattern from Mantle Global 2025)
6. ERC-8004 reference-implementation users (low novelty, high volume)
7. Hashed-thesis-aligned RWA + AI teams (low count, high judge alignment)

Late-stage intel channel: **the `#MantleAIHackathon` X hashtag** — required on every submission per press release. From T-7 onwards, daily scans of this hashtag replace the empty BUIDL gallery as primary competitor signal.

## What's available to build with (primitives ready today)

**On-chain identity:**
- ERC-8004 Identity + Reputation Registries live on Mantle mainnet at canonical CREATE2 addresses since Feb 16, 2026
- **Don't use Validation Registry** — in flux from TEE-community spec update

**Mantle native RWA assets** (Track 3):
- USDY (Ondo, ~$29M circ.) + mUSD (rebasing) + Redemption Price Oracle — addresses above
- mETH ($791M TVL, 4% APY)
- MI4 ($400M index — BTC/ETH/SOL/stables w/ yield enhancement)
- fBTC (~$1.5B cross-chain BTC)

**Agent execution stack** (Track 6):
- Byreal Agent Skills (Solana CLMM): `npx skills add byreal-git/byreal-agent-skills`
- Byreal Perps CLI (Hyperliquid): `npx skills add byreal-git/byreal-perps-cli`
- Byreal SDK (TypeScript): `npm install @byreal-io/byreal-sdk`
- RealClaw packaging concept (`byreal-git/RealClaw-Skills` is empty — start from OpenClaw + Byreal skills)
- OpenClaw runtime: https://github.com/openclaw/openclaw (~376k ⭐ MIT) + Claude Agent SDK underneath

**ERC-8004 scaffolders** (any track):
- `npx create-8004-agent` (Eversmile12) — fastest 0→1 with A2A + MCP + USDC payments
- `AgentlyHQ/aixyz` — payment-native Next.js-like framework
- `agent0lab/agent0-ts` — pure TypeScript SDK
- `Trustdev-eth/x402-erc8004-agent` — for x402 micropayments + ERC-8004

**Credit-sponsor APIs (consumption = passive judge signal):**
- Nansen (Smart Money / Token God Mode) — $7K credits
- Elfa AI (inference) — $36K credits
- Surf AI — $30K credits
- Orbit AI — $30K credits
- AltLLM — $7K credits
- Z.ai (GLM models) — 1000 req/day free; hackathon-specific TBD
- Tencent Cloud — TBD

**Trading data (Track 1/2):**
- Bybit V5 API — REST `https://api.bybit.com`, testnet `https://api-testnet.bybit.com`, WS endpoints public/private
- Auth: HMAC-SHA256 over `timestamp + API_key + recv_window + params`
- Python `pybit`, Node `bybit-api`

**Decentralized ML inference:**
- Allora Network — 55+ live Topics, consume via Topic Inference EVM client

Full code snippets in `refs/sdk-snippets.md`. Repo clone commands in `refs/sponsor-repos.md`.

## Judge psychology (per `phase3-signal.md`)

Confirmed organizations on judging panel: Allora, BGA, Nansen (Hurcan Polat), Z.ai, Four Pillars, Animoca Brands (David Ching), DoraHacks (Jonathan Breton), Elfa AI (Tristan Teo), Virtuals Protocol (KK, COO), Hashed, Caladan, HKU (Prof. Jack Poon). Most individual names NOT publicly attributed.

Key reads:
- **APAC-heavy panel.** HKU, HKUST, Hashed, Four Pillars, Z.ai, Tencent, Animoca, Bybit/Byreal/Mantle (Singapore-coded). Pitch with concrete metrics + clear PMF, less Western "vision deck" framing.
- **Multiple judges are direct commercial competitors** — Virtuals on Base, Nansen AI on Base/Solana, Allora's accelerator. **Position complement, not alternative.**
- **Hashed's 2026 Protocol Economy thesis** explicitly stamps stablecoins + AI agents as the dual macro themes. A submission at the stablecoin × agent intersection is thesis-stamped.
- **Animoca's $10M Minds dev investment program** is the under-radar prize for Track 4 — winning the track is one outcome; getting Minds funding is the bigger one.
- **Caladan + DoraHacks** = operator-grade taste. Process hygiene (verified contracts, README, complete demos) is table stakes.
- **Live "Human vs AI" mechanism on Demo Day** — your agent must demo live without crashing. Rehearse. Have fallback paths.

## Top open questions you may want to resolve before locking a wedge

1. **Re-scrape DoraHacks BUIDL gallery** at T-72h (2026-06-12) and T-24h (2026-06-14). Use Playwright/browser MCP — `curl` is WAF-blocked.
2. **Phase 1 ClawHack winners** — still unannounced. Search `@Mantle_Official` X timeline; check devhub blog.
3. **Three unpublished track rubrics** (Tracks 1, 4, 5) — assumed to default to Grand Champion rubric; confirm with `finn.li@mantle.xyz` if targeting any of those.
4. **Named judges per organization** — only ~6 names surfaced (Poon, Polat, Ching, KK, Breton, Teo). LinkedIn/X enrichment pass needed.
5. **`byreal-git/RealClaw-Skills` is empty.** Confirm with organizers if a specific RealClaw distribution is expected (vs. vanilla OpenClaw + Byreal skills).
6. **Tencent Cloud / Z.ai hackathon-specific credit amounts** — only standard tiers surfaced. Ask at kickoff.
7. **Team size cap** — not specified anywhere. Confirm before assembling >5-person team.
8. **fBTC / MI4 Mantle contract addresses** — not surfaced cleanly; verify via mantlescan or project repos.

## Strategic posture (what the research collectively suggests)

1. **The two open lanes are 🟩 Track 3 (AI × RWA) and 🟩 Track 6 (Agentic Economy).**
2. **The highest-EV strategy is a dual-track entry** built as a single agent: Byreal Skills CLI execution + Mantle RWA settlement + ERC-8004 identity. This hits both green lanes plus stacks Grand Champion eligibility.
3. **Always clear the Deployment Award bar** ($1K guaranteed, objective).
4. **Pitch every demo as a gift to sponsor infrastructure** — drives volume/users/adoption to Mantle + Byreal + RWA partners. Never position as alternative to Virtuals / Nansen / Allora / Animoca.
5. **Submit by Day 10 (2026-06-12)** — leaves 3 days of buffer for X thread, video, debugging, and last edits. Deployment Award is first-come-first-served on ties.
6. **Live demo prep is not optional.** Plan graceful degradation paths for every external API the agent depends on.

> The skill explicitly does NOT prescribe a specific wedge — that's Abu's decision. The above is *implications* drawn from the research, not a build instruction. See `07-pre-commit-checklist.md` for the 8-question decision gate before locking any wedge.

## File index

- `00-overview.md` — full headline-facts table + URL ledger
- `01-prizes-tracks.md` — every prize amount + every track's judging rubric with weights
- `02-sponsor-docs.md` — Mantle chain, Byreal stack, OpenClaw, ERC-8004, Bybit V5, RWA primitives, sponsor/partner snapshots
- `03-project-gallery.md` — empty-gallery state + re-scrape plan
- `04-competitor-analysis.md` — inferred competitor archetypes + adjacent signal sources
- `05-prior-winners.md` — Phase 1 ClawHack analysis + Mantle Global 2025 winner pattern
- `06-hidden-field.md` — per-track lane saturation verdict (🟩/🟧/🟥) with reasoning + recommended pairings
- `07-pre-commit-checklist.md` — 10 sections of decision factors before locking a wedge
- `refs/sdk-snippets.md` — paste-and-go code: viem chains, ERC-8004 register, USDY interaction, Byreal CLI/SDK, Bybit V5 auth, OpenClaw skill template, universal .env template
- `refs/sponsor-repos.md` — every relevant repo with clone command + what to borrow
- `refs/participant-repos.md` — structural placeholder (empty until BUIDL gallery populates)

Raw findings (intermediate research, only read if you need to verify a specific claim):
- `.raw/phase1-platform.md` — DoraHacks scrape + judges + prize structure verification
- `.raw/phase2-sponsor-docs.md` — full SDK + docs pass with code snippets
- `.raw/phase3-signal.md` — X sentiment + ClawHack analysis + judge psychology + ecosystem context

## Next actions for downstream agents

If you are a **coding agent** picking this up: read `07-pre-commit-checklist.md` for the wedge gate, then `refs/sdk-snippets.md` for the build primitives. Don't write code until the wedge clears all 8 acceptance criteria in §10 of the checklist.

If you are a **brainstorming agent**: read `06-hidden-field.md` first for the lane verdicts, then `03-project-gallery.md` for the field state, then generate wedge candidates that target 🟩 Track 3, 🟩 Track 6, or the Track 3 + 6 cross-pairing.

If you are a **research agent doing a follow-up pass**: the top open intel is the DoraHacks BUIDL re-scrape at T-72h (browser MCP required — `curl` is WAF-blocked), the `#MantleAIHackathon` X hashtag tracker, and ERC-8004 Identity Registry on-chain event scan to count actual Phase 2 participants programmatically.

---

**Generated:** 2026-06-02
**Skill:** `sahil-hackathon-research`
**Working dir:** `/Users/abu/dev/hackathon/mantel`
**Slug:** `mantle-turing-test-2026`
