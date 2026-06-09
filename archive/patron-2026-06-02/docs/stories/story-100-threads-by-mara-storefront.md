# Story 100 — Threads by Mara storefront (fashion vertical demo merchant)

**Epic:** Epic 7 — Demo Merchants
**Estimated:** ~2h
**Depends on:** story-95-sdk-react-patron-button

## BDD Acceptance Criteria

```
Given the demo-merchants/threads-by-mara workspace is installed
When `pnpm --filter threads-by-mara dev` runs
Then a Next.js 15 dev server boots on port 4101
And the homepage renders a fashion storefront brand (logo "Threads by Mara", tagline, hero image)
And a product grid lists at least 6 real apparel products (name, image, USD price, "Add to cart" or "Buy now")
And no lorem ipsum text appears anywhere

Given the storefront uses @patron/react
When a visitor opens any product detail page /products/:slug
Then a <PatronButton merchantSlug="threads-by-mara" amountUsd={price} sku={slug} /> renders next to the price
And the SDK opens the Patron checkout flow on click (modal or redirect to /checkout/:orderId on the Patron domain)
And the SDK is wired with the merchant's public API key (from env: NEXT_PUBLIC_PATRON_MERCHANT_KEY)

Given the merchant runs in production mode
When the visitor clicks <PatronButton> on a $75 hoodie
Then POST /orders/intent fires against the configured Patron API URL with the product SKU + price + merchant slug
And on success the checkout modal renders the demo-shape Stage 2 yield math copy

Given `pnpm --filter threads-by-mara build` runs
Then exit code is 0
And the .next output is suitable for Vercel deployment

Given the lighthouse a11y audit runs on the homepage
When the score is computed
Then accessibility ≥ 90 (WCAG AA color contrast, focus rings, labels)
```

## File modification map

- `demo-merchants/threads-by-mara/package.json` — UPDATE (scaffolded in story-00) — pin Next.js 15, React 19, `@patron/react@workspace:*`, `@patron/ui@workspace:*` (optional shared styles), Tailwind v4, Biome
- `demo-merchants/threads-by-mara/next.config.ts` — NEW — image domains for product photos (use Unsplash hot-link domains or local /public assets)
- `demo-merchants/threads-by-mara/tailwind.config.ts` — NEW — own fashion palette (warm cream + olive accent — DIFFERENT from Patron's deep indigo so the storefront looks like an independent brand, not a Patron clone)
- `demo-merchants/threads-by-mara/app/layout.tsx` — NEW — root layout with brand fonts (Playfair Display + Inter), header (logo + nav), footer
- `demo-merchants/threads-by-mara/app/page.tsx` — NEW — homepage: hero ("Hand-picked apparel from independent designers"), product grid (6 products), trust strip ("Pay with Patron — your savings keep earning")
- `demo-merchants/threads-by-mara/app/products/[slug]/page.tsx` — NEW — product detail: gallery, description, size selector, `<PatronButton>` + standard "Add to cart" stub
- `demo-merchants/threads-by-mara/app/products/[slug]/not-found.tsx` — NEW
- `demo-merchants/threads-by-mara/lib/products.ts` — NEW — typed product catalog (6 items): linen-overshirt ($95), structured-tee ($45), heavyweight-hoodie ($75), wool-trousers ($165), canvas-tote ($35), corduroy-cap ($30). All with real-sounding copy + Unsplash image URLs.
- `demo-merchants/threads-by-mara/components/Header.tsx` — NEW
- `demo-merchants/threads-by-mara/components/Footer.tsx` — NEW
- `demo-merchants/threads-by-mara/components/ProductCard.tsx` — NEW
- `demo-merchants/threads-by-mara/components/Hero.tsx` — NEW
- `demo-merchants/threads-by-mara/app/globals.css` — NEW — Tailwind v4 + brand tokens
- `demo-merchants/threads-by-mara/.env.local.example` — NEW — `NEXT_PUBLIC_PATRON_API_URL`, `NEXT_PUBLIC_PATRON_MERCHANT_KEY`, `NEXT_PUBLIC_PATRON_MERCHANT_SLUG=threads-by-mara`
- `demo-merchants/threads-by-mara/lib/env.ts` — NEW — zod-validated env wrapper
- `demo-merchants/threads-by-mara/README.md` — NEW — one-screen merchant readme with `pnpm dev` quickstart and deploy notes
- `demo-merchants/threads-by-mara/public/products/*.jpg` — NEW (or hot-link via next/image domains) — product imagery
- `demo-merchants/threads-by-mara/tsconfig.json` — NEW — extends `tsconfig.base.json`
- `demo-merchants/threads-by-mara/biome.json` — NEW — extends root biome config

## Shell verification

```bash
pnpm --filter threads-by-mara install
test $? -eq 0

# Dev server boots on 4101
PORT=4101 pnpm --filter threads-by-mara dev &
DEV_PID=$!
sleep 8
curl -sf http://localhost:4101 | grep -q "Threads by Mara"
curl -sf http://localhost:4101/products/heavyweight-hoodie | grep -q "75"
kill $DEV_PID

# Build green
pnpm --filter threads-by-mara build
test $? -eq 0

# <PatronButton> wired
grep -RIn "PatronButton" demo-merchants/threads-by-mara/app demo-merchants/threads-by-mara/components | grep -q "from '@patron/react'"

# Catalog has >= 6 products, no lorem ipsum
node -e "const p = require('./demo-merchants/threads-by-mara/lib/products.ts'); if (p.PRODUCTS.length < 6) process.exit(1); for (const x of p.PRODUCTS) { if (/lorem/i.test(x.description)) process.exit(1); }"

# 400-LOC
for f in $(find demo-merchants/threads-by-mara -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done

# Biome clean
pnpm --filter threads-by-mara lint
```

## Notes

- **Fashion vertical — this is the storefront the Demo Day judges see first (PRD § Demo moment Stage 1).** The $75 product in the demo script is the `heavyweight-hoodie`.
- **Independent visual identity required.** This is a real-looking merchant brand, NOT a Patron-skinned storefront. Use a different palette (warm earth tones) and a different display font (Playfair Display or similar serif) from the Patron app's Fraunces + deep-indigo system. Goal: a judge browsing should believe Threads by Mara is a real boutique that adopted Patron — not a fake.
- **No lorem ipsum.** Real product names, real(-ish) descriptions, real prices. Mara is the imaginary founder — write a 2-sentence "about" blurb in the footer.
- Per ux-spec § Demo shape Stage 1: the "Pay with Patron" button MUST be visually prominent on the product detail page. Position it as the primary CTA above the secondary "Add to cart".
- Use `@patron/react` (NOT `@patron/sdk-js`) here. Story-101 (pixelink) uses the vanilla SDK so both surfaces are exercised on Demo Day.
- The hot-link Unsplash strategy: pick 6 stable Unsplash photo IDs in advance, hard-code the URLs in `lib/products.ts`. Add `images.unsplash.com` to `next.config.ts` image domains.
- Trust strip on the homepage: a small lockup ("Pay with Patron — your savings keep earning") with a tooltip explaining the yield-vs-loan math. Drives curiosity before the judge even reaches a product page.
- This merchant is the visual anchor of the entire submission video. Spend the time making it look real.
- Deploys to `threads-by-mara.patron.xyz` per story-104.
- File size < 400 LOC enforced per file.
