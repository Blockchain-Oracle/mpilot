/**
 * @vitest-environment happy-dom
 */

// Render via React.createElement to keep this file framework-only — no JSX
// transform required at test-time.
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BRANDS, BrandMark } from '../brandMarks.ts';

describe('BRANDS registry', () => {
  it('has every documented surface family (wallets / LLM / protocols / MCP hosts)', () => {
    const keys = Object.keys(BRANDS);
    // sentinel members from each family — locks the table-of-contents
    for (const sentinel of [
      'privy',
      'anthropic',
      'aave v3',
      'meth',
      'li.fi',
      'erc-8004',
      'claude code',
      'cursor',
      'codex',
    ]) {
      expect(keys).toContain(sentinel);
    }
  });

  it('every brand has a hex/oklch color + 2-char monogram', () => {
    for (const [name, brand] of Object.entries(BRANDS)) {
      expect(brand.color, name).toMatch(/^(#[0-9A-Fa-f]{3,8}|oklch|var\()/);
      expect(brand.text, name).toMatch(/^.{1,3}$/);
    }
  });
});

describe('<BrandMark>', () => {
  it('renders a known brand with its color + monogram', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(BrandMark, { name: 'Aave V3' }),
    );
    expect(html).toContain('Aa');
    expect(html).toContain('#B6509E');
    expect(html).toContain('aria-hidden');
  });

  it('case-insensitive lookup', () => {
    const upper = ReactDOMServer.renderToStaticMarkup(
      React.createElement(BrandMark, { name: 'CURSOR' }),
    );
    const lower = ReactDOMServer.renderToStaticMarkup(
      React.createElement(BrandMark, { name: 'cursor' }),
    );
    expect(upper).toBe(lower);
  });

  it('unknown name → ink-3 fallback with first-2-chars monogram (no layout break)', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(BrandMark, { name: 'UnknownProtocol' }),
    );
    expect(html).toContain('Un');
    expect(html).toContain('var(--ink-3)');
  });

  it('empty / nullish name → `??` placeholder', () => {
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(BrandMark, { name: '' }));
    expect(html).toContain('??');
  });

  it('respects size + radius props', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(BrandMark, { name: 'mantle', size: 40, radius: 8 }),
    );
    expect(html).toContain('width:40px');
    expect(html).toContain('height:40px');
    expect(html).toContain('border-radius:8px');
  });
});
