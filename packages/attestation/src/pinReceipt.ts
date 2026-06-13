import { ConciergeError } from '@concierge/sdk';
import type { PinFeedbackResult } from './pin.ts';

/**
 * Row shape written to `pin_receipts` (Drizzle schema in @concierge/db).
 * Both pin attempts are recorded — including failures — so audit queries
 * can answer "did we pin everything?" + "which service was up when?".
 */
export interface PinReceiptRow {
  readonly cid: string;
  readonly agentId: string;
  readonly hash: `0x${string}`;
  readonly primaryService: string;
  readonly primaryPinId: string | null;
  readonly primaryOk: boolean;
  readonly primaryError: string | null;
  readonly fallbackService: string;
  readonly fallbackPinId: string | null;
  readonly fallbackOk: boolean;
  readonly fallbackError: string | null;
}

/**
 * DI'd repository — production wires drizzle; tests stub. Keeps
 * @concierge/attestation free of a hard @concierge/db dependency.
 */
export interface PinReceiptRepository {
  insert(row: PinReceiptRow): Promise<{ readonly id: string }>;
}

export interface RecordPinReceiptInputs {
  readonly agentId: string;
  readonly result: PinFeedbackResult;
}

/**
 * Persist a pin receipt for post-hoc audit. Failures from the repo are
 * surfaced as ConciergeError(RpcError) — losing a receipt row is NOT
 * silent (per CLAUDE.md no-silent-failures) but the CID is still valid
 * on-chain; ops can replay from the structured cause.
 */
export async function recordPinReceipt(
  inputs: RecordPinReceiptInputs,
  deps: { readonly repository: PinReceiptRepository },
): Promise<{ readonly id: string }> {
  const { result, agentId } = inputs;
  const row: PinReceiptRow = {
    cid: result.cid,
    agentId,
    hash: result.hash,
    primaryService: result.primary.service,
    primaryPinId: result.primary.pinId ?? null,
    primaryOk: result.primary.ok,
    primaryError: result.primary.error ?? null,
    fallbackService: result.fallback.service,
    fallbackPinId: result.fallback.pinId ?? null,
    fallbackOk: result.fallback.ok,
    fallbackError: result.fallback.error ?? null,
  };
  try {
    return await deps.repository.insert(row);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ConciergeError(
      'RpcError',
      `[@concierge/attestation] recordPinReceipt: insert failed (cid=${row.cid}, agentId=${row.agentId}): ${msg.slice(0, 512)}`,
      err instanceof Error ? err : undefined,
      { cid: row.cid, agentId: row.agentId, hash: row.hash },
    );
  }
}
