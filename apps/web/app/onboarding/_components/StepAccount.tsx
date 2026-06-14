'use client';

import { useState } from 'react';
import { Check } from '../../_lib/icons';
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
}

export function StepAccount({ onBack, onNext }: StepAccountProps) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
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
        done={() => setPhase('done')}
      />
      {phase === 'idle' && (
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => setPhase('running')}
          style={{ width: '100%', marginTop: 14, justifyContent: 'center' }}
        >
          Deploy account · 0 MNT
        </button>
      )}
      {phase === 'done' && (
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
            Account ready · 0x4f…91c4 · gas sponsored
          </span>
        </div>
      )}
    </StepShell>
  );
}
