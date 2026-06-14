import { loadAgentHistory } from '@concierge-mantle/attestation';
import { ConciergeError } from '@concierge-mantle/sdk';
import { type ConciergeTool, tool } from '@concierge-mantle/tools';
import type { CreateReadToolsDeps } from './factoryDeps.ts';
import { toEntry } from './getAgentState.ts';
import { safeBigInt } from './safeBigInt.ts';
import {
  GetAttestationInputSchema,
  type GetAttestationOutput,
  GetAttestationOutputSchema,
} from './schemas.ts';

// Enough to cover any single agent in the foreseeable future; ERC-8004 doesn't
// support by-uid lookup, so we paginate. If an agent ever crosses this, the
// caller paginates via get_reputation and filters client-side.
const SCAN_LIMIT = 200;

/**
 * Public read: a single attestation, identified by its on-chain feedbackHash.
 *
 * ERC-8004 ReputationRegistry has no by-UID lookup, so we scan the agent's
 * feedback list and filter by hash. Returns a typed `ConciergeError` when
 * the hash isn't found; the MCP server's tool envelope forwards it as
 * `isError: true`, matching the BDD "typed error, not 500".
 *
 * Per PR #143 silent-failure review: distinguishes two miss cases via the
 * error message so the caller can tell "the hash doesn't exist" apart from
 * "the hash MAY exist past the scan window — paginate via get_reputation":
 * - `totalCount <= SCAN_LIMIT` and no match → hash genuinely absent
 * - `totalCount >  SCAN_LIMIT` and no match → scan-window exceeded
 */
export function createGetAttestationTool(deps: CreateReadToolsDeps): ConciergeTool {
  return tool({
    name: 'get_attestation',
    description:
      "Read a single attestation by its on-chain feedbackHash. Requires agentId because ERC-8004 doesn't index by hash. Returns a distinct error when the agent has more than 200 attestations and the scan window is exceeded (paginate via get_reputation instead).",
    inputSchema: GetAttestationInputSchema,
    outputSchema: GetAttestationOutputSchema,
    invoke: async ({ agentId, feedbackHash }): Promise<GetAttestationOutput> => {
      const result = await loadAgentHistory(
        { agentId: safeBigInt(agentId, 'agentId'), limit: SCAN_LIMIT, offset: 0 },
        { readFeedback: deps.readFeedback, ipfs: deps.ipfs },
      );
      const match = result.entries.find((e) => e.feedbackHash === feedbackHash);
      if (!match) {
        const scanExceeded = result.totalCount > SCAN_LIMIT;
        const reason = scanExceeded
          ? `scan-window exceeded — agent has ${String(result.totalCount)} attestations (> ${String(SCAN_LIMIT)} scan limit); fall back to get_reputation pagination`
          : `not found within ${String(result.totalCount)}-entry attestation list`;
        throw new ConciergeError(
          'AttestationFailed',
          `[@concierge-mantle/mcp] get_attestation: feedbackHash ${feedbackHash} ${reason} for agent ${agentId}`,
        );
      }
      return { entry: toEntry(match) };
    },
  }) as ConciergeTool;
}
