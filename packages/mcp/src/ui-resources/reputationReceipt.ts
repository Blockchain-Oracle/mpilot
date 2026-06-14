/**
 * MCP UI Resource — Concierge reputation receipt.
 *
 * Self-contained HTML (inline CSS + JS, no external src) bundled as a TS
 * string export so the same bytes serve from the Node stdio bin AND the
 * Cloudflare Worker (no fs.readFile available in Workers).
 *
 * Source: designer's prototype at `/Users/abu/Downloads/mentale (2)/concierge/mcp/reputation-receipt.html`.
 * Spec: `docs/FRONTEND-BRIEF-ADDENDUM-MCP-CARDS.md` §6.
 * Wire protocol: SEP-1865 (MCP Apps). Listens for `concierge.data`; read-only (no postback).
 *
 * Spec-drift acknowledgement: the story-137 file mod map listed this as a
 * `.html` file under `ui-resources/`. We store as `.ts` template literal
 * for Cloudflare Workers portability (Workers have no filesystem) per ADR-011.
 * Same self-contained HTML semantics; only the on-disk extension changes.
 */
import type { ConciergeUiResource } from './_shared.ts';

const REPUTATION_RECEIPT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:;" />
<title>Concierge — Reputation receipt</title>
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
  .glyph{width:22px;height:22px;border-radius:6px;background:var(--good);display:grid;place-items:center;flex:none}
  .eyebrow{font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--good)}
  .row{display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:8px 0;border-top:1px solid var(--line)}
  .row:first-child{border-top:none}
  .label{font-size:12.5px;color:var(--muted);flex:none}
  .val{font-size:13px;color:var(--fg);text-align:right;font-variant-numeric:tabular-nums;word-break:break-word}
  .mono{font-family:var(--mono);font-size:12px;word-break:break-all;text-align:right;max-width:72%}
  .empty{text-align:center;color:var(--muted);font-size:12.5px;padding:16px 8px}
</style>
</head>
<body>
<main role="region" aria-label="Concierge reputation receipt">
  <div class="card">
    <div class="hd">
      <div class="title"><span class="glyph"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span id="title">Reputation receipt</span></div>
      <span class="eyebrow">ERC-8004</span>
    </div>
    <div id="rows"><div class="empty">No attestation data.</div></div>
  </div>
</main>
<script>
(function(){
  var cs = new URLSearchParams(location.search).get('cs');
  if(cs==='dark') document.documentElement.classList.add('cs-dark');
  if(cs==='light') document.documentElement.classList.add('cs-light');
  var titleEl=document.getElementById('title'), rowsEl=document.getElementById('rows');
  var capturedOrigin=null;
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  // field key, display label, aria label, mono?
  var FIELDS=[['agentId','agent','agent id',false],['feedbackIndex','feedback #','feedback index',false],['schema','schema','schema',true],['txHash','tx','transaction hash',true],['feedbackHash','dataHash','data hash',true],['cid','ipfs cid','i p f s content id',true],['attestedAt','attested','attested at',false]];
  function render(p){
    titleEl.textContent = p.title || 'Reputation receipt';
    var html='';
    FIELDS.forEach(function(f){
      var v = p[f[0]];
      if(v===undefined||v===null||v==='') return;
      html += '<div class="row" aria-label="'+esc(f[2])+'"><span class="label">'+esc(f[1])+'</span><span class="'+(f[3]?'mono':'val')+'">'+esc(String(v))+'</span></div>';
    });
    rowsEl.innerHTML = html || '<div class="empty">No attestation data.</div>';
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

export const reputationReceipt: ConciergeUiResource = {
  uri: 'ui://concierge/reputation-receipt',
  name: 'reputation-receipt',
  title: 'Concierge reputation receipt',
  description: 'On-chain ERC-8004 attestation receipt — tx, dataHash, IPFS CID, schema.',
  html: REPUTATION_RECEIPT_HTML,
};
