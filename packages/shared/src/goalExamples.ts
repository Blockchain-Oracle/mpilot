/**
 * Curated goal examples for the onboarding wizard, the dashboard's edit-goal
 * page, the docs site, and the skill — one source of truth so all surfaces
 * show the same suggestion set.
 *
 * Each example targets a distinct persona; together they cover the action
 * surface (Aave supply/borrow, DEX swap, Ethena stake, Ondo mint, mETH stake,
 * Li.Fi bridge) and the two policy modes (manual approval vs autopilot).
 */
export const GOAL_EXAMPLES = [
  'Earn the best stablecoin yield on Mantle without breaking 70% Aave LTV.',
  'Park $5k in sUSDe and rebalance into Ondo USDY if Ethena APR drops below 8%.',
  'Stake idle MNT into mETH automatically and unstake if peg deviation > 50 bps.',
  'Keep a $2k weekly autopay budget for rent — swap MNT → USDC on Merchant Moe when prices look good.',
  'Maximum safety: no borrows, no leverage, USDC supply only on Aave, daily attestation.',
  'Bridge USDC from Arbitrum, deploy into the best Mantle yield, and notify me before any tx > $500.',
] as const;

export type GoalChipType = 'percentage' | 'currency' | 'duration' | 'enum' | 'text';

/**
 * A typed parameter extracted from a goal. The UI renders the right input
 * shape per `type` (number+% suffix, $-prefixed currency, duration picker,
 * enum dropdown, plain text). The agent's planner consumes the same chips so
 * the user can override constraints without rewriting the goal.
 */
export interface GoalChip {
  /** Stable key, e.g. `"max_ltv"`, `"budget_usd"`, `"min_apr"`, `"cadence"`. */
  readonly key: string;
  /** Human-readable value, e.g. `"70%"`, `"$5000"`, `"weekly"`. */
  readonly value: string;
  readonly type: GoalChipType;
}
