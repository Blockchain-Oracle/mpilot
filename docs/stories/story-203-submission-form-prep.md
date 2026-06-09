# Story — Submission form preparation (DoraHacks + Mantle questionnaire answers)

**ID:** story-203-submission-form-prep
**Epic:** Epic E12 — Submission Polish
**Depends on:** story-201-demo-video-script, story-202-judge-walkthrough
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge maintainer about to submit to the Mantle Turing Test 2026
**I want to** all submission form answers drafted in advance (DoraHacks BUIDL fields, Mantle's track-specific questionnaire) with consistent positioning, all links verified live, all addresses correct
**So that** the submission itself is a 5-minute paste-and-go — not an hour of "what should I write for X?" during which I miss a deadline

---

## File modification map

- `docs/submission/DORAHACKS-BUIDL-ANSWERS.md` — NEW — all DoraHacks form fields filled in
- `docs/submission/MANTLE-TRACK3-ANSWERS.md` — NEW — Track 3 (Build) specific questions
- `docs/submission/MANTLE-TRACK6-ANSWERS.md` — NEW — Track 6 (Agentic Economy) specific questions
- `docs/submission/SUBMISSION-LINK-VERIFY.sh` — NEW — script that curl-checks every URL in the submission docs to confirm liveness
- `docs/submission/SUBMISSION-CHECKLIST.md` — NEW — pre-submit checklist (everything to verify before clicking submit)

---

## Acceptance criteria (BDD)

```
Given DORAHACKS-BUIDL-ANSWERS.md
When inspected
Then it has answers for: project name, tagline, description, demo video URL, GitHub URL, deployed contract addresses, team members, tracks selected

Given the tagline
When read
Then it is ≤ 100 characters AND clearly communicates "autonomous DeFi agent for Mantle"

Given the description
When read
Then it is 200-300 words covering: problem, solution, key differentiators (verifiability via ERC-8004, the 5-phase tick loop, multi-surface distribution), evidence (deployed addresses, demo video)

Given Track 3 answers
When inspected
Then they cover: which Mantle protocols are integrated (7 listed), build complexity evidence (LOC, # of providers, tests passing), production readiness (deployed Mainnet addresses)

Given Track 6 answers
When inspected
Then they cover: agentic-economy thesis, RealClaw skill packaging, MCP server availability, autonomy + reputation primitives

Given the SUBMISSION-LINK-VERIFY script
When `bash docs/submission/SUBMISSION-LINK-VERIFY.sh` runs
Then it curls every URL referenced in submission docs AND reports any 404s or timeouts (fail-fast on broken links)

Given the SUBMISSION-CHECKLIST
When inspected
Then it includes (at minimum): video uploaded + unlisted-link works, README polished, addresses verified on Mantlescan, GitHub repo public, all submission links live, time zone of deadline confirmed in local time

Given the answers DO NOT contain Patron contamination
When grep'd
Then NO matches for "BNPL", "Buy-Now-Pay-Later", "Patron"

Given the answers DO NOT promise features not built
When cross-referenced against sprint-status.yaml COMPLETE stories
Then every claim is supported by a completed story (no roadmap items claimed as shipped)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -f docs/submission/DORAHACKS-BUIDL-ANSWERS.md
test -f docs/submission/MANTLE-TRACK3-ANSWERS.md
test -f docs/submission/MANTLE-TRACK6-ANSWERS.md
test -x docs/submission/SUBMISSION-LINK-VERIFY.sh
test -f docs/submission/SUBMISSION-CHECKLIST.md

# Link verification
bash docs/submission/SUBMISSION-LINK-VERIFY.sh
test $? -eq 0

# Tagline ≤ 100 chars
tagline=$(grep -A1 "^## Tagline" docs/submission/DORAHACKS-BUIDL-ANSWERS.md | tail -1)
test ${#tagline} -le 100

# Anti-Patron in submission docs
! grep -irE "(BNPL|Buy.Now.Pay.Later|Patron)" docs/submission/

# Track 3 + 6 selected
grep -q "Track 3" docs/submission/DORAHACKS-BUIDL-ANSWERS.md
grep -q "Track 6" docs/submission/DORAHACKS-BUIDL-ANSWERS.md

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **The submission form is the SINGLE moment that decides eligibility.** Per hackathon-playbook.md §8: blow this and everything else is wasted. Prepare answers in advance; the submission window is for typing, not thinking.
- **Tagline ≤ 100 chars** is the DoraHacks limit (verified per Context7-equivalent on hackathon platform docs). Hit it tight — "Your autonomous DeFi agent for Mantle. Verified per tick via ERC-8004." is 89 chars.
- **The description is the elevator pitch.** First sentence: what it is. Second: why it matters. Rest: differentiators with evidence. 200-300 words because longer doesn't get read.
- **Track 3 + Track 6 SELECTED, not just mentioned.** Per Mantle Turing Test rules: each project picks tracks to be evaluated against. We pick both because we qualify for both (Build = 7 protocols integrated; Agentic Economy = RealClaw skill + MCP).
- **Link verification script** catches the silent killer: a submitted URL that 404s. Run it 1 minute before clicking submit.
- **Submission checklist** is the cognitive offload. Per `feedback_plan_full_dont_prioritize.md`: when you're stressed at submission time, having a checklist prevents skipping items.
- **Deadline in LOCAL TIME** matters. 23:59 UTC ≠ 23:59 your local time. The checklist makes the maintainer confirm the local-time equivalent (15:59 PST is 23:59 UTC; verify per hackathon).
- **NEVER claim features not shipped.** This is the worst possible misstep — if a judge clicks through and finds "session-key revocation" is just a story file, the credibility hit is fatal. Cross-check against sprint-status.yaml COMPLETE column.
- **Patron contamination would survive into the public BUIDL listing.** Anti-contamination grep is the regression guard.
- Cross-ref: hackathon-playbook.md §8, research/concierge/09-tracks-and-judges.md (track criteria), sprint-status.yaml (canonical "what's done" reference).
