# Story 74 — Merchant directory page at /app/merchants

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-68-dashboard-shell, story-34-merchant-onboarding-endpoints

## BDD Acceptance Criteria

```
Given a connected user navigates to /app/merchants
When the page renders
Then a grid of <MerchantCard>s displays, one per registered merchant
And each card shows: brand logo, name, vertical category, reputation score (via <ReputationBadge>), USDC bond amount, "Favorite" toggle, "View" CTA → /m/:slug

Given a category filter row is visible
When the user clicks a category (e.g., "Fashion")
Then only merchants matching that category render

Given a search input is present
When the user types "threads"
Then the grid filters to merchants whose name OR description matches (case-insensitive)

Given the user clicks the Favorite (star) icon on a merchant
When the click registers
Then a POST to /users/me/favorites with { merchantSlug } is issued
And the star fills in --warning amber
And the favorite persists across page loads

Given the user is on the "Favorites" tab
When the tab renders
Then only their favorited merchants display

Given Playwright runs apps/web/e2e/merchant-directory.spec.ts
When the spec executes with mocked merchant list of 5
Then 5 cards render, category filter narrows results, search narrows results, favorite toggle persists
```

## File modification map

- `apps/web/app/app/merchants/page.tsx` — NEW — server component; reads merchants via TanStack Query.
- `apps/web/components/merchants/MerchantDirectory.tsx` — NEW — `"use client"`; renders filter row + search + tabs + grid.
- `apps/web/components/merchants/CategoryFilterRow.tsx` — NEW — horizontal scrollable pill row.
- `packages/ui/src/MerchantCard/MerchantCard.tsx` — NEW — pure card; props typed via Zod.
- `packages/ui/src/MerchantCard/MerchantCard.test.tsx` — NEW — Vitest render + favorite toggle.
- `packages/ui/src/ReputationBadge/ReputationBadge.tsx` — NEW — shows ERC-8004 score; tier coloring (--success > 80, --warning 50-80, --danger < 50). Hover tooltip with breakdown.
- `packages/ui/src/ReputationBadge/ReputationBadge.test.tsx` — NEW — Vitest score tier coloring.
- `apps/web/lib/hooks/useMerchants.ts` — NEW — TanStack Query hook GET /merchants.
- `apps/web/lib/hooks/useFavorites.ts` — NEW — TanStack Query hook GET /users/me/favorites + mutation POST/DELETE.
- `apps/web/e2e/merchant-directory.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter @patron/ui test
pnpm --filter web build
test $? -eq 0

# MerchantCard + ReputationBadge exported
grep -q "MerchantCard" packages/ui/src/index.ts
grep -q "ReputationBadge" packages/ui/src/index.ts

# 400-LOC
wc -l packages/ui/src/MerchantCard/MerchantCard.tsx | awk '{ if ($1 > 400) exit 1 }'
wc -l packages/ui/src/ReputationBadge/ReputationBadge.tsx | awk '{ if ($1 > 400) exit 1 }'

# Playwright
pnpm playwright test apps/web/e2e/merchant-directory.spec.ts
test $? -eq 0
```

## Notes

- **Anchor: Substack discover + Pinterest boards** — card grid with category filters + favorited pinning.
- `<MerchantCard>` + `<ReputationBadge>` are reused in `/m/:slug` (story-75) and merchant search elsewhere.
- Category list (v1): Fashion, Digital goods, Services, Food & Beverage, Hardware, Other. Sourced from `packages/shared/src/merchant-categories.ts` (single source of truth).
- Search is client-side filter for v1 (under 1000 merchants in demo).
- Favorites endpoint may not exist in Epic 2 v1 — if not, store in localStorage for v1 and note backend deferral.
- Reputation tiers align with merchant trust signals: > 80 = "Trusted" green badge, 50-80 = "OK" amber, < 50 = "Caution" red. Tooltip explains.
- Banned Tailwind classes auto-checked (no `divide-y` on the grid — use grid gap).
- File size < 400 LOC per file enforced.
- Serves demo-shape Stage 1 indirectly (judge sees Patron has multi-merchant directory, not a one-off integration).
