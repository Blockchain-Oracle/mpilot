'use client';

import { mantleScanAddressUrl, mantleScanTxUrl } from '@mpilot/sdk';
import { formatUnits, type Hex } from 'viem';

/** Middle-truncate an address/hash for display: 0x1234…abcd. */
export function truncate(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}…${value.slice(-tail)}`;
}

/** Format a base-unit string into a human decimal, falling back to the raw string. */
export function fmtUnits(base: string, decimals = 18): string {
  try {
    return formatUnits(BigInt(base), decimals);
  } catch {
    return base;
  }
}

/** MantleScan tx URL, or null when the hash/chain is malformed (never throws in render). */
export function txUrl(hash: string, chainId: number): string | null {
  try {
    return mantleScanTxUrl(hash as Hex, chainId);
  } catch {
    return null;
  }
}

export function addressUrl(addr: string, chainId: number): string | null {
  try {
    return mantleScanAddressUrl(addr as Hex, chainId);
  } catch {
    return null;
  }
}
