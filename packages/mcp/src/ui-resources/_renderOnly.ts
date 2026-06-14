/**
 * Shared HTML template for the THREE read-only cards (tick / portfolio /
 * reputation). Same SEP-1865 origin-validation discipline as proposalCard
 * but no postMessage-back protocol — these only render structuredContent.
 * The card-specific bits (title, field projection) are injected via the
 * `cardTitle` + `fieldRenderer` parameters baked into the inline JS at
 * build time (TS template substitution).
 */

interface RenderOnlyCardSpec {
  /** Inside the `<h1>` placeholder until data arrives. */
  readonly defaultTitle: string;
  /**
   * Inline JS snippet that takes the data object and returns an HTML
   * string. Substituted into the IIFE; must be self-contained, ASCII-safe,
   * and reference no outer scope beyond `data` and `esc`.
   */
  readonly renderBody: string;
}

export function buildReadOnlyCardHtml(spec: RenderOnlyCardSpec): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${spec.defaultTitle}</title>
<style>
  :root { color-scheme: light dark; --bg: #fff; --fg: #111; --muted: #555; --accent: #2563eb; --border: #e5e7eb; --good: #16a34a; --bad: #dc2626; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0a0a0a; --fg: #f5f5f5; --muted: #9ca3af; --accent: #60a5fa; --border: #262626; --good: #4ade80; --bad: #f87171; } }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--fg); }
  .card { padding: 16px; max-width: 640px; margin: 0 auto; }
  h1 { font-size: 16px; margin: 0 0 12px; font-weight: 600; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .row:last-of-type { border-bottom: 0; }
  .label { color: var(--muted); }
  .val { font-variant-numeric: tabular-nums; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; }
  .pill.good { background: rgba(22, 163, 74, 0.12); color: var(--good); }
  .pill.bad { background: rgba(220, 38, 38, 0.12); color: var(--bad); }
  .pill.muted { background: rgba(0,0,0,0.06); color: var(--muted); }
  @media (prefers-color-scheme: dark) { .pill.muted { background: rgba(255,255,255,0.08); } }
  .empty { color: var(--muted); font-size: 13px; padding: 20px 0; text-align: center; }
  .mono { font-family: ui-monospace, monospace; font-size: 11px; color: var(--muted); word-break: break-all; }
</style>
</head>
<body>
<main class="card" role="region" aria-label="${spec.defaultTitle}">
  <h1 id="title">${spec.defaultTitle}</h1>
  <div id="body" class="empty">No data received yet.</div>
</main>
<script>
(function () {
  'use strict';
  var parentOrigin = null;
  var titleEl = document.getElementById('title');
  var bodyEl = document.getElementById('body');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function renderBody(data) {
    ${spec.renderBody}
  }

  function render(data) {
    if (!data || typeof data !== 'object') {
      bodyEl.className = 'empty';
      bodyEl.textContent = 'No data.';
      return;
    }
    if (data.title) titleEl.textContent = data.title;
    bodyEl.className = '';
    bodyEl.innerHTML = renderBody(data) || '<div class="empty">No fields to display.</div>';
  }

  window.addEventListener('message', function (ev) {
    if (!parentOrigin) parentOrigin = ev.origin;
    if (ev.origin !== parentOrigin) return;
    var msg = ev.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'concierge.data') render(msg.payload);
  });
})();
</script>
</body>
</html>`;
}
