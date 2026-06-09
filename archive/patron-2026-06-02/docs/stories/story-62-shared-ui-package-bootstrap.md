# Story 62 — packages/ui bootstrap (Button + Card + Modal)

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-61-design-tokens-and-fonts

## BDD Acceptance Criteria

```
Given packages/ui is installed
When apps/web imports `import { PatronButton } from "@patron/ui"`
Then the import resolves via workspace alias
And no bundler warnings appear

Given a developer renders <PatronButton variant="primary">Click me</PatronButton>
When the component mounts
Then it has class `bg-[--accent] text-[--fg-inverse]`
And it has `rounded-[12px]` (radius-button per ux-spec)
And it has a visible focus ring (`focus-visible:ring-2 ring-[--accent]`)
And hover background switches to `--accent-hover` with 150ms transition on `background-color` (NOT transition-all)

Given a developer renders <Card>...</Card>
When the component mounts
Then it has `bg-[--bg-elevated]` + `border-[--border]` + `rounded-[16px]` + `shadow-[--shadow-soft]`

Given a developer renders <Modal open onClose={fn}>...</Modal>
When the modal is open
Then it traps focus inside the modal (Tab cycles only inside)
And Escape key closes the modal
And clicking the backdrop closes the modal
And the modal has `role="dialog"` + `aria-modal="true"`
And the modal has `rounded-[24px]` (radius-modal per ux-spec)

Given each component file
When line count is measured
Then each is under 400 lines (Biome enforces)
And each is in its own folder: packages/ui/src/PatronButton/PatronButton.tsx, packages/ui/src/Card/Card.tsx, packages/ui/src/Modal/Modal.tsx

Given Vitest is configured for packages/ui
When `pnpm --filter @patron/ui test` runs
Then all 3 component tests pass (render + variant + a11y)
```

## File modification map

- `packages/ui/package.json` — UPDATE — peerDeps: react@19, react-dom@19; deps: `clsx@latest`, `tailwind-variants@latest`. Add `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom` to devDeps. Exports: `"."`, `"./tokens.css"`, `"./styles"`.
- `packages/ui/src/index.ts` — NEW — re-export `PatronButton`, `Card`, `Modal`.
- `packages/ui/src/PatronButton/PatronButton.tsx` — NEW — variants: `primary`, `secondary`, `ghost`, `danger`. Sizes: `sm`, `md`, `lg`. Loading state with spinner. Props typed via Zod schema.
- `packages/ui/src/PatronButton/PatronButton.test.tsx` — NEW — render variants + click + disabled + loading + focus ring.
- `packages/ui/src/Card/Card.tsx` — NEW — supports `<Card.Header>`, `<Card.Body>`, `<Card.Footer>` subcomponents.
- `packages/ui/src/Card/Card.test.tsx` — NEW — render + subcomponent composition.
- `packages/ui/src/Modal/Modal.tsx` — NEW — built on Radix `Dialog` primitive (deps: `@radix-ui/react-dialog`). Focus trap + escape + backdrop close baked in.
- `packages/ui/src/Modal/Modal.test.tsx` — NEW — open/close + escape key + backdrop click + focus trap (Testing Library `userEvent.tab`).
- `packages/ui/src/lib/cn.ts` — NEW — `clsx` + `tailwind-variants` re-export helper.
- `packages/ui/vitest.config.ts` — NEW — jsdom environment, setupFiles for `@testing-library/jest-dom`.
- `packages/ui/tsconfig.json` — UPDATE — already extends base; add `"types": ["vitest/globals", "@testing-library/jest-dom"]`.

## Shell verification

```bash
pnpm install
pnpm --filter @patron/ui typecheck
pnpm --filter @patron/ui test
test $? -eq 0

# Each component is in its own folder + single file
test -f packages/ui/src/PatronButton/PatronButton.tsx
test -f packages/ui/src/Card/Card.tsx
test -f packages/ui/src/Modal/Modal.tsx

# 400-LOC enforcement
wc -l packages/ui/src/PatronButton/PatronButton.tsx | awk '{ if ($1 > 400) exit 1 }'
wc -l packages/ui/src/Card/Card.tsx | awk '{ if ($1 > 400) exit 1 }'
wc -l packages/ui/src/Modal/Modal.tsx | awk '{ if ($1 > 400) exit 1 }'

# Index re-exports
grep -q "PatronButton" packages/ui/src/index.ts
grep -q "Card" packages/ui/src/index.ts
grep -q "Modal" packages/ui/src/index.ts

# Web app can import from @patron/ui
cd apps/web && pnpm typecheck
```

## Notes

- **Context7 first**: query Radix UI Dialog + tailwind-variants docs.
- **Banned Tailwind classes** auto-checked via Biome rule from story-61 (e.g., no `transition-all`, no default purple).
- Components must work in BOTH web (Next 15 App Router, RSC-compatible) and mini (Next 15 inside TG WebView). Use `"use client"` directive only where required (Modal needs it; Card is RSC-safe).
- Each component file < 400 LOC enforced by Biome (story-01). Refactor sub-pieces into sibling files in the same folder if needed (e.g., `Modal/ModalBackdrop.tsx`).
- The `<PatronButton>` is THE button on every Patron surface — landing, dashboard, checkout, merchant pages. Get it right; consistency = brand.
- Modal pattern is consumed by `<CheckoutModal>` (story-76) and confirmation flows.
- For premium components later (hero, footer), use the `premium-ui` skill — don't hand-roll generic shadcn.
- Vitest browser mode is allowed for component tests but jsdom is faster; default to jsdom.
