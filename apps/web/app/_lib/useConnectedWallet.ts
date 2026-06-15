'use client';

/**
 * useConnectedWallet — single source of truth for "is the user signed in
 * and does an EVM wallet exist," abstracting over Privy's wallet flavours
 * (embedded vs external).
 *
 * Returns:
 *   - `address` — the active wallet's checksummed 0x address, or `null`.
 *   - `walletKind` — 'embedded' (Privy's in-browser wallet) | 'external'
 *     (MetaMask / Rabby / Coinbase / WalletConnect) | null.
 *   - `getWalletClient()` — async; lazily builds a viem `WalletClient` from
 *     the wallet's EIP-1193 provider. We don't eagerly construct it because
 *     Privy lazy-loads the provider per-wallet to avoid the cost on first
 *     paint.
 *   - `ready` — true once Privy has finished hydrating (`usePrivy().ready`).
 *   - `authenticated` — Privy's authenticated flag (user logged in).
 *
 * Per Context7 / Privy docs: external wallets surface via `useWallets()`;
 * the embedded wallet is the one with `walletClientType === 'privy'`.
 */
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCallback } from 'react';
import { createWalletClient, custom, type Hex, type WalletClient } from 'viem';
import { mantleSepolia } from './wagmi';

export type WalletKind = 'embedded' | 'external';

export interface ConnectedWalletState {
  readonly ready: boolean;
  readonly authenticated: boolean;
  readonly address: Hex | null;
  readonly walletKind: WalletKind | null;
  readonly getWalletClient: () => Promise<WalletClient | null>;
}

export function useConnectedWallet(): ConnectedWalletState {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  // Prefer the embedded wallet when both exist (Privy's recommended priority
  // — embedded is owned by the agent's session-key flow downstream).
  const embedded = wallets.find((w) => w.walletClientType === 'privy');
  const external = wallets.find((w) => w.walletClientType !== 'privy');
  const active = embedded ?? external ?? null;

  const address = (active?.address as Hex | undefined) ?? null;
  const walletKind: WalletKind | null = active
    ? active.walletClientType === 'privy'
      ? 'embedded'
      : 'external'
    : null;

  const getWalletClient = useCallback(async () => {
    if (!active) return null;
    const provider = await active.getEthereumProvider();
    return createWalletClient({
      account: active.address as Hex,
      chain: mantleSepolia,
      transport: custom(provider),
    });
  }, [active]);

  return {
    ready,
    authenticated,
    address,
    walletKind,
    getWalletClient,
  };
}
