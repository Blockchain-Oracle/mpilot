# Story — Landing trust signals (deployed addresses, repo, security, license)

**ID:** story-105-landing-trust-signals
**Epic:** Epic E7 — Web App
**Depends on:** story-100-next-app-scaffold
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Mantle user (or judge) evaluating Concierge
**I want to** see trust signals at the bottom of the landing: deployed Mainnet contract addresses (clickable to Mantlescan), GitHub repo link, license badge, security audit status, social-proof links
**So that** I can verify "this is real" without leaving the page or hunting through GitHub

---

## File modification map

- `apps/web/components/landing/TrustSignals.tsx` — NEW — three-column block: (a) deployed contracts table with Mantlescan links; (b) GitHub repo link + license badge + security disclosure link; (c) social-proof (Mantle X handle, Discord, Telegram)
- `apps/web/components/landing/AddressLink.tsx` — NEW — reusable component for "0x458F...1422 ↗" displaying truncated address with Mantlescan link
- `apps/web/components/landing/__tests__/TrustSignals.test.tsx` — NEW — RTL test
- `apps/web/lib/explorer.ts` — NEW — `getExplorerUrl(chain, address)` helper

---

## Acceptance criteria (BDD)

```
Given the section renders
When inspected
Then it has THREE distinct subsections: deployed contracts, repo+license, social-proof

Given the deployed contracts table
When inspected
Then it lists at minimum: ConciergeRegistry (Mainnet), session-key validator (Mainnet), with each address linked to mantlescan.xyz

Given each AddressLink
When clicked
Then it opens https://mantlescan.xyz/address/<addr> in a new tab (target="_blank" with rel="noopener noreferrer")

Given the GitHub repo link
When inspected
Then it links to the actual public repo (NOT placeholder)

Given the license badge
When inspected
Then it shows "MIT License" linking to the LICENSE file on GitHub

Given an address is not yet deployed (Sepolia mocks only, Mainnet pending)
When the section renders
Then the address row shows "Mainnet: pending" instead of a 0x0...0 placeholder (NEVER show zero addresses on the landing)

Given Mantle ecosystem mentions
When inspected
Then social-proof links include Mantle's official X (@0xMantle) and the Concierge X handle (or "Concierge X" placeholder before launch)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f components/landing/TrustSignals.tsx
test -f components/landing/AddressLink.tsx
test -f lib/explorer.ts

cd ../..

pnpm --filter @concierge-mantle/web run build
test $? -eq 0

# Mantlescan URL pattern
grep -q "mantlescan.xyz" apps/web/lib/explorer.ts

# MIT License referenced
grep -qE "MIT" apps/web/components/landing/TrustSignals.tsx

# No 0x000...000 placeholders
! grep -q "0x0000000000000000000000000000000000000000" apps/web/components/landing/TrustSignals.tsx

# target="_blank" + rel="noopener" on external links
grep -q "rel=\"noopener" apps/web/components/landing/AddressLink.tsx

# Tests pass
pnpm --filter @concierge-mantle/web run test 2>&1 | grep "TrustSignals" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **NEVER show 0x0...0 placeholder addresses.** If a contract isn't deployed yet, show "pending" or hide the row entirely. Zero addresses on the landing immediately tank credibility (they signal "this is a demo, nothing real ships").
- **`rel="noopener noreferrer"` on external links** is a security best-practice. Prevents the target site from accessing window.opener.
- **Addresses come from `@concierge-mantle/shared/addresses.ts`** — single source of truth (story-20). Don't hardcode in the component.
- **The repo URL is configurable via env** so it can be set per-deploy (preview vs main).
- **Social-proof links** — until the social handles are claimed, use stable placeholders ("Concierge X — coming soon") rather than broken links. Broken links are worse than placeholders.
- **Security disclosure link** points to `SECURITY.md` in the repo (created in story-200 README finalize).
- **Trust signals are at the BOTTOM** of the landing (before the global footer). The order matters: hero → how-it-works → Klarna disambiguation → developer CTA → trust signals → footer.
- Cross-ref: `research/concierge/08-ux-component-intent.md` § trust signals, `packages/shared/src/addresses.ts` (story-20).
