'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from '../../_lib/icons';
import { parseGoal } from '../_parseGoal';
import type { OnboardingData, PolicyCategory } from '../_types';
import { StepShell } from './StepShell';

const CATEGORIES: ReadonlyArray<readonly [label: string, key: PolicyCategory]> = [
  ['Aave actions', 'aave'],
  ['DEX swaps', 'dex'],
  ['Bridge', 'bridge'],
  ['Yield', 'yield'],
  ['Restaking', 'restaking'],
];

function Review({ k, v }: { readonly k: string; readonly v: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: 14,
        alignItems: 'start',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.74rem',
          color: 'var(--ink-3)',
          paddingTop: 2,
        }}
      >
        {k}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.86rem', color: 'var(--ink)' }}>
        {v}
      </span>
    </div>
  );
}

export function StepActivate({
  data,
  onBack,
}: {
  readonly data: OnboardingData;
  readonly onBack: () => void;
}) {
  const chips = parseGoal(data.goal);
  const autos = CATEGORIES.filter(([, k]) => data.policies[k] === 'autopilot').map(([l]) => l);
  return (
    <StepShell
      wide
      eyebrow="Almost there"
      title="Review & activate"
      lede="Your agent fires its first tick within 60 seconds of activation."
    >
      <div
        className="card"
        style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <Review k="Wallet" v={data.wallet ?? '—'} />
        <Review k="Agent" v="Agent #4200 · ERC-8004 identity" />
        <Review
          k="Goal"
          v={<span style={{ fontFamily: 'var(--sans)', color: 'var(--ink)' }}>"{data.goal}"</span>}
        />
        {chips.length > 0 && (
          <Review
            k="Parameters"
            v={
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {chips.map((c) => (
                  <span
                    key={c.key}
                    className="badge"
                    style={{
                      background: 'var(--primary-soft)',
                      borderColor: 'var(--primary-line)',
                      color: 'var(--primary)',
                    }}
                  >
                    <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>{c.key}</span>{' '}
                    {data.overrides[c.key] ?? c.value}
                  </span>
                ))}
              </span>
            }
          />
        )}
        <Review
          k="Autopilot"
          v={autos.length > 0 ? autos.join(', ') : 'None — every action asks you first'}
        />
        <Review k="Caps" v={`$${data.caps.perTx || '0'}/tx · $${data.caps.perDay || '0'}/day`} />
      </div>
      <Link
        href="/app"
        className="btn btn-primary btn-lg"
        style={{
          width: '100%',
          marginTop: 16,
          justifyContent: 'center',
          fontSize: '1rem',
        }}
      >
        Activate agent <ArrowRight size={17} />
      </Link>
      <button
        type="button"
        className="btn btn-ghost btn-md"
        onClick={onBack}
        style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
      >
        Back
      </button>
    </StepShell>
  );
}
