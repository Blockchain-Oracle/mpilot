# Story 117 — DoraHacks submission (Track 3 + Track 6 nominations + all deployment addresses + URLs)

**Epic:** Epic 8 — Polish + Submit
**Estimated:** ~1h
**Depends on:** story-110-mainnet-contract-deploy, story-112-demo-video-script-and-shoot, story-113-x-thread-draft, story-114-readme-finalize, story-115-architecture-diagram-export, story-116-accuracy-report

## BDD Acceptance Criteria

```
Given the file docs/dorahacks/submission.md exists
When a reader opens it
Then it contains the canonical DoraHacks form contents organized by form field:
  - Project Name: "Patron"
  - One-line pitch: verbatim from PRD § "One-line pitch"
  - Long description: 3-4 paragraphs distilled from PRD § Goal + Demo moment
  - Track nominations: ["AI × RWA (Track 3)", "Agentic Wallets & Economy (Track 6)"] — explicitly 2, max allowed per tracksLimitForBuidl=2
  - Additional award nominations: ["Grand Champion", "Best UI/UX", "Deployment Award"]
  - Demo video URL: the YouTube link from story-112
  - Live demo URL: https://patron.xyz (main app) + 3 demo merchant URLs
  - GitHub repo: github.com/<handle>/patron (with MIT license)
  - Deployed contract addresses (Mainnet): all 4 with mantlescan.xyz links
  - Deployed contract addresses (Sepolia): all 4 with sepolia.mantlescan.xyz links
  - X thread URL: from story-113
  - Architecture diagram: docs/architecture-diagram.svg + PNG
  - Accuracy report: docs/ACCURACY-REPORT.md
  - Track 3 submission answer ("what RWA is brought on-chain, AI's role, how realized on Mantle"): drafted paragraph
  - Track 6 submission answer ("which Byreal capabilities are used, what scenario"): drafted paragraph naming `byreal-cli` invocation in the agent's tool layer per ADR-005
  - #MantleAIHackathon hashtag confirmation (already on the X thread per story-113)

Given the actual DoraHacks form has been filled at https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl/new
When the submitter saves a draft
Then the draft can be inspected and any field surfaced by the form (deployment address slot, video slot, etc.) is filled

Given the submission is finalized
When the submitter clicks "Submit"
Then the platform shows a confirmation page (saved screenshot at docs/dorahacks/submission-confirmation.png)
And the BUIDL page URL is captured in docs/dorahacks/buidl-url.txt
And the README + X thread are updated to link to the BUIDL page (cross-link is what unlocks Community Voting)

Given the submission lands before deadline
When `date -u +%s` is compared to deadline (2026-06-15T15:59:00Z = 1781193540)
Then current time < deadline by at least 48h (i.e., Day 12-13 submit window — see PRD § "Submit by Day 10" target)

Given the verification script runs
When `bash scripts/verify-dorahacks-submission.sh` runs
Then it confirms all required fields per CONTEXT.md and 01-prizes-tracks.md are accounted for in the submission doc
```

## File modification map

- `docs/dorahacks/submission.md` — NEW — canonical form-content document; copy-paste-ready into the DoraHacks UI
- `docs/dorahacks/track3-answer.md` — NEW — drafted answer for Track 3's submission question ("what RWA is being brought on-chain, AI's role, how realized on Mantle")
- `docs/dorahacks/track6-answer.md` — NEW — drafted answer for Track 6's submission question ("which Byreal capabilities are used, what scenario")
- `docs/dorahacks/award-nominations.md` — NEW — per-award rationale (Grand Champion, Best UI/UX, Deployment Award) so the submitter can paste targeted text per nomination
- `docs/dorahacks/screenshots/` — NEW directory — for the post-submission confirmation screenshot + any other proof of submission
- `docs/dorahacks/buidl-url.txt` — NEW (created post-submission) — the live DoraHacks BUIDL URL captured for cross-referencing
- `docs/dorahacks/submission-checklist.md` — NEW — pre-submission checklist:
  - [ ] All 4 Mainnet addresses verified on mantlescan (link each)
  - [ ] Demo video uploaded and ≥ 2 min
  - [ ] Repo public, MIT licensed
  - [ ] X thread posted with #MantleAIHackathon
  - [ ] byreal-cli invoked in at least one agent tool call (Track 6 qualification)
  - [ ] Track 3 + Track 6 selected (not more — `tracksLimitForBuidl=2`)
  - [ ] Architecture diagram visual asset attached
  - [ ] Accuracy report linked
  - [ ] Deployment Award box checked (all criteria met)
  - [ ] Submitting in optimal Day-12 morning UTC window
