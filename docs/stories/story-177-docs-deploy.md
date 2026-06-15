# Story — Docs deploy + landing footer link

**ID:** story-177-docs-deploy
**Epic:** Epic E10 — Docs Site
**Depends on:** story-176-docs-api-reference
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge user, judge, or developer
**I want to** the docs site is reachable at concierge.xyz/docs (same Vercel deploy as the marketing site), linked from the landing footer and from the dashboard nav, with proper SEO (OG images, sitemap, robots.txt)
**So that** the docs are discoverable from every surface AND search engines index them properly AND social previews look good

---

## File modification map

- `apps/web/components/landing/Footer.tsx` — NEW — global footer with docs link, repo link, X link, status link
- `apps/web/components/dashboard/SidePanel.tsx` — UPDATE (created in story-107) — adds "Docs" link in the secondary nav
- `apps/web/app/sitemap.ts` — NEW — Next.js dynamic sitemap (auto-generated for docs + marketing routes)
- `apps/web/app/robots.ts` — NEW — Next.js robots.txt
- `apps/web/app/docs/[[...slug]]/opengraph-image.tsx` — NEW — per-page OG image generation via @vercel/og
- `apps/web/components/docs/__tests__/Footer.test.tsx` — NEW — RTL test for footer

---

## Acceptance criteria (BDD)

```
Given the docs are deployed at concierge.xyz/docs
When the marketing site footer renders
Then it contains a "Docs" link that navigates to /docs

Given the dashboard's SidePanel
When inspected
Then it has a "Docs" link in the secondary nav

Given the sitemap
When fetched at /sitemap.xml
Then it includes every docs route AND every marketing route

Given the robots.txt
When fetched at /robots.txt
Then it allows crawling /docs/* and / but disallows /app/* (the auth-gated dashboard shouldn't be indexed)

Given a docs page (e.g., /docs/concepts/overview)
When the OG image is requested at /docs/concepts/overview/opengraph-image
Then a PNG is returned dynamically generated with the page title + Concierge branding

Given the docs deploy
When a user shares a docs URL on X/Twitter
Then the social card preview shows the page-specific OG image (NOT a generic site-wide OG)

Given the footer
When inspected for required links
Then it includes: Docs, GitHub, License (MIT), Security, X handle (or placeholder)

Given the footer
When the marketing landing page renders
Then it appears as the LAST section (after trust-signals from story-105)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given the OG image generation
When tested on a per-page route
Then the response Content-Type is image/png AND the image dimensions are 1200x630 (Open Graph spec)
```

---

## Shell verification

```bash
cd apps/web
test -f components/landing/Footer.tsx
test -f app/sitemap.ts
test -f app/robots.ts
test -f app/docs/\[\[...slug\]\]/opengraph-image.tsx

cd ../..

pnpm --filter @mpilot/web run build
test $? -eq 0

# Sitemap includes docs routes
grep -q "docs" apps/web/app/sitemap.ts

# robots.txt disallows /app
grep -q "/app" apps/web/app/robots.ts

# Tests pass
pnpm --filter @mpilot/web run test 2>&1 | grep "Footer" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **@vercel/og for OG image generation** is the canonical Next.js pattern. Per Context7 docs: edge-rendered, fast, no separate image hosting needed.
- **Per-page OG images** (not site-wide) is the modern best practice. Twitter / Slack / Discord previews show the specific page being shared — much better engagement than a generic site card.
- **robots.txt disallow /app/*** because that's auth-gated; indexing those routes would clutter search results with login redirects. Per Next.js robots.ts conventions.
- **Sitemap auto-includes everything** by walking the file-based routes. Update mechanism: when MDX files are added to /content/docs/, the sitemap regenerates next build.
- **Footer is the catch-all nav** — links to everything not in the primary nav. Don't bury important links here (the GitHub repo link belongs in the landing trust signals from story-105 too).
- **The dashboard SidePanel docs link** lets users jump to docs without leaving the app. Critical for "I forget how X works mid-task" UX.
- **OG image dimensions 1200×630** is the Open Graph spec. NOT 1200×600 (despite what some half-old tutorials suggest).
- **Domain `concierge.xyz` is locked.** All routes are subpaths, not subdomains (except mcp.concierge.xyz from story-133). Consistent UX.
- Cross-ref: `research/concierge/08-ux-component-intent.md` § footer + nav, ADR-011 (docs/web same deploy).
