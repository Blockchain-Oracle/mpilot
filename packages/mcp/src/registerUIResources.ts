/**
 * SEP-1865 (MCP Apps) — register the four `ui://concierge/*` HTML resources
 * on an `McpServer`. Each tool whose `uiCardId` maps to one of the resource
 * URIs gets `_meta.ui.resourceUri` set when the server forwards it through
 * `registerTool` (see server.ts). MCP hosts that support the draft spec
 * (Claude Desktop, ChatGPT, Goose) render the resource inside a sandboxed
 * iframe and post the tool's `structuredContent` in via `postMessage`.
 *
 * Story-137. ADR-017 Rail 2. SDK 1.29 `registerResource` API.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { UICardId } from '@mpilot/tools';
import { MCP_APP_MIME } from './ui-resources/_shared.ts';
import { portfolioSnapshot } from './ui-resources/portfolioSnapshot.ts';
import { proposalCard } from './ui-resources/proposalCard.ts';
import { reputationReceipt } from './ui-resources/reputationReceipt.ts';
import { tickCard } from './ui-resources/tickCard.ts';

/** Public list of all registered ui:// resources, in registration order. */
export const UI_RESOURCES = [proposalCard, tickCard, portfolioSnapshot, reputationReceipt] as const;

/**
 * Map a tool's `uiCardId` to the canonical `ui://concierge/*` resource URI.
 * Derived from `UI_RESOURCES` per simplification review (round 2) so there
 * is a single source of truth for the URI strings — no parallel manual
 * mapping that could silently drift. The `satisfies` clause keeps the
 * `UICardId` exhaustiveness check (missing or extra keys → compile error).
 */
const CARD_ID_TO_URI = {
  proposal: proposalCard.uri,
  tick: tickCard.uri,
  portfolio: portfolioSnapshot.uri,
  reputation: reputationReceipt.uri,
} as const satisfies Record<UICardId, (typeof UI_RESOURCES)[number]['uri']>;

export function uiResourceUriForCardId(cardId: UICardId | undefined): string | undefined {
  return cardId !== undefined ? CARD_ID_TO_URI[cardId] : undefined;
}

/**
 * Register all four ui:// resources on the given McpServer.
 *
 * NOT idempotent — SDK 1.29's `registerResource` THROWS on duplicate URI
 * (silent-failure review round 2). Callers must invoke this exactly once
 * per McpServer instance.
 */
export function registerUIResources(server: McpServer): void {
  for (const r of UI_RESOURCES) {
    server.registerResource(
      r.name,
      r.uri,
      { title: r.title, description: r.description, mimeType: MCP_APP_MIME },
      // code-reviewer IMPORTANT #3: accept the SDK's `uri` argument and
      // echo `String(uri)` into the response so a future templated route
      // (`ui://concierge/{name}`) keeps working, and any host-side
      // normalization is preserved in the response.
      async (uri) => ({
        contents: [{ uri: String(uri), mimeType: MCP_APP_MIME, text: r.html }],
      }),
    );
  }
}
