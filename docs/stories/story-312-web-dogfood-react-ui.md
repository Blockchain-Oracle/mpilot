# Story — Rewrite `apps/web/app/app/*` to consume `@mpilot/react-ui` (dogfood)

**ID:** story-312-web-dogfood-react-ui
**Epic:** Epic E7 — Web App
**Depends on:** story-311-react-ui-styled, story-100-next-app-scaffold, stories 107-115 (existing web app components)
**Estimate:** ~2h
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** Concierge maintainer
**I want to** the production web app at `concierge.xyz/app` import + render every card directly from `@mpilot/react-ui`, not duplicate the component code inside `apps/web/components/`
**So that** our flagship is a true reference consumer of our own SDK — proving the components work end-to-end and removing duplication risk

---

## File modification map

- `apps/web/package.json` — UPDATE — add runtime dep on `@mpilot/react-ui` (`workspace:*`) + `@mpilot/react` + `@mpilot/sdk`
- `apps/web/app/app/page.tsx` — UPDATE — replace inline dashboard with `<ConciergeProvider>` + `<TickStream>` + `<PortfolioCard>` + `<EmergencyStop>` from `@mpilot/react-ui`
- `apps/web/app/app/ticks/page.tsx` — UPDATE — replace inline TickCard with `import { TickCard } from '@mpilot/react-ui'`
- `apps/web/app/app/ticks/[tickId]/page.tsx` — UPDATE — same
- `apps/web/app/app/agent/[id]/page.tsx` — UPDATE — replace inline with `<ReputationChart>` + `<AgentNFTCard>` from `@mpilot/react-ui`
- `apps/web/app/app/portfolio/page.tsx` — UPDATE — `<PortfolioCard>` + per-position rows from `@mpilot/react-ui`
- `apps/web/app/app/goal/page.tsx` — UPDATE — `<GoalInput>` from `@mpilot/react-ui`
- `apps/web/components/` — DELETE — all components moved to packages
- `apps/web/styles/globals.css` — UPDATE — import `@mpilot/react-ui/dist/styles.css`

---

## Acceptance criteria (BDD)

```
Given `apps/web/components/` directory
When inspected after this story
Then it does NOT contain TickCard.tsx, ProposalCard.tsx, PortfolioCard.tsx, ReputationChart.tsx, EmergencyStop.tsx, GoalInput.tsx (all moved to @mpilot/react-ui)

Given `apps/web/app/app/page.tsx`
When grep runs
Then it imports `from '@mpilot/react-ui'` for all UI primitives AND does NOT inline JSX duplicating the card structure

Given the web app builds
When `pnpm --filter @mpilot/web build` runs
Then exit code is 0 AND `next build` produces a valid output

Given Playwright e2e suite runs
When `pnpm --filter @mpilot/web e2e` runs against the built app
Then existing visual + interaction tests pass UNCHANGED (no regressions from the move)

Given lighthouse audit
When run against the built app
Then accessibility score ≥ 95 (was already required; verify nothing regressed)

Given anti-duplication check
When `grep -rE "function (TickCard|ProposalCard|PortfolioCard|ReputationChart)" apps/web/` runs
Then no matches (no duplicate definitions in apps/web/)
```

---

## Shell verification

```bash
# All cards must be sourced from the package, not redefined in apps/web/
! find apps/web/components/ -name "TickCard*" 2>/dev/null | head -1 | grep -q .
! find apps/web/components/ -name "ProposalCard*" 2>/dev/null | head -1 | grep -q .

# Imports from @mpilot/react-ui present in app pages
grep -q "from '@mpilot/react-ui'" apps/web/app/app/page.tsx
grep -q "from '@mpilot/react-ui'" apps/web/app/app/portfolio/page.tsx

# No duplicate component definitions
! grep -rE "function (TickCard|ProposalCard|PortfolioCard|ReputationChart)\s*\(" apps/web/app/

pnpm --filter @mpilot/web build
pnpm --filter @mpilot/web e2e
```

---

## Notes for coding agent

- **This story removes code** — that's the point. Net LOC should DECREASE in `apps/web/`. If you find yourself adding components in `apps/web/`, fix `@mpilot/react-ui` instead (per ADR-015 web-app dogfood requirement).
- **Brand tokens** come from `@mpilot/ui` consumed by `@mpilot/react-ui`'s styles.css. The web app only needs `import '@mpilot/react-ui/dist/styles.css'` once in `globals.css`.
- **Composition is the goal** — pages compose primitives. Don't add app-specific variants of cards inside the app; if a card needs a variant, add it to the package.
- **Existing e2e tests MUST pass.** This is a behavior-preserving migration. Visual regression baselines may need to be re-anchored AFTER this story (run sahil-visual-loop's anchor capture once on completion).
- Cross-ref: ADR-015 (dogfood requirement explicit), `08-ux-component-intent.md` (visual contract).
