'use client';

import { useState } from 'react';
import { deployConciergeAccount } from '../../_lib/conciergeDeploy';
import { Check } from '../../_lib/icons';
import { sanitizeErrorMessage } from '../../_lib/sanitizeError';
import { useConnectedWallet } from '../../_lib/useConnectedWallet';
import type { StatePatcher } from '../_types';
import { useConciergeAccount } from './ConciergeAccountContext';
import { PhaseRunner } from './PhaseRunner';
import { StepShell } from './StepShell';

const PHASES = [
  'Deploying ERC-4337 smart account',
  'Sponsoring gas via Pimlico paymaster',
  'Linking session-key module',
] as const;

interface StepAccountProps {
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly set: StatePatcher;
}

type Phase = 'idle' | 'running' | 'done' | 'error';

function shortAddr(addr: `0x${string}`): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function StepAccount({ onBack, onNext, set }: StepAccountProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [accountAddress, setAccountAddress] = useState<`0x${string}` | null>(null);

  const { getWalletClient, address: ownerAddress } = useConnectedWallet();
  const { setAccount } = useConciergeAccount();

  const handleDeploy = async () => {
    setErrorMsg(null);
    setPhase('running');
    try {
      const walletClient = await getWalletClient();
      if (!walletClient) {
        throw new Error('Wallet not connected. Go back and connect a wallet.');
      }
      const account = await deployConciergeAccount({
        walletClient,
        chain: 'mantle-sepolia',
      });
      setAccount(account);
      setAccountAddress(account.smartAccountAddress);
      set({ smartAccountAddress: account.smartAccountAddress });
      setPhase('done');
    } catch (err) {
      setErrorMsg(sanitizeErrorMessage(err));
      setPhase('error');
    }
  };

  return (
    <StepShell
      eyebrow="Smart account"
      title="Deploy your account — on us"
      lede="Concierge sponsors the deploy through a paymaster. You pay zero MNT in gas."
      onBack={onBack}
      onNext={phase === 'done' ? onNext : undefined}
    >
      <PhaseRunner
        phases={[...PHASES]}
        running={phase === 'running'}
        // We drive `done` from the real deploy promise above, not from the
        // animation finishing. The PhaseRunner just animates while we wait.
        done={undefined}
      />
      {(phase === 'idle' || phase === 'error') && (
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={handleDeploy}
          disabled={!ownerAddress}
          style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}
        >
          {phase === 'error' ? 'Retry deploy · 0 MNT' : 'Deploy account · 0 MNT'}
        </button>
      )}
      {phase === 'error' && errorMsg && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: '10px 13px',
            background: 'var(--danger-soft)',
            border: '1px solid var(--danger-line)',
            borderRadius: 'var(--r-md)',
            fontFamily: 'var(--mono)',
            fontSize: '0.78rem',
            color: 'var(--danger)',
          }}
        >
          {errorMsg}
        </div>
      )}
      {phase === 'done' && accountAddress && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 14,
            padding: '12px 14px',
            background: 'var(--signal-soft)',
            border: '1px solid var(--signal-line)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <Check size={16} aria-hidden style={{ color: 'var(--signal)' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--signal)' }}>
            Account ready · {shortAddr(accountAddress)} · gas sponsored
          </span>
        </div>
      )}
    </StepShell>
  );
}
