# @mpilot/mcp

Transport-agnostic MCP server for mPilot, per ADR-011 amended.

- **Default install path**: stdio bin — `npx -y @mpilot/mcp`.
- **Optional hosted variant**: Cloudflare Worker wrapping
  `createStreamableHttpHandler`. Lives in `apps/mcp/` (story-133).

## Install in your MCP client

All hosts below run the same stdio bin. Set `ANTHROPIC_API_KEY` (or any
supported provider — see "Environment" below) before launching the host.

### Claude Code

```bash
claude mcp add concierge -- npx -y @mpilot/mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "concierge": {
      "command": "npx",
      "args": ["-y", "@mpilot/mcp"],
      "env": { "ANTHROPIC_API_KEY": "sk-ant-..." }
    }
  }
}
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "concierge": {
      "command": "npx",
      "args": ["-y", "@mpilot/mcp"]
    }
  }
}
```

### Windsurf

Settings → MCP Servers → Add Server, command:
`npx -y @mpilot/mcp`.

### VS Code Copilot

`.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "concierge": { "command": "npx", "args": ["-y", "@mpilot/mcp"] }
  }
}
```

### Zed

`~/.config/zed/settings.json`:

```json
{
  "context_servers": {
    "concierge": {
      "command": { "path": "npx", "args": ["-y", "@mpilot/mcp"] }
    }
  }
}
```

### Cline

Cline settings → MCP Servers → add: command `npx`, args `-y @mpilot/mcp`.

### Goose

`~/.config/goose/config.yaml`:

```yaml
extensions:
  concierge:
    type: stdio
    cmd: npx
    args: [-y, '@mpilot/mcp']
```

### OpenCode

`~/.config/opencode/mcp.json`:

```json
{
  "mcpServers": {
    "concierge": { "command": "npx", "args": ["-y", "@mpilot/mcp"] }
  }
}
```

### Codex

`~/.codex/config.toml`:

```toml
[mcp_servers.concierge]
command = "npx"
args = ["-y", "@mpilot/mcp"]
```

## Environment

The bin requires one of the following BEFORE startup — without it, the
process exits with code 2 and a stderr message:

| Env                                | Purpose                              |
|------------------------------------|--------------------------------------|
| `ANTHROPIC_API_KEY`                | Default provider (per ADR-016).      |
| `OPENAI_API_KEY`                   | If `AI_MODEL="openai:..."`.          |
| `GOOGLE_GENERATIVE_AI_API_KEY`     | If `AI_MODEL="google:..."`.          |
| `XAI_API_KEY`                      | If `AI_MODEL="xai:..."`.             |
| `AI_MODEL` (optional)              | Override provider+model.             |
| `CONCIERGE_RPC_URL` (optional)     | Override the default Mantle RPC URL. |

## Wallet bootstrap

On first launch the bin auto-generates an ephemeral session key + RPC config
at `~/.concierge/config.json` (mode `0600`, parent dir `0700`). The
ephemeral key is **NOT bound to an on-chain agent** and can't move funds —
it's enough to satisfy the runtime "have a wallet" contract for read-only
tools. Real Mainnet session-key import (where you paste a key bound to
your on-chain agent) lands in story-138 via MCP Elicitation.

Existing config files are NEVER overwritten — if `~/.concierge/config.json`
exists with a malformed shape, the bin throws rather than silently
regenerating over a potentially imported real key.

## Stdio bin contract

- Stdout is RESERVED for MCP JSON-RPC. ALL logs go to stderr.
- Tools registered via `createConciergeMcpServer` MUST have `outputSchema`
  (ADR-014 / 017 — drives MCP `structuredContent` + React UI
  parse-then-render).
- Tool errors surface as JSON-RPC results with `isError: true` + a
  CWE-117-sanitized message; the server does NOT crash on tool failure.

## Library quickstart

```ts
import { createConciergeMcpServer } from '@mpilot/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = createConciergeMcpServer({ tools: /* @mpilot/tools */ [] });
await server.connect(new StdioServerTransport());
```
