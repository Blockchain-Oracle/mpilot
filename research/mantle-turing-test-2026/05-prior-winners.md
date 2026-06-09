# 05 — Prior Winners & Winner-Shape Analysis

## Phase 1 — ClawHack (Apr 15 – Apr 30, 2026)

**Status:** Winners NOT publicly announced as of 2026-06-02 (33 days post-close).

### What was the format
- **$20K prize pool**
- **Invite-only** (per Mantle's own tweet, `status 2042623418080858476`: "ClawHack is by invite-only. And we just dropped ours.")
- Deploy AI agents via **RealClaw** onto Mantle DEXes: **Merchant Moe** (71.1% of Mantle DEX volume), **Agni Finance**, **Fluxion**
- Evaluation: **trading volume + ROI** — pure leaderboard, no qualitative judging
- Three sub-categories with prize split (per the Byreal RealClaw press release)
- Original timeline image listed winner announcement as **May 5**; devhub text says **May 8** — neither has happened

### Why this matters for Phase 2

**Operating assumption: Phase 1 was a curated sponsor showcase, not an open contest.** Several signals reinforce this:

1. Invite-only format
2. No public winner list 33 days post-close
3. Pure ROI-based judging on a low-liquidity DEX ($12.2M ecosystem-wide daily volume) where any meaningful position moves the market
4. The framing of the event in Mantle's tweet thread: showcase-style, not contest-style

**Implications:**
- We cannot reverse-engineer winning strategies from Phase 1 — there is nothing public to learn from
- Phase 2 may benefit sponsor-aligned teams structurally. **Our wedge has to look like a gift to sponsor infrastructure** (extending Byreal/Mantle/ERC-8004 capabilities, never alternative to them)
- The "Human vs AI" framing for Phase 2 finale may include live trading challenge segments where Phase 1 ClawHack alumni have a natural edge

### Open intel actions

- Search `@Mantle_Official` X timeline for "ClawHack winners" between May 5-30
- Check the Byreal blog and devhub.mantle.xyz blog index after 2026-06-15 — Mantle may roll Phase 1 + 2 results into one July 10 announcement
- Direct outreach to `finn.li@mantle.xyz` if a winning angle requires understanding Phase 1 outcomes

---

## Mantle Global Hackathon 2025 (Oct 22, 2025 – Feb 7, 2026)

This is the most direct precedent for the Turing Test Hackathon. Same sponsor, same broad theme structure, larger pool.

### Format
- $150K prize pool
- $30K Grand Prize
- **519 submissions, 2,044 registered devs, 30 finalists, 25.4% conversion rate** (much higher conversion than the current Turing Test pace would suggest)
- **Tracks:** RWA/RealFi (Priority) · DeFi & Composability · AI & Oracles · ZK & Privacy · Infra & Tooling · GameFi & Social
- Winners announced **Feb 10 at Consensus Hong Kong**

### Submission distribution
- **22.21% RWA/RealFi** — largest share
- **21.79% DeFi** — second largest
- **AI** submissions a smaller share

### Confirmed winner: Team **OwnaFarm**

- Universities: UKDW + Universitas Amikom Purwokerto, Indonesia
- **1st place GameFi track ($8K)**
- **2nd place ZK & Privacy track** (cross-track placement)
- Source: https://ukdw.ac.id/en/2026/02/12/ukdw-students-secure-two-wins-at-international-mantle-global-hackathon-2025/

### Pattern signals

1. **Dual-track placement was viable.** OwnaFarm's win used the same project to medal in two unrelated tracks (GameFi + ZK). The current `tracksLimitForBuidl=2` rule encodes this as official strategy.

2. **APAC university teams over-index.** Mantle's hackathon judges (HKU, HKUST, Hashed, Four Pillars, Cornell, Berkeley, Tencent) reflect APAC academic + corporate ties. Solo Western builders are not the dominant winner archetype.

3. **RWA + DeFi composability gets the most judging attention.** 22.21% RWA and 21.79% DeFi was the submission split, but this is also the share-of-mind for Mantle's evaluation panel. The current hackathon doubles down on this with Track 3 (AI × RWA) explicitly Mantle-sponsored.

4. **Consumer/GameFi can win as a sleeper.** OwnaFarm took 1st in GameFi against the field bias — a non-RWA-shaped team can win if it has unusual cross-track legibility.

5. **AI was secondary in 2025, centered in 2026.** This is the inflection. Teams that brought "AI as a feature" to the 2025 event are now competing in an "AI as the thesis" event. The whole judging weight has moved toward AI specifically.

---

## Mantle APAC Hackathon 2024 (preceding event)

- Tracks: DeFi · Infra · Gaming · AI ([OpenBuild tweet](https://x.com/OpenBuildxyz/status/1857793419944587514))
- AI was a track but secondary
- No specific winner list surfaced in research

---

## Cross-event winner shape — inferred

From Mantle 2024 + 2025 + ClawHack 2026 patterns combined:

| Attribute | Pattern | Evidence |
|---|---|---|
| **Team origin** | APAC-heavy (Indonesia, Korea, China, Singapore) | OwnaFarm; judge panel; press distribution channels |
| **Multi-track placement** | Common — winners often medal in 2 tracks with one project | OwnaFarm dual-track; current rule formalizes this |
| **Track of choice** | RWA + DeFi historically dominate; AI now elevated | 2025 submission distribution; 2026 prize structure |
| **University-affiliated** | Strong — universities provide stable teams | OwnaFarm; HKU/HKUST/Cornell/Berkeley sponsorships |
| **Project complexity** | Build the deepest single component well > broad shallow | Grand Champion criteria emphasize "completion" and "ecosystem fit" over scope |
| **Sponsor narrative alignment** | Submissions echoing Mantle's official thesis (RWA, agent economy, "liquidity chain") read well | Mantle's repeated emphasis in tweets and Q1 reports |
| **Live performance** | Demo Day is live-streamed → live performance matters | Press release; "Human vs AI" mechanism |

---

## What this means for our build

- **Don't be solo Western and ignore the APAC narrative tilt.** Frame the project in language that resonates with Mantle's official thesis: agent identity, RWA distribution, liquidity orchestration, institutional grade.
- **Plan for dual-track placement explicitly.** Pair tracks at architecture time — every component should serve both tracks.
- **Treat the Deployment Award ($1K guaranteed, no judging) as a baseline objective.** It's the only prize with no taste-dependence; meeting its bar is also good engineering hygiene.
- **Live demo prep is not optional.** July 2-3 livestream means dry runs, fallback paths, and graceful degradation if an agent fails on stage.
- **Don't try to beat ClawHack alumni at pure trading.** Phase 1 selected for trading-bot teams; Track 1 will be dense with them. Pick the tracks where the prior cohort *isn't* concentrated (Track 3, Track 6, possibly Track 5).

---

## Open questions

1. **Did the $20K ClawHack pool actually pay out?** No public confirmation.
2. **Will Phase 1 winners be announced before Phase 2 deadline (Jun 15)?** If yes, last-mile strategy tuning is possible. If no, plan for opacity.
3. **Are any Phase 1 ClawHack teams confirmed re-entering Phase 2?** Worth asking on Discord / via `finn.li@mantle.xyz`.
4. **What did the Mantle Global 2025 finalists (not just OwnaFarm) build?** A full sweep of the 30 finalists' GitHubs could surface usable patterns; not done in this pass.
