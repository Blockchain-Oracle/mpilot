# Story 67 — wagmi v2 + RainbowKit wallet connect at /connect

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-60-nextjs-15-scaffold, story-06-env-and-secrets-setup

## BDD Acceptance Criteria

```
Given a visitor navigates to /connect
When the page renders
Then a RainbowKit "Connect Wallet" button is visible
And the supported chains are Mantle Mainnet (5000) and Mantle Sepolia (5003) ONLY
And no other chains (Ethereum mainnet, Base, Arbitrum) appear in the chain switcher

Given a visitor clicks "Connect Wallet"
When they select WalletConnect / MetaMask / Coinbase Wallet / Rainbow
Then a connection prompt appears
And on success the wagmi `useAccount()` hook returns { isConnected: true, address: 0x... }

Given a connected user visits /app
When the wagmi state is hydrated
Then the dashboard renders (story-68 layout)
And the connected address is shown in the top bar truncated as `0x1234…5678`

Given a non-connected user visits /app or any /app/* route
When the layout mounts
Then they are redirected to /connect
And after connect they are redirected back to the originally-requested route (?next= param)

Given the developer runs Playwright e2e
When apps/web/e2e/wallet-connect.spec.ts runs
Then it stubs window.ethereum with a mock provider, asserts /connect renders RainbowKit modal, simulates connect, asserts redirect to /app
```

## File modification map

- `apps/web/app/connect/page.tsx` — NEW — `"use client"`; renders centered RainbowKit ConnectButton + branded copy.
- `apps/web/app/providers.tsx` — NEW — `"use client"`; wraps `<WagmiProvider>` + `<QueryClientProvider>` + `<RainbowKitProvider>`; consumed by app/layout.tsx.
- `apps/web/app/layout.tsx` — UPDATE — wrap children in `<Providers>`.
- `apps/web/lib/wagmi.ts` — NEW — wagmi config: `createConfig({ chains: [mantle, mantleSepolia], transports: { [mantle.id]: http(env.NEXT_PUBLIC_MANTLE_RPC_URL), [mantleSepolia.id]: http(env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC_URL) }, connectors: [...] })`. Defines `mantle` + `mantleSepolia` chain objects with chainId 5000 / 5003.
- `apps/web/lib/rainbowkit.ts` — NEW — RainbowKit theme using Patron design tokens (deep indigo accent, cream bg).
- `apps/web/middleware.ts` — NEW — redirects unauthenticated `/app/*` to `/connect?next=<path>`. (Auth state read from a session cookie set after wallet signature; for v1 the gate can be client-side in story-68 if SSR auth proves complex.)
- `apps/web/components/wallet/AddressPill.tsx` — NEW — truncated address display with copy-to-clipboard.
- `apps/web/package.json` — UPDATE — `wagmi@2`, `viem@2`, `@rainbow-me/rainbowkit@latest`, `@tanstack/react-query@5`.
- `apps/web/e2e/wallet-connect.spec.ts` — NEW — Playwright spec with mock injected provider.

## Shell verification

```bash
pnpm --filter web build
test $? -eq 0

# /connect renders
pnpm --filter web dev &
DEV_PID=$!
sleep 5
curl -sf http://localhost:3000/connect | grep -i "connect"
kill $DEV_PID

# Mantle chains configured (5000 + 5003)
grep -q "5000" apps/web/lib/wagmi.ts
grep -q "5003" apps/web/lib/wagmi.ts

# No other chains
! grep -E "mainnet|base|arbitrum|optimism|polygon" apps/web/lib/wagmi.ts || (echo "FAIL: other chains present" && exit 1)

# Playwright e2e
pnpm playwright test apps/web/e2e/wallet-connect.spec.ts
test $? -eq 0
```

## Notes

- **Context7 first**: query wagmi v2, RainbowKit, viem 2.x. APIs changed between wagmi v1 and v2 (`createConfig` shape, `useAccount` returns).
- Per ADR-008 + ADR-010: web uses wagmi + RainbowKit; mini uses Privy. Only Mantle Mainnet + Sepolia, no other chains.
- `mantle` chain object is NOT in viem core; define it inline (chainId 5000, RPC https://rpc.mantle.xyz, native MNT, explorer mantlescan.xyz). Same for mantleSepolia (5003).
- Theme: use `lightTheme({ accentColor: 'var(--accent)', ... })` to match Patron palette — do NOT use default RainbowKit purple.
- Middleware-based auth is the v1 target; if cookies are tricky, fall back to a client-side `useAccount()` gate in story-68 layout and ship that as v1. Note the deferral.
- `?next=` query param preserves originally-requested URL across the connect dance — standard SaaS pattern.
- Banned Tailwind classes auto-checked.
- File size < 400 LOC enforced.
- This story doesn't directly serve a demo-shape stage but unlocks Stages 3-5 (dashboard, freeze, audit).
