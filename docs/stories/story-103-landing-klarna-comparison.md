# Story — Landing "Concierge is NOT Klarna" comparison block (positioning disambiguation)

**ID:** story-103-landing-klarna-comparison
**Epic:** Epic E7 — Web App
**Depends on:** story-100-next-app-scaffold
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Mantle user who saw the predecessor Patron (BNPL) pitch
**I want to** see a side-by-side disambiguation: "Klarna BNPL = pay later for purchases. Concierge = your DeFi agent that acts on your behalf 24/7"
**So that** I understand Concierge is NOT a BNPL product (Patron's wedge that pivoted) — it's a different category entirely

---

## File modification map

- `apps/web/components/landing/KlarnaDisambiguation.tsx` — NEW — side-by-side block. Left side: Klarna-style "Pay in 4 installments" diagram. Right side: Concierge agent-loop diagram. Headline: "Concierge is not Klarna. It's not BNPL." Subhead: "Concierge is an autonomous DeFi agent — your goal, on Mantle, 24/7."
- `apps/web/components/landing/__tests__/KlarnaDisambiguation.test.tsx` — NEW — RTL test

---

## Acceptance criteria (BDD)

```
Given the section renders
When inspected
Then it has a headline "Concierge is not Klarna" (or the locked variant) AND a subhead clearly stating what Concierge IS

Given the side-by-side
When viewed on desktop
Then Klarna side is on the LEFT (familiar reference), Concierge is on the RIGHT (the offering)

Given the side-by-side on mobile (375px)
When viewed
Then it stacks vertically (Klarna first as the reference, Concierge below as the offering)

Given the headline copy
When read
Then it explicitly mentions "Klarna" (NOT vague "BNPL services") AND explicitly negates "BNPL"

Given the design
When inspected for anti-slop
Then no purple-pink gradient, no font-sans default, no placeholder copy

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given accessibility
When inspected via axe-core
Then the section has 0 critical violations (proper heading hierarchy, alt text on icons)
```

---

## Shell verification

```bash
cd apps/web
test -f components/landing/KlarnaDisambiguation.tsx

cd ../..

pnpm --filter @concierge/web run build
test $? -eq 0

# Klarna explicitly mentioned
grep -qE "Klarna" apps/web/components/landing/KlarnaDisambiguation.tsx

# "Not BNPL" explicit
grep -qE "(not BNPL|isn't BNPL|not Buy.Now)" apps/web/components/landing/KlarnaDisambiguation.tsx

# Anti-slop
! grep -qE "(lorem ipsum|placeholder|TODO)" apps/web/components/landing/KlarnaDisambiguation.tsx

# RTL test passes
pnpm --filter @concierge/web run test 2>&1 | grep "KlarnaDisambiguation" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **The Patron context matters.** Per `archive/patron-2026-06-02/`: Concierge replaced Patron (a BNPL-on-Mantle wedge). Mantle community + some judges saw the Patron pitch. This block is a deliberate disambiguation: "we pivoted; this is different." Anyone who remembered Patron sees this and clearly understands the change.
- **Klarna is the right reference** because it's the most-known BNPL brand. Even non-DeFi users have heard of Klarna. Using "Affirm" or "Afterpay" loses 50% of audience.
- **Side-by-side, not opposing.** Don't make Klarna look bad. Klarna is fine; Concierge is just a DIFFERENT thing. Tone: respectful, clarifying.
- **No mocking, no shade.** This is positioning, not attack marketing. "We are different from Klarna" — not "Klarna sucks."
- **Real Klarna brand colors NOT used.** Use neutral grays for the Klarna side; brand colors (from design tokens) for the Concierge side. Avoids trademark issues + makes Concierge stand out.
- **Per CLAUDE.md "no BNPL language" rule**: the negation language IS allowed (saying "not BNPL"). The rule prevents calling Concierge a BNPL — saying it's NOT one is the inverse and is correct.
- Cross-ref: `archive/patron-2026-06-02/docs/PRD.md` (predecessor wedge for context), `research/concierge/01-wedge-locked.md` (what Concierge IS).
