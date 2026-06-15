# Story — `@mpilot/react-ui` styled drop-in cards

**ID:** story-311-react-ui-styled
**Epic:** Epic E14 — Composable UI
**Depends on:** story-310-react-headless, story-100-next-app-scaffold (for Tailwind tokens)
**Estimate:** ~4h
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** developer who wants Concierge's official look-and-feel
**I want to** `pnpm add @mpilot/react-ui` and drop `<TickCard />`, `<ProposalCard />`, `<PortfolioCard />` etc. into my app, styled with Concierge brand tokens
**So that** I get the canonical Concierge visual without owning the source

---

## File modification map

- `packages/react-ui/package.json` — NEW — ESM-only per ADR-018; peer deps on `react`, `react-dom`, `@mpilot/react`, `tailwindcss ^4`; runtime deps on `@mpilot/ui` (brand tokens), Radix primitives, `class-variance-authority`, `lucide-react`
- `packages/react-ui/src/TickCard.tsx` — NEW — composes `<TickPart>` from `@mpilot/react`; renders the 12 lifecycle states from `08-ux-component-intent.md` § TickCard
- `packages/react-ui/src/ProposalCard.tsx` — NEW — composes `<ProposalPart>`; Approve/Reject/Edit buttons; uses `addToolOutput` for client-side tool callback
- `packages/react-ui/src/PortfolioCard.tsx` — NEW — composes `<PortfolioPart>`; per-position rows; HealthFactorGauge
- `packages/react-ui/src/ReputationChart.tsx` — NEW — composes `<ReputationPart>`; time series via Recharts (or equiv)
- `packages/react-ui/src/EmergencyStop.tsx` — NEW — sticky FAB w/ confirm modal; calls `agent.emergencyStop()`
- `packages/react-ui/src/GoalInput.tsx` — NEW — text area + LLM-extracted chips
- `packages/react-ui/src/MCPInstallSnippet.tsx` — NEW — tabbed code block per MCP host
- `packages/react-ui/src/SimulationCard.tsx` — NEW — nested mini-card inside TickCard
- `packages/react-ui/src/TxConfirmationCard.tsx` — NEW — tx hash + MantleScan link + replay button
- `packages/react-ui/src/AttestationCard.tsx` — NEW — ERC-8004 receipt detail
- `packages/react-ui/src/StatusPill.tsx` — NEW — reusable per lifecycle state, with `prefers-reduced-motion` fallback
- `packages/react-ui/src/styles.css` — NEW — brand tokens + Tailwind layers (consumer imports this once)
- `packages/react-ui/src/index.ts` — NEW — barrel
- `packages/react-ui/src/__tests__/` — NEW — Playwright component tests + visual regression baseline screenshots; ≥ 12 stories under Storybook (or RTL snapshot)
- `packages/react-ui/README.md` — NEW — install + render snippets + theming guide

---

## Acceptance criteria (BDD)

```
Given a TickCard is rendered with state='proposing'
When the component mounts
Then visually distinct from state='planning' (different status pill color), Approve/Reject buttons visible, reasoning section streams text

Given a TickCard transitions from state='executing' → state='confirmed'
When the new state arrives
Then status pill smoothly morphs (color crossfade + width tween, 250ms, FLIP technique) UNLESS prefers-reduced-motion (instant)

Given a ProposalCard with autopilot off
When state='proposing' arrives
Then countdown timer ("Auto-rejects in 4m 23s") is visible

Given a ProposalCard Approve is clicked
When the user confirms
Then `addToolOutput({ tool: 'proposeAction', toolCallId, output: { decision: 'approved' } })` fires

Given a PortfolioCard renders 7 positions across Aave + Ethena + Ondo
When the user expands a position
Then per-asset detail (amount, USD value, APR, HF contribution) is shown

Given a ReputationChart with 30 days of attestations
When the user clicks a point
Then it opens the corresponding tick detail page (consumer-supplied `onTickClick` callback)

Given the EmergencyStop button is clicked
When the user confirms the modal
Then `agent.emergencyStop()` is called AND the button transitions to "Stopped" state with Resume option

Given prefers-reduced-motion is set on the consumer's OS
When ANY component renders
Then NO animations play — final states render directly, status pill morphs become instant

Given accessibility audit
When axe-core runs against each component
Then 0 violations (WCAG AA)

Given Storybook builds
When `pnpm --filter @mpilot/react-ui storybook:build` runs
Then exit 0 AND at least 12 stories are present
```

---

## Shell verification

```bash
for f in TickCard ProposalCard PortfolioCard ReputationChart EmergencyStop GoalInput MCPInstallSnippet SimulationCard TxConfirmationCard AttestationCard StatusPill; do
  test -f packages/react-ui/src/${f}.tsx || { echo "missing: $f"; exit 1; }
done

# Peer deps shape — @mpilot/react MUST be peer (not runtime)
node -e "
  const p = require('./packages/react-ui/package.json');
  if (p.dependencies?.['@mpilot/react']) process.exit(1);
  if (!p.peerDependencies?.['@mpilot/react']) process.exit(2);
"

# Anti-regression: no banned slop patterns
! grep -rE "from-purple-500\s+to-pink-500" packages/react-ui/src/
! grep -rE "text-gray-600" packages/react-ui/src/
! grep -rE "Lorem ipsum|John Doe|\\$1,234\\.56" packages/react-ui/src/

# Anti-regression: tool-ui is design REFERENCE only, not a dep
! node -e "const p = require('./packages/react-ui/package.json'); if (p.dependencies?.['@assistant-ui/tool-ui']) process.exit(1); if (p.devDependencies?.['@assistant-ui/tool-ui']) process.exit(2);"

# Accessibility check via axe
pnpm --filter @mpilot/react-ui test:a11y 2>&1 | grep -q "0 violations"

pnpm --filter @mpilot/react-ui build
```

---

## Notes for coding agent

- **DESIGN REFERENCE — `@assistant-ui/tool-ui`** patterns (schema-driven, lifecycle-aware, parse-then-render, mobile-first, accessibility built in). NOT a runtime dependency. We compose Radix + shadcn primitives directly (same building blocks). MIT — attribute if any code patterns borrowed verbatim.
- **Per-card schema gating** (per ADR-014): every card calls `safeParseSerializableXxx(part.output)` (from `@mpilot/react` which inherits from `@mpilot/tools`) before rendering content. On parse fail → error region.
- **The 12 TickCard lifecycle states** are spec'd verbatim in `research/concierge/08-ux-component-intent.md` § TickCard. Implement ALL 12: pending / planning / simulating / proposing / awaiting-approval / auto-approved / executing / confirmed / attesting / attested / failed-simulation / failed-execution / rejected-by-user.
- **Status pill animation**: FLIP technique for state morphs, 250ms ease-out. Never bouncy. `prefers-reduced-motion` = instant.
- **Brand tokens** come from `@mpilot/ui` (the brand-token-only package). Designer agent populates that; this story just CONSUMES the tokens.
- **Web-app dogfood requirement** (per ADR-015): `apps/web/app/app/*` MUST consume these components. story-212 wires that up.
- **Anti-slop banned patterns** apply (architecture.md banned list): no purple-to-pink gradients, no text-gray-600 on white, no font-sans w/o explicit import.
- Cross-ref: ADR-013, ADR-015, ADR-017 (Rail 1), `08-ux-component-intent.md`, `09-tracks-and-judges.md` (UI/UX track criteria).
