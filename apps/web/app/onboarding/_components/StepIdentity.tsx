'use client';

import { useState } from 'react';
import { Check, LockboxGlyph } from '../../_lib/icons';
import { PhaseRunner } from './PhaseRunner';
import { StepShell } from './StepShell';

const PHASES = ['Minting ERC-8004 identity', 'Registering on reputation registry'] as const;

interface StepIdentityProps {
  readonly onBack: () => void;
  readonly onNext: () => void;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: NFT preview with inline styles — fine
export function StepIdentity({ onBack, onNext }: StepIdentityProps) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  return (
    <StepShell
      eyebrow="ERC-8004 identity"
      title="Mint your agent's identity"
      lede="This NFT is your agent's permanent identity. Every action accumulates reputation against it — forever, on-chain."
      onBack={onBack}
      onNext={phase === 'done' ? onNext : undefined}
    >
      <div style={{ display: 'grid', placeItems: 'center', marginBottom: 18 }}>
        <div
          className="grid-bg"
          style={{
            position: 'relative',
            width: 160,
            height: 160,
            borderRadius: 18,
            overflow: 'hidden',
            background:
              'linear-gradient(135deg, oklch(0.42 0.20 268), oklch(0.52 0.20 268) 50%, oklch(0.46 0.18 320))',
            display: 'grid',
            placeItems: 'center',
            filter: phase === 'done' ? 'none' : 'grayscale(0.4)',
            opacity: phase === 'running' ? 0.7 : 1,
            transition: 'all 0.4s',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(to right, oklch(1 0 0 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div
            style={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'oklch(1 0 0 / 0.14)',
              border: '1px solid oklch(1 0 0 / 0.25)',
              color: '#fff',
            }}
          >
            <LockboxGlyph size={34} />
          </div>
          {phase === 'done' && (
            <span
              style={{
                position: 'absolute',
                bottom: 12,
                fontFamily: 'var(--mono)',
                fontSize: '0.72rem',
                color: '#fff',
              }}
            >
              Agent #4200
            </span>
          )}
        </div>
      </div>
      {phase === 'idle' && (
        <button
          type="button"
          className="btn btn-primary btn-md"
          onClick={() => setPhase('running')}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Mint identity NFT
        </button>
      )}
      {phase === 'running' && (
        <PhaseRunner phases={[...PHASES]} running done={() => setPhase('done')} />
      )}
      {phase === 'done' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: 'var(--mono)',
            fontSize: '0.82rem',
            color: 'var(--signal)',
          }}
        >
          <Check size={16} aria-hidden /> Agent #4200 minted · reputation starts at 0
        </div>
      )}
    </StepShell>
  );
}
