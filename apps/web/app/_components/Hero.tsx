/**
 * Hero — top of the landing. Designer's prototype includes a live ticking
 * demo card here; engineering v1 ships the headline + CTA + a placeholder
 * card. The live tick demo wires up in story-115 when @mpilot/react
 * exposes the SSE hooks against the worker.
 */
import Link from 'next/link';
import { ArrowRight } from '../_lib/icons';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: marketing hero with inline styles — fine
export function Hero() {
  return (
    <section
      id="top"
      style={{
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 72,
        paddingBottom: 88,
      }}
    >
      <div
        aria-hidden
        className="grid-bg"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.45,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          maxWidth: 'var(--maxw)',
          margin: '0 auto',
          padding: '0 28px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 48,
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <span className="ds-eyebrow">Autonomous DeFi · Mantle</span>
          <h1 className="ds-display" style={{ marginTop: 12 }}>
            Set a goal in English.
            <br />
            Wake up richer.
          </h1>
          <p className="ds-lede" style={{ marginTop: 24, maxWidth: 560 }}>
            Concierge plans, simulates, proposes, and executes across seven Mantle protocols every
            tick. Every move is attested on-chain via ERC-8004 — so the reputation is yours, not the
            wallet&apos;s.
          </p>
          <div style={{ marginTop: 36, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/onboarding" className="btn btn-primary btn-lg">
              Try on Sepolia <ArrowRight size={16} />
            </Link>
            <Link href="/docs" className="btn btn-ghost btn-lg">
              Read the docs
            </Link>
          </div>
          <div
            style={{
              marginTop: 22,
              display: 'flex',
              gap: 16,
              fontFamily: 'var(--mono)',
              fontSize: '0.74rem',
              color: 'var(--ink-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <span>Gas sponsored</span>
            <span>·</span>
            <span>No seed phrase</span>
            <span>·</span>
            <span>Open source</span>
          </div>
        </div>

        <section
          className="card"
          aria-label="Concierge live tick preview"
          style={{
            position: 'relative',
            padding: 22,
            boxShadow: 'var(--sh-2)',
            maxWidth: 760,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <span className="ds-eyebrow">Live tick preview</span>
            <span className="badge">
              <span className="dot" style={{ background: 'var(--signal)' }} />
              Streaming
            </span>
          </div>
          <p
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.78rem',
              color: 'var(--ink-3)',
              lineHeight: 1.7,
            }}
          >
            Wires up in story-115 — `@mpilot/react` SSE hook against the worker. For now this is the
            visual envelope so the page layout locks before the data does.
          </p>
        </section>
      </div>
    </section>
  );
}
