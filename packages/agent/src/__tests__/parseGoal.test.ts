import { describe, expect, it } from 'vitest';
import { quickChips } from '../parseGoal.ts';

describe('quickChips', () => {
  it('extracts a percentage as max_ltv when ltv keyword is nearby', () => {
    expect(quickChips('keep LTV under 70%')).toEqual([
      { key: 'max_ltv', value: '70%', type: 'percentage' },
    ]);
  });
  it('labels a generic percentage when no ltv context', () => {
    expect(quickChips('target 8% APR')).toEqual([
      { key: 'percentage', value: '8%', type: 'percentage' },
    ]);
  });
  it('extracts a USD budget', () => {
    expect(quickChips('park $5000 in stables')).toEqual([
      { key: 'budget_usd', value: '$5000', type: 'currency' },
    ]);
  });
  it('expands $5k to $5000', () => {
    expect(quickChips('park $5k in stables')).toEqual([
      { key: 'budget_usd', value: '$5000', type: 'currency' },
    ]);
  });
  it('expands $2m to $2000000', () => {
    expect(quickChips('budget $2m')).toEqual([
      { key: 'budget_usd', value: '$2000000', type: 'currency' },
    ]);
  });
  it('extracts cadence', () => {
    expect(quickChips('rebalance weekly please')).toEqual([
      { key: 'cadence', value: 'weekly', type: 'enum' },
    ]);
  });
  it('returns multiple chips from a complex goal', () => {
    const chips = quickChips('park $5k weekly without exceeding 60% LTV');
    expect(chips.length).toBeGreaterThanOrEqual(2);
    expect(chips.find((c) => c.key === 'max_ltv')?.value).toBe('60%');
  });
  it('returns empty for goals with no parameters', () => {
    expect(quickChips('do something safe')).toEqual([]);
  });
});
