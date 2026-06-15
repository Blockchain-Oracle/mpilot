/**
 * Workspace-wide invariant: no ConciergeTool input/output schema may use
 * `z.bigint()` or `z.coerce.bigint()`.
 *
 * JSON Schema has no bigint type. OpenAI strict-mode (and Anthropic, and
 * Gemini Pro) reject every tool call in a tool set that contains a bigint
 * field with "BigInt cannot be represented in JSON Schema". The
 * golden-path harness (examples/golden-path/) surfaced this 2026-06-15 —
 * NO unit test caught it because every other test mocks the tool-calling
 * layer entirely.
 *
 * Canonical pattern: decimal strings (`z.string().regex(/^\d+$/)`) for
 * uint256, signed-decimal for int128. Convert to bigint at the EVM
 * boundary inside the action's `invoke`. Research: industry standard
 * (Pydantic + Vercel AI SDK + OpenAI strict-mode all recommend this).
 *
 * This test scans every action file under packages/providers/ and fails
 * if any file imports zod and contains `z.bigint(` or `z.coerce.bigint(`.
 * Test files are excluded; comments mentioning bigint as documentation
 * are excluded by checking only lines that contain the literal call site.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..', '..');
const PROVIDERS_ROOT = join(REPO_ROOT, 'packages', 'providers');

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '__tests__') continue;
      out.push(...walk(p));
    } else if (p.endsWith('.ts')) {
      out.push(p);
    }
  }
  return out;
}

describe('ConciergeTool schemas — no bigint anywhere', () => {
  const files = walk(PROVIDERS_ROOT).filter((p) => p.includes('/actions/'));

  it('finds at least one action file (sanity)', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file.replace(REPO_ROOT + '/', '')} uses decimal strings instead of bigint`, () => {
      const text = readFileSync(file, 'utf8');
      // Match the call site, not a comment that says "bigint" in prose.
      // `z.bigint(` and `z.coerce.bigint(` are the only Zod call forms.
      const offenders = [...text.matchAll(/z\s*\.\s*(?:coerce\s*\.\s*)?bigint\s*\(/g)];
      if (offenders.length > 0) {
        // Build a helpful diagnostic showing the surrounding line.
        const lines = text.split('\n');
        const hits = offenders.map((m) => {
          const lineIdx = text.slice(0, m.index).split('\n').length - 1;
          return `  line ${lineIdx + 1}: ${lines[lineIdx]?.trim()}`;
        });
        throw new Error(
          `Forbidden bigint in tool schema. Use z.string().regex(/^\\d+$/) for uint256 and convert at the EVM boundary.\n${hits.join('\n')}`,
        );
      }
    });
  }
});
