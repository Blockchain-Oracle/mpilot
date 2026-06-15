'use client';

import type { OnboardingData, PolicyCategory, PolicyMode, StatePatcher } from '../_types';
import { StepShell } from './StepShell';

const CATEGORIES: ReadonlyArray<readonly [label: string, key: PolicyCategory]> = [
  ['Aave actions', 'aave'],
  ['DEX swaps', 'dex'],
  ['Bridge', 'bridge'],
  ['Yield', 'yield'],
  ['Restaking', 'restaking'],
];

function PolicyToggle({
  value,
  onChange,
}: {
  readonly value: PolicyMode;
  readonly onChange: (next: PolicyMode) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        gap: 2,
        background: 'var(--paper-2)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
      }}
    >
      {(['manual', 'autopilot'] as const).map((o) => {
        const selected = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={selected}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.74rem',
              padding: '5px 12px',
              borderRadius: 'var(--r-sm)',
              border: 'none',
              cursor: 'pointer',
              background: selected
                ? o === 'autopilot'
                  ? 'var(--primary)'
                  : 'var(--card)'
                : 'transparent',
              color: selected
                ? o === 'autopilot'
                  ? 'var(--on-primary)'
                  : 'var(--ink)'
                : 'var(--ink-3)',
              boxShadow: selected && o === 'manual' ? 'var(--sh-1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function CapField({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
}) {
  return (
    <label className="card" style={{ padding: '12px 14px', display: 'block' }}>
      <span className="ds-eyebrow" style={{ display: 'block', marginBottom: 6 }}>
        {label} cap
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '1rem', color: 'var(--ink-3)' }}>
          $
        </span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
          inputMode="numeric"
          aria-label={`${label} cap (USD)`}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--mono)',
            fontSize: '1rem',
            color: 'var(--ink)',
          }}
        />
      </span>
    </label>
  );
}

interface StepPolicyProps {
  readonly data: OnboardingData;
  readonly set: StatePatcher;
  readonly onBack: () => void;
  readonly onNext: () => void;
}

export function StepPolicy({ data, set, onBack, onNext }: StepPolicyProps) {
  return (
    <StepShell
      wide
      eyebrow="Autopilot policy"
      title="What can run without you?"
      lede="Manual asks before every action in that category. Autopilot lets the session key sign within your caps. Start conservative — you can change this anytime."
      onBack={onBack}
      onNext={onNext}
      nextLabel="Review"
    >
      <div className="card" style={{ padding: 6 }}>
        {CATEGORIES.map(([label, key], i) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '13px 14px',
              borderTop: i ? '1px solid var(--line)' : 'none',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.94rem',
                color: 'var(--ink)',
                fontWeight: 500,
              }}
            >
              {label}
            </span>
            <PolicyToggle
              value={data.policies[key]}
              onChange={(v) => set((prev) => ({ policies: { ...prev.policies, [key]: v } }))}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
        <CapField
          label="Per transaction"
          value={data.caps.perTx}
          onChange={(v) => set((prev) => ({ caps: { ...prev.caps, perTx: v } }))}
        />
        <CapField
          label="Per day"
          value={data.caps.perDay}
          onChange={(v) => set((prev) => ({ caps: { ...prev.caps, perDay: v } }))}
        />
      </div>
    </StepShell>
  );
}
