# Story — Landing "How it works" (5-step explainer)

**ID:** story-102-landing-how-it-works
**Epic:** Epic E7 — Web App
**Depends on:** story-100-next-app-scaffold
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Mantle user scrolling past the hero
**I want to** see a 5-step explainer (plan → simulate → propose → execute → record) showing exactly what happens every 60 seconds when the agent runs, with visual examples for each phase
**So that** I understand the agent's loop concretely (not abstractly) before deciding to onboard

---

## File modification map

- `apps/web/components/landing/HowItWorks.tsx` — NEW — 5-step component. Each step has: phase name, 1-sentence description, mini-visualization (faux Aave balance change for execute; faux IPFS CID for record; etc.). Per `research/concierge/08-ux-component-intent.md` § how-it-works requirements.
- `apps/web/components/landing/PhaseCard.tsx` — NEW — reusable card for one phase
- `apps/web/components/landing/__tests__/HowItWorks.test.tsx` — NEW — RTL test

---

## Acceptance criteria (BDD)

```
Given the HowItWorks section renders
When inspected
Then it has 5 PhaseCard instances with the phase names: plan, simulate, propose, execute, record (in that order)

Given each PhaseCard
When inspected
Then it has: phase label, 1-sentence description, mini-visualization (faux data; NOT placeholder text like "lorem ipsum")

Given the section is mobile-responsive
When viewed on 375px width
Then the cards stack vertically (not 5 across); each card is full-width

Given the section is desktop
When viewed on 1280px width
Then the cards display in a 5-column grid (or 5-row scroll on intermediate sizes)

Given the section is below the hero
When the user scrolls down from the hero
Then the HowItWorks section is the FIRST thing they see (no other section between)

Given the descriptions are concise
When measured
Then each phase description is 8-20 words (long enough to be specific, short enough to scan)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given anti-slop checks
When the component is inspected
Then NO purple-pink gradient, NO `text-gray-600` body text, NO `font-sans` fallback, NO placeholder dummy text
```

---

## Shell verification

```bash
cd apps/web
test -f components/landing/HowItWorks.tsx
test -f components/landing/PhaseCard.tsx

cd ../..

pnpm --filter @concierge/web run build
test $? -eq 0

# All 5 phases present
for phase in plan simulate propose execute record; do
  grep -q "$phase" apps/web/components/landing/HowItWorks.tsx || { echo "missing $phase"; exit 1; }
done

# Anti-slop
! grep -qE "(lorem ipsum|placeholder|TODO)" apps/web/components/landing/HowItWorks.tsx
! grep -qE "from-purple-500.*to-pink-500" apps/web/components/landing/HowItWorks.tsx
! grep -qE "text-gray-600" apps/web/components/landing/HowItWorks.tsx

# RTL test passes
pnpm --filter @concierge/web run test 2>&1 | grep "HowItWorks" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **The mini-visualizations are critical** — abstract "the agent thinks" descriptions don't convince anyone. Show a faux balance going from $1000 USDC → $900 USDC + $100 sUSDe; show a faux IPFS CID; show a faux Mantle tx hash. Concrete examples build trust.
- **Faux data is not slop**, but it must NOT look like placeholder text. Real-shape examples: actual address formats, actual hash formats (0x...), actual token symbols. NEVER "0x123" or "User1".
- **No animation in this section.** The hero has the loop animation; this section is static for scannability. If you add motion, it competes with the hero.
- **Phase descriptions must be specific.** Bad: "The agent thinks about what to do." Good: "Reads your goal + current positions; outputs a JSON action plan or noop."
- **Cards stack on mobile.** Don't try to fit 5 across on a 375px screen — text becomes unreadable.
- **Color palette per design tokens.** Each phase MAY have its own accent color (planning = blue, simulating = amber, proposing = purple, executing = green, recording = grey) but ALL come from the design-tokens. Hardcoded hex values fail the lint.
- Cross-ref: `research/concierge/08-ux-component-intent.md` § how-it-works, story-63-67 (phase definitions).
