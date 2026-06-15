// The shared-class registry hazard, both halves:
//
// 1. OUR GUARD — getConciergeActionProvider throws when custom actions are
//    already registered in the process (overlapping names would silently
//    rebind dispatch to the newest closure; disjoint names would silently
//    merge into every provider's getActions()). Wrong-agent dispatch in a
//    DeFi agent is a funds-level failure, so registration fails loudly.
// 2. UPSTREAM PINS — raw customActionProvider (which bypasses our guard)
//    still exhibits 0.10.x's last-wins and union-leakage behavior, because
//    metadata lives on the SHARED CustomActionProvider class and getActions
//    resolves from it AT CALL TIME. If these pins ever fail on an AgentKit
//    bump, the registration model changed upstream — the guard and the
//    README caveat can then be reassessed.

import {
  ACTION_DECORATOR_KEY,
  CustomActionProvider,
  customActionProvider,
  type WalletProvider,
} from '@coinbase/agentkit';
import { type ConciergeAgentLike, tool } from '@mpilot/tools';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { getConciergeActionProvider, toAgentKitAction } from '../index.ts';

const agent: ConciergeAgentLike = { chainId: 5000 };
const walletStub = {} as WalletProvider;

const mkTool = (name: string) =>
  tool({
    name,
    description: `Tool ${name}.`,
    inputSchema: z.object({}),
    outputSchema: z.object({ ok: z.boolean() }),
    invoke: async () => ({ ok: true }),
  });

// Register an action through AgentKit DIRECTLY — the upstream path our
// guard cannot see. Mirrors production's boundary discipline: the cast is
// scoped to the one zod-3/zod-4-incompatible `schema` field and `satisfies`
// keeps the rest structurally checked, so an upstream option-shape change
// breaks this helper at build time exactly like it breaks the adapter.
type RawOptions = Extract<
  Parameters<typeof customActionProvider<WalletProvider>>[0],
  readonly unknown[]
>;
const rawRegister = (action: ReturnType<typeof toAgentKitAction>) =>
  customActionProvider<WalletProvider>([
    { ...action, schema: action.schema as unknown as RawOptions[number]['schema'] },
  ] satisfies RawOptions);

beforeAll(() => {
  // Upstream fires an un-awaited telemetry fetch per invocation; stub it so
  // tests make no network calls and the floating promise can't reject.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 200 })),
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // Reset the shared class-level registry between tests (see index.test.ts).
  Reflect.deleteMetadata(ACTION_DECORATOR_KEY, CustomActionProvider);
});

describe('getConciergeActionProvider registration guard', () => {
  it('throws on a second provider with OVERLAPPING tool names, naming the collisions', () => {
    getConciergeActionProvider(agent, [() => [mkTool('whoAmI'), mkTool('other')]]);
    expect(() => getConciergeActionProvider(agent, [() => [mkTool('whoAmI')]])).toThrow(
      /rebind dispatch for: whoAmI/,
    );
  });

  it('throws on a second provider with DISJOINT tool names (union leakage)', () => {
    getConciergeActionProvider(agent, [() => [mkTool('alpha')]]);
    expect(() => getConciergeActionProvider(agent, [() => [mkTool('beta')]])).toThrow(
      /silently merge/,
    );
  });

  it('does not throw when prior registrations were cleaned up (fresh process state)', () => {
    getConciergeActionProvider(agent, [() => [mkTool('alpha')]]);
    Reflect.deleteMetadata(ACTION_DECORATOR_KEY, CustomActionProvider);
    expect(() => getConciergeActionProvider(agent, [() => [mkTool('alpha')]])).not.toThrow();
  });

  it('throws on a second provider even when the FIRST had zero actions (sentinel)', () => {
    // A zero-action customActionProvider stamps no metadata upstream, so
    // without a sentinel the guard would pass and the empty provider's
    // getActions() would start advertising the second provider's actions —
    // the union-leakage hazard through the documented empty-provider path.
    getConciergeActionProvider(agent);
    expect(() => getConciergeActionProvider(agent, [() => [mkTool('alpha')]])).toThrow(
      /silently merge/,
    );
  });

  it('fails CLOSED when the metadata container is no longer a Map (upstream drift)', () => {
    // The guard must not silently disarm if an AgentKit bump inside the peer
    // range changes how custom-action metadata is stored. Unrecognized shape
    // present => loud refusal, not a no-op size check.
    Reflect.defineMetadata(ACTION_DECORATOR_KEY, { alpha: {} }, CustomActionProvider);
    expect(() => getConciergeActionProvider(agent, [() => [mkTool('alpha')]])).toThrow(
      /registration model changed/,
    );
  });

  it('a rejected registration leaves the FIRST provider dispatch untouched (no residue)', async () => {
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
    expect(() => getConciergeActionProvider(agent, [() => [mk('B')]])).toThrow(
      /rebind dispatch for: whoAmI/,
    );
    // The guard throws BEFORE customActionProvider runs, so the shared
    // registry still resolves whoAmI to A's closure.
    const action = providerA.getActions(walletStub)[0];
    if (!action) throw new Error('whoAmI missing');
    await action.invoke({});
    expect(hits).toEqual(['A']);
  });
});

describe('UPSTREAM CONSTRAINT pins (raw customActionProvider bypasses the guard)', () => {
  it('a second registration with the same tool name rebinds dispatch (last wins)', async () => {
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
    // Actions snapshotted BEFORE B's registration keep A's closure; the
    // same lookup AFTER resolves to B's — getActions reads the shared
    // metadata map at call time.
    const snapshotBefore = providerA.getActions(walletStub);
    rawRegister(toAgentKitAction(mk('B')));
    const lookedUpAfter = providerA.getActions(walletStub);
    if (!snapshotBefore[0] || !lookedUpAfter[0]) throw new Error('whoAmI missing');
    await snapshotBefore[0].invoke({});
    await lookedUpAfter[0].invoke({});
    expect(hits).toEqual(['A', 'B']);
  });

  it('a second registration with a DISJOINT name leaks into the first provider getActions (union)', () => {
    const providerA = getConciergeActionProvider(agent, [() => [mkTool('alpha')]]);
    rawRegister(toAgentKitAction(mkTool('beta')));
    // No name collision needed: provider A now advertises beta too — the
    // undocumented-upstream variant our guard exists to prevent.
    expect(
      providerA
        .getActions(walletStub)
        .map((a) => a.name)
        .sort(),
    ).toEqual(['CustomActionProvider_alpha', 'CustomActionProvider_beta']);
  });
});
