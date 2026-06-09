# Story 103 — Merchant onboarding CLI script (register 3 demo merchants on MerchantRegistry + post USDC bond + persist to DB)

**Epic:** Epic 7 — Demo Merchants
**Estimated:** ~2h
**Depends on:** story-34-merchant-onboarding-endpoints, story-21-sepolia-deployment

## BDD Acceptance Criteria

```
Given env vars MANTLE_SEPOLIA_RPC_URL + OPS_PRIVATE_KEY + PATRON_API_URL + PATRON_API_TOKEN are set
When `pnpm --filter @patron/contracts onboard:demo-merchants -- --network sepolia` runs
Then exit code is 0
And for each of the 3 demo merchants (threads-by-mara, pixelink, dialer-pro):
  - The OPS wallet funds a fresh per-merchant wallet with $MNT for gas (skip if balance > threshold)
  - The OPS wallet transfers 1000 USDC (mock USDC on Sepolia) to that merchant wallet
  - The merchant wallet calls MerchantRegistry.register(slug, payoutAddress, metadataURI)
  - The merchant wallet calls USDC.approve(MerchantRegistry, BOND_AMOUNT)
  - The merchant wallet calls MerchantRegistry.postBond(BOND_AMOUNT)
  - The script POSTs to PATRON_API_URL/merchants with { slug, displayName, walletAddress, payoutAddress, bondTxHash, registerTxHash }
  - The API returns { merchantId, publicKey, webhookSecret } which the script writes to scripts/onboard/secrets/<slug>.env (gitignored)

Given the script runs idempotently
When run a second time
Then it detects existing registration on-chain (via MerchantRegistry.getMerchant(slug)) and skips re-registration
And it detects existing DB row (via GET /merchants/:slug returns 200) and skips re-POST
And exit code is 0

Given `--network mainnet` is passed
Then the script requires explicit confirmation prompt: "Type DEPLOY-MAINNET to continue" before proceeding
And the chain id check inside MerchantRegistry calls uses Mainnet addresses from packages/shared/addresses.ts

Given the `--dry-run` flag is passed
Then no transactions are broadcast
And no API POSTs are sent
And a complete preview of intended actions per merchant is printed
```

## File modification map

- `packages/contracts/scripts/onboard-demo-merchants.mjs` — NEW — main script. Node ESM. Uses viem to talk to MerchantRegistry + USDC, uses `node:fs` to read/write per-merchant secrets, uses `node:fetch` to call the Patron API.
- `packages/contracts/scripts/onboard/merchants.json` — NEW — config file listing the 3 demo merchants:
  - `threads-by-mara` — displayName "Threads by Mara", payoutAddress (fresh wallet derived from OPS via deterministic seed), metadataURI `https://threads-by-mara.patron.xyz/manifest.json`
  - `pixelink` — displayName "Pixelink", metadataURI `https://pixelink.patron.xyz/manifest.json`
  - `dialer-pro` — displayName "Dialer Pro", metadataURI `https://dialer-pro.patron.xyz/manifest.json`
