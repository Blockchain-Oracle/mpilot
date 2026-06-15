# Story — MCP Apps `ui://concierge/*` HTML resources (Rail 2 generative UI)

**ID:** story-137-mcp-apps-ui-resources
**Epic:** Epic E8 — MCP Server
**Depends on:** story-130-mcp-server-bootstrap (amended), story-300-tools-registry
**Estimate:** ~3h
**Status:** PENDING (NEW 2026-06-09)

---

## User story

**As a** Claude Desktop / ChatGPT / Goose / VS Code Insiders user with the mPilot MCP installed
**I want to** see mPilot proposal / tick / portfolio / reputation cards rendered as RICH INTERACTIVE UI inside my chat window (not just JSON)
**So that** I can approve / inspect / drill in without leaving the chat

---

## File modification map

- `packages/mcp/src/ui-resources/tick-card.html` — NEW — self-contained HTML w/ embedded JS reading `structuredContent` JSON from the MCP host
- `packages/mcp/src/ui-resources/proposal-card.html` — NEW — same shape; Approve/Reject buttons post bi-directionally back to MCP via `postMessage`
- `packages/mcp/src/ui-resources/portfolio-snapshot.html` — NEW — same shape
- `packages/mcp/src/ui-resources/reputation-receipt.html` — NEW — same shape (final state of a tick — ERC-8004 attestation visualizer)
- `packages/mcp/src/registerUIResources.ts` — NEW — `registerUIResources(server)` registers each ui:// resource via `server.registerResource(uri, ...)` per `@modelcontextprotocol/sdk@1.29` API
- `packages/mcp/src/server.ts` — UPDATE — after registering tools, call `registerUIResources(server)`. Each tool with `uiCardId` gets `_meta.ui.resourceUri` set to `ui://concierge/{uiCardId}` per SEP-1865
- `packages/mcp/src/__tests__/ui-resources.test.ts` — NEW — ≥ 6 cases verifying resource registration + tool `_meta.ui.resourceUri` shape

---

## Acceptance criteria (BDD)

```
Given `createConciergeMcpServer({ agent })` runs
When `server.listResources()` is called
Then 4 resources are listed: ui://concierge/tick-card, ui://concierge/proposal-card, ui://concierge/portfolio-snapshot, ui://concierge/reputation-receipt

Given `server.readResource('ui://concierge/proposal-card')` is called
When the response is inspected
Then the `contents` array has one entry with mimeType `text/html; profile=mcp-app` AND the text is valid HTML with an `<html>` root element AND embeds JS that listens for `postMessage` from the parent MCP host

Given a tool with `uiCardId: 'proposal'` is registered
When `server.listTools()` is called
Then that tool has `_meta.ui.resourceUri === 'ui://concierge/proposal-card'`

Given Claude Desktop receives the tool result + ui:// resource
When the user runs it (manually tested at integration time)
Then a sandboxed iframe renders showing the proposal card with Approve/Reject buttons

Given the proposal card's Approve button is clicked inside the iframe
When the user clicks
Then the iframe sends `postMessage({ type: 'concierge.approve', proposalId })` to the parent MCP host (verified via unit test mocking window.parent)

Given the HTML files are inspected
When axe-core runs against the rendered HTML
Then 0 critical accessibility violations

Given the HTML files
When checked for size
Then each is < 50KB (Workers iframe perf budget)

Given tests + build
When `pnpm --filter @mpilot/mcp test && pnpm --filter @mpilot/mcp build` runs
Then ≥ 6 cases pass; tarball includes ui-resources/*.html
```

---

## Shell verification

```bash
for f in tick-card proposal-card portfolio-snapshot reputation-receipt; do
  test -f packages/mcp/src/ui-resources/${f}.html || { echo "missing: $f"; exit 1; }
done

test -f packages/mcp/src/registerUIResources.ts

# HTML size budget
for f in packages/mcp/src/ui-resources/*.html; do
  size=$(wc -c < "$f")
  if [ "$size" -gt 51200 ]; then echo "too big: $f ($size bytes)"; exit 1; fi
done

# Profile MIME enforced
grep -q "text/html; profile=mcp-app" packages/mcp/src/registerUIResources.ts

# Anti-regression: NO external script src= (sandboxed iframes block them — must be inline)
! grep -rE '<script[^>]*src=' packages/mcp/src/ui-resources/

# Anti-regression: NO postMessage origin '*' (must validate parent origin per SEP-1865)
! grep -rE "postMessage\([^,]+,\s*['\"]\\*['\"]" packages/mcp/src/ui-resources/

pnpm --filter @mpilot/mcp test 2>&1 | grep -cE "(✓|PASS)" | awk '$1 >= 6 {exit 0} {exit 1}'
```

---

## Notes for coding agent

- **SEP-1865 (MCP Apps) merged 2026-01-28** — see AUDIT-2026-06-09 §3. Reference impl: `modelcontextprotocol/ext-apps`. Community SDK: `@mcp-ui/server@6.1.0` + `@mcp-ui/client@7.1.1` (audit-confirmed; both have NOASSERTION / Apache-2.0 license respectively).
- **Decision: use `@modelcontextprotocol/sdk@1.29` directly** (no `@mcp-ui/server` dep). The `registerResource` API is sufficient; adding `@mcp-ui/server` adds a stale-monitoring burden.
- **HTML files are SELF-CONTAINED.** Inline CSS, inline JS, NO external resources (iframes are sandboxed; external script src blocked). Total < 50KB each.
- **`postMessage` bi-directional protocol:**
  - From host → iframe: `{ type: 'concierge.data', payload: structuredContent }` on resource render
  - From iframe → host: `{ type: 'concierge.approve' | 'concierge.reject' | 'concierge.edit', payload: {...} }`
  - Iframe MUST validate `event.origin` matches the MCP host's expected origin (NEVER use `'*'`)
- **Draft spec caveat:** SEP-1865 is in `draft` MCP spec dir, NOT in `2025-11-25` stable. Host behavior will shift. Re-test against current Claude Desktop / ChatGPT / Goose at integration time.
- **Fallback:** the `structuredContent` JSON from the tool result is always available. If the host doesn't support MCP Apps, the LLM sees + summarizes structured JSON. No rail bets the wedge.
- Cross-ref: ADR-017 (Rail 2), AUDIT-2026-06-09 §3, research/concierge/SPEC-REWORK-BRIEF-2026-06-09.md Thread 5.
