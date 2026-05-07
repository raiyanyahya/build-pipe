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
