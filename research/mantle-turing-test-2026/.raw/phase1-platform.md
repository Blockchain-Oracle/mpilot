# Phase 1: Platform Pass — Mantle Turing Test 2026
**Scraped:** 2026-06-02
**Subagent:** platform

> All facts cite the source URL. Where the user brief contradicts the official pages, the official source wins and the conflict is flagged.

---

## URLs verified

| Resource | URL | Status |
|---|---|---|
| DoraHacks canonical | https://dorahacks.io/hackathon/mantleturingtesthackathon2026 | LIVE (200) — primary source of truth |
| DoraHacks gallery (BUIDLs) | https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl | LIVE — but **empty** (0 projects) |
| DoraHacks Requirements & Criteria tab | https://dorahacks.io/hackathon/mantleturingtesthackathon2026/requirements-&-criteria | embedded in main page Nuxt data |
| Mantle Dev Hub (official landing) | https://devhub.mantle.xyz/ | LIVE |
| Press release (PR Newswire) | https://www.prnewswire.com/news-releases/mantle-unites-global-ai-tech-and-youth-communities-for-its-largest-ai-hackathon-backed-by-tencent-cloud-bybit-byreal-and-blockchain-for-good-alliance-302750420.html | LIVE — apr 22 2026 dateline |
| Press release (Chainwire) | https://chainwire.org/2026/04/23/mantle-launches-turing-test-hackathon-2026-backed-by-tencent-cloud-bybit-byreal-and-bga/ | LIVE — apr 23 2026 |
| Mantle Phase 1 (ClawHack) announcement tweet | https://x.com/Mantle_Official/status/2042617042537451733 | referenced in DoraHacks description |
| RealClaw platform | https://www.byreal.io/en/realclaw/mantle | LIVE |
| HackQuest mirror | NOT FOUND — `hackquest.io/hackathons` does not list this event despite the press release naming HackQuest as a supporting platform | **NOT MIRRORED** |
| Prize-pool breakdown image | https://cdn.dorahacks.io/static/files/19dd88aeb03e6fa637631d84a3883fd9.png | OCR'd below |
| Tracks image | https://cdn.dorahacks.io/static/files/19dd88a8d86fb88f4418ddc4f08b4245.jpg | OCR'd below |
| Timeline image | https://cdn.dorahacks.io/static/files/19db59e64d5cfa431774d8c4a7dbf067.jpeg | OCR'd below — definitive timeline |

---

## Hard facts pulled from DoraHacks Nuxt state (source of truth)

Source: parsed `__NUXT_DATA__` JSON inside https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl HTML (curl with browser UA, AWS WAF passes for static HTML but blocks API).

| Field | Value |
|---|---|
| Hackathon ID | 2130 |
| Title | The Turing Test Hackathon 2026 |
| Slug (uname) | `mantleturingtesthackathon2026` |
| Phase 2 start (UTC) | **2026-05-01 00:00:00** |
| Phase 2 end (UTC) | **2026-06-15 15:59:00** ← submission deadline |
| `isExtended` | false (deadline has NOT been pushed) |
| `applicationsCount` | **179** |
| `hackersCount` | **842** |
| `teamCount` | **9** |
| `buidlsCount` | **0** ← gallery empty as of scrape |
| `tracksLimitForBuidl` | 2 (a project can enter ≤2 tracks) |
| `isMultiTracksAllowed` | true |
| `mandatoryGitRepoLink` | **false** (repo not strictly enforced at platform level) |
| `mandatoryVideoLink` | **false** (video not strictly enforced) |
| `isBuidlsPrivate` | false (gallery will be public) |
| `enableWhitelist` | false (open registration) |
| `bonusPrice` | **100000** (matches $100K Phase 2 pool) |
| `bonusDescription` | empty array |
| `participation` / `participationForm` | Virtual |
| `field` tags | Blockchain, AI, Trading, Claw |
| `ecosystem` tags | Mantle Network, Animoca Brands, Z.AI, Nansen, Tencent Cloud |
| `publicContactHackerHandle` | `MantleOfficial` |
| `contacts` | WeChat 2698817790 (only contact channel exposed on the DoraHacks listing) |

---

## Timeline (definitive — from official timeline image)

Source: https://cdn.dorahacks.io/static/files/19db59e64d5cfa431774d8c4a7dbf067.jpeg (OCR'd)

