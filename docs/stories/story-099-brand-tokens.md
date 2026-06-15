# Story — `@mpilot/ui` brand tokens package scaffold

**ID:** story-099-brand-tokens
**Epic:** Epic E14 — Composable UI
**Depends on:** story-00-monorepo-scaffold, story-01-biome-and-loc-enforcement, story-02-typescript-config
**Estimate:** ~1h
**Status:** PENDING (NEW 2026-06-14)

---

## User story

**As a** designer agent producing Concierge's visual identity per `docs/FRONTEND-BRIEF.md`
**I want to** publish brand decisions (color, type, spacing, motion, radii, shadows) into a single tree-shakeable package at `@mpilot/ui` that every styled UI consumer (`@mpilot/react-ui`, `apps/web`, `apps/docs`) imports
**So that** there is ONE source of truth for brand tokens; visual choices live with the designer (per ADR-018), and code packages only enforce the export shape — never the values

---

## Context

Per ADR-018 (designer handoff), this story scaffolds the export *shape* and *types* of `@mpilot/ui`. **Visual choices are deferred to the designer agent** working from `docs/FRONTEND-BRIEF.md`. The token VALUES committed in this story are intentional placeholders; the designer agent overwrites them in a follow-on PR. This story's verification gate enforces tree-shakeability, type safety, and the public-export contract — NOT specific hex codes or font choices.

---

## File modification map

- `packages/ui/package.json` — NEW — `"type": "module"`, `"sideEffects": false`, `"engines.node": ">=22"`, no runtime deps, peer dep on `tailwindcss ^4` only. `tsup` build. Exports map:
  - `.` → `./dist/index.js`
  - `./colors` → `./dist/colors.js`
  - `./typography` → `./dist/typography.js`
  - `./spacing` → `./dist/spacing.js`
  - `./motion` → `./dist/motion.js`
  - `./radii` → `./dist/radii.js`
  - `./shadows` → `./dist/shadows.js`
  - `./tailwind-preset` → `./dist/tailwind-preset.js`
  - `./css` → `./dist/tokens.css` (CSS custom properties for non-Tailwind consumers)
- `packages/ui/src/colors.ts` — NEW — exports `colors: { brand: {...}, semantic: {...}, neutral: {...} } as const`. Placeholder values; designer overwrites. ~40 LOC.
- `packages/ui/src/typography.ts` — NEW — exports `typography: { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } as const`. ~30 LOC.
- `packages/ui/src/spacing.ts` — NEW — exports `spacing: Record<string, string> as const`. ~20 LOC.
- `packages/ui/src/motion.ts` — NEW — exports `motion: { duration, easing } as const`. Includes `prefers-reduced-motion` fallback ramps. ~20 LOC.
- `packages/ui/src/radii.ts` — NEW — exports `radii: Record<string, string> as const`. ~15 LOC.
- `packages/ui/src/shadows.ts` — NEW — exports `shadows: Record<string, string> as const`. ~15 LOC.
- `packages/ui/src/tailwind-preset.ts` — NEW — exports default Tailwind v4 `@theme` preset object composed from the above token modules. ~40 LOC.
- `packages/ui/src/tokens.css` — NEW — CSS custom properties (`--concierge-color-brand-primary: ...`) mirroring every TS token. ~80 LOC.
- `packages/ui/src/index.ts` — NEW — barrel: re-exports `colors`, `typography`, `spacing`, `motion`, `radii`, `shadows`, plus inferred types `Colors`, `Typography`, etc. via `typeof`. ~20 LOC.
- `packages/ui/src/__tests__/exports.test.ts` — NEW — ≥ 8 cases: subpath imports resolve, types are `as const`-frozen literals, every TS token has a matching CSS custom property name, no token value is empty string, no token references `undefined`, tailwind preset shape valid.
- `packages/ui/tsconfig.json` — NEW — extends base; `"declaration": true`, `"declarationMap": true`.
- `packages/ui/tsup.config.ts` — NEW — multi-entry build (one entry per subpath), `format: ['esm']`, `dts: true`, `sourcemap: true`, `clean: true`.
- `packages/ui/README.md` — NEW — quickstart for designer agent (where to edit), consumer snippet for `@mpilot/react-ui`, and `tailwind.config.ts` integration.

---

## Acceptance criteria (BDD)

