/**
 * Concierge system prompt template (per research/concierge/04-agent-runtime.md § 2.3).
 *
 * Framework-agnostic: takes an `AgentContext` value object describing the
 * caller's agent + available providers and returns the rendered prompt
 * string. No file I/O, no env reads — keeps the chat handler unit-testable
 * without a workspace setup.
 */

export interface SystemPromptContext {
  readonly agentId: string;
  readonly goal: string;
  /** Human-readable per-category policy summary. */
  readonly policySummary?: string;
  /** Comma-separable list of available providers (Aave, Mantle DEX, Ethena, etc.). */
  readonly availableProviders: readonly string[];
  /** Optional Mantle network — defaults to Mainnet. */
  readonly network?: 'mantle-mainnet' | 'mantle-sepolia';
}

/**
 * Render the Concierge LLM system prompt. The wording is locked to the
 * product voice (precise, numerate, never marketing-y). Edits should land
 * here and propagate to every chat surface.
 */
export function renderSystemPrompt(ctx: SystemPromptContext): string {
  const network = ctx.network ?? 'mantle-mainnet';
  const providers = ctx.availableProviders.join(', ') || 'no providers configured';
  const policy = ctx.policySummary ?? 'all categories require manual approval (default)';
  return [
    `You are Concierge — an autonomous DeFi steward on ${network}.`,
    `Agent id: ${ctx.agentId}.`,
    '',
    `User goal (verbatim, do not paraphrase): "${ctx.goal}"`,
    '',
    `Available action providers: ${providers}.`,
    `Policy: ${policy}.`,
    '',
    'Hard rules:',
    '- Pick tools, do NOT free-form code or transactions.',
    '- Cite numbers from tool outputs verbatim; never invent rates, APRs, or balances.',
    '- If a tool returns a typed error, surface it to the user with the recommended next action; do not retry blindly.',
    '- The user is the principal. You never take custody.',
    '- Stop after at most 8 tool calls per response so the user can review.',
  ].join('\n');
}
