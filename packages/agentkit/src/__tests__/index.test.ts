// BDD coverage for the @concierge/agentkit adapter: ActionProvider shape via
// the customActionProvider escape hatch (no decorators in our src), the
// CustomActionProvider_ name prefix AgentKit stamps on every custom action,
// stringified invoke delegation (bigint-safe + rejection passthrough), zod
// validation at AgentKit's wrapper using OUR zod-4 schema (parsed-args
// invariant: defaults applied, unknown keys stripped), multi-factory merging,
// empty-registry default, registry error propagation, pipe/non-object schema
// guards on toAgentKitAction, and the upstream shared-prototype last-wins
// constraint (one provider per process).

import {
  ACTION_DECORATOR_KEY,
  ActionProvider,
  CustomActionProvider,
  type Network,
  type WalletProvider,
} from '@coinbase/agentkit';
import {
  bigintSafeStringify,
  type ConciergeAgentLike,
  type ProviderToolFactory,
  tool,
} from '@concierge/tools';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { getConciergeActionProvider, toAgentKitAction } from '../index.ts';

const agent: ConciergeAgentLike = { chainId: 5000 };

const proposeActionInput = z.object({ goal: z.string() });

const proposeAction = tool({
  name: 'proposeAction',
  description: 'Propose the next portfolio action for user review.',
  inputSchema: proposeActionInput,
  outputSchema: z.object({ summary: z.string(), riskScore: z.number() }),
  invoke: async ({ goal }) => ({ summary: `plan for ${goal}`, riskScore: 2 }),
});

const getPortfolio = tool({
  name: 'getPortfolio',
  description: 'Read the current portfolio positions.',
  inputSchema: z.object({}),
  outputSchema: z.object({ positions: z.array(z.string()) }),
  invoke: async () => ({ positions: ['sUSDe'] }),
});

const factory: ProviderToolFactory = () => [proposeAction, getPortfolio];

// AgentKit's getActions only consults the wallet provider for actions whose
// invoke takes (walletProvider, args) — ours are deliberately unary, so a
// bare stub never gets touched. If a regression made our closures binary,
// AgentKit would inject this stub as the tool's args and parsing would blow
// up loudly in the routing tests below.
const walletStub = {} as WalletProvider;

beforeAll(() => {
  // AgentKit's CreateAction wrapper fires an un-awaited telemetry fetch to
  // cca-lite.coinbase.com on EVERY action invocation. Stub it so tests make
  // no network calls and the floating promise can't reject out-of-band.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 200 })),
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // customActionProvider registers action metadata on the SHARED
  // CustomActionProvider class (not the instance), so without this reset
  // every getActions() call would return the union of all actions ever
  // registered in this process — tests would contaminate each other.
  Reflect.deleteMetadata(ACTION_DECORATOR_KEY, CustomActionProvider);
});

