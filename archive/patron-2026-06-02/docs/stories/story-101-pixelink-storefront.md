# Story 101 — Pixelink storefront (digital goods vertical demo merchant)

**Epic:** Epic 7 — Demo Merchants
**Estimated:** ~2h
**Depends on:** story-91-sdk-js-button-component

## BDD Acceptance Criteria

```
Given the demo-merchants/pixelink workspace is installed
When `pnpm --filter pixelink dev` runs
Then a Next.js 15 dev server boots on port 4102
And the homepage renders a digital goods marketplace ("Pixelink — design assets for indie makers")
And a product grid lists at least 6 digital products (icon packs, UI kits, font bundles, illustration sets, Lottie packs, SVG libraries) with real names + USD prices
And no lorem ipsum text appears anywhere

Given the storefront uses @patron/sdk-js (vanilla JS variant)
When a visitor opens any product detail page /assets/:slug
Then a <div data-patron-button data-merchant="pixelink" data-amount="29" data-sku="iconic-pack-pro"></div> placeholder mounts
And the @patron/sdk-js script loads via <Script src=".../patron-sdk.js"> (Next.js Script with strategy="afterInteractive")
And the SDK auto-hydrates the placeholder into a clickable button on first paint
And the SDK is wired with the public merchant key from env

Given the visitor clicks the SDK-rendered button on a $29 icon pack
When POST /orders/intent succeeds and the agent confirms the purchase
Then the SDK's onSuccess callback fires with the orderId + tx hash + the merchant's deliverable URL
And the page shows a "Your license key" panel: <code>PXL-XXXX-YYYY-ZZZZ</code> + a "Download files" link
And the license key is persisted client-side under localStorage["pixelink:licenses"] keyed by orderId

Given a returning visitor opens /account
Then any past licenses (from localStorage) render with their download links

Given `pnpm --filter pixelink build` runs
Then exit code is 0
And the build is Vercel-deployable

Given the lighthouse a11y audit runs on the homepage
When the score is computed
Then accessibility ≥ 90
```

## File modification map