| Phase | Event | Date |
|---|---|---|
| Phase I — Claw Hacks On-Chain | Register & Submit | **Apr 15 – Apr 30, 2026** |
| Phase I | Winner Announcement | **May 5, 2026** ← devhub text said May 8; image says May 5; trust the image |
| Phase II — AI Awakening | Register & Submit | **May 1 – Jun 15, 2026** |
| Phase II | Demo Day | **Jul 2 – Jul 3, 2026** |
| Phase II | Winner Announcement | **Jul 10, 2026** |

**Today is 2026-06-02 → 13 calendar days remain to ship.**

---

## Prize structure (verified — OCR'd from official image + DoraHacks bonusPrice field)

Source: https://cdn.dorahacks.io/static/files/19dd88aeb03e6fa637631d84a3883fd9.png

### Phase 2 — AI Awakening ($100,000 total)

| Award | Amount | Per-place breakdown | Notes |
|---|---|---|---|
| Grand Champion | **$9,000** | 1 winner | "Top Overall Business Potential, Completion, And Mantle Ecosystem Fit" |
| Track First Prize | **$51,000** | **6 tracks × $8,500** | One winner per track |
| Community Voting | **$17,000** | **2 × $8,500** | Highest engagement + total votes on X (Twitter) |
| Best UI/UX Award | **$3,000** | 1 winner | Best UX + smoothest Web2 onboarding |
| Finalist & Deployment Award | **$20,000** | **20 × $1,000** | First-come-first-served to first 20 projects meeting deployment criteria; covers dev + API costs |
| **TOTAL** | **$100,000** | | |

### Phase 1 — ClawHack ($20,000, completed Apr 30)

Per the press release: Phase 1 was on-chain DeFi trading evaluated by trading volume + ROI on RealClaw. Per-place breakdown not published in any of the canonical sources I scraped. Winners scheduled May 5 (per timeline image) or May 8 (per devhub copy).

### Computing-credit pool (NOT cash — additional resource value $103K-110K)

Source: devhub.mantle.xyz (WebFetch)

| Provider | Credits |
|---|---|
| Nansen AI | $7,000 |
| Elfa AI | $36,000 |
| Surf AI | $30,000 |
| Orbit AI | $30,000 |
| AltLLM | $7,000 |
| **Total in-kind** | **~$110,000** |

Brings total event value to **~$223,000** (vs the $120K cash figure in the user brief).

---

## Six tracks (from DoraHacks `tracks` array + Tracks image)

Source: parsed `tracks` field of hackathon JSON; image OCR.

| # | Track | Sponsor (per track description) | One-line |
|---|---|---|---|
| 1 | AI Trading & Strategy | **BGA** | AI quant bots + macro-driven smart contracts; Python + Solidity templates; Bybit API support |
| 2 | AI Alpha & Data | **Mirana Ventures** (per Requirements tab) | Smart money tracking + on-chain anomaly detection bots via Telegram/Discord |
| 3 | AI x RWA | **Mantle Network** (per Requirements tab) | Dynamic yield + automated risk for USDY, mETH; built on Mantle RWA infra |
| 4 | Consumer & Viral DApps | (unattributed publicly — Animoca Brands per devhub copy) | Gamified trading UIs + shareable consumer apps |
| 5 | AI DevTools | (unattributed — Tencent Cloud per devhub copy) | Gas optimisation + Mantle-specific audit assistants |
| 6 | Agentic Wallets & Economy | **Byreal** | Agentic wallet economies via Byreal Skills CLI |

**Note:** Track records on DoraHacks have an empty `judgingCriteria` field — the rubric is published only in the Requirements & Criteria markdown tab. See next section.

---

## Track-by-track judging rubrics

Source: full markdown of "Requirements & Criteria" tab inside DoraHacks Nuxt data.

### Grand Champion — open to all tracks

| Dimension | Weight | Description |
|---|---|---|
| Technical Depth | **30%** | AI × on-chain integration, architecture completeness, code quality |
| Innovation | **25%** | Originality, whether it proposes a new AI × Web3 paradigm |
| Mantle Ecosystem Contribution | **25%** | Substantive use of Mantle network + long-term ecosystem value |
| Product Completeness | **20%** | Runnable demo, UX, scalability |

Requirements:
- Must be deployed on Mantle Network
- Open-source repo + runnable demo + project pitch
- Must be nominated from at least one track

### Alpha & Data Track *(Exclusively Sponsored by Mirana Ventures)*

Two paths:
- **A. [Human-Driven] Data & Analytics** — AI-powered on-chain analytics, monitoring, or prediction tools
- **B. [AI-Driven] Trading Strategy** — Executable AI trading agents that generate verifiable on-chain Alpha

