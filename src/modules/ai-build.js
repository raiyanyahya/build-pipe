import { stEl, stUid } from './utils.js';
import BP from './state.js';
import { stLog } from './log.js';
import { stSave } from './render.js';
import { stLoadAll } from './render.js';
import { stRenderCanvas } from './render.js';

export async function stAiBuild(description) {
  if (!description.trim()) return;
  stLog('✦ Generating pipeline from description…', 'log-ai');

  const systemPrompt = `You are a workflow automation assistant for a developer tool called buildpipe.
Return ONLY valid JSON — no explanation, no markdown fences.
JSON shape:
{
  "name": "Short descriptive name",
  "steps": [
    { "id": "s1", "type": "code|ai|http|file", "label": "Step label", "config": { ...see below } }
  ]
}
Config shapes:
- code: { "command": "shell command string" }
- ai:   { "prompt": "prompt text — use {{step_id.output}} for previous step output", "system": "optional system prompt" }
- http: { "url": "https://...", "method": "GET|POST", "body": "optional JSON string" }
- file: { "operation": "read|write|append", "path": "~/path/to/file.ext", "content": "{{step_id.output}} or literal" }
Use {{step_id.output}} to chain steps. Keep steps focused and lean.`;

  try {
    const res = await window.buildpipe.aiRequest({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a pipeline automation for: ${description}` }
      ]
    });
    if (res?.ok === false) throw new Error(res.error || 'AI request failed');

    const text = res?.output_text || res?.text || res?.choices?.[0]?.message?.content || '';
    if (!text) throw new Error('AI returned an empty response — check your API key in Settings.');

    // strip fences then find first {...} block
    const clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
    let data;
    try { data = JSON.parse(clean); } catch {
      const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
      if (s !== -1 && e > s) data = JSON.parse(clean.slice(s, e + 1));
      else throw new Error('Could not parse pipeline JSON from AI response');
    }

    if (!BP.stairsCurrent) {
      BP.stairsCurrent = { id: stUid(), name: data.name || 'Untitled', steps: [], status: 'draft', created: new Date().toISOString() };
    }
    BP.stairsCurrent.name = data.name || BP.stairsCurrent.name;
    BP.stairsCurrent.steps = (data.steps || []).map(s => ({ ...s, id: s.id || stUid() }));
    stEl('stName').value = BP.stairsCurrent.name;

    await window.buildpipe.saveStaircase(BP.stairsCurrent);
    stLoadAll();
    stRenderCanvas();
    stLog(`✦ Generated ${BP.stairsCurrent.steps.length} steps`, 'log-ai');
    stEl('stAiBuildBar').classList.add('hidden');
    stEl('stAiDescInput').value = '';
  } catch (e) {
    stLog(`✕ AI build failed: ${e.message}`, 'log-error');
  }
}
