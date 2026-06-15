'use client';

import { useState } from 'react';
import { addressUrl, truncate, txUrl } from './format';

export type PillStatus =
  | 'awaiting-approval'
  | 'executing'
  | 'confirmed'
  | 'attested'
  | 'failed'
  | 'rejected';

export function StatusPill({ status, label }: { status: PillStatus; label: string }) {
  return (
    <span className="pill" data-status={status}>
      <span className="dot" />
      {label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy-btn"
      aria-label="Copy to clipboard"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? '✓ copied' : 'copy'}
    </button>
  );
}

/** Mono address/hash with copy + MantleScan link. */
export function MonoRef({
  value,
  chainId,
  kind,
}: {
  value: string;
  chainId: number;
  kind: 'tx' | 'address';
}) {
  const href = kind === 'tx' ? txUrl(value, chainId) : addressUrl(value, chainId);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {href ? (
        <a className="mono-link" href={href} target="_blank" rel="noreferrer" title={value}>
          {truncate(value)}
        </a>
      ) : (
        <span className="ds-mono" title={value}>
          {truncate(value)}
        </span>
      )}
      <CopyButton value={value} />
    </span>
  );
}
