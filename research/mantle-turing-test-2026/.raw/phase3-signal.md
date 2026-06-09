# Phase 3: Signal Pass — Mantle Turing Test 2026
**Captured:** 2026-06-02
**Subagent:** signal

> **Tooling note:** sahil-x scripts failed (`ModuleNotFoundError: No module named 'dotenv'` on Python 3.14; pip3 install also failed due to broken pyexpat). Fell back to WebSearch with `site:x.com` queries. Direct X tweet fetches via WebFetch were paywalled (HTTP 402). DoraHacks BUIDL page returned 405. Some sentiment claims below are inferred from Mantle's official tweets and press coverage, NOT independent builder reactions — flagged where relevant.

---

## 1. X / Twitter sentiment

### What we DO have

**Mantle's own messaging is loud and bullish.** Phase 2 announcement tweet on Apr 22, 2026:
> "Every great hackathon defines what comes next. AI Awakening defines what the onchain agentic economy looks like on Mantle, the distribution layer. Registration opens May 1."
> — [@Mantle_Official, status 2046960014506721408](https://x.com/Mantle_Official/status/2046960014506721408)

Phase 1 (ClawHack) announcement framed it as **invite-only**, which is unusual and notable:
> "Introducing The Turing Test Hackathon, Phase 1: ClawHack. AI agents are about to compete onchain. But it'll only be possible with you powering them. ClawHack is by invite-only. And we just dropped ours."
> — [@Mantle_Official, status 2042623418080858476](https://x.com/Mantle_Official/status/2042623418080858476)

**Implication of invite-only Phase 1:** Mantle pre-selected ClawHack contestants. This is a strong signal that the Phase 1 results were a curated showcase, not an open contest, and that Phase 2 winners may also benefit from sponsor relationships rather than purely cold submissions.

Mantle Q1 community call agenda explicitly listed:
> "Meet The Turing Test Hackathon w/ @singuxx → How to start your AI Agent journey w/ RealClaw & Byreal Agent Skills → Building better Agents on Mantle"
> — [@Mantle_Official, status 2043684172745810402](https://x.com/Mantle_Official/status/2043684172745810402)

`@singuxx` appears to be the internal Mantle PM/marketing lead driving the hackathon. Building agents that interoperate with RealClaw / Byreal Agent Skills is the explicit official path.

### What we DON'T have
- **No public complaint/rigging chatter found.** Searches for "Mantle hackathon rigged" returned nothing relevant. Either silence (lane not hot enough to attract complainers) or unindexed.
- **No grassroots builder hype either.** Could not find independent builders tweeting "I'm building X for Mantle Turing Test." This is mid-build (June 2 — 13 days before submission deadline). Either builders are quiet or building solo and have not posted yet.
- **No public ClawHack winner announcements visible on X via search.** This is a red flag — Phase 1 ended Apr 30, we are at Jun 2, and a 33-day gap with no public winner thread is unusual for a well-promoted hackathon.

### Sentiment bottom line
**Top-down hype, no observable bottom-up buzz.** This pattern is consistent with: (a) a hackathon dominated by sponsor-aligned teams, (b) builders building heads-down in stealth, or (c) low organic participation.

---

## 2. ClawHack (Phase 1) winners

**Status: NOT PUBLICLY ANNOUNCED as of 2026-06-02** per all search channels.

What we know:
- ClawHack ran Apr 15 – Apr 30, 2026 ([Chainwire announcement](https://chainwire.org/2026/04/23/mantle-launches-turing-test-hackathon-2026-backed-by-tencent-cloud-bybit-byreal-and-bga/)).
- $20K prize pool.
- Format: deploy AI agents via **RealClaw** (Byreal's Telegram-native agent trading product) onto Mantle DEXes: Merchant Moe, Agni Finance, Fluxion.
- Evaluation: trading volume + ROI (pure trading-bot leaderboard, no qualitative judging).
- **Invite-only** (per Mantle's own tweet).
- Three sub-categories with prize share split (per [Byreal RealClaw PR](https://www.prnewswire.com/news-releases/bringing-agentic-finance-to-telegram-byreal-debuts-realclaw-transitioning-onchain-finance-to-an-agent-first-economy-302740561.html)).

**What we can infer about winners:**
- Likely Byreal/Mantle insider teams (invite-only)
- Pure quant strategy: highest trading volume + ROI through RealClaw's existing infra
- Note: the DEXes named (Merchant Moe = 71.1% of Mantle DEX volume per [TheSpotLite review](https://thespotlite.net/merchant-moe-v2.2-review-is-the-mantle-dex-worth-your-trade)) have low total daily volume (~$12.2M ecosystem-wide), which means agents likely moved markets when trading.

**Critical open question:** If ClawHack winners are not announced before Phase 2 submission deadline (Jun 15), that signals either an embarrassing result (sponsor agents underperformed) or that Mantle is rolling Phase 1 + 2 into one July 10 announcement. Either way: **the winning ClawHack patterns cannot guide Phase 2 strategy.**

---

## 3. Prior Mantle hackathon patterns

### Mantle Global Hackathon 2025 (Oct 22, 2025 – Feb 7, 2026)
- 519 submissions, 2,044 registered devs, 30 finalists, $150K prize pool, $30K Grand Prize, 25.4% conversion rate ([PRNewswire](https://www.prnewswire.com/apac/news-releases/mantle-global-hackathon-2025-over-2-000-web3-builders-worldwide-innovate-in-the-next-wave-of-rwa-and-ai-302676215.html)).
- Tracks: RWA/RealFi (Priority), DeFi & Composability, AI & Oracles, ZK & Privacy, Infra & Tooling, GameFi & Social.
- **Submission mix: 22.21% RWA/RealFi, 21.79% DeFi — these dominated.** AI submissions were a smaller share.
- Winners announced Feb 10 at Consensus Hong Kong.

### Confirmed Mantle Global Hackathon 2025 winner: **Team OwnaFarm** (UKDW + Universitas Amikom Purwokerto, Indonesia)
- 1st place GameFi track ($8K)
- 2nd place ZK & Privacy track (cross-track placement)
- ([UKDW source](https://ukdw.ac.id/en/2026/02/12/ukdw-students-secure-two-wins-at-international-mantle-global-hackathon-2025/))
- **Pattern signal:** University team from APAC, dual-track placement = generalist team that built something multi-purpose

### Mantle APAC Hackathon 2024 (preceding event)
- Tracks: DeFi, Infra, Gaming, AI ([OpenBuild tweet](https://x.com/OpenBuildxyz/status/1857793419944587514))
- AI was a track but secondary
- No specific winner list surfaced

### **Inferred winner shape across Mantle's 2024-2025 events:**
- APAC-heavy participation (university teams from Indonesia, China, Korea)
- RWA/RealFi gets the "Priority" track designation — Mantle's chosen narrative
- AI was historically secondary, now centered for 2026
- Pattern: **DeFi composability + RWA integration consistently get judge attention; pure consumer apps rarely win unless they ship volume**

---

## 4. Judge psychology — per-org reads

### **Allora Network**
Self-improving decentralized AI inference network ($35M raised; Polychain, Framework, Delphi, CoinFund, Blockchain Capital backed). Operates an AI agent accelerator. Their thesis: AI prediction markets and model-as-a-service. **They will favor projects that consume verifiable ML predictions** (especially if integrated with their MDK or worker nodes). ([Allora Labs](https://www.alloralabs.xyz/)) ([Messari](https://messari.io/project/allora-network))

### **Blockchain for Good Alliance (BGA)**
Bybit-founded nonprofit, runs hackathons + BGAwards focused on impact (sustainability, digital identity, financial inclusion). Sponsors Track 1 (AI Trading & Strategy) alongside Bybit — interesting choice that frames trading as "for good" via better access. **They will favor projects with a social-good narrative attached** even on a trading track, e.g. "agent gives retail traders the edge institutions have." ([chainforgood.org/hackathon](https://chainforgood.org/hackathon))

### **Nansen** (Hurcan Polat representing)
On-chain analytics firm; just launched **Nansen AI**, their own conversational agent on Base and Solana. Founder Alex Svanevik has publicly stated: *"The future of investing is agentic and autonomous."* ([Cryptobriefing](https://cryptobriefing.com/alex-svanevik-nansen-integrates-on-chain-analytics-with-trading-execution-ai-agents-will-revolutionize-transaction-processes-and-the-future-of-investing-is-agentic-and-autonomous-unchained/)). **They will favor anything that consumes Nansen's data API** (and they're offering $7K credits to participants, so projects using their API are flagged). Nansen also published a [Mantle Q1 2026 Report](https://nansen.ai/post/mantle-q1-2026-report) — they're already partnered, not neutral.

### **Z.ai**
Inferred to be Chinese AI/LLM platform (formerly Zhipu AI rebrand). Limited specific data. Probably favors projects with strong LLM-orchestration patterns or that integrate Chinese AI APIs.

### **Four Pillar**
Korean Web3 research/VC firm (Four Pillars). Strong on Asian ecosystem analysis. Likely favors projects with clear go-to-market thinking, especially APAC-relevant.

### **Animoca Brands** (David Ching representing)
Web3 gaming/NFT conglomerate; in March 2026 announced **Minds**, their persistent AI agent platform, plus a **$10M dev investment program** ([Animoca announcement](https://www.animocabrands.com/announcement/animoca-brands-launches-up-to-us-10m-investment-programme-for-developers-building-with-persistent-ai-agent-platform-minds)). Their thesis: "*AI agents serve as the interface layer between human intent and on-chain execution*" ([Cointelegraph](https://cointelegraph.com/news/animoca-brands-gaming-stablecoins-ai-depin-investments)). **They will favor consumer-facing, viral, gamified projects** (their natural lane — they sponsor the "Consumer & Viral DApps" track).

### **DoraHacks** (Jonathan Breton representing)
Hackathon infrastructure provider; the literal submission platform. They favor projects that demonstrate good submission hygiene, complete demos, deployed contracts, and clear documentation. Unlikely to express strong technical preferences — process-focused.

### **Elfa AI** (Tristan Teo representing)
Limited public profile. Listed as an AI infrastructure partner with $36K in inference credits offered. **They will favor projects using their inference platform** (similar credit-sponsor dynamic to Nansen/Surf/Orbit).

### **Virtuals Protocol** (KK, COO)
Tokenized AI agent launchpad on Base — **direct competitor to Mantle's ERC-8004 thesis.** $13.23B monthly trading volume, 15,800+ AI projects, $477M aGDP ([Coinstats](https://coinstats.app/ai/a/investment-analysis-virtual-protocol)). Their presence as a judge is notable — they're sponsoring an ecosystem (Mantle) that's building rival agent infra. **They will favor projects that demonstrate cross-chain agent commerce** or that prove agents can do something Virtuals' own agents can't.

### **Hashed**
Korean Web3 VC. Their Protocol Economy 2026 report explicitly thesis-stamps **stablecoins + AI agents as the two main 2026 themes** ([Whalesbook](https://www.whalesbook.com/news/English/tech/RateGains-AI-Leap-Car-Rentals-Get-Smarter-Faster-Decisions-to-Skyrocket-Profits/69324b893c3ebbe42df345f2)). **They will favor stablecoin × agent intersections** (RWA yield, USDY/mUSD strategies, cross-currency settlement).

### **Caladan**
Market maker / Web3 infra investor. Portfolio: yield stablecoins, modular DA, AI research platforms, high-perf EVM L1s, chain abstraction ([Caladan investments](https://caladan.xyz/investments/)). **They will favor financial-infra plays** with measurable on-chain metrics — they're operators, not narrative voters.

### **HKU academic — Prof. Jack Poon**
Honorary Professor of Practice at HKU MBA; Silicon Valley fintech entrepreneur; non-official member of HK Government's Web3 Development Task Force; teaches blockchain/fintech/entrepreneurial finance ([HKU MBA](https://mba.hkubs.hku.hk/our-faculty/prof-jack-poon/)). **He will favor projects with regulatory savvy, institutional defensibility, and clear pitch articulation.**

### **Mirana Ventures** (Track sponsor for AI Alpha & Data)
Bybit's investment arm. Sponsors the alpha/data track. **They favor projects useful to active traders** — smart money flows, on-chain anomaly detection, Telegram/Discord interfaces.

### **Tencent Cloud** (Track sponsor for AI DevTools)
Cloud-first; sponsors AI DevTools track. Favors projects that consume cloud LLM APIs, demonstrate enterprise readiness, and target other devs as users.

### **Aggregate judge psychology**
- **Multiple judges have direct commercial competition** with what builders are building (Virtuals, Nansen AI agent, Allora's accelerator).
- **Sponsor-aligned projects benefit doubly**: credit usage (which signals API integration) is a passive judge signal.
- **APAC-heavy panel**: HKU, Hashed, Four Pillar, Z.ai, Tencent, Animoca, Bybit/Byreal/Mantle (Singapore-coded). Pitching should respect APAC business sensibilities — concrete metrics, clear product-market fit, less Western "vision deck" framing.

---

## 5. Mantle ecosystem context — mid-2026

### TVL & Ranking
- **DeFi TVL: $755M+ as of Q1 2026 (Mar 23) with +230% growth in 6 months** ([Chainwire](https://chainwire.org/2026/03/23/mantle-defi-tvl-surpasses-avalanche-and-sui-crossing-755m-with-230-growth-in-6-months/))
- **Crossed $1B TVL after Aave V3 integration** (March 2026; 19 days to $1B = one of fastest lending ramps in DeFi history) ([BanklessTimes](https://www.banklesstimes.com/articles/2026/03/11/the-aave-effect-mantle-crosses-1b-tvl-in-under-two-weeks/))
- **L2BEAT rank: top 5-7 by TVL** (varies by methodology) per [Bitget guide](https://www.bitget.com/news/detail/12560604351163)
- **Daily active addresses: ~2,276 avg, 5,557 peak in Q1** ([Nansen Q1 report](https://nansen.ai/post/mantle-q1-2026-report))
- **Read:** Institutional-grade L2 with low retail user count but high $-per-user. Mantle is a "whale chain" — agents that need lots of retail won't find them here.

### Major 2026 developments
- **Feb 16, 2026: Deployed ERC-8004 standard** (3-registry agent identity: Identity NFT + Reputation + Validation) ([Chainwire](https://chainwire.org/2026/02/16/mantle-unlocks-autonomous-economy-with-erc-8004-deployment/)). **This is foundational to the hackathon thesis.**
- **Q2 2025: MI4 launched** ($400M tokenized crypto index; ~$173M AUM late 2025)
- **Ondo USDY tokenized on Mantle: ~$29M circulating**
- **mETH + cmETH combined: ~$1.07B across staking/restaking** (late 2025)
- **fBTC on Mantle**: Bitcoin-denominated collateral for lending; expanding to non-EVM chains
- **Infinex integration**: passkey-first wallet aggregator
- **Ethereum blobs transition**: Mantle moving from Validium → full ZK rollup post-Fusaka upgrade
- **Bybit advisors**: Helen Liu (Co-CEO) and Emily Bao (Spot Trading + Web3 Head, Byreal founder) joined Mantle as advisors ([Unchained tweet](https://x.com/Unchained_pod/status/1952809535510282519))

### Bybit hack lingering effects
- $1.5B Bybit hack Feb 21, 2025 (TraderTraitor / DPRK). Still unrecovered as of 2026.
- Bybit covered losses via internal funds + bridge loan. Solvent.
- 10% recovery bounty active.
- **Byreal itself is a strategic pivot product** built after the hack to "lean Web3 strategy" — originally launched on Solana June 2025 ([CryptoBriefing](https://cryptobriefing.com/byreal-on-solana-dex/)). RealClaw on Mantle is the **EVM extension** of that Solana product.
- **Read:** No active drama, but builders should not over-stack a project's narrative on Bybit infrastructure dependence — institutional trust is the wound.

### Key assets
- **mETH/cmETH**: real adoption (Fireblocks, Copper custody integrations)
- **MI4**: smaller scale, institutional play
- **USDY**: live, small scale (~$29M) but real
- **fBTC**: cross-chain BTC collateral, real usage
- **All four have publicly documented APIs/integration paths** — perfect for AI × RWA track

---

## 6. Problem signal — what users actually complain about

### AI trading bot complaints (the elephant in Track 1)
> "Over 80% of retail bot users underperform traditional buy-and-hold strategies after accounting for transaction costs and market slippage."
> — [crypto.news](https://crypto.news/leading-ai-day-trading-bots-in-2026-why-most-fail-and-what-actually-works/)

> "AI in most retail bot products is more marketing than machine learning. Most 'AI' bots are rule-based with marketing language."
> — [crypto.news](https://crypto.news/leading-ai-day-trading-bots-in-2026-why-most-fail-and-what-actually-works/)

> "Untested strategies, zero built-in risk controls, and no live market optimization."
> — [Memeburn](https://memeburn.com/ai-crypto-trading-bot-platforms/)

**Implication:** The AI Trading & Strategy track is hot but saturated with mediocre work. **Differentiator: ship verifiable backtesting, transparent risk controls, AND don't claim ML if you're not using it.**

### Telegram alpha bot complaints
> "Crypto Telegram and Discord are described as cesspools of fake trading signals, with paid groups featuring fabricated screenshots, 'admins' who front-run their own calls, and pump-and-dump schemes disguised as 'exclusive alpha.'"
> — [MEXC News](https://www.mexc.com/news/why-ai-and-defi-copy-trading-bots-are-replacing-telegram-alpha-groups-in-2025/74318)

**Implication:** Track 2 (AI Alpha & Data) — there's user pain. An honest, ML-driven alpha bot with verifiable on-chain signal sourcing on Mantle could differentiate against the scam-shaped competition.

### DeFi UX pain on Mantle
> "Blind signing remains a top attack vector. Some hardware wallet offerings lack usable on-device human-readable previews for complex smart contract calls."
> — [Cryptowisser](https://www.cryptowisser.com/guides/crypto-ux-dark-patterns-2026/)

> "Onboarding processes often require users to navigate multiple platforms for asset bridging, staking, and yield farming — a process that can take hours for first-time users."
> — [AInvest](https://www.ainvest.com/news/defi-growth-challenges-navigating-user-adoption-infrastructure-hurdles-2025-2510/)

> "RPC endpoint slow or unreliable... the network may feel broken even when Mantle is still producing blocks."
> — [Coin Bureau Mantle review](https://coinbureau.com/review/mantle-network-review)

**Implication:** Multi-step DeFi flows on Mantle (Aave V3 → mETH → MI4 → USDY) are the natural unlock for agentic wallets. Track 6 (Agentic Economy with Byreal Skills CLI) is genuinely solving a problem.

### RWA accessibility
- USDY only $29M tokenized on Mantle — small denominator, big upside
- mETH integrations target institutional custody (Fireblocks, Copper) NOT retail
- **Gap:** retail-friendly RWA yield is unsolved on Mantle — a thin layer over USDY/MI4 + an agent UI could be very fresh

---

## 7. Cross-cutting strategic signals

### What's likely **HOT (saturated)**
- **Track 1 (AI Trading & Strategy)**: Pure trading-bot teams will swarm here. ClawHack ran a $20K version of exactly this. Mediocre work will not differentiate; pro quants who know Bybit API will dominate. **Avoid unless you have unusual edge.**

### What's likely **HOT (open)**
- **Track 3 (AI × RWA)**: Mantle is publicly betting its 2026 narrative on RWA distribution. USDY/MI4/mETH all have docs but few hackathon projects integrate them. Hashed thesis aligns perfectly. **High judge interest, lower competitive density.**
- **Track 6 (Agentic Economy w/ Byreal Skills CLI)**: Byreal-sponsored, novel CLI, Animoca-thesis adjacent. Low competition, high sponsor interest. **Lower competitive density, direct sponsor pipeline.**

### What's likely **WARM**
- **Track 2 (AI Alpha & Data)**: Real user pain, Nansen sponsor pipeline, Mirana judging. Decent shot if you ship credible on-chain signal work.
- **Track 5 (AI DevTools)**: Tencent Cloud sponsor; smaller crowd; if you build something Mantle devs actually use, you stand out.

### What's likely **NOISY**
- **Track 4 (Consumer & Viral DApps)**: Animoca/OpenCheck sponsored; "viral" is a low-substance judging criterion. Could go either way — Animoca's $10M Minds program is a real follow-on path if you win.

### Sponsor proximity = winning likelihood
- Mantle has gone all-in on RealClaw (Byreal product), Byreal Agent Skills CLI, and ERC-8004 as the agent identity layer.
- Projects that **explicitly use ERC-8004 + Byreal Skills CLI + a Mantle RWA asset (USDY/mETH/MI4)** stack three sponsor-affinity vectors at once.
- Projects that integrate sponsor APIs (Nansen, Elfa, Surf, Orbit, AltLLM, Bybit) gain passive judge favor via credit consumption logs.

### Live judging on July 2-3 + livestream
- Per devhub: live-streamed globally. **Demo quality and live performance matter more than usual.** Agents that crash live = catastrophic; agents that visibly outperform a human in a head-to-head segment = memorable.
- The "Human vs. AI mechanism" framing means each track may include a live human vs. agent challenge segment.

---

## Unverifiable / open questions

1. **ClawHack winners** — still not publicly announced. Will the team release before Phase 2 submission? Will they tip off what worked?
2. **Real Phase 2 builder count** — DoraHacks BUIDL page is blocked from WebFetch (HTTP 405). Need to manually check dorahacks.io/hackathon/mantleturingtesthackathon2026 in browser to see actual submission density.
3. **X sentiment from independent builders** — sahil-x tooling broken; could not pull real-time builder timelines. Hand-check key handles if Abu wants ground truth: @singuxx, @joshuacheong, @byreal_xyz, @bybit_official, @Mantle_Official replies.
4. **Whether judging panel for Phase 2 finale on Jul 2-3 is the **full list** or a subset** — devhub.mantle.xyz shows ~15 named judges but PR releases say AI Awakening finale features only Allora/Animoca/Nansen/Caladan/Hashed/HKU (smaller subset).
5. **Live "Human vs. AI" mechanism details** — what does this look like in practice for non-trading tracks (e.g., Track 5 DevTools)?
6. **Phase 1 prize distribution** — was the $20K ClawHack pool actually paid out? Was it consumed by insiders/sponsor-affiliated teams?
7. **"Emily Bao called the hackathon 'not a coding contest'"** — this quote from the original brief could not be verified in my searches. May be from a podcast/AMA not indexed by web search. **Flag as unverified.**

---
*End Signal Pass — phase3-signal.md*
