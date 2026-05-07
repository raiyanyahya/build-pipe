import { stResolve } from './utils.js';
import BP from './state.js';

export async function stRunStep(step, outputs) {
  const c = step.config || {};
  switch (step.type) {
    case 'code': {
      const cmd = stResolve(c.command, outputs);
      return await window.buildpipe.runCode(cmd);
    }
    case 'ai': {
      const input = stResolve(c.prompt, outputs);
      const system = c.system ? stResolve(c.system, outputs) : 'You are a helpful assistant.';
      const model = await window.buildpipe.getModelSetting();
      const res = await window.buildpipe.aiRequest({ input, system, model });
      if (!res?.ok) return { ok: false, output: res?.error || 'AI request failed' };
      return { ok: true, output: res.text || '' };
    }
    case 'http': {
      const url = stResolve(c.url, outputs);
      const body = c.body ? stResolve(c.body, outputs) : undefined;
      return await window.buildpipe.runHttp({ url, method: c.method || 'GET', body });
    }
    case 'file': {
      const p = stResolve(c.path, outputs);
      if (c.operation === 'read') {
        return await window.buildpipe.fileRead(p);
      } else {
        let content = stResolve(c.content, outputs);
        if (c.operation === 'append') {
          const existing = await window.buildpipe.fileRead(p);
          if (existing.ok) {
            content = existing.output + '\n' + content;
          }
        }
        return await window.buildpipe.fileWrite(p, content);
      }
    }
    default:
      return { ok: false, output: `Unknown step type: ${step.type}` };
  }
}
