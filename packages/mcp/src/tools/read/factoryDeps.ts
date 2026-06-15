import type { LoadAgentHistoryDeps } from '@mpilot/attestation';

/**
 * Deps the read-tool factory needs. Kept narrow — the factory injects ONLY
 * the SDK surfaces required by getAgentState / getReputation / getAttestation,
 * not the whole ConciergeAgent. Lets the stdio bin + Worker host wire
 * different runtime shapes (production vs in-memory test) without touching
 * the tool logic.
 */
export interface CreateReadToolsDeps {
  /** Reads the agent's owner from ERC-8004 IdentityRegistry. */
  readonly identityRegistry: {
    readonly getOwner: (agentId: bigint) => Promise<string>;
  };
  /** Reads on-chain feedback (typically from `@mpilot/erc8004`). */
  readonly readFeedback: LoadAgentHistoryDeps['readFeedback'];
  /** IPFS gateway for fetching envelope payloads. */
  readonly ipfs: LoadAgentHistoryDeps['ipfs'];
}
