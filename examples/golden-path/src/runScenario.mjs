/**
 * Single-scenario runner. Builds the action-provider registry, hands the model
 * a Vercel AI SDK tool set, lets the planner pick + invoke the right tool.
 * The tool's `invoke` actually fires the on-chain tx.
 */
import { createAaveV3MantleProvider } from '@concierge-mantle/aave-v3-mantle';
import { createErc8004Provider } from '@concierge-mantle/erc8004';
import { createMantleDexProvider } from '@concierge-mantle/mantle-dex';
import { toVercelAITool } from '@concierge-mantle/vercel-ai';
import { generateText, stepCountIs } from 'ai';

const SYSTEM = `You are a Mantle Sepolia (chainId 5003) action planner.
Pick the right tool that fulfills the goal and call it with correct args. Do not narrate.

Available tools cover:
- ERC-8004 identity (registerAgent / attestAction)
- Aave V3 (supply / borrow / repay / withdraw / setUserEMode)
- Mantle DEX (swap / quote)

Amounts are passed as DECIMAL STRINGS of base units (e.g. "10000000" for 10 USDC at 6 decimals,
"1000000000000000000" for 1 WMNT at 18 decimals). Addresses are 0x… hex. If the goal mentions
multiple actions in sequence, chain the calls.`;

export async function runScenario({ goal, walletClient, publicClient, model: providedModel }) {
  const erc8004 = createErc8004Provider({
    walletClient,
    publicClient,
    chain: 'mantle-sepolia',
  });
  const aave = createAaveV3MantleProvider({ walletClient, publicClient, chain: 'mantle-sepolia' });
  const dex = createMantleDexProvider({ walletClient, publicClient, chain: 'mantle-sepolia' });

  const tools = {
    erc8004_registerAgent: toVercelAITool(erc8004.actions.registerAgent),
    erc8004_attestAction: toVercelAITool(erc8004.actions.attestAction),
    aave_supply: toVercelAITool(aave.actions.supply),
    aave_borrow: toVercelAITool(aave.actions.borrow),
    aave_withdraw: toVercelAITool(aave.actions.withdraw),
    aave_repay: toVercelAITool(aave.actions.repay),
    aave_setUserEMode: toVercelAITool(aave.actions.setUserEMode),
    dex_swap: toVercelAITool(dex.actions.swap),
    dex_quote: toVercelAITool(dex.actions.quote),
  };

  const result = await generateText({
    model: providedModel,
    system: SYSTEM,
    prompt: `Goal: ${goal}`,
    tools,
    stopWhen: stepCountIs(6),
  });

  // `result.toolCalls`/`toolResults` only carry the FINAL step. Reasoning
  // models (gpt-5) append a text summary step, which empties those — even when
  // a tool fired on-chain in an earlier step. Aggregate across every step so a
  // multi-step plan (register → attest) is attributed correctly.
  const steps = result.steps ?? [];
  const allToolCalls = steps.flatMap((s) => s.toolCalls ?? []);
  const allToolResults = steps.flatMap((s) => s.toolResults ?? []);

  return {
    toolCalls: allToolCalls.length > 0 ? allToolCalls : (result.toolCalls ?? []),
    toolResults: allToolResults.length > 0 ? allToolResults : (result.toolResults ?? []),
    text: result.text,
    usage: result.usage,
    finishReason: result.finishReason,
  };
}
