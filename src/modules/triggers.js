import { stEl } from './utils.js';
import BP from './state.js';

export async function stShowTriggersModal() {
  const existing = document.querySelector('.bp-triggers-modal');
  if (existing) { existing.remove(); return; }

  const pipelineId   = BP.stairsCurrent?.id;
  const pipelineName = BP.stairsCurrent?.name || 'this pipeline';
  if (!pipelineId) return;

  const allTriggers = await window.buildpipe.listTriggers();
  const current     = allTriggers[pipelineId] || null;

  const modal = document.createElement('div');
  modal.className = 'bp-triggers-modal';
  modal.innerHTML = `
    <div class="bp-modal-backdrop"></div>
    <div class="bp-modal-card bp-triggers-card">
      <div class="bp-modal-hdr">
        <div class="bp-modal-icon type-trigger">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <div class="bp-modal-title">Triggers <span class="bp-modal-subtitle">— ${pipelineName}</span></div>
        <button class="bp-modal-close">✕</button>
      </div>
      <div class="bp-modal-body">
        <p class="bp-modal-desc">Automatically run this pipeline when a condition is met.</p>

        <div class="bp-trigger-type-row">
          <label class="bp-trigger-type-opt ${!current || current.type==='none' ? 'active' : ''}" data-type="none">
            <input type="radio" name="triggerType" value="none" ${!current || current.type==='none' ? 'checked' : ''} />
            <span class="bp-trigger-opt-icon">○</span>
            <span>Manual only</span>
          </label>
          <label class="bp-trigger-type-opt ${current?.type==='cron' ? 'active' : ''}" data-type="cron">
            <input type="radio" name="triggerType" value="cron" ${current?.type==='cron' ? 'checked' : ''} />
            <span class="bp-trigger-opt-icon">⏱</span>
            <span>Schedule</span>
          </label>
          <label class="bp-trigger-type-opt ${current?.type==='watch' ? 'active' : ''}" data-type="watch">
            <input type="radio" name="triggerType" value="watch" ${current?.type==='watch' ? 'checked' : ''} />
            <span class="bp-trigger-opt-icon">👁</span>
            <span>File watch</span>
          </label>
          <label class="bp-trigger-type-opt ${current?.type==='webhook' ? 'active' : ''}" data-type="webhook">
            <input type="radio" name="triggerType" value="webhook" ${current?.type==='webhook' ? 'checked' : ''} />
            <span class="bp-trigger-opt-icon">↗</span>
            <span>Webhook</span>
          </label>
        </div>

        <div id="bpTriggerConfig" class="bp-trigger-config">
          ${renderTriggerConfig(current)}
        </div>
      </div>
      <div class="bp-modal-foot">
        <span id="bpTriggerStatus" class="bp-modal-status"></span>
        <div class="bp-modal-foot-actions">
          <button class="dash-btn" id="bpTriggerCancel">Cancel</button>
          <button class="dash-btn dash-btn-accent" id="bpTriggerSave">Save Trigger</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  const close = () => { modal.classList.remove('visible'); setTimeout(() => modal.remove(), 200); };
  modal.querySelector('.bp-modal-backdrop').addEventListener('click', close);
  modal.querySelector('.bp-modal-close').addEventListener('click', close);
  modal.querySelector('#bpTriggerCancel').addEventListener('click', close);

  modal.querySelectorAll('input[name="triggerType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      modal.querySelectorAll('.bp-trigger-type-opt').forEach(o => o.classList.toggle('active', o.dataset.type === radio.value));
      const fakeT = radio.value === 'none' ? null : { type: radio.value, config: current?.type === radio.value ? current.config : {} };
      modal.querySelector('#bpTriggerConfig').innerHTML = renderTriggerConfig(fakeT);
    });
  });

  modal.querySelector('#bpTriggerSave').addEventListener('click', async () => {
    const type = modal.querySelector('input[name="triggerType"]:checked')?.value || 'none';
    const statusEl = modal.querySelector('#bpTriggerStatus');
    if (type === 'none') {
      await window.buildpipe.removeTrigger(pipelineId);
      statusEl.textContent = 'Trigger removed.';
      setTimeout(close, 800);
      return;
    }
    const config = {};
    modal.querySelectorAll('#bpTriggerConfig [data-tkey]').forEach(el => { config[el.dataset.tkey] = el.value; });
    const trigger = { id: pipelineId, pipelineId, type, config };
    await window.buildpipe.setTrigger(trigger);
    statusEl.textContent = type === 'webhook'
      ? `Active — POST http://127.0.0.1:${config.port || 9876}/run/${pipelineId}`
      : 'Trigger saved and active.';
    setTimeout(close, 1200);
  });
}

function renderTriggerConfig(trigger) {
  if (!trigger || trigger.type === 'none') return '<p class="bp-trigger-none-msg">Pipeline will only run when you click Run.</p>';
  const c = trigger.config || {};

  if (trigger.type === 'cron') {
    return `
      <div class="st-field-label">Run every</div>
      <select class="st-field-select" data-tkey="intervalMinutes">
        <option value="5"  ${c.intervalMinutes==5?'selected':''}>5 minutes</option>
        <option value="15" ${(c.intervalMinutes==15||!c.intervalMinutes)?'selected':''}>15 minutes</option>
        <option value="30" ${c.intervalMinutes==30?'selected':''}>30 minutes</option>
        <option value="60" ${c.intervalMinutes==60?'selected':''}>1 hour</option>
        <option value="360" ${c.intervalMinutes==360?'selected':''}>6 hours</option>
        <option value="1440" ${c.intervalMinutes==1440?'selected':''}>Daily (24 hours)</option>
      </select>`;
  }
  if (trigger.type === 'watch') {
    return `
      <div class="st-field-label">Watch file or directory</div>
      <input class="st-field-input" data-tkey="path" value="${c.path || ''}" placeholder="~/Documents/input.txt" />
      <span class="bp-trigger-hint">Pipeline runs 0.5s after any change to this path.</span>`;
  }
  if (trigger.type === 'webhook') {
    return `
      <div class="st-field-label">Port</div>
      <input class="st-field-input" data-tkey="port" type="number" value="${c.port || 9876}" style="width:100px;" />
      <span class="bp-trigger-hint">Send <code>POST http://127.0.0.1:${c.port || 9876}/run/${BP.stairsCurrent?.id}</code> to fire.</span>`;
  }
  return '';
}
