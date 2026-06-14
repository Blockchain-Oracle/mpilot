# Story — Sprint-status flip to READY-TO-SHIP + final coverage report

**ID:** story-205-sprint-status-ready-to-ship
**Epic:** Epic E12 — Submission Polish
**Depends on:** story-204-final-audit-pass
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge maintainer + future-me looking back at this submission
**I want to** sprint-status.yaml is updated with the final state (every COMPLETE story has merged_at + pr_url; any incomplete stories explicitly marked DEFERRED with rationale), a coverage report summarizing test + LOC across the codebase, and a one-page "what shipped" summary
**So that** the submission carries a transparent record of "what we said we'd build vs what we shipped" — credible to judges, useful for post-launch planning, honest about the scope cuts made

---

## File modification map

- `docs/sprint-status.yaml` — UPDATE (canonical state file) — every story has status COMPLETE / DEFERRED with required fields populated
- `docs/SHIPPING-SUMMARY.md` — NEW — one-page summary: epics shipped, story count, test counts, LOC, deployed addresses, demo URLs
- `docs/SCOPE-CUTS.md` — NEW — list of DEFERRED stories with rationale per cut (honest record)
- `scripts/coverage-report.sh` — NEW — generates aggregated test count + coverage % + LOC across all packages, outputs to SHIPPING-SUMMARY.md
- `scripts/sprint-status-validate.sh` — NEW — validates sprint-status.yaml: every story has status, COMPLETE stories have merged_at + pr_url, DEFERRED stories have rationale field

---

## Acceptance criteria (BDD)

```
Given sprint-status.yaml
When parsed
Then every story has: id, epic, status (COMPLETE | DEFERRED), depends_on; COMPLETE stories ALSO have: pr_url, merged_at; DEFERRED stories ALSO have: rationale

Given `bash scripts/sprint-status-validate.sh` runs
When the file passes validation
Then exit code is 0; any missing field per status causes exit 1 with the offending story id

Given the SHIPPING-SUMMARY.md
When read
Then it contains: total epics (13), stories shipped vs deferred (count), total LOC, total tests passing, aggregate coverage %, deployed addresses table, demo video link, judge walkthrough link

Given the coverage report
When generated
Then it aggregates per-package coverage and shows the WEAKEST package's % (e.g., "lowest: @concierge-mantle/aave-v3-mantle at 78%")

Given SCOPE-CUTS.md
When inspected
Then each deferred story has: id, reason (e.g., "out of scope for v1", "blocked on external dependency"), post-launch priority

Given the shipping summary is generated
When inspected
Then it does NOT overstate: claims match sprint-status.yaml COMPLETE entries 1:1

Given the deferred stories
When cross-checked against story files
Then each deferred story file's frontmatter Status is also DEFERRED (no drift between sprint-status and the story file)

Given Patron contamination check
When the shipping summary is grep'd
Then NO "BNPL"/"Patron" mentions

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -f docs/sprint-status.yaml
test -f docs/SHIPPING-SUMMARY.md
test -f docs/SCOPE-CUTS.md
test -x scripts/coverage-report.sh
test -x scripts/sprint-status-validate.sh

# Sprint status validates
bash scripts/sprint-status-validate.sh
test $? -eq 0

# Shipping summary has the required sections
for section in "Epics shipped" "Stories" "Coverage" "Deployed addresses" "Demo" "Walkthrough"; do
  grep -qi "$section" docs/SHIPPING-SUMMARY.md || { echo "missing section: $section"; exit 1; }
done

# Anti-Patron in summary
! grep -iE "(BNPL|Buy.Now.Pay.Later|Patron)" docs/SHIPPING-SUMMARY.md

# Coverage report has weakest-package callout
grep -qi "lowest" docs/SHIPPING-SUMMARY.md

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **HONEST SHIPPING RECORD.** Per CLAUDE.md no-half-built-features + hackathon-playbook.md §17 alpha mindset: a transparent "we shipped 95 stories, deferred 12 with rationale" beats an opaque "we built it all" that crumbles under inspection.
- **DEFERRED is not failure.** Hackathons make scope cuts. Documenting WHICH cuts and WHY is professional + tells judges we made deliberate choices.
- **Validation script enforces the schema.** Without it, sprint-status.yaml drifts: a COMPLETE story missing pr_url, a DEFERRED story missing rationale. Catches this at PR time.
- **Weakest-package coverage callout** is the honest disclosure. If aave-v3-mantle has 78% coverage while everything else has 90%, surface that — judges might ask; better to volunteer.
- **Cross-check against story files**: a story with frontmatter `Status: PENDING` while sprint-status.yaml says COMPLETE is a data integrity bug. The validation script catches drift.
- **SHIPPING-SUMMARY.md is the README-equivalent for the docs/ folder.** Anyone landing in docs/ for the first time reads this first to understand the project's state.
- **Per `feedback_no_deadline_pressure.md`**: don't frame this as "what we got done in time"; frame it as "the definition-of-done we achieved." Quality framing, not deadline framing.
- **Deployed addresses table** is duplicated from README intentionally — different audiences (README for new visitors, SHIPPING-SUMMARY for maintainers reviewing the ship).
- **This is THE LAST story before submission.** When it merges with status COMPLETE, the project is submission-ready. Per CLAUDE.md workflow step 10: merge + sprint-status update on main.
- Cross-ref: hackathon-playbook.md §17, sprint-status.yaml (the file this updates), AUDIT-2026-06-04.md (audit precedent).
