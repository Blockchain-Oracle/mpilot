/**
 * Live goal parser. Extracts up to ~6 typed chips from the user's free-text
 * goal. Port of the designer's `parseGoal()` in onboarding2.jsx with explicit
 * TypeScript types + named-capture regexes.
 *
 * Returns chips in the order parsed (caller renders them as a flex list).
 */

export interface GoalChip {
  readonly key: string;
  readonly value: string;
}

const RE_LTV_A = /(\d{1,3})\s*%\s*(?:aave\s*)?ltv/i;
const RE_LTV_B = /ltv\s*(?:under|below|<|of)?\s*(\d{1,3})\s*%/i;
const RE_LIQUID =
  /(?:keep|hold|reserve|leave)?\s*\$?\s*(\d[\d,]*)\s*(?:usdc)?\s*(?:liquid|reserve|kept liquid|always liquid)/i;
const RE_HF = /(?:health factor|hf)\s*(?:above|over|>|of)?\s*([\d.]+)/i;
const RE_AUTOPAY_A = /(\d+)\s*usdc\s*\/?\s*day/i;
const RE_AUTOPAY_B = /autopay\s*(\d+)/i;
const RE_MAXYIELD = /max(?:imi[sz]e)?\b/i;
const RE_YIELD = /yield/i;
const RE_PRESERVE = /depeg|preserve|protect|safe|treasury/i;
const RE_GROW = /grow|reward/i;
const RE_STABLE = /stablecoin|usdc|usdt/i;
const RE_ETH = /meth|staking|eth/i;
const RE_RWA = /rwa|usdy|ondo|treasur/i;

export function parseGoal(text: string): readonly GoalChip[] {
  const t = text ?? '';
  const chips: GoalChip[] = [];
  let m: RegExpMatchArray | null = null;

  m = t.match(RE_LTV_A) ?? t.match(RE_LTV_B);
  if (m?.[1] !== undefined) chips.push({ key: 'Max Aave LTV', value: `${m[1]}%` });

  m = t.match(RE_LIQUID);
  if (m?.[1] !== undefined) chips.push({ key: 'Keep liquid', value: `$${m[1]}` });

  m = t.match(RE_HF);
  if (m?.[1] !== undefined) chips.push({ key: 'Min health factor', value: m[1] });

  m = t.match(RE_AUTOPAY_A) ?? t.match(RE_AUTOPAY_B);
  if (m?.[1] !== undefined) chips.push({ key: 'Autopay', value: `${m[1]} USDC/day` });

  if (RE_MAXYIELD.test(t) && RE_YIELD.test(t)) {
    chips.push({ key: 'Objective', value: 'Max yield' });
  } else if (RE_PRESERVE.test(t)) {
    chips.push({ key: 'Objective', value: 'Capital preservation' });
  } else if (RE_GROW.test(t)) {
    chips.push({ key: 'Objective', value: 'Grow rewards' });
  }

  if (RE_STABLE.test(t)) {
    chips.push({ key: 'Focus', value: 'Stablecoins' });
  } else if (RE_ETH.test(t)) {
    chips.push({ key: 'Focus', value: 'ETH staking' });
  } else if (RE_RWA.test(t)) {
    chips.push({ key: 'Focus', value: 'RWA yield' });
  }

  return chips;
}

export const GOAL_EXAMPLES: readonly string[] = [
  'Max stablecoin yield, never breach 70% Aave LTV, keep $200 USDC liquid',
  'Grow mETH staking rewards, keep health factor above 2.0',
  'Depeg-resistant treasury: rotate into the safest RWA yield, $500 always liquid',
  'Autopay 5 USDC/day from idle yield, keep $100 liquid',
];