Scoring:
- **General 60%:** Data source quality / AI analysis depth / technical completeness / sustainability
- **Track-Specific 40%:**
  - Data & Analytics → **Insight Value**: uniqueness of findings + data viz quality
  - Trading Strategy → **Strategy Alpha**: complexity + verifiability (backtesting / live trading / on-chain records)

Encouraged: smart money tracking agent · Mantle ecosystem protocol dashboard · AI-driven market sentiment analysis · automated arbitrage / market-making.

Required: Mantle on-chain data as a core source; deploy on Mantle; open-source repo + demo + one-line pitch.

Submission must state: which data sources used, what role AI plays, how it generates verifiable value on Mantle.

### AI & RWA Track *(Exclusively Supported by Mantle Network)*

Two paths:
- **A. [Human-Driven] RWA Infrastructure** — AI-powered tools for RWA tokenization, pricing, or compliance
- **B. [AI-Driven] RWA Application** — End-user-facing AI × RWA products

Scoring:
- **General 60%:** Depth of AI × RWA integration / technical completeness / Mantle integration / compliance awareness
- **Track-Specific 40%:**
  - Infrastructure → **Technical Feasibility**: completeness of asset tokenization flow + innovation
  - Application → **Real-World Validity**: clear asset category + well-defined users + complete UX

Encouraged: AI-driven tokenization of real estate / bonds / commodities · intelligent RWA portfolio agent · automated KYC/compliance tools · RWA yield aggregator.

Required: project must involve RWA; deploy on Mantle Network; open-source repo + demo + one-line pitch.

Submission must state: what RWA is being brought on-chain, AI's role, how realized on Mantle.

### Agentic Economy Track *(Exclusively Supported by Byreal)*

"No DeFi expertise required — we provide the full Skills and CLI toolkit. Just bring your creativity."

Two paths:
- **A. [Human-Driven] DeFi Deep Dive** — Use Byreal Agent Skills / Byreal Perps CLI / RealClaw for advanced trading strategies
- **B. [AI-Driven] RealClaw Real-Life Expansion** — Take RealClaw beyond DeFi into real-world everyday use cases

Core components (must use ≥1):
- **Byreal Agent Skills** — CLMM, LP & Swap → https://github.com/byreal-git/byreal-agent-skills
- **Byreal Perps CLI** — perpetual futures execution → https://github.com/byreal-git/byreal-perps-cli
- **RealClaw** — Openclaw-based agent w/ Byreal Skills pre-installed → https://www.byreal.io/en/realclaw

Scoring:
- **General 70%:** Byreal integration depth / agent autonomy / technical completeness / sustainability
- **Track-Specific 30%:**
  - DeFi Deep Dive → **Strategy Alpha**: complexity + verifiability
  - RealClaw Expansion → **Real-World Validity**: genuine on-chain use + clear real-life target

Encouraged (DeFi): news-driven trading agent · market-making / arbitrage · automated portfolio rebalancing.
Encouraged (Real-life): Personal CFO Agent · on-chain life manager · health data management · everyday decision assistant.

Required: use ≥1 of Byreal Agent Skills / Byreal Perps CLI / RealClaw; **deploy on Mantle OR Solana** (note: only track allowing Solana); open-source repo + runnable demo + one-line pitch.

### AI Trading & Strategy — **RUBRIC NOT PUBLISHED**

Brief sponsor: BGA. No track-specific scoring criteria in the Requirements & Criteria tab. Likely scored against Grand Champion rubric. **Open question.**

### Consumer & Viral DApps — **RUBRIC NOT PUBLISHED**

Brief sponsor (per devhub): Animoca Brands. No track-specific scoring criteria in the Requirements & Criteria tab. **Open question.**

### AI DevTools — **RUBRIC NOT PUBLISHED**

Brief sponsor (per devhub): Tencent Cloud. No track-specific scoring criteria in the Requirements & Criteria tab. **Open question.**

### Community Voting (cross-cutting)

- All submitted projects automatically eligible
- Open vote on X (Twitter) — "X Platform Voting"
- Project with most votes wins (top 2 win $8,500 each)
- Wins on: clear/compelling demo · resonance with real pain points · community presence & shareability

### Best UI/UX Award (cross-cutting)

| Dimension | Weight | Description |
|---|---|---|
| Visual Design | **30%** | Aesthetic, consistency, brand identity |
| Interaction & Flow | **30%** | Smoothness, user guidance, responsiveness |
| AI Interaction Design | **25%** | Natural, user-friendly presentation of AI |
| Accessibility | **15%** | Beginner-friendly, lowers Web3 barrier |

