# Story — Agent reputation page (`/agent/[id]` — public attestation history)

**ID:** story-113-agent-reputation-page
**Epic:** Epic E7 — Web App
**Depends on:** story-100-next-app-scaffold, story-84-reputation-read-sdk
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Mantle user, judge, or future agent considering whether to interact with this Concierge agent
**I want to** the public page at `/agent/[id]` shows the full attestation history (every action ever taken, with IPFS payloads decoded, txHash links to Mantlescan, attestation CID links to IPFS gateway) — no auth required, browsable by anyone
**So that** the verifiability claim is REAL: anyone can audit the agent's track record without trusting Concierge as a centralized authority

---

## File modification map

- `apps/web/app/agent/[id]/page.tsx` — UPDATE (created in story-100) — fetches via loadAgentHistory (story-84); renders AgentHeader + ReputationFeed
- `apps/web/components/agent/AgentHeader.tsx` — NEW — agent ID + smart account address + total attestations count + earliest/latest activity dates
- `apps/web/components/agent/ReputationFeed.tsx` — NEW — chronological list of attestations with pagination (50 per page)
- `apps/web/components/agent/AttestationCard.tsx` — NEW — single attestation entry: schema, payload (decoded), txHash (Mantlescan link), CID (IPFS gateway link), block timestamp
- `apps/web/components/agent/AttestationFilter.tsx` — NEW — filter by schema (aave.supply, lifi.bridge, etc.) and date range
- `apps/web/app/api/agent/[id]/history/route.ts` — NEW — GET endpoint that proxies loadAgentHistory; public (no auth); rate-limited
- `apps/web/components/agent/__tests__/ReputationFeed.test.tsx` — NEW — RTL test
- `apps/web/components/agent/__tests__/AttestationCard.test.tsx` — NEW — RTL test for each schema variant

---

## Acceptance criteria (BDD)

```
Given the public route `/agent/[id]`
When accessed without authentication
Then the page renders (NOT redirected to login) — public visibility is a feature, not a bug

Given an agent with 5 attestations
When the page loads
Then the ReputationFeed renders 5 AttestationCards in chronological order

Given an attestation with a decoded payload
When AttestationCard renders
Then the payload is rendered as structured JSON (NOT a wall of text), with the schema name prominently shown

Given each attestation
When the user clicks the txHash
Then it opens https://mantlescan.xyz/tx/<hash> in a new tab

Given each attestation
When the user clicks the CID
Then it opens https://ipfs.io/ipfs/<cid> in a new tab (the actual JSON content)

Given the filter is set to "aave.supply" schema only
When applied
Then ONLY aave.supply attestations are shown; counts reflect the filter

Given pagination
When the user clicks "Next 50"
Then the URL updates to `?page=2` AND the next 50 attestations are fetched

Given an agent ID that doesn't exist
When the page renders
Then it shows "Agent not found" (NOT a generic error) AND returns proper 404 status for SEO

Given the page is server-rendered
When fetched via curl
Then the agent ID + attestation count appear in the static HTML (SEO + social previews work)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given the rate limit on the public API
When > 60 requests/minute from one IP
Then subsequent requests return 429 (prevents scraping abuse without blocking legitimate audit)
```

---

## Shell verification

```bash
cd apps/web
test -f components/agent/AgentHeader.tsx
test -f components/agent/ReputationFeed.tsx
test -f components/agent/AttestationCard.tsx
test -f components/agent/AttestationFilter.tsx
test -f app/api/agent/\[id\]/history/route.ts

cd ../..

pnpm --filter @concierge/web run build
test $? -eq 0

# Public access (no auth gate)
! grep -qE "(401|requireAuth)" apps/web/app/agent/\[id\]/page.tsx

# 404 on agent not found
grep -qE "(notFound|404)" apps/web/app/agent/\[id\]/page.tsx

# Rate limit on public API
grep -qE "(rate.*limit|429)" apps/web/app/api/agent/\[id\]/history/route.ts

# Tests pass
pnpm --filter @concierge/web run test 2>&1 | grep -E "(ReputationFeed|AttestationCard)" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **THIS IS THE VERIFIABILITY UX.** Per `research/concierge/01-wedge-locked.md` + ADR-004: "anyone can audit the agent's track record." The /app/* dashboard shows YOUR agent's state; /agent/[id] shows ANY agent's history. Public by design.
- **No auth required.** The data is already public on-chain (ERC-8004 attestations + IPFS payloads). Putting a login gate on the public page would be security theater.
- **Both txHash AND CID linkable.** The txHash proves the on-chain action happened; the CID proves the off-chain content matches. Together they form the verifiability chain.
- **Server-rendered for SEO + social previews.** The OG image generation (out of scope for this story; story-117 future) needs the agent info to be available in SSR.
- **Rate limit at 60 req/min per IP** — generous enough for legitimate users, tight enough to prevent scraping. Use Vercel's @upstash/ratelimit pattern.
- **Filter UI** is important for agents with hundreds of attestations. "Show me only the Aave supplies" lets a judge focus on the relevant evidence.
- **404 for missing agents** is essential — not a generic 500. Helps if a judge accidentally types the wrong agent ID; clear "this doesn't exist" beats a confusing error.
- **Decoded payload rendering**: render as syntax-highlighted JSON (use the same code block from story-104 for consistency). NOT as a `<pre>{JSON.stringify(payload)}</pre>` block — that's not readable.
- Cross-ref: `research/concierge/08-ux-component-intent.md` § public reputation page, ADR-004 verifiability.
