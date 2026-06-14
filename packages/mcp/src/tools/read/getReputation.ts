import { loadAgentHistory } from '@concierge-mantle/attestation';
import { type ConciergeTool, tool } from '@concierge-mantle/tools';
import type { CreateReadToolsDeps } from './factoryDeps.ts';
import { toEntry } from './getAgentState.ts';
import { safeBigInt } from './safeBigInt.ts';
import {
  GetReputationInputSchema,
  type GetReputationOutput,
  GetReputationOutputSchema,
} from './schemas.ts';

/**
 * Public read: paginated attestation history for an agent.
 *
 * Direct mapping to `loadAgentHistory`. The `limit` default is 50 — kept
 * generous so Claude users querying a long-lived agent can scroll without
 * round-tripping. Page-size hard cap is 200 (enforced by the Zod schema).
 */
export function createGetReputationTool(deps: CreateReadToolsDeps): ConciergeTool {
  return tool({
    name: 'get_reputation',
    title: 'Get agent reputation history',
    description:
      "Paginated read of an agent's ERC-8004 attestation history. Default page size 50, max 200. Returns each entry with the IPFS payload (or typed payloadError) attached.",
    inputSchema: GetReputationInputSchema,
    outputSchema: GetReputationOutputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    invoke: async ({ agentId, limit, offset }): Promise<GetReputationOutput> => {
      const result = await loadAgentHistory(
        { agentId: safeBigInt(agentId, 'agentId'), limit, offset },
        { readFeedback: deps.readFeedback, ipfs: deps.ipfs },
      );
      return {
        entries: result.entries.map(toEntry),
        totalCount: result.totalCount,
        limit: result.limit,
        offset: result.offset,
      };
    },
  }) as ConciergeTool;
}
