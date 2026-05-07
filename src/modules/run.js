import { stEl, stUid, stFmt } from './utils.js';
import BP from './state.js';
import { stLog } from './log.js';
import { stSave } from './render.js';
import { stApplyStepOutput } from './render.js';
import { stRunStep } from './steps.js';

export async function stRun() {
  if (!BP.stairsCurrent || BP.stairsRunning) return;
  stSave();
  await stRunFrom(0);
}

export async function stRunFrom(startIndex) {
  if (!BP.stairsCurrent || BP.stairsRunning) return;
  BP.stairsRunning = true;
  BP.stairsStop    = false;

  stEl('stRunBtn').classList.add('hidden');
  stEl('stStopBtn').classList.remove('hidden');

  BP.stairsCurrent.steps.slice(startIndex).forEach(s => {
    const card = document.querySelector(`.st-node[data-id="${s.id}"]`) || document.querySelector(`.st-step[data-id="${s.id}"]`);
    if (!card) return;
    card.classList.remove('st-running', 'st-done', 'st-error');
    const ow = card.querySelector(`[data-out-wrap="${s.id}"]`);
    if (ow) ow.classList.add('hidden');
    delete BP.stairsOutputs[s.id];
  });

  // Load global vars once before the run
  const vars = await window.buildpipe.listVars().catch(() => ({}));

  const runRecord = {
    id:           stUid(),
    pipelineId:   BP.stairsCurrent.id,
    pipelineName: BP.stairsCurrent.name,
    startedAt:    new Date().toISOString(),
    steps:        [],
    status:       'running',
  };

  stLog(`─── Run started at ${stFmt(Date.now())} ───`, 'log-dim');

  let halted = false;

  for (let i = startIndex; i < BP.stairsCurrent.steps.length; i++) {
    if (BP.stairsStop) { stLog('● Stopped', 'log-error'); halted = true; break; }

    const step = BP.stairsCurrent.steps[i];
    const card = document.querySelector(`.st-node[data-id="${step.id}"]`) || document.querySelector(`.st-step[data-id="${step.id}"]`);
    card?.classList.add('st-running');
    card?.classList.remove('st-done', 'st-error');

    const stepLabel = step.label || step.type;
    stLog(`▶ [${i + 1}/${BP.stairsCurrent.steps.length}] ${stepLabel}`, 'log-info');
    const t0 = Date.now();

    const maxRetry = Math.max(0, parseInt(step.config?.retry) || 0);
    let res;
    for (let attempt = 0; attempt <= maxRetry; attempt++) {
      if (attempt > 0) {
        stLog(`↺ Retrying (${attempt}/${maxRetry})…`, 'log-dim');
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
      try {
        res = await stRunStep(step, BP.stairsOutputs, vars);
      } catch (e) {
        res = { ok: false, output: e.message };
      }
      if (res.ok || attempt === maxRetry) break;
    }

    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    BP.stairsOutputs[step.id] = res;
    stApplyStepOutput(step.id, res);

    const durEl = card?.querySelector(`[data-dur="${step.id}"]`);
    if (durEl) durEl.textContent = `${dur}s`;

    runRecord.steps.push({
      id: step.id, label: stepLabel, type: step.type,
      ok: res.ok, output: (res.output || '').slice(0, 2000), duration: parseFloat(dur),
    });

    if (res.ok) {
      stLog(`✓ Done (${dur}s)`, 'log-ok');
      if (res.output) stLog(res.output.slice(0, 300), 'log-dim');
      if (res.halt) {
        stLog(`⊘ ${stepLabel}: condition not met — pipeline halted`, 'log-dim');
        halted = true;
        break;
      }
    } else {
      stLog(`✕ Error: ${res.output}`, 'log-error');
      if (step.config?.continueOnError === '1' || step.config?.continueOnError === true) {
        stLog(`→ Continuing (continueOnError)`, 'log-dim');
      } else {
        break;
      }
    }
  }

  // Save run history
  const lastStep = BP.stairsCurrent.steps[BP.stairsCurrent.steps.length - 1];
  const lastRes  = lastStep ? BP.stairsOutputs[lastStep.id] : null;
  runRecord.endedAt = new Date().toISOString();
  runRecord.status  = halted ? 'stopped' : (runRecord.steps.some(s => !s.ok) ? 'failed' : 'success');
  window.buildpipe.saveRun(runRecord).catch(() => {});

  BP.stairsCurrent.lastRun  = new Date().toISOString();
  BP.stairsCurrent.runCount = (BP.stairsCurrent.runCount || 0) + 1;
  if (lastRes?.ok) BP.stairsCurrent.successRuns = (BP.stairsCurrent.successRuns || 0) + 1;
  BP.stairsCurrent.lastOk = lastRes?.ok !== false;
  await window.buildpipe.saveStaircase(BP.stairsCurrent);

  BP.stairsRunning = false;
  stEl('stRunBtn').classList.remove('hidden');
  stEl('stStopBtn').classList.add('hidden');
}
