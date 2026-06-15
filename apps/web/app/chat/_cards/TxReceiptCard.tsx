'use client';

import { MonoRef } from './atoms';

export function TxReceiptCard({
  txHash,
  chainId,
  blockNumber,
  summary,
  reverted,
  revertReason,
}: {
  txHash: string;
  chainId: number;
  blockNumber?: string | number;
  summary?: string;
  reverted?: boolean;
  revertReason?: string;
}) {
  return (
    <div className="gcard">
      <div className="gcard-head">
        <span className="ds-eyebrow">
          {reverted ? 'transaction reverted' : 'transaction confirmed'}
        </span>
        <span className="pill" data-status={reverted ? 'failed' : 'confirmed'}>
          <span className="dot" />
          {reverted ? 'reverted' : 'confirmed'}
        </span>
      </div>
      {summary && <p className="summary">{summary}</p>}
      <dl className="gcard-rows">
        <dt>tx</dt>
        <dd>
          <MonoRef value={txHash} chainId={chainId} kind="tx" />
        </dd>
        {blockNumber !== undefined && (
          <>
            <dt>block</dt>
            <dd>{String(blockNumber)}</dd>
          </>
        )}
        {reverted && revertReason && (
          <>
            <dt>reason</dt>
            <dd style={{ color: 'var(--danger)' }}>{revertReason}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
