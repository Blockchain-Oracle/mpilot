# Story — Pimlico bundler client + paymaster integration

**ID:** story-51-pimlico-bundler-client
**Epic:** Epic E4 — Smart Account Layer
**Depends on:** story-50-zerodev-sdk-bootstrap
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge smart-account user
**I want to** all UserOperations route through Pimlico's verified Mantle bundler with optional paymaster sponsorship (for the demo flow) or user-paid gas (for production)
**So that** UserOps execute reliably on Mantle without spinning up a self-hosted bundler, and judges trying Concierge on Sepolia get gasless onboarding

---

## File modification map

- `packages/smart-account/src/bundler.ts` — NEW — `createBundlerClient({ chain, apiKey })` returns `{ bundlerClient: BundlerClient; paymasterClient: PaymasterClient | null }` based on env. Endpoints:
  - Mantle Mainnet: `https://api.pimlico.io/v2/mantle/rpc?apikey=$PIMLICO_API_KEY`
  - Mantle Sepolia: `https://api.pimlico.io/v2/mantle-sepolia/rpc?apikey=$PIMLICO_API_KEY`
- `packages/smart-account/src/paymaster.ts` — NEW — `createPaymasterClient({ chain, apiKey, sponsorshipPolicy })` configures Pimlico's verifying paymaster. Two modes: `sponsorshipPolicy: 'always'` (Sepolia demo — Concierge pays gas) or `sponsorshipPolicy: 'never'` (Mainnet production — user pays gas via account's native MNT balance).
- `packages/smart-account/src/gasPrice.ts` — NEW — `getUserOpGasPrice({ chain })` queries Pimlico's gas price oracle (Pimlico's recommended path: never hardcode UserOp gas). Returns `{ maxFeePerGas, maxPriorityFeePerGas }`.
- `packages/smart-account/src/createAccount.ts` — UPDATE — accepts optional `paymaster?: 'pimlico' | 'none'` parameter; default is `'pimlico'` for Sepolia and `'none'` for Mainnet (matches per-chain demo vs production policy).

---

## Acceptance criteria (BDD)

```
Given Pimlico API key is configured via env (PIMLICO_API_KEY)
When createBundlerClient({chain: 'mantle-sepolia'}) is called
Then it returns `{ bundlerClient: BundlerClient with .url containing 'pimlico.io/v2/mantle-sepolia', paymasterClient: not null }`

Given createBundlerClient on Mantle Mainnet
When called
Then the URL contains 'pimlico.io/v2/mantle/rpc' AND `paymasterClient === null` (default Mainnet is user-pays)

Given the sponsorship policy is 'always'
When a UserOp is submitted on Sepolia
Then the paymaster sponsors the gas (UserOp executes without the user account holding any MNT)

Given the sponsorship policy is 'never'
When a UserOp is submitted on Mainnet
Then the user account's native MNT pays gas (UserOp fails if account has insufficient balance)

Given getUserOpGasPrice on Mantle Mainnet
When called against the live Pimlico endpoint
Then returns `{ maxFeePerGas: bigint > 0n, maxPriorityFeePerGas: bigint > 0n }`; both are reasonable gas-price values (not 0, not impractically high)

Given the Pimlico API key is missing
When createBundlerClient runs
Then it throws `MissingEnvVar('PIMLICO_API_KEY')` (fail-fast at boot)

Given the bundler returns 5xx
When a UserOp submission fails
Then the error is wrapped as `BundlerError({ status, body })` (typed; NOT silent retry)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/smart-account
test -f src/bundler.ts
test -f src/paymaster.ts
test -f src/gasPrice.ts

cd ../..

pnpm --filter @mpilot/smart-account run build
test $? -eq 0

# Endpoint URLs match Pimlico documented endpoints
grep -q "pimlico.io/v2/mantle" packages/smart-account/src/bundler.ts

# PIMLICO_API_KEY missing throws at boot
bun -e "
  delete process.env.PIMLICO_API_KEY;
  import('./packages/smart-account/src/bundler.ts').then(m => {
    try {
      m.createBundlerClient({ chain: 'mantle-sepolia' });
      process.exit(1);
    } catch (e) {
      if (!String(e).includes('MissingEnvVar')) process.exit(1);
    }
  });
"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Pimlico Mantle support is VERIFIED in research/concierge/05-zerodev-erc4337.md.** ZeroDev's hosted bundler does NOT document Mantle; we route through Pimlico (CLAUDE.md gotcha). Endpoints are stable; we hardcode them as constants in `bundler.ts`.
- **`sponsorshipPolicy` config drives the per-chain default.** Sepolia → `'always'` (Concierge sponsors via paymaster; judge demo costs us a few dollars total). Mainnet → `'never'` (user pays via their account's native MNT — they have to fund the smart account before first action).
- **Verifying paymaster** (not ERC-20 paymaster) for the v1 demo flow. ERC-20 paymaster (accepting USDC for gas) is v1.1; the wire-up is harder + needs a Pimlico paymaster policy contract deployed by Pimlico.
- **`getUserOpGasPrice` must be called fresh per UserOp** — gas prices change block-to-block. Don't cache.
- **`PIMLICO_API_KEY` is required** — fail-fast at boot (story-24's config-loader catches this); without it, Mainnet UserOps fail at submission with cryptic 401s.
- **Error wrapping for bundler 5xx**: per CLAUDE.md no-silent-failures. Surface as typed errors. The runtime decides whether to retry; the SDK does not.
- Cross-ref: `research/concierge/05-zerodev-erc4337.md` § Pimlico bundler client (Mantle verified).
