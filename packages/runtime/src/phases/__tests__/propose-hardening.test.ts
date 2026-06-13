import { ConciergeError } from '@concierge/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentState, Plan } from '../../types.ts';
import {
  decideRequiresApproval,
  type NewProposalRow,
  type ProposalPublisher,
  type ProposalRepository,
  runPropose,
} from '../propose.ts';
import type { DetailedSim } from '../simulate.ts';

afterEach(() => vi.restoreAllMocks());

const STATE: AgentState = {
  agentId: '00000000-0000-0000-0000-000000000001',
  userId: '00000000-0000-0000-0000-000000000002',
  chain: 'mantle-sepolia',
  goal: 'idle yield',
  policyId: 'p',
  recentTicks: [],
  openPositions: [],
};
const TICK_ID = '00000000-0000-0000-0000-000000000003';
const PROPOSAL_ID = '00000000-0000-0000-0000-000000000004';
const NOW = new Date('2026-06-13T10:00:00Z');

const HF_BEFORE = 2_000_000_000_000_000_000n;
const HF_HEALTHY = 1_900_000_000_000_000_000n;
const HF_FLOOR = 1_500_000_000_000_000_000n;
const HF_NEAR_FLOOR = 1_550_000_000_000_000_000n; // within 10% buffer

function simOf(healthFactorAfter: bigint, warnings: string[] = []): DetailedSim {
  return {
    ok: true,
    gasEstimateWei: 100_000n,
    expectedValueDeltaUsd: null,
    warnings,
    deltaState: {
      healthFactorBefore: HF_BEFORE,
      healthFactorAfter,
      balanceDeltas: Object.freeze({}),
      debtDeltas: Object.freeze({}),
      oracleChecks: Object.freeze({ stale: false }),
    },
  };
}

const PLAN: Plan = {
  intent: 'rebalance',
  providerCalls: [{ provider: 'aave', action: 'supply', args: {} }],
};

function makeRepo(over: Partial<ProposalRepository> = {}): ProposalRepository {
  return {
    findPendingByAgent: vi.fn().mockResolvedValue(null),
    insert: vi.fn().mockResolvedValue({ id: PROPOSAL_ID }),
    ...over,
  };
}

function makePub(): ProposalPublisher & { mock: ReturnType<typeof vi.fn> } {
  const mock = vi.fn().mockResolvedValue(undefined);
  return { publish: mock, mock };
}
describe('runPropose — boundary validation', () => {
  it('unknown kind → ConciergeError(InvariantViolation)', async () => {
    await expect(
      runPropose(
        {
          state: STATE,
          tickId: TICK_ID,
          plan: PLAN,
          sim: simOf(HF_HEALTHY),
          // biome-ignore lint/suspicious/noExplicitAny: deliberate
          kind: 'evil' as any,
          protocol: 'aave',
          amountUsd: 25,
          hypothesis: '',
        },
        { repository: makeRepo(), publisher: makePub(), now: () => NOW },
      ),
    ).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'InvariantViolation',
    );
  });

  it('negative amount → InvariantViolation', async () => {
    await expect(
      runPropose(
        {
          state: STATE,
          tickId: TICK_ID,
          plan: PLAN,
          sim: simOf(HF_HEALTHY),
          kind: 'supply',
          protocol: 'aave',
          amountUsd: -1,
          hypothesis: '',
        },
        { repository: makeRepo(), publisher: makePub(), now: () => NOW },
      ),
    ).rejects.toBeInstanceOf(ConciergeError);
  });

  it('NaN amount → InvariantViolation', async () => {
    await expect(
      runPropose(
        {
          state: STATE,
          tickId: TICK_ID,
          plan: PLAN,
          sim: simOf(HF_HEALTHY),
          kind: 'supply',
          protocol: 'aave',
          amountUsd: Number.NaN,
          hypothesis: '',
        },
        { repository: makeRepo(), publisher: makePub(), now: () => NOW },
      ),
    ).rejects.toBeInstanceOf(ConciergeError);
  });
});

describe('runPropose — infra failures (THROW as ConciergeError)', () => {
  it('repository.insert throws → ConciergeError(RpcError) with sanitized cause', async () => {
    const repo = makeRepo({
      insert: vi.fn().mockRejectedValue(new Error('conn lost at ?apikey=LEAKED')),
    });
    await expect(
      runPropose(
        {
          state: STATE,
          tickId: TICK_ID,
          plan: PLAN,
          sim: simOf(HF_HEALTHY),
          kind: 'supply',
          protocol: 'aave',
          amountUsd: 25,
          hypothesis: '',
        },
        { repository: repo, publisher: makePub(), now: () => NOW },
      ),
    ).rejects.toSatisfy((e: unknown) => {
      if (!(e instanceof ConciergeError)) return false;
      return e.type === 'RpcError' && !JSON.stringify(e).includes('LEAKED');
    });
  });

  it('publisher.publish throws → ConciergeError(RpcError)', async () => {
    const pub: ProposalPublisher = {
      publish: vi.fn().mockRejectedValue(new Error('redis down')),
    };
    await expect(
      runPropose(
        {
          state: STATE,
          tickId: TICK_ID,
          plan: PLAN,
          sim: simOf(HF_HEALTHY),
          kind: 'supply',
          protocol: 'aave',
          amountUsd: 25,
          hypothesis: '',
        },
        { repository: makeRepo(), publisher: pub, now: () => NOW },
      ),
    ).rejects.toSatisfy((e: unknown) => e instanceof ConciergeError && e.type === 'RpcError');
  });
});

