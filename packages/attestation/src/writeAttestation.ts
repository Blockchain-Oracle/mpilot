import { ConciergeError } from '@concierge/sdk';
import { computeFeedbackPair } from './hash.ts';
import { type PinFeedbackDeps, type PinFeedbackResult, pinFeedback } from './pin.ts';
import { type FeedbackEnvelope, parseFeedbackEnvelope, type SchemaId } from './schema.ts';

const DATAURI_PREFIX = 'ipfs://';

/**
 * Pre-computed dataHash + dataURI write to the ReputationRegistry. Matches
 * `giveFeedback(uint256 agentId, ... string feedbackURI, bytes32 feedbackHash)`
 * per research/concierge/03-providers/erc8004.md.
 *
 * **Open contradiction (flagged to human for story-83 resolution):** the
 * already-merged story-42 `attestAction` provider tool uses EIP-712 typed-
 * data hashing (`hashActionPayload`) for feedbackHash, NOT keccak256 of the
 * canonical content. Per CLAUDE.md non-negotiable, the research doc wins.
 * This interface is the spec-conforming shape; production wiring will need
 * either (a) a new lower-level adapter calling giveFeedback directly with
 * our keccak hash, or (b) amendment of story-42 to expose a raw-bytes32
 * variant. story-84 / a follow-up will wire one of these.
 */
export interface Erc8004AttestWriter {
  giveFeedback(args: {
    readonly agentId: bigint;
    readonly providerSchema: string;
    readonly dataHash: `0x${string}`;
    readonly dataURI: string;
    readonly signal: AbortSignal;
  }): Promise<{ readonly attestationUid: string; readonly txHash: `0x${string}` }>;
}

export interface WriteAttestationInputs {
  readonly agentId: string;
  readonly chainId: number;
  readonly providerSchema: SchemaId;
  readonly payload: unknown;
  /** Optional on-chain tx hash that this attestation is FEEDBACK ABOUT (executed tx). */
  readonly txHash?: `0x${string}`;
  readonly createdAt: string;
}

export interface WriteAttestationDeps {
  readonly pinDeps: PinFeedbackDeps;
  readonly writer: Erc8004AttestWriter;
  readonly logger?: {
    info(meta: Record<string, unknown>, msg: string): void;
    error(meta: Record<string, unknown>, msg: string): void;
  };
  readonly now?: () => Date;
  readonly signal?: AbortSignal;
}

export interface WriteAttestationResult {
  readonly attestationUid: string;
  readonly cid: string;
  readonly hash: `0x${string}`;
  readonly onChainTxHash: `0x${string}`;
  readonly dataURI: string;
  readonly pin: PinFeedbackResult;
}

/**
 * Compose the four primitives — envelope build, IPFS pin, content hash,
 * on-chain attest — into ONE function for story-67 record() to call.
 *
 * **Ordering contract (load-bearing):**
 *   1. Build + validate envelope (Zod throws → no IO)
 *   2. computeFeedbackPair: canonical bytes + hash in one pass
 *   3. pinFeedback: IPFS first so the dataURI resolves at on-chain mine time
 *   4. writer.giveFeedback: on-chain reference to the now-pinned CID
 *
 * **NO retries inside.** If any step fails, the typed error surfaces to the
 * caller (story-67 record phase) which decides whether to queue retry.
 *
 * **No pin rollback on on-chain failure** — orphan CIDs on Pinata are cheap
 * and harmless; the next attempt produces the SAME CID (content-addressed)
 * so re-pinning is idempotent.
 */
export async function writeAttestation(
  inputs: WriteAttestationInputs,
  deps: WriteAttestationDeps,
): Promise<WriteAttestationResult> {
  const started = (deps.now ?? (() => new Date()))();

  // Step 1: validate envelope at the boundary — Zod throws BEFORE any IO.
  const envelope: FeedbackEnvelope = {
    v: 1,
    schema: inputs.providerSchema,
    agentId: inputs.agentId,
    chainId: inputs.chainId,
    ...(inputs.txHash !== undefined ? { txHash: inputs.txHash } : {}),
    payload: inputs.payload,
    createdAt: inputs.createdAt,
  };
  parseFeedbackEnvelope(envelope);

  // Step 2: canonical bytes + hash, ONE pass (avoids double canonicalize).
  const { hash, canonical } = computeFeedbackPair(envelope);

  // Step 3: pin BEFORE on-chain tx. If pin fails (IPFSPinFailed) we throw
  // here — the on-chain reference would point to non-existent content
  // otherwise. The cidDivergence flag from story-81 round-1 surfaces in
  // the PinFeedbackResult for the caller's audit row.
  const pinDeps: PinFeedbackDeps =
    deps.signal !== undefined ? { ...deps.pinDeps, signal: deps.signal } : deps.pinDeps;
  const pin = await pinFeedback(envelope, pinDeps);
  const dataURI = `${DATAURI_PREFIX}${pin.cid}`;
  void canonical; // unused — kept in scope for future debugger inspection

  // Step 4: on-chain giveFeedback. Failure here does NOT rollback the pin —
  // the CID is permanent on IPFS regardless, and re-pinning is idempotent.
  let onChainResult: { readonly attestationUid: string; readonly txHash: `0x${string}` };
  try {
    onChainResult = await deps.writer.giveFeedback({
      agentId: BigInt(inputs.agentId),
      providerSchema: inputs.providerSchema,
      dataHash: hash,
      dataURI,
      signal: deps.signal ?? new AbortController().signal,
    });
  } catch (err) {
    // AttestationFailed: on-chain side failed; pin is still valid for retry.
    deps.logger?.error(
      { agentId: inputs.agentId, hash, cid: pin.cid, dataURI },
      'writeAttestation: on-chain giveFeedback failed (pin remains valid)',
    );
    if (err instanceof ConciergeError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new ConciergeError(
      'AttestationFailed',
      `[@concierge/attestation] writeAttestation: giveFeedback failed AFTER successful pin (cid=${pin.cid}): ${msg.slice(0, 512)}`,
      err instanceof Error ? err : undefined,
      { agentId: inputs.agentId, hash, cid: pin.cid, dataURI },
    );
  }

  const durationMs = (deps.now ?? (() => new Date()))().getTime() - started.getTime();
  deps.logger?.info(
    {
      attestationUid: onChainResult.attestationUid,
      cid: pin.cid,
      hash,
      onChainTxHash: onChainResult.txHash,
      durationMs,
      providerSchema: inputs.providerSchema,
      cidDivergence: pin.cidDivergence,
    },
    'writeAttestation: on-chain attestation written',
  );

  return {
    attestationUid: onChainResult.attestationUid,
    cid: pin.cid,
    hash,
    onChainTxHash: onChainResult.txHash,
    dataURI,
    pin,
  };
}
