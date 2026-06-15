'use client';

/**
 * r2 — holds the deployed `ConciergeAccount` between the StepAccount and
 * StepIdentity wizard steps. The `ConciergeAccount` carries a viem-side
 * kernel client + a viem account that the ERC-8004 mint needs; serializing
 * those into `OnboardingData` would be brittle, so we hold them in React
 * Context that's local to the onboarding subtree.
 *
 * The serialisable bits (smartAccountAddress, agentId) still flow into
 * `OnboardingData` so the activate-step review + downstream Supabase write
 * have plain data.
 */
import type { ConciergeAccount } from '@mpilot/smart-account';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

interface ConciergeAccountContextValue {
  readonly account: ConciergeAccount | null;
  readonly setAccount: (next: ConciergeAccount | null) => void;
}

const Ctx = createContext<ConciergeAccountContextValue | null>(null);

export function ConciergeAccountProvider({ children }: { readonly children: ReactNode }) {
  const [account, setAccount] = useState<ConciergeAccount | null>(null);
  return <Ctx.Provider value={{ account, setAccount }}>{children}</Ctx.Provider>;
}

export function useConciergeAccount(): ConciergeAccountContextValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useConciergeAccount must be used inside <ConciergeAccountProvider>');
  }
  return v;
}
