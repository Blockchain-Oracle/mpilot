# Story — Live tick stream component (SSE-driven status pills with 4 UI states)

**ID:** story-108-tick-stream-live
**Epic:** Epic E7 — Web App
**Depends on:** story-107-app-dashboard-shell, story-61-vercel-ai-sdk-chat-api
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** Concierge user watching the dashboard
**I want to** a real-time tick stream in the SidePanel shows the current phase (plan/simulate/propose/execute/record) with status pills transitioning through Vercel AI SDK's four UI states (input-streaming → input-available → output-available → output-error)
**So that** I see the agent thinking AS it happens — not after — and the trust-via-visibility primitive of the wedge actually delivers

---

## File modification map

- `apps/web/components/dashboard/TickStream.tsx` — NEW — connects to `/api/agent/[id]/tick-stream` SSE endpoint, renders the 5 phase pills with state-driven styling
- `apps/web/components/dashboard/PhasePill.tsx` — NEW — single phase pill with the four UI states (pending: gray, streaming: pulse animation, available: green check, error: red X)
- `apps/web/app/api/agent/[id]/tick-stream/route.ts` — NEW — Next.js streaming route that subscribes to Redis pub/sub `agent:${id}:phase-update` channel and pipes events as SSE
- `apps/web/lib/hooks/useTickStream.ts` — NEW — React hook that opens SSE connection, parses events, exposes the current phase state
- `apps/web/components/dashboard/__tests__/PhasePill.test.tsx` — NEW — RTL test for each state
- `apps/web/components/dashboard/__tests__/TickStream.test.tsx` — NEW — RTL test with mock EventSource

---

## Acceptance criteria (BDD)

```
Given TickStream is mounted in the SidePanel
When the agent's tick begins (worker emits `phase-update` to Redis)
Then the SSE stream pushes the event AND the corresponding PhasePill transitions from 'pending' to 'streaming' within 500ms

Given a phase completes successfully
When the worker emits `phase-complete`
Then the PhasePill transitions from 'streaming' to 'available' (green check)

Given a phase fails
When the worker emits `phase-error`
Then the PhasePill transitions to 'error' (red X) with the error message available in a tooltip

Given the SSE connection drops
When the EventSource reconnects automatically
Then the latest phase state is restored (the SSE endpoint sends a `phase-snapshot` event on initial connect)

Given a NOOP tick result
When the plan phase reports `{ noop: true }`
Then the PhasePill shows 'noop' state (neutral checkmark, NOT green) — visually distinct from success

Given the four UI states per Vercel AI SDK pattern
When inspected
Then the four states (input-streaming, input-available, output-available, output-error) are represented in the rendered DOM via data-state attributes (NOT just className) — enables accessibility tooling

Given the SSE endpoint
When called without valid Privy session
Then it returns 401 (NOT silently disconnects)

Given the EventSource respects backoff
When the connection fails repeatedly
Then reconnection delay grows: 1s → 2s → 4s → max 30s (exponential backoff)

Given reduced motion preference
When `prefers-reduced-motion: reduce` is set
Then the streaming-state pulse animation is replaced with a static dot (no motion)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f components/dashboard/TickStream.tsx
test -f components/dashboard/PhasePill.tsx
test -f app/api/agent/\[id\]/tick-stream/route.ts
test -f lib/hooks/useTickStream.ts

cd ../..

pnpm --filter @concierge/web run build
test $? -eq 0

# Four UI states represented
for state in input-streaming input-available output-available output-error; do
  grep -q "$state" apps/web/components/dashboard/PhasePill.tsx || { echo "missing state: $state"; exit 1; }
done

# 401 auth gate
grep -qE "(return.*401|Response.*401)" apps/web/app/api/agent/\[id\]/tick-stream/route.ts

# prefers-reduced-motion
grep -q "prefers-reduced-motion" apps/web/components/dashboard/PhasePill.tsx

# Tests pass
pnpm --filter @concierge/web run test 2>&1 | grep -E "(TickStream|PhasePill)" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **THIS IS THE WEDGE'S TRUST PRIMITIVE.** Per `research/concierge/01-wedge-locked.md`: "user sees the agent thinking." If the tick stream is laggy, jittery, or unclear, the entire trust narrative breaks. Hold this component to a higher bar than typical UI.
- **SSE via Redis pub/sub** matches the architecture (story-65 propose phase publishes events). The web app does NOT directly call the worker; everything goes through Redis. This decouples scaling.
- **The four UI states from Vercel AI SDK** map directly to phase progress: `input-streaming` (LLM is generating), `input-available` (LLM finished, action proposed), `output-available` (action executed successfully), `output-error` (something failed). Per `research/concierge/04-agent-runtime.md` § 1.2.
- **`phase-snapshot` event on initial SSE connection** is critical — when a user opens the dashboard mid-tick, they need to see the CURRENT state, not wait for the next phase change.
- **Exponential backoff on reconnect** prevents thundering-herd if the server restarts. Browser EventSource doesn't natively backoff; implement in the hook.
- **NOOP state is visually distinct.** A successful tick that did nothing is different from a successful tick that supplied $100. Don't conflate them — users should understand "the agent looked and decided nothing was needed."
- **`data-state` attribute** is the canonical pattern for accessibility-friendly state. Screen readers can announce state changes via `aria-live` regions tied to the data-state.
- Cross-ref: `research/concierge/04-agent-runtime.md` § 1.2 UI states, `research/concierge/08-ux-component-intent.md` § live tick stream.
