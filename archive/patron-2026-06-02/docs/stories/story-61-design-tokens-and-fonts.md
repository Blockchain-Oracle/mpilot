# Story 61 — Design tokens + fonts (Fraunces + Inter + JetBrains Mono)

**Epic:** Epic 4 — Web App
**Estimated:** ~1.5h
**Depends on:** story-60-nextjs-15-scaffold

## BDD Acceptance Criteria

```
Given the web app boots
When the root layout renders
Then Fraunces (display/heading), Inter (body), and JetBrains Mono (numeric) are loaded via next/font
And font-display: swap is set (no FOIT)
And weights match ux-spec § Typography (Fraunces 500/600, Inter 400/500, JetBrains Mono 400/500)

Given a developer opens app/globals.css
When they search for design-token CSS variables
Then all 11 color tokens defined per ux-spec are present: --bg, --bg-elevated, --bg-inverse, --fg, --fg-muted, --fg-inverse, --accent, --accent-hover, --success, --warning, --danger, --border
And the values match ux-spec exactly (e.g., --bg: #FAF8F4, --accent: #1E40AF)

Given a developer uses a banned Tailwind class (e.g., `bg-gradient-to-r from-blue-500 to-purple-500`, `font-sans` alone, `text-blue-600`, `shadow-2xl`, `transition-all`, `backdrop-blur-xl`)
When `pnpm biome check apps/web` runs
Then Biome emits an error referencing ux-spec § "Banned Tailwind classes"
And exit code is non-zero

Given a component uses `text-[--accent]`
When the page renders
Then the computed text color is rgb(30, 64, 175) (deep indigo)

Given a user has `prefers-reduced-motion: reduce`
When any animation runs
Then duration collapses to 0ms (per ux-spec § Accessibility)
```

## File modification map

- `apps/web/app/layout.tsx` — UPDATE — import Fraunces + Inter + JetBrains Mono via `next/font/google`; expose via CSS variables `--font-display`, `--font-body`, `--font-mono`; attach to `<body>` className.
- `apps/web/app/globals.css` — UPDATE — add `:root` block with all 11 color tokens + `--radius-card: 16px`, `--radius-input: 12px`, `--radius-button: 12px`, `--radius-freeze: 28px`, `--radius-modal: 24px`, `--ease-spring: cubic-bezier(0.32, 0.72, 0, 1)`, `--shadow-soft: 0 1px 3px rgb(0 0 0 / 0.06), 0 2px 8px rgb(0 0 0 / 0.04)`. Add `@media (prefers-reduced-motion: reduce)` block.
- `apps/web/tailwind.config.ts` — NEW — Tailwind v4 inline theme: map font families to CSS vars, extend spacing to 8-point (`4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192`), expose color tokens.
- `biome.json` (root) — UPDATE — add custom rule `nursery/noRestrictedClasses` (or fallback regex via `scripts/check-banned-classes.mjs` if Biome rule unavailable) banning: `bg-gradient-to-r`, `bg-gradient-to-l`, `from-blue-500`, `to-purple-500`, `font-sans` (when alone), `text-blue-600`, `text-purple-600`, `shadow-2xl`, `transition-all`, `backdrop-blur-xl`, `text-xs`, `divide-y` on `<ul>`/`<ol>`.
- `scripts/check-banned-classes.mjs` — NEW — fallback regex scanner over `apps/web/**/*.tsx` + `apps/mini/**/*.tsx` + `packages/ui/**/*.tsx`; called from CI.
- `packages/ui/src/tokens.css` — NEW — same tokens, exported so packages/ui consumers (apps/mini, demo merchants) share the palette.
- `packages/ui/package.json` — UPDATE — add `"./tokens.css": "./src/tokens.css"` export.

## Shell verification

```bash
pnpm --filter web build
test $? -eq 0

# CSS tokens present
grep -q -- "--bg: #FAF8F4" apps/web/app/globals.css
grep -q -- "--accent: #1E40AF" apps/web/app/globals.css
grep -q -- "--danger: #B91C1C" apps/web/app/globals.css

# Fonts loaded via next/font
grep -q "Fraunces" apps/web/app/layout.tsx
grep -q "Inter" apps/web/app/layout.tsx
grep -q "JetBrains_Mono" apps/web/app/layout.tsx

# Banned class fails the check
echo 'export const X = () => <div className="bg-gradient-to-r from-blue-500 to-purple-500" />' > /tmp/banned.tsx
node scripts/check-banned-classes.mjs /tmp/banned.tsx
test $? -ne 0

# prefers-reduced-motion block present
grep -q "prefers-reduced-motion" apps/web/app/globals.css
```

## Notes

- **Context7 first**: query Tailwind v4 + next/font docs. Tailwind v4 dropped `tailwind.config.js` in favor of CSS-first `@theme` blocks — verify which surface is canonical.
- Fraunces is variable; load only the weight ranges we use (500-600) to keep bundle small.
- Inter via `next/font` is faster than Google Fonts CDN (zero layout shift, self-hosted).
- Color values are **non-negotiable** — they're the brand identity and judges will see them.
- The banned-classes scanner is the project's anti-slop guardrail; running it in CI prevents "generic shadcn purple" regressions.
- `--ease-spring: cubic-bezier(0.32, 0.72, 0, 1)` is the **only** approved easing for motion (per ux-spec).
- This story serves **all** demo-shape stages — design tokens are foundational.
