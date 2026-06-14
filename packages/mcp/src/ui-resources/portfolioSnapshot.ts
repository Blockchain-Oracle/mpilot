/**
 * MCP UI Resource — Concierge portfolio snapshot.
 *
 * Self-contained HTML (inline CSS + JS, no external src) bundled as a TS
 * string export so the same bytes serve from the Node stdio bin AND the
 * Cloudflare Worker (no fs.readFile available in Workers).
 *
 * Source: designer's prototype at `/Users/abu/Downloads/mentale (2)/concierge/mcp/portfolio-snapshot.html`.
 * Spec: `docs/FRONTEND-BRIEF-ADDENDUM-MCP-CARDS.md` §5.
 * Wire protocol: SEP-1865 (MCP Apps). Listens for `concierge.data`; read-only (no postback).
 *
 * Spec-drift acknowledgement: the story-137 file mod map listed this as a
 * `.html` file under `ui-resources/`. We store as `.ts` template literal
 * for Cloudflare Workers portability (Workers have no filesystem) per ADR-011.
 * Same self-contained HTML semantics; only the on-disk extension changes.
 */
import type { ConciergeUiResource } from './_shared.ts';

const PORTFOLIO_SNAPSHOT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;" />
<title>Concierge — Portfolio</title>
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
  .mark{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;flex:none;color:#fff;font-family:var(--mono);font-size:9px;font-weight:700;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
  .sym{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:550}
  .val{font-size:13px;color:var(--fg);text-align:right;font-variant-numeric:tabular-nums;word-break:break-word}
  .val .bal{color:var(--muted);font-family:var(--mono);font-size:12px;margin-right:8px}
  .row.sum{border-top:2px solid var(--line)}
  .row.sum .label{font-size:12.5px;color:var(--muted)}
  .row.sum .val{font-size:14px;font-weight:650}
  .row.sum.good .val{color:var(--good)}
  .label{font-size:12.5px;color:var(--muted)}
  .empty{text-align:center;color:var(--muted);font-size:12.5px;padding:16px 8px}
</style>
</head>
<body>
<main role="region" aria-label="Concierge portfolio">
  <div class="card">
    <div class="hd">
      <div class="title"><span class="glyph"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><circle cx="12" cy="15" r="1.3" fill="#fff" stroke="none"/></svg></span><span id="title">Portfolio</span></div>
      <span class="eyebrow">Snapshot</span>
    </div>
    <div id="rows"><div class="empty">No portfolio data yet.</div></div>
  </div>
</main>
<script>
(function(){
  var cs = new URLSearchParams(location.search).get('cs');
  if(cs==='dark') document.documentElement.classList.add('cs-dark');
  if(cs==='light') document.documentElement.classList.add('cs-light');
  var MARK={ 'usdc':['#2775CA','US'],'susde':['#222','sU'],'usdy':['#1B4DFF','Od'],'meth':['#0EA3D6','mE'],'usdt':['#26A17B','Ut'] };
  var titleEl=document.getElementById('title'), rowsEl=document.getElementById('rows');
  var capturedOrigin=null;
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function mark(sym){ var m=MARK[(sym||'').toLowerCase()]||['#6f6a62',(sym||'?').slice(0,2)]; return '<span class="mark" role="img" aria-label="'+esc(sym)+'" style="background:'+m[0]+'">'+esc(m[1])+'</span>'; }
  function render(p){
    titleEl.textContent = p.title || 'Portfolio';
    var pos = Array.isArray(p.positions) ? p.positions : [];
    var html='';
    pos.forEach(function(r){
      var sym = r.symbol || r.asset || '?';
      var bal = (r.balance!=null ? r.balance : (r.amount!=null ? r.amount : ''));
      html += '<div class="row"><span class="sym">'+mark(sym)+esc(sym)+'</span><span class="val">'+(bal!==''?'<span class="bal">'+esc(bal)+'</span>':'')+(r.valueUsd!=null?'$'+esc(r.valueUsd):'')+'</span></div>';
    });
    if(p.totalUsd!=null) html += '<div class="row sum"><span class="label">total (USD)</span><span class="val">$'+esc(p.totalUsd)+'</span></div>';
    if(p.netApr!=null) html += '<div class="row sum good"><span class="label">net APR</span><span class="val">'+esc(p.netApr)+'%</span></div>';
    if(!html) html = '<div class="empty">No positions.</div>';
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

export const portfolioSnapshot: ConciergeUiResource = {
  uri: 'ui://concierge/portfolio-snapshot',
  name: 'portfolio-snapshot',
  title: 'Concierge portfolio snapshot',
  description: 'Per-position breakdown + total USD value + net APR for the connected agent.',
  html: PORTFOLIO_SNAPSHOT_HTML,
};
