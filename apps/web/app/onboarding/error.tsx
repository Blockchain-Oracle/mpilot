'use client';

import { useEffect } from 'react';

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // biome-ignore lint/suspicious/noConsole: developer-facing dev signal
    console.error('[apps/web/onboarding] Error boundary fired', error);
  }, [error]);

  return (
    <div role="alert" style={{ padding: 48, display: 'grid', placeItems: 'center' }}>
      <div style={{ maxWidth: 480, textAlign: 'center', display: 'grid', gap: 12 }}>
        <h1 className="ds-h-card">Wizard hit a snag.</h1>
        <p className="ds-body" style={{ color: 'var(--ink-2)' }}>
          Your wallet state is safe. Try the step again.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-md"
          style={{ justifySelf: 'center' }}
          onClick={() => reset()}
        >
          Retry step
        </button>
      </div>
    </div>
  );
}
