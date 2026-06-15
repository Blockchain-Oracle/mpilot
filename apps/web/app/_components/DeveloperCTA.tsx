/**
 * Developer CTA — pitches the SDK + MCP install to the technical audience.
 * Used between HowItWorks and the footer.
 */
import Link from 'next/link';

export function DeveloperCTA() {
  return (
    <section
      id="dev"
      style={{
        padding: '72px 28px',
        borderTop: '1px solid var(--line)',
      }}
    >
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
        <span className="ds-eyebrow">For developers</span>
        <h2 className="ds-h-sec" style={{ marginTop: 12, marginBottom: 16 }}>
          Bring mPilot into your IDE
        </h2>
        <p className="ds-lede" style={{ marginBottom: 32, maxWidth: 720, color: 'var(--ink-2)' }}>
          Install the MCP server in Claude Code, Claude Desktop, Cursor, Windsurf, VS Code Copilot,
          Zed, Cline, Goose, OpenCode, or Codex — your assistant can talk to your agent from any of
          them.
        </p>
        <div
          className="card"
          style={{
            padding: '20px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 22,
            flexWrap: 'wrap',
            background: 'var(--paper-2)',
          }}
        >
          <code
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.9rem',
              color: 'var(--ink)',
              wordBreak: 'break-all',
            }}
          >
            claude mcp add concierge -- npx @mpilot/mcp
          </code>
          <Link href="/docs/mcp" className="btn btn-primary btn-sm">
            All 10 hosts →
          </Link>
        </div>
      </div>
    </section>
  );
}
