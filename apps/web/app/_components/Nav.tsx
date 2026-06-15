'use client';

/**
 * Sticky landing nav. Designer's prototype navigated via hard-coded
 * `mPilot X.html` strings; engineering port routes through Next's
 * `next/link` so the same nav works in production + dev + with prefetch.
 */
import Link from 'next/link';
import { LockboxGlyph, Moon, Sun } from '../_lib/icons';
import { useTheme } from '../_lib/ThemeProvider';

const NAV_LINKS: ReadonlyArray<readonly [label: string, href: string]> = [
  ['How it works', '#how'],
  ['Compare', '#compare'],
  ['Developers', '#dev'],
  ['Docs', '/docs'],
];

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: marketing nav with inline styles — fine
export function Nav() {
  const { theme, toggle } = useTheme();
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 'var(--nav-h)',
        background: 'color-mix(in oklab, var(--paper) 78%, transparent)',
        backdropFilter: 'blur(14px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
          padding: '0 28px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
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
              fontSize: '1.12rem',
              letterSpacing: '-0.02em',
            }}
          >
            mPilot
          </span>
        </Link>
        <nav style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {NAV_LINKS.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: 'var(--ink-2)',
                padding: '7px 11px',
                borderRadius: 'var(--r-sm)',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="badge"
            style={{
              borderColor: 'var(--warn-line)',
              color: 'var(--warn)',
              background: 'var(--warn-soft)',
            }}
          >
            <span className="dot" style={{ background: 'var(--warn)' }} />
            Mantle Sepolia
          </span>
          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="btn btn-ghost btn-sm"
            style={{ padding: 8 }}
            type="button"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link href="/onboarding" className="btn btn-primary btn-sm">
            Try on Sepolia
          </Link>
        </div>
      </div>
    </header>
  );
}
