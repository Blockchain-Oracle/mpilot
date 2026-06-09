# Story 82 — Privy embedded EVM wallet (Mini App)

**Epic:** Epic 5 — Telegram Mini App
**Estimated:** ~2h
**Depends on:** story-81-tg-webapp-sdk-integration, story-06-env-and-secrets-setup

## BDD Acceptance Criteria

```
Given the Mini App boots inside Telegram WebView
When apps/mini/app/layout.tsx mounts the Privy provider
Then `@privy-io/react-auth` `<PrivyProvider>` wraps the tree
And `appId` is read from `process.env.NEXT_PUBLIC_PRIVY_APP_ID`
And the supported chains list contains ONLY Mantle Mainnet (5000) and Mantle Sepolia (5003)

Given a first-time visitor lands on /onboarding (story-83 hosts the UI; this story provides the plumbing)
When they choose email or Telegram social login
Then Privy creates an embedded EVM wallet (no WalletConnect, no MetaMask, no popup)
And `usePrivy().authenticated` becomes true
And `useWallets()` returns at least one wallet with `walletClientType === 'privy'`

Given an authenticated user with an embedded wallet
When `getViemWalletClient()` is called (helper in apps/mini/lib/privy/viemClient.ts)
Then it returns a viem WalletClient configured for Mantle
And `walletClient.account.address` matches the Privy wallet address
And signing a transaction routes through Privy (no extra UI prompt for embedded wallets unless required)

Given the user is authenticated and visits any protected route
When the route checks auth via `useRequirePrivyAuth()` hook
Then a loading spinner shows while Privy state hydrates
And the user is redirected to /onboarding if `authenticated === false` after hydration

Given the user clicks "Log out" in the agent settings (story-85)
When `logout()` from Privy is called
Then the embedded wallet session is cleared
And the user is redirected to /onboarding

Given the API needs to verify a Mini App caller's identity server-side
When the client sends `Authorization: Bearer <privy access token>` to the API
Then the API can verify the token via Privy server SDK (this story stubs the client; api integration tracked in Epic 2 backlog)

Given Vitest runs apps/mini/lib/privy/__tests__/viemClient.test.ts
When the spec executes with a mocked Privy wallet
Then `getViemWalletClient()` returns a valid viem client and signs a sample message
```

## File modification map

- `apps/mini/package.json` — UPDATE — add `@privy-io/react-auth@latest`, `viem@2`.
- `apps/mini/lib/privy/PrivyProviders.tsx` — NEW — `"use client"`; wraps `<PrivyProvider config={{ loginMethods: ['email', 'telegram'], embeddedWallets: { createOnLogin: 'users-without-wallets', noPromptOnSignature: true }, supportedChains: [mantle, mantleSepolia], appearance: { theme: 'light', accentColor: '#1E40AF' } }}>`.
- `apps/mini/lib/privy/chains.ts` — NEW — viem chain definitions for Mantle Mainnet (5000) + Sepolia (5003). Mirrors apps/web/lib/wagmi.ts chain config from story-67 so the two stay consistent.
- `apps/mini/lib/privy/viemClient.ts` — NEW — `getViemWalletClient(wallet)` adapts a Privy wallet to a viem `WalletClient`; uses `wallet.getEthereumProvider()` and `custom(provider)` transport.
- `apps/mini/lib/privy/usePrivyWallet.ts` — NEW — convenience hook: returns `{ wallet, walletClient, address, chainId, isReady }` collapsing Privy + viem state.
- `apps/mini/lib/privy/useRequirePrivyAuth.ts` — NEW — hook: redirects unauthenticated users to `/onboarding?next=<path>` after hydration.
- `apps/mini/lib/privy/__tests__/viemClient.test.ts` — NEW — Vitest with a mocked Privy provider.
- `apps/mini/app/layout.tsx` — UPDATE — wrap `<TgProvider>` children in `<PrivyProviders>` (Privy outside, TG context outside that or vice-versa; document the chosen order).
- `apps/mini/components/wallet/WalletStatus.tsx` — NEW — small pill showing connected wallet address (truncated) + chain badge; reused by dashboard + agent pages.
- `apps/mini/.env.local.example` — UPDATE — ensure `NEXT_PUBLIC_PRIVY_APP_ID` is documented.

## Shell verification

```bash
pnpm --filter mini install
pnpm --filter mini build
test $? -eq 0

# Privy installed
grep -q "@privy-io/react-auth" apps/mini/package.json

# Provider mounted
grep -q "PrivyProvider" apps/mini/lib/privy/PrivyProviders.tsx
grep -q "PrivyProviders" apps/mini/app/layout.tsx

# Chains restricted to Mantle (per ADR-010)
grep -q "5000" apps/mini/lib/privy/chains.ts
grep -q "5003" apps/mini/lib/privy/chains.ts
! grep -E "mainnet|base|arbitrum|optimism|polygon" apps/mini/lib/privy/chains.ts | grep -v "mantleSepolia\|mantleMainnet"

# wagmi MUST NOT be installed in mini (per ADR-008)
! grep -q "\"wagmi\"" apps/mini/package.json

# Vitest
pnpm --filter mini test --run lib/privy
test $? -eq 0

# 400-LOC
for f in $(find apps/mini/lib/privy -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **Context7 first**: query `@privy-io/react-auth` for the current `PrivyProvider` config shape, supported login methods, embedded wallet creation flags. The SDK ships breaking changes regularly.
- Per ADR-008: Privy is the wallet stack inside TG WebView. Do NOT add wagmi or RainbowKit to the mini app — WalletConnect deep-links unreliably inside TG WebView. The web app (Epic 4) handles wagmi separately.
- Per ADR-010: only Mantle chains (5000 + 5003). Do not enable mainnet/base/etc. even if Privy supports them by default.
- `loginMethods: ['email', 'telegram']` — Telegram login is critical for Mini App because the user is already in TG; one-tap social login is the win.
- `noPromptOnSignature: true` for embedded wallets means routine signatures (e.g., agent intents) don't trigger UI — important for the demo's smoothness. Manual approvals can still be required for sensitive ops via per-call overrides.
- The viem adapter is the bridge so all on-chain reads/writes use the same library across the codebase (architecture banned `ethers`).
- Server-side Privy token verification is tracked separately in Epic 2 (`Authorization` middleware). This story only wires the client.
- File size < 400 LOC enforced.
- Foundational for story-83 (onboarding UI) and every protected mini route.
