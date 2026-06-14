'use client';

import { BrandMark } from '@concierge-mantle/ui';
import { Check } from '../../_lib/icons';
import type { OnboardingData, StatePatcher, WalletId } from '../_types';
import { StepShell } from './StepShell';

interface WalletEntry {
  readonly name: WalletId;
  readonly brand: string;
  readonly sub: string;
}

const WALLETS: readonly WalletEntry[] = [
  { name: 'Privy', brand: 'privy', sub: 'Email, social, or embedded wallet' },
  { name: 'Reown', brand: 'reown', sub: 'WalletConnect v2 · 400+ wallets' },
  { name: 'Browser wallet', brand: 'browser', sub: 'MetaMask, Rabby, Coinbase Wallet' },
];

interface StepConnectProps {
  readonly data: OnboardingData;
  readonly set: StatePatcher;
  readonly onNext: () => void;
}

export function StepConnect({ data, set, onNext }: StepConnectProps) {
  return (
    <StepShell
      eyebrow="No account yet"
      title="Connect a wallet to begin"
      lede="Your wallet signs every move. Concierge never takes custody — you stay the principal."
      onNext={onNext}
      nextDisabled={!data.wallet}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {WALLETS.map((w) => {
          const selected = data.wallet === w.name;
          return (
            <button
              key={w.name}
              type="button"
              onClick={() => set({ wallet: w.name })}
              aria-pressed={selected}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                textAlign: 'left',
                padding: '15px 16px',
                cursor: 'pointer',
                background: 'var(--card)',
                border: `1px solid ${selected ? 'var(--primary)' : 'var(--line)'}`,
                borderRadius: 'var(--r-lg)',
                boxShadow: selected ? '0 0 0 3px var(--primary-soft)' : 'var(--sh-1)',
                transition: 'all 0.15s',
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
                  {w.sub}
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
