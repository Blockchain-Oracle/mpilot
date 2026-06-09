# Story 66 — Landing final CTA + Footer

**Epic:** Epic 4 — Web App
**Estimated:** ~1.5h
**Depends on:** story-62-shared-ui-package-bootstrap

## BDD Acceptance Criteria

```
Given a visitor scrolls to the bottom of /
When the final CTA section renders
Then it has a large `<PatronButton variant="primary" size="lg">` labeled "Connect wallet" linking to /connect
And a secondary `<PatronButton variant="secondary" size="lg">` labeled "Open in Telegram" linking to https://t.me/PatronBot/app?startapp=landing
And a one-line copy: "BNPL that pays you back — and proves it on-chain."

Given the footer renders below
When the user inspects it
Then it contains: column 1 (logo + tagline), column 2 (Product: How it works, Merchants, Audit receipts), column 3 (Company: About, Docs, X/Twitter, GitHub), column 4 (Legal: Privacy, Terms, ERC-8004)
And the footer background is --bg-inverse (#0A0A0A)
And footer text is --fg-inverse
And the footer includes a "Built for Mantle Turing Test 2026" line

Given the visitor clicks "Open in Telegram" on desktop
When the link resolves
Then it opens https://t.me/PatronBot/app?startapp=landing in a new tab (target="_blank" + rel="noopener noreferrer")

Given Playwright runs apps/web/e2e/landing-cta-footer.spec.ts
When the spec executes
Then both CTAs are visible, footer columns render, and "Built for Mantle Turing Test 2026" is present
```

## File modification map

- `apps/web/components/landing/LandingCTA.tsx` — NEW — final CTA band with --bg-inverse background, --fg-inverse text, large CTAs.
- `apps/web/components/landing/Footer.tsx` — NEW — 4-column footer; uses semantic `<footer>` + `<nav aria-label="Footer">`.
- `apps/web/app/page.tsx` — UPDATE — append `<LandingCTA />` + `<Footer />` after `<MerchantLogos />`.
- `packages/shared/src/links.ts` — NEW — canonical external links: `TELEGRAM_DEEP_LINK_BASE`, `GITHUB_REPO_URL`, `X_HANDLE`, `MANTLE_DOCS_URL`. Used by footer + story-79.
- `apps/web/e2e/landing-cta-footer.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter web build
test $? -eq 0

# CTAs render
curl -sf http://localhost:3000 | grep -q "Connect wallet"
curl -sf http://localhost:3000 | grep -q "Open in Telegram"
curl -sf http://localhost:3000 | grep -q "Built for Mantle Turing Test"

# Telegram deep link format
grep -q "t.me/PatronBot/app?startapp=" packages/shared/src/links.ts

# Footer columns
curl -sf http://localhost:3000 | grep -q "How it works"
curl -sf http://localhost:3000 | grep -q "Merchants"
curl -sf http://localhost:3000 | grep -q "Privacy"
curl -sf http://localhost:3000 | grep -q "ERC-8004"

# Playwright
pnpm playwright test apps/web/e2e/landing-cta-footer.spec.ts
test $? -eq 0
```

## Notes

- The "Connect wallet" CTA is the primary conversion path — make it the visually heaviest element of the CTA band.
- "Open in Telegram" deep link format is **canonical**: `https://t.me/PatronBot/app?startapp=<param>`. The `<param>` is the deep-link payload Mini App parses on boot (full handling in story-79 + story-88).
- Tagline copy is pulled from PRD § Tagline candidates: *"BNPL that pays you back — and proves it on-chain."*
- Footer is dark band (--bg-inverse) — visually anchors the bottom of the cream page and matches Mercury's pattern.
- `packages/shared/src/links.ts` centralizes external URLs — avoids drift between footer, share buttons, OG metadata.
- Banned Tailwind classes auto-checked.
- File size < 400 LOC enforced.
- This story closes the landing arc — landing is now complete and demo-shape Stage 1 is fully served.
