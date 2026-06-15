'use client';

/**
 * Chain-mismatch gate: when the active wallet is on a chain we don't support
 * (or specifically the wrong Mantle chain), surface a prompt to switch.
 *
 * Used by every signature-requiring component (StepAccount, StepIdentity, the
 * future /app proposal flow) to render an inline "Switch to Mantle Sepolia"
 * banner instead of silently failing the next signature.
 *
 * Per wagmi v2 + Context7: `useChainId()` returns the current connected chain,
 * `useSwitchChain()` returns `{switchChain, isPending}`. Privy synchronises
 * the active wallet's chain into wagmi's state so this works for both
 * embedded and external wallets.
 */
import { useChainId, useSwitchChain } from 'wagmi';
import { mantleSepolia } from './wagmi';

export interface ChainGateState {
  readonly currentChainId: number;
  readonly expectedChainId: number;
  readonly isCorrectChain: boolean;
  readonly switchToExpected: () => void;
  readonly isSwitching: boolean;
}

export function useChainGate(expectedChainId: number = mantleSepolia.id): ChainGateState {
  const currentChainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  return {
    currentChainId,
    expectedChainId,
    isCorrectChain: currentChainId === expectedChainId,
    switchToExpected: () => switchChain({ chainId: expectedChainId }),
    isSwitching: isPending,
  };
}
