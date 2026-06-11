import { ConciergeError } from '@concierge/sdk';
import { z } from 'zod';

export const LIFI_SENT_SCHEMA = 'concierge.lifi.bridge.sent.v1' as const;
export const LIFI_COMPLETED_SCHEMA = 'concierge.lifi.bridge.completed.v1' as const;

const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;
const NON_NEG_INT_STR = z.string().regex(/^\d+$/, 'must be a non-negative integer string');
const NON_ZERO_ADDR = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .refine((v) => v !== '0x0000000000000000000000000000000000000000');

// Immediately after source-chain tx submission
export const SentAttestationPayloadSchema = z.object({
  schema: z.literal(LIFI_SENT_SCHEMA),
  fromChain: z.number().int().positive(),
  toChain: z.number().int().positive(),
  sourceTxHash: z.string().regex(TX_HASH_REGEX),
  lifiOperationId: z.string().min(1),
  fromToken: NON_ZERO_ADDR,
  toToken: NON_ZERO_ADDR,
  amountIn: NON_NEG_INT_STR,
  expectedAmountOut: NON_NEG_INT_STR,
  expectedDuration: z.number().int().nonnegative(),
  ts: z.number().int().positive(),
});

// After destination-chain settlement confirmed via getStatus
export const CompletedAttestationPayloadSchema = z.object({
  schema: z.literal(LIFI_COMPLETED_SCHEMA),
  fromChain: z.number().int().positive(),
  toChain: z.number().int().positive(),
  sourceTxHash: z.string().regex(TX_HASH_REGEX),
  destinationTxHash: z.string().regex(TX_HASH_REGEX),
  lifiOperationId: z.string().min(1),
  bridgeUsed: z.string(),
  ts: z.number().int().positive(),
});

export type SentAttestationPayload = z.infer<typeof SentAttestationPayloadSchema>;
export type CompletedAttestationPayload = z.infer<typeof CompletedAttestationPayloadSchema>;

export function buildSentAttestation(raw: {
  fromChain: number;
  toChain: number;
  sourceTxHash: string;
  lifiOperationId: string;
  fromToken: string;
  toToken: string;
  amountIn: string;
  expectedAmountOut: string;
  expectedDuration: number;
}): SentAttestationPayload {
  try {
    return SentAttestationPayloadSchema.parse({
      ...raw,
      schema: LIFI_SENT_SCHEMA,
      ts: Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    throw new ConciergeError(
      'AttestationFailed',
      `[@concierge/lifi-bridge] buildSentAttestation: validation failed for tx ${raw.sourceTxHash}`,
      err instanceof Error ? err : undefined,
    );
  }
}

export function buildCompletedAttestation(raw: {
  fromChain: number;
  toChain: number;
  sourceTxHash: string;
  destinationTxHash: string;
  lifiOperationId: string;
  bridgeUsed: string;
}): CompletedAttestationPayload {
  try {
    return CompletedAttestationPayloadSchema.parse({
      ...raw,
      schema: LIFI_COMPLETED_SCHEMA,
      ts: Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    throw new ConciergeError(
      'AttestationFailed',
      `[@concierge/lifi-bridge] buildCompletedAttestation: validation failed for operation ${raw.lifiOperationId}`,
      err instanceof Error ? err : undefined,
    );
  }
}
