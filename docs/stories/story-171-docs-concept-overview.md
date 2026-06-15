# Story — Docs concept overview (what Concierge is + how it differs)

**ID:** story-171-docs-concept-overview
**Epic:** Epic E10 — Docs Site
**Depends on:** story-170-docs-site-scaffold
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** developer or judge new to Concierge
**I want to** the first concept page explains: what Concierge is, the wedge (autonomous DeFi agent for Mantle), the 5 phases of the tick loop, the trust primitives (visibility + ERC-8004 attestation), how it differs from robo-advisors AND from BNPL
**So that** I can read 5-10 minutes and form a correct mental model — concrete enough to act on, abstract enough to fit in working memory

---

## File modification map

- `apps/web/content/docs/concepts/overview.mdx` — NEW — main concept page
- `apps/web/content/docs/concepts/the-loop.mdx` — NEW — quick reference to the 5-phase loop
- `apps/web/content/docs/concepts/trust-primitives.mdx` — NEW — explainer for visibility + attestation
- `apps/web/content/docs/concepts/how-we-differ.mdx` — NEW — comparison vs. Klarna BNPL, robo-advisors, generic AI agents
- `apps/web/content/docs/concepts/_meta.tsx` — NEW — section navigation
- `apps/web/components/docs/PhaseLoopDiagram.tsx` — NEW — interactive 5-phase diagram (reuse pattern from story-101 AgentLoopAnimation)
- `apps/web/components/docs/__tests__/PhaseLoopDiagram.test.tsx` — NEW — RTL test

---

## Acceptance criteria (BDD)

```
Given the concept overview page
When read
Then it explains in the first 200 words: what Concierge is, what protocols it acts on, what the user does vs what the agent does

Given the trust-primitives page
When inspected
Then it covers BOTH primitives: (1) real-time visibility via the live tick stream, (2) per-tick ERC-8004 attestation as cryptographic receipt

Given the how-we-differ page
When read
Then it explicitly mentions: Klarna BNPL (not Concierge), traditional robo-advisors (not Concierge), generic "AI assistants" without on-chain receipts (not Concierge)

Given the loop diagram
When rendered
Then it shows all 5 phases (plan → simulate → propose → execute → record) with clickable phase descriptions

Given each concept page
When inspected for Patron contamination
Then NO matches for "BNPL", "Buy-Now-Pay-Later", "Patron" outside the "how-we-differ" page (where they appear in the negation context)

Given the section navigation
When the user visits /docs/concepts/
Then the sidebar shows: Overview, The Loop, Trust Primitives, How We Differ — in that order

Given the pages link to API references
When clicking "see SDK reference" or similar
Then the link target exists (no broken links to story-175 reference pages)

Given file size budget per MDX file
When inspected
Then no MDX file exceeds 200 lines (concept pages should be scannable)
```

---

## Shell verification

```bash
cd apps/web/content/docs/concepts
test -f overview.mdx
test -f the-loop.mdx
test -f trust-primitives.mdx
test -f how-we-differ.mdx
test -f _meta.tsx

cd ../../../../..

pnpm --filter @mpilot/web run build
test $? -eq 0

# All 5 phases mentioned in the-loop
for phase in plan simulate propose execute record; do
  grep -q "$phase" apps/web/content/docs/concepts/the-loop.mdx || { echo "missing $phase"; exit 1; }
done

# ERC-8004 mentioned in trust-primitives
grep -q "ERC-8004" apps/web/content/docs/concepts/trust-primitives.mdx

# No Patron contamination outside how-we-differ
! grep -lE "(BNPL|Buy.Now.Pay.Later|Patron)" apps/web/content/docs/concepts/overview.mdx apps/web/content/docs/concepts/the-loop.mdx apps/web/content/docs/concepts/trust-primitives.mdx

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Concept pages explain WHY before HOW.** Per `research/concierge/08-ux-component-intent.md` § docs structure: a reader who only reads concept pages should still leave with a correct mental model of what Concierge does and why it's different.
- **The 5-phase loop is the central conceit.** Get this diagram right — interactive, clickable, with one-sentence-per-phase explanations. The judges' "wow moment" is seeing the agent thinking; this diagram is the docs equivalent.
- **Klarna BNPL appears ONLY in the negation context.** Per the load-bearing memory: Patron pivoted; this disambiguation is critical for community alignment. But don't lead with it — start with what Concierge IS, then in a separate page address what it ISN'T.
- **Link liberally between concept pages and reference pages.** "See the SDK reference for the exact function signatures" — let readers go deep when they want.
- **No code blocks longer than 15 lines** in concept pages. Long code belongs in tutorials (story-175) and reference (story-176). Concepts should be 80% prose + diagrams.
- **The trust-primitives page is the wedge essay.** Make it good. Per ADR-004: the per-tick attestation IS the verifiability claim. Don't bury this; lead with it.
- **Page length ≤ 200 lines MDX** — concept pages should fit in one screen of reading. Long-form goes elsewhere.
- Cross-ref: `research/concierge/01-wedge-locked.md` (wedge source-of-truth), `research/concierge/04-agent-runtime.md` § 3 (phase descriptions).
