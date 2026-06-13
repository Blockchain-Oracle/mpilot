import { describe, expect, it } from 'vitest';
import { MODEL_HAIKU, MODEL_OPUS, MODEL_SONNET, routeModelForPhase } from '../models.ts';
import { TICK_PHASES } from '../types.ts';

describe('model constants (ADR-006 + 2026-06-13 model family)', () => {
  it('Sonnet 4.6 id is exact', () => {
    expect(MODEL_SONNET).toBe('claude-sonnet-4-6');
  });

  it('Opus 4.7 id is exact', () => {
    expect(MODEL_OPUS).toBe('claude-opus-4-7');
  });

  it('Haiku 4.5 id is exact', () => {
    expect(MODEL_HAIKU).toBe('claude-haiku-4-5-20251001');
  });
});

describe('routeModelForPhase', () => {
  it('plan → Sonnet', () => {
    expect(routeModelForPhase('plan')).toBe(MODEL_SONNET);
  });

  it('simulate → Sonnet', () => {
    expect(routeModelForPhase('simulate')).toBe(MODEL_SONNET);
  });

  it('propose → Sonnet', () => {
    expect(routeModelForPhase('propose')).toBe(MODEL_SONNET);
  });

  it('execute → Sonnet', () => {
    expect(routeModelForPhase('execute')).toBe(MODEL_SONNET);
  });

  it('decide without risk → Sonnet', () => {
    expect(routeModelForPhase('decide')).toBe(MODEL_SONNET);
    expect(routeModelForPhase('decide', { riskFlagged: false })).toBe(MODEL_SONNET);
  });

  it('decide with riskFlagged → Opus', () => {
    expect(routeModelForPhase('decide', { riskFlagged: true })).toBe(MODEL_OPUS);
  });

  it('record → Haiku', () => {
    expect(routeModelForPhase('record')).toBe(MODEL_HAIKU);
  });

  it('covers every TickPhase (exhaustiveness)', () => {
    for (const phase of TICK_PHASES) {
      const m = routeModelForPhase(phase);
      expect([MODEL_SONNET, MODEL_OPUS, MODEL_HAIKU]).toContain(m);
    }
  });

  it('throws on unknown phase (defends against silent default)', () => {
    expect(() => routeModelForPhase('mystery' as unknown as 'plan')).toThrow(/unknown phase/);
  });
});
