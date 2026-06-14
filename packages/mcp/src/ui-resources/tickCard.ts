/**
 * MCP UI Resource — Concierge tick card.
 *
 * Self-contained HTML (inline CSS + JS, no external src) bundled as a TS
 * string export so the same bytes serve from the Node stdio bin AND the
 * Cloudflare Worker (no fs.readFile available in Workers).
 *
 * Source: designer's prototype at `/Users/abu/Downloads/mentale (2)/concierge/mcp/tick-card.html`.
 * Spec: `docs/FRONTEND-BRIEF-ADDENDUM-MCP-CARDS.md` §4.
 * Wire protocol: SEP-1865 (MCP Apps). Listens for `concierge.data`; read-only (no postback).
 *
 * Spec-drift acknowledgement: the story-137 file mod map listed this as a
 * `.html` file under `ui-resources/`. We store as `.ts` template literal
 * for Cloudflare Workers portability (Workers have no filesystem) per ADR-011.
 * Same self-contained HTML semantics; only the on-disk extension changes.
 */
import type { ConciergeUiResource } from './_shared.ts';

const TICK_CARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;" />
<title>Concierge — Tick</title>
<style>
  :root{
    color-scheme: light dark;
    --bg:#fbfbf8; --card:#ffffff; --fg:#2b2722; --muted:#6f6a62; --line:#e8e5de;
    --accent:#5046e5; --accent-soft:#5046e51a; --good:#2f9e6a; --good-soft:#2f9e6a1f;
    --bad:#d23a35; --bad-soft:#d23a351f; --warn:#bf8a2e;
    --r:12px; --r-sm:7px;
    --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    --mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  }
  :root.cs-dark{
    --bg:#1b1c23; --card:#23252e; --fg:#f3f2ee; --muted:#a7adbd; --line:#34363f;
    --accent:#8d8ff3; --accent-soft:#8d8ff326; --good:#5fd39b; --good-soft:#5fd39b26;
    --bad:#e8788f; --bad-soft:#e8788f26; --warn:#d6a85a;
  }
  @media (prefers-color-scheme: dark){
    :root:not(.cs-light){
      --bg:#1b1c23; --card:#23252e; --fg:#f3f2ee; --muted:#a7adbd; --line:#34363f;
      --accent:#8d8ff3; --accent-soft:#8d8ff326; --good:#5fd39b; --good-soft:#5fd39b26;
      --bad:#e8788f; --bad-soft:#e8788f26; --warn:#d6a85a;
    }
  }
  *{box-sizing:border-box}
  html,body{margin:0;background:transparent;color:var(--fg);font-family:var(--sans);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
  body{padding:2px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;max-width:760px}
  .hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
  .title{font-size:15px;font-weight:650;letter-spacing:-0.01em;display:flex;align-items:center;gap:9px}
  .glyph{width:22px;height:22px;border-radius:6px;background:var(--accent);display:grid;place-items:center;flex:none}
  .eyebrow{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted)}
  .row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:8px 0;border-top:1px solid var(--line)}
  .row:first-child{border-top:none}
  .label{font-size:13px;color:var(--fg);flex:none;text-transform:capitalize}
  .val{font-size:13px;color:var(--fg);text-align:right;font-variant-numeric:tabular-nums;word-break:break-word}
  .mono{font-family:var(--mono);font-size:12px;word-break:break-all;text-align:right;color:var(--muted)}
  .pill{font-family:var(--mono);font-size:11px;padding:3px 10px;border-radius:999px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
  .pill.good{color:var(--good);background:var(--good-soft);border-color:transparent}
  .pill.bad{color:var(--bad);background:var(--bad-soft);border-color:transparent}
  .pill.muted{color:var(--muted)}
  .empty{text-align:center;color:var(--muted);font-size:12.5px;padding:16px 8px}
</style>
</head>
<body>
<main role="region" aria-label="Concierge tick">
  <div class="card">
    <div class="hd">
      <div class="title"><span class="glyph"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><circle cx="12" cy="15" r="1.3" fill="#fff" stroke="none"/></svg></span><span id="title">Concierge tick</span></div>
      <span class="eyebrow">Snapshot</span>
    </div>
    <div id="rows"><div class="empty">No tick data yet.</div></div>
  </div>
</main>
<script>
(function(){
  var cs = new URLSearchParams(location.search).get('cs');
  if(cs==='dark') document.documentElement.classList.add('cs-dark');
  if(cs==='light') document.documentElement.classList.add('cs-light');
  var PHASES=['plan','simulate','propose','execute','record'];
  var titleEl=document.getElementById('title'), rowsEl=document.getElementById('rows');
  var capturedOrigin=null;
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function pill(v){
    if(v==='success') return '<span class="pill good">success</span>';
    if(v==='error') return '<span class="pill bad">error</span>';
    if(v===undefined||v===null||v==='pending') return '<span class="pill muted">pending</span>';
    return '<span class="pill muted">'+esc(String(v))+'</span>';
  }
  function render(p){
    titleEl.textContent = p.title || 'Concierge tick';
    var st = (p.status && typeof p.status==='object') ? p.status : {};
    var html = PHASES.map(function(ph){ return '<div class="row"><span class="label">'+ph+'</span>'+pill(st[ph])+'</div>'; }).join('');
    if(p.tickId) html += '<div class="row"><span class="label">tick id</span><span class="mono">'+esc(p.tickId)+'</span></div>';
    if(p.startedAt) html += '<div class="row"><span class="label">started</span><span class="mono">'+esc(p.startedAt)+'</span></div>';
    if(p.completedAt) html += '<div class="row"><span class="label">completed</span><span class="mono">'+esc(p.completedAt)+'</span></div>';
    rowsEl.innerHTML = html;
  }
  window.addEventListener('message', function(e){
    if(e.source!==window.parent) return;
    if(capturedOrigin===null) capturedOrigin=e.origin; else if(e.origin!==capturedOrigin) return;
    if(e.data && e.data.type==='concierge.data' && e.data.payload && typeof e.data.payload==='object') render(e.data.payload);
  });
})();
</script>
</body>
</html>
`;

export const tickCard: ConciergeUiResource = {
  uri: 'ui://concierge/tick-card',
  name: 'tick-card',
  title: 'Concierge tick card',
  description:
    'Live status of the 6-phase tick loop (plan → simulate → propose → execute → record).',
  html: TICK_CARD_HTML,
};
