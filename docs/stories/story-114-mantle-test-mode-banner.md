# Story — "Test mode" banner + chain switcher (Sepolia ↔ Mainnet)

**ID:** story-114-mantle-test-mode-banner
**Epic:** Epic E7 — Web App
**Depends on:** story-107-app-dashboard-shell
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge user OR judge testing the playground
**I want to** an explicit "Test Mode (Mantle Sepolia)" banner at the top of /app when the agent is on Sepolia, with a clear "Switch to Mainnet" CTA that walks the user through the transition (new agent on Mainnet, since session keys are chain-scoped)
**So that** there's NEVER ambiguity about which chain you're operating on AND the path from playground to production is visible (not buried in settings)

---

## File modification map

- `apps/web/components/dashboard/TestModeBanner.tsx` — NEW — top-of-page banner; renders only when agent.chain === 'mantle-sepolia'; has "Switch to Mainnet" CTA
- `apps/web/components/dashboard/ChainSwitchDialog.tsx` — NEW — modal dialog walking through the chain switch: "This will create a NEW agent on Mainnet; your Sepolia agent stays available for testing"
- `apps/web/app/app/layout.tsx` — UPDATE (created in story-100) — adds TestModeBanner at the top when applicable
- `apps/web/lib/chain.ts` — NEW — helpers for chain naming, explorer URLs, faucet URLs
- `apps/web/components/dashboard/__tests__/TestModeBanner.test.tsx` — NEW — RTL test

---

## Acceptance criteria (BDD)

```
Given an agent on mantle-sepolia
When the dashboard renders
Then TestModeBanner appears at the top of the layout (above the 3-column shell) AND the banner copy explicitly mentions "Sepolia" (NOT vague "testnet")

Given an agent on mantle-mainnet
When the dashboard renders
Then TestModeBanner is NOT rendered (the layout has no banner)

Given the user clicks "Switch to Mainnet" in the banner
When the click fires
Then the ChainSwitchDialog opens with a 3-step walkthrough: (1) explain that a new agent will be created, (2) sign session-key policy for Mainnet, (3) optional bridge USDC from Sepolia

Given the chain switch dialog is open
When the user confirms step 1
Then they proceed to step 2 (signing); cancellation at any step closes the dialog without changing state

Given the user completes the chain switch
When the new Mainnet agent is created
Then they are redirected to /app?agentId=<newId> AND the AgentSwitcher shows BOTH agents (sepolia + mainnet)

Given the banner copy
When inspected
Then it does NOT use the word "testnet" alone (always "Mantle Sepolia testnet") — Sepolia specificity matters for technical credibility

Given the banner has a faucet CTA
When the user clicks "Get test tokens"
Then it opens https://faucet.sepolia.mantle.xyz/ in a new tab

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given accessibility
When inspected
Then the banner has role="status" (or aria-live="polite") so screen readers announce it
```

---

## Shell verification

```bash
cd apps/web
test -f components/dashboard/TestModeBanner.tsx
test -f components/dashboard/ChainSwitchDialog.tsx
test -f lib/chain.ts

cd ../..

pnpm --filter @mpilot/web run build
test $? -eq 0

# Sepolia explicitly named (not just "testnet")
grep -q "Sepolia" apps/web/components/dashboard/TestModeBanner.tsx

# Mantle Sepolia faucet
grep -q "faucet.sepolia.mantle.xyz" apps/web/lib/chain.ts

# Tests pass
pnpm --filter @mpilot/web run test 2>&1 | grep "TestModeBanner" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Sepolia specificity matters.** "Test Mode" is vague; "Mantle Sepolia testnet" is unambiguous. The latter survives translation, screenshots, and quick scanning by judges.
- **Chain switch creates a NEW agent**, doesn't migrate. Session keys are chain-scoped (per Kernel + ZeroDev architecture); on-chain attestations are chain-scoped (per ERC-8004); the safest UX is a fresh agent per chain.
- **3-step walkthrough** is friction, but appropriate friction. The user is about to put real money on the line. A 1-click "switch to mainnet" button would be irresponsible.
- **The Sepolia agent stays available.** Users can still tick on Sepolia (playground) while running Mainnet. The AgentSwitcher (story-107) handles multi-agent.
- **Faucet CTA in the banner** is a UX shortcut. New users land in Sepolia mode; they need tokens to test; faucet URL is one click away.
- **`role="status"` + `aria-live="polite"`** for accessibility. Screen readers announce mode changes without interrupting.
- **No animation on the banner.** It's persistent; flashy animation would be distracting. Static color tag is enough.
- Cross-ref: `research/concierge/08-ux-component-intent.md` § test mode, sprint-status (Sepolia playground priority).
