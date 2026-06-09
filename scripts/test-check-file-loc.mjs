#!/usr/bin/env node
// Smoke test for scripts/check-file-loc.mjs.
// Creates probes, asserts the script's exit code (and stderr where load-bearing),
// cleans up via try/finally. Pre-clean at top so a prior crashed run doesn't leak
// a 401-line probe into the apps/ tree and contaminate this run.
// Mirrors rapid-agents/scripts/test_check_max_lines.sh — every enforcement script gets a test.

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), '..');
const SCRIPT = resolve(REPO_ROOT, 'scripts/check-file-loc.mjs');

const PROBE_FAIL = resolve(REPO_ROOT, 'apps/_loc_probe_/probe.ts');
const PROBE_FAIL_DIR = dirname(PROBE_FAIL);
const PROBE_EXCLUDED = resolve(REPO_ROOT, 'packages/_loc_probe_/dist/big.ts');
const PROBE_EXCLUDED_DIR_TOP = resolve(REPO_ROOT, 'packages/_loc_probe_');

function content(lines) {
  const body = Array.from({ length: lines }, (_, i) => `export const x${i} = ${i};`).join('\n');
  return `${body}\n`;
}

function runScript(args = []) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

function assertExit(label, expected, actual) {
  const ok = actual === expected;
  const tag = ok
    ? `${label}: ${expected === 0 ? 'PASS' : 'FAIL'} (expected)`
    : `${label}: WRONG (got ${actual}, expected ${expected})`;
  console.log(tag);
  if (!ok) process.exitCode = 1;
  return ok;
}

function assertStderrContains(label, stderr, needle) {
  const ok = stderr.includes(needle);
  console.log(`${label}: stderr ${ok ? 'CONTAINS' : 'MISSING'} "${needle}"`);
  if (!ok) process.exitCode = 1;
  return ok;
}

function preClean() {
  rmSync(PROBE_FAIL, { force: true });
  rmSync(PROBE_FAIL_DIR, { recursive: true, force: true });
  rmSync(PROBE_EXCLUDED, { force: true });
  rmSync(PROBE_EXCLUDED_DIR_TOP, { recursive: true, force: true });
}

preClean();

try {
  // ── Probe 1: 401-line file under apps/ → script must exit 1 + stderr names file + "over by 1"
  mkdirSync(PROBE_FAIL_DIR, { recursive: true });
  writeFileSync(PROBE_FAIL, content(401), 'utf8');
  const r1 = runScript();
  assertExit('401-line', 1, r1.code);
  assertStderrContains('401-line', r1.stderr, 'apps/_loc_probe_/probe.ts');
  assertStderrContains('401-line', r1.stderr, 'over by 1');

  // ── Probe 2: 400-line file under apps/ → script must exit 0 ─────────────
  writeFileSync(PROBE_FAIL, content(400), 'utf8');
  const r2 = runScript();
  assertExit('400-line', 0, r2.code);

  // ── Probe 3: 401-line file under excluded dist/ → script must exit 0 ───
  rmSync(PROBE_FAIL, { force: true });
  rmSync(PROBE_FAIL_DIR, { recursive: true, force: true });
  mkdirSync(dirname(PROBE_EXCLUDED), { recursive: true });
  writeFileSync(PROBE_EXCLUDED, content(401), 'utf8');
  const r3 = runScript();
  assertExit('excluded-path', 0, r3.code);

  // ── Probe 4: unknown flag → script must exit 2 (no silent pass) ────────
  const r4 = runScript(['--bogus']);
  assertExit('unknown-flag', 2, r4.code);
  assertStderrContains('unknown-flag', r4.stderr, '--bogus');
} finally {
  preClean();
}

if (process.exitCode && process.exitCode !== 0) {
  console.error('smoke test FAILED');
  process.exit(process.exitCode);
}
console.log('smoke test PASSED');
