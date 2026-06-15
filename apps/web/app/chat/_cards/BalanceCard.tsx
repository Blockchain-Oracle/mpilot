'use client';

import { fmtUnits } from './format';

interface BalanceOutput {
  balance: string;
  decimals: number;
  symbol: string;
}

function isBalance(o: unknown): o is BalanceOutput {
  return (
    typeof o === 'object' &&
    o !== null &&
    typeof (o as BalanceOutput).balance === 'string' &&
    typeof (o as BalanceOutput).symbol === 'string'
  );
}

export function BalanceCard({ output, label }: { output: unknown; label: string }) {
  if (!isBalance(output)) return null;
  return (
    <div className="gcard">
      <div className="gcard-head">
        <span className="ds-eyebrow">{label}</span>
        <span className="pill" data-status="confirmed">
          <span className="dot" />
          balance
        </span>
      </div>
      <div className="big">
        {fmtUnits(output.balance, output.decimals)} <span className="sub">{output.symbol}</span>
      </div>
      <dl className="gcard-rows" style={{ marginTop: 'var(--space-3)' }}>
        <dt>base units</dt>
        <dd>{output.balance}</dd>
        <dt>decimals</dt>
        <dd>{output.decimals}</dd>
      </dl>
    </div>
  );
}
