'use client';

import { BalanceCard } from './BalanceCard';
import { FallbackCard } from './FallbackCard';
import { ProposalCard } from './ProposalCard';
import { QuoteCard } from './QuoteCard';

export interface ToolPartLike {
  toolName: string;
  state: string;
  output?: unknown;
  errorText?: string;
}

function labelFor(name: string): string {
  const [prov, ...rest] = name.split('_');
  return `${(prov ?? name).toUpperCase()} · ${rest.join(' ')}`.trim();
}

function hasKind(o: unknown, kind: string): boolean {
  return typeof o === 'object' && o !== null && (o as { kind?: unknown }).kind === kind;
}
function hasKeys(o: unknown, keys: string[]): boolean {
  return typeof o === 'object' && o !== null && keys.every((k) => k in (o as object));
}

export function ToolCard({ part }: { part: ToolPartLike }) {
  const label = labelFor(part.toolName);

  if (part.state === 'output-error') {
    return (
      <div className="gcard">
        <div className="gcard-head">
          <span className="ds-eyebrow">{label}</span>
          <span className="pill" data-status="failed">
            <span className="dot" />
            error
          </span>
        </div>
        <p className="summary" style={{ color: 'var(--danger)' }}>
          {part.errorText ?? 'The tool returned an error.'}
        </p>
      </div>
    );
  }

  if (part.state !== 'output-available') {
    // input-streaming / input-available → the tool is resolving server-side.
    return (
      <div className="gcard">
        <div className="gcard-head">
          <span className="ds-eyebrow">{label}</span>
          <span className="pill" data-status="executing">
            <span className="dot" />
            running
          </span>
        </div>
        <div className="shimmer" />
      </div>
    );
  }

  const out = part.output;
  if (hasKind(out, 'proposal')) return <ProposalCard output={out} label={label} />;
  if (hasKeys(out, ['balance', 'symbol'])) return <BalanceCard output={out} label={label} />;
  if (hasKeys(out, ['bestRoute', 'bestAmountOut'])) return <QuoteCard output={out} label={label} />;
  return <FallbackCard output={out} label={label} />;
}
