# Story 63 — Landing hero (Mercury-anchor)

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-62-shared-ui-package-bootstrap

## BDD Acceptance Criteria

```
Given a visitor lands on /
When the hero renders
Then the headline reads "Spend without selling. Your yield pays the loan." (one of the locked taglines per PRD)
And the headline uses Fraunces 80px on desktop / 48px on mobile (per ux-spec § Typography)
And the body uses Inter 18px
And the background is --bg (cream #FAF8F4), NOT a default gradient
And there is one prominent <PatronButton variant="primary"> CTA: "Connect wallet"
And a secondary <PatronButton variant="ghost"> CTA: "Open in Telegram"

Given the visitor scrolls
When the hero exits viewport
Then no janky reflow occurs (CLS < 0.05 verified by Playwright lighthouse trace)

Given Playwright runs the visual spec
When `pnpm playwright test apps/web/e2e/landing-hero.spec.ts` runs
Then it asserts the hero headline text, CTA labels, font-family computed style includes Fraunces, and bg color is rgb(250, 248, 244)

Given the hero serves demo-shape Stage 1 (judge first impression)
When a judge loads /
Then within 2 seconds they see the headline + "Connect wallet" CTA (visual prominence verified by Playwright `.toBeInViewport()`)
```

## File modification map

- `apps/web/app/page.tsx` — UPDATE — replace placeholder with composed landing: `<Hero />` + `<HowItWorks />` + `<MerchantLogos />` + `<LandingCTA />` + `<Footer />`. Hero is this story; others land in 64-66.
- `apps/web/components/landing/Hero.tsx` — NEW — RSC by default; client island only for animated headline if used. Imports `<PatronButton>` from `@patron/ui`.
- `apps/web/components/landing/Hero.module.css` — NEW (optional) — only if Tailwind utility soup gets ugly; prefer Tailwind utilities.
- `apps/web/e2e/landing-hero.spec.ts` — NEW — Playwright spec: navigate to `/`, assert headline text, CTA labels, computed font-family, bg color, viewport prominence.
- `apps/web/playwright.config.ts` — NEW (if not from story-60) — baseURL `http://localhost:3000`, projects: `chromium`, `webkit`, `mobile-chromium`, screenshots on failure.
- `apps/web/package.json` — UPDATE — add `@playwright/test` to devDeps; add `test:e2e` script.

## Premium UI option

Per ux-spec, the anchor is **Mercury.com** — crisp serif headline + sans body + cream background. Two acceptable build paths:

1. **premium-ui registry** — invoke the `premium-ui` skill, request a Mercury-style hero from 21st.dev or Magic UI. Install the chosen component into `packages/ui/src/marketing/Hero.tsx`, then specialize it for Patron copy.
2. **Hand-built per anchor** — write `Hero.tsx` matching Mercury's layout from scratch.

Path 1 is preferred. The `premium-ui` skill exists explicitly to avoid generic shadcn hero look.

## Shell verification

```bash
pnpm --filter web build
pnpm --filter web dev &
DEV_PID=$!
sleep 5

# Headline + CTA visible
curl -sf http://localhost:3000 | grep -q "Spend without selling"
curl -sf http://localhost:3000 | grep -q "Connect wallet"
curl -sf http://localhost:3000 | grep -q "Open in Telegram"

# Playwright e2e
pnpm playwright install --with-deps chromium webkit
pnpm playwright test apps/web/e2e/landing-hero.spec.ts
test $? -eq 0

kill $DEV_PID

# Banned classes check
node scripts/check-banned-classes.mjs apps/web/components/landing/Hero.tsx
test $? -eq 0
```

## Notes

- **Anchor: Mercury.com** — crisp serif headline + sans body + generous whitespace + dark numbers on cream. Look at it before coding.
- **Anti-anchor**: do NOT make it look like a generic shadcn landing (default purple gradients, glassmorphism, "AI assistant" hero).
- Tagline pulled verbatim from PRD § Tagline candidates — use *"Spend without selling. Your yield pays the loan."*
- "Open in Telegram" CTA links to `https://t.me/PatronBot/app?startapp=landing` (full implementation in story-79; here it can be a `<a>` placeholder).
- Hero is **demo-shape Stage 1** baseline — within 2s judge sees the prop value. Verify with Playwright.
- Banned Tailwind classes auto-checked by Biome from story-61 (no `bg-gradient-to-r`, no `text-blue-600`, etc.).
- File size < 400 LOC enforced.
- Headline weight is Fraunces 600; subhead is Fraunces 500. Body is Inter 400.
- The `--accent` deep indigo is the CTA fill — NOT generic shadcn purple `#7c3aed`.
