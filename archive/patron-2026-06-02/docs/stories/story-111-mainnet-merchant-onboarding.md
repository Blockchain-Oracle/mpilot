# Story 111 — Mainnet merchant onboarding (register + bond all 3 demo merchants on Mainnet)

**Epic:** Epic 8 — Polish + Submit
**Estimated:** ~1h
**Depends on:** story-110-mainnet-contract-deploy, story-104-demo-merchant-deploys

## BDD Acceptance Criteria

```
Given env vars MANTLE_RPC_URL=https://rpc.mantle.xyz + OPS_PRIVATE_KEY (with $MNT for gas + USDC for bonds) + PATRON_API_URL=https://api.patron.xyz + PATRON_API_TOKEN are set
And the operator confirms via interactive prompt: "Type DEPLOY-MAINNET to continue"
When `pnpm --filter @patron/contracts onboard:demo-merchants -- --network mainnet` runs
Then exit code is 0
And for each of (threads-by-mara, pixelink, dialer-pro):
  - MerchantRegistry.getMerchant(slug) on Mainnet returns { active: true, payoutAddress: <merchant wallet>, bond >= MIN_BOND }
  - The script POSTs to https://api.patron.xyz/merchants with the registration tx hash and bond tx hash
  - The API returns merchant key + webhook secret which the script writes to packages/contracts/scripts/onboard/secrets/<slug>.mainnet.env
And no Sepolia state is mutated

Given the script runs idempotently
When run a second time
Then it detects existing Mainnet registration and skips, exit code 0

Given the dry-run flag is passed
Then no on-chain txs are broadcast and no API POSTs are sent
And a complete plan is printed showing exact addresses + bond amount

Given the 3 storefronts need updated Mainnet env vars
When `bash scripts/sync-mainnet-keys-to-vercel.sh` runs
Then each merchant's Vercel project has `NEXT_PUBLIC_PATRON_MERCHANT_KEY` updated to the Mainnet key
And `NEXT_PUBLIC_PATRON_API_URL` is set to `https://api.patron.xyz`
And the next Vercel production deploy picks up the new env

Given the 3 storefronts are redeployed with Mainnet env
When a visitor clicks "Pay with Patron" on each storefront
Then the order intent fires against the real Patron Mainnet API
And the Mainnet agent decision flow runs end-to-end (verified via story-118 rehearsal)
```

## File modification map

- `packages/contracts/scripts/onboard-demo-merchants.mjs` — UPDATE (created in story-103) — extend `--network mainnet` branch:
  - Uses `MerchantRegistry` address from `ADDRESSES.mainnet`
  - Uses real Mantle USDC at `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9` (NOT mock USDC)
  - Writes per-merchant secrets to `secrets/<slug>.mainnet.env` (separate filenames so Sepolia + Mainnet keys coexist)
  - Requires interactive "DEPLOY-MAINNET" confirmation
  - Verifies OPS wallet has sufficient real USDC balance for 3 × MIN_BOND before starting
- `packages/contracts/scripts/onboard/merchants.json` — UPDATE — confirm metadataURI fields point to the Mainnet-bound production storefront URLs (`https://threads-by-mara.patron.xyz/manifest.json` etc.)
- `scripts/sync-mainnet-keys-to-vercel.sh` — NEW — for each slug, reads `packages/contracts/scripts/onboard/secrets/<slug>.mainnet.env` and runs `vercel env rm NEXT_PUBLIC_PATRON_MERCHANT_KEY production` (ignore failure) then `vercel env add NEXT_PUBLIC_PATRON_MERCHANT_KEY production` (pipes the new key via stdin); also sets `NEXT_PUBLIC_PATRON_API_URL=https://api.patron.xyz`; then triggers a fresh deploy via `vercel --prod`
- `docs/DEPLOY-MAINNET-RUNBOOK.md` — UPDATE (created in story-110) — append a "Step 3 — onboard merchants" section linking to this story; document where the Mainnet keys land + how Vercel projects pick them up
- `README.md` — UPDATE — under "Deployed contracts" add a "Registered merchants" subsection listing the 3 slugs + their on-chain payout addresses + bond amounts + mantlescan links to the registration tx
- `packages/contracts/scripts/onboard/secrets/.gitignore` — UPDATE (already exists) — confirm `*.env` glob also catches `*.mainnet.env`

