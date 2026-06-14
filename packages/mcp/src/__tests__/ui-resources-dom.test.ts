/**
 * @vitest-environment happy-dom
 *
 * DOM-side behavioural tests for the proposalCard iframe script (post-review
 * pr-test analyzer CRITICAL gap #1). Loads the inline `<script>` block into
 * happy-dom, dispatches MessageEvents that mimic the MCP host, and spies on
 * `window.parent.postMessage` to assert the approve/reject + origin-discipline
 * + null-origin lockout protocol.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proposalCard } from '../ui-resources/proposalCard.ts';

function loadHtmlAndScript(html: string): void {
  document.documentElement.innerHTML = html
    .replace(/^<!DOCTYPE html>/i, '')
    .replace(/<\/?html[^>]*>/gi, '');
  // Extract the LAST inline script (the IIFE) and execute it manually —
  // happy-dom parses <script> but does NOT auto-execute when set via
  // innerHTML, per the WHATWG spec.
  const scripts = Array.from(document.querySelectorAll('script'));
  const code = scripts[scripts.length - 1]?.textContent ?? '';
  // biome-ignore lint/security/noGlobalEval: deliberate — exercising the resource's own inline script as the iframe host would.
  new Function(code)();
}

function postFromParent(data: unknown, origin: string): void {
  // happy-dom's MessageEvent does NOT let us set `source` post-construction,
  // and the production code checks `ev.source === window.parent`. Inject by
  // dispatching the event with the source set in the init dict — happy-dom
  // accepts it via the standard MessageEventInit.
  const ev = new MessageEvent('message', { data, origin, source: window.parent });
  window.dispatchEvent(ev);
}

describe('proposalCard DOM behaviour (post-review pr-test gap)', () => {
  let parentPostSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    parentPostSpy = vi.fn();
    // Override window.parent.postMessage so we capture outbound traffic.
    Object.defineProperty(window.parent, 'postMessage', {
      configurable: true,
      writable: true,
      value: parentPostSpy,
    });
    loadHtmlAndScript(proposalCard.html);
  });

  afterEach(() => {
    document.documentElement.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders proposal fields when host posts concierge.data', () => {
    postFromParent(
      {
        type: 'concierge.data',
        payload: { title: 'Aave borrow', amount: '1000', proposalId: 'p-1' },
      },
      'https://host.example',
    );
    expect(document.getElementById('title')?.textContent).toBe('Aave borrow');
    expect(document.getElementById('body')?.innerHTML).toContain('amount');
    expect(document.getElementById('body')?.innerHTML).toContain('1000');
    expect((document.getElementById('actions') as HTMLDivElement).hidden).toBe(false);
  });

  it('clicking Approve posts concierge.approve back to the captured origin', () => {
    postFromParent(
      { type: 'concierge.data', payload: { proposalId: 'p-1' } },
      'https://host.example',
    );
    (document.getElementById('approve') as HTMLButtonElement).click();
    expect(parentPostSpy).toHaveBeenCalledWith(
      { type: 'concierge.approve', payload: { proposalId: 'p-1' } },
      'https://host.example',
    );
  });

  it('clicking Reject posts concierge.reject back to the captured origin', () => {
    postFromParent(
      { type: 'concierge.data', payload: { proposalId: 'p-2' } },
      'https://host.example',
    );
    (document.getElementById('reject') as HTMLButtonElement).click();
    expect(parentPostSpy).toHaveBeenCalledWith(
      { type: 'concierge.reject', payload: { proposalId: 'p-2' } },
      'https://host.example',
    );
  });

  it('SEP-1865 origin lock: a second message from a different origin is silently dropped', () => {
    postFromParent(
      { type: 'concierge.data', payload: { proposalId: 'p-3', title: 'First' } },
      'https://host.example',
    );
    postFromParent(
      { type: 'concierge.data', payload: { proposalId: 'evil', title: 'Hijack' } },
      'https://attacker.example',
    );
    expect(document.getElementById('title')?.textContent).toBe('First');
    (document.getElementById('approve') as HTMLButtonElement).click();
    // proposalId must still be the original; second message was rejected
    expect(parentPostSpy).toHaveBeenCalledWith(
      { type: 'concierge.approve', payload: { proposalId: 'p-3' } },
      'https://host.example',
    );
  });

  it('Approve clicked BEFORE any data arrives: nothing is posted', () => {
    (document.getElementById('approve') as HTMLButtonElement).click();
    expect(parentPostSpy).not.toHaveBeenCalled();
  });

  it("silent-failure C-NEW-2 fix: 'null' origin disables buttons + shows remediation hint", () => {
    postFromParent({ type: 'concierge.data', payload: { proposalId: 'p-x' } }, 'null');
    expect((document.getElementById('approve') as HTMLButtonElement).disabled).toBe(true);
    expect((document.getElementById('reject') as HTMLButtonElement).disabled).toBe(true);
    expect(document.getElementById('body')?.innerHTML).toContain(
      'does not support inline approval',
    );
  });

  it('structural origin gate: messages whose ev.source !== window.parent are ignored', () => {
    // Simulate a sibling iframe / popup window posting at us — different source object.
    const otherSource = { fake: 'source' } as unknown as MessageEventSource;
    const ev = new MessageEvent('message', {
      data: { type: 'concierge.data', payload: { proposalId: 'sneaky' } },
      origin: 'https://attacker.example',
      source: otherSource,
    });
    window.dispatchEvent(ev);
    expect(document.getElementById('title')?.textContent).toBe('Awaiting proposal…');
  });

  it('XSS-escape: <script> in payload field renders as escaped text, not as a script tag', () => {
    postFromParent(
      {
        type: 'concierge.data',
        payload: { proposalId: 'p-xss', evil: '<script>alert(1)</script>' },
      },
      'https://host.example',
    );
    const bodyHtml = document.getElementById('body')?.innerHTML ?? '';
    expect(bodyHtml).toContain('&lt;script&gt;');
    expect(bodyHtml).not.toMatch(/<script>alert\(1\)<\/script>/);
  });
});
