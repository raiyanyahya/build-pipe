import { stResolve } from './utils.js';
import BP from './state.js';

export async function stRunStep(step, outputs, vars = {}) {
  const c = step.config || {};

  switch (step.type) {
    case 'code': {
      const cmd = stResolve(c.command, outputs, vars);
      return await window.buildpipe.runCode(cmd);
    }

    case 'ai': {
      const input  = stResolve(c.prompt, outputs, vars);
      const system = c.system ? stResolve(c.system, outputs, vars) : 'You are a helpful assistant.';
      const model  = await window.buildpipe.getModelSetting();
      const res = await window.buildpipe.aiRequest({ input, system, model });
      if (!res?.ok) return { ok: false, output: res?.error || 'AI request failed' };
      return { ok: true, output: res.text || '' };
    }

    case 'http': {
      const url  = stResolve(c.url, outputs, vars);
      const body = c.body ? stResolve(c.body, outputs, vars) : undefined;
      return await window.buildpipe.runHttp({ url, method: c.method || 'GET', body });
    }

    case 'file': {
      const p = stResolve(c.path, outputs, vars);
      if (c.operation === 'read') {
        return await window.buildpipe.fileRead(p);
      }
      let content = stResolve(c.content, outputs, vars);
      if (c.operation === 'append') {
        const existing = await window.buildpipe.fileRead(p);
        if (existing.ok) content = existing.output + '\n' + content;
      }
      return await window.buildpipe.fileWrite(p, content);
    }

    case 'if': {
      const value   = stResolve(c.value || '', outputs, vars);
      const against = stResolve(c.against || '', outputs, vars);
      const op      = c.operator || 'contains';
      let met = false;
      if (op === 'contains')     met = value.includes(against);
      if (op === 'not-contains') met = !value.includes(against);
      if (op === 'equals')       met = value === against;
      if (op === 'not-equals')   met = value !== against;
      if (op === 'not-empty')    met = value.trim() !== '';
      if (op === 'empty')        met = value.trim() === '';
      const label = met ? `Condition met (${op})` : `Condition not met (${op})`;
      const onFalse = c.on_false || 'stop';
      return { ok: true, output: label, conditionMet: met, halt: !met && onFalse === 'stop' };
    }

    case 'loop': {
      const rawItems = stResolve(c.items || '', outputs, vars);
      let items = [];
      try { items = JSON.parse(rawItems); } catch {
        items = rawItems.split('\n').filter(l => l.trim());
      }
      if (!Array.isArray(items)) items = [rawItems].filter(Boolean);

      const limit   = Math.min(parseInt(c.max_items) || 20, 50);
      const results = [];

      for (const item of items.slice(0, limit)) {
        const itemStr = typeof item === 'string' ? item : JSON.stringify(item);
        const loopOutputs = { ...outputs, _item: { ok: true, output: itemStr } };
        const innerStep = {
          id: '_loop_inner', label: 'Loop item',
          type: c.step_type || 'code',
          config: {
            command:   stResolve(c.command  || '', loopOutputs, vars),
            prompt:    stResolve(c.prompt   || '', loopOutputs, vars),
            system:    c.system,
            url:       stResolve(c.url      || '', loopOutputs, vars),
            method:    c.method || 'GET',
            body:      stResolve(c.body     || '', loopOutputs, vars),
          },
        };
        const res = await stRunStep(innerStep, loopOutputs, vars);
        results.push(res.ok ? res.output : `[err: ${res.output}]`);
        if (!res.ok && !c.continue_on_error) break;
      }
      return { ok: true, output: results.join('\n---\n') };
    }

    case 'notify': {
      const title   = stResolve(c.title   || 'buildpipe', outputs, vars);
      const message = stResolve(c.message || '', outputs, vars);
      if (c.channel === 'webhook' && c.webhook_url) {
        const url = stResolve(c.webhook_url, outputs, vars);
        const res = await window.buildpipe.runHttp({
          url, method: 'POST',
          body: JSON.stringify({ text: message, title }),
        });
        return { ...res, output: res.ok ? `Webhook sent to ${url}` : res.output };
      }
      return await window.buildpipe.notify({ title, body: message });
    }

    default:
      return { ok: false, output: `Unknown step type: ${step.type}` };
  }
}
