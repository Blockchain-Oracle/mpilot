import Link from 'next/link';
import { LockboxGlyph } from '../_lib/icons';

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line)',
        padding: '40px 28px 56px',
        background: 'var(--paper)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 22,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/"
          aria-label="Concierge home"
          style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-2)' }}
        >
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'var(--ink)',
              color: 'var(--paper)',
            }}
          >
            <LockboxGlyph size={14} />
          </span>
          <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: '0.95rem' }}>
            Concierge
          </span>
        </Link>
        <div
          style={{
            display: 'flex',
            gap: 18,
            fontFamily: 'var(--mono)',
            fontSize: '0.78rem',
            color: 'var(--ink-3)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          <Link href="/docs">Docs</Link>
          <Link
            href="https://github.com/Blockchain-Oracle/concierge"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </Link>
          <Link href="/agent/0">Public agent feed</Link>
        </div>
      </div>
    </footer>
  );
}
