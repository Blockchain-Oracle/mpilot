'use client';

import type { ReactNode } from 'react';
import { ArrowRight } from '../../_lib/icons';

interface StepShellProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede?: string;
  readonly children: ReactNode;
  readonly onBack?: () => void;
  readonly onNext?: () => void;
  readonly nextLabel?: string;
  readonly nextDisabled?: boolean;
  readonly wide?: boolean;
}

export function StepShell({
  eyebrow,
  title,
  lede,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  wide,
}: StepShellProps) {
  return (
    <div style={{ width: `min(${wide ? 620 : 520}px, 100%)`, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <span
          className="ds-eyebrow"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}
        >
          <span aria-hidden style={{ color: 'var(--primary)' }}>
            ✦
          </span>
          {eyebrow}
        </span>
        <h1
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 800,
            fontSize: 'clamp(1.7rem, 3.4vw, 2.4rem)',
            letterSpacing: '-0.03em',
            color: 'var(--ink)',
            margin: '0 0 12px',
          }}
        >
          {title}
        </h1>
        {lede && (
          <p
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '1.02rem',
              color: 'var(--ink-2)',
              lineHeight: 1.5,
              maxWidth: 460,
              margin: '0 auto',
            }}
          >
            {lede}
          </p>
        )}
      </div>
      <div>{children}</div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 24,
          justifyContent: onBack ? 'space-between' : 'center',
        }}
      >
        {onBack && (
          <button type="button" className="btn btn-ghost btn-md" onClick={onBack}>
            Back
          </button>
        )}
        {onNext && (
          <button
            type="button"
            className="btn btn-primary btn-md"
            onClick={onNext}
            disabled={nextDisabled}
            style={{ minWidth: onBack ? 0 : 200, justifyContent: 'center' }}
          >
            {nextLabel} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
