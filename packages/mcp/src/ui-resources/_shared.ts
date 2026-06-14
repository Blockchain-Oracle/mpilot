// Shared shape for the four ui:// HTML resources. Each card module exports
// the same `{ uri, name, title, description, html }` tuple so
// `registerUIResources(server)` can iterate without per-card branching.

export interface ConciergeUiResource {
  readonly uri: `ui://concierge/${string}`;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  /** Self-contained HTML (inline CSS + JS, no external src). Capped 50KB. */
  readonly html: string;
}

/** SEP-1865 MIME for MCP App HTML resources. */
export const MCP_APP_MIME = 'text/html; profile=mcp-app' as const;

/** Per ADR-017 size budget; Workers iframe perf. */
export const UI_HTML_MAX_BYTES = 50 * 1024;
