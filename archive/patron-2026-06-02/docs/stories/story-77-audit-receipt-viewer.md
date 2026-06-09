# Story 77 — Audit receipt viewer at /audit/:txHash

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-60-nextjs-15-scaffold, story-52-erc8004-receipt-logging

## BDD Acceptance Criteria

```
Given any visitor (no wallet required) navigates to /audit/0xabc123...
When the page renders
Then it fetches the ERC-8004 receipt for that tx hash via GET /receipts/:txHash
And displays:
  - Header: "ERC-8004 Receipt"
  - Agent identity: NFT id + owner address (with Mantlescan link)
  - Action type: e.g., "OpenPosition" + human-readable description
  - Parameters: structured table (merchant, amount, collateral, etc.) — JetBrains Mono for hex/numeric values
  - Outcome: "Success" or "Reverted" with --success / --danger styling
  - Reputation delta: ±N with appropriate coloring
  - Linked Mantlescan tx URL (https://mantlescan.xyz/tx/0x...)
  - Linked ERC-8004 registry entry URL
  - Timestamp (relative + absolute)
  - "Copy share link" button

Given the receipt doesn't exist
When the route resolves
Then a clean 404 renders: "Receipt not found. The transaction may not be a Patron receipt or hasn't been indexed yet." with a link to Mantlescan.

Given the page is shared on social
When OG metadata is generated
Then the share card shows agent identity + action + outcome (auto-generated via @vercel/og)

Given Playwright runs apps/web/e2e/audit-receipt.spec.ts
When the spec executes with a mocked receipt
Then all sections render, Mantlescan link is correct, copy button works, 404 case handled
```

## File modification map

- `apps/web/app/audit/[txHash]/page.tsx` — NEW — server component; uses `generateMetadata` for OG.
- `apps/web/app/audit/[txHash]/not-found.tsx` — NEW — 404 handler.
- `apps/web/app/audit/[txHash]/opengraph-image.tsx` — NEW — `@vercel/og` dynamic OG image with agent + action.
- `apps/web/components/audit/ReceiptHeader.tsx` — NEW.
- `apps/web/components/audit/ReceiptParameters.tsx` — NEW — structured key/value table.
- `apps/web/components/audit/ReceiptLinks.tsx` — NEW — Mantlescan + ERC-8004 registry + copy share button.
- `packages/ui/src/AuditReceiptViewer/AuditReceiptViewer.tsx` — NEW — composable viewer (shared with mini app).
- `packages/ui/src/AuditReceiptViewer/AuditReceiptViewer.test.tsx` — NEW — Vitest render + missing receipt + reverted state.
- `apps/web/lib/hooks/useReceipt.ts` — NEW — TanStack Query hook GET /receipts/:txHash.
- `apps/web/package.json` — UPDATE — add `@vercel/og@latest`.
- `apps/web/e2e/audit-receipt.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter @patron/ui test
pnpm --filter web build
test $? -eq 0

# Route exists
test -f apps/web/app/audit/\[txHash\]/page.tsx
test -f apps/web/app/audit/\[txHash\]/not-found.tsx
test -f apps/web/app/audit/\[txHash\]/opengraph-image.tsx

# AuditReceiptViewer exported from packages/ui
grep -q "AuditReceiptViewer" packages/ui/src/index.ts

# Mantlescan link present
grep -q "mantlescan.xyz" apps/web/components/audit/ReceiptLinks.tsx

# 400-LOC
wc -l packages/ui/src/AuditReceiptViewer/AuditReceiptViewer.tsx | awk '{ if ($1 > 400) exit 1 }'

# Playwright
pnpm playwright test apps/web/e2e/audit-receipt.spec.ts
test $? -eq 0
```

## Notes

- **This is the proof-the-agent-is-honest page.** Judges click here from the receipt link after the demo confirm; they need to see verifiable on-chain truth in one glance.
- Public route — no auth. Anyone (regulator, merchant, future tool, journalist) can verify.
- Mantlescan URL uses chain-specific subdomain: `mantlescan.xyz/tx/...` for Mainnet, `sepolia.mantlescan.xyz/tx/...` for Sepolia. Detect from chain id in receipt.
- ERC-8004 registry link points to the specific reputation entry: `mantlescan.xyz/address/<reputation_registry_addr>?action=...` — use addresses from `packages/shared/addresses.ts` (NEVER hardcoded per architecture banned-patterns).
- OG image (via `@vercel/og`) is the social moat — when judges share the receipt link on X, the card shows "Patron agent did X with merchant Y, success, +1 rep" — that IS the pitch.
- Copy share link button uses `navigator.clipboard.writeText` with a Sonner toast confirmation.
- Reverted-state UI is important: even failed agent actions log receipts. Showing them transparently strengthens the "auditable" pitch.
- Banned Tailwind classes auto-checked.
- File size < 400 LOC per file enforced.
- **Serves demo-shape Stage 5 critically** — the final stage. Judge clicks receipt link, this page renders, they see the on-chain audit trail. The 90-second demo ends here.
