import BP from './state.js';

export async function stShowHistoryModal() {
  const existing = document.querySelector('.bp-history-modal');
  if (existing) { existing.remove(); return; }

  const pipelineId   = BP.stairsCurrent?.id;
  const pipelineName = BP.stairsCurrent?.name || 'Pipeline';
  if (!pipelineId) return;

  const runs = await window.buildpipe.listRuns(pipelineId);

  const modal = document.createElement('div');
  modal.className = 'bp-history-modal';
  modal.innerHTML = `
    <div class="bp-modal-backdrop"></div>
    <div class="bp-modal-card bp-history-card">
      <div class="bp-modal-hdr">
        <div class="bp-modal-icon type-history">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="bp-modal-title">Run History <span class="bp-modal-subtitle">— ${pipelineName}</span></div>
        <button class="bp-modal-close">✕</button>
      </div>
      <div class="bp-modal-body bp-history-body">
        ${runs.length === 0 ? `<div class="bp-history-empty">No runs yet — hit ▶ Run to start.</div>` : `
        <div class="bp-history-list">
          ${runs.map(run => renderRunRow(run)).join('')}
        </div>`}
      </div>
    </div>`;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  const close = () => { modal.classList.remove('visible'); setTimeout(() => modal.remove(), 200); };
  modal.querySelector('.bp-modal-backdrop').addEventListener('click', close);
  modal.querySelector('.bp-modal-close').addEventListener('click', close);

  modal.querySelectorAll('.bp-history-row').forEach(row => {
    row.addEventListener('click', () => {
      const runId = row.dataset.runId;
      const run   = runs.find(r => r.id === runId);
      if (!run) return;
      const expanded = row.nextElementSibling;
      if (expanded?.classList.contains('bp-history-expanded')) {
        expanded.remove();
        row.classList.remove('open');
        return;
      }
      row.classList.add('open');
      const detail = document.createElement('div');
      detail.className = 'bp-history-expanded';
      detail.innerHTML = renderRunDetail(run);
      row.insertAdjacentElement('afterend', detail);
    });
  });
}

function statusIcon(s) {
  if (s === 'success') return '<span class="bp-run-dot ok"></span>';
  if (s === 'failed')  return '<span class="bp-run-dot err"></span>';
  return '<span class="bp-run-dot stopped"></span>';
}

function duration(run) {
  if (!run.startedAt || !run.endedAt) return '—';
  const ms = new Date(run.endedAt) - new Date(run.startedAt);
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function renderRunRow(run) {
  const d = new Date(run.startedAt);
  const ts = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  return `
    <div class="bp-history-row" data-run-id="${run.id}">
      ${statusIcon(run.status)}
      <span class="bp-run-time">${ts}</span>
      <span class="bp-run-status ${run.status}">${run.status}</span>
      <span class="bp-run-dur">${duration(run)}</span>
      <span class="bp-run-steps">${run.steps?.length || 0} step${run.steps?.length === 1 ? '' : 's'}</span>
      <span class="bp-run-chevron">›</span>
    </div>`;
}

function renderRunDetail(run) {
  const steps = run.steps || [];
  return `
    <div class="bp-history-steps">
      ${steps.map(s => `
        <div class="bp-history-step ${s.ok ? 'ok' : 'err'}">
          <div class="bp-hstep-header">
            <span class="bp-hstep-dot ${s.ok ? 'ok' : 'err'}"></span>
            <span class="bp-hstep-label">${s.label || s.type}</span>
            <span class="bp-hstep-type">${s.type?.toUpperCase()}</span>
            <span class="bp-hstep-dur">${s.duration ? s.duration + 's' : '—'}</span>
          </div>
          ${s.output ? `<pre class="bp-hstep-output">${s.output.slice(0, 500)}</pre>` : ''}
        </div>`).join('')}
    </div>`;
}
