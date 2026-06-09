# 07 — Pre-Commit Checklist

Decision factors before locking a wedge for the Mantle Turing Test Hackathon 2026 Phase 2. **Not a recommendation — a checklist.** Each item is a question you need a clear answer to before committing 13 days of build time.

---

## §1 — Is the math actually worth it?

| Question | Answer |
|---|---|
| What's the realistic prize EV for the lane I'm picking? | See `06-hidden-field.md`: Track 3 = up to $18.5K · Track 6 = up to $18.5K · Track 3+6 = up to $26.5K · Deployment Award = $1K floor |
| What's my probability-weighted EV? | Probably 5–15% chance of medaling on a green track with solid execution. Expected value ≈ $1K–$3K + ecosystem follow-on |
| What's the time cost? | 13 days × ~8h/day = ~100 hours of focused build time |
| Effective hourly rate (if you medal) | ~$10–$30/h pre-tax — but the **ecosystem grant + Byreal/Animoca/Mantle follow-on funding** could 10x this if positioned correctly |
| Could the 100 hours be spent on something with higher EV? | If yes, skip. If your alternative is "wait for the next hackathon," pick this one. |
| Does the cash + credits matter to you, or is the resume/relationship the actual prize? | The Mantle + Byreal + ERC-8004 ecosystem relationship is the real asset. Cash is a bonus. |

---

## §2 — Hidden field check (saturation + judge alignment)

| Question | Answer |
|---|---|
| Is the BUIDL gallery empty? | YES (`buidlsCount=0`). 179 applications, 9 teams formed, 0 visible submissions. Visibility = zero. |
| What's my plan to re-check it? | Re-scrape at T-72h (Jun 12) and T-24h (Jun 14). See `04-competitor-analysis.md` for browser-MCP pattern. |
| Are judges direct commercial competitors to what I'm building? | YES IF Track 4 (Animoca's Minds) or Track 6 (Virtuals Protocol). **Pitch as complement, never alternative.** |
| Who has structural advantage on my chosen lane? | Track 1: ClawHack alumni + pro quants. Track 3: RWA-fluent teams + Hashed-aligned thesis. Track 6: Byreal-adjacent teams. |
| What's the inferred density on my track? | See `06-hidden-field.md`. Tracks 3 + 6 = 🟩 GREEN. |

---

## §3 — Sponsor alignment

| Question | Answer |
|---|---|
| Does my wedge consume ≥1 credit-pool sponsor API? | Should: Nansen / Elfa / Surf / Orbit / AltLLM / Z.ai / Tencent Cloud. Track the consumption — it's a passive judge signal. |
| Does my wedge use ≥1 Mantle native primitive? | Required for Tracks 1-5. Track 6 also accepts Solana. Mantle primitives: ERC-8004 (live mainnet) · USDY · mUSD · mETH · MI4 · fBTC. |
| Does my wedge use ≥1 Byreal component? | Required for Track 6. Options: byreal-agent-skills (Solana CLMM) · byreal-perps-cli (Hyperliquid) · RealClaw packaging. |
| Is my narrative aligned with Mantle's official thesis (RWA + agent economy + liquidity distribution)? | Should reference Mantle's published positioning: "settlement layer for autonomous agent commerce." |
| Could my project plausibly be a *gift to sponsor infrastructure* (drives volume / users / adoption to Mantle + Byreal + Bybit + RWA partners)? | If not, reconsider. Phase 1's invite-only pattern suggests sponsor-favored teams win. |

---

## §4 — Technical buildability in 13 days

| Question | Answer |
|---|---|
| Have I prototyped the riskiest assumption first? | TBD — riskiest assumption for any agent project = does the LLM reliably emit the structured tool calls my code expects, under real-world variance? Test before architecting. |
| Do I have working access to the SDKs I plan to use? | Mantle RPC: free. ERC-8004: addresses public. Byreal CLI: `npx skills add` away. Bybit V5: testnet keys self-service. Nansen API: need to claim $7K credits. |
| Are there any "in flux" dependencies I'm relying on? | **YES — ERC-8004 Validation Registry is under active TEE-community update.** Don't build on it. Identity + Reputation are stable. |
| Is my wedge buildable solo? Or do I need a team? | Solo viable for narrowly-scoped Track 3 or Track 6 entries. Team of 2-3 if Best UI/UX is being stacked. |
| What's my fallback if a sponsor API breaks during demo? | Plan for graceful degradation. **Live demo on Jul 2-3 is streamed globally.** An agent that crashes on stage is catastrophic. |
| Have I budgeted for the "Human vs AI" mechanism? | The Phase 2 finale includes live human-vs-agent challenges. Practice the demo before locking in. |

---

## §5 — Submission hygiene (table stakes)

These are not optional. Missing any one disqualifies you from at least one prize.

- [ ] Public GitHub repo with **MIT or Apache 2.0** license (every rubric says "open-source repo")
- [ ] README with setup instructions + architecture overview + deployed contract address
- [ ] Smart contract deployed on Mantle Mainnet **OR** Testnet, verified on `mantlescan.xyz`
- [ ] ≥1 AI-powered function callable on-chain
- [ ] Frontend demo publicly accessible (not localhost)
- [ ] Demo video ≥ 2 min walking core use case (Deployment Award requires this)
- [ ] X thread tagged `#MantleAIHackathon` with: pitch · demo video · GitHub link · Mantle contract address
- [ ] DoraHacks submission filed with deployment address included
- [ ] If using Byreal: ≥1 of byreal-agent-skills / byreal-perps-cli / RealClaw integrated
- [ ] Open-source license file detectable in repo About section

