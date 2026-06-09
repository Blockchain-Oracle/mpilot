# Story — Final pre-submission audit pass (security, anti-slop, anti-contamination, claims-vs-reality)

**ID:** story-204-final-audit-pass
**Epic:** Epic E12 — Submission Polish
**Depends on:** story-200-readme-finalize, story-201-demo-video-script, story-202-judge-walkthrough, story-203-submission-form-prep
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge maintainer 24 hours before submission
**I want to** a final audit pass runs across 4 axes (security review, anti-slop UI sweep, anti-Patron contamination scan, claims-vs-reality verification) with documented findings + remediations
**So that** I submit with no known-fatal flaws — and if a judge surfaces an issue later, I have an audit record showing it was a known limitation, not a missed regression

---

## File modification map

- `docs/AUDIT-PRE-SUBMISSION.md` — NEW — the audit report with findings + status per axis
- `scripts/audit/security-sweep.sh` — NEW — runs: gitleaks, npm audit, trivy on dependencies; aggregates findings
- `scripts/audit/anti-slop-sweep.sh` — NEW — greps the apps/web/ codebase for banned patterns (purple gradients, font-sans default, 0x000 addresses, "lorem ipsum")
- `scripts/audit/anti-contamination-sweep.sh` — NEW — greps the entire repo (excluding archive/) for "BNPL", "Buy-Now-Pay-Later", "Patron"
- `scripts/audit/claims-verification.sh` — NEW — cross-references README + submission docs claims against sprint-status.yaml COMPLETE stories
- `scripts/audit/run-all.sh` — NEW — orchestrator that runs all 4 + outputs to docs/AUDIT-PRE-SUBMISSION.md

---

## Acceptance criteria (BDD)

```
Given `bash scripts/audit/run-all.sh` runs
When the 4 sweeps complete
Then docs/AUDIT-PRE-SUBMISSION.md is generated with: timestamp, per-axis findings, severity classification, remediation status

Given the security sweep
When findings are aggregated
Then any HIGH or CRITICAL finding BLOCKS submission until resolved or explicitly accepted with rationale in the audit doc

Given the anti-slop sweep finds a banned pattern
When detected
Then the audit reports the file + line + pattern; the build does NOT block (slop is a quality concern, not a security one) but the audit is the regression record

Given the anti-contamination sweep
When it finds "BNPL" or "Patron" outside archive/
Then it BLOCKS submission (this is non-negotiable per CLAUDE.md anti-pattern grep)

Given the claims-verification
When it finds a claim referencing a non-COMPLETE story
Then the audit lists it as a HIGH severity finding (claims-vs-reality mismatch = credibility risk)

Given the audit report is generated
When read by a maintainer
Then they can answer in <60s: "are we ready to submit?" with evidence

Given the audit identifies a fixable issue
When the fix is applied and the audit re-runs
Then the finding is marked resolved in the audit doc (chronological history preserved)

Given the audit identifies an UNFIXABLE-BY-SUBMISSION issue
When documented
Then the audit doc explains: what it is, why it can't be fixed in time, what mitigations exist, what the post-submission plan is

Given Patron archive false-positives
When the contamination sweep runs
Then it explicitly excludes archive/ (where Patron mentions are legitimate)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -x scripts/audit/security-sweep.sh
test -x scripts/audit/anti-slop-sweep.sh
test -x scripts/audit/anti-contamination-sweep.sh
test -x scripts/audit/claims-verification.sh
test -x scripts/audit/run-all.sh

# Audit orchestrator runs
bash scripts/audit/run-all.sh
test -f docs/AUDIT-PRE-SUBMISSION.md

# Anti-contamination sweep excludes archive/
grep -qE "(--exclude.*archive|--exclude-dir=archive)" scripts/audit/anti-contamination-sweep.sh

# Claims verification cross-references sprint-status.yaml
grep -q "sprint-status.yaml" scripts/audit/claims-verification.sh

# Findings format includes severity
grep -qE "(HIGH|CRITICAL|MEDIUM|LOW)" docs/AUDIT-PRE-SUBMISSION.md

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **The 4 axes are deliberate.** Per CLAUDE.md + memory: security (always), anti-slop (CLAUDE.md banned patterns), anti-contamination (Patron pivot legacy — load-bearing per AUDIT-2026-06-04), claims-vs-reality (submission integrity per feedback_no_namedrop_without_research).
- **Anti-contamination is the BLOCKER.** Per `feedback_brief_contamination.md` + memory: "BNPL"/"Patron" leaking into the public submission is a brand-coherence disaster. Submission MUST NOT proceed if any match exists outside archive/.
- **Anti-slop is informational, not blocking.** Slop in the UI is bad but not fatal; it's a quality finding for the post-submission backlog.
- **Claims-vs-reality is HIGH severity.** Per CLAUDE.md no-mocks + no-half-built-features: if the README claims "MCP server live" but story-133 is PENDING, that's a credibility risk worth blocking on.
- **The audit doc is the audit trail.** When a judge points out an issue post-submission, having the audit doc lets you respond: "yes, we knew about that — here's the documented mitigation."
- **Archive exclusion** in the contamination sweep prevents false positives from the legitimate Patron archive at `archive/patron-2026-06-02/`.
- **Severity classifications** per OWASP / CVSS-like: CRITICAL (immediate block), HIGH (block unless waived), MEDIUM (fix or document), LOW (post-launch).
- **Idempotent re-runs**: the audit script can be run multiple times; each run produces a new section in the doc with timestamp. Lets the maintainer track "we fixed X between yesterday's audit and today's."
- **Per `feedback_audits_can_be_wrong.md`**: pressure-test audit findings before patching. A blocker finding that's actually a false positive wastes 2 hours; a real blocker that's dismissed costs the submission.
- Cross-ref: AUDIT-2026-06-04.md (the previous audit pattern), CLAUDE.md banned patterns, sprint-status.yaml (truth source for claims).