- `packages/contracts/scripts/onboard/lib/wallet.mjs` — NEW — helper: derive a per-merchant wallet from `OPS_PRIVATE_KEY` + slug via HKDF (deterministic, no extra secrets needed; safe because these are demo-only wallets)
- `packages/contracts/scripts/onboard/lib/funding.mjs` — NEW — helper: top up gas + USDC for a target wallet (skips if balance > threshold). Uses Sepolia mock USDC address (need to either deploy a mock USDC or use Mantle Sepolia's existing test USDC — document choice in script comments).
- `packages/contracts/scripts/onboard/lib/registry.mjs` — NEW — wraps `register`, `postBond`, `getMerchant` calls with viem. Reads `MerchantRegistry` address + ABI from `@patron/shared`.
- `packages/contracts/scripts/onboard/lib/api.mjs` — NEW — wraps POST /merchants + GET /merchants/:slug
- `packages/contracts/scripts/onboard/secrets/.gitignore` — NEW — `*.env` (so generated per-merchant secrets never leak)
- `packages/contracts/scripts/onboard/secrets/.gitkeep` — NEW
- `packages/contracts/package.json` — UPDATE — add script: `"onboard:demo-merchants": "node scripts/onboard-demo-merchants.mjs"`
- `packages/contracts/scripts/onboard/README.md` — NEW — one-screen: how to run, expected output, idempotency notes, where outputs land, how to wire output secrets into the 3 storefront `.env.local`
- `apps/api/src/routes/merchants.ts` — UPDATE (already created in story-34) — if not already accepting `bondTxHash` + `registerTxHash` on POST /merchants, extend the zod schema to accept them and persist on the row

## Shell verification

```bash
# Pre-flight
test -n "$MANTLE_SEPOLIA_RPC_URL"
test -n "$OPS_PRIVATE_KEY"
test -n "$PATRON_API_URL"
test -n "$PATRON_API_TOKEN"

# Dry-run prints plan, doesn't broadcast
pnpm --filter @patron/contracts onboard:demo-merchants -- --network sepolia --dry-run
test $? -eq 0

# Real run on Sepolia
pnpm --filter @patron/contracts onboard:demo-merchants -- --network sepolia
test $? -eq 0

# Per-merchant secret files generated (gitignored)
test -f packages/contracts/scripts/onboard/secrets/threads-by-mara.env
test -f packages/contracts/scripts/onboard/secrets/pixelink.env
test -f packages/contracts/scripts/onboard/secrets/dialer-pro.env
grep -q "PATRON_MERCHANT_KEY=" packages/contracts/scripts/onboard/secrets/threads-by-mara.env

# Idempotent on second run (no new on-chain txs)
pnpm --filter @patron/contracts onboard:demo-merchants -- --network sepolia 2>&1 | grep -q "already registered"

# Verify on-chain registration
node -e "
  const { createPublicClient, http } = require('viem');
  const { ADDRESSES, ABIS } = require('./packages/shared/src');
  const c = createPublicClient({ transport: http(process.env.MANTLE_SEPOLIA_RPC_URL) });
  Promise.all(['threads-by-mara','pixelink','dialer-pro'].map(s =>
    c.readContract({ address: ADDRESSES.sepolia.MerchantRegistry, abi: ABIS.MerchantRegistry, functionName: 'getMerchant', args: [s] })
      .then(m => { if (!m.active) { console.error(s, 'inactive'); process.exit(1); } })
  ));
"

# Mainnet path requires explicit confirmation
echo "no" | pnpm --filter @patron/contracts onboard:demo-merchants -- --network mainnet 2>&1 | grep -q "aborted"

# 400-LOC
for f in packages/contracts/scripts/onboard*/**/*.mjs; do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **This is the bridge between Epic 1 (contracts) and Epic 7 (storefronts).** The script makes the 3 demo merchants real on-chain entities so the agent's `MerchantRegistry.checkReputation()` call in the demo (PRD § Demo moment Stage 3a) returns a known-good answer.
- Same script handles Sepolia (default) and Mainnet (explicit confirmation gate). Mainnet run happens in story-111.
- **Per-merchant deterministic wallet derivation via HKDF(OPS_PRIVATE_KEY, slug)** — avoids needing 3 extra secrets in `.env` while keeping each merchant's wallet stable across runs. Documented as demo-only; production merchants would manage their own keys.
- Bond amount: read from `MerchantRegistry.MIN_BOND()` view function — do NOT hardcode. The contract is the source of truth.
- USDC on Mantle Sepolia: if a stable mock USDC isn't already deployed, the script first ensures a mock USDC exists (deploy a one-line `MockUSDC` ERC-20 in the same broadcast if needed). On Mainnet (story-111), use the real Mantle USDC at `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9` per architecture.md.
- API integration: the POST /merchants call from story-34 already creates the DB row, generates the public merchant key, and returns the webhook secret. This script just orchestrates: on-chain register → API create → write the returned key into the storefront's env file.
- The generated `secrets/<slug>.env` is the source for each storefront's `.env.local`. After running this script, copy `PATRON_MERCHANT_KEY=...` from `secrets/threads-by-mara.env` into `demo-merchants/threads-by-mara/.env.local` (also documented in story-104's deploy flow).
- Idempotency is critical: the orchestrator may re-run this script multiple times. Both on-chain (`getMerchant(slug)` returns active → skip) and API-side (`GET /merchants/:slug` returns 200 → skip) checks gate re-runs.
- `--dry-run` is mandatory before any Mainnet run in story-111.
- File size < 400 LOC per file.