- `demo-merchants/pixelink/package.json` — UPDATE (scaffolded in story-00) — Next.js 15, React 19, `@patron/sdk-js@workspace:*`, Tailwind v4, Biome (NOTE: NOT `@patron/react` — this merchant uses the vanilla JS variant to prove both SDKs work)
- `demo-merchants/pixelink/next.config.ts` — NEW — allow image domains
- `demo-merchants/pixelink/tailwind.config.ts` — NEW — punchy tech palette (slate + electric magenta — visually distinct from Threads by Mara and from Patron's indigo)
- `demo-merchants/pixelink/app/layout.tsx` — NEW — header (logo + cart + account), footer; loads `@patron/sdk-js` via `next/script`
- `demo-merchants/pixelink/app/page.tsx` — NEW — homepage: hero, category strip (Icons / UI Kits / Fonts / Illustrations / Motion / Vectors), product grid
- `demo-merchants/pixelink/app/assets/[slug]/page.tsx` — NEW — product detail: preview gallery, includes-list, `<div data-patron-button …>` placeholder, "Add to wishlist"
- `demo-merchants/pixelink/app/account/page.tsx` — NEW — "Your licenses" list (read from localStorage); empty-state "Buy your first asset →" CTA
- `demo-merchants/pixelink/components/PatronButtonMount.tsx` — NEW — wraps the SDK placeholder; subscribes to the SDK's event callbacks via `window.Patron.on('success', ...)` to surface the license panel
- `demo-merchants/pixelink/lib/products.ts` — NEW — 6 real-named products: iconic-pack-pro ($29), forge-ui-kit ($89), serif-display-bundle ($49), lineart-illustration-set ($39), motion-lottie-pack ($25), vector-mark-library ($59). Each has deliverable URL stub + license-key generator.
- `demo-merchants/pixelink/lib/license.ts` — NEW — pseudo-random `PXL-XXXX-YYYY-ZZZZ` generator + localStorage adapter
- `demo-merchants/pixelink/components/Hero.tsx` — NEW
- `demo-merchants/pixelink/components/ProductCard.tsx` — NEW
- `demo-merchants/pixelink/components/Header.tsx` — NEW
- `demo-merchants/pixelink/components/Footer.tsx` — NEW
- `demo-merchants/pixelink/components/LicensePanel.tsx` — NEW — post-success UI with copy-key + download buttons
- `demo-merchants/pixelink/app/globals.css` — NEW
- `demo-merchants/pixelink/.env.local.example` — NEW — `NEXT_PUBLIC_PATRON_API_URL`, `NEXT_PUBLIC_PATRON_MERCHANT_KEY`, `NEXT_PUBLIC_PATRON_MERCHANT_SLUG=pixelink`, `NEXT_PUBLIC_PATRON_SDK_URL=https://cdn.patron.xyz/sdk-js/latest.js`
- `demo-merchants/pixelink/lib/env.ts` — NEW — zod env validation
- `demo-merchants/pixelink/README.md` — NEW — quickstart + deploy notes + "this merchant exercises @patron/sdk-js (vanilla) not @patron/react"
- `demo-merchants/pixelink/tsconfig.json` — NEW
- `demo-merchants/pixelink/biome.json` — NEW
- `demo-merchants/pixelink/public/previews/*` — NEW (or hot-link) — product preview imagery

## Shell verification

```bash
pnpm --filter pixelink install
test $? -eq 0

# Dev server boots
PORT=4102 pnpm --filter pixelink dev &
DEV_PID=$!
sleep 8
curl -sf http://localhost:4102 | grep -q "Pixelink"
curl -sf http://localhost:4102/assets/iconic-pack-pro | grep -qi "29"
kill $DEV_PID

# Build green
pnpm --filter pixelink build
test $? -eq 0

# Uses vanilla SDK, NOT react SDK
grep -RIn "@patron/sdk-js" demo-merchants/pixelink/app demo-merchants/pixelink/components | head -1
! grep -RIn "@patron/react" demo-merchants/pixelink/app demo-merchants/pixelink/components 2>/dev/null

# Catalog has >= 6 products, no lorem ipsum
node -e "const p = require('./demo-merchants/pixelink/lib/products.ts'); if (p.PRODUCTS.length < 6) process.exit(1); for (const x of p.PRODUCTS) { if (/lorem/i.test(x.description)) process.exit(1); }"

# 400-LOC
for f in $(find demo-merchants/pixelink -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done

pnpm --filter pixelink lint
```

## Notes

- **Digital goods vertical.** Pixelink represents the indie-creator-buying-design-assets segment (Gumroad / Creative Market shape). On Demo Day this merchant proves Patron isn't just for physical retail.
- **Critical SDK split:** this merchant uses **`@patron/sdk-js` (vanilla)** while story-100 (Threads by Mara) uses `@patron/react`. We exercise BOTH SDKs in the demo to show merchant flexibility. Do NOT import `@patron/react` here.
- The vanilla SDK contract: drop a `<div data-patron-button data-merchant="…" data-amount="…" data-sku="…">` placeholder, then load `<script src="…/patron-sdk.js">`; SDK auto-mounts and dispatches events on `window.Patron`.
- License-key delivery: this is the post-success flow that makes the digital-goods vertical believable. Generate a fake but well-formed `PXL-XXXX-YYYY-ZZZZ` key + a "Download files" stub link. The point isn't real downloads; it's that judges see the merchant fulfill its deliverable after the agent pays.
- localStorage persistence on `/account` simulates a logged-in account without auth — sufficient for the demo and avoids onboarding friction during the 90s walkthrough.
- **Distinct visual identity from Threads by Mara.** Slate + electric magenta vs. Threads' warm cream + olive. Different display font (Space Grotesk or similar). Goal: when judges flip between the three demo merchants they see three different brands, not three skins of the same template.
- Realistic product names — `iconic-pack-pro`, `forge-ui-kit`, `motion-lottie-pack` — feel like real indie-creator assets.
- Deploys to `pixelink.patron.xyz` per story-104.
- File size < 400 LOC enforced.