## Shell verification

```bash
# Pre-flight
test -n "$MANTLE_RPC_URL"
test -n "$OPS_PRIVATE_KEY"
test -n "$PATRON_API_URL"
test -n "$PATRON_API_TOKEN"
test "$PATRON_API_URL" = "https://api.patron.xyz"

# OPS has gas + USDC
cast balance --rpc-url $MANTLE_RPC_URL $(cast wallet address $OPS_PRIVATE_KEY) | awk '{if ($1 < 100000000000000000) exit 1}'
cast call --rpc-url $MANTLE_RPC_URL 0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9 "balanceOf(address)(uint256)" $(cast wallet address $OPS_PRIVATE_KEY)

# Dry-run prints plan
pnpm --filter @patron/contracts onboard:demo-merchants -- --network mainnet --dry-run
test $? -eq 0

# Real run (interactive)
pnpm --filter @patron/contracts onboard:demo-merchants -- --network mainnet
test $? -eq 0

# Mainnet secrets generated, separate from Sepolia
test -f packages/contracts/scripts/onboard/secrets/threads-by-mara.mainnet.env
test -f packages/contracts/scripts/onboard/secrets/pixelink.mainnet.env
test -f packages/contracts/scripts/onboard/secrets/dialer-pro.mainnet.env

# On-chain verification: all 3 merchants active on Mainnet
node -e "
  const { createPublicClient, http } = require('viem');
  const { ADDRESSES, ABIS } = require('./packages/shared/src');
  const c = createPublicClient({ transport: http(process.env.MANTLE_RPC_URL) });
  Promise.all(['threads-by-mara','pixelink','dialer-pro'].map(s =>
    c.readContract({ address: ADDRESSES.mainnet.MerchantRegistry, abi: ABIS.MerchantRegistry, functionName: 'getMerchant', args: [s] })
      .then(m => { if (!m.active) { console.error(s, 'inactive on mainnet'); process.exit(1); } })
  ));
"

# Idempotent on second run
pnpm --filter @patron/contracts onboard:demo-merchants -- --network mainnet 2>&1 | grep -q "already registered"

# Sync keys to Vercel + redeploy
bash scripts/sync-mainnet-keys-to-vercel.sh
test $? -eq 0

# Storefronts reachable + on Mainnet (verify by checking checkout flow lands on api.patron.xyz)
for slug in threads-by-mara pixelink dialer-pro; do
  curl -sf https://$slug.patron.xyz | grep -q "api.patron.xyz" || echo "WARN: $slug may not have Mainnet api URL in static HTML — verify in browser"
done
```

## Notes

- **Day 12 work** (2026-06-12). Runs immediately after story-110 (Mainnet contracts). Together story-110 + story-111 are the "go live on Mantle Mainnet" milestone.
- **Mainnet USDC is real money.** Bond amount per merchant is `MIN_BOND()` from MerchantRegistry — likely small (e.g., 10–50 USDC) for the demo. Confirm the configured MIN_BOND is sane before running; if too high, redeploy MerchantRegistry with a lower value (only feasible if the value is immutable-at-construction, otherwise call an admin setter).
- Separate `.mainnet.env` filenames keep Sepolia + Mainnet secrets coexisting on disk. The Vercel sync script reads ONLY the `.mainnet.env` files for production env wiring.
- The Vercel env sync uses `vercel env rm` + `vercel env add` (the CLI doesn't support updates atomically as of 2026). The brief gap between rm and add only affects new deploys, not running prod (env is baked at build time for NEXT_PUBLIC vars).
- After this story, the 3 demo storefronts on `<slug>.patron.xyz` are talking to the Mainnet Patron API, and the Mainnet agent will run the real decision flow when judges click "Pay with Patron" on Demo Day.
- Idempotency matters because the rehearsal script (story-118) may re-run this in a pre-Demo-Day dry run; we don't want duplicate registrations or wasted bond.
- README "Registered merchants" section gives judges a one-click path: "Here are the 3 merchants on-chain — click any address to see the registration tx on mantlescan."
- File size < 400 LOC per file.
