/**
 * MCP UI Resource — Concierge proposal card.
 *
 * Self-contained HTML (inline CSS + JS, no external src) bundled as a TS
 * string export so the same bytes serve from the Node stdio bin AND the
 * Cloudflare Worker (no fs.readFile available in Workers).
 *
 * Source: designer's prototype at `/Users/abu/Downloads/mentale (2)/concierge/mcp/proposal-card.html`.
 * Spec: `docs/FRONTEND-BRIEF-ADDENDUM-MCP-CARDS.md` §3.
 * Wire protocol: SEP-1865 (MCP Apps). Listens for `concierge.data`; emits \`concierge.approve\` / \`concierge.reject\` on button click.
 *
 * Spec-drift acknowledgement: the story-137 file mod map listed this as a
 * `.html` file under `ui-resources/`. We store as `.ts` template literal
 * for Cloudflare Workers portability (Workers have no filesystem) per ADR-011.
 * Same self-contained HTML semantics; only the on-disk extension changes.
 */
import type { ConciergeUiResource } from './_shared.ts';

const PROPOSAL_CARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;" />
<title>Concierge — Proposal</title>
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
  :root.cs-dark, :root.cs-dark *{}
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
  main{display:block}
  .card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;max-width:760px}
  .hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
  .title{font-size:15px;font-weight:650;letter-spacing:-0.01em;display:flex;align-items:center;gap:9px}
  .glyph{width:22px;height:22px;border-radius:6px;background:var(--accent);display:grid;place-items:center;flex:none}
  .eyebrow{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted)}
  .row{display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:7px 0;border-top:1px solid var(--line)}
  .row:first-child{border-top:none}
  .label{font-size:12.5px;color:var(--muted);flex:none}
  .val{font-size:13px;color:var(--fg);text-align:right;font-variant-numeric:tabular-nums;word-break:break-word}
  .mono{font-family:var(--mono);font-size:12px;word-break:break-all;text-align:right}
  .empty{text-align:center;color:var(--muted);font-size:12.5px;padding:16px 8px}
  .actions{display:flex;gap:8px;margin-top:14px}
  button{font-family:inherit;font-size:13px;font-weight:600;padding:10px 14px;border-radius:var(--r-sm);border:1px solid var(--line);cursor:pointer;flex:1}
  button.primary{background:var(--accent);color:#fff;border-color:transparent}
  button.danger{background:transparent;color:var(--bad);border-color:var(--bad)}
  button:disabled{opacity:.5;cursor:not-allowed}
  button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .note{font-size:12px;color:var(--muted);margin-top:11px;padding:9px 11px;background:var(--accent-soft);border-radius:var(--r-sm);line-height:1.45}
  .note.warn{color:var(--warn);background:transparent;border:1px solid var(--warn)}
  .sent{font-family:var(--mono);font-size:11px;color:var(--good);margin-top:10px}
  @media (max-width:480px){ .actions{flex-direction:column-reverse} }
</style>
</head>
<body>
<main role="region" aria-label="Concierge proposal">
  <div class="card">
    <div class="hd">
      <div class="title"><span class="glyph"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><circle cx="12" cy="15" r="1.3" fill="#fff" stroke="none"/></svg></span><span id="title">Awaiting proposal…</span></div>
      <span class="eyebrow">Concierge</span>
    </div>
    <div id="rows"><div class="empty">No data received yet.</div></div>
    <div class="actions" id="actions" hidden>
      <button class="danger" id="reject" type="button" aria-label="Reject proposal">Reject</button>
      <button class="primary" id="approve" type="button" aria-label="Approve proposal">Approve</button>
    </div>
    <div id="status" role="status"></div>
  </div>
</main>
<script>
(function(){
  var cs = new URLSearchParams(location.search).get('cs');
  if(cs==='dark') document.documentElement.classList.add('cs-dark');
  if(cs==='light') document.documentElement.classList.add('cs-light');

  var titleEl=document.getElementById('title'), rowsEl=document.getElementById('rows'),
      actionsEl=document.getElementById('actions'), statusEl=document.getElementById('status'),
      approveBtn=document.getElementById('approve'), rejectBtn=document.getElementById('reject');
  var current=null, capturedOrigin=null;
  function nullOrigin(){ try{ return location.origin==='null'; }catch(e){ return true; } }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function label(k){ return k.replace(/([A-Z])/g,' $1').replace(/[_-]/g,' ').replace(/^./,function(c){return c.toUpperCase();}).trim(); }

  function render(p){
    titleEl.textContent = p.title || 'Proposal';
    var fields = (p.fields && typeof p.fields==='object') ? p.fields : null;
    var entries=[];
    if(fields){ for(var k in fields) entries.push([k, fields[k]]); }
    else { for(var k2 in p){ if(k2==='title'||k2==='proposalId'||k2==='fields') continue; var v=p[k2]; if(v===null||typeof v==='object') continue; entries.push([k2,v]); } }
    var html = entries.map(function(e){ return '<div class="row"><span class="label">'+esc(label(e[0]))+'</span><span class="val">'+esc(String(e[1]))+'</span></div>'; }).join('');
    if(p.proposalId) html += '<div class="row"><span class="label">Proposal</span><span class="mono">'+esc(p.proposalId)+'</span></div>';
    rowsEl.innerHTML = html || '<div class="empty">No fields.</div>';
    actionsEl.hidden = false;
    if(nullOrigin()){
      approveBtn.disabled=true; rejectBtn.disabled=true;
      statusEl.innerHTML = '<div class="note warn">This host does not support inline approval (sandboxed iframe without allow-same-origin). Approve from the chat surface instead.</div>';
    } else {
      approveBtn.disabled=false; rejectBtn.disabled=false; statusEl.innerHTML='';
    }
  }
  function send(type){
    if(!current || nullOrigin()) return;            // pre-data / null-origin click-guard
    try{ window.parent.postMessage({type:type, payload:{proposalId: current.proposalId}}, capturedOrigin||'*'); }catch(e){}
    approveBtn.disabled=true; rejectBtn.disabled=true;
    statusEl.innerHTML = '<div class="sent">'+(type==='concierge.approve'?'Approved · sent to host':'Rejected · sent to host')+'</div>';
  }
  approveBtn.addEventListener('click', function(){ send('concierge.approve'); });
  rejectBtn.addEventListener('click', function(){ send('concierge.reject'); });

  window.addEventListener('message', function(e){
    if(e.source !== window.parent) return;                 // structural identity
    if(capturedOrigin===null) capturedOrigin=e.origin;      // capture first origin
    else if(e.origin!==capturedOrigin) return;              // origin lock
    if(e.data && e.data.type==='concierge.data' && e.data.payload && typeof e.data.payload==='object'){
      current = e.data.payload; render(current);
    }
  });
})();
</script>
</body>
</html>
`;

export const proposalCard: ConciergeUiResource = {
  uri: 'ui://concierge/proposal-card',
  name: 'proposal-card',
  title: 'Concierge proposal card',
  description:
    'Rich UI for inspecting + approving/rejecting a Concierge proposal inline in the chat.',
  html: PROPOSAL_CARD_HTML,
};
