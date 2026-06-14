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

import type { UICardId } from '@concierge-mantle/tools';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCP_APP_MIME } from './ui-resources/_shared.ts';
import { portfolioSnapshot } from './ui-resources/portfolioSnapshot.ts';
import { proposalCard } from './ui-resources/proposalCard.ts';
import { reputationReceipt } from './ui-resources/reputationReceipt.ts';
import { tickCard } from './ui-resources/tickCard.ts';

/** Public list of all registered ui:// resources, in registration order. */
export const UI_RESOURCES = [proposalCard, tickCard, portfolioSnapshot, reputationReceipt] as const;

/**
 * Map a tool's `uiCardId` (declared in its provider package via the
 * `tool()` factory) to the canonical `ui://concierge/*` resource URI.
 * Returns `undefined` for tools with no `uiCardId` — those render via
 * the structuredContent text channel only.
 */
const CARD_ID_TO_URI: Readonly<Record<UICardId, `ui://concierge/${string}`>> = {
  proposal: proposalCard.uri,
  tick: tickCard.uri,
  portfolio: portfolioSnapshot.uri,
  reputation: reputationReceipt.uri,
};

export function uiResourceUriForCardId(cardId: UICardId | undefined): string | undefined {
  return cardId !== undefined ? CARD_ID_TO_URI[cardId] : undefined;
}

/**
 * Register all four ui:// resources on the given McpServer. Idempotent in
 * practice — calling twice triggers the SDK's "already registered" guard.
 */
export function registerUIResources(server: McpServer): void {
  for (const r of UI_RESOURCES) {
    server.registerResource(
      r.name,
      r.uri,
      { title: r.title, description: r.description, mimeType: MCP_APP_MIME },
      async () => ({
        contents: [{ uri: r.uri, mimeType: MCP_APP_MIME, text: r.html }],
      }),
    );
  }
}
