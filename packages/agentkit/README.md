# @concierge/agentkit

Coinbase AgentKit adapter for the framework-agnostic
[`@concierge/tools`](../tools) registry, built on AgentKit's
**`customActionProvider` escape hatch** — not the documented
`@CreateAction` decorator path. No class hierarchy, no decorator syntax, no
`reflect-metadata` import, no `experimentalDecorators` in your tsconfig.

```ts
import { AgentKit } from '@coinbase/agentkit';
import { getConciergeActionProvider } from '@concierge/agentkit';
import { aaveTools, dexTools } from '@concierge/providers'; // example factories

const provider = getConciergeActionProvider({ chainId: 5000 }, [aaveTools, dexTools]);

const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [provider],
});
```

Omitting the factories yields a provider with zero actions; registry
validation errors (duplicate tool names, schema violations) propagate
unchanged. Action results are stringified with `bigintSafeStringify`
(AgentKit's `Action.invoke` contract is `Promise<string>`, and provider tools
return wei-scale bigints that bare `JSON.stringify` throws on).

## AgentKit behaviors you should know (verified against 0.10.4)

- **Action names are prefixed.** AgentKit stamps `${ClassName}_${name}` on
  every custom action, so `proposeAction` surfaces to the model as
  `CustomActionProvider_proposeAction`.
- **One provider per process.** AgentKit registers custom-action metadata on
  the shared `CustomActionProvider` class and resolves `getActions()` from it
  at call time — a second `customActionProvider`/`getConciergeActionProvider`
  call with overlapping tool names takes over dispatch (last wins).
- **Telemetry.** Every action invocation fires AgentKit's own un-awaited
  `fetch` to `cca-lite.coinbase.com`. Upstream behavior, not this adapter's;
  stub `fetch` in tests.
- **`graphql` peer gap.** `@coinbase/agentkit`'s barrel eagerly imports
  `graphql-request`, which peers on `graphql` without AgentKit declaring it.
  Under pnpm with `auto-install-peers=false` you must install `graphql`
  yourself or the import throws `Cannot find module 'graphql'`.

## Validation semantics

AgentKit's wrapper calls the tool's own zod `inputSchema.parse(args)` before
delegating, so `ConciergeTool.invoke` receives the **parsed** value (defaults
applied, unknown keys stripped) — the same invariant as every other Concierge
adapter. Only `.parse` is touched at runtime, which is why zod-4 schemas work
inside zod-3-era AgentKit; the single type-level cast lives in
`getConciergeActionProvider` and is pinned by tests. `outputSchema` is **not**
enforced on return values — AgentKit's Action contract has no return-shape
slot; output validation belongs to the tool.

`toAgentKitAction(tool)` is exported for composing individual tools into your
own `customActionProvider` array. It throws a `TypeError` on
`.transform()`/`.pipe()` input schemas (downstream action→model bridges
convert the schema to JSON Schema, where a pipe advertises its output
segment) and on non-object schemas.