- `scripts/verify-dorahacks-submission.sh` — NEW — bash that lints `docs/dorahacks/submission.md` for required fields + cross-checks addresses against `packages/shared/src/addresses.ts`
- `README.md` — UPDATE — after submission lands, update "Hackathon submission proof" section with the BUIDL URL

## Shell verification

```bash
test -f docs/dorahacks/submission.md

# Track 3 + Track 6 nominations
grep -q "Track 3" docs/dorahacks/submission.md
grep -q "Track 6" docs/dorahacks/submission.md

# Award stacks
for award in "Grand Champion" "Best UI/UX" "Deployment Award"; do
  grep -q "$award" docs/dorahacks/submission.md
done

# All 4 Mainnet addresses present
for c in PatronVault MerchantRegistry ReputationProxy AgentAuthorizer; do
  addr=$(node -e "console.log(require('./packages/shared/src/addresses.ts').ADDRESSES.mainnet.$c)")
  grep -q "$addr" docs/dorahacks/submission.md || { echo "missing $c address"; exit 1; }
done

# Demo + repo + thread + storefront URLs present
grep -q "youtu" docs/dorahacks/submission.md
grep -q "github.com" docs/dorahacks/submission.md
grep -q "patron.xyz" docs/dorahacks/submission.md
grep -q "threads-by-mara" docs/dorahacks/submission.md

# Track-specific answers exist
test -f docs/dorahacks/track3-answer.md
test -f docs/dorahacks/track6-answer.md
grep -q "byreal-cli" docs/dorahacks/track6-answer.md

# Submission checklist exists with all required items
for item in "Mainnet addresses" "Demo video" "byreal-cli" "Track 3" "Track 6" "Deployment Award"; do
  grep -q "$item" docs/dorahacks/submission-checklist.md
done

# Verify script
bash scripts/verify-dorahacks-submission.sh
test $? -eq 0

# Post-submission: confirm BUIDL URL captured
test -f docs/dorahacks/buidl-url.txt && grep -q "dorahacks.io" docs/dorahacks/buidl-url.txt
```

## Notes

- **Track 3 + Track 6 is the canonical pairing** per `06-hidden-field.md` (~$26.5K realistic upper-bound EV). DO NOT add a third track — `tracksLimitForBuidl=2` per DoraHacks platform config.
- **Three award nominations** stack on top of the 2 tracks: Grand Champion (cross-cutting), Best UI/UX (cross-cutting), Deployment Award (objective bar, first-come).
- **`byreal-cli` invocation is the Track 6 qualification gate** per ADR-005 + Track 6 rules. The agent's tool layer must call `byreal-cli` at least once during the demo, and the submission must explicitly cite this. The Track 6 answer doc names the file path where this happens (`apps/api/src/agent/tools/byreal.ts` per story-45).
- **Track 3 answer must call out specific Mantle RWA primitives.** Per `01-prizes-tracks.md` Track 3 expects an answer that names sUSDe (collateral) + Aave V3 Mantle (debt issuance) + ERC-8004 (settlement/identity) + the Mantle Mainnet chain itself.
- **Submission timing:** PRD says target Day 10 (2026-06-12) submission with 3-day buffer; CONTEXT.md says deadline is 2026-06-15 15:59 UTC. Realistic working target: submit Tuesday morning UTC on 2026-06-13 (Day 12) leaving 60h buffer for fixes if DoraHacks needs additional info.
- **Re-scrape BUIDL gallery before submitting** per CONTEXT.md "Next actions" — re-scrape at T-72h (2026-06-12) and T-24h (2026-06-14). Helps calibrate where to position the pitch relative to actual competitor density.
- **Deployment Award is first-come for ties.** If multiple teams hit the bar simultaneously and the 20 slots fill, the 21st loses out. Submit before the deadline rush.
- **Cross-link with X thread.** The DoraHacks BUIDL page links to the X thread (Community Voting), and the X thread links to the BUIDL page (engagement = vote signal). Both happen post-submission, so the BUIDL URL gets captured and propagated.
- **Sponsor proximity signals** per `phase3-signal.md`: name-drop Mantle + Byreal + ERC-8004 + Aave + Ondo (acknowledgment) + Hashed thesis alignment in the long description. Passive judge favor.
- **DON'T claim things that can't be verified.** Every claim in the submission must map to a real artifact judges can click. Vague aspirational copy ≠ judge currency.
- File size < 400 LOC.
