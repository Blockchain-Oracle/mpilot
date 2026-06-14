import { z } from 'zod';

/** Validates an Ethereum / Mantle 20-byte address. */
const Address = z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'must be a 0x-prefixed 40-hex address');

/** Validates a 32-byte hash (tx hash / feedback hash / payload commitment). */
const Hash32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'must be a 0x-prefixed 64-hex hash');

/**
 * Decimal-string bigint at the wire boundary. MCP serializes inputSchema +
 * outputSchema to JSON Schema; bigint has no JSON Schema representation,
 * so all 256-bit values cross the wire as decimal strings. Tools parse to
 * bigint internally and stringify on the way out.
 *
 * Length cap: 78 chars = uint256 max (2^256 ≈ 1.16 * 10^77). Prevents
 * pathological inputs from reaching BigInt() and minimizes regex backtracking.
 */
const BigIntString = z
  .string()
  .min(1)
  .max(78)
  .regex(/^\d+$/, 'must be a non-negative decimal integer string ≤ 78 chars (uint256 max)');

/** Agent NFT identifier (ERC-8004 IdentityRegistry token id). */
export const AgentIdSchema = BigIntString.describe(
  'Agent NFT token id from ERC-8004 IdentityRegistry, as decimal string',
);

/**
 * Per-entry shared fields. NOT exported on its own — re-used by the two
 * arms of the discriminated AttestationEntrySchema below.
 */
const AttestationEntryBase = z.object({
  feedbackHash: Hash32.describe('Payload commitment on-chain'),
  feedbackURI: z.string().describe('Off-chain pointer, typically ipfs://<cid>'),
  feedbackIndex: BigIntString.describe(
    'Per-agent index in ReputationRegistry (decimal string — wire-safe bigint)',
  ),
  schema: z.string().describe('Provider schema tag (e.g. concierge.aave.v3.supply.v1)'),
  clientAddress: Address.describe('Address that submitted the feedback'),
  txHash: Hash32.describe('Transaction hash'),
  blockNumber: BigIntString.describe('Block number of NewFeedback event (decimal string)'),
  revoked: z.boolean().describe('Whether this feedback has been revoked'),
});

/**
 * Discriminated union: `status: 'ok'` arm guarantees `payload`,
 * `status: 'error'` arm guarantees `payloadError`. Removes the illegal-state
 * `{status: 'ok', payloadError: '...'}` shape the previous optional-fields
 * version permitted. TS narrows automatically on switch.
 */
export const AttestationEntrySchema = z.discriminatedUnion('status', [
  AttestationEntryBase.extend({
    status: z.literal('ok'),
    payload: z.unknown().describe('Decoded FeedbackEnvelope (parsed from IPFS)'),
  }),
  AttestationEntryBase.extend({
    status: z.literal('error'),
    payloadError: z.string().describe('Typed PayloadError tag (NOT_FOUND / DECODE_FAIL / ...)'),
  }),
]);

export const GetAgentStateInputSchema = z
  .object({
    agentId: AgentIdSchema,
  })
  .strict();

export const GetAgentStateOutputSchema = z.object({
  agentId: BigIntString.describe('Agent NFT token id, echo of input'),
  owner: Address.describe('EOA / smart account that owns the agent NFT'),
  attestationCount: z.number().int().nonnegative().describe('Total attestations on-chain'),
  recentAttestations: z
    .array(AttestationEntrySchema)
    .describe('Last 5 attestations, most-recent first'),
});

export const GetReputationInputSchema = z
  .object({
    agentId: AgentIdSchema,
    limit: z.number().int().min(1).max(200).default(50).describe('Page size, max 200'),
    offset: z.number().int().nonnegative().default(0).describe('Page offset'),
  })
  .strict();

export const GetReputationOutputSchema = z.object({
  entries: z.array(AttestationEntrySchema),
  totalCount: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(200),
  offset: z.number().int().nonnegative(),
});

export const GetAttestationInputSchema = z
  .object({
    agentId: AgentIdSchema.describe(
      'Required for lookup — ERC-8004 has no by-UID index; we scan the agent feedback list and filter by feedbackHash.',
    ),
    feedbackHash: Hash32.describe(
      'The on-chain commitment (a.k.a. "uid") that identifies the attestation',
    ),
  })
  .strict();

export const GetAttestationOutputSchema = z.object({
  entry: AttestationEntrySchema,
});

export type GetAgentStateInput = z.infer<typeof GetAgentStateInputSchema>;
export type GetAgentStateOutput = z.infer<typeof GetAgentStateOutputSchema>;
export type GetReputationInput = z.infer<typeof GetReputationInputSchema>;
export type GetReputationOutput = z.infer<typeof GetReputationOutputSchema>;
export type GetAttestationInput = z.infer<typeof GetAttestationInputSchema>;
export type GetAttestationOutput = z.infer<typeof GetAttestationOutputSchema>;