**Time required just for hygiene:** ~6-10 hours assuming the build is real. Budget this from day one.

---

## §6 — Submission timing

| Question | Answer |
|---|---|
| When does the submission window close? | **2026-06-15 15:59 UTC** (locked, `isExtended=false`) |
| What time zone hits me at the deadline? | 15:59 UTC = 11:59 EDT = 16:59 BST = 23:59 SGT = 00:59 next-day JST |
| What's my earliest realistic submission date? | Day 10–11 (Jun 11-12) — leaves buffer for video, X thread, last debugging |
| Deployment Award is **first-come-first-served** — early submission wins ties. | Submit Day 10 to claim Deployment Award slot. Iterate after. |
| Will I be online for Demo Day Jul 2-3? | Required for finalists. If timezone-impossible, factor in. |
| When are Phase 1 ClawHack winners likely to be announced? | Unknown — possibly July 10 rolled in with Phase 2. **Do not wait for Phase 1 winner signal before building.** |

---

## §7 — Anti-patterns to avoid

These are mistakes specifically calibrated to this hackathon's failure modes:

- ❌ **Building a pure trading bot for Track 1.** Saturated with ClawHack alumni. Don't fight the prior cohort.
- ❌ **Pitching as "alternative to Virtuals / Nansen / Animoca Minds."** Multiple judges are direct competitors. Position as cross-chain/cross-asset complement instead.
- ❌ **Relying on ERC-8004 Validation Registry.** It's in flux. Use Identity + Reputation only.
- ❌ **Mantle-only DeFi agent for Track 6.** Byreal trades on Solana + Hyperliquid; a Mantle-only agent fails the Byreal integration requirement.
- ❌ **Skipping the X thread.** Press release makes the `#MantleAIHackathon` thread required, plus it gates the Community Voting prize.
- ❌ **Skipping the Deployment Award bar.** $1K guaranteed + objective requirements = always clear it.
- ❌ **Building only on mainnet without testnet rehearsal.** RPC issues or contract bugs at demo time are catastrophic.
- ❌ **Single-track entry when dual-track is free.** Use `tracksLimitForBuidl=2`; pair Track 3 + Grand Champion or Track 6 + Best UI/UX.
- ❌ **"Build now, narrative later."** Mantle's submission form requires you to answer track-specific questions (what RWA / which data sources / what scenario). Pre-write the narrative.
- ❌ **Demo video as marketing slides.** Press release says "Show the agent working." Treat the video as a screencast walkthrough, not a deck.
- ❌ **Closed-source license or unclear license file.** Auto-disqualifies. MIT is fine.
- ❌ **Late submission.** With 13 days, Day 10 submission gives buffer; Day 13 submission means no margin for X-thread + video errors.

---

## §8 — Decision gate

**Lock the wedge before writing any code.** Filter every candidate idea through:

1. Does it clear at least one 🟩 GREEN lane? (Track 3 or Track 6)
2. Does it stack a second prize (Grand Champion or Best UI/UX) for free?
3. Is it buildable solo (or with my actual team) in ≤10 days, leaving 3 days for polish/video/X thread?
4. Does it consume ≥1 credit-pool sponsor API?
5. Does it integrate ≥1 Mantle primitive (preferably ERC-8004 + RWA asset)?
6. Does the demo show something *visually obvious* on stage in 90 seconds? (Live "Human vs AI" mechanism)
7. Does it pass the "complement to judges, not alternative to" check?

If a candidate fails any of these, kill it and pick a different angle.

---

## §9 — Open intel to refresh before lock-in

These need to be checked BEFORE committing to a wedge:

- [ ] Re-scrape DoraHacks BUIDL gallery — has the count moved off zero?
- [ ] Search `#MantleAIHackathon` on X — what are early signaling teams hinting?
- [ ] Check `byreal-git` and `openclaw/clawhub` for new repos/commits since 2026-06-01
- [ ] Search for ClawHack Phase 1 winner announcement — did they finally drop?
- [ ] Identify named judges via LinkedIn / X — currently only Jack Poon, Hurcan Polat, David Ching, KK, Jonathan Breton, Tristan Teo confirmed
- [ ] Verify Tencent Cloud / Bybit / Z.ai credit allocation for our chosen track
- [ ] Ask `finn.li@mantle.xyz` or `stella.zhou@mantle.xyz` directly about RealClaw distribution expectations (current `RealClaw-Skills` repo is empty)
- [ ] Join the Telegram + Discord (linked from devhub.mantle.xyz) for live organizer Q&A
- [ ] Test that `npx create-8004-agent` actually scaffolds a Mantle-compatible project (it claims to)
- [ ] Test that `npx skills add byreal-git/byreal-agent-skills` works in a fresh OpenClaw runtime

---

## §10 — Final acceptance criteria for committing to a wedge

A wedge is committable when **all of these are true**:

- [ ] Clear answer to §1 (the EV math works for you)
- [ ] At least one 🟩 lane covered, with a second prize stacked
- [ ] At least one sponsor-aligned vector (credit API consumption OR direct sponsor product extension)
- [ ] Riskiest technical assumption prototyped and validated
- [ ] Submission hygiene checklist (§5) has no unknowns
- [ ] Demo Day live performance plan exists (graceful degradation, fallback paths)
- [ ] Narrative is *complement, not alternative* to all competitor judges
- [ ] Build plan fits in 10 days with 3-day buffer for polish/video/X thread

When all 8 are true, commit. Don't commit before then.
