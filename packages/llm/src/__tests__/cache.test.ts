import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
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
    markSystemForCaching(blocks);
    expect(blocks[0]?.cache_control).toBeUndefined();
    expect(blocks[1]?.cache_control).toBeUndefined();
    expect(blocks[2]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('no-op on empty array', () => {
    const blocks: ContentBlock[] = [];
    const result = markSystemForCaching(blocks);
    expect(result).toBe(blocks);
    expect(blocks).toHaveLength(0);
  });

  it('returns the same reference for fluent chaining', () => {
    const blocks: ContentBlock[] = [txt('x')];
    expect(markSystemForCaching(blocks)).toBe(blocks);
  });
});

describe('markToolsForCaching', () => {
  it('marks the LAST tool only', () => {
    const tools: Tool[] = [tool('a'), tool('b'), tool('c')];
    markToolsForCaching(tools);
    expect(tools[0]?.cache_control).toBeUndefined();
    expect(tools[1]?.cache_control).toBeUndefined();
    expect(tools[2]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('no-op on empty array', () => {
    const tools: Tool[] = [];
    expect(markToolsForCaching(tools)).toBe(tools);
  });
});

describe('markPrefixForCaching', () => {
  it('marks BOTH system + tools when present', () => {
    const system: ContentBlock[] = [txt('sys1'), txt('sys2')];
    const tools: Tool[] = [tool('a'), tool('b')];
    const out = markPrefixForCaching({ system, tools });
    expect(out.system?.[1]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(out.tools?.[1]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('does not mutate the inputs (returns shallow copies)', () => {
    const system: ContentBlock[] = [txt('sys1')];
    const tools: Tool[] = [tool('a')];
    const out = markPrefixForCaching({ system, tools });
    expect(out.system).not.toBe(system);
    expect(out.tools).not.toBe(tools);
    expect(system[0]?.cache_control).toBeUndefined();
    expect(tools[0]?.cache_control).toBeUndefined();
  });

  it('handles missing system / tools independently', () => {
    expect(markPrefixForCaching({})).toEqual({});
    const sysOnly = markPrefixForCaching({ system: [txt('s')] });
    expect(sysOnly.system?.[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(sysOnly.tools).toBeUndefined();
  });
});