describe('runPropose — round-1 hardening: TOCTOU + boundary', () => {
  it('insert throws PG 23505 (unique_violation) → returns already_pending (race converged)', async () => {
    const findCalls = vi.fn();
    findCalls
      .mockResolvedValueOnce(null) // first check: none pending
      .mockResolvedValueOnce({ id: 'winner-id' }); // post-race lookup
    const err = Object.assign(new Error('duplicate key'), { code: '23505' });
    const repo: ProposalRepository = {
      findPendingByAgent: findCalls,
      insert: vi.fn().mockRejectedValue(err),
    };
    const out = await runPropose(
      {
        state: STATE,
        tickId: TICK_ID,
        plan: PLAN,
        sim: simOf(HF_HEALTHY),
        kind: 'supply',
        protocol: 'aave',
        amountUsd: 25,
        hypothesis: '',
      },
      { repository: repo, publisher: makePub(), now: () => NOW },
    );
    expect(out.kind).toBe('continue');
    if (out.kind === 'continue') {
      expect(out.data.kind).toBe('already_pending');
      expect(out.data.proposalId).toBe('winner-id');
    }
  });

  it('insert throws PG 23505 nested on err.cause → recognized as unique_violation', async () => {
    const findCalls = vi.fn();
    findCalls.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'w' });
    const inner = Object.assign(new Error('dup'), { code: '23505' });
    const wrapped = new Error('insert failed', { cause: inner });
    const repo: ProposalRepository = {
      findPendingByAgent: findCalls,
      insert: vi.fn().mockRejectedValue(wrapped),
    };
    const out = await runPropose(
      {
        state: STATE,
        tickId: TICK_ID,
        plan: PLAN,
        sim: simOf(HF_HEALTHY),
        kind: 'supply',
        protocol: 'aave',
        amountUsd: 25,
        hypothesis: '',
      },
      { repository: repo, publisher: makePub(), now: () => NOW },
    );
    if (out.kind === 'continue') expect(out.data.kind).toBe('already_pending');
  });

  it('invalid userId format → InvariantViolation (CWE-20 channel safety)', async () => {
    await expect(
      runPropose(
        {
          state: { ...STATE, userId: 'bad:user\n*' },
          tickId: TICK_ID,
          plan: PLAN,
          sim: simOf(HF_HEALTHY),
          kind: 'supply',
          protocol: 'aave',
          amountUsd: 25,
          hypothesis: '',
        },
        { repository: makeRepo(), publisher: makePub(), now: () => NOW },
      ),
    ).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'InvariantViolation',
    );
  });

  it('policy.hfFloor=0n → InvariantViolation', async () => {
    await expect(
      runPropose(
        {
          state: STATE,
          tickId: TICK_ID,
          plan: PLAN,
          sim: simOf(HF_HEALTHY),
          kind: 'supply',
          protocol: 'aave',
          amountUsd: 25,
          hypothesis: '',
        },
        {
          repository: makeRepo(),
          publisher: makePub(),
          now: () => NOW,
          policy: { hfFloor: 0n },
        },
      ),
    ).rejects.toBeInstanceOf(ConciergeError);
  });

  it('policy.hfBufferBps=-1n → InvariantViolation (would silently auto-approve)', async () => {
    await expect(
      runPropose(
        {
          state: STATE,
          tickId: TICK_ID,
          plan: PLAN,
          sim: simOf(HF_HEALTHY),
          kind: 'supply',
          protocol: 'aave',
          amountUsd: 25,
          hypothesis: '',
        },
        {
          repository: makeRepo(),
          publisher: makePub(),
          now: () => NOW,
          policy: { hfBufferBps: -1n },
        },
      ),
    ).rejects.toBeInstanceOf(ConciergeError);
  });

  it('publisher throws → row already inserted; next tick returns already_pending', async () => {
    const inserted = vi.fn().mockResolvedValue({ id: 'p1' });
    const findCalls = vi.fn();
    findCalls
      .mockResolvedValueOnce(null) // first tick: nothing pending
      .mockResolvedValueOnce({ id: 'p1' }); // second tick: idempotent return
    const repo: ProposalRepository = { findPendingByAgent: findCalls, insert: inserted };
    const failingPub: ProposalPublisher = {
      publish: vi.fn().mockRejectedValue(new Error('redis hiccup')),
    };

    await expect(
      runPropose(
        {
          state: STATE,
          tickId: TICK_ID,
          plan: PLAN,
          sim: simOf(HF_HEALTHY),
          kind: 'supply',
          protocol: 'aave',
          amountUsd: 25,
          hypothesis: '',
        },
        { repository: repo, publisher: failingPub, now: () => NOW },
      ),
    ).rejects.toBeInstanceOf(ConciergeError);
    expect(inserted).toHaveBeenCalledTimes(1);

    // Re-tick — should converge on the existing pending row.
    const out2 = await runPropose(
      {
        state: STATE,
        tickId: TICK_ID,
        plan: PLAN,
        sim: simOf(HF_HEALTHY),
        kind: 'supply',
        protocol: 'aave',
        amountUsd: 25,
        hypothesis: '',
      },
      { repository: repo, publisher: makePub(), now: () => NOW },
    );
    if (out2.kind === 'continue') {
      expect(out2.data.kind).toBe('already_pending');
      expect(out2.data.proposalId).toBe('p1');
    }
  });
});
