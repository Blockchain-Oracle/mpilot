import { buildReadOnlyCardHtml } from './_renderOnly.ts';
import type { ConciergeUiResource } from './_shared.ts';

const RENDER_BODY = `
    var rows = '';
    if (data.agentId != null) rows += '<div class="row"><span class="label">agent</span><span class="val">' + esc(data.agentId) + '</span></div>';
    if (data.feedbackIndex != null) rows += '<div class="row"><span class="label">feedback #</span><span class="val">' + esc(data.feedbackIndex) + '</span></div>';
    if (data.schema) rows += '<div class="row"><span class="label">schema</span><span class="val mono">' + esc(data.schema) + '</span></div>';
    if (data.txHash) rows += '<div class="row"><span class="label">tx</span><span class="val mono">' + esc(data.txHash) + '</span></div>';
    if (data.feedbackHash) rows += '<div class="row"><span class="label">dataHash</span><span class="val mono">' + esc(data.feedbackHash) + '</span></div>';
    if (data.cid) rows += '<div class="row"><span class="label">ipfs cid</span><span class="val mono">' + esc(data.cid) + '</span></div>';
    if (data.attestedAt) rows += '<div class="row"><span class="label">attested</span><span class="val">' + esc(data.attestedAt) + '</span></div>';
    return rows;
  `;

export const reputationReceipt: ConciergeUiResource = {
  uri: 'ui://concierge/reputation-receipt',
  name: 'reputation-receipt',
  title: 'Concierge reputation receipt',
  description: 'On-chain ERC-8004 attestation receipt — tx, dataHash, IPFS CID, schema.',
  html: buildReadOnlyCardHtml({ defaultTitle: 'Reputation receipt', renderBody: RENDER_BODY }),
};
