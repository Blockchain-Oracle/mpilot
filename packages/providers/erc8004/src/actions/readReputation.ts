import { ConciergeError } from '@mpilot/sdk';
import { reputationRegistryAbi } from '@mpilot/shared/abi';
import { tool } from '@mpilot/tools';
import { z } from 'zod';
import type { ActionContext } from '../_context.ts';

export const ReadReputationInput = z.object({
  // Decimal string of uint256 — JSON Schema has no bigint type. Internal
  // callers `BigInt(agentId)` at the EVM boundary.
  agentId: z.string().regex(/^\d+$/).describe('Agent NFT token id (decimal string of uint256)'),
});

export const LatestAttestationSchema = z.object({
  schema: z.string().describe('Provider schema used for the most recent attestation (tag2)'),
  feedbackIndex: z
    .string()
    .regex(/^\d+$/)
    .describe('Feedback index in the ReputationRegistry (decimal string of uint256)'),
  value: z
    .string()
    .regex(/^-?\d+$/)
    .describe('Feedback value (signed int128 as decimal string; negative allowed)'),
});

export const ReadReputationOutput = z.object({
  totalAttestations: z
    .number()
    .int()
    .nonnegative()
    .describe('Count of non-revoked feedback entries across all clients'),
  latestAttestation: LatestAttestationSchema.nullable().describe(
    'Most recent non-revoked attestation, or null if none exist',
  ),
  schemaCounts: z
    .record(z.string(), z.number().int().positive())
    .describe('Counts per schema name (tag2), revoked entries excluded'),
});

type FeedbackArrays = {
  feedbackIndexes: readonly bigint[];
  values: readonly bigint[];
  tag2s: readonly string[];
  revokedStatuses: readonly boolean[];
};

type FeedbackSummary = {
  schemaCounts: Record<string, number>;
  latestAttestation: z.infer<typeof LatestAttestationSchema> | null;
  totalAttestations: number;
};

async function fetchFeedbackArrays(
  ctx: ActionContext,
  agentId: bigint,
  clients: readonly `0x${string}`[],
): Promise<FeedbackArrays> {
  // readAllFeedback returns: (clients[], feedbackIndexes[], values[], valueDecimals[], tag1s[], tag2s[], revokedStatuses[])
  const feedback = await (async () => {
    try {
      return await ctx.publicClient.readContract({
        address: ctx.reputationRegistry,
        abi: reputationRegistryAbi,
        functionName: 'readAllFeedback',
        args: [agentId, clients, '', '', false],
      });
    } catch (err) {
      throw new ConciergeError(
        'RpcError',
        `[@mpilot/erc8004] readReputation: readAllFeedback failed for agent ${agentId}`,
        err,
      );
    }
  })();

  const feedbackIndexes = feedback[1];
  const values = feedback[2];
  const tag2s = feedback[5];
  const revokedStatuses = feedback[6];

  // Length guard before the empty-check: catches malformed tuples where one array is
  // non-empty but others are not (would silently collapse to "no feedback" without this).
  if (
    values.length !== feedbackIndexes.length ||
    tag2s.length !== feedbackIndexes.length ||
    revokedStatuses.length !== feedbackIndexes.length
  ) {
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/erc8004] readReputation: readAllFeedback returned inconsistent array lengths for agent ${agentId}`,
    );
  }

  return { feedbackIndexes, values, tag2s, revokedStatuses };
}

function summarizeFeedback(arrays: FeedbackArrays): FeedbackSummary {
  const { feedbackIndexes, values, tag2s, revokedStatuses } = arrays;
  const schemaCounts: Record<string, number> = {};
  let latestAttestation: z.infer<typeof LatestAttestationSchema> | null = null;
  for (let i = 0; i < feedbackIndexes.length; i++) {
    if (revokedStatuses[i] ?? false) continue;
    const feedbackIndex = feedbackIndexes[i];
    const value = values[i];
    const schema = tag2s[i];
    if (feedbackIndex === undefined || value === undefined || schema === undefined) {
      throw new ConciergeError(
        'RpcError',
        `[@mpilot/erc8004] readReputation: malformed readAllFeedback response at index ${i}`,
      );
    }
    schemaCounts[schema] = (schemaCounts[schema] ?? 0) + 1;
    // feedbackIndex is monotonically assigned per agent — highest = most recent.
    // Schema exposes decimal-string for JSON Schema compatibility; do the
    // ordering comparison against the bigint form so we don't lexicographically
    // compare "10" < "9".
    if (latestAttestation === null || feedbackIndex > BigInt(latestAttestation.feedbackIndex)) {
      latestAttestation = {
        schema,
        feedbackIndex: feedbackIndex.toString(),
        value: value.toString(),
      };
    }
  }
  const totalAttestations = Object.values(schemaCounts).reduce((sum, n) => sum + n, 0);
  return { schemaCounts, latestAttestation, totalAttestations };
}

const EMPTY_RESULT = Object.freeze({
  totalAttestations: 0,
  latestAttestation: null,
  schemaCounts: Object.freeze({}) as Record<string, number>,
});

export async function executeReadReputation(
  ctx: ActionContext,
  input: z.infer<typeof ReadReputationInput>,
): Promise<z.infer<typeof ReadReputationOutput>> {
  // input.agentId is a decimal string per the schema. The contract takes uint256.
  const agentIdBig = BigInt(input.agentId);
  const clients = await (async () => {
    try {
      return await ctx.publicClient.readContract({
        address: ctx.reputationRegistry,
        abi: reputationRegistryAbi,
        functionName: 'getClients',
        args: [agentIdBig],
      });
    } catch (err) {
      throw new ConciergeError(
        'RpcError',
        `[@mpilot/erc8004] readReputation: getClients failed for agent ${input.agentId}`,
        err,
      );
    }
  })();

  if (clients.length === 0) return EMPTY_RESULT;

  const arrays = await fetchFeedbackArrays(ctx, agentIdBig, clients);
  if (arrays.feedbackIndexes.length === 0) return EMPTY_RESULT;

  const { schemaCounts, latestAttestation, totalAttestations } = summarizeFeedback(arrays);
  return { totalAttestations, latestAttestation, schemaCounts };
}

export function createReadReputationTool(ctx: ActionContext) {
  return tool({
    name: 'readReputation',
    description:
      'Reads all reputation feedback for an agent from the ERC-8004 ReputationRegistry. ' +
      'Returns total attestation count, most recent attestation details, and per-schema counts.',
    inputSchema: ReadReputationInput,
    outputSchema: ReadReputationOutput,
    supportsNetwork: () => true,
    invoke: (input) => executeReadReputation(ctx, input),
  });
}
