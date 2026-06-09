# Story — Repo README finalize (title + pitch + demo + screenshots + addresses + license + security)

**ID:** story-200-readme-finalize
**Epic:** Epic E12 — Submission Polish
**Depends on:** story-190-mainnet-deploy-runbook, story-194-web-vercel-deploy
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** judge or Mantle community member landing on the GitHub repo
**I want to** the README is the canonical 60-second pitch: title, one-line description, hero screenshot, demo video link, deployed contract addresses (real Mainnet), quickstart commands, license badge, security disclosure link
**So that** anyone hitting the repo URL — including judges who only ever look at the README — gets the full story without clicking through to the website

---

## File modification map

- `README.md` — UPDATE (placeholder from story-00) — full final README
- `SECURITY.md` — NEW — security disclosure policy (email, PGP key, scope, response timeline)
- `assets/screenshots/landing-hero.png` — NEW — hero screenshot from production
- `assets/screenshots/dashboard.png` — NEW — dashboard with live tick stream
- `assets/screenshots/agent-reputation.png` — NEW — public reputation page
- `assets/social-card.png` — NEW — 1200×630 social card for the repo
- `CONTRIBUTING.md` — NEW — contributing guide (forking, branch naming, PR conventions, test requirements)
- `LICENSE` — UPDATE (created in story-00) — verify MIT text matches the actual license
- `scripts/check-readme-completeness.sh` — NEW — CI check: README has all required sections

---

## Acceptance criteria (BDD)

```
Given the README is opened in GitHub
When read
Then it contains (in order): title, one-line pitch, hero screenshot, demo video link, quickstart, deployed addresses table, tech stack overview, license badge, security link, contributing link

Given the deployed addresses table
When inspected
Then it lists ConciergeRegistry Mainnet address (real, NOT 0x000) + Sepolia address + each token contract + each ERC-8004 registry address — all linked to Mantlescan

Given the hero screenshot
When clicked
Then it opens the full-size PNG (NOT broken image)

Given the quickstart
When run verbatim
Then a developer goes from `git clone` to running locally in 5 commands

Given the security policy
When read
Then it covers: how to report (email + PGP key), scope (in-scope: contracts + web; out-of-scope: third-party APIs), response timeline (acknowledge in 48h)

Given the license badge
When clicked
Then it points to the LICENSE file in this repo

Given the README completeness check
When `bash scripts/check-readme-completeness.sh` runs
Then it verifies each required section header exists AND no section is empty

Given the Patron contamination guard
When the README is grepped for forbidden language
Then NO matches for "BNPL", "Buy-Now-Pay-Later", "Patron" (the Patron archive is allowed to mention these; the public README must not)

Given the social card
When rendered as a Twitter/Slack/Discord preview
Then it has the Concierge logo + tagline AND is 1200×630 (Open Graph spec)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then no file (except LICENSE) exceeds 400 LOC
```

---

## Shell verification

```bash
test -f README.md
test -f SECURITY.md
test -f CONTRIBUTING.md
test -f LICENSE
test -f assets/screenshots/landing-hero.png
test -f assets/screenshots/dashboard.png
test -f assets/screenshots/agent-reputation.png
test -f assets/social-card.png
test -x scripts/check-readme-completeness.sh

# Completeness check passes
bash scripts/check-readme-completeness.sh
test $? -eq 0

# Real address (not 0x000) in README
! grep -q "0x0000000000000000000000000000000000000000" README.md

# Anti-Patron in README
! grep -iE "(BNPL|Buy.Now.Pay.Later|Patron)" README.md

# License is MIT
grep -q "MIT" LICENSE

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Per hackathon-playbook.md §8**: README sections in order — title, pitch, demo, screenshot, quickstart, tech stack, addresses, license, security, contributing. This order is what scanners expect.
- **REAL deployed addresses, NOT 0x000.** The CI check is the regression guard. Per CLAUDE.md credibility rule: zero addresses on the front-facing page tank the project's credibility immediately.
- **Hero screenshot at 1200×800 minimum** — readable detail when viewed on a 13" laptop. Compressed via squoosh.app or similar before commit (target < 200KB).
- **Demo video link** points to a YouTube or Loom unlisted video showing the full flow (story-201 produces this; story-200 wires it). Hackathon judges watch 60-90s; the demo video is the 5-minute deep-dive for the ones who care.
- **Quickstart MUST work verbatim.** Test it from a fresh clone before merging. Per `feedback_no_namedrop_without_research.md`: docs that don't work are worse than no docs.
- **Security policy with PGP key** is non-trivial trust signal. Generate via `gpg --gen-key`; publish the public key in SECURITY.md. Email: security@concierge.xyz (or placeholder).
- **SOCIAL CARD at 1200×630 OG spec.** Designer agent owns the visual; the dimensions are non-negotiable.
- **Contributing guide includes the test-first rule** (BDD acceptance criteria → failing tests → implementation) per CLAUDE.md.
- **Completeness CI check** runs on every PR touching README.md. Catches accidental section deletes.
- Cross-ref: hackathon-playbook.md §8, §12, §13.
