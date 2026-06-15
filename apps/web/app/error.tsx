'use client';

/**
 * Global error boundary. App Router calls this when a server component or
 * client component subtree throws. We render a branded, actionable fallback
 * with a Reload button + a link to file a GitHub issue with the digest (so
 * Abu can find the matching server log without us shipping the raw stack to
 * the browser).
 */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-component digest fields are safe to log to the dev console — they
    // are not sensitive and link to the same line in the server's logs.
    // biome-ignore lint/suspicious/noConsole: developer-facing dev-only signal
    console.error('[apps/web] Unhandled error boundary fired', error);
  }, [error]);

  const reportUrl = new URL('https://github.com/Blockchain-Oracle/mpilot/issues/new');
  reportUrl.searchParams.set('title', 'Web app error');
  // Include ONLY the server-side digest in the URL body. `error.message`
  // often contains markdown special chars + sensitive context (token
  // fragments, request URLs) — interpolating it into a GitHub issue body is
  // a markdown-injection sink and a PII-leak channel. Abu cross-references
  // the digest against the server log instead.
  reportUrl.searchParams.set(
    'body',
    `**Digest:** \`${error.digest ?? 'unknown'}\`\n\n**Steps to reproduce:**\n1. \n2. \n\n**Browser + URL:** \n\n_The matching server-side stack is in the logs under this digest; don't paste the in-browser error message here, it may contain sensitive context._`,
  );

  return (
    <div
      role="alert"
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 480, textAlign: 'center', display: 'grid', gap: 16 }}>
        <h1 className="ds-h-sec">Something broke.</h1>
        <p className="ds-body" style={{ color: 'var(--ink-2)' }}>
          The error has been logged. You can reload, or open an issue so we can fix it.
        </p>
        {error.digest && (
          <code style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
            digest: {error.digest}
          </code>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary btn-md" onClick={() => reset()}>
            Try again
          </button>
          <a
            className="btn btn-secondary btn-md"
            href={reportUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
          >
            Report on GitHub ↗
          </a>
        </div>
      </div>
    </div>
  );
}
