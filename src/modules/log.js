import { stEl } from './utils.js';
import BP from './state.js';

let logLines = [];

export function stLog(msg, cls = 'log-info') {
  const body = stEl('stLogBody');
  if (!body) return;
  const empty = body.querySelector('.st-log-empty');
  if (empty) empty.remove();
  const line = document.createElement('span');
  line.className = `st-log-line ${cls}`;
  line.textContent = msg;
  body.appendChild(line);
  body.appendChild(document.createElement('br'));
  body.scrollTop = body.scrollHeight;

  logLines.push(`${cls}:${msg}`);
  if (logLines.length > 500) logLines.shift();
}

export function stClearLog() {
  const body = stEl('stLogBody');
  if (body) {
    body.innerHTML = '<div class="st-log-empty">Run a pipeline to see output here</div>';
  }
  logLines = [];
}

export function stGetLogText() {
  return logLines.map(l => {
    const idx = l.indexOf(':');
    return l.slice(idx + 1);
  }).join('\n');
}

export async function stSaveLog() {
  if (!BP.stairsCurrent) return;
  const text = stGetLogText();
  await window.buildpipe.saveLog(BP.stairsCurrent.id, text);
  stLog('Log saved to disk', 'log-ok');
}

export async function stLoadLog() {
  if (!BP.stairsCurrent) return;
  const res = await window.buildpipe.loadLog(BP.stairsCurrent.id);
  if (res.ok && res.content) {
    const body = stEl('stLogBody');
    if (!body) return;
    body.innerHTML = '';
    const lines = res.content.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const entry = document.createElement('span');
      entry.className = 'st-log-line log-dim';
      entry.textContent = line;
      body.appendChild(entry);
      body.appendChild(document.createElement('br'));
    }
    body.appendChild(document.createElement('br'));
    logLines = lines.map(l => `log-dim:${l}`);
  }
}

export function stInitLog() {
  stEl('stClearLog')?.addEventListener('click', stClearLog);
  stEl('stSaveLogBtn')?.addEventListener('click', stSaveLog);
  stEl('stCopyLogBtn')?.addEventListener('click', () => {
    const text = stGetLogText();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const btn = stEl('stCopyLogBtn');
      if (!btn) return;
      const orig = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = orig; }, 1200);
    });
  });
}
