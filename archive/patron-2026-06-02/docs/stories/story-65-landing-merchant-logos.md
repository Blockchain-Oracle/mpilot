# Story 65 — Landing merchant logos + "Browse merchants" CTA

**Epic:** Epic 4 — Web App
**Estimated:** ~1h
**Depends on:** story-62-shared-ui-package-bootstrap

## BDD Acceptance Criteria

```
Given a visitor scrolls past "How it works"
When the merchant logos section enters viewport
Then the section displays 3 demo merchant logos in a row: Threads by Mara, Pixelink, Dialer Pro
And each logo links to its public merchant page at /m/threads-by-mara, /m/pixelink, /m/dialer-pro
And the section is captioned "Live merchants accepting Patron" using Fraunces heading

Given the section renders
When the user clicks "Browse merchants"
Then they navigate to /app/merchants (requires wallet — collapses to /connect if not connected)

Given a developer inspects the rendered DOM
When they query for logo elements
Then each logo has an alt text matching the merchant brand name (a11y compliance)
And each logo is rendered via next/image with explicit width/height (no CLS)

Given Playwright runs apps/web/e2e/landing-merchants.spec.ts
When the spec executes
Then it asserts 3 merchant logos render with their slugs as anchor hrefs
And the "Browse merchants" CTA links to /app/merchants
```

## File modification map

- `apps/web/components/landing/MerchantLogos.tsx` — NEW — RSC; renders logo grid + CTA.
- `apps/web/public/logos/threads-by-mara.svg` — NEW — placeholder logo (replaced by real demo merchant brand later).
- `apps/web/public/logos/pixelink.svg` — NEW — placeholder.
- `apps/web/public/logos/dialer-pro.svg` — NEW — placeholder.
- `apps/web/app/page.tsx` — UPDATE — insert `<MerchantLogos />` after `<HowItWorks />`.
- `packages/shared/src/demo-merchants.ts` — NEW — canonical list of demo merchant slugs + brand names + logo paths (consumed by this story + story-74 + story-75 + Epic 7). Single source of truth.
- `apps/web/e2e/landing-merchants.spec.ts` — NEW — Playwright spec asserting 3 logos + CTA link.

## Shell verification

```bash
pnpm --filter web build
test $? -eq 0

# Merchant logos present
curl -sf http://localhost:3000 | grep -q "Threads by Mara"
curl -sf http://localhost:3000 | grep -q "Pixelink"
curl -sf http://localhost:3000 | grep -q "Dialer Pro"
curl -sf http://localhost:3000 | grep -q "Browse merchants"

# Logo SVGs exist
test -f apps/web/public/logos/threads-by-mara.svg
test -f apps/web/public/logos/pixelink.svg
test -f apps/web/public/logos/dialer-pro.svg

# Single source of truth
grep -q "threads-by-mara" packages/shared/src/demo-merchants.ts
grep -q "pixelink" packages/shared/src/demo-merchants.ts
grep -q "dialer-pro" packages/shared/src/demo-merchants.ts

# Playwright
pnpm playwright test apps/web/e2e/landing-merchants.spec.ts
test $? -eq 0
```

## Notes

- The demo merchants are 3 different verticals (fashion, digital goods, services) per PRD — show Patron is general-purpose.
- Logo SVGs can be hand-drawn placeholders for v1; real brand art lands in Epic 7 storefronts.
- `packages/shared/src/demo-merchants.ts` is the single source of truth — every page that references demo merchants imports from here. No hardcoded slugs scattered around.
- Use `next/image` with fixed width/height to prevent CLS.
- Section background: `--bg-inverse` (#0A0A0A) with logos inverted to `--fg-inverse`, OR `--bg` cream with normal logos. Pick based on visual rhythm vs prior sections.
- File size < 400 LOC enforced.
- Banned Tailwind classes auto-checked.
