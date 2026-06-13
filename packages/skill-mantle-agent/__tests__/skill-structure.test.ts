import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readSkillMd(): string {
  return readFileSync(resolve(ROOT, 'SKILL.md'), 'utf-8');
}

function parseFrontmatter(md: string): Record<string, unknown> {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  if (match === null) throw new Error('SKILL.md missing YAML frontmatter');
  const fm = parseYaml(match[1] ?? '');
  if (fm === null || typeof fm !== 'object') throw new Error('frontmatter parsed as non-object');
  return fm as Record<string, unknown>;
}

describe('RealClaw skill folder structure', () => {
  it('has SKILL.md at the package root', () => {
    expect(existsSync(resolve(ROOT, 'SKILL.md'))).toBe(true);
  });

  it('has assets/ with placeholder icon + preview', () => {
    expect(statSync(resolve(ROOT, 'assets/icon.svg')).isFile()).toBe(true);
    expect(statSync(resolve(ROOT, 'assets/preview.png')).isFile()).toBe(true);
  });

  it('has scripts/install.sh that is executable', () => {
    const path = resolve(ROOT, 'scripts/install.sh');
    expect(statSync(path).isFile()).toBe(true);
    // chmod +x bit on the user-permission octet (POSIX-only check).
    if (process.platform !== 'win32') {
      expect((statSync(path).mode & 0o100) !== 0).toBe(true);
    }
  });

  it('has references/ with quickstart + configuration', () => {
    expect(statSync(resolve(ROOT, 'references/quickstart.md')).isFile()).toBe(true);
    expect(statSync(resolve(ROOT, 'references/configuration.md')).isFile()).toBe(true);
  });

  it('has .skillignore with development excludes', () => {
    const content = readFileSync(resolve(ROOT, '.skillignore'), 'utf-8');
    expect(content).toMatch(/\*\.test\.ts/);
    expect(content).toMatch(/__tests__/);
    expect(content).toMatch(/src\//);
  });
});

describe('SKILL.md frontmatter', () => {
  it('parses as YAML', () => {
    expect(() => parseFrontmatter(readSkillMd())).not.toThrow();
  });

  it('has all RealClaw-required top-level fields', () => {
    const fm = parseFrontmatter(readSkillMd());
    for (const k of ['name', 'description', 'version', 'tools', 'permissions']) {
      expect(fm).toHaveProperty(k);
      expect(fm[k]).not.toBeNull();
    }
  });

  it('version is semver-shaped', () => {
    const fm = parseFrontmatter(readSkillMd());
    expect(String(fm.version)).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('tools is an array listing the 6 MCP-exposed tools by name', () => {
    const fm = parseFrontmatter(readSkillMd());
    expect(Array.isArray(fm.tools)).toBe(true);
    const names = (fm.tools as Array<{ name: string }>).map((t) => t.name).sort();
    expect(names).toEqual([
      'get_agent_state',
      'get_attestation',
      'get_reputation',
      'pause_agent',
      'resume_agent',
      'revoke_session_key',
    ]);
  });

  it('permissions list matches the read:agent + write:agent OAuth scopes', () => {
    const fm = parseFrontmatter(readSkillMd());
    expect(fm.permissions).toEqual(['read:agent', 'write:agent']);
  });

  it('every tool declares a permission from the scopes list', () => {
    const fm = parseFrontmatter(readSkillMd());
    const scopes = new Set(fm.permissions as string[]);
    for (const t of fm.tools as Array<{ name: string; permission: string }>) {
      expect(scopes.has(t.permission)).toBe(true);
    }
  });
});

describe('Patron contamination guard (load-bearing per AUDIT-2026-06-04)', () => {
  it('SKILL.md description does NOT mention BNPL / Buy-Now-Pay-Later / yield spread wedge', () => {
    const md = readSkillMd();
    expect(md).not.toMatch(/BNPL/i);
    expect(md).not.toMatch(/Buy.?Now.?Pay.?Later/i);
    expect(md).not.toMatch(/yield.?spread.?wedge/i);
  });

  it('description positions Concierge correctly: autonomous DeFi agent + Mantle + action surface', () => {
    const fm = parseFrontmatter(readSkillMd());
    const desc = String(fm.description).toLowerCase();
    expect(desc).toContain('autonomous');
    expect(desc).toContain('mantle');
    // Action surface signals — at least 3 of the 7 protocols mentioned
    const protocols = ['aave', 'susde', 'usdy', 'meth', 'dex', 'bridg', 'erc-8004', 'ethena'];
    const mentioned = protocols.filter((p) => desc.includes(p));
    expect(mentioned.length).toBeGreaterThanOrEqual(3);
  });

  it('quickstart.md is free of Patron contamination', () => {
    const content = readFileSync(resolve(ROOT, 'references/quickstart.md'), 'utf-8');
    expect(content).not.toMatch(/BNPL|Buy.?Now.?Pay.?Later|yield.?spread.?wedge/i);
  });
});
