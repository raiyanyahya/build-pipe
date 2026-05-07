import { stEl, stUid, stFmt } from './utils.js';
import BP from './state.js';
import { stOpen } from './render.js';

export async function stRenderDashboard() {
  const canvasWrap = stEl('stCanvasWrap');
  const dash = stEl('stDashboard');
  const miniToolbar = stEl('stMiniToolbar');
  const addRow = stEl('stAddRow');
  const topRight = document.querySelector('.st-topbar-right');
  const nameInput = stEl('stName');
  const viewToggle = document.querySelector('.st-view-toggle');

  if (!dash) return;

  if (canvasWrap) canvasWrap.style.display = '';
  document.getElementById('stCanvas').style.display = 'none';
  if (miniToolbar) miniToolbar.style.display = 'none';
  if (addRow) addRow.style.display = 'none';
  dash.style.display = 'block';

  // Hide editor chrome
  if (topRight) topRight.style.display = 'none';
  if (nameInput) nameInput.style.display = 'none';
  if (viewToggle) viewToggle.style.display = 'none';

  const all = await window.buildpipe.listStaircases();
  const published = all.filter(s => s.status === 'published');
  const hadSomeRun = all.filter(s => s.lastRun);
  const totalRuns = all.reduce((sum, s) => sum + (s.runCount || 0), 0);
  const successRuns = all.reduce((sum, s) => sum + (s.successRuns || 0), 0);

  dash.innerHTML = `
    <div class="dash-hero">
      <div class="dash-welcome">
        <h1 class="dash-title">buildpipe</h1>
        <p class="dash-subtitle">${all.length ? `Your pipelines at a glance` : 'Welcome — build your first pipeline'}</p>
      </div>
      <div class="dash-quick-actions">
        <button id="dashNewBtn" class="dash-btn dash-btn-primary">+ New Pipeline</button>
        <button id="dashAiBuildBtn" class="dash-btn dash-btn-accent">✦ Build with AI</button>
      </div>
    </div>

    <div class="dash-body">
      <div class="dash-main">
        <div class="dash-section">
          <div class="dash-section-header">
            <h2 class="dash-section-title">${all.length ? `${all.length} Pipelines` : 'Pipelines'}</h2>
            <span class="dash-section-count">${published.length} published · ${all.length - published.length} drafts</span>
          </div>
          ${all.length ? `<div class="dash-card-grid">${all.map(s => `
            <div class="dash-card" data-id="${s.id}">
              <div class="dash-card-top">
                <div class="dash-card-name">${s.name || 'Untitled'}</div>
                <span class="dash-card-status ${s.status === 'published' ? 'published' : ''}">${s.status || 'draft'}</span>
              </div>
              <div class="dash-card-meta">
                <span class="dash-card-steps">${(s.steps || []).length} steps</span>
                ${s.lastRun ? `<span class="dash-card-lastrun">⏱ ${stFmt(s.lastRun)}</span>` : ''}
              </div>
              <div class="dash-card-types">
                ${(s.steps || []).slice(0, 4).map(st => {
                  const icons = { code: '⌨', ai: '✦', http: '↗', file: '📄' };
                  return `<span class="dash-card-type-icon type-${st.type}">${icons[st.type] || '?'}</span>`;
                }).join('')}
                ${(s.steps || []).length > 4 ? `<span class="dash-card-more">+${s.steps.length - 4}</span>` : ''}
              </div>
              <div class="dash-card-actions">
                <button class="dash-card-btn run" data-card-run="${s.id}" title="Run pipeline">▶</button>
                <button class="dash-card-btn edit" data-card-edit="${s.id}" title="Edit pipeline">✎</button>
              </div>
            </div>`).join('')}</div>`
        : `<div class="dash-empty">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.2">
              <polyline points="6,38 6,28 16,28 16,18 26,18 26,10 36,10 36,6"/>
              <polyline points="36,6 42,6 42,42 6,42"/>
            </svg>
            <p>Create your first pipeline to get started</p>
          </div>`}
        </div>

        ${all.length ? `
        <div class="dash-section">
          <div class="dash-section-header">
            <h2 class="dash-section-title">Recent Activity</h2>
          </div>
          <div class="dash-activity">
            ${all.filter(s => s.lastRun).sort((a, b) => (b.lastRun || '').localeCompare(a.lastRun || '')).slice(0, 8).map(s => `
              <div class="dash-activity-item">
                <span class="dash-activity-dot ${s.lastOk !== false ? 'ok' : 'err'}"></span>
                <span class="dash-activity-name">${s.name || 'Untitled'}</span>
                <span class="dash-activity-time">${stFmt(s.lastRun)}</span>
                <span class="dash-activity-dur">${s.lastDuration || '—'}</span>
              </div>`).join('')}
          </div>
        </div>` : ''}
      </div>

      <div class="dash-sidebar">
        <div class="dash-stat-card">
          <div class="dash-stat-value">${all.length}</div>
          <div class="dash-stat-label">Pipelines</div>
        </div>
        <div class="dash-stat-card">
          <div class="dash-stat-value">${published.length}</div>
          <div class="dash-stat-label">Published</div>
        </div>
        <div class="dash-stat-card">
          <div class="dash-stat-value">${totalRuns}</div>
          <div class="dash-stat-label">Total Runs</div>
        </div>
        <div class="dash-stat-card">
          <div class="dash-stat-value">${totalRuns ? Math.round(successRuns / Math.max(1, totalRuns) * 100) : '—'}%</div>
          <div class="dash-stat-label">Success Rate</div>
        </div>
      </div>
    </div>`;

  dash.querySelectorAll('.dash-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      const sc = all.find(s => s.id === card.dataset.id);
      if (sc) stOpen(sc);
    });
  });

  dash.querySelectorAll('[data-card-edit]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const sc = all.find(s => s.id === btn.dataset.cardEdit);
      if (sc) stOpen(sc);
    });
  });

  dash.querySelectorAll('[data-card-run]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const sc = all.find(s => s.id === btn.dataset.cardRun);
      if (sc) {
        stOpen(sc);
        setTimeout(async () => {
          const { stRun } = await import('./run.js');
          stRun();
        }, 300);
      }
    });
  });

  document.getElementById('dashNewBtn')?.addEventListener('click', () => {
    BP.stairsCurrent = {
      id: stUid(), name: 'Untitled', steps: [], status: 'draft',
      created: new Date().toISOString(), runCount: 0, successRuns: 0
    };
    BP.stairsOutputs = {};
    window.buildpipe.saveStaircase(BP.stairsCurrent).then(() => {
      const { stLoadAll } = import('./render.js');
      stLoadAll();
      showEditor();
    });
  });

  document.getElementById('dashAiBuildBtn')?.addEventListener('click', () => showEditor());
}

export function showEditor() {
  const dash = stEl('stDashboard');
  const canvas = document.getElementById('stCanvas');
  const miniToolbar = stEl('stMiniToolbar');
  const addRow = stEl('stAddRow');
  const topRight = document.querySelector('.st-topbar-right');
  const nameInput = stEl('stName');
  const viewToggle = document.querySelector('.st-view-toggle');

  if (dash) dash.style.display = 'none';
  if (canvas) canvas.style.display = '';
  if (addRow) addRow.style.display = '';
  if (topRight) topRight.style.display = '';
  if (nameInput) nameInput.style.display = '';
  if (viewToggle) viewToggle.style.display = '';

  const { stRenderCanvas } = import('./render.js');
  stRenderCanvas();
}

export function showDashboard() {
  const canvasWrap = stEl('stCanvasWrap');
  if (canvasWrap) canvasWrap.style.display = '';
  stRenderDashboard();
}
