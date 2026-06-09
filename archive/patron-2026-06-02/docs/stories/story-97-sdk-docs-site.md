# Story 97 — Merchant SDK docs site (apps/docs, Nextra)

**Epic:** Epic 6 — Checkout SDKs
**Estimated:** ~2h
**Depends on:** story-91-sdk-js-button-component, story-95-sdk-react-patron-button

## BDD Acceptance Criteria

```
Given the monorepo is installed
When `pnpm --filter docs build` runs
Then exit code is 0
And a static Nextra site is emitted to apps/docs/.next or out/

Given a developer visits the docs site at /
When the index page renders
Then a hero section explains the SDK in one sentence + shows both install paths (npm + CDN)
And quick links to: "Quickstart", "@patron/sdk-js reference", "@patron/react reference", "Live examples"

Given the visitor opens /quickstart
When the page renders
Then a 3-step path for vanilla JS (script tag + init + button)
And a 3-step path for React (install + provider + button)
And copy-paste blocks have a 1-click copy affordance

Given the visitor opens /reference/sdk-js
When the page renders
Then every public API symbol is documented: init, mount, mountAll, unmount, openCheckout, on, off, types (PatronConfig, Intent, Success, Error, Cancel)
And each entry shows: signature, params, returns, example

Given the visitor opens /reference/react
When the page renders
Then PatronProvider, PatronButton, usePatronCheckout, usePatronEvent, usePatronStatus, usePatronModal are all documented with TS signatures + examples

Given the visitor opens /examples
When the page renders
Then 3 live, runnable examples:
  - "Vanilla JS, minimal" (CodeSandbox/StackBlitz embed)
  - "React + Tailwind storefront"
  - "Custom button with hooks"

Given the docs are deployed to Vercel at https://docs.patron.xyz
When DNS resolves
Then the site loads with HTTPS and the demo merchants' real Patron deployment is referenced

Given the docs include design tokens
When the visitor reads any page
Then the typography matches the Patron ux-spec (Fraunces + Inter)
And the accent color is the Patron deep indigo (#1E40AF)
```

## File modification map

- `apps/docs/package.json` — UPDATE — `nextra@latest`, `nextra-theme-docs@latest`, `next@15`, `react@19`, `@patron/sdk-js@workspace:*` (for live preview), `@patron/react@workspace:*`. Scripts: `dev` (port 3003), `build`, `start`, `lint`.
- `apps/docs/next.config.mjs` — NEW — `withNextra(...)` config; `transpilePackages: ['@patron/sdk-js', '@patron/react']`.
- `apps/docs/theme.config.tsx` — NEW — Nextra theme: project name "Patron Docs", logo, GitHub link, primary color from Patron tokens, footer.
- `apps/docs/pages/index.mdx` — NEW — landing/hero page with install paths.
- `apps/docs/pages/quickstart.mdx` — NEW — vanilla + React quickstart.
- `apps/docs/pages/reference/sdk-js.mdx` — NEW — full API reference for `@patron/sdk-js`.
- `apps/docs/pages/reference/react.mdx` — NEW — full API reference for `@patron/react`.
- `apps/docs/pages/examples/vanilla.mdx` — NEW — vanilla JS example + StackBlitz embed.
- `apps/docs/pages/examples/react.mdx` — NEW — React storefront example.
- `apps/docs/pages/examples/hooks.mdx` — NEW — custom button + hooks example.
- `apps/docs/pages/_meta.json` — NEW — sidebar order.
- `apps/docs/pages/reference/_meta.json` — NEW — reference subsection order.
- `apps/docs/pages/examples/_meta.json` — NEW — examples subsection order.
- `apps/docs/styles/globals.css` — NEW — design token CSS variables matching ux-spec; Fraunces + Inter font loading.
- `apps/docs/components/InstallTabs.tsx` — NEW — tabbed code block for npm + CDN + yarn install.
- `apps/docs/components/SandboxEmbed.tsx` — NEW — iframe wrapper for StackBlitz embeds.
- `apps/docs/.env.example` — NEW — `NEXT_PUBLIC_DOCS_URL`, `NEXT_PUBLIC_APP_URL_WEB`.

## Shell verification

```bash
pnpm --filter docs install
pnpm --filter docs build
test $? -eq 0

# Routes exist
test -f apps/docs/pages/index.mdx
test -f apps/docs/pages/quickstart.mdx
test -f apps/docs/pages/reference/sdk-js.mdx
test -f apps/docs/pages/reference/react.mdx
test -f apps/docs/pages/examples/vanilla.mdx
test -f apps/docs/pages/examples/react.mdx
test -f apps/docs/pages/examples/hooks.mdx

# Dev server boots
pnpm --filter docs dev &
DEV_PID=$!
sleep 5
curl -sf http://localhost:3003 | grep -qi "patron"
curl -sf http://localhost:3003/quickstart | grep -qi "install"
curl -sf http://localhost:3003/reference/sdk-js | grep -qi "init"
kill $DEV_PID
wait $DEV_PID 2>/dev/null || true

# Design tokens applied
grep -q "Fraunces\|Inter" apps/docs/styles/globals.css
grep -q "#1E40AF\|--accent" apps/docs/styles/globals.css

# 400-LOC
for f in $(find apps/docs -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/.next/*"); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **Context7 first**: query Nextra (v3 vs v4 have config differences) + Next.js 15 App Router compatibility (Nextra historically used Pages Router; v4 supports App Router).
- Documentation is required for the submission to be credible — judges + merchants will click through.
- Use real, runnable examples (StackBlitz/CodeSandbox embeds) — static code blocks don't sell the 1-line integration story.
- Reference pages should be generated from TS types where possible (manual MDX is fine for v1, automate post-hackathon).
- The hero on `/` should re-state the Patron tagline + show the famous 3-line snippet (script + button + done).
- Deploy to Vercel at `docs.patron.xyz` (separate subdomain from app + api).
- Design system: match ux-spec exactly so docs feel like part of the product, not a third-party site.
- Port 3003 keeps web (3000), api (3001), mini (3002), docs (3003) on distinct ports locally.
- File size < 400 LOC enforced.
- Required for the submission Day-13 deliverable (README links here for merchant docs).
