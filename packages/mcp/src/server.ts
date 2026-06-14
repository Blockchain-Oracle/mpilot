import { bigintSafeStringify, type ConciergeTool } from '@concierge-mantle/tools';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const SERVER_INFO = { name: 'concierge-mcp', version: '0.0.0' } as const;
const SANITIZE_ERR_MSG_MAX = 512;

export interface CreateConciergeMcpServerOpts {
  readonly tools: ReadonlyArray<ConciergeTool>;
  readonly info?: { readonly name: string; readonly version: string };
  /** Observability for tool failures. Defaults to a stderr writer. */
  readonly onToolError?: (info: { readonly toolName: string; readonly error: unknown }) => void;
  /** Round-2: empty-toolset warning callback. Defaults to stderr so the Worker
   *  (story-133) gets the same warning as the stdio bin. Pass `() => {}` to suppress. */
  readonly onEmptyToolset?: () => void;
}

/** ADR-011 amended factory. Stdio + streamable-http share this. */
export function createConciergeMcpServer(opts: CreateConciergeMcpServerOpts): McpServer {
  const info = opts.info ?? SERVER_INFO;
  const onToolError = opts.onToolError ?? defaultOnToolError;
  const onEmptyToolset = opts.onEmptyToolset ?? defaultOnEmptyToolset;
  if (opts.tools.length === 0) onEmptyToolset();
  const server = new McpServer(info);

  for (const tool of opts.tools) {
    const inputObject = assertZodObject(tool.inputSchema, tool.name, 'inputSchema');
    const outputObject = assertZodObject(tool.outputSchema, tool.name, 'outputSchema');

    // Context7 audit M3 (2026-06-14): forward title + annotations to the MCP
    // SDK's registerTool. MCP clients (Claude Desktop, Inspector, etc.) read
    // annotations.readOnlyHint/idempotentHint/openWorldHint to render the right
    // confirmation UX — without these, read-only tools get the same "destructive"
    // gate as write tools.
    const registration: {
      title?: string;
      description: string;
      inputSchema: z.ZodRawShape;
      outputSchema: z.ZodRawShape;
      annotations?: Record<string, unknown>;
    } = {
      description: tool.description,
      inputSchema: inputObject.shape,
      outputSchema: outputObject.shape,
    };
    if (tool.title !== undefined) registration.title = tool.title;
    if (tool.annotations !== undefined) {
      registration.annotations = { ...tool.annotations };
    }

    server.registerTool(tool.name, registration, async (args: unknown) => {
      try {
        // SDK pre-validates the FULL zod schema (shape + refinements) before
        // this handler runs. Invalid inputs surface as -32602; never reach here.
        const rawResult = await tool.invoke(args as never);
        const result = scrubPrototypePollution(rawResult);
        const text = bigintSafeStringify(result);
        return {
          content: [{ type: 'text', text }],
          structuredContent: result as Record<string, unknown>,
        };
      } catch (err) {
        onToolError({ toolName: tool.name, error: err });
        const message =
          err instanceof Error ? sanitizeErrMessage(err.message) : 'tool execution failed';
        // Context7 audit M4 (2026-06-14): include structured error code in the
        // tool-result `_meta` block so MCP clients can branch on the typed
        // ConciergeError code (ConfigError, RpcError, AttestationFailed, …)
        // without parsing the human message string.
        const code = extractErrorCode(err);
        return {
          content: [{ type: 'text', text: `Tool '${tool.name}' failed: ${message}` }],
          isError: true,
          _meta: code !== undefined ? { code } : undefined,
        };
      }
    });
  }

  return server;
}

function assertZodObject(
  schema: z.ZodTypeAny,
  toolName: string,
  field: 'inputSchema' | 'outputSchema',
): z.ZodObject<z.ZodRawShape> {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error(
      `[@concierge-mantle/mcp] tool '${toolName}' ${field} must be a z.ZodObject (MCP registerTool requires shape).`,
    );
  }
  return schema as z.ZodObject<z.ZodRawShape>;
}

/**
 * Round-2 CWE-1321: scrub prototype-pollution keys from JSON.parse-shaped
 * payloads (the actual wire-format attack vector). Guards against
 * Date/Map/Set/typed-array corruption — those have no own enumerable keys
 * and would be silently flattened to `{}` by Object.entries walk.
 * `constructor` is dropped ONLY when its value is an object (i.e. the
 * `{constructor:{prototype:{polluted:true}}}` shape), preserving legit data
 * fields literally named `constructor`.
 */
function scrubPrototypePollution<T>(value: T): T {
  return walk(value) as T;
}

function walk(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  // Round-2: preserve non-plain objects. Object.entries({Date|Map|Set|TypedArray})
  // returns [] for built-ins, so without these guards the values would silently
  // become {} — corrupting timestamps (Aave/Ondo), calldata (Uint8Array), etc.
  if (
    node instanceof Date ||
    node instanceof Map ||
    node instanceof Set ||
    node instanceof RegExp ||
    ArrayBuffer.isView(node) ||
    node instanceof ArrayBuffer
  ) {
    return node;
  }
  if (Array.isArray(node)) return node.map(walk);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === '__proto__' || k === 'prototype') continue;
    // Narrow `constructor` skip to object-value only — preserves data fields
    // named 'constructor' (ABI fragments, OpenAPI mirrors of Solidity terms).
    if (k === 'constructor' && v !== null && typeof v === 'object') continue;
    out[k] = walk(v);
  }
  return out;
}

/** Context7 audit M4: pull `.type`/`.code` off ConciergeError-shaped errors for `_meta.code`. */
function extractErrorCode(err: unknown): string | undefined {
  if (err === null || typeof err !== 'object') return undefined;
  const e = err as { type?: unknown; code?: unknown };
  if (typeof e.type === 'string' && e.type.length > 0) return e.type;
  if (typeof e.code === 'string' && e.code.length > 0) return e.code;
  return undefined;
}

/** Round-2: cap restricted to error messages (was truncating success text). */
function sanitizeErrMessage(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: CWE-117 mitigation
  return s.slice(0, SANITIZE_ERR_MSG_MAX).replace(/[\u0000-\u001f\u007f]/g, '?');
}

function sanitizeForStderr(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: CWE-117 log injection mitigation
  return s.replace(/[\u0000-\u001f\u007f]/g, '?');
}

function defaultOnToolError(info: { readonly toolName: string; readonly error: unknown }): void {
  // Round-2 CWE-117: sanitize name/message/stack BEFORE writing to stderr so
  // attacker-controlled error content can't inject ANSI/CRLF into ops logs.
  const errLine =
    info.error instanceof Error
      ? `${sanitizeForStderr(info.error.name)}: ${sanitizeForStderr(info.error.message)}\n${sanitizeForStderr(info.error.stack ?? '')}`
      : sanitizeForStderr(String(info.error));
  const toolName = sanitizeForStderr(info.toolName);
  // Round-2 HIGH: wrap stderr.write in try/catch. EPIPE on a closed stderr
  // would otherwise propagate out of the tool handler, escape MCP's per-
  // request error envelope, and tear down the entire transport session.
  try {
    process.stderr.write(`[concierge-mcp] tool '${toolName}' failed: ${errLine}\n`);
  } catch {
    /* observability loss is acceptable; session death is not */
  }
}

function defaultOnEmptyToolset(): void {
  try {
    process.stderr.write(
      '[concierge-mcp] WARNING: starting with 0 tools registered. ' +
        'See the @concierge-mantle/agent integration story for the production toolset.\n',
    );
  } catch {
    /* same EPIPE-safe guard */
  }
}
