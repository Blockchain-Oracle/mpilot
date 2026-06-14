# Story — MCP Elicitation (Rail 3): form-mode confirmation + url-mode OAuth/wallet-connect handoff

**ID:** story-138-mcp-elicitation
**Epic:** Epic E8 — MCP Server
**Depends on:** story-130-mcp-server-bootstrap (amended)
**Estimate:** ~2h
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** Claude Desktop user about to approve a $10,000 USDC supply via Concierge
**I want to** see a STRUCTURED confirmation form (max-slippage slider, justification field, confirm checkbox) rendered by Claude Desktop, not a free-text LLM prompt
**So that** the high-value action is gated by an explicit confirmation, and my wallet-connect handoff can use `url-mode` Elicitation when needed

---

## File modification map

- `packages/mcp/src/elicitation.ts` — NEW — exports `requestFormConfirmation(ctx, opts)` (form mode) and `requestUrlElicitation(ctx, opts)` (url mode, SEP-1036)
- `packages/mcp/src/server.ts` — UPDATE — write tools (e.g., `executeProposal`) call `requestFormConfirmation` when args trigger high-value threshold ($X configurable, default $1000)
- `packages/mcp/src/wallet-import-flow.ts` — NEW — `importSessionKeyViaElicitation(ctx)` triggers a `mode: 'url'` Elicitation pointing the user to `https://concierge.xyz/auth/import?session=<one-time-token>` for OAuth/wallet-connect handoff
- `packages/mcp/src/__tests__/elicitation.test.ts` — NEW — ≥ 8 cases (form accept/decline/cancel + url accept + threshold trigger + high-value path)

---

## Acceptance criteria (BDD)

```
Given a tool's args trigger the high-value threshold (>$1000 notional)
When the tool's handler runs
Then it calls `ctx.mcpReq.elicitInput({ mode: 'form', message, requestedSchema })` with schema including `confirm: boolean` AND `maxSlippageBps: number` AND `justification: string`

Given user `accept`s the elicitation with valid form data
When the elicitation response returns `{ action: 'accept', content: { confirm: true, maxSlippageBps: 50, justification: '...' } }`
Then the tool proceeds with the action using the user-confirmed slippage

Given user `decline`s the elicitation
When the response returns `{ action: 'decline' }`
Then the tool throws ConciergeError(type='UserRejected') AND does NOT execute the on-chain action

Given user `cancel`s the elicitation
When the response returns `{ action: 'cancel' }`
Then the tool returns a partial-completion message AND does NOT execute the on-chain action

Given the URL-mode handoff is requested
When `importSessionKeyViaElicitation(ctx)` runs
Then it calls `elicitInput({ mode: 'url', url: '<one-time-link>', message: '...' })` AND on `accept`, polls the Concierge API for the imported session key

Given the host does NOT support Elicitation (older MCP client)
When the tool runs
Then it falls back to LLM-asked confirmation (returns a structured prompt to the LLM) — does NOT crash

Given typecheck + build + tests
When `pnpm --filter @concierge-mantle/mcp test && pnpm --filter @concierge-mantle/mcp build && pnpm typecheck` runs
Then ≥ 8 cases pass; all exit 0
```

---

## Shell verification

```bash
test -f packages/mcp/src/elicitation.ts
test -f packages/mcp/src/wallet-import-flow.ts

# Anti-regression: high-value threshold must be configurable via env, not hardcoded
grep -E "HIGH_VALUE_USD_THRESHOLD|CONCIERGE_CONFIRM_THRESHOLD" packages/mcp/src/elicitation.ts

# Anti-regression: NEVER bypass elicitation when host supports it
! grep -E "skipElicitation|bypassConfirm" packages/mcp/src/server.ts

pnpm --filter @concierge-mantle/mcp test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 8 {exit 0} {exit 1}'
```

---

## Notes for coding agent

### Form-mode confirmation (verbatim from architecture.md ADR-017 + AUDIT §2):

```typescript
export async function requestFormConfirmation(ctx, opts: { actionSummary: string; notionalUsd: number }) {
  const result = await ctx.mcpReq.elicitInput({
    mode: 'form',
    message: `Confirm: ${opts.actionSummary}\nNotional: $${opts.notionalUsd.toFixed(2)}`,
    requestedSchema: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean', title: 'Approve?' },
        maxSlippageBps: { type: 'number', title: 'Max slippage (basis points)', minimum: 0, maximum: 1000, default: 50 },
        justification: { type: 'string', title: 'Justification (audit log)', maxLength: 200 },
      },
      required: ['confirm'],
    },
  });
  if (result.action !== 'accept' || !result.content?.confirm) {
    throw new ConciergeError('UserRejected', `User did not approve: ${result.action}`);
  }
  return result.content as { confirm: true; maxSlippageBps: number; justification?: string };
}
```

### URL-mode handoff (SEP-1036):

```typescript
export async function importSessionKeyViaElicitation(ctx, agentId: string) {
  const oneTimeToken = await generateOneTimeImportToken(agentId);  // 5-min TTL
  const url = `https://concierge.xyz/auth/import?token=${oneTimeToken}`;
  const result = await ctx.mcpReq.elicitInput({
    mode: 'url',
    elicitationId: crypto.randomUUID(),
    url,
    message: 'Import your Concierge session key by signing on concierge.xyz.',
  });
  if (result.action !== 'accept') throw new ConciergeError('UserRejected', `Import cancelled: ${result.action}`);
  return await pollImportResult(oneTimeToken);  // polls server until session key is registered
}
```

### Fallback for hosts WITHOUT elicitation support

Check capabilities at MCP `initialize` time. If `clientCapabilities.elicitation` is absent, the tool's handler must NOT call `elicitInput` — instead, return a tool result that prompts the LLM to ask the user for confirmation in chat. The structured-JSON contract still applies; just no host-rendered form.

Cross-ref: ADR-017 (Rail 3), AUDIT-2026-06-09 §2 (Elicitation stable since 2025-06-18, full JSON Schema supported in v1.29 — Agent A's "primitive only" note was outdated), CLAUDE.md gotchas list (Aave E-Mode 1 silent fail — elicitation is the safety net against ALL silent-fail traps with on-chain $$).
