export const stEl = id => document.getElementById(id);

export const stUid = () => Math.random().toString(36).slice(2, 10);

export const stFmt = d => new Date(d).toLocaleTimeString();

export const stTplVars = () => ({
  date: new Date().toISOString().slice(0, 10),
  timestamp: Date.now().toString(),
});

export function stResolve(str, outputs, vars = {}) {
  if (!str) return str;
  const builtins = stTplVars();
  let s = str.replace(/\{\{vars\.(\w+)\}\}/g, (_, k) => vars[k] ?? `{{vars.${k}}}`);
  s = s.replace(/\{\{(\w+)\}\}/g, (_, k) => builtins[k] ?? `{{${k}}}`);
  s = s.replace(/\{\{(\w+)\.output\}\}/g, (_, id) => {
    const o = outputs[id];
    return o ? o.output : `{{${id}.output}}`;
  });
  return s;
}

export const escapeHtml = str => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const providerFor = model => /^claude-/.test(model) ? 'anthropic' : 'openai';

export function getAddRow() { return document.querySelector('.st-add-row'); }
export function getTopbar()  { return document.querySelector('.st-topbar'); }

export function showEditor() {
  const dash   = stEl('stDashboard');
  const canvas = document.getElementById('stCanvas');
  const topbar = getTopbar();
  const addRow = getAddRow();

  if (dash)   dash.style.display   = 'none';
  if (canvas) canvas.style.display = '';
  if (topbar) topbar.style.display = '';
  if (addRow) addRow.style.display = '';
}

export const STEP_ICONS = {
  code:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  ai:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  http:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  file:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  if:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>',
  loop:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  notify: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
};

export const STEP_TYPE_LABELS = {
  code: 'CODE', ai: 'AI', http: 'HTTP', file: 'FILE',
  if: 'IF', loop: 'LOOP', notify: 'NOTIFY',
};
