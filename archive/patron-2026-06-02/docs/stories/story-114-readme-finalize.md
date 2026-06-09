# Story 114 — README finalize (setup + architecture + deploy addresses + demo links + submission proof)

**Epic:** Epic 8 — Polish + Submit
**Estimated:** ~1.5h
**Depends on:** story-110-mainnet-contract-deploy, story-104-demo-merchant-deploys

## BDD Acceptance Criteria

```
Given the file README.md exists at repo root
When a reader opens it
Then it contains the following sections in order:
  - Header (logo + one-line pitch from PRD + 3 badges: license MIT, CI status, "Built on Mantle")
  - "Watch the 90s demo" embed with the YouTube link + thumbnail (or repo-hosted mp4 fallback)
  - "What is Patron" (3-paragraph product summary distilled from PRD § Goal + Demo moment)
  - "Try it live" (3 demo merchant URLs + the main app URL https://patron.xyz)
  - "Architecture" (image embed of docs/architecture-diagram.png from story-115) + 1-paragraph caption
  - "Deployed contracts" (table: Contract / Sepolia address / Mainnet address; all 4 contracts; addresses link to mantlescan.xyz)
  - "Registered demo merchants" (table: Slug / Production URL / Mainnet registration tx; all 3 merchants)
  - "Quickstart" (clone + pnpm install + setup .env + pnpm dev — under 6 commands)
  - "Repo structure" (tree of apps/ + packages/ + demo-merchants/ — copy from architecture.md)
  - "Tech stack" (table from architecture.md § Stack — Language / Choice / Version)
  - "Hackathon submission proof" (lists track nominations + DoraHacks URL + X thread URL + demo video URL + accuracy report URL)
  - "License" (MIT)
  - "Acknowledgments" (Mantle, Aave, Ondo, Ethena, Byreal, ERC-8004 working group, OpenZeppelin)

Given no placeholder addresses remain
When `grep -c "0x0000000000000000000000000000000000000000" README.md` runs
Then result is 0
And `grep -c "TODO" README.md` returns 0 (no unfilled placeholders)

Given the addresses match `packages/shared/src/addresses.ts`
When a sync check runs (`scripts/check-readme-addresses.sh`)
Then it confirms every Mainnet + Sepolia address in the README table exactly matches the source-of-truth in addresses.ts

Given every link in the README is checked
When `npx linkinator README.md` runs
Then all 200 OK (no dead links)

Given the README size is reasonable
Then it's under 600 lines and under 25 KB (judges scan, don't read; tight is better)
```

## File modification map

- `README.md` — UPDATE (already created in story-00 as placeholder; updated in story-21 with Sepolia table; finalized here) — full canonical version per the section list above
- `scripts/check-readme-addresses.sh` — NEW — bash: for each contract name, extract address from `packages/shared/src/addresses.ts` via node one-liner, grep the README for it, fail if missing
- `scripts/check-readme-links.sh` — NEW — wrapper around `npx linkinator README.md --silent` with exit code propagation
- `docs/badges/` — NEW directory — referenced badge images (or shields.io URLs in README)
- `LICENSE` — VERIFY (created in story-00) — confirm MIT license text is canonical
- `.github/README-template.md` — NEW — reusable section snippets so the README stays consistent across edits (optional but documented)

## Shell verification

```bash
test -f README.md

# Required sections
for section in "Watch the 90s demo" "What is Patron" "Try it live" "Architecture" "Deployed contracts" "Registered demo merchants" "Quickstart" "Repo structure" "Tech stack" "Hackathon submission proof" "License" "Acknowledgments"; do
  grep -q "$section" README.md || { echo "missing section: $section"; exit 1; }
done

# No placeholders
test $(grep -c "0x0000000000000000000000000000000000000000" README.md) -eq 0
test $(grep -c "TODO" README.md) -eq 0
test $(grep -c "PLACEHOLDER" README.md) -eq 0

# Addresses match source of truth
bash scripts/check-readme-addresses.sh
test $? -eq 0

# All 4 contracts mentioned with mantlescan link
for c in PatronVault MerchantRegistry ReputationProxy AgentAuthorizer; do
  grep -q "$c" README.md
done
grep -c "mantlescan.xyz" README.md | xargs test 8 -le

# All 3 demo merchant URLs present
grep -q "threads-by-mara.patron.xyz" README.md
grep -q "pixelink.patron.xyz" README.md
grep -q "dialer-pro.patron.xyz" README.md

# Video link present
grep -q "youtu" README.md

# Architecture diagram referenced
grep -q "architecture-diagram" README.md

# Size sane
wc -l README.md | awk '{if ($1 > 600) exit 1}'
wc -c README.md | awk '{if ($1 > 25600) exit 1}'

# Links live
bash scripts/check-readme-links.sh
test $? -eq 0
```

## Notes

- **The README is one of the top-3 things judges look at** (alongside the demo video and the DoraHacks submission page). Treat it as a sales asset, not a docs dump.
- **Quickstart < 6 commands.** Anyone reading the README must be able to `git clone` → `pnpm install` → `cp .env.example .env` → fill keys → `pnpm dev` → see something running. If it takes more than 6 commands, simplify.
- **Address sync is enforced.** `scripts/check-readme-addresses.sh` runs in CI (post story-114) and fails the build if README addresses drift from `addresses.ts`. This is the antidote to Phase 2 disqualification due to "0x000 placeholder" or wrong-network addresses.
- **The "Hackathon submission proof" section is the judge nav.** A judge opens the README, scrolls to that section, and gets 4 links: DoraHacks submission, X thread, demo video, accuracy report. Each is a verifiable artifact.
- **Demo merchant URLs (production) over staging URLs.** Story-111 cuts the storefronts over to Mainnet API; the README reflects the Mainnet-live state.
- **No TODO/PLACEHOLDER text.** If something isn't filled in yet (e.g., X thread URL), DON'T commit the README with a placeholder; wait until the thread is live, then update.
- **Acknowledgments matter.** Sponsor + partner names in the README is passive judge favor (mentioned in `phase3-signal.md` re sponsor proximity).
- **Per architecture.md banned patterns:** no 0x000... addresses ever appear in README. This is a hard rule.
- **Markdown lint:** add a `markdownlint-cli2` config to keep the README consistent (optional but recommended; can be deferred to a polish PR).
- **Image hosting:** the architecture diagram (story-115) is committed to the repo at `docs/architecture-diagram.png` (or .svg) and referenced via relative path so it renders on GitHub and on any mirror.
- File size < 400 LOC. README is text; this should not be an issue.
