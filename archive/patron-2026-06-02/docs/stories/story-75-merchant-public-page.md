# Story 75 — Merchant public page at /m/:slug

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-60-nextjs-15-scaffold, story-34-merchant-onboarding-endpoints

## BDD Acceptance Criteria

```
Given any visitor (no wallet required) navigates to /m/threads-by-mara
When the page renders
Then it shows:
  - Header: merchant logo, name, vertical category, <ReputationBadge>
  - Stats row: USDC bond amount, # successful transactions, % dispute resolved in merchant's favor
  - About: 1-2 paragraph merchant-supplied description (markdown rendered)
  - Items they sell: grid of 6-12 items pulled from merchant catalog API (if available) OR placeholder grid for v1
  - "Visit storefront" CTA linking to the merchant's actual domain
  - "Recent on-chain activity" section: last 10 ERC-8004 receipts mentioning this merchant (each linking to /audit/:txHash)

Given the merchant doesn't exist (404 slug)
When the route resolves
Then a clean 404 page renders with copy "Merchant not found" + link back to /app/merchants

Given a connected user visits the page
When they click an item with "Pay with Patron"
Then they navigate to /checkout/:orderId (story-76)

Given the page is shared on social
When the OG metadata is fetched
Then the share preview shows merchant name + logo + tagline (via next/metadata generateMetadata)

Given Playwright runs apps/web/e2e/merchant-public.spec.ts
When the spec executes with mocked merchant `threads-by-mara`
Then all sections render and the 404 case is handled
```

## File modification map

- `apps/web/app/m/[slug]/page.tsx` — NEW — server component; fetches merchant via API; uses `generateMetadata` for OG.
- `apps/web/app/m/[slug]/not-found.tsx` — NEW — Next.js 404 handler.
- `apps/web/components/merchant-public/MerchantHeader.tsx` — NEW — logo + name + ReputationBadge.
- `apps/web/components/merchant-public/MerchantStats.tsx` — NEW — stats row.
- `apps/web/components/merchant-public/MerchantAbout.tsx` — NEW — markdown rendering via `react-markdown` + safe sanitization.
- `apps/web/components/merchant-public/MerchantItems.tsx` — NEW — item grid (placeholder if catalog not yet wired).
- `apps/web/components/merchant-public/MerchantActivity.tsx` — NEW — last 10 receipts for this merchant; links to /audit/:txHash.
- `apps/web/lib/hooks/useMerchant.ts` — NEW — TanStack Query hook GET /merchants/:slug.
- `apps/web/lib/hooks/useMerchantActivity.ts` — NEW — TanStack Query hook GET /merchants/:slug/activity.
- `apps/web/package.json` — UPDATE — add `react-markdown@latest` + `rehype-sanitize@latest`.
- `apps/web/e2e/merchant-public.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter web build
test $? -eq 0

# Route file exists
test -f apps/web/app/m/\[slug\]/page.tsx
test -f apps/web/app/m/\[slug\]/not-found.tsx

# Components exist
test -f apps/web/components/merchant-public/MerchantHeader.tsx
test -f apps/web/components/merchant-public/MerchantStats.tsx
test -f apps/web/components/merchant-public/MerchantAbout.tsx
test -f apps/web/components/merchant-public/MerchantItems.tsx
test -f apps/web/components/merchant-public/MerchantActivity.tsx

# Playwright
pnpm playwright test apps/web/e2e/merchant-public.spec.ts
test $? -eq 0
```

## Notes

- Public route (no wallet required) — anyone can audit a merchant before doing business with them. Trust signal for the ecosystem.
- `generateMetadata` returns merchant-specific OG: title `${merchant.name} on Patron`, description, og:image (merchant logo or auto-generated card via `@vercel/og`).
- `react-markdown` + `rehype-sanitize` mandatory — merchant-supplied description is untrusted input.
- "Recent activity" section is critical for the "auditable agent" message: anyone can see what Patron agents have done with this merchant.
- If catalog API isn't ready (Epic 7 demo merchants ship catalogs), render skeleton items with merchant brand color tint.
- 404 handler styled to match the rest of the site (cream bg, Fraunces heading).
- Banned Tailwind classes auto-checked.
- File size < 400 LOC per file enforced.
- Serves demo-shape Stage 1 (merchant credibility) AND Stage 5 (judges may click into a merchant from the receipt).
