'use client';

import { useState } from 'react';
import type { Hex } from 'viem';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { MonoRef, StatusPill } from './atoms';
import { TxReceiptCard } from './TxReceiptCard';

interface Proposal {
  kind: 'proposal';
  to: string;
  value: string;
  data: string;
  chainId: number;
  summary: string;
}

function isProposal(o: unknown): o is Proposal {
  return (
    typeof o === 'object' &&
    o !== null &&
    (o as Proposal).kind === 'proposal' &&
    typeof (o as Proposal).to === 'string' &&
    typeof (o as Proposal).data === 'string'
  );
}

export function ProposalCard({ output, label }: { output: unknown; label: string }) {
  const [rejected, setRejected] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const { sendTransaction, data: hash, isPending, error } = useSendTransaction();
  const { data: receipt, isLoading: confirming } = useWaitForTransactionReceipt({
    hash,
  });

  if (!isProposal(output)) return null;
  const p = output;

  // Confirmed → morph into a receipt card.
  if (hash && receipt) {
    return (
      <TxReceiptCard
        txHash={hash}
        chainId={p.chainId}
        blockNumber={receipt.blockNumber?.toString()}
        summary={p.summary}
        reverted={receipt.status === 'reverted'}
      />
    );
  }

  const status = rejected
    ? { s: 'rejected' as const, label: 'rejected' }
    : hash
      ? { s: 'executing' as const, label: confirming ? 'confirming' : 'submitted' }
      : isPending
        ? { s: 'executing' as const, label: 'awaiting signature' }
        : { s: 'awaiting-approval' as const, label: 'awaiting approval' };

  return (
    <div className="gcard">
      <div className="gcard-head">
        <span className="ds-eyebrow">{label}</span>
        <StatusPill status={status.s} label={status.label} />
      </div>
      <p className="summary">{p.summary}</p>
      <dl className="gcard-rows">
        <dt>to</dt>
        <dd>
          <MonoRef value={p.to} chainId={p.chainId} kind="address" />
        </dd>
        <dt>value</dt>
        <dd>{p.value} wei</dd>
      </dl>

      <button type="button" className="raw-toggle" onClick={() => setShowRaw((v) => !v)}>
        {showRaw ? '▾ hide raw calldata' : '▸ show raw calldata'}
      </button>
      {showRaw && <pre className="raw-pre">{p.data}</pre>}

      {error && !hash && (
        <p className="sub" style={{ color: 'var(--danger)', marginTop: 'var(--space-2)' }}>
          {error.message.slice(0, 160)}
        </p>
      )}

      {!hash && !rejected && (
        <div className="gcard-foot">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isPending}
            onClick={() =>
              sendTransaction({
                to: p.to as Hex,
                value: BigInt(p.value),
                data: p.data as Hex,
                chainId: p.chainId,
              })
            }
          >
            {isPending ? 'Signing…' : 'Approve & Sign'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={isPending}
            onClick={() => setRejected(true)}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
