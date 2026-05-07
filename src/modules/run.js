import { stEl, stFmt } from './utils.js';
import BP from './state.js';
import { stLog } from './log.js';
import { stSave } from './render.js';
import { stRunStep } from './steps.js';
import { stApplyStepOutput } from './render.js';

export async function stRun() {
  if (!BP.stairsCurrent || BP.stairsRunning) return;
  stSave();
  await stRunFrom(0);
}

export async function stRunFrom(startIndex) {
  if (!BP.stairsCurrent || BP.stairsRunning) return;
  BP.stairsRunning = true;
  BP.stairsStop = false;

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

  stLog(`─── Run started at ${stFmt(Date.now())} ───`, 'log-dim');

  for (let i = startIndex; i < BP.stairsCurrent.steps.length; i++) {
    if (BP.stairsStop) { stLog('● Stopped', 'log-error'); break; }

    const step = BP.stairsCurrent.steps[i];
    const card = document.querySelector(`.st-node[data-id="${step.id}"]`) || document.querySelector(`.st-step[data-id="${step.id}"]`);
    card?.classList.add('st-running');
    card?.classList.remove('st-done', 'st-error');

    stLog(`▶ [${i + 1}/${BP.stairsCurrent.steps.length}] ${step.label || step.type}`, 'log-info');
    const t0 = Date.now();

    let res;
    try {
      res = await stRunStep(step, BP.stairsOutputs);
    } catch (e) {
      res = { ok: false, output: e.message };
    }

    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    BP.stairsOutputs[step.id] = res;
    stApplyStepOutput(step.id, res);

    const durEl = card?.querySelector(`[data-dur="${step.id}"]`);
    if (durEl) durEl.textContent = `${dur}s`;

    if (res.ok) {
      stLog(`✓ Done (${dur}s)`, 'log-ok');
      if (res.output) stLog(res.output.slice(0, 300), 'log-dim');
    } else {
      stLog(`✕ Error: ${res.output}`, 'log-error');
      break;
    }
  }

  BP.stairsCurrent.lastRun = new Date().toISOString();
  BP.stairsCurrent.runCount = (BP.stairsCurrent.runCount || 0) + 1;
  const lastStep = BP.stairsCurrent.steps[BP.stairsCurrent.steps.length - 1];
  const lastRes = lastStep ? BP.stairsOutputs[lastStep.id] : null;
  if (lastRes?.ok) BP.stairsCurrent.successRuns = (BP.stairsCurrent.successRuns || 0) + 1;
  if (BP.stairsOutputs) {
    const totalDur = Object.entries(BP.stairsOutputs).reduce((sum, [id, r]) => {
      return sum;
    }, 0); // duration calculated per-step
  }
  BP.stairsCurrent.lastOk = lastRes?.ok !== false;
  await window.buildpipe.saveStaircase(BP.stairsCurrent);

  BP.stairsRunning = false;
  stEl('stRunBtn').classList.remove('hidden');
  stEl('stStopBtn').classList.add('hidden');
}
