# Story — Demo video script + recording checklist (60-second + 5-minute cuts)

**ID:** story-201-demo-video-script
**Epic:** Epic E12 — Submission Polish
**Depends on:** story-194-web-vercel-deploy, story-195-deploy-smoke-tests
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** mPilot maintainer preparing the hackathon submission
**I want to** a written script for two demo video cuts (60-second pitch + 5-minute deep-dive), a recording checklist (environment setup, browser state, screen resolution), and a post-production checklist (captions, intro/outro, host platform)
**So that** the demo video is the polished artifact judges actually watch — not a one-take rambling screen capture

---

## File modification map

- `docs/DEMO-VIDEO-SCRIPT-60S.md` — NEW — 60-second pitch script (judge attention threshold)
- `docs/DEMO-VIDEO-SCRIPT-5MIN.md` — NEW — 5-minute deep-dive script (for the judges who care + as the README's "demo" link)
- `docs/DEMO-RECORDING-CHECKLIST.md` — NEW — pre-recording environment setup
- `docs/DEMO-POSTPRODUCTION-CHECKLIST.md` — NEW — captions, intro/outro, upload steps
- `docs/DEMO-STORYBOARD.md` — NEW — frame-by-frame storyboard for the 60s cut

---

## Acceptance criteria (BDD)

```
Given the 60-second script
When read
Then it covers (in order): (1) hook — "autonomous DeFi agent for Mantle", (2) one-line problem statement, (3) live demo of activating + watching a tick, (4) the verifiability claim shown via the Mantlescan link, (5) CTA "try it at mpilot.xyz"

Given the 60-second script
When measured by spoken-word count
Then it is ≤ 165 words (≈ 60s at typical pacing of 150 wpm)

Given the 5-minute script
When read
Then it covers: 30s intro, 1min onboarding flow, 1min tick loop deep-dive, 1min ERC-8004 attestation, 1min Klarna disambiguation + Track 6 RealClaw skill, 30s outro + CTA

Given the recording checklist
When followed
Then it covers: browser zoom 100%, system fonts only, no notifications on screen, demo wallet pre-funded on Sepolia, dashboard pre-loaded with one prior tick visible (so judges see real state), cursor smoothed

Given the post-production checklist
When followed
Then it covers: captions in EN + ES (Mantle has Spanish-speaking community), 1080p export, MP4 (H.264), thumbnail 1280×720, YouTube upload as unlisted (link from README), backup on Vimeo

Given the storyboard
When inspected
Then it has 6-8 frames for the 60s cut, each with: timestamp, what's on screen, voice-over text, transition

Given the script does NOT contain Patron contamination
When grep'd
Then NO matches for "BNPL", "Buy-Now-Pay-Later", "Patron"

Given the script does NOT promise things not yet built
When cross-checked against sprint-status.yaml
Then every feature shown is from a COMPLETED story (no demos of unbuilt features — credibility risk)

Given file size budget per script
When inspected
Then no script file exceeds 300 lines
```

---

## Shell verification

```bash
test -f docs/DEMO-VIDEO-SCRIPT-60S.md
test -f docs/DEMO-VIDEO-SCRIPT-5MIN.md
test -f docs/DEMO-RECORDING-CHECKLIST.md
test -f docs/DEMO-POSTPRODUCTION-CHECKLIST.md
test -f docs/DEMO-STORYBOARD.md

# Anti-Patron contamination
! grep -irE "(BNPL|Buy.Now.Pay.Later|Patron)" docs/DEMO-VIDEO-SCRIPT-60S.md docs/DEMO-VIDEO-SCRIPT-5MIN.md

# 60-second script ≤ 165 words
wc -w docs/DEMO-VIDEO-SCRIPT-60S.md | awk '$1 <= 250 {exit 0} {exit 1}'  # word count includes annotations; budget with overhead

# 5-minute script has all 6 sections
for section in intro onboarding tick attestation Klarna outro; do
  grep -qi "$section" docs/DEMO-VIDEO-SCRIPT-5MIN.md || { echo "missing section: $section"; exit 1; }
done

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **60-second is the judge attention threshold.** Per hackathon-playbook.md §4 + research/concierge/09-tracks-and-judges.md: judges scan dozens of submissions; the first 60 seconds determines whether they keep watching. EVERY second matters.
- **5-minute is for committed judges + README demo link.** Don't bloat — 5 minutes if you're holding their attention, 4:30 if you're not. Cut ruthlessly in post-production.
- **NEVER demo unbuilt features.** Per CLAUDE.md no-mocks: every UI moment in the demo must be from a real, deployed, working code path. A demo showing a fake "approved!" state is fatal credibility loss if discovered.
- **Klarna disambiguation in the 5min cut** addresses the Patron-pivot context for community judges who remembered the predecessor. Brief, respectful — see story-103.
- **Captions in EN + ES.** The Mantle community has substantial Spanish-speaking developers. Auto-generated captions are insufficient; review and correct.
- **Recording checklist prevents the embarrassing moments**: a Slack notification popping up mid-demo, the system tray showing a low-battery warning, a Chrome update bubble. Pre-recording state hygiene is the difference between polished and amateur.
- **Pre-funded demo wallet + visible prior tick** = the agent looks like it's been running, not just started fresh. More credible.
- **Unlisted YouTube upload** matches the README link; supports captions; familiar URL. Vimeo as backup if YouTube has issues.
- **Storyboard before recording** prevents the "let me redo that section" loop. 30 minutes of storyboard saves 3 hours of re-recording.
- Cross-ref: hackathon-playbook.md §4 (judge psychology), research/concierge/09-tracks-and-judges.md.