describe('getConciergeActionProvider', () => {
  it('returns an AgentKit ActionProvider that supports every network', () => {
    const provider = getConciergeActionProvider(agent, [factory]);
    expect(provider).toBeInstanceOf(ActionProvider);
    expect(provider.supportsNetwork({ protocolFamily: 'evm' } as Network)).toBe(true);
  });

  it('exposes one action per registry tool under AgentKit\'s "CustomActionProvider_" prefix', () => {
    const provider = getConciergeActionProvider(agent, [factory]);
    const actions = provider.getActions(walletStub);
    // The prefix is stamped by AgentKit's CreateAction on ALL custom actions
    // (`${ClassName}_${name}`) — models address tools by these full names.
    expect(actions.map((a) => a.name).sort()).toEqual([
      'CustomActionProvider_getPortfolio',
      'CustomActionProvider_proposeAction',
    ]);
    for (const a of actions) {
      expect(typeof a.description).toBe('string');
      expect(a.schema).toBeDefined();
      expect(typeof a.invoke).toBe('function');
    }
  });

  it('routes action invoke through schema.parse to ConciergeTool.invoke and resolves to a string', async () => {
    const provider = getConciergeActionProvider(agent, [factory]);
    const actions = provider.getActions(walletStub);
    const propose = actions.find((a) => a.name === 'CustomActionProvider_proposeAction');
    if (!propose) throw new Error('proposeAction missing');
    await expect(propose.invoke({ goal: 'maximize yield' })).resolves.toBe(
      JSON.stringify({ summary: 'plan for maximize yield', riskScore: 2 }),
    );
  });

  it('stringifies wei-scale bigint outputs instead of throwing or coercing', async () => {
    const balances = tool({
      name: 'balances',
      description: 'Returns raw wei balances.',
      inputSchema: z.object({}),
      outputSchema: z.object({ wei: z.bigint() }),
      invoke: async () => ({ wei: 123456789012345678901234567890n }),
    });
    const provider = getConciergeActionProvider(agent, [() => [balances]]);
    const action = provider.getActions(walletStub)[0];
    if (!action) throw new Error('balances missing');
    // Bare JSON.stringify would throw "Do not know how to serialize a
    // BigInt" — the adapter must use the registry's bigint-safe serializer.
    await expect(action.invoke({})).resolves.toBe(
      bigintSafeStringify({ wei: 123456789012345678901234567890n }),
    );
  });

  it('hands invoke the PARSED args: defaults applied, unknown keys stripped', async () => {
    const received: unknown[] = [];
    const recorder = tool({
      name: 'recorder',
      description: 'Records the exact args invoke receives.',
      inputSchema: z.object({ goal: z.string(), urgency: z.string().default('normal') }),
      outputSchema: z.object({ ok: z.boolean() }),
      invoke: async (args) => {
        received.push(args);
        return { ok: true };
      },
    });
    const provider = getConciergeActionProvider(agent, [() => [recorder]]);
    const action = provider.getActions(walletStub)[0];
    if (!action) throw new Error('recorder missing');
    await action.invoke({ goal: 'hedge', extraneous: 'stripped' });
    expect(received).toEqual([{ goal: 'hedge', urgency: 'normal' }]);
  });

  it('rejects invalid args via our zod schema before ConciergeTool.invoke runs', async () => {
    const received: unknown[] = [];
    const recorder = tool({
      name: 'recorder',
      description: 'Records whether invoke was ever reached.',
      inputSchema: z.object({ goal: z.string() }),
      outputSchema: z.object({ ok: z.boolean() }),
      invoke: async (args) => {
        received.push(args);
        return { ok: true };
      },
    });
    const provider = getConciergeActionProvider(agent, [() => [recorder]]);
    const action = provider.getActions(walletStub)[0];
    if (!action) throw new Error('recorder missing');
    // Capture ONE rejection: AgentKit's wrapper calls OUR zod-4 schema's
    // .parse, so the rejection must be that schema's ZodError (duck-typed —
    // it crosses AgentKit's bundled zod-3 boundary, instanceof is unreliable).
    const err: unknown = await action.invoke({ goal: 42 }).then(
      () => {
        throw new Error('expected invoke to reject');
      },
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).name).toBe('ZodError');
    expect((err as Error).message).toMatch(/expected string/i);
    expect(received).toEqual([]);
  });

  it('rejects with the original error when ConciergeTool.invoke rejects (no swallowing)', async () => {
    const boom = new Error('aave revert sentinel');
    const failing = tool({
      name: 'failing',
      description: 'Always rejects.',
      inputSchema: z.object({}),
      outputSchema: z.object({ ok: z.boolean() }),
      invoke: async () => {
        throw boom;
      },
    });
    const provider = getConciergeActionProvider(agent, [() => [failing]]);
    const action = provider.getActions(walletStub)[0];
    if (!action) throw new Error('failing missing');
    await expect(action.invoke({})).rejects.toBe(boom);
  });

  it('merges tools from multiple factories into one provider', () => {
    const extra = tool({
      name: 'extra',
      description: 'A second-factory tool.',
      inputSchema: z.object({}),
      outputSchema: z.object({ ok: z.boolean() }),
      invoke: async () => ({ ok: true }),
    });
    const provider = getConciergeActionProvider(agent, [factory, () => [extra]]);
    expect(
      provider
        .getActions(walletStub)
        .map((a) => a.name)
        .sort(),
    ).toEqual([
      'CustomActionProvider_extra',
      'CustomActionProvider_getPortfolio',
      'CustomActionProvider_proposeAction',
    ]);
  });

  it('yields a provider with zero actions when no factories are given', () => {
    const provider = getConciergeActionProvider(agent);
    // AgentKit warns to console when a provider has no registered metadata;
    // silence it — the empty array IS the documented mirror of
    // createConciergeTools(agent) with no factories.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(provider.getActions(walletStub)).toEqual([]);
    } finally {
      warn.mockRestore();
    }
  });

  it('propagates registry validation errors (duplicate tool names) unchanged', () => {
    expect(() => getConciergeActionProvider(agent, [factory, factory])).toThrow(/proposeAction/);
  });

  it('UPSTREAM CONSTRAINT: a second provider with the same tool names rebinds dispatch (last wins)', async () => {
    // customActionProvider registers metadata on the SHARED
    // CustomActionProvider class, and getActions resolves actions from that
    // shared map AT CALL TIME — so provider A's getActions, called after a
    // second provider registered the same name, dispatches to B's closure.
    // (Actions snapshotted via getActions BEFORE B's registration keep A's
    // closure.) This pins the upstream 0.10.x behavior the README warns
    // about (one provider per process); if this test ever fails on an
    // AgentKit bump, the README caveat can go.
    const hits: string[] = [];
    const mk = (label: string) =>
      tool({
        name: 'whoAmI',
        description: 'Reports which provider owns dispatch.',
        inputSchema: z.object({}),
        outputSchema: z.object({ label: z.string() }),
        invoke: async () => {
          hits.push(label);
          return { label };
        },
      });
    const providerA = getConciergeActionProvider(agent, [() => [mk('A')]]);
    const snapshotBefore = providerA.getActions(walletStub);
    getConciergeActionProvider(agent, [() => [mk('B')]]);
    const lookedUpAfter = providerA.getActions(walletStub);
    if (!snapshotBefore[0] || !lookedUpAfter[0]) throw new Error('whoAmI missing');
    await snapshotBefore[0].invoke({});
    await lookedUpAfter[0].invoke({});
    expect(hits).toEqual(['A', 'B']);
  });
});

