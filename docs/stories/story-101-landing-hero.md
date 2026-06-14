# Story — Landing hero with one-line pitch + Klarna disambiguation + CTA

**ID:** story-101-landing-hero
**Epic:** Epic E7 — Web App
**Depends on:** story-100-next-app-scaffold
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Mantle user landing on concierge.xyz
**I want to** see a hero that explains in 5 seconds what Concierge is (autonomous DeFi agent on Mantle), what it's NOT (not BNPL, not robo-advisor, not yet-another-AI-tools-MCP), and a primary CTA to start onboarding
**So that** I either click "Start" within 5 seconds OR scroll to learn more — the hero filters by intent

---

## File modification map

- `apps/web/app/(landing)/page.tsx` — UPDATE (created in story-100) — replace placeholder with the actual landing page composed of HeroSection + how-it-works + Klarna + dev CTA + trust + footer (later stories populate each)
- `apps/web/components/landing/HeroSection.tsx` — NEW — hero block with: H1 ("Your autonomous DeFi agent for Mantle"), subhead (a 2-sentence pitch), primary CTA ("Activate your agent"), secondary CTA ("Read the docs"), small visualization of the agent loop (status-pill animation cycling plan → simulate → propose → execute → record). Per `research/concierge/08-ux-component-intent.md` § hero requirements.
- `apps/web/components/landing/AgentLoopAnimation.tsx` — NEW — small visual: 5 status pills cycling at 1.2s/phase with fade-in animation. Respects `prefers-reduced-motion`. Uses Framer Motion (or Tailwind animate-pulse fallback).
- `apps/web/app/(landing)/layout.tsx` — NEW — landing-layout wrapper (different from /app layout — no auth gate, no nav)
- `apps/web/components/landing/__tests__/HeroSection.test.tsx` — NEW — RTL component test

---

## Acceptance criteria (BDD)

```
Given the landing page at `/`
When the page renders
Then it contains an H1 whose text is "Your autonomous DeFi agent for Mantle" (or the locked copy from `research/concierge/01-wedge-locked.md`)

Given the hero
When inspected
Then it contains exactly ONE primary CTA button "Activate your agent" linking to `/app/onboarding/connect`

Given the agent loop animation
When `prefers-reduced-motion: reduce` is set
Then the animation is replaced with a static representation (all 5 status pills visible in a row, no cycling)

Given the page renders on mobile (375px viewport)
When inspected
Then the hero stacks (H1 → subhead → CTA → animation) AND the H1 is readable without horizontal scroll

Given the page is server-rendered
When the SSR output is fetched via curl
Then the H1 text is in the static HTML (NOT requiring client-side JS to render — SEO + speed)

Given the hero copy explicitly disambiguates from common confusables
When the subhead is read
Then it does NOT say "Buy-Now-Pay-Later" or "BNPL" (Patron-era language must NEVER appear)

Given the loop animation
When inspected
Then it cycles through the 5 phase names (plan → simulate → propose → execute → record) NOT generic "thinking..." text

Given the landing route is publicly accessible
When an unauthenticated user lands on `/`
Then NO redirect to /app — landing is the unauthenticated experience by design

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f components/landing/HeroSection.tsx
test -f components/landing/AgentLoopAnimation.tsx
test -f app/\(landing\)/page.tsx

cd ../..

pnpm --filter @concierge-mantle/web run build
test $? -eq 0

# Hero copy does NOT contain BNPL/Patron-era language
! grep -iE "(BNPL|Buy.Now.Pay.Later|yield.spread)" apps/web/components/landing/HeroSection.tsx

# Phase names present in animation
for phase in plan simulate propose execute record; do
  grep -q "$phase" apps/web/components/landing/AgentLoopAnimation.tsx || { echo "missing phase: $phase"; exit 1; }
done

# RTL test passes
pnpm --filter @concierge-mantle/web run test 2>&1 | grep "HeroSection" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Copy is locked.** H1, subhead, CTA copy come from `research/concierge/01-wedge-locked.md` + `08-ux-component-intent.md`. Don't paraphrase. If you think the copy is bad, escalate to Abu — DON'T rewrite.
- **Anti-slop rules apply hard here.** Per CLAUDE.md banned patterns: no `from-purple-500 to-pink-500` gradients, no `text-gray-600` body, no font-sans defaults. The designer agent's tokens (from story-100 scaffold + future design-tokens.json) are the only colors/fonts allowed.
- **`prefers-reduced-motion` is non-negotiable.** Per accessibility contract in `research/concierge/08-ux-component-intent.md`. Without it, the page is unusable for motion-sensitive users.
- **SSR rendering of the H1** ensures social-link previews + SEO work. Don't make the H1 a client-only component.
- **Hero is the entire `above the fold`** for desktop. Don't cram too much; the goal is to fit the H1 + subhead + CTA + small animation in 100vh.
- **The agent loop animation is a TEASE**, not the dashboard preview. Small, side-corner visualization. Real tick stream lives in story-107.
- **No "BNPL" language anywhere.** Per AUDIT-2026-06-04 findings + memory[Patron archived]. Anti-pattern grep is in shell verification.
- Cross-ref: `research/concierge/08-ux-component-intent.md` § hero, `research/concierge/01-wedge-locked.md` (copy source).
