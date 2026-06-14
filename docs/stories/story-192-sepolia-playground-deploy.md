# Story — Sepolia playground deployment + judge-friendly faucet flow

**ID:** story-192-sepolia-playground-deploy
**Epic:** Epic E11 — Mainnet Deployment
**Depends on:** story-18-sepolia-deploy-script
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Mantle Turing Test judge
**I want to** I can click "Try Concierge on Sepolia" from the landing, get test tokens via an in-app faucet (NO native MNT required from me), activate a sample agent, watch a tick, and approve an action — all in under 5 minutes
**So that** Concierge has a zero-friction "try it now" path for judges who don't want to fund a wallet to evaluate

---

## File modification map

- `docs/DEPLOY-SEPOLIA-RUNBOOK.md` — NEW — Sepolia deploy procedure (lighter than Mainnet; preflight is less critical)
- `apps/web/app/api/faucet/route.ts` — NEW — proxy endpoint to the Mantle Sepolia faucet (or to our own pre-funded distributor wallet); rate-limited per IP
- `apps/web/components/dashboard/InAppFaucet.tsx` — NEW — UI for requesting test tokens; appears in the TestModeBanner from story-114
- `contracts/script/DeploySepolia.s.sol` — UPDATE — also deploys a token distributor that the faucet can call (so we don't depend on Mantle's faucet uptime)
- `contracts/src/SepoliaTokenDistributor.sol` — NEW — simple distributor contract that gives N USDC + N sUSDe + N USDY + 0.01 MNT per address per day
- `contracts/src/__tests__/SepoliaTokenDistributor.test.sol` — NEW — Foundry test for the distributor
- `apps/web/components/dashboard/__tests__/InAppFaucet.test.tsx` — NEW — RTL test

---

## Acceptance criteria (BDD)

```
Given DEPLOY-SEPOLIA-RUNBOOK.md exists
When read
Then it covers: forge deploy command, expected addresses (auto-synced to @concierge-mantle/shared), distributor funding ($500 USDC + 100 MNT to start)

Given the InAppFaucet button is clicked
When the user is on Sepolia mode
Then POST /api/faucet is called; on success, 100 USDC + 100 sUSDe + 100 USDY + 0.01 MNT are sent to the user's smart account address

Given the faucet rate limit (1 claim per address per day)
When the SAME address claims twice in 24 hours
Then the second request returns 429 (Too Many Requests) with a clear message "Already claimed today — try again at <time>"

Given the IP rate limit
When the same IP claims for more than 5 different addresses in 24 hours
Then subsequent requests return 429 (prevents one judge running many wallets through the same browser session)

Given the distributor contract is funded
When deployed
Then it has at minimum $500 in each test token AND 100 MNT (enough for ~100 user claims)

Given the InAppFaucet UI
When the user has claimed
Then the button transitions to "Claimed ✓ — refresh in 24h" with the unlock timestamp

Given the user clicks "Activate agent" after claiming
When the agent starts ticking
Then the first tick has tokens to work with (the simulate phase doesn't immediately return "no balance to act on")

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given the in-app faucet works without leaving the dashboard
When the user is in the onboarding flow
Then the faucet is reachable as a sidebar action (NOT requiring a context switch to a separate page)
```

---

## Shell verification

```bash
test -f docs/DEPLOY-SEPOLIA-RUNBOOK.md
test -f apps/web/app/api/faucet/route.ts
test -f apps/web/components/dashboard/InAppFaucet.tsx
test -f contracts/src/SepoliaTokenDistributor.sol
test -f contracts/src/__tests__/SepoliaTokenDistributor.test.sol

pnpm --filter @concierge-mantle/web run build
test $? -eq 0

# Contracts test passes
cd contracts && forge test --match-contract SepoliaTokenDistributor && cd ..

# Rate limit logic present
grep -qE "(rate.limit|429)" apps/web/app/api/faucet/route.ts

# Tests pass
pnpm --filter @concierge-mantle/web run test 2>&1 | grep "InAppFaucet" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **ZERO FRICTION FOR JUDGES IS THE TRACK 3 EDGE.** Per `research/concierge/09-tracks-and-judges.md`: judges scoring "is this real?" need to click → activate → see it work. Anything that asks them to manually fund a wallet drops scores. The in-app faucet is the answer.
- **Custom distributor, NOT just Mantle's public faucet.** Mantle's faucet has CAPTCHAs + rate limits that break the "5-minute path". Our distributor gives the right amounts of the right tokens in one tx.
- **Per-address AND per-IP rate limits.** Without per-IP, one judge could refresh + claim + drain. The combined limits keep the distributor topped up while allowing legitimate evaluation.
- **0.01 MNT** is enough for ~100 small ERC-4337 UserOps on Sepolia (where Pimlico sponsorship is on, so this MNT is just buffer for any non-bundler txs).
- **Pre-funding $500 per token** at minimum — enough for ~50 users to test before we need to top up. Document the top-up procedure in DEPLOY-SEPOLIA-RUNBOOK.md.
- **The UI shows "Claimed ✓ — refresh in 24h"** so users understand the rate limit. Per CLAUDE.md no-silent-failures: clear refusal beats silent failure.
- **The distributor contract is upgradeable (UUPS)** so we can tune amounts post-launch without redeploy. Same pattern as ConciergeRegistry.
- **Sepolia mock pattern lives in `archive/patron-2026-06-02/`** — MockAavePool can be reused as-is. Don't re-invent.
- Cross-ref: story-14 + story-15 (Sepolia mocks), story-114 (TestModeBanner that hosts this UI).
