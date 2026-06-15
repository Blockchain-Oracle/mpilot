/**
 * Single-scenario runner. Builds the action-provider registry, hands the
 * model a Vercel AI SDK tool set, and lets the planner pick + invoke the
 * right tool against the live network. The tool's `invoke` actually fires
 * the on-chain tx — same code path the agent runtime uses, just driven
 * directly instead of through the BullMQ + Redis + lock stack so we can
 * iterate fast.
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createErc8004Provider } from '@concierge-mantle/erc8004';
import { toVercelAITool } from '@concierge-mantle/vercel-ai';
import { generateText, stepCountIs } from 'ai';

const SYSTEM = `You are a DeFi action planner running on Mantle Sepolia (chainId 5003).
Given the user's goal, call EXACTLY ONE tool that achieves it.
Do not narrate. Do not explain. Pick the right tool with correct args and stop.

Available tools right now:
- erc8004_registerAgent — mint an ERC-8004 identity NFT for the connected wallet.
  Args: take no input fields — call with an empty object {}.
- erc8004_attestAction — write a feedback attestation referencing an existing agent.
  Args: agentId (bigint or decimal string), targetAgentId (the subject — defaults to the
  same agent if attesting yourself), action (one of "supply"|"borrow"|"swap"|"stake"),
  outcome (one of "success"|"failure"|"reverted"), valueUsd (optional number).`;

export async function runScenario({ goal, walletClient, publicClient, model: providedModel }) {
  const erc8004 = createErc8004Provider({
    walletClient,
    publicClient,
    chain: 'mantle-sepolia',
  });

  const tools = {
    erc8004_registerAgent: toVercelAITool(erc8004.actions.registerAgent),
    erc8004_attestAction: toVercelAITool(erc8004.actions.attestAction),
  };

  const model = providedModel;

  const result = await generateText({
    model,
    system: SYSTEM,
    prompt: `Goal: ${goal}`,
    tools,
    stopWhen: stepCountIs(3),
  });

  return {
    toolCalls: result.toolCalls,
    toolResults: result.toolResults,
    text: result.text,
    usage: result.usage,
    finishReason: result.finishReason,
  };
}
