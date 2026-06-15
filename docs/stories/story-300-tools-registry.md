# Story — `@mpilot/tools` framework-agnostic tool registry

**ID:** story-300-tools-registry
**Epic:** Epic E13 — Composable Primitive (NEW, post-2026-06-09 rework)
**Depends on:** story-20-shared-package-bootstrap
**Estimate:** ~2h
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** Mantle developer or AI agent author
**I want to** import `createConciergeTools(agent)` from `@mpilot/tools` and receive a framework-agnostic array of `ConciergeTool` objects
**So that** my Vercel AI SDK / OpenAI / LangChain / AgentKit / MCP server / React UI consumer can all use the SAME source of truth for Concierge actions, with one schema definition feeding every surface

---

## File modification map

- `packages/tools/package.json` — NEW — `"type": "module"`, `"sideEffects": false`, `"engines.node": ">=22"`, deps on `@mpilot/shared` + `@mpilot/agent` + 7 provider packages (`workspace:*`), peer dep on `zod ^3.25 || ^4.1`. `tsup` build script. Exports: `.` (main) + `./serializable` (subpath for the per-card schemas).
- `packages/tools/src/types.ts` — NEW — `ConciergeTool<TInputSchema, TOutputSchema>` interface (verbatim from architecture.md ADR-014), `TickPhase` union type, `UICardId` union type
- `packages/tools/src/tool.ts` — NEW — `tool<TIn, TOut>(def)` helper that returns the input unchanged (type-narrowing identity function, matches Vercel AI SDK's `tool()` shape per SDK-DX-STUDY §J)
- `packages/tools/src/createConciergeTools.ts` — NEW — `createConciergeTools(agent: ConciergeAgent): ConciergeTool[]` that flat-maps each provider's exported `tools()` function
- `packages/tools/src/toJsonSchema.ts` — NEW — `toJsonSchema(tool): Record<string, unknown>` using `zodToJsonSchema` (target: `openApi3` for OpenAI/Anthropic compat)
- `packages/tools/src/bigintSafeStringify.ts` — NEW — JSON.stringify replacer that handles bigints (on-chain reads return bigints)
- `packages/tools/src/serializable/proposal.ts` — NEW — `SerializableProposalCardSchema` + `safeParseSerializableProposalCard()`
- `packages/tools/src/serializable/tick.ts` — NEW — `SerializableTickCardSchema` + `safeParseSerializableTickCard()`
- `packages/tools/src/serializable/portfolio.ts` — NEW — `SerializablePortfolioCardSchema` + `safeParseSerializablePortfolioCard()`
- `packages/tools/src/serializable/reputation.ts` — NEW — `SerializableReputationCardSchema` + `safeParseSerializableReputationCard()`
- `packages/tools/src/serializable/index.ts` — NEW — barrel exports
- `packages/tools/src/index.ts` — NEW — barrel exports: `ConciergeTool`, `tool`, `createConciergeTools`, `toJsonSchema`, `bigintSafeStringify`, all serializable schemas + parsers
- `packages/tools/src/__tests__/createConciergeTools.test.ts` — NEW — at least 12 test cases
- `packages/tools/src/__tests__/serializable.test.ts` — NEW — at least 8 test cases for the 4 serializable schemas
- `packages/tools/README.md` — NEW — quickstart + the canonical adapter pattern (Vercel AI / LangChain / OpenAI / AgentKit / MCP each in 5 lines)

---

## Acceptance criteria (BDD)

```
Given `packages/tools/package.json` exists with the ESM-only shape from ADR-018
When `node -e "const p = require('./packages/tools/package.json'); console.log([p.type, p.sideEffects, p.engines.node].join(','))"` runs
Then output is "module,false,>=22"

Given a `ConciergeTool` is defined via the `tool()` helper
When TypeScript compiles `tool({ name: 't', description: 'd', inputSchema: z.object({ x: z.number() }), outputSchema: z.object({ y: z.string() }), invoke: async ({ x }) => ({ y: String(x) }) })`
Then the inferred type is `ConciergeTool<ZodObject<{ x: ZodNumber }>, ZodObject<{ y: ZodString }>>` with NO `any` widening

Given a `ConciergeTool` is defined WITHOUT `outputSchema`
When TypeScript compiles it
Then the compile FAILS with an error "Property 'outputSchema' is missing"

Given a mock ConciergeAgent
When `createConciergeTools(mockAgent)` runs
Then it returns a non-empty array AND every tool has `inputSchema` AND every tool has `outputSchema` AND every tool's `invoke` is a function

Given a tool returns `{ amount: 1234567890n }` (bigint)
When `bigintSafeStringify(result)` runs
Then output is `{"amount":"1234567890"}` (bigint serialized as string, parseable JSON)

Given `toJsonSchema(tool)` is called
When the tool's inputSchema is `z.object({ asset: z.enum(['USDC', 'USDT']), amount: z.number() })`
Then output is valid OpenAPI 3 JSON Schema with `type: 'object'`, `properties: { asset: { enum: [...] }, amount: { type: 'number' } }`, `required: ['asset', 'amount']`

Given the SerializableProposalCardSchema is defined
When `safeParseSerializableProposalCard({ id: 'p_1', actionSummary: 'Supply 100 USDC', estimatedAprDelta: 0.034, expectedHealthFactor: 2.1, expiresAt: '2026-06-09T13:00:00Z' })` runs
Then result.success is true AND result.data has the same shape

Given the SerializableProposalCardSchema is fed invalid data
When `safeParseSerializableProposalCard({ id: 123, actionSummary: null })` runs
Then result.success is false AND result.error includes both 'id' and 'actionSummary' field paths

Given a ConciergeTool with `supportsNetwork: (id) => id === 5000` is checked against Sepolia (5003)
When `tool.supportsNetwork?.(5003)` runs
Then result is false (tool is Mainnet-only)

Given tests run
When `pnpm --filter @mpilot/tools test --reporter=verbose` runs
Then ≥ 20 test cases pass

Given typecheck + LOC + lint
When `pnpm typecheck && pnpm check-file-loc && pnpm lint --filter @mpilot/tools` runs
Then all exit 0

Given `tsup` produces dist
When `pnpm --filter @mpilot/tools build` runs
Then `packages/tools/dist/index.js`, `packages/tools/dist/index.d.ts`, AND `packages/tools/dist/serializable/index.js` all exist
```

---

## Shell verification

```bash
test -f packages/tools/package.json
test -f packages/tools/src/types.ts
test -f packages/tools/src/tool.ts
test -f packages/tools/src/createConciergeTools.ts
test -f packages/tools/src/toJsonSchema.ts
test -f packages/tools/src/bigintSafeStringify.ts
test -f packages/tools/src/serializable/proposal.ts
test -f packages/tools/src/serializable/tick.ts
test -f packages/tools/src/serializable/portfolio.ts
test -f packages/tools/src/serializable/reputation.ts
test -f packages/tools/src/index.ts
test -f packages/tools/README.md

# Package shape
node -e "
  const p = require('./packages/tools/package.json');
  if (p.type !== 'module') process.exit(1);
  if (p.sideEffects !== false) process.exit(2);
  if (!p.engines || p.engines.node !== '>=22') process.exit(3);
  if (p.dependencies?.zod) process.exit(4);  // zod must be PEER, not runtime
  if (!p.peerDependencies?.zod) process.exit(5);
"

# Build produces dist + types
pnpm --filter @mpilot/tools build
test -f packages/tools/dist/index.js
test -f packages/tools/dist/index.d.ts

# Tests pass with ≥ 20 cases
pnpm --filter @mpilot/tools test --reporter=verbose 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 20 {exit 0} {exit 1}'

# Anti-regression: no `unknown` in tool inputs
! grep -rE "invoke\([^)]*: unknown" packages/tools/src/

# Anti-regression: outputSchema is required (no `outputSchema?:` in types)
! grep -E "outputSchema\?:" packages/tools/src/types.ts

# Anti-regression: tool() helper does NOT wrap in a class
! grep -E "class\s+ConciergeToolImpl" packages/tools/src/

# LOC budget
pnpm check-file-loc
pnpm typecheck
pnpm lint --filter @mpilot/tools
```

---

## Notes for coding agent

### The `ConciergeTool` interface (verbatim from architecture.md ADR-014)

```typescript
import type { z } from 'zod';

export interface ConciergeTool<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  name: string;
  description: string;
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;
  uiCardId?: 'proposal' | 'tick' | 'portfolio' | 'reputation' | 'plan' | 'data-table';
  invoke(args: z.infer<TInputSchema>): Promise<z.infer<TOutputSchema>>;
  supportsNetwork?(chainId: number): boolean;
}

export function tool<TIn extends z.ZodTypeAny, TOut extends z.ZodTypeAny>(
  def: ConciergeTool<TIn, TOut>
): ConciergeTool<TIn, TOut> {
  return def;
}
```

### Schema files

Each `SerializableXxxSchema` is **the canonical contract**: the tool's `outputSchema` includes it as a subset (or matches it exactly when the tool's job IS to produce that card's data). `@mpilot/mcp` registers tools with this `outputSchema`, the resulting `structuredContent` feeds `<ProposalCard part={p} />` parse-then-render in `@mpilot/react-ui`.

```typescript
// Example: serializable/proposal.ts
import { z } from 'zod';

export const SerializableProposalCardSchema = z.object({
  id: z.string().regex(/^p_/),
  actionSummary: z.string().min(1),
  estimatedAprDelta: z.number(),         // signed (positive = earn, negative = pay)
  expectedHealthFactor: z.number().optional(),
  expiresAt: z.string().datetime(),
  txPreview: z.object({
    to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    value: z.string(),  // bigint serialized as string
    data: z.string().regex(/^0x[a-fA-F0-9]*$/),
  }).optional(),
});

export function safeParseSerializableProposalCard(data: unknown) {
  return SerializableProposalCardSchema.safeParse(data);
}
```

### The `createConciergeTools(agent)` function

Aggregates tools from each provider package. Each provider exports a `tools(agent: ConciergeAgent): ConciergeTool[]` function. This story scaffolds the aggregation; provider packages register against this interface in follow-on stories.

```typescript
import { tools as aaveTools } from '@mpilot/aave-v3-mantle';
import { tools as dexTools } from '@mpilot/mantle-dex';
// ... etc for 7 providers

export function createConciergeTools(agent: ConciergeAgent): ConciergeTool[] {
  return [
    ...aaveTools(agent),
    ...dexTools(agent),
    ...ethenaTools(agent),
    ...ondoTools(agent),
    ...methStakingTools(agent),
    ...lifiTools(agent),
    ...erc8004Tools(agent),
  ].filter(t => t.supportsNetwork?.(agent.chainId) ?? true);
}
```

Network-gating: tools that don't support the current chain are filtered out. Aave V3 (Mainnet only — `supportsNetwork: id => id === 5000`) is NOT exposed on Sepolia (5003).

### Anti-patterns (BLOCKED at PR review)

1. ❌ `invoke(input: unknown)` — per ADR-014 + SDK-DX-STUDY §E, generics are mandatory.
2. ❌ `outputSchema?: ...` (optional) — must be required.
3. ❌ Wrapping in a class hierarchy — `tool()` returns the input object unchanged. No `class ConciergeToolImpl`.
4. ❌ Bundling `zod` as runtime dep — peer only.
5. ❌ `console.log` (use `pino` or stderr in stdio context).
6. ❌ Subpath-exporting framework adapters from this package — they live in their own packages.

### Cross-references

- architecture.md ADR-014 (this story IS the ADR-014 implementation), ADR-017 (outputSchema feeds Rail 1-3 gen UI), ADR-018 (ESM-only, peer deps)
- research/concierge/SDK-DX-STUDY-2026-06-09.md §E (type design), §J (zod v4 consensus)
- research/concierge/AUDIT-2026-06-09.md §2 (outputSchema load-bearing for MCP structuredContent)
- Reference impl: `Blockchain-Oracle/cdr-kit:packages/tools/src/types.ts` (the shape we mirror exactly)

### Test coverage requirements (20+ cases)

- 3 tool() helper type-inference tests
- 3 createConciergeTools() aggregation tests (mock providers)
- 2 supportsNetwork filtering tests
- 4 toJsonSchema tests (object, enum, optional, nested)
- 2 bigintSafeStringify tests (positive bigint, negative bigint)
- 4 serializable schema happy-path tests (one per card)
- 4 serializable schema error tests (one per card with bad data)
- 2 cross-tool tests: tool(...).outputSchema === SerializableProposalCardSchema (the binding is real)
