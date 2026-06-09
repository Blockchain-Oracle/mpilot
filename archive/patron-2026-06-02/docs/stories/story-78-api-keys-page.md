# Story 78 — API keys page at /api-keys

**Epic:** Epic 4 — Web App
**Estimated:** ~1.5h
**Depends on:** story-73-agent-management-page

## BDD Acceptance Criteria

```
Given a connected user navigates to /api-keys
When the page renders
Then a list of existing API keys shows: key id (masked: pk_live_xxxx...3a2b), label, scopes (chips), created date, last used, revoke button

Given the user clicks "Issue new key"
When the modal opens
Then they can input:
  - Label (free text)
  - Scopes (multi-select: read:positions, read:reputation, write:initiate-order, etc.)
  - Expiry (dropdown: 24h, 7d, 30d, 90d, never)
And on submit a POST to /users/me/api-keys is issued
And the response contains the plaintext key shown ONCE in a copy-to-clipboard block
And copy reads: "Save this key. It will never be shown again."

Given the user clicks Revoke on a key
When they confirm in the confirm modal
Then DELETE /users/me/api-keys/:id is issued
And on success the key is removed from the list
And the activity feed (story-70) logs an ERC-8004 receipt for the revocation

Given the user has 0 keys
When the page renders
Then an empty state with copy "No API keys yet. Issue your first scoped key to integrate Patron from your code." + <PatronButton>Issue new key</PatronButton>

Given Playwright runs apps/web/e2e/api-keys.spec.ts
When the spec runs with mocked endpoints
Then issuing a key shows the plaintext exactly once, revoking removes from list, confirm modal works
```

## File modification map

- `apps/web/app/api-keys/page.tsx` — NEW — server component.
- `apps/web/components/api-keys/ApiKeyList.tsx` — NEW — `"use client"`; table of existing keys.
- `apps/web/components/api-keys/IssueKeyModal.tsx` — NEW — form with react-hook-form + Zod.
- `apps/web/components/api-keys/RevealOnceBlock.tsx` — NEW — plaintext key display + copy button + warning banner.
- `apps/web/components/api-keys/RevokeConfirmModal.tsx` — NEW — confirm before delete.
- `apps/web/lib/hooks/useApiKeys.ts` — NEW — TanStack Query hooks for list/create/revoke.
- `apps/web/e2e/api-keys.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter web build
test $? -eq 0

# Route exists
test -f apps/web/app/api-keys/page.tsx

# Components
test -f apps/web/components/api-keys/ApiKeyList.tsx
test -f apps/web/components/api-keys/IssueKeyModal.tsx
test -f apps/web/components/api-keys/RevealOnceBlock.tsx
test -f apps/web/components/api-keys/RevokeConfirmModal.tsx

# 400-LOC
for f in apps/web/components/api-keys/*.tsx; do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done

# Playwright
pnpm playwright test apps/web/e2e/api-keys.spec.ts
test $? -eq 0
```

## Notes

- Scoped API keys are the v1 fallback for agent authorization per ADR-004 (EIP-7702 session keys ship in v2 if scope slips).
- Plaintext-shown-once UX pattern is the Stripe/Vercel/GitHub standard. Use a monospace font (JetBrains Mono per ux-spec) for the key.
- Masked display: show first 7 + last 4 chars (e.g., `pk_live_xxxxxxxxxxxxxxxxxxxxxxxx3a2b`).
- Available scopes (v1): `read:positions`, `read:reputation`, `read:activity`, `write:initiate-order`, `write:freeze-agent`. Keep minimal; expand in v2.
- Backend (Epic 2 story-33) defines `api_keys` table — schema alignment.
- Revocation logs ERC-8004 receipt to strengthen the "auditable" message.
- Banned Tailwind classes auto-checked.
- File size < 400 LOC per file enforced.
- Does NOT directly serve a demo-shape stage but supports the developer/integrator narrative — judges with technical depth focus may visit.
