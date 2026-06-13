import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { markPrefixForCaching, markSystemForCaching, markToolsForCaching } from '../cache.ts';

type ContentBlock = Anthropic.TextBlockParam;
type Tool = Anthropic.Tool;

function txt(text: string): ContentBlock {
  return { type: 'text', text };
}

function tool(name: string): Tool {
  return {
    name,
    description: `tool ${name}`,
    input_schema: { type: 'object', properties: {} },
  };
}

describe('markSystemForCaching', () => {
  it('inserts cache_control: ephemeral on the LAST block only', () => {
    const blocks: ContentBlock[] = [txt('one'), txt('two'), txt('three')];
    const out = markSystemForCaching(blocks);
    expect(out[0]?.cache_control).toBeUndefined();
    expect(out[1]?.cache_control).toBeUndefined();
    expect(out[2]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('does NOT mutate the input (input survives untouched)', () => {
    const blocks: ContentBlock[] = [txt('one'), txt('two')];
    const out = markSystemForCaching(blocks);
    expect(out).not.toBe(blocks);
    expect(blocks[1]?.cache_control).toBeUndefined();
    // The cloned last block is a different object so mutating out doesn't leak.
    expect(out[1]).not.toBe(blocks[1]);
  });

  it('empty input → empty output + warn (likely caller bug)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = markSystemForCaching([]);
    expect(out).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('empty system array'));
    warnSpy.mockRestore();
  });
});

describe('markToolsForCaching', () => {
  it('marks the LAST tool only', () => {
    const tools: Tool[] = [tool('a'), tool('b'), tool('c')];
    const out = markToolsForCaching(tools);
    expect(out[0]?.cache_control).toBeUndefined();
    expect(out[1]?.cache_control).toBeUndefined();
    expect(out[2]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('empty input warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(markToolsForCaching([])).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('empty tools array'));
    warnSpy.mockRestore();
  });
});

describe('markPrefixForCaching', () => {
  it('marks BOTH system + tools when both present', () => {
    const system: ContentBlock[] = [txt('sys1'), txt('sys2')];
    const tools: Tool[] = [tool('a'), tool('b')];
    const out = markPrefixForCaching({ system, tools });
    expect(out.system?.[1]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(out.tools?.[1]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('does not mutate inputs (array reference AND block contents preserved)', () => {
    const system: ContentBlock[] = [txt('sys1')];
    const tools: Tool[] = [tool('a')];
    const out = markPrefixForCaching({ system, tools });
    expect(out.system).not.toBe(system);
    expect(out.tools).not.toBe(tools);
    expect(system[0]?.cache_control).toBeUndefined();
    expect(tools[0]?.cache_control).toBeUndefined();
  });

  it('drops empty arrays from the result (no `tools: []` leak)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = markPrefixForCaching({ system: [txt('s')], tools: [] });
    expect(out.system).toBeDefined();
    expect(out.tools).toBeUndefined();
    warnSpy.mockRestore();
  });

  it('returns {} for fully empty input', () => {
    expect(markPrefixForCaching({})).toEqual({});
  });
});
