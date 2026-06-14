'use client';

import { BrandMark } from '@concierge-mantle/ui';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { Check } from '../../_lib/icons';
import { useConnectedWallet } from '../../_lib/useConnectedWallet';
import type { OnboardingData, StatePatcher, WalletId } from '../_types';
import { StepShell } from './StepShell';

interface WalletEntry {
  readonly name: WalletId;
  readonly brand: string;
  readonly sub: string;
  /**
   * Privy `loginMethods` array passed when this tile is clicked. The same
   * SDK serves all three tiles; the filtering happens at modal-open time.
   */
  readonly methods: ReadonlyArray<'email' | 'google' | 'wallet'>;
}

const WALLETS: readonly WalletEntry[] = [
  {
    name: 'Privy',
    brand: 'privy',
    sub: 'Email, social, or embedded wallet',
    methods: ['email', 'google'],
  },
  {
    name: 'Reown',
    brand: 'reown',
    sub: 'WalletConnect v2 · 400+ wallets',
    methods: ['wallet'],
  },
  {
    name: 'Browser wallet',
    brand: 'browser',
    sub: 'MetaMask, Rabby, Coinbase Wallet',
    methods: ['wallet'],
  },
];

interface StepConnectProps {
  readonly data: OnboardingData;
  readonly set: StatePatcher;
  readonly onNext: () => void;
}

export function StepConnect({ data, set, onNext }: StepConnectProps) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address, walletKind } = useConnectedWallet();
  const [pending, setPending] = useState<WalletId | null>(null);

  // Sync Privy's connected wallet → onboarding state. Once Privy reports an
  // address, advance the wizard's `walletAddress` so the rest of the steps
  // (and the activate-step review) see real data.
  useEffect(() => {
    if (address && walletKind && address !== data.walletAddress) {
      set({ walletAddress: address, walletKind });
    }
  }, [address, walletKind, data.walletAddress, set]);

  const handleTile = async (w: WalletEntry) => {
    setPending(w.name);
    set({ wallet: w.name });
    try {
      if (authenticated) {
        // Switching wallet sources requires a fresh session — Privy's modal
        // doesn't surface a "swap wallet" entry once authenticated.
        await logout();
      }
      // Per Privy docs: passing `loginMethods` filters the modal's UI to the
      // requested entry-points. The user still sees the same SDK; we just
      // hide the irrelevant tabs.
      await login({ loginMethods: [...w.methods] });
    } finally {
      setPending(null);
    }
  };

  const connectedTile = data.wallet;
  return (
    <StepShell
      eyebrow="No account yet"
      title="Connect a wallet to begin"
      lede="Your wallet signs every move. Concierge never takes custody — you stay the principal."
      onNext={onNext}
      nextDisabled={!data.walletAddress}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {WALLETS.map((w) => {
          const selected = connectedTile === w.name && Boolean(data.walletAddress);
          const isPending = pending === w.name;
          return (
            <button
              key={w.name}
              type="button"
              onClick={() => handleTile(w)}
              disabled={!ready || pending !== null}
              aria-pressed={selected}
              aria-busy={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                textAlign: 'left',
                padding: '15px 16px',
                cursor: ready && !pending ? 'pointer' : 'wait',
                background: 'var(--card)',
                border: `1px solid ${selected ? 'var(--primary)' : 'var(--line)'}`,
                borderRadius: 'var(--r-lg)',
                boxShadow: selected ? '0 0 0 3px var(--primary-soft)' : 'var(--sh-1)',
                transition: 'all 0.15s',
                opacity: !ready || (pending !== null && !isPending) ? 0.5 : 1,
              }}
            >
              <BrandMark name={w.brand} size={38} radius={10} />
              <span style={{ flex: 1 }}>
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--sans)',
                    fontSize: '0.96rem',
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  {w.name}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.74rem',
                    color: 'var(--ink-3)',
                    marginTop: 2,
                  }}
                >
                  {selected && data.walletAddress
                    ? `${data.walletAddress.slice(0, 6)}…${data.walletAddress.slice(-4)}`
                    : isPending
                      ? 'Opening wallet…'
                      : w.sub}
                </span>
              </span>
              {selected && <Check size={18} aria-hidden style={{ color: 'var(--primary)' }} />}
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