Required: runnable frontend + demo video or public link.

### 20 Project Deployment Award (cross-cutting, first-come-first-served)

Meet **all** to qualify (20 spots only):

**Technical Deployment**
- Smart contract deployed on **Mantle Mainnet OR Testnet** (testnet acceptable!)
- Contract verified on Mantle Explorer
- ≥1 AI-powered function callable on-chain (agent trigger, inference result written on-chain, automated execution)

**Product Completeness**
- Frontend demo publicly accessible (not localhost)
- Deployment address included in DoraHacks submission
- Demo video ≥ 2 min walking core use case

**Documentation**
- Open-source GitHub repo with README (setup, architecture, deployed contract address)

No judging; objective bar. First 20 projects that meet all criteria win $1,000 each. **This is the floor lane — high-EV target for any serious team.**

---

## Submission requirements (composite — platform + Requirements tab + press release)

| Constraint | Value | Source |
|---|---|---|
| Phase 2 submission deadline | **2026-06-15 15:59 UTC** | DoraHacks JSON (`endTime`) |
| Demo Day | Jul 2-3, 2026 | Timeline image |
| Winner announcement | Jul 10, 2026 | Timeline image |
| Team size cap | **Not specified** on DoraHacks; brief gives no number either | Open question |
| Geographic eligibility | **Open globally** to any individual or team (Phase 2) | devhub.mantle.xyz |
| Age eligibility | Not specified | Open question |
| Multi-track entries | **Allowed, max 2 tracks per project** | `tracksLimitForBuidl: 2` |
| GitHub repo | **Required per rubrics, but NOT enforced at platform level** (`mandatoryGitRepoLink: false`) — every track says "open-source repo" | Mixed |
| Demo video | **Required per Deployment Award (≥2 min)**; not platform-enforced | Mixed |
| Open-source license | Required (all rubrics say "open-source repo"); **specific license (MIT/Apache) NOT stated** | Open question |
| Mainnet vs Testnet | **Either acceptable** for Deployment Award; Grand Champion says "deployed on Mantle Network" without specifying | Mixed |
| Required deliverable per submission | Thread on X with **#MantleAIHackathon**, pitch, demo video, GitHub link, Mantle contract address | press release |
| Sponsor-tool requirements | **Agentic Economy:** must use Byreal Agent Skills / Perps CLI / RealClaw. **All tracks:** deploy on Mantle (Agentic Economy also accepts Solana). | Requirements tab |
| Phase 2 registration link | DoraHacks (HackQuest mirror not live) | DoraHacks; press release |

---

## Project gallery — ALL submissions

**Gallery URL:** https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl
**Total projects:** **0** (per DoraHacks `buidlsCount: 0` field)
**Applications:** 179 hackers registered, only 9 teams formed, 0 BUIDLs submitted
**Last scraped:** 2026-06-02

> **The gallery is empty.** Either no one has submitted yet (likely — submission window closes Jun 15) or submissions are held privately until the deadline. Given `isBuidlsPrivate: false`, the more probable explanation is that no team has formally submitted via the DoraHacks `Submit Buidl` flow yet. **This is a major competitive signal: with 13 days left, the field is wide open.**

No project table to produce. No deep reads possible. The competitive intel will land in the final 72 hours when teams rush to submit.

---

## Top 10 deepest reads

N/A — gallery is empty. Re-scrape Jun 12-14 to capture the rush of last-minute submissions.

---

## Judges (full list)

Source: DoraHacks description, press release, devhub. Individual names are NOT published on any canonical page — only organization affiliations.

| Organization | Specific judge name? | Source |
|---|---|---|
| Allora Network | not published | DoraHacks description |
| Blockchain for Good Alliance (BGA) | not published | DoraHacks description |
| Nansen | not published | DoraHacks description |
| Z.ai | not published | DoraHacks description |
| Four Pillar | not published | DoraHacks description |
| Animoca Brands | not published | DoraHacks description |
| DoraHacks | not published | DoraHacks description |
| Elfa AI | not published | DoraHacks description |
| Virtuals Protocol | not published | DoraHacks description |
| Hashed | not published | DoraHacks description |
| Caladan | not published | DoraHacks description |
| University of Hong Kong | **Jack Poon** (professor) per devhub | devhub.mantle.xyz |

**Big gap:** the canonical page lists organizations only. Twelve named individuals (with titles + LinkedIn/Twitter) are NOT available without an additional pass on judge LinkedIn, X profiles, or judges' employer pages. Recommend Phase 3 outreach scrape to enrich this.

