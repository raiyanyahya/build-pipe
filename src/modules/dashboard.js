import { stEl, stUid, stFmt } from './utils.js';
import BP from './state.js';

async function openPipeline(sc) {
  const { stOpen } = await import('./render.js');
  stOpen(sc);
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

function getAddRow() { return document.querySelector('.st-add-row'); }
function getTopbar()  { return document.querySelector('.st-topbar'); }

// ─── Show / hide the pipeline editor ─────────────────────────────────────────

export function showEditor() {
  const dash   = stEl('stDashboard');
  const canvas = document.getElementById('stCanvas');
  const topbar = getTopbar();
  const addRow = getAddRow();

  if (dash)   dash.style.display   = 'none';
  if (canvas) canvas.style.display = '';
  if (topbar) topbar.style.display = '';
  if (addRow) addRow.style.display = '';
  // NOTE: callers are responsible for calling stRenderCanvas after this
}

export function showDashboard() {
  stRenderDashboard();
}

// ─── Dashboard render ─────────────────────────────────────────────────────────

export async function stRenderDashboard() {
  const canvasWrap = stEl('stCanvasWrap');
  const dash       = stEl('stDashboard');
  const topbar     = getTopbar();
  const addRow     = getAddRow();

  if (!dash) return;

  // show dashboard, hide canvas + editor chrome
  if (canvasWrap) canvasWrap.style.display = '';
  document.getElementById('stCanvas').style.display = 'none';
  const miniToolbar = stEl('stMiniToolbar');
  if (miniToolbar) miniToolbar.style.display = 'none';
  dash.style.display = 'block';
  if (topbar) topbar.style.display = 'none';
  if (addRow) addRow.style.display = 'none';

  const all          = await window.buildpipe.listStaircases();
  const model        = await window.buildpipe.getModelSetting();
  const aiProvider   = model && /^claude-/.test(model) ? 'anthropic' : 'openai';
  const hasKey       = await window.buildpipe.hasKey(aiProvider);
  const modelLabel   = model || (aiProvider === 'openai' ? 'gpt-4o-mini' : 'claude-sonnet-4-6');
  const published    = all.filter(s => s.status === 'published');
  const drafts       = all.length - published.length;
  const totalRuns    = all.reduce((sum, s) => sum + (s.runCount   || 0), 0);
  const successRuns  = all.reduce((sum, s) => sum + (s.successRuns || 0), 0);
  const successRate  = totalRuns ? Math.round(successRuns / Math.max(1, totalRuns) * 100) : null;
  const recent       = all.filter(s => s.lastRun)
                          .sort((a, b) => (b.lastRun || '').localeCompare(a.lastRun || ''));

  const typeIcon = t => ({
    code: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    ai:   `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/></svg>`,
    http: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
    file: `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`,
  })[t] || '';

  const h = new Date().getHours();
  const greeting = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  dash.innerHTML = `
    <div class="dash-shell">
      <!-- Hero -->
      <header class="dash-hero">
        <div class="dash-hero-left">
          <div class="dash-eyebrow">${greeting}</div>
          <p class="dash-subtitle">${all.length
            ? `${all.length} pipeline${all.length === 1 ? '' : 's'} — ${published.length} published, ${drafts} draft${drafts === 1 ? '' : 's'}`
            : 'Build your first pipeline to get started.'
          }</p>
        </div>
        <div class="dash-quick-actions">
          <div class="dash-model-pill ${hasKey ? 'active' : 'inactive'}" id="dashModelPill" title="${hasKey ? `${aiProvider} key active` : 'No API key — open Settings'}">
            <span class="dash-model-dot"></span>
            <span class="dash-model-name">${modelLabel}</span>
          </div>
          <button id="dashSettingsBtn" class="dash-icon-btn" title="Settings">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button id="dashAiBuildBtn" class="dash-btn dash-btn-accent">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5L19 10l-5.2 2L12 17l-1.8-5L5 10l5.2-2z"/></svg>
            Build with AI
          </button>
          <button id="dashNewBtn" class="dash-btn dash-btn-primary">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            New Pipeline
          </button>
        </div>
      </header>

      <!-- Stats -->
      <section class="dash-stats">
        <div class="dash-stat">
          <div class="dash-stat-icon stat-pipelines">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          </div>
          <div class="dash-stat-body">
            <div class="dash-stat-value">${all.length}</div>
            <div class="dash-stat-label">Pipelines</div>
          </div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-icon stat-published">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="dash-stat-body">
            <div class="dash-stat-value">${published.length}<span class="dash-stat-sub">/${all.length}</span></div>
            <div class="dash-stat-label">Published</div>
          </div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-icon stat-runs">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          </div>
          <div class="dash-stat-body">
            <div class="dash-stat-value">${totalRuns}</div>
            <div class="dash-stat-label">Total Runs</div>
          </div>
        </div>
        <div class="dash-stat">
          <div class="dash-stat-icon stat-success">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 20 20 6"/></svg>
          </div>
          <div class="dash-stat-body">
            <div class="dash-stat-value">${successRate === null ? '—' : `${successRate}<span class="dash-stat-sub">%</span>`}</div>
            <div class="dash-stat-label">Success Rate</div>
          </div>
        </div>
      </section>

      <!-- Pipelines grid -->
      <section class="dash-section">
        <div class="dash-section-header">
          <h2 class="dash-section-title">Pipelines</h2>
        </div>
        ${all.length ? `
        <div class="dash-card-grid">
          <button class="dash-card dash-card-new" id="dashCardNew">
            <div class="dash-card-new-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div class="dash-card-new-label">New Pipeline</div>
            <div class="dash-card-new-sub">Start blank or use AI</div>
          </button>
          ${all.map(s => {
            const stepCount    = (s.steps || []).length;
            const stepsPreview = (s.steps || []).slice(0, 4);
            const extra        = stepCount - stepsPreview.length;
            const status       = s.status === 'published' ? 'published' : 'draft';
            return `
            <div class="dash-card ${status}" data-id="${s.id}">
              <div class="dash-card-glow"></div>
              <div class="dash-card-header">
                <div class="dash-card-name" title="${(s.name || 'Untitled').replace(/"/g, '&quot;')}">${s.name || 'Untitled'}</div>
                <span class="dash-card-status ${status}">
                  <span class="dash-card-status-dot"></span>${status}
                </span>
              </div>
              <div class="dash-card-types">
                ${stepsPreview.map(st => `<span class="dash-card-type type-${st.type}" title="${st.type}">${typeIcon(st.type)}</span>`).join('')}
                ${extra > 0 ? `<span class="dash-card-more">+${extra}</span>` : ''}
                ${stepCount === 0 ? `<span class="dash-card-empty-pill">Empty</span>` : ''}
              </div>
              <div class="dash-card-foot">
                <span class="dash-card-meta">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
                  ${s.lastRun ? stFmt(s.lastRun) : 'Never run'}
                </span>
                <span class="dash-card-meta">${stepCount} step${stepCount === 1 ? '' : 's'}</span>
              </div>
              <div class="dash-card-actions">
                <button class="dash-card-btn run"  data-card-run="${s.id}"  title="Run">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                </button>
                <button class="dash-card-btn edit" data-card-edit="${s.id}" title="Edit">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>` : `
        <div class="dash-empty">
          <div class="dash-empty-icon">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6,38 6,28 16,28 16,18 26,18 26,10 36,10 36,6"/>
              <polyline points="36,6 42,6 42,42 6,42"/>
            </svg>
          </div>
          <h3>No pipelines yet</h3>
          <p>Create your first pipeline, or describe what you want and let AI build it.</p>
          <div class="dash-empty-actions">
            <button id="dashEmptyAi"  class="dash-btn dash-btn-accent">✦ Build with AI</button>
            <button id="dashEmptyNew" class="dash-btn dash-btn-primary">+ New Pipeline</button>
          </div>
        </div>`}
      </section>

      <!-- Recent Activity -->
      ${recent.length ? `
      <section class="dash-section">
        <div class="dash-section-header">
          <h2 class="dash-section-title">Recent Activity</h2>
          <span class="dash-section-meta">Last ${Math.min(recent.length, 8)} run${recent.length === 1 ? '' : 's'}</span>
        </div>
        <div class="dash-activity">
          ${recent.slice(0, 8).map(s => `
          <div class="dash-activity-item" data-id="${s.id}">
            <span class="dash-activity-dot ${s.lastOk !== false ? 'ok' : 'err'}"></span>
            <span class="dash-activity-name">${s.name || 'Untitled'}</span>
            <span class="dash-activity-status ${s.lastOk !== false ? 'ok' : 'err'}">${s.lastOk !== false ? 'Success' : 'Failed'}</span>
            <span class="dash-activity-dur">${s.lastDuration || '—'}</span>
            <span class="dash-activity-time">${stFmt(s.lastRun)}</span>
          </div>`).join('')}
        </div>
      </section>` : ''}
    </div>`;

  // ── card click → open pipeline ──────────────────────────────────────────────
  dash.querySelectorAll('.dash-card:not(.dash-card-new)').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      const sc = all.find(s => s.id === card.dataset.id);
      if (sc) openPipeline(sc);
    });
  });

  dash.querySelectorAll('[data-card-edit]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const sc = all.find(s => s.id === btn.dataset.cardEdit);
      if (sc) openPipeline(sc);
    });
  });

  dash.querySelectorAll('[data-card-run]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const sc = all.find(s => s.id === btn.dataset.cardRun);
      if (!sc) return;
      openPipeline(sc);
      setTimeout(async () => {
        const { stRun } = await import('./run.js');
        stRun();
      }, 300);
    });
  });

  dash.querySelectorAll('.dash-activity-item').forEach(item => {
    item.addEventListener('click', () => {
      const sc = all.find(s => s.id === item.dataset.id);
      if (sc) openPipeline(sc);
    });
  });

  // ── action buttons ──────────────────────────────────────────────────────────
  const createNew = async () => {
    BP.stairsCurrent = {
      id: stUid(), name: 'Untitled', steps: [], status: 'draft',
      created: new Date().toISOString(), runCount: 0, successRuns: 0,
    };
    BP.stairsOutputs = {};
    await window.buildpipe.saveStaircase(BP.stairsCurrent);
    const { stLoadAll, stRenderCanvas } = await import('./render.js');
    await stLoadAll();
    showEditor();
    stRenderCanvas();
  };

  document.getElementById('dashNewBtn')?.addEventListener('click',  createNew);
  document.getElementById('dashCardNew')?.addEventListener('click', createNew);
  document.getElementById('dashEmptyNew')?.addEventListener('click', createNew);

  const openAiModal = () => stShowAiBuildModal();
  document.getElementById('dashAiBuildBtn')?.addEventListener('click',  openAiModal);
  document.getElementById('dashEmptyAi')?.addEventListener('click',  openAiModal);

  document.getElementById('dashSettingsBtn')?.addEventListener('click', () => {
    stEl('stSettingsBtn')?.click();
  });
  document.getElementById('dashModelPill')?.addEventListener('click', () => {
    stEl('stSettingsBtn')?.click();
  });
}

// ─── AI Build Modal ───────────────────────────────────────────────────────────

const AI_EXAMPLES = [
  'Fetch top HN stories, summarise with AI, save to file',
  'Check GitHub notifications and draft a daily summary',
  'Pull weather data and generate a morning briefing',
  'Read a CSV, analyse trends with AI, export a report',
];

export function stShowAiBuildModal() {
  const existing = document.querySelector('.dash-ai-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'dash-ai-modal';
  modal.innerHTML = `
    <div class="dash-ai-modal-backdrop"></div>
    <div class="dash-ai-modal-card">
      <div class="dash-ai-modal-hdr">
        <div class="dash-ai-modal-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5L19 10l-5.2 2L12 17l-1.8-5L5 10l5.2-2z"/></svg>
        </div>
        <div class="dash-ai-modal-title">Build with AI</div>
        <button class="dash-ai-modal-close" title="Close">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="dash-ai-modal-body">
        <label class="dash-ai-modal-label">Describe your pipeline</label>
        <textarea
          id="dashAiModalInput"
          class="dash-ai-modal-input"
          placeholder="e.g. Fetch the latest news, summarise each article with AI, and save a digest to ~/briefing.md"
          rows="4"
          spellcheck="false"
        ></textarea>

        <div class="dash-ai-modal-examples-label">Try an example</div>
        <div class="dash-ai-modal-examples">
          ${AI_EXAMPLES.map(ex => `<button class="dash-ai-example" data-example="${ex.replace(/"/g, '&quot;')}">${ex}</button>`).join('')}
        </div>
      </div>

      <div class="dash-ai-modal-foot">
        <span class="dash-ai-modal-hint" id="dashAiModalHint"></span>
        <div class="dash-ai-modal-foot-actions">
          <button class="dash-btn" id="dashAiModalCancel">Cancel</button>
          <button class="dash-btn dash-btn-accent" id="dashAiModalGenerate">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5L19 10l-5.2 2L12 17l-1.8-5L5 10l5.2-2z"/></svg>
            Generate Pipeline
          </button>
        </div>
      </div>

      <div class="dash-ai-modal-progress hidden" id="dashAiModalProgress">
        <div class="dash-ai-progress-bar"><div class="dash-ai-progress-fill"></div></div>
        <div class="dash-ai-progress-label" id="dashAiProgressLabel">Generating your pipeline…</div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  const input     = modal.querySelector('#dashAiModalInput');
  const genBtn    = modal.querySelector('#dashAiModalGenerate');
  const cancelBtn = modal.querySelector('#dashAiModalCancel');
  const closeBtn  = modal.querySelector('.dash-ai-modal-close');
  const hint      = modal.querySelector('#dashAiModalHint');
  const progress  = modal.querySelector('#dashAiModalProgress');
  const progLabel = modal.querySelector('#dashAiProgressLabel');

  const close = () => {
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 220);
  };

  modal.querySelector('.dash-ai-modal-backdrop').addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);

  modal.querySelectorAll('.dash-ai-example').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.example;
      input.focus();
    });
  });

  input.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      genBtn.click();
    }
  });

  setTimeout(() => input.focus(), 80);

  genBtn.addEventListener('click', async () => {
    const description = input.value.trim();
    if (!description) {
      hint.textContent = 'Please describe what your pipeline should do.';
      hint.style.color = 'var(--error)';
      input.focus();
      return;
    }

    // show progress
    hint.textContent = '';
    genBtn.disabled = cancelBtn.disabled = true;
    progress.classList.remove('hidden');
    progLabel.textContent = 'Thinking…';

    const systemPrompt = `You are a workflow automation assistant for a developer tool called buildpipe.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
JSON shape:
{
  "name": "Short descriptive pipeline name",
  "steps": [
    { "id": "s1", "type": "code|ai|http|file", "label": "Step label", "config": { ...see below } }
  ]
}
Config shapes by type:
- code: { "command": "shell command string" }
- ai:   { "prompt": "prompt text — use {{step_id.output}} to reference previous steps", "system": "optional system prompt" }
- http: { "url": "https://...", "method": "GET|POST|PUT|DELETE", "body": "optional JSON string" }
- file: { "operation": "read|write|append", "path": "~/path/to/file.ext", "content": "{{step_id.output}} or literal text" }
Use {{step_id.output}} to chain data between steps. Keep steps focused and purposeful.`;

    try {
      progLabel.textContent = 'Calling AI…';
      const res = await window.buildpipe.aiRequest({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: `Create a pipeline automation for: ${description}` },
        ],
      });

      // check for API-level error first
      if (res?.ok === false) {
        throw new Error(res.error || 'AI request failed');
      }

      progLabel.textContent = 'Parsing steps…';
      const text = res?.output_text || res?.text || res?.choices?.[0]?.message?.content || '';
      if (!text) throw new Error('AI returned an empty response — check your API key in Settings.');

      const data = extractJSON(text);
      if (!data) throw new Error('Could not parse pipeline from AI response — try rephrasing your description.');

      if (!Array.isArray(data.steps) || !data.steps.length) {
        throw new Error('No steps returned — try a more specific description.');
      }

      progLabel.textContent = `Creating ${data.steps.length} steps…`;

      BP.stairsCurrent = {
        id:          stUid(),
        name:        data.name || description.slice(0, 48),
        steps:       data.steps.map(s => ({ ...s, id: s.id || stUid() })),
        status:      'draft',
        created:     new Date().toISOString(),
        runCount:    0,
        successRuns: 0,
      };
      BP.stairsOutputs = {};

      await window.buildpipe.saveStaircase(BP.stairsCurrent);

      const { stLoadAll, stRenderCanvas } = await import('./render.js');
      await stLoadAll();

      close();
      setTimeout(() => {
        showEditor();
        stEl('stName').value = BP.stairsCurrent.name;
        stEl('stDraftBadge')?.classList.remove('hidden');
        stEl('stPublishedBadge')?.classList.add('hidden');
        stRenderCanvas();
      }, 240);

    } catch (e) {
      progress.classList.add('hidden');
      genBtn.disabled = cancelBtn.disabled = false;
      hint.style.color = 'var(--error)';
      const msg = e.message || '';
      hint.textContent = /key|api key|configured/i.test(msg)
        ? msg
        : `Error: ${msg}`;
    }
  });
}

// ─── Robust JSON extraction ───────────────────────────────────────────────────
function extractJSON(text) {
  // 1. strip markdown code fences
  let s = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();

  // 2. try direct parse
  try { return JSON.parse(s); } catch {}

  // 3. find first {...} block (handles leading/trailing prose)
  const start = s.indexOf('{');
  const end   = s.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch {}
  }

  return null;
}
