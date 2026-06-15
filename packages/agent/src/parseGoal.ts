import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { GoalChip, GoalChipType } from '@concierge-mantle/shared';
import { generateObject } from 'ai';
import { z } from 'zod';

const goalChipSchema = z.object({
  key: z.string().min(1).max(48),
  value: z.string().min(1).max(96),
  type: z.enum(['percentage', 'currency', 'duration', 'enum', 'text']),
}) satisfies z.ZodType<GoalChip>;

const responseSchema = z.object({
  chips: z.array(goalChipSchema).max(12),
});

/**
 * Extract typed parameter chips from a plain-English goal.
 *
 * Run by the onboarding wizard (`StepGoal`) and the dashboard's edit-goal page.
 * The same chips feed the planner's constraint set so the user can tweak a
 * single parameter (max LTV, weekly budget, min APR) without rewriting prose.
 *
 * Models receive an explicit instruction NOT to invent constraints — only
 * extract ones the user wrote. The `examples` parameter (optional) seeds the
 * model with a few "goal → chips" pairs for stability across providers.
 */
export async function parseGoal({
  text,
  model,
  examples,
  abortSignal,
}: {
  readonly text: string;
  readonly model: LanguageModelV2;
  readonly examples?: ReadonlyArray<{ goal: string; chips: ReadonlyArray<GoalChip> }>;
  readonly abortSignal?: AbortSignal;
}): Promise<ReadonlyArray<GoalChip>> {
  const trimmed = text.trim();
  if (trimmed.length === 0) return [];

  const shotsBlock = examples?.length
    ? `\nExamples:\n${examples
        .map((ex, i) => `${i + 1}. Goal: ${ex.goal}\n   Chips: ${JSON.stringify(ex.chips)}`)
        .join('\n')}\n`
    : '';

  const result = await generateObject({
    model,
    schema: responseSchema,
    // `exactOptionalPropertyTypes` rejects `abortSignal: undefined`; only spread
    // the property when the caller actually provided one.
    ...(abortSignal ? { abortSignal } : {}),
    system:
      'Extract typed parameter chips the user explicitly stated in their DeFi goal. ' +
      'NEVER invent constraints. If the user did not state a percentage, currency cap, ' +
      'duration, enum choice, or text constraint, do NOT add one. Keys are snake_case ' +
      '(max_ltv, budget_usd, min_apr, cadence, asset). Values are human-readable ' +
      'verbatim from the goal where possible (e.g. "70%", "$5000", "weekly").',
    prompt: `Goal: ${trimmed}${shotsBlock}`,
  });

  return result.object.chips as ReadonlyArray<GoalChip>;
}

/**
 * Best-effort regex pre-extractor for the common cases (percentage + currency).
 * Useful for instant-feedback chip suggestions while the LLM call is in flight,
 * and as a fallback if `parseGoal` rejects.
 */
export function quickChips(text: string): GoalChip[] {
  const chips: GoalChip[] = [];
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct?.[1]) chips.push({ key: 'max_ltv', value: `${pct[1]}%`, type: 'percentage' });
  const usd = text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:k|m)?/i);
  if (usd?.[1]) chips.push({ key: 'budget_usd', value: `$${usd[1]}`, type: 'currency' });
  const cadence = text.match(/\b(daily|weekly|monthly|hourly)\b/i);
  if (cadence?.[1]) chips.push({ key: 'cadence', value: cadence[1].toLowerCase(), type: 'enum' });
  return chips;
}

export type { GoalChip, GoalChipType };
