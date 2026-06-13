import { z } from 'zod';

const HASH_32 = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

/**
 * Attestation payload built by the originating provider. The runtime is
 * schema-agnostic — `providerSchema` + `payload` are passed verbatim to the
 * ERC-8004 client. Per-provider schemas (e.g. `concierge.aave.v3.borrow.v1`)
 * live in the provider package; record() trusts the result.
 */
export const attestationPayloadSchema = z.object({
  providerSchema: z.string().min(1).max(128),
  payload: z.unknown(),
});
export type AttestationPayload = z.infer<typeof attestationPayloadSchema>;

export const RECORD_OUTCOMES = ['attested', 'already_attested', 'retry_queued'] as const;
export type RecordOutcomeKind = (typeof RECORD_OUTCOMES)[number];

export const recordOutcomeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('attested'),
    executionId: z.string().min(1),
    attestationUid: HASH_32,
    attestationTxHash: HASH_32,
  }),
  z.object({
    kind: z.literal('already_attested'),
    executionId: z.string().min(1),
    attestationUid: HASH_32,
  }),
  z.object({
    kind: z.literal('retry_queued'),
    executionId: z.string().min(1),
    retryJobId: z.string().min(1),
  }),
]);
export type RecordOutcome = z.infer<typeof recordOutcomeSchema>;

/** Compile-time mirror so RECORD_OUTCOMES and RecordOutcome stay in lockstep. */
type _RecordKindMatch = RecordOutcome['kind'] extends RecordOutcomeKind
  ? RecordOutcomeKind extends RecordOutcome['kind']
    ? true
    : false
  : false;
const _recordKindCheck: _RecordKindMatch = true;
void _recordKindCheck;
