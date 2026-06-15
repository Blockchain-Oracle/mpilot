/**
 * Chat API — streams the mPilot agent over the Vercel AI SDK UI-message
 * protocol. Wires the framework-agnostic `createChatHandler` (from @mpilot/agent)
 * with the full namespaced tool set from `assembleProviders` in PROPOSE mode:
 * read tools (balances, quotes) run server-side; write tools return unsigned tx
 * previews the browser signs via the user's Privy wallet. NO server custody.
 */
import { createChatHandler } from '@mpilot/agent';
import { assembleProviders } from '@mpilot/runtime';
import { defaultModel } from '@mpilot/sdk';
import { verifyPrivyAuth } from '../../_lib/privyServer';

// Privy server SDK + viem need the Node runtime (not Edge).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHAIN =
  process.env.NEXT_PUBLIC_MPILOT_CHAIN === 'mantle-mainnet' ? 'mantle-mainnet' : 'mantle-sepolia';
const CHAIN_ID = CHAIN === 'mantle-mainnet' ? 5000 : 5003;

const PROVIDER_LABELS = [
  'Wallet (balances, transfers, approvals, wrap/unwrap)',
  'Mantle DEX (best-route quotes)',
  'Aave V3',
  'Ethena sUSDe',
  'Ondo USDY',
  'mETH staking',
  'Li.Fi bridge',
  'ERC-8004 identity + reputation',
];

const handler = createChatHandler({
  model: defaultModel(),
  agent: { chainId: CHAIN_ID },
  providerToolFactories: assembleProviders({ mode: 'propose', chain: CHAIN }),
  getSystemPromptContext: async () => ({
    agentId: 'mpilot-chat',
    goal:
      'Interactive session: help the connected user read balances and prepare DeFi actions on Mantle. ' +
      'Always propose transactions for the user to sign in their own wallet — never assume custody.',
    availableProviders: PROVIDER_LABELS,
    network: CHAIN,
  }),
  authGate: { auth: 'verify', verify: async (req) => (await verifyPrivyAuth(req)).ok },
});

export const POST = handler;