describe('toAgentKitAction', () => {
  it('converts one ConciergeTool into a { name, description, schema, invoke } custom action', async () => {
    const action = toAgentKitAction(proposeAction);
    expect(action.name).toBe('proposeAction');
    expect(action.description).toBe(proposeAction.description);
    // Schema passes through BY REFERENCE so AgentKit's wrapper parses with
    // the exact zod-4 schema the tool declared.
    expect(action.schema).toBe(proposeActionInput);
    await expect(action.invoke({ goal: 'hedge' })).resolves.toBe(
      JSON.stringify({ summary: 'plan for hedge', riskScore: 2 }),
    );
  });

  it('produces a UNARY invoke so AgentKit never injects a wallet provider as args', () => {
    // AgentKit branches on invoke.length === 2 to decide whether the first
    // argument is a WalletProvider. A binary closure here would silently
    // shift the model's args out of position.
    expect(toAgentKitAction(proposeAction).invoke.length).toBe(1);
  });

  it('throws a TypeError on .transform()/.pipe() input schemas (silent wrong-schema trap)', () => {
    const piped = tool({
      name: 'piped',
      description: 'Pipes its input schema.',
      inputSchema: z.object({ goal: z.string() }).pipe(z.object({ goal: z.string() })),
      outputSchema: z.object({ ok: z.boolean() }),
      invoke: async () => ({ ok: true }),
    });
    expect(() => toAgentKitAction(piped)).toThrow(TypeError);
    expect(() => toAgentKitAction(piped)).toThrow(/piped/);
  });

  it('throws a TypeError on non-object input schemas', () => {
    const bare = tool({
      name: 'bare',
      description: 'Uses a bare string schema.',
      // Compiles without error: ConciergeTool's generic admits any zod type;
      // the z.object contract is enforced at RUNTIME, which is the guard
      // under test here.
      inputSchema: z.string(),
      outputSchema: z.object({ ok: z.boolean() }),
      invoke: async () => ({ ok: true }),
    });
    expect(() => toAgentKitAction(bare)).toThrow(TypeError);
    expect(() => toAgentKitAction(bare)).toThrow(/bare/);
  });
});
