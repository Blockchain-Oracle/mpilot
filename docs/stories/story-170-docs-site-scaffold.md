# Story — Docs site scaffold (Nextra v4 + MDX + design tokens)

**ID:** story-170-docs-site-scaffold
**Epic:** Epic E10 — Docs Site
**Depends on:** story-100-next-app-scaffold
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** mPilot maintainer
**I want to** the docs site is an MDX-driven Nextra v4 app served from `apps/web/app/docs/*` (same Next.js deployment as the marketing site), with the navigation tree + theming defined declaratively
**So that** documentation lives next to the code (single deploy + single PR cycle), MDX components can import live React components for embedded examples, and the docs don't require their own infra

---

## File modification map

- `apps/web/app/docs/layout.tsx` — UPDATE (created in story-100) — wraps docs in Nextra theme
- `apps/web/app/docs/page.tsx` — UPDATE — docs landing (table of contents)
- `apps/web/content/docs/_meta.tsx` — NEW — Nextra navigation tree definition
- `apps/web/content/docs/index.mdx` — NEW — docs landing page MDX
- `apps/web/next.config.ts` — UPDATE — Nextra MDX plugin wired in
- `apps/web/theme.config.tsx` — NEW — Nextra theme config (logo, GitHub link, sidebar, footer)
- `apps/web/components/docs/CodeExample.tsx` — NEW — reusable MDX component for live runnable code examples
- `apps/web/components/docs/Callout.tsx` — NEW — reusable Note/Warning/Tip callout
- `apps/web/components/docs/__tests__/CodeExample.test.tsx` — NEW — RTL test

---

## Acceptance criteria (BDD)

```
Given Nextra v4 is configured
When `pnpm --filter @mpilot/web run build` runs
Then exit code is 0 AND the build output includes /docs/* routes

Given the dev server runs
When the user navigates to /docs
Then they see the docs landing page with the Nextra-styled sidebar

Given an MDX file in apps/web/content/docs/
When a route is requested for it
Then Nextra renders the MDX with the configured theme

Given the navigation tree in _meta.tsx
When inspected
Then it lists the top-level docs sections: "Concepts", "Guides", "Reference", "Deploy"

Given the CodeExample component
When used in an MDX file with `<CodeExample lang="typescript">...code...</CodeExample>`
Then it renders with syntax highlighting + copy-to-clipboard button (reuses story-104 CodeBlock)

Given the Callout component
When used with type="warning"
Then it renders in alarm color with a warning icon

Given the docs site uses the marketing site's design tokens
When inspected
Then colors + typography match the landing page (no separate theme)

Given the docs root inherits global layout from /app/layout.tsx
When navigating between /docs and /
Then no full-page reload (consistent layout shell)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f app/docs/layout.tsx
test -f content/docs/_meta.tsx
test -f content/docs/index.mdx
test -f theme.config.tsx
test -f components/docs/CodeExample.tsx
test -f components/docs/Callout.tsx

cd ../..

pnpm --filter @mpilot/web run build
test $? -eq 0
pnpm run typecheck

# Nextra wired into next config
grep -qE "(nextra|withNextra)" apps/web/next.config.ts

# MDX content directory exists
test -d apps/web/content/docs/

# Tests pass
pnpm --filter @mpilot/web run test 2>&1 | grep "CodeExample" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Nextra v4 (NOT v3)** is the latest stable line with full App Router support. Per Context7 docs verification — v3 had quirks with RSC; v4 cleaned them up.
- **Docs live in the same Next.js app**, NOT a separate Mintlify/Docusaurus deployment. Single deploy, single PR cycle. The marketing site + dashboard + docs all ship together.
- **MDX in `apps/web/content/docs/`** keeps docs source separate from React pages but still co-located in the repo. Nextra's file-based routing means the docs URL structure mirrors this folder.
- **Live React component embedding** is the killer feature. Docs pages can import the actual ProposalCard or TickStream component and render it with sample props — judges see the real component, not a screenshot.
- **Shared design tokens** ensure docs look like part of the product, not a separate Notion clone.
- **`CodeExample` reuses the CodeBlock from story-104** to avoid duplicate syntax-highlighting setups. Single shiki instance.
- **`Callout` uses semantic colors from design tokens** — warning/info/tip variants follow the same palette as the dashboard's badges.
- **Nextra's `_meta.tsx` is JSON-shaped**: keys are MDX filenames; values are display labels. Order matters (defines sidebar order).
- Cross-ref: `research/concierge/08-ux-component-intent.md` § docs, Nextra v4 docs (verify via Context7 at build time).
