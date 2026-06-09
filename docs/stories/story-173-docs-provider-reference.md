# Story — Docs provider reference (7 protocols, one page each)

**ID:** story-173-docs-provider-reference
**Epic:** Epic E10 — Docs Site
**Depends on:** story-170-docs-site-scaffold
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** developer extending Concierge with a new action or auditing an existing provider's logic
**I want to** one MDX page per locked provider (Aave V3, Mantle DEX, Ethena sUSDe, Ondo USDY, mETH staking, Li.Fi bridge, ERC-8004) documenting: addresses, actions exposed, read selectors, gotchas, on-chain verification steps
**So that** I can verify "is the agent calling Aave correctly?" or "what attestation schema does the DEX provider use?" without reading the source

---

## File modification map

- `apps/web/content/docs/providers/aave-v3-mantle.mdx` — NEW
- `apps/web/content/docs/providers/mantle-dex.mdx` — NEW
- `apps/web/content/docs/providers/ethena-susde.mdx` — NEW
- `apps/web/content/docs/providers/ondo-usdy.mdx` — NEW
- `apps/web/content/docs/providers/meth-staking.mdx` — NEW
- `apps/web/content/docs/providers/lifi-bridge.mdx` — NEW
- `apps/web/content/docs/providers/erc8004.mdx` — NEW
- `apps/web/content/docs/providers/_meta.tsx` — NEW
- `apps/web/components/docs/AddressTable.tsx` — NEW — reusable component that renders a table of {label, address, mantlescan_url} from a structured data prop
- `apps/web/components/docs/GotchaCallout.tsx` — NEW — special Callout variant for "load-bearing gotcha" content (high-visibility styling)

---

## Acceptance criteria (BDD)

```
Given each provider page
When read
Then it includes: protocol name, official docs link, deployed addresses (Mainnet + Sepolia mock), exposed actions list, gotchas section

Given the aave-v3-mantle page
When inspected for the load-bearing gotcha
Then it explicitly documents the E-Mode 1 silent-fail trap: "sUSDe LTV in general mode = 0; Pool.borrow returns 0 silently if E-Mode not set; ALWAYS setUserEMode(1) first"

Given the ondo-usdy page
When inspected
Then it explicitly states: NO mutation actions (KYC-gated, NOT agent-driven); only read selectors

Given the meth-staking page
When inspected
Then it explicitly states: NO L1 stake/unstake actions (mETH on Mantle is the bridge image, not the staking contract)

Given the erc8004 page
When inspected
Then it documents: per-tick attestation IS the verifiability claim (ADR-004), schemas per provider, dataURI ipfs:// format

Given the lifi-bridge page
When inspected
Then it documents: Diamond contract address, supported chain pairs for Concierge, what bridge fees look like

Given all address tables
When inspected
Then they use the AddressTable component pulling from @concierge/shared/addresses (single source of truth — no hardcoded addresses in MDX)

Given each page's gotchas section
When the GotchaCallout is rendered
Then it has alarm styling that makes the gotcha impossible to miss while scanning

Given all 7 provider pages
When grep'd for "MockAavePool" outside the architectural-pattern context
Then no false equivalence (Sepolia uses mocks; Mainnet does NOT — pages must not conflate)

Given file size budget per MDX file
When inspected
Then each provider page ≤ 300 lines
```

---

## Shell verification

```bash
cd apps/web/content/docs/providers
for prov in aave-v3-mantle mantle-dex ethena-susde ondo-usdy meth-staking lifi-bridge erc8004; do
  test -f $prov.mdx || { echo "missing $prov.mdx"; exit 1; }
done

cd ../../../../..

pnpm --filter @concierge/web run build
test $? -eq 0

# Aave E-Mode gotcha documented
grep -qi "E-Mode" apps/web/content/docs/providers/aave-v3-mantle.mdx

# Ondo USDY read-only documented
grep -qiE "(KYC|read-only|no mutation)" apps/web/content/docs/providers/ondo-usdy.mdx

# mETH no L1 stake documented
grep -qiE "(bridge image|no L1|no stake)" apps/web/content/docs/providers/meth-staking.mdx

# ERC-8004 verifiability claim documented
grep -q "ADR-004" apps/web/content/docs/providers/erc8004.mdx

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Load-bearing gotchas FIRST**, then API surface. A dev reading the Aave page should see the E-Mode trap before they see the supply() signature. Visibility is the regression guard.
- **No hardcoded addresses in MDX.** Use the AddressTable component that imports from `@concierge/shared/addresses`. When addresses change (e.g., new Sepolia mock deploy), all docs update automatically.
- **Ondo USDY page is shorter** than others because there's intentionally less surface (read-only). Don't pad with filler — short and clear beats long and vague.
- **mETH page explicitly states NO L1 stake actions** to prevent a future contributor from "fixing" the missing action by adding L1 stake logic (which would be incorrect — mETH on Mantle is the bridge image of the L1 staked ETH).
- **ERC-8004 page references ADR-004** to anchor the architectural decision. Without this anchor, a future dev might propose "let's skip attestation when the gas price is high" without realizing it breaks the wedge.
- **Cross-link every provider page to its provider package source** with GitHub permalinks (same pattern as story-172).
- **Pull content from `research/concierge/03-providers/<name>.md`** — these files were already verified on-chain (per AUDIT-2026-06-04). Don't rewrite; transform into MDX with the right components.
- **GotchaCallout has alarm-level styling** (red border, warning icon, larger heading). Anti-slop applies: no purple gradients; use design tokens.
- Cross-ref: `research/concierge/03-providers/` (all 7 source files), ADR-004 + ADR-008.
