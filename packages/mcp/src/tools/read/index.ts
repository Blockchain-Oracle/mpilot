import type { ConciergeTool } from '@mpilot/tools';
import type { CreateReadToolsDeps } from './factoryDeps.ts';
import { createGetAgentStateTool } from './getAgentState.ts';
import { createGetAttestationTool } from './getAttestation.ts';
import { createGetReputationTool } from './getReputation.ts';

export type { CreateReadToolsDeps } from './factoryDeps.ts';
export type {
  GetAgentStateInput,
  GetAgentStateOutput,
  GetAttestationInput,
  GetAttestationOutput,
  GetReputationInput,
  GetReputationOutput,
} from './schemas.ts';

/**
 * Build the 3 read-only MCP tools wired against the caller's SDK deps.
 *
 * The tools are PUBLIC — no auth required by design (the data is on-chain
 * + IPFS; gating it is security theatre). Matches the public `/agent/:id`
 * page.
 *
 * Order is deterministic for snapshot tests + listTools determinism:
 * `get_agent_state`, `get_reputation`, `get_attestation`.
 */
export function createReadTools(deps: CreateReadToolsDeps): ReadonlyArray<ConciergeTool> {
  return [
    createGetAgentStateTool(deps),
    createGetReputationTool(deps),
    createGetAttestationTool(deps),
  ];
}