Press-release-attributed quote (the only named hackathon official):
> **Emily Bao** — Spot Executive at Bybit, Key Advisor at Mantle, Founder of Byreal — "OpenClaw gave AI agents hands. Mantle gave them a home. The Turing Test Hackathon is not a coding contest — it is the beginning of a new category."

Operational contacts (press release attributions):
- **Finn Li** — finn.li@mantle.xyz (development)
- **Stella Zhou** — stella.zhou@mantle.xyz (development)
- Jared, Chuhan — sponsorships (no public emails published)

---

## Sponsors and community partners (full list)

Source: DoraHacks description.

**Key sponsors:** Bybit · Byreal · Blockchain for Good Alliance (BGA) · Tencent Cloud · Mirana Ventures · Orbit AI · Animoca Minds (by Animoca Brands) · Open Check · Nansen · Elfa AI · Surf AI

**Community + AI partners (25+):** Z.ai · Merchant Moe · Four Pillar · Solar · Cornell Blockchain · Blockchain at Berkeley · IC Blockchain · Crypto-Fintech Lab at HKUST · Decipher · OraKle · Akindo · KudasaiJP · Rocketpunch · TradeCoinVN · Blockchain Valley · BlockchainZJU · 0xU Club · The Mu Shanghai · "and others"

**Phase 1 partner DeFi protocols on Mantle:** Merchant Moe · Agni Finance · Fluxion

---

## Conflicts between user brief and primary source

| Topic | User brief said | Verified value | Source |
|---|---|---|---|
| Phase 2 deadline | "NOT YET CONFIRMED" | **Jun 15, 2026 15:59 UTC** | DoraHacks `endTime` |
| Total event value | $120K cash | $100K cash + ~$110K credits ≈ $223K total | devhub + DoraHacks |
| AI Trading & Strategy sponsor | "BGA" | Confirmed BGA (per DoraHacks track description) | DoraHacks tracks JSON |
| AI Alpha & Data sponsor | "Mirana Ventures" | Confirmed (per Requirements tab) | Requirements tab |
| AI x RWA sponsor | "Mantle Network" | Confirmed | Requirements tab |
| Consumer & Viral DApps sponsor | "Consumer & Viral DApps" (no sponsor) | Animoca Brands (per devhub copy only, not on DoraHacks) | devhub vs DoraHacks |
| AI DevTools sponsor | "AI DevTools" (no sponsor) | Tencent Cloud (per devhub copy only) | devhub vs DoraHacks |
| Agentic Wallets & Economy sponsor | "Byreal" | Confirmed | DoraHacks |
| Phase 1 winner announcement | (not in brief) | May 5 (timeline image) vs May 8 (devhub text) — **timeline image wins** | image OCR |

---

## Unverifiable / open questions

1. **Phase 1 (ClawHack) results not published** — no winner list visible on any canonical page despite the May 5/8 announcement date being weeks ago. Worth searching `@Mantle_Official` on X for the actual announcement.
2. **Judge names** — only org affiliations on the canonical page; only Jack Poon (HKU) is named. The other 11 specific individuals are unsourced.
3. **Three track rubrics missing** — AI Trading & Strategy, Consumer & Viral DApps, AI DevTools have no track-specific scoring criteria published. They presumably fall back to the Grand Champion rubric, but this is unconfirmed and represents real judging risk for teams targeting these tracks.
4. **Team size cap** — not specified on either platform or in any press source.
5. **Age eligibility** — not specified.
6. **Open-source license** — every rubric says "open-source" but no specific license required (MIT/Apache/GPL unspecified).
7. **HackQuest mirror is non-existent** — press release claims HackQuest "support" but no listing is live on hackquest.io/hackathons. Either internal-only or de-prioritized.
8. **DoraHacks API blocked by AWS WAF** — JSON API returns CAPTCHA. All structured data had to be parsed from server-side rendered Nuxt state inside the HTML. This means automated re-scrapes need browser-emulating tools (Playwright) rather than `curl`.
9. **`buidlsCount: 0`** — either (a) all 179 applicants are still building, or (b) DoraHacks BUIDL flow is gated behind an admin approval that won't fire until after the deadline. Worth scraping again at T-72h and T-24h.
10. **Mantle Mainnet vs Testnet contract address** — the press release says "Mantle contract address" is required in the X thread submission, but the Deployment Award explicitly accepts testnet. Suggests teams can ship on testnet and still claim deployment.
