'use client';

interface QuoteOutput {
  bestRoute: string;
  bestAmountOut: string;
  allRoutes?: Record<string, { amountOut?: string } | null>;
}

function isQuote(o: unknown): o is QuoteOutput {
  return (
    typeof o === 'object' &&
    o !== null &&
    typeof (o as QuoteOutput).bestRoute === 'string' &&
    typeof (o as QuoteOutput).bestAmountOut === 'string'
  );
}

export function QuoteCard({ output, label }: { output: unknown; label: string }) {
  if (!isQuote(output)) return null;
  const routes = Object.entries(output.allRoutes ?? {}).filter(([, v]) => v && v.amountOut);
  return (
    <div className="gcard">
      <div className="gcard-head">
        <span className="ds-eyebrow">{label}</span>
        <span className="pill" data-status="confirmed">
          <span className="dot" />
          quote
        </span>
      </div>
      <div className="big">{output.bestAmountOut}</div>
      <p className="sub" style={{ marginTop: 4 }}>
        best route: <strong>{output.bestRoute}</strong>
      </p>
      {routes.length > 0 && (
        <dl className="gcard-rows" style={{ marginTop: 'var(--space-3)' }}>
          {routes.map(([name, v]) => (
            <div key={name} style={{ display: 'contents' }}>
              <dt>{name}</dt>
              <dd>{v?.amountOut}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
