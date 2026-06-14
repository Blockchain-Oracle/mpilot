/**
 * Proposal card — ADR-017 Rail 2 (MCP Apps SEP-1865) HTML resource.
 *
 * Self-contained HTML (inline CSS + JS, no external src) bundled as a TS
 * string export so the same bytes serve from the Node stdio bin AND the
 * Cloudflare Worker (no fs.readFile available in Workers). Renders the
 * structuredContent JSON the MCP host posts in via postMessage, and emits
 * `concierge.approve` / `concierge.reject` back to the host on button click.
 *
 * Spec drift from story-137 file mod map: the story listed
 * `ui-resources/proposal-card.html`. We store as `.ts` template literal for
 * Cloudflare Workers portability (Workers have no filesystem) per ADR-011.
 * Same self-contained-HTML semantics; only the on-disk extension changes.
 */
import type { ConciergeUiResource } from './_shared.ts';

const PROPOSAL_CARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Concierge Proposal</title>
<style>
  :root { color-scheme: light dark; --bg: #fff; --fg: #111; --muted: #555; --accent: #2563eb; --danger: #dc2626; --border: #e5e7eb; }
  @media (prefers-color-scheme: dark) { :root { --bg: #0a0a0a; --fg: #f5f5f5; --muted: #9ca3af; --accent: #60a5fa; --danger: #f87171; --border: #262626; } }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--fg); }
  .card { padding: 16px; max-width: 640px; margin: 0 auto; }
  h1 { font-size: 16px; margin: 0 0 12px; font-weight: 600; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .row:last-of-type { border-bottom: 0; }
  .label { color: var(--muted); }
  .val { font-variant-numeric: tabular-nums; }
  .actions { display: flex; gap: 8px; margin-top: 16px; }
  button { flex: 1; padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--fg); font: inherit; font-weight: 500; cursor: pointer; }
  button.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
  button.danger { color: var(--danger); border-color: var(--danger); }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .empty { color: var(--muted); font-size: 13px; padding: 20px 0; text-align: center; }
  .proposal-id { font-family: ui-monospace, monospace; font-size: 11px; color: var(--muted); word-break: break-all; }
</style>
</head>
<body>
<main class="card" role="region" aria-label="Concierge proposal">
  <h1 id="title">Awaiting proposal…</h1>
  <div id="body" class="empty">No data received yet.</div>
  <div class="actions" id="actions" hidden>
    <button type="button" class="danger" id="reject" aria-label="Reject proposal">Reject</button>
    <button type="button" class="primary" id="approve" aria-label="Approve proposal">Approve</button>
  </div>
</main>
<script>
(function () {
  'use strict';
  var parentOrigin = null;
  var currentProposal = null;
  var titleEl = document.getElementById('title');
  var bodyEl = document.getElementById('body');
  var actionsEl = document.getElementById('actions');
  var approveBtn = document.getElementById('approve');
  var rejectBtn = document.getElementById('reject');

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function render(data) {
    if (!data || typeof data !== 'object') {
      bodyEl.className = 'empty';
      bodyEl.textContent = 'No proposal data.';
      actionsEl.hidden = true;
      return;
    }
    currentProposal = data;
    titleEl.textContent = data.title || 'Proposal';
    bodyEl.className = '';
    var rows = '';
    var fields = data.fields && typeof data.fields === 'object' ? data.fields : data;
    Object.keys(fields).forEach(function (k) {
      if (k === 'title' || k === 'proposalId' || k === 'fields') return;
      var v = fields[k];
      if (v === null || typeof v === 'object') return;
      rows += '<div class="row"><span class="label">' + esc(k) + '</span><span class="val">' + esc(v) + '</span></div>';
    });
    if (data.proposalId) {
      rows += '<div class="row"><span class="label">id</span><span class="val proposal-id">' + esc(data.proposalId) + '</span></div>';
    }
    bodyEl.innerHTML = rows || '<div class="empty">No fields to display.</div>';
    actionsEl.hidden = false;
  }

  function send(type) {
    if (!parentOrigin || parentOrigin === 'null') return; // host origin unknown — refuse
    if (!currentProposal) return;
    window.parent.postMessage({ type: type, payload: { proposalId: currentProposal.proposalId } }, parentOrigin);
  }

  approveBtn.addEventListener('click', function () { send('concierge.approve'); });
  rejectBtn.addEventListener('click', function () { send('concierge.reject'); });

  window.addEventListener('message', function (ev) {
    // SEP-1865 origin-validation discipline: capture the FIRST host origin and
    // reject any subsequent messages from a different origin (defends against
    // a sandboxed iframe being re-parented mid-session by a hostile script).
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

export const proposalCard: ConciergeUiResource = {
  uri: 'ui://concierge/proposal-card',
  name: 'proposal-card',
  title: 'Concierge proposal card',
  description:
    'Rich UI for inspecting + approving/rejecting a Concierge proposal inline in the chat.',
  html: PROPOSAL_CARD_HTML,
};
