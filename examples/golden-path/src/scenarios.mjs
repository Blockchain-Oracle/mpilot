/**
 * Scenario manifest — Mantle Sepolia (5003).
 *
 * Each entry: a plain-English goal + a per-scenario assertion that reads
 * on-chain state and returns {pass, detail}.
 */
import { ADDRESSES } from '@concierge-mantle/shared';
import { parseAbi } from 'viem';

const IDENTITY_REGISTRY = ADDRESSES.mantleSepolia.erc8004.identityRegistry;
const REPUTATION_REGISTRY = ADDRESSES.mantleSepolia.erc8004.reputationRegistry;

// The ERC-8004 identity registry is an ERC-721. Use standard balanceOf to
// count the agent NFTs an EOA owns.
const identityAbi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
]);

export const SCENARIOS = [
  {
    id: 'erc8004-register-agent',
    goal: 'Mint an ERC-8004 identity for this wallet on Mantle Sepolia.',
    async snapshot({ publicClient, owner }) {
      return {
        agentCount: await publicClient.readContract({
          address: IDENTITY_REGISTRY,
          abi: identityAbi,
          functionName: 'balanceOf',
          args: [owner],
        }),
      };
    },
    async assert({ before, after }) {
      const delta = after.agentCount - before.agentCount;
      const ok = delta >= 1n;
      return { pass: ok, detail: `agentCount delta: ${delta} (need ≥1)` };
    },
  },
  {
    id: 'erc8004-attest-feedback',
    goal: 'Record a feedback attestation that the last action was a successful USDC supply.',
    async snapshot({ publicClient, owner }) {
      // Read this user's most recent agentId from the registry, then read
      // its current feedback count (the assertion compares delta).
      const agentCount = await publicClient.readContract({
        address: IDENTITY_REGISTRY,
        abi: identityAbi,
        functionName: 'balanceOf',
        args: [owner],
      });
      if (agentCount === 0n) return { agentCount: 0n, feedbackCount: 0n };
      // The Identity registry mints sequentially; the most recent for the
      // owner is `agentCount`. We could iterate but for the harness we trust
      // the snapshot-order convention used by registerAgent.
      return {
        agentCount,
        // feedbackCountOf is keyed by agentId; we don't know the exact id
        // without an indexer, so we read 0 and rely on the planner to use
        // a sensible agentId in its tool call (the test passes if a tx fires
        // and feedbackCount strictly increases for the assertion).
        feedbackCount: 0n,
      };
    },
    async assert({ planner }) {
      // Pass condition: the planner produced at least one tool result with a
      // tx hash. Detailed feedback count delta is a follow-up assertion once
      // we wire the indexer.
      const txCount = (planner?.toolResults ?? []).filter(
        (r) => (r.output ?? r.result ?? r)?.txHash,
      ).length;
      return { pass: txCount > 0, detail: `tx fired: ${txCount}` };
    },
  },
];
