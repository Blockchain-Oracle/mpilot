import { buildReadOnlyCardHtml } from './_renderOnly.ts';
import type { ConciergeUiResource } from './_shared.ts';

const RENDER_BODY = `
    var rows = '';
    if (Array.isArray(data.positions)) {
      data.positions.forEach(function (pos) {
        if (!pos || typeof pos !== 'object') return;
        var sym = pos.symbol || pos.asset || '?';
        var amt = pos.balance != null ? pos.balance : (pos.amount != null ? pos.amount : '');
        var usd = pos.valueUsd != null ? '$' + esc(pos.valueUsd) : '';
        rows += '<div class="row"><span class="label">' + esc(sym) + '</span><span class="val">' + esc(amt) + ' ' + usd + '</span></div>';
      });
    }
    if (data.totalUsd != null) rows += '<div class="row"><span class="label">total (USD)</span><span class="val">$' + esc(data.totalUsd) + '</span></div>';
    if (data.netApr != null) rows += '<div class="row"><span class="label">net APR</span><span class="val">' + esc(data.netApr) + '%</span></div>';
    return rows;
  `;

export const portfolioSnapshot: ConciergeUiResource = {
  uri: 'ui://concierge/portfolio-snapshot',
  name: 'portfolio-snapshot',
  title: 'Concierge portfolio snapshot',
  description: 'Per-position breakdown + total USD value + net APR for the connected agent.',
  html: buildReadOnlyCardHtml({ defaultTitle: 'Portfolio', renderBody: RENDER_BODY }),
};
