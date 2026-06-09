# Story — Judge walkthrough doc (90-second on-rails experience)

**ID:** story-202-judge-walkthrough
**Epic:** Epic E12 — Submission Polish
**Depends on:** story-192-sepolia-playground-deploy, story-200-readme-finalize
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Mantle Turing Test judge with 5 minutes per submission
**I want to** a single doc at docs/JUDGE-WALKTHROUGH.md walks me through the 90-second hands-on experience: visit concierge.xyz → click "Try on Sepolia" → claim faucet → set goal → watch tick → see attestation on Mantlescan
**So that** I can evaluate Concierge concretely (not just from screenshots) without anyone holding my hand

---

## File modification map

- `docs/JUDGE-WALKTHROUGH.md` — NEW — the 90-second judge experience guide
- `docs/JUDGE-FAQ.md` — NEW — anticipated questions: cost? trust model? differentiation? prizes?
- `docs/JUDGE-EVALUATION-MAP.md` — NEW — cross-reference of judging criteria → where in Concierge each criterion is demonstrated

---

## Acceptance criteria (BDD)

```
Given JUDGE-WALKTHROUGH.md
When followed step-by-step
Then a judge with no prior context can: (1) reach a working dashboard, (2) claim faucet tokens, (3) activate an agent, (4) watch a tick complete, (5) view the on-chain attestation — in ≤ 90 seconds

Given the walkthrough's step 1
When read
Then it explicitly states: "No wallet funding required — Sepolia testnet"

Given each step has an expected screenshot reference
When the screenshot is missing
Then a placeholder note explains what the judge should see (so missing assets don't break the walkthrough)

Given JUDGE-FAQ.md
When inspected
Then it answers: (1) is this real money?, (2) what trust assumptions do users make?, (3) how is this different from Klarna BNPL?, (4) which tracks does Concierge qualify for?, (5) where is the source code?, (6) does it work on Mainnet?

Given the FAQ on tracks
When inspected
Then it cites specific tracks (Track 3 Build + Track 6 Agentic Economy) AND explains how Concierge qualifies for each

Given JUDGE-EVALUATION-MAP.md
When inspected
Then it cross-references EACH judging criterion (from the hackathon PRD) → specific story or page in Concierge demonstrating it

Given the walkthrough avoids Patron-era contamination
When grep'd
Then NO matches for "BNPL", "Buy-Now-Pay-Later", "Patron" (except in JUDGE-FAQ as a negation per Klarna disambiguation)

Given file size budget per doc
When inspected
Then no judge doc exceeds 300 lines
```

---

## Shell verification

```bash
test -f docs/JUDGE-WALKTHROUGH.md
test -f docs/JUDGE-FAQ.md
test -f docs/JUDGE-EVALUATION-MAP.md

# Sepolia + no-funding explicit
grep -qE "Sepolia.*testnet|no.*wallet.*funding" docs/JUDGE-WALKTHROUGH.md

# Track 3 + Track 6 covered
grep -q "Track 3" docs/JUDGE-FAQ.md
grep -q "Track 6" docs/JUDGE-FAQ.md

# Evaluation map cites stories
grep -qE "story-[0-9]+" docs/JUDGE-EVALUATION-MAP.md

# Patron contamination guard
! grep -E "(BNPL|Buy.Now.Pay.Later|Patron)" docs/JUDGE-WALKTHROUGH.md

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **90 seconds is the judging speed-limit.** Per research/concierge/09-tracks-and-judges.md: judges with 5min per submission spend 90s on hands-on + 90s on docs + 2min on the demo video. Every second of the hands-on flow counts.
- **The walkthrough IS the on-rails demo.** Step-by-step, no decisions for the judge: visit → click → click → click → see result. Decision points kill the speed.
- **Zero-funding Sepolia** is the critical differentiator. Most hackathon submissions ask judges to manually fund wallets — that's an immediate drop-off. The in-app faucet (story-192) is what makes this 90s instead of 15 minutes.
- **JUDGE-FAQ answers BEFORE judges ask.** Anticipate the skeptical questions: "is this real?" "what about gas?" "what's the cost story for users?". Answer in 1-2 sentences each.
- **Track-evaluation map** is the "I'm a judge scoring this against criteria" doc. Per hackathon-playbook.md §4: judges score against criteria; a doc that DIRECTLY maps to the criteria they're scoring makes their job easier and they reward you for it.
- **Klarna disambiguation appears in FAQ** (the only allowed mention in this submission set). Per story-103 + memory[Patron paused]: the negation context is allowed.
- **Source code link is prominent.** Repo URL + "all code is MIT licensed" tells judges this is open and auditable — important trust signal.
- **Mainnet readiness question in FAQ**: be honest. If at submission time Mainnet has the contracts deployed but no real users, say so. "Production-deployed but pre-launch" is fine; "production-launched" if untrue is fatal.
- Cross-ref: hackathon-playbook.md §4, research/concierge/09-tracks-and-judges.md, story-192 (the faucet flow this depends on).
