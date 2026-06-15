'use client';

import Link from 'next/link';
import { LockboxGlyph, Moon, Sun } from '../../_lib/icons';
import { useTheme } from '../../_lib/ThemeProvider';
import { ONBOARDING_STEPS } from '../_types';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: layout component with inline styles — fine
export function MinimalHeader({ stepIdx }: { readonly stepIdx: number }) {
  const { theme, toggle } = useTheme();
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 'var(--nav-h)',
        background: 'var(--card)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 24px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          position: 'relative',
        }}
      >
        <Link
          href="/"
          aria-label="mPilot home"
          style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink)' }}
        >
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'var(--ink)',
              color: 'var(--paper)',
            }}
          >
            <LockboxGlyph size={17} />
          </span>
          <span
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 800,
              fontSize: '1.08rem',
              letterSpacing: '-0.02em',
            }}
          >
            mPilot
          </span>
        </Link>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            {ONBOARDING_STEPS.map((s, i) => (
              <span
                key={s}
                aria-hidden
                style={{
                  width: i === stepIdx ? 20 : 7,
                  height: 7,
                  borderRadius: 999,
                  transition: 'all 0.3s',
                  background:
                    i < stepIdx
                      ? 'var(--signal)'
                      : i === stepIdx
                        ? 'var(--primary)'
                        : 'var(--line-2)',
                }}
              />
            ))}
          </div>
          <span
            style={{ fontFamily: 'var(--mono)', fontSize: '0.74rem', color: 'var(--ink-3)' }}
            aria-live="polite"
          >
            Step {stepIdx + 1} of {ONBOARDING_STEPS.length}
          </span>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="btn btn-ghost btn-sm"
            style={{ padding: 8 }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link
            href="/"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--ink-3)',
            }}
          >
            Exit
          </Link>
        </div>
      </div>
    </header>
  );
}
