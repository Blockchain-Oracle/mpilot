import { ConciergeError } from '@concierge/sdk';
import { computeFeedbackPair } from './hash.ts';
import { type PinFeedbackDeps, type PinFeedbackResult, pinFeedback } from './pin.ts';
import { isValidCid } from './pinService.ts';
import { type FeedbackEnvelope, parseFeedbackEnvelope, type SchemaId } from './schema.ts';

const DATAURI_PREFIX = 'ipfs://';
const UINT256_DECIMAL_RE = /^[0-9]+$/;
const DEFAULT_ATTEST_TIMEOUT_MS = 60_000;

function stripCtrl(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: CWE-117 mitigation
  return s.replace(/[\u0000-\u001f\u007f]/g, '?');
}

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
  /** Canonical JSON bytes — same string that was pinned to IPFS; the keccak preimage. */
  readonly canonical: string;
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
  const now = deps.now ?? (() => new Date());
  const started = now();

  // Round-1 CRITICAL fail-fast: agentId MUST be a uint256-shaped decimal
  // string. BigInt('agent-1') throws raw SyntaxError mid-pipeline — AFTER
  // a successful pin — which round-0 misclassified as AttestationFailed.
  // Surface as ConfigError BEFORE any IO.
  if (!UINT256_DECIMAL_RE.test(inputs.agentId)) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/attestation] writeAttestation: agentId must be a uint256 decimal string (got '${stripCtrl(inputs.agentId).slice(0, 64)}').`,
    );
  }

  // Step 1: validate envelope at the boundary. Wrap ZodError in
  // ConciergeError so the caller's record() phase can type-discriminate
  // (round-1 silent-failure #4: raw Zod escaped the public surface).
  const envelope: FeedbackEnvelope = {
    v: 1,
    schema: inputs.providerSchema,
    agentId: inputs.agentId,
    chainId: inputs.chainId,
    ...(inputs.txHash !== undefined ? { txHash: inputs.txHash } : {}),
    payload: inputs.payload,
    createdAt: inputs.createdAt,
  };
  try {
    parseFeedbackEnvelope(envelope);
  } catch (err) {
    // parseFeedbackEnvelope rethrows ZodError as plain Error with control
    // chars already stripped (story-80 round-2). Wrap any error here in
    // ConfigError so callers can type-discriminate on the public surface.
    if (err instanceof ConciergeError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/attestation] writeAttestation: envelope validation failed: ${stripCtrl(msg).slice(0, 2048)}`,
    );
  }

  // Step 2: canonical bytes + hash, ONE pass (avoids double canonicalize).
  const { hash, canonical } = computeFeedbackPair(envelope);

  // Step 3: pin BEFORE on-chain tx. If pin fails (IPFSPinFailed) we throw
  // here — the on-chain reference would point to non-existent content
  // otherwise.
  const signal = deps.signal ?? AbortSignal.timeout(DEFAULT_ATTEST_TIMEOUT_MS);
  const pinDeps: PinFeedbackDeps = { ...deps.pinDeps, signal };
  const pin = await pinFeedback(envelope, pinDeps);

  // Round-1 defense-in-depth (security CWE-20 info): assert the CID still
  // passes the validator BEFORE we string-concat into dataURI. If the
  // CIDv1 regex is ever loosened upstream, this catches the regression.
  if (!isValidCid(pin.cid)) {
    throw new ConciergeError(
      'InvariantViolation',
      `[@concierge/attestation] writeAttestation: pinService returned a CID that failed isValidCid post-pin: '${stripCtrl(pin.cid).slice(0, 128)}'.`,
    );
  }
  const dataURI = `${DATAURI_PREFIX}${pin.cid}`;

  // Step 4: on-chain giveFeedback. Failure here does NOT rollback the pin —
  // the CID is permanent on IPFS regardless, and re-pinning is idempotent.
  let onChainResult: { readonly attestationUid: string; readonly txHash: `0x${string}` };
  try {
    onChainResult = await deps.writer.giveFeedback({
      agentId: BigInt(inputs.agentId),
      providerSchema: inputs.providerSchema,
      dataHash: hash,
      dataURI,
      signal,
    });
  } catch (err) {
    // Round-1 fix: orphan-pin observability — surface the orphan CID in
    // the log so reconcile workers can match Pinata billing to on-chain
    // attestations.
    deps.logger?.error(
      {
        agentId: inputs.agentId,
        hash,
        orphanCid: pin.cid,
        dataURI,
        errName: err instanceof Error ? err.name : 'unknown',
        errMessage:
          err instanceof Error ? stripCtrl(err.message).slice(0, 512) : String(err).slice(0, 512),
      },
      'writeAttestation: on-chain giveFeedback failed (pin orphaned but content-addressed; safe to retry)',
    );
    if (err instanceof ConciergeError) throw err;
    const msg = err instanceof Error ? stripCtrl(err.message).slice(0, 512) : String(err);
    throw new ConciergeError(
      'AttestationFailed',
      `[@concierge/attestation] writeAttestation: giveFeedback failed AFTER successful pin (cid=${pin.cid}): ${msg}`,
      err instanceof Error ? err : undefined,
      { agentId: inputs.agentId, hash, cid: pin.cid, dataURI },
    );
  }

  const durationMs = now().getTime() - started.getTime();
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
    canonical,
    onChainTxHash: onChainResult.txHash,
    dataURI,
    pin,
  };
}
