# Story — `@mpilot/react` headless tool-part components + hooks

**ID:** story-310-react-headless
**Epic:** Epic E14 — Composable UI (NEW, post-2026-06-09 rework)
**Depends on:** story-300-tools-registry
**Estimate:** ~3h
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** developer building my own chat UI for mPilot
**I want to** `pnpm add @mpilot/react` and render headless components that handle ARIA + state machines + parse-then-render, but bring my own styling
**So that** I can use mPilot's logic without inheriting the brand styling, suitable for embedding in my dApp's own design system

---

## File modification map

- `packages/react/package.json` — NEW — ESM-only per ADR-018, peer deps on `react ^18 || ^19`, `ai ^6`, `@ai-sdk/react ^3`, `zod`, runtime dep on `@mpilot/tools`
- `packages/react/src/ProposalPart.tsx` — NEW — headless component taking `part: ToolUIPart<{ proposeAction: { input, output } }>` prop; parses via `safeParseSerializableProposalCard`; renders ARIA-tagged regions; provides slots/render-props for visual layer
- `packages/react/src/TickPart.tsx` — NEW — same shape for tick lifecycle
- `packages/react/src/PortfolioPart.tsx` — NEW — same for portfolio
- `packages/react/src/ReputationPart.tsx` — NEW — same for reputation
- `packages/react/src/hooks/useTickStream.ts` — NEW — `useTickStream(agentId)` — SSE subscriber, returns `{ events, lastEvent, isActive }`
- `packages/react/src/hooks/useProposal.ts` — NEW — `useProposal(proposalId)` — fetch + subscribe to single proposal's lifecycle
- `packages/react/src/hooks/useReputation.ts` — NEW — `useReputation(agentId)` — paginated attestation history
- `packages/react/src/ConciergeProvider.tsx` — NEW — context provider for SSE URL, RPC URL, default agent
- `packages/react/src/index.ts` — NEW — barrel
- `packages/react/src/__tests__/` — NEW — unit tests for each component (RTL); ≥ 16 cases total
- `packages/react/README.md` — NEW — quickstart + the consume-with-Vercel-AI-SDK example from architecture.md ADR-015

---

## Acceptance criteria (BDD)

```
Given a ProposalPart receives a valid `tool-proposeAction` part in `output-available` state
When the component mounts
Then it renders an `<article role="region" aria-label="Proposal {id}">` element with descendant slot children (no styling)

Given the same component receives `state: 'input-streaming'`
When it renders
Then it shows a loading region with `aria-busy="true"` and NO action buttons

Given the same component receives `state: 'output-error'`
When it renders
Then it shows an error region with the `errorText` content AND no Approve/Reject buttons

Given a malformed tool output reaches the parse step
When `safeParseSerializableProposalCard` fails
Then ProposalPart renders an error region announcing schema-parse failure (does NOT crash)

Given a render-prop API: `<ProposalPart part={p} render={({ proposal, onApprove }) => <MyCustomCard />}>`
When `onApprove()` is called from the consumer's custom card
Then it triggers `addToolOutput` with the Vercel AI SDK shape `{ tool: 'proposeAction', toolCallId, output: { decision: 'approved' } }`

Given useTickStream is called with a valid agentId
When SSE events arrive
Then `events` accumulates AND `lastEvent` updates AND `isActive` reflects current tick phase

Given prefers-reduced-motion is set
When any part renders
Then all transition/animation hooks return `false` for "should animate"

Given typecheck + build + tests
When `pnpm --filter @mpilot/react build && pnpm --filter @mpilot/react test && pnpm typecheck` runs
Then all exit 0 with ≥ 16 RTL cases passing
```

---

## Shell verification

```bash
for f in ProposalPart TickPart PortfolioPart ReputationPart ConciergeProvider; do
  test -f packages/react/src/${f}.tsx || { echo "missing: $f"; exit 1; }
done

for f in useTickStream useProposal useReputation; do
  test -f packages/react/src/hooks/${f}.ts || { echo "missing hook: $f"; exit 1; }
done

# Peer deps shape
node -e "
  const p = require('./packages/react/package.json');
  if (p.dependencies?.react) process.exit(1);  // react is PEER
  if (!p.peerDependencies?.react) process.exit(2);
  if (!p.peerDependencies?.ai?.startsWith('^6')) process.exit(3);
"

# Anti-regression: NO styling. No Tailwind classes. No inline styles.
! grep -rE "className=['\"]([a-z]+-[a-z]+|bg-|text-|p-|m-|flex)" packages/react/src/
! grep -rE "style=\{\{" packages/react/src/

# Anti-regression: NO direct DOM-level styling concerns. Only role / aria-* / data-*.
pnpm --filter @mpilot/react build
pnpm --filter @mpilot/react test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 16 {exit 0} {exit 1}'
```

---

## Notes for coding agent

- **HEADLESS means: ZERO CSS, ZERO Tailwind, ZERO inline styles.** Only `role`, `aria-*`, `data-state` attributes for selectors. Visual layer is `@mpilot/react-ui` (story-211) which composes these.
- **Parse-then-render gating:** every component calls `safeParseSerializableXxx(part.output)` before rendering content. On `success: false`, render an error region — never throw.
- **Render-prop API** is the primary composition pattern:
  ```tsx
  <ProposalPart part={p} render={({ proposal, state, onApprove, onReject, onEdit }) => (
    <MyApp.Card>
      <MyApp.Heading>{proposal.actionSummary}</MyApp.Heading>
      <MyApp.Button onClick={onApprove}>Approve</MyApp.Button>
    </MyApp.Card>
  )} />
  ```
- **Default (no render prop):** render a semantic structure (`<article>` + `<header>` + `<section>`) with ARIA labels and `data-state="proposing"` so consumers can style via attribute selectors.
- **`prefers-reduced-motion`:** all hooks expose an `animate: boolean` flag; visual layer respects it. Headless layer doesn't animate.
- **No state library in this package.** Use `useState` + `useReducer`. Zustand/etc. is a v1.1 perf optimization.
- Cross-ref: ADR-013 (designer owns visual), ADR-015 (headless + styled split), ADR-017 (Rail 1 gen UI), AUDIT-2026-06-09 §1 (Vercel AI SDK v6 `ToolUIPart` type verbatim).
