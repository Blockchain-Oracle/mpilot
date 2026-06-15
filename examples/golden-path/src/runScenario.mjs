/**
 * Single-scenario runner. Builds the action-provider registry, hands the
 * model a Vercel AI SDK tool set, and lets the planner pick + invoke the
 * right tool against the live network. The tool's `invoke` actually fires
 * the on-chain tx — same code path the agent runtime uses, just driven
 * directly instead of through the BullMQ + Redis + lock stack so we can
 * iterate fast.
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAaveV3MantleProvider } from '@concierge-mantle/aave-v3-mantle';
import { createMantleDexProvider } from '@concierge-mantle/mantle-dex';
import { createMethStakingProvider } from '@concierge-mantle/meth-staking';
import { toVercelAITool } from '@concierge-mantle/vercel-ai';
import { generateText, stepCountIs } from 'ai';

const SYSTEM = `You are a DeFi action planner running on Mantle (chainId 5003 Sepolia).
You have one job: given the user's goal, call EXACTLY ONE tool that achieves it.
Do not narrate. Do not explain. Pick the right tool with correct args and stop.

Available providers: Aave V3 (supply/borrow/withdraw/setUserEMode), Mantle DEX (swap),
mETH staking (stake/unwrap). All token amounts are integers with the token's decimals
(USDC = 6 decimals; WMNT/WETH/mETH = 18 decimals).`;

export async function runScenario({ goal, walletClient, publicClient, chain, anthropicKey }) {
  // Build providers wired to live RPC + the harness EOA.
  const aave = createAaveV3MantleProvider({ walletClient, publicClient, chain });
  const dex = createMantleDexProvider({ walletClient, publicClient, chain });
  const meth = createMethStakingProvider({ walletClient, publicClient, chain });

  // Each provider exposes typed ConciergeTool actions. Flatten into a single
  // tool set the Vercel AI SDK can hand to the model.
  const tools = {
    aave_supply: toVercelAITool(aave.actions.supply),
    aave_borrow: toVercelAITool(aave.actions.borrow),
    aave_withdraw: toVercelAITool(aave.actions.withdraw),
    aave_setUserEMode: toVercelAITool(aave.actions.setUserEMode),
    dex_swap: toVercelAITool(dex.actions.swap),
    meth_stake: toVercelAITool(meth.actions.stake),
  };

  const model = createAnthropic({ apiKey: anthropicKey })('claude-sonnet-4-5');

  const result = await generateText({
    model,
    system: SYSTEM,
    prompt: `Goal: ${goal}`,
    tools,
    // Allow the model to chain a follow-up if a single call isn't enough
    // (e.g. supply + setUserEMode + borrow needs 2-3 steps).
    stopWhen: stepCountIs(5),
  });

  return {
    toolCalls: result.toolCalls,
    toolResults: result.toolResults,
    text: result.text,
    usage: result.usage,
    finishReason: result.finishReason,
  };
}
