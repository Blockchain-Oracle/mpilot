import { type AgentHistoryEntry, loadAgentHistory } from '@concierge-mantle/attestation';
import { type ConciergeTool, tool } from '@concierge-mantle/tools';
import type { CreateReadToolsDeps } from './factoryDeps.ts';
import { safeBigInt } from './safeBigInt.ts';
import {
  GetAgentStateInputSchema,
  type GetAgentStateOutput,
  GetAgentStateOutputSchema,
} from './schemas.ts';

const RECENT_LIMIT = 5;

/**
 * Public read: agent on-chain state.
 *
 * Returns the AgentNFT owner + recent attestation summary. Does NOT include
 * off-chain state (goal text, policy) — those gate to authenticated write
 * tools (story-132/134). This shape matches the public `/agent/:id` page.
 */
export function createGetAgentStateTool(deps: CreateReadToolsDeps): ConciergeTool {
  return tool({
    name: 'get_agent_state',
    description:
      'Read the public state of a Concierge agent by its ERC-8004 NFT id: owner address, attestation count, and the 5 most-recent attestations.',
    inputSchema: GetAgentStateInputSchema,
    outputSchema: GetAgentStateOutputSchema,
    invoke: async ({ agentId }): Promise<GetAgentStateOutput> => {
      const id = safeBigInt(agentId, 'agentId');
      const [owner, history] = await Promise.all([
        deps.identityRegistry.getOwner(id),
        loadAgentHistory(
          { agentId: id, limit: RECENT_LIMIT, offset: 0 },
          { readFeedback: deps.readFeedback, ipfs: deps.ipfs },
        ),
      ]);

      return {
        agentId,
        owner,
        attestationCount: history.totalCount,
        recentAttestations: history.entries.map(toEntry),
      };
    },
  }) as ConciergeTool;
}

/** Map the SDK's discriminated AgentHistoryEntry to the MCP output shape.
 *  Stringifies bigints — JSON Schema has no bigint, so the wire form is
 *  decimal-string. */
export function toEntry(e: AgentHistoryEntry) {
  // Defensive guards: the AgentHistoryEntry type guarantees these are
  // bigint at compile time, but an upstream partial-decode failure (malformed
  // event log, RPC anomaly) could land us with undefined at runtime. `?? 0n`
  // ensures we ship a valid wire string instead of crashing with
  // "Cannot read properties of undefined (reading 'toString')".
  const base = {
    feedbackHash: e.feedbackHash,
    feedbackURI: e.feedbackURI,
    feedbackIndex: (e.feedbackIndex ?? 0n).toString(),
    schema: e.schema,
    clientAddress: e.clientAddress,
    txHash: e.txHash,
    blockNumber: (e.blockNumber ?? 0n).toString(),
    revoked: e.revoked,
    status: e.status,
  } as const;
  return e.status === 'ok'
    ? { ...base, payload: e.payload }
    : { ...base, payloadError: e.payloadError };
}
