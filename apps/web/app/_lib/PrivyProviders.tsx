'use client';

/**
 * Privy + Wagmi + React Query provider stack.
 *
 * Nesting order (per Privy + Reown docs verified via Context7):
 *   <PrivyProvider>
 *     <QueryClientProvider>
 *       <WagmiProvider config={wagmiConfig}>      ← from `@privy-io/wagmi`
 *         {children}
 *
 * The Privy SDK owns the connector list (embedded wallet, WalletConnect,
 * injected) — we don't pass connectors into wagmi. Privy synchronises the
 * active wallet into wagmi's state so any downstream `useAccount` /
 * `useWalletClient` / `useChainId` hook just works.
 *
 * Designer's three onboarding tiles (Privy / Reown / Browser wallet) all
 * call `privy.login()` with different `loginMethods` arrays — they're
 * three UX entry-points into the same SDK, not three SDKs.
 */
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { mantleSepolia, SUPPORTED_CHAINS, wagmiConfig } from './wagmi';

export function PrivyProviders({ children }: { readonly children: ReactNode }) {
  // Per @tanstack/react-query Next.js guidance: instantiate the client once
  // per mount so React Strict Mode (double-mount in dev) doesn't share state
  // across instances.
  const [queryClient] = useState(() => new QueryClient());

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    // We fail-loud in dev so a missing env var doesn't silently degrade to
    // "wallet connect modal never appears."
    throw new Error(
      '[apps/web] NEXT_PUBLIC_PRIVY_APP_ID is not set. Add it to apps/web/.env.local before booting the dev server.',
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Embedded wallet for users without an existing wallet (the "Privy"
        // prototype tile). Created on the user's FIRST login.
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
        // All three prototype tiles surface here; per-tile filtering happens
        // at the call site via `privy.login({ loginMethods })`.
        loginMethods: ['email', 'wallet', 'google'],
        defaultChain: mantleSepolia,
        supportedChains: [...SUPPORTED_CHAINS],
        appearance: {
          theme: 'light',
          accentColor: '#5046E5',
          logo: undefined,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
