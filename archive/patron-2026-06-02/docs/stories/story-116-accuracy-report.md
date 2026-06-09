# Story 116 — Accuracy report (self-assessment: gaps, coverage, mocked vs real)

**Epic:** Epic 8 — Polish + Submit
**Estimated:** ~1.5h
**Depends on:** story-110-mainnet-contract-deploy, story-53-agent-test-fixtures, story-104-demo-merchant-deploys

## BDD Acceptance Criteria

```
Given the file docs/ACCURACY-REPORT.md exists
When a reader opens it
Then it contains the following sections in order:
  - "Purpose" (1 paragraph: this is a self-assessment, not a sales doc; honesty is the value add)
  - "Summary verdict" (1 table: For each of the 5 PRD claim categories — agent, contracts, backend, frontend, SDK — show "shipped / mocked / cut" with a 1-line evidence note)
  - "What is REAL on Mantle Mainnet" (bullet list: deployed contracts with addresses + on-chain merchants + at least 1 successful end-to-end demo run captured in mantlescan tx hashes)
  - "What is REAL but on Sepolia only" (bullet list: anything that lives on testnet only, with reason)
  - "What is MOCKED" (table: subsystem / mock substitute / why mocked / where the real version would live in v2)
  - "What is CUT from v1 scope vs PRD" (bullet list with reason per item; cross-reference PRD § "What Patron is NOT" so the cuts are pre-disclosed)
  - "Test coverage" (table: package / unit % / integration ? / e2e ? / fuzz ? / invariant ?)
  - "Known bugs / edge cases not handled" (bullet list, with severity and workaround)
  - "What we'd ship next (if we had another week)" (3-5 bullets, prioritized)
  - "Submission claim cross-check" (table: every PRD § Required submission artifact + status: shipped, partial, missing — every item resolved with link)

Given every claim in PRD § Required submission artifacts has a row in the submission claim cross-check
When the table is read
Then no row is empty
And no row is marked "missing" unless explicitly justified (anything missing = a submission risk)

Given the report identifies any submission risk
When the risk is captured
Then it has a recommended mitigation (e.g., "if Mainnet flake on Demo Day, fall back to Sepolia recording with explicit badge")

Given linkinator runs on the file
When all internal cross-refs are checked
Then every link resolves (architecture.md sections, PRD sections, file paths in this repo)

Given the report is committed
Then it's referenced from README.md § "Hackathon submission proof" and from the DoraHacks submission (story-117)
```

## File modification map

- `docs/ACCURACY-REPORT.md` — NEW — full self-assessment per the section list above
- `docs/accuracy-report/test-coverage-extract.md` — NEW (optional) — auto-generated coverage extract from `pnpm test --coverage`; pasted into the main report as a table for the test coverage section
- `scripts/build-accuracy-report.sh` — NEW — bash: pulls Vitest coverage JSON + Foundry coverage report + Slither/Aderyn outputs and produces the test-coverage table; reduces manual entry
- `scripts/check-submission-claims.sh` — NEW — bash: parses PRD § Required submission artifacts (the markdown checkbox list), for each item greps the accuracy report for a matching entry, fails if any artifact is unaccounted-for
- `README.md` — UPDATE — under "Hackathon submission proof" add link to docs/ACCURACY-REPORT.md

## Shell verification

```bash
test -f docs/ACCURACY-REPORT.md

# Required sections present
for section in "Purpose" "Summary verdict" "What is REAL on Mantle Mainnet" "What is MOCKED" "What is CUT" "Test coverage" "Known bugs" "What we'd ship next" "Submission claim cross-check"; do
  grep -q "$section" docs/ACCURACY-REPORT.md || { echo "missing section: $section"; exit 1; }
done

# Submission claims fully accounted for
bash scripts/check-submission-claims.sh
test $? -eq 0

# Test coverage table has rows for every workspace package
for pkg in apps/web apps/mini apps/api packages/contracts packages/sdk-js packages/sdk-react packages/shared packages/ui; do
  grep -q "$pkg" docs/ACCURACY-REPORT.md || echo "WARN: $pkg missing from test coverage table"
done

# No "missing" rows without justification
grep -A1 "| missing |" docs/ACCURACY-REPORT.md | grep -i "justif\|risk\|fallback" || echo "WARN: review missing rows"

# Linkinator
npx linkinator docs/ACCURACY-REPORT.md --silent
test $? -eq 0

# README references the report
grep -q "ACCURACY-REPORT" README.md
```

## Notes

- **The accuracy report is the moat against "judges find your gap before you disclose it" embarrassment.** Pre-disclosing gaps shifts the judge's frame from "I caught you bluffing" to "they're honest about scope" — which is closer to thesis-aligned credibility.
- **Reference points** for honesty calibration: Hashed's 2026 thesis explicitly favors "real users + real metrics" over "vision + future roadmap." This report is the metric-and-gap document.
- **What goes in "MOCKED" not "REAL":**
  - If the demo path uses Anvil-fork instead of live Mainnet — that's MOCKED (transition needs story-118 rehearsal to flip).
  - If Nansen/Allora API calls use MSW recordings instead of live API — that's MOCKED for tests but should be REAL on Demo Day (the per-PR test path doesn't burn API quota).
  - If Mantle Mainnet flake during recording forces Sepolia fallback for the video — that's a real but Sepolia-only data point in the "REAL but Sepolia only" section.
- **What goes in "CUT":**
  - OpenClaw integration (per ADR-001, replaced by Claude Agent SDK).
  - USDY collateral support (per ADR-002, v2 work).
  - EIP-7702 session keys if cut to scoped API keys for v1 (per ADR-004).
  - Telegram Mini App if the surface area is reduced.
  - All items already in PRD § "What Patron is NOT (out of scope for hackathon v1)" — cross-reference, don't re-justify.
- **Test coverage targets:**
  - Solidity (Foundry) — unit + fuzz + invariant must all be GREEN. Coverage % less critical than the invariant test passing.
  - TS unit (Vitest) — aim for 70%+ on `packages/` (libraries) and the agent intent handlers.
  - e2e (Playwright) — at least 3 critical paths: web checkout, dashboard freeze, audit receipt page. Per-merchant storefront checkouts via SDK.
- **Submission claim cross-check is the contract with the judge.** Every PRD line item must have a status. This table is what the judge clicks through to verify your claims.
- **Length budget:** under 500 lines. A self-assessment that takes 30 minutes to read defeats its purpose; tight is more credible.
- **Cross-references must work.** The CI link check catches broken refs (architecture.md sections renamed, PRD lines reordered).
- **This report is REQUIRED per PRD § Required submission artifacts** ("Accuracy report (self-assessment) documenting any known gaps"). It's not optional.
- File size < 400 LOC.
