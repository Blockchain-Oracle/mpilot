# Story — Error boundary + toast system (typed errors → user-friendly messages)

**ID:** story-115-error-boundary-and-toasts
**Epic:** Epic E7 — Web App
**Depends on:** story-100-next-app-scaffold
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge user encountering an unexpected error (RPC down, IPFS gateway slow, session key expired)
**I want to** a global ErrorBoundary catches React render errors gracefully + a toast system surfaces actionable error messages (mapping typed errors from the SDK to user-friendly copy)
**So that** I see "Mantle RPC is having issues — try again in a moment" instead of "TypeError: Cannot read property 'address' of undefined" — actionable, never humiliating

---

## File modification map

- `apps/web/components/system/ErrorBoundary.tsx` — NEW — React error boundary using `react-error-boundary` library
- `apps/web/components/system/Toast.tsx` — NEW — toast primitive (use shadcn/ui's sonner integration)
- `apps/web/lib/errors/mapErrorToToast.ts` — NEW — maps typed SDK errors (from story-23 error types) to toast variants: warning, error, info, with user-friendly messages
- `apps/web/lib/errors/__tests__/mapErrorToToast.test.ts` — NEW — unit test for every typed error → message mapping
- `apps/web/app/layout.tsx` — UPDATE (created in story-100) — wraps the app in ErrorBoundary + ToastProvider
- `apps/web/lib/hooks/useApiError.ts` — NEW — TanStack Query global error handler that pipes errors through mapErrorToToast

---

## Acceptance criteria (BDD)

```
Given a React render error in any component
When the error throws
Then ErrorBoundary catches it AND renders a fallback UI with "Something went wrong" + "Reload" CTA (NOT the white screen of death)

Given a Mantle RPC error (typed: RpcError)
When mapErrorToToast is called
Then it returns { variant: 'error', message: 'Mantle RPC is unavailable — try again in a moment', actionable: true }

Given a SessionKeyExpired error
When mapped
Then the message is "Your session key has expired. Please re-onboard to continue." AND the action button leads to /app/onboarding/activate

Given a generic Error (untyped)
When mapped
Then a fallback toast appears with "An unexpected error occurred — please report this" AND a "Report" CTA that opens a GitHub issue with the error details pre-filled

Given a network error (offline)
When detected
Then a persistent toast appears "You're offline — reconnecting…" that dismisses when back online

Given the user dismisses an error toast
When the action button is clicked
Then they navigate to the appropriate recovery flow (re-onboard, refresh, etc.)

Given multiple errors fire rapidly (same error 5x in 5s)
When the toast renders
Then it deduplicates — only ONE toast shown with "(5)" counter (prevents toast spam)

Given a 401 from any API call
When TanStack Query's onError fires
Then the user is signed out + redirected to landing (session expired)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given the typed error mapping coverage
When all SDK error types are introspected
Then EVERY type has a mapping in mapErrorToToast (no silent fallback to generic message for known typed errors)
```

---

## Shell verification

```bash
cd apps/web
test -f components/system/ErrorBoundary.tsx
test -f components/system/Toast.tsx
test -f lib/errors/mapErrorToToast.ts
test -f lib/hooks/useApiError.ts

cd ../..

pnpm --filter @concierge-mantle/web run build
test $? -eq 0

# Coverage of typed errors
# Each typed error from @concierge-mantle/sdk has a mapping
for errType in RpcError SessionKeyExpired SessionKeyPolicyRejected IPFSPinFailed OracleStale AttestationFailed; do
  grep -q "$errType" apps/web/lib/errors/mapErrorToToast.ts || { echo "missing mapping: $errType"; exit 1; }
done

# Tests pass
pnpm --filter @concierge-mantle/web run test 2>&1 | grep "mapErrorToToast" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **"Actionable, never humiliating" is the UX bar.** Per `research/concierge/08-ux-component-intent.md` § error states: every error message tells the user what THEY can do next, not what the system failed at internally. "Mantle RPC is unavailable" + "Try again in a moment" — not "Failed to read contract at 0x...".
- **Map EVERY typed error to a user-friendly message.** Per CLAUDE.md no-silent-failures: if the SDK exposes a typed error, the UI must map it. A generic "An unexpected error occurred" for typed errors is a code smell — the type carries information the user can act on; use it.
- **Deduplicate rapid toasts.** A failing component re-renders, throwing the same error 5x in 100ms; show ONE toast with a counter, not 5 toasts. Use the toast library's deduplication feature (sonner has this).
- **Persistent "you're offline" toast** uses `navigator.onLine` event listeners. Dismiss when back online. Don't auto-clear without confirming connectivity.
- **GitHub issue pre-fill** for unmapped errors lets us close the long tail. The pre-filled body includes error stack + browser info + app version. Reduces friction for users to report.
- **The 401 redirect** is critical security hygiene. If the API returns 401 mid-session (session expired server-side), the client must drop state and force re-login. NEVER silently retry — that's how zombie sessions happen.
- **No emojis in error messages.** Per CLAUDE.md tone: clear, actionable text. Not "🚨 Oh no!".
- Cross-ref: `research/concierge/08-ux-component-intent.md` § error states, story-23 (typed errors source).