```
Given `packages/ui/package.json` exists
When `node -e "const p = require('./packages/ui/package.json'); console.log([p.type, p.sideEffects, p.engines.node].join(','))"` runs
Then output is "module,false,>=22"

Given the package has subpath exports
When the consumer does `import { colors } from '@mpilot/ui/colors'`
Then TypeScript resolves the module AND `colors` is typed as a deeply-readonly literal object (NOT widened to `Record<string, string>`)

Given a consumer imports only one token subpath
When the consumer bundles for production
Then unused token modules are tree-shaken (verified by checking that `import '@mpilot/ui/colors'` does NOT pull `motion.ts` into the bundle)

Given the Tailwind preset is consumed
When a downstream Tailwind v4 config does `import preset from '@mpilot/ui/tailwind-preset'`
Then it returns an object compatible with Tailwind v4's `@theme` directive AND references the same token values as the TS exports

Given the CSS export is consumed
When a non-Tailwind app does `@import '@mpilot/ui/css'`
Then every token defined in TS has a matching `--concierge-*` custom property declared on `:root`

Given the token files are inspected
When grep runs for visual choices the designer has not yet made
Then placeholder values DO appear (this story does NOT commit final brand values per ADR-018) AND the README explicitly flags the designer-handoff status

Given typecheck + LOC + lint
When `pnpm typecheck && pnpm check-file-loc && pnpm lint --filter @mpilot/ui` runs
Then all exit 0

Given the package builds
When `pnpm --filter @mpilot/ui build` runs
Then `dist/index.js`, `dist/colors.js`, `dist/typography.js`, `dist/spacing.js`, `dist/motion.js`, `dist/radii.js`, `dist/shadows.js`, `dist/tailwind-preset.js`, `dist/tokens.css`, AND matching `.d.ts` files all exist

Given the exports test
When `pnpm --filter @mpilot/ui test` runs
Then ≥ 8 cases pass
```

---

## Shell verification

```bash
test -f packages/ui/package.json
test -f packages/ui/src/colors.ts
test -f packages/ui/src/typography.ts
test -f packages/ui/src/spacing.ts
test -f packages/ui/src/motion.ts
test -f packages/ui/src/radii.ts
test -f packages/ui/src/shadows.ts
test -f packages/ui/src/tailwind-preset.ts
test -f packages/ui/src/tokens.css
test -f packages/ui/src/index.ts
test -f packages/ui/README.md

# Package shape
node -e "
  const p = require('./packages/ui/package.json');
  if (p.type !== 'module') process.exit(1);
  if (p.sideEffects !== false) process.exit(2);
  if (p.dependencies && Object.keys(p.dependencies).length > 0) process.exit(3);
  for (const sub of ['.', './colors', './typography', './spacing', './motion', './radii', './shadows', './tailwind-preset', './css']) {
    if (!p.exports?.[sub]) { console.error('missing export:', sub); process.exit(4); }
  }
"

# All token modules use `as const` (no widened types)
for f in colors typography spacing motion radii shadows; do
  grep -qE "as const" packages/ui/src/${f}.ts || { echo "$f not as const"; exit 1; }
done

# Build + tests
pnpm --filter @mpilot/ui build
test -f packages/ui/dist/colors.js
test -f packages/ui/dist/tokens.css
pnpm --filter @mpilot/ui test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 8 {exit 0} {exit 1}'

# LOC budget + typecheck
pnpm check-file-loc
pnpm typecheck
```

---

## Notes for coding agent

- **DO NOT make visual choices in this story.** Per ADR-018 the designer agent owns brand values. The coding agent's job here is to enforce the SHAPE (export structure, type narrowness, tree-shakeability, CSS↔TS parity). Use any plausible placeholder values (e.g. `#000` / `#fff` / system fonts); the designer overwrites them in the very next PR while consuming `docs/FRONTEND-BRIEF.md`.
- **`as const` is mandatory** on every token export so consumers get literal types (`'#0066ff'`, not `string`). Required for downstream type-safe Tailwind preset typing.
- **Tree-shakeability:** every subpath maps to its own bundle entry. NEVER re-export through a side-effect-having module. `"sideEffects": false` is load-bearing.
- **CSS↔TS parity test** ensures the designer can't update one surface without the other. The test parses `tokens.css` and asserts every `--concierge-*` custom property has a matching TS token (and vice versa).
- **Tailwind v4 preset shape:** v4 uses `@theme` directive (not `theme.extend`). Verify via context7 before pinning the preset shape.
- **No runtime deps.** Tailwind is peer-only because consumers may use the CSS export without Tailwind.
- **README must include:** (a) "designer agent — start here" pointer to `docs/FRONTEND-BRIEF.md`; (b) the Tailwind v4 wiring snippet; (c) the non-Tailwind CSS-import path.
- Cross-ref: ADR-013 (designer owns visual), ADR-015 (styled layer consumes these), ADR-018 (ESM-only, peer deps, designer handoff), `docs/FRONTEND-BRIEF.md`.
