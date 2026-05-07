import { stEl, stUid } from './utils.js';
import BP from './state.js';
import { stLog } from './log.js';
import { stSave, stLoadAll, stRenderCanvas, stAddStep, stOpen } from './render.js';
import { stRun } from './run.js';
import { stAiBuild } from './ai-build.js';
import { stRenderDashboard } from './dashboard.js';
import { stShowTriggersModal } from './triggers.js';
import { stShowHistoryModal } from './history.js';

function goHome() {
  BP.stairsCurrent = null;
  BP.stairsOutputs = {};
  document.querySelectorAll('.st-project-item').forEach(el => el.classList.remove('active'));
  stRenderDashboard();
}

export function initEvents() {
  stEl('stHomeBtn')?.addEventListener('click', goHome);
  stEl('stTopHomeBtn')?.addEventListener('click', goHome);

  stEl('stNewBtn')?.addEventListener('click', () => {
    BP.stairsCurrent = { id: stUid(), name: 'Untitled', steps: [], status: 'draft', created: new Date().toISOString() };
    BP.stairsOutputs = {};
    stEl('stName').value = '';
    stEl('stDraftBadge').classList.remove('hidden');
    stEl('stPublishedBadge').classList.add('hidden');
    window.buildpipe.saveStaircase(BP.stairsCurrent).then(() => {
      stLoadAll();
      stRenderCanvas();
    });
  });

  stEl('stName')?.addEventListener('change', () => stSave());

  stEl('stRunBtn')?.addEventListener('click', stRun);
  stEl('stStopBtn')?.addEventListener('click', () => { BP.stairsStop = true; });

  stEl('stPublishBtn')?.addEventListener('click', async () => {
    if (!BP.stairsCurrent) return;
    const isPublished = BP.stairsCurrent.status === 'published';
    BP.stairsCurrent.status = isPublished ? 'draft' : 'published';
    await stSave();
    stEl('stDraftBadge').classList.toggle('hidden', !isPublished);
    stEl('stPublishedBadge').classList.toggle('hidden', isPublished);
    stEl('stPublishBtn').textContent = isPublished ? 'Publish' : 'Unpublish';
    stLog(isPublished ? '○ Unpublished — back to draft' : '✓ Published!', isPublished ? 'log-info' : 'log-ok');
  });

  stEl('stDeleteStaircaseBtn')?.addEventListener('click', async () => {
    if (!BP.stairsCurrent) return;
    if (!confirm(`Delete "${BP.stairsCurrent.name}"?`)) return;
    await window.buildpipe.deleteStaircase(BP.stairsCurrent.id);
    BP.stairsCurrent = null;
    BP.stairsOutputs = {};
    stEl('stName').value = '';
    stLoadAll();
    stRenderDashboard();
  });

  stEl('stUndoBtn')?.addEventListener('click', () => BP.undo());
  stEl('stRedoBtn')?.addEventListener('click', () => BP.redo());

  stEl('stTriggersBtn')?.addEventListener('click', stShowTriggersModal);
  stEl('stHistoryBtn')?.addEventListener('click', stShowHistoryModal);

  // When a trigger fires from main process, run the target pipeline
  window.buildpipe.onTriggerFired(async (pipelineId) => {
    const all = await window.buildpipe.listStaircases();
    const sc  = all.find(s => s.id === pipelineId);
    if (!sc) return;
    stLog(`⚡ Trigger fired for "${sc.name}"`, 'log-ai');
    stOpen(sc);
    setTimeout(() => { import('./run.js').then(({ stRun }) => stRun()); }, 300);
  });

  stEl('stAiBuildBtn')?.addEventListener('click', () => {
    stEl('stAiBuildBar').classList.toggle('hidden');
    if (!stEl('stAiBuildBar').classList.contains('hidden')) stEl('stAiDescInput').focus();
  });
  stEl('stAiBuildClose')?.addEventListener('click', () => stEl('stAiBuildBar').classList.add('hidden'));
  stEl('stAiGenBtn')?.addEventListener('click', () => stAiBuild(stEl('stAiDescInput').value));
  stEl('stAiDescInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') stAiBuild(e.target.value);
  });

  stEl('stAddStep')?.addEventListener('click', () => {
    stEl('stStepTypeMenu').classList.toggle('hidden');
  });
  stEl('stStepTypeMenu')?.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      stAddStep(btn.dataset.type);
      stEl('stStepTypeMenu').classList.add('hidden');
    });
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      BP.undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault();
      BP.redo();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'r') {
      e.preventDefault();
      stRun();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      stEl('stNewBtn')?.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      stEl('stAiBuildBtn')?.click();
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#stAddStep,#stMiniAdd,#stStepTypeMenu')) {
      stEl('stStepTypeMenu')?.classList.add('hidden');
    }
  });

  document.querySelectorAll('.st-btn-view').forEach(btn => {
    btn.addEventListener('click', () => BP.setViewMode(btn.dataset.view));
  });

  stEl('stSidebarEdgeToggle')?.addEventListener('click', toggleSidebar);
  stEl('stLogEdgeToggle')?.addEventListener('click', toggleLog);
}

function toggleSidebar() {
  const sidebar = stEl('stSidebar');
  const collapsed = sidebar.classList.toggle('collapsed');
  const btn = stEl('stSidebarEdgeToggle');
  if (btn) btn.classList.toggle('collapsed', collapsed);
}

function toggleLog() {
  const log = stEl('stLogPanel');
  const collapsed = log.classList.toggle('collapsed');
  const btn = stEl('stLogEdgeToggle');
  if (btn) btn.classList.toggle('collapsed', collapsed);
}
