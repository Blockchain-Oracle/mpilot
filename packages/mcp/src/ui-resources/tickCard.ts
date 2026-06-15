import { buildReadOnlyCardHtml } from './_renderOnly.ts';
import type { ConciergeUiResource } from './_shared.ts';

// Renders the 6-phase tick state — plan/simulate/propose/execute/record +
// timing. Shape matches `SerializableTickCard` in @mpilot/tools.
const RENDER_BODY = `
    var rows = '';
    var phases = ['plan','simulate','propose','execute','record'];
    var status = data.status || {};
    phases.forEach(function (p) {
      var phaseStatus = status[p];
      var pill = phaseStatus === 'success' ? '<span class="pill good">' + esc(phaseStatus) + '</span>'
               : phaseStatus === 'error'   ? '<span class="pill bad">'  + esc(phaseStatus) + '</span>'
               : phaseStatus               ? '<span class="pill muted">' + esc(phaseStatus) + '</span>'
                                           : '<span class="pill muted">pending</span>';
      rows += '<div class="row"><span class="label">' + p + '</span><span class="val">' + pill + '</span></div>';
    });
    if (data.tickId) rows += '<div class="row"><span class="label">tick</span><span class="val mono">' + esc(data.tickId) + '</span></div>';
    if (data.startedAt) rows += '<div class="row"><span class="label">started</span><span class="val">' + esc(data.startedAt) + '</span></div>';
    if (data.completedAt) rows += '<div class="row"><span class="label">completed</span><span class="val">' + esc(data.completedAt) + '</span></div>';
    return rows;
  `;

export const tickCard: ConciergeUiResource = {
  uri: 'ui://concierge/tick-card',
  name: 'tick-card',
  title: 'Concierge tick card',
  description:
    'Live status of the 6-phase tick loop (plan → simulate → propose → execute → record).',
  html: buildReadOnlyCardHtml({ defaultTitle: 'Concierge tick', renderBody: RENDER_BODY }),
};
