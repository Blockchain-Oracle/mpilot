# Story 86 — Mini App merchant directory (/merchants)

**Epic:** Epic 5 — Telegram Mini App
**Estimated:** ~1.5h
**Depends on:** story-84-mini-dashboard, story-74-merchant-directory-page

## BDD Acceptance Criteria

```
Given an authenticated user navigates to /merchants
When apps/mini/app/merchants/page.tsx renders
Then a card grid of <MerchantCard> (compact variant) shows
And the grid is single-column on width < 400px, two-column from 400px+
And each card shows: logo, name, category, <ReputationBadge>, "favorite" tap target

Given the user types in the search input at the top
When the query changes
Then the visible cards filter client-side by name + category
And debounce is 200ms

Given the user taps a category filter chip ("Fashion", "Digital", "Services")
When the filter applies
Then the card grid filters to that category
And a "Clear filters" chip appears when any filter is active

Given the user taps the heart icon on a card
When the favorite mutation runs
Then a POST /users/me/favorites/:merchantSlug fires (Epic 2; stub if needed)
And the heart fills with --accent color
And TG haptic light-impact fires

Given the user taps a merchant card body
When the navigation happens
Then router pushes to /m/:slug
And the merchant public page loads (story-87 hosts checkout flow; merchant public profile may be a v2 mini route or a deep-link to web)

Given the directory data loads
When TanStack Query fetches GET /merchants
Then a skeleton grid renders during loading
And on error a small inline retry control shows

Given Playwright runs apps/mini/e2e/merchants.spec.ts
When the spec executes with mocked API
Then 3 demo merchants render and search + filter + favorite interactions work
```

## File modification map

- `apps/mini/app/merchants/page.tsx` — NEW — `"use client"`; auth-gated; renders the directory.
- `apps/mini/components/merchants/MerchantDirectoryGrid.tsx` — NEW — handles grid layout + responsive columns.
- `apps/mini/components/merchants/MerchantSearchBar.tsx` — NEW — debounced input + TG-native styling.
- `apps/mini/components/merchants/MerchantCategoryFilter.tsx` — NEW — chip-based filter row.
- `apps/mini/lib/hooks/useMerchants.ts` — NEW — TanStack Query: GET /merchants (Epic 2 story-34 endpoint).
- `apps/mini/lib/hooks/useToggleFavorite.ts` — NEW — TanStack Query mutation; optimistic update with rollback on error.
- `packages/ui/src/MerchantCard/MerchantCard.tsx` — UPDATE — add `variant: 'wide' | 'compact'`; compact stacks meta beneath name and squeezes padding.
- `apps/mini/e2e/merchants.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter mini build
test $? -eq 0

# Route + components
test -f apps/mini/app/merchants/page.tsx
test -f apps/mini/components/merchants/MerchantDirectoryGrid.tsx
test -f apps/mini/components/merchants/MerchantSearchBar.tsx
test -f apps/mini/components/merchants/MerchantCategoryFilter.tsx

# Reuses MerchantCard from packages/ui
grep -q "@patron/ui" apps/mini/components/merchants/MerchantDirectoryGrid.tsx
! find apps/mini/components/merchants -name "MerchantCard.tsx" | grep -q .

# Calls GET /merchants
grep -q "/merchants" apps/mini/lib/hooks/useMerchants.ts

# Playwright
pnpm playwright test apps/mini/e2e/merchants.spec.ts
test $? -eq 0

# 400-LOC
for f in $(find apps/mini/components/merchants apps/mini/app/merchants -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **Anchor: Substack discover + Pinterest boards** — visual card grid with filters + favorites pinning. Adapted to TG mobile constraint.
- Reuse `MerchantCard` and `ReputationBadge` from packages/ui — do not duplicate in apps/mini.
- Single-column under 400px is critical because many TG users open Mini Apps on narrow phones.
- Favorites use optimistic mutation so the heart fills immediately — feels native.
- Category chips: keep to 3-5 in v1 ("Fashion", "Digital", "Services" + "All" + optional "Favorites").
- Merchant public page (/m/:slug) is a web-app route in v1 (story-75). The mini directory can either deep-link out via `WebApp.openLink` or open a stripped mini version — pick deep-link-to-web for v1 to avoid duplicating the public profile UI.
- BackButton wires to dashboard `/` since `/merchants` is a peer.
- File size < 400 LOC enforced.
- This page is the discovery surface — judges will likely tap through to checkout from here.
