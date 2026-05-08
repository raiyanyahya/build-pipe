import { app, BrowserWindow, ipcMain, safeStorage, Notification, dialog } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || null;
// Clear from env immediately so spawned child processes don't inherit them
delete process.env.OPENAI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
let KEY_FILE = null;
let ANTHROPIC_KEY_FILE = null;

const configDir   = () => path.join(os.homedir(), '.buildpipe');
const stairsDir   = () => path.join(configDir(), 'staircases');
const logDir      = () => path.join(configDir(), 'logs');
const runsDir     = () => path.join(configDir(), 'runs');
const triggersFile = () => path.join(configDir(), 'triggers.json');
const varsFile    = () => path.join(configDir(), 'vars.json');

// ── Active trigger state ──────────────────────────────────────────────────────
const activeTriggers = new Map(); // pipelineId → { cancel() }
const webhookServers = new Map(); // port → server instance
const webhookRateLimit = new Map(); // pipelineId → { count, reset }

function deactivateTrigger(pipelineId) {
  const t = activeTriggers.get(pipelineId);
  if (t) { t.cancel(); activeTriggers.delete(pipelineId); }
}

function activateTrigger(trigger) {
  deactivateTrigger(trigger.pipelineId);
  const getWin = () => BrowserWindow.getAllWindows()[0];
  const fire = () => getWin()?.webContents.send('bp:triggerFired', trigger.pipelineId);

  if (trigger.type === 'cron') {
    const ms = Math.max(60, parseInt(trigger.config?.intervalMinutes) || 15) * 60000;
    const timer = setInterval(fire, ms);
    activeTriggers.set(trigger.pipelineId, { cancel: () => clearInterval(timer) });
  }
  if (trigger.type === 'watch') {
    try {
      const watchPath = String(trigger.config?.path || '').replace(/^~/, os.homedir());
      let debounce = null;
      const watcher = fs.watch(watchPath, () => {
        clearTimeout(debounce);
        debounce = setTimeout(fire, 500);
      });
      activeTriggers.set(trigger.pipelineId, { cancel: () => watcher.close() });
    } catch (e) { console.error('[buildpipe] watch error:', e?.message); }
  }
  if (trigger.type === 'webhook') {
    const port = parseInt(trigger.config?.port) || 9876;
    const key = String(port);
    if (!webhookServers.has(key)) {
      const server = createServer((req, res) => {
        if (req.method === 'POST') {
          const m = req.url.match(/^\/run\/([^/?#]+)/);
          if (m) {
            const pid = m[1];
            const now = Date.now();
            const rl = webhookRateLimit.get(pid) || { count: 0, reset: now + 60000 };
            if (now > rl.reset) { rl.count = 0; rl.reset = now + 60000; }
            if (rl.count >= 60) {
              res.writeHead(429, { 'Content-Type': 'application/json' });
              res.end('{"ok":false,"error":"rate limit exceeded"}');
              return;
            }
            rl.count++;
            webhookRateLimit.set(pid, rl);
            getWin()?.webContents.send('bp:triggerFired', pid);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('{"ok":true}');
            return;
          }
        }
        res.writeHead(404); res.end();
      });
      server.listen(port, '127.0.0.1');
      webhookServers.set(key, server);
    }
    activeTriggers.set(trigger.pipelineId, { cancel: () => {} });
  }
}

async function loadAndActivateTriggers() {
  try {
    const triggers = JSON.parse(await fs.promises.readFile(triggersFile(), 'utf8'));
    for (const t of Object.values(triggers)) activateTrigger(t);
  } catch {}
}

function stairsSafePath(filePath) {
  const home = os.homedir();
  const resolved = path.resolve(String(filePath).replace(/^~/, home));
  if (!resolved.startsWith(home + path.sep))
    throw new Error('Path must be within home directory');
  return resolved;
}

function safeId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9_-]{1,80}$/i.test(id))
    throw new Error('Invalid ID');
  return id;
}

async function loadEncryptedKeys() {
  KEY_FILE = path.join(configDir(), 'openai_key.enc');
  ANTHROPIC_KEY_FILE = path.join(configDir(), 'anthropic_key.enc');
  try {
    await fs.promises.mkdir(configDir(), { recursive: true });
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const enc = await fs.promises.readFile(KEY_FILE);
        OPENAI_API_KEY = safeStorage.decryptString(enc);
      } catch {}
      try {
        const enc = await fs.promises.readFile(ANTHROPIC_KEY_FILE);
        ANTHROPIC_API_KEY = safeStorage.decryptString(enc);
      } catch {}
    }
  } catch (e) {
    console.error('[buildpipe] Failed to load keys:', e?.message || e);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1150,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'buildpipe',
    icon: path.join(__dirname, '..', 'assets', 'icon-256.png'),
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.loadFile(path.join(__dirname, 'index.html'));

  win.on('maximize', () => win.webContents.send('bp:maximizeChange', true));
  win.on('unmaximize', () => win.webContents.send('bp:maximizeChange', false));

  return win;
}

ipcMain.handle('bp:winMinimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.handle('bp:winMaximize', () => {
  const w = BrowserWindow.getFocusedWindow();
  if (w?.isMaximized()) w.unmaximize();
  else w?.maximize();
});

ipcMain.handle('bp:winClose', () => {
  BrowserWindow.getFocusedWindow()?.close();
});

ipcMain.handle('bp:winIsMaximized', () => {
  return BrowserWindow.getFocusedWindow()?.isMaximized() || false;
});

app.whenReady().then(async () => {
  await loadEncryptedKeys();
  await fs.promises.mkdir(stairsDir(), { recursive: true });
  await fs.promises.mkdir(logDir(), { recursive: true });
  await fs.promises.mkdir(runsDir(), { recursive: true });
  createWindow();
  await loadAndActivateTriggers();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ── API Keys ─────────────────────────────────────────────────────────────────
ipcMain.handle('bp:setApiKey', async (_e, key, provider = 'openai') => {
  const trimmed = (key || '').trim() || null;
  const isAnthropic = provider === 'anthropic';
  if (isAnthropic) {
    ANTHROPIC_API_KEY = trimmed;
    try {
      if (ANTHROPIC_API_KEY && ANTHROPIC_KEY_FILE && safeStorage.isEncryptionAvailable()) {
        await fs.promises.writeFile(ANTHROPIC_KEY_FILE, safeStorage.encryptString(ANTHROPIC_API_KEY));
      } else if (ANTHROPIC_KEY_FILE) {
        await fs.promises.unlink(ANTHROPIC_KEY_FILE).catch(() => {});
      }
    } catch (e) { console.error('[buildpipe] Failed to persist anthropic key:', e?.message || e); }
    return !!ANTHROPIC_API_KEY;
  }
  OPENAI_API_KEY = trimmed;
  try {
    if (OPENAI_API_KEY && KEY_FILE && safeStorage.isEncryptionAvailable()) {
      await fs.promises.writeFile(KEY_FILE, safeStorage.encryptString(OPENAI_API_KEY));
    } else if (KEY_FILE) {
      await fs.promises.unlink(KEY_FILE).catch(() => {});
    }
  } catch (e) { console.error('[buildpipe] Failed to persist openai key:', e?.message || e); }
  return !!OPENAI_API_KEY;
});

ipcMain.handle('bp:hasKey', async (_e, provider) => {
  if (provider === 'anthropic') return !!ANTHROPIC_API_KEY;
  if (provider === 'openai') return !!OPENAI_API_KEY;
  return false;
});

ipcMain.handle('bp:clearKey', async (_e, provider) => {
  if (provider === 'anthropic') {
    ANTHROPIC_API_KEY = null;
    try { if (ANTHROPIC_KEY_FILE) await fs.promises.unlink(ANTHROPIC_KEY_FILE); } catch {}
    return true;
  }
  OPENAI_API_KEY = null;
  try { if (KEY_FILE) await fs.promises.unlink(KEY_FILE); } catch {}
  return true;
});

ipcMain.handle('bp:getModelSetting', async () => {
  try {
    const settings = JSON.parse(await fs.promises.readFile(path.join(configDir(), 'settings.json'), 'utf8'));
    return settings.defaultModel || null;
  } catch {
    return null;
  }
});

ipcMain.handle('bp:setModelSetting', async (_e, model) => {
  let settings = {};
  try { settings = JSON.parse(await fs.promises.readFile(path.join(configDir(), 'settings.json'), 'utf8')); } catch {}
  settings.defaultModel = model;
  await fs.promises.writeFile(path.join(configDir(), 'settings.json'), JSON.stringify(settings, null, 2));
  return true;
});

ipcMain.handle('bp:getThemeSetting', async () => {
  try {
    const settings = JSON.parse(await fs.promises.readFile(path.join(configDir(), 'settings.json'), 'utf8'));
    return settings.theme || 'dark';
  } catch {
    return 'dark';
  }
});

ipcMain.handle('bp:setThemeSetting', async (_e, theme) => {
  let settings = {};
  try { settings = JSON.parse(await fs.promises.readFile(path.join(configDir(), 'settings.json'), 'utf8')); } catch {}
  settings.theme = theme;
  await fs.promises.writeFile(path.join(configDir(), 'settings.json'), JSON.stringify(settings, null, 2));
  return true;
});

// ── AI Request ───────────────────────────────────────────────────────────────
ipcMain.handle('bp:aiRequest', async (_e, payload) => {
  // resolve model: payload → settings file → fallback
  let model = payload?.model;
  if (!model) {
    try {
      const settings = JSON.parse(
        await fs.promises.readFile(path.join(configDir(), 'settings.json'), 'utf8')
      );
      model = settings.defaultModel;
    } catch {}
  }
  if (!model) model = 'gpt-4o-mini';

  const isAnthropic = /^claude-/.test(model);
  const apiKey = isAnthropic ? ANTHROPIC_API_KEY : OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: `No API key configured for ${isAnthropic ? 'Anthropic' : 'OpenAI'}. Open Settings to add one.` };

  let system = payload?.system || 'You are a helpful AI assistant.';
  let input;

  if (Array.isArray(payload?.messages)) {
    const lastMsg = payload.messages[payload.messages.length - 1];
    input = lastMsg?.content || '';
    const sysMsg = payload.messages.find(m => m.role === 'system');
    if (sysMsg?.content) system = sysMsg.content;
  } else {
    input = String(payload?.input || '');
  }

  try {
    const baseURL = isAnthropic ? 'https://api.anthropic.com/v1' : 'https://api.openai.com/v1';
    const headers = isAnthropic
      ? { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      : { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

    if (isAnthropic) {
      const body = JSON.stringify({
        model,
        system,
        messages: [{ role: 'user', content: input }],
        max_tokens: payload?.maxTokens ?? 4096,
      });

      const res = await fetch(`${baseURL}/messages`, {
        method: 'POST', headers, body,
      });
      const data = await res.json();

      if (data.error) {
        return { ok: false, error: data.error.message || 'AI request failed' };
      }

      const text = data.content?.[0]?.text || '';
      return { ok: true, text, output_text: text };
    }

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: input });

    const body = JSON.stringify({
      model,
      messages,
      temperature: payload?.temperature ?? 0.7,
      max_tokens: payload?.maxTokens ?? 4096,
    });

    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST', headers, body,
    });

    const data = await res.json();

    if (data.error) {
      return { ok: false, error: data.error.message || 'AI request failed' };
    }

    const text = data.choices?.[0]?.message?.content || '';
    return { ok: true, text, output_text: text };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── Staircase management ─────────────────────────────────────────────────────
ipcMain.handle('bp:listStaircases', async () => {
  try {
    await fs.promises.mkdir(stairsDir(), { recursive: true });
    const files = (await fs.promises.readdir(stairsDir())).filter(f => f.endsWith('.json'));
    const all = [];
    for (const f of files) {
      try { all.push(JSON.parse(await fs.promises.readFile(path.join(stairsDir(), f), 'utf8'))); } catch {}
    }
    return all.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  } catch { return []; }
});

ipcMain.handle('bp:saveStaircase', async (_e, staircase) => {
  try {
    safeId(staircase.id);
    await fs.promises.mkdir(stairsDir(), { recursive: true });
    await fs.promises.writeFile(
      path.join(stairsDir(), `${staircase.id}.json`),
      JSON.stringify(staircase, null, 2),
      'utf8'
    );
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('bp:deleteStaircase', async (_e, id) => {
  try {
    safeId(id);
    await fs.promises.unlink(path.join(stairsDir(), `${id}.json`));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('bp:exportPipeline', async (_e, pipeline) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Pipeline',
    defaultPath: `${pipeline.name || 'pipeline'}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false };
  await fs.promises.writeFile(filePath, JSON.stringify(pipeline, null, 2), 'utf8');
  return { ok: true };
});

ipcMain.handle('bp:importPipeline', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Import Pipeline',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { ok: false };
  const stat = await fs.promises.stat(filePaths[0]);
  if (stat.size > 5 * 1024 * 1024) return { ok: false, error: 'File too large (max 5 MB)' };
  const raw = await fs.promises.readFile(filePaths[0], 'utf8');
  let pipeline;
  try { pipeline = JSON.parse(raw); } catch { return { ok: false, error: 'Invalid JSON' }; }
  if (!pipeline.name || !Array.isArray(pipeline.steps)) return { ok: false, error: 'Not a valid pipeline file' };
  pipeline.id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  pipeline.created = new Date().toISOString();
  delete pipeline.lastRun;
  pipeline.runCount = 0;
  pipeline.successRuns = 0;
  const dest = path.join(stairsDir(), `${pipeline.id}.json`);
  await fs.promises.mkdir(stairsDir(), { recursive: true });
  await fs.promises.writeFile(dest, JSON.stringify(pipeline, null, 2), 'utf8');
  return { ok: true, pipeline };
});

// ── Step execution ───────────────────────────────────────────────────────────
ipcMain.handle('bp:runCode', async (_e, command) => {
  const tmpFile = path.join(os.tmpdir(), `bp_step_${Date.now()}.sh`);
  try {
    await fs.promises.writeFile(tmpFile, command, 'utf8');
    return await new Promise(resolve => {
      exec(`bash "${tmpFile}"`, { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) resolve({ ok: false, output: (stderr || err.message).trim() });
        else resolve({ ok: true, output: stdout.trim() });
      });
    });
  } finally {
    fs.promises.unlink(tmpFile).catch(() => {});
  }
});

ipcMain.handle('bp:runHttp', async (_e, { url, method = 'GET', headers = {}, body }) => {
  try {
    let parsed;
    try { parsed = new URL(url); } catch { return { ok: false, output: 'Invalid URL' }; }
    if (!['http:', 'https:'].includes(parsed.protocol)) return { ok: false, output: 'Only http/https URLs are allowed' };
    const h = parsed.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0' ||
        h.endsWith('.local') ||
        /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
        /^169\.254\./.test(h) || /^fc00:/i.test(h) || /^fd[0-9a-f]{2}:/i.test(h))
      return { ok: false, output: 'Requests to private/localhost addresses are not allowed' };
    const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
    if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    return { ok: res.ok, status: res.status, output: text };
  } catch (e) { return { ok: false, output: e.message }; }
});

ipcMain.handle('bp:fileRead', async (_e, filePath) => {
  try {
    return { ok: true, output: await fs.promises.readFile(stairsSafePath(filePath), 'utf8') };
  } catch (e) { return { ok: false, output: e.message }; }
});

ipcMain.handle('bp:fileWrite', async (_e, { path: filePath, content }) => {
  try {
    const resolved = stairsSafePath(filePath);
    await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
    await fs.promises.writeFile(resolved, content, 'utf8');
    return { ok: true, output: `Written to ${filePath}` };
  } catch (e) { return { ok: false, output: e.message }; }
});

// ── Log persistence ──────────────────────────────────────────────────────────
ipcMain.handle('bp:saveLog', async (_e, { staircaseId, logText }) => {
  try {
    safeId(staircaseId);
    await fs.promises.mkdir(logDir(), { recursive: true });
    const logFile = path.join(logDir(), `${staircaseId}.log`);
    const capped = logText.length > 500000 ? logText.slice(logText.length - 500000) : logText;
    await fs.promises.writeFile(logFile, capped, 'utf8');
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('bp:loadLog', async (_e, staircaseId) => {
  try {
    safeId(staircaseId);
    const logFile = path.join(logDir(), `${staircaseId}.log`);
    return { ok: true, content: await fs.promises.readFile(logFile, 'utf8') };
  } catch { return { ok: false, content: '' }; }
});

// ── Triggers ─────────────────────────────────────────────────────────────────
ipcMain.handle('bp:listTriggers', async () => {
  try { return JSON.parse(await fs.promises.readFile(triggersFile(), 'utf8')); } catch { return {}; }
});

ipcMain.handle('bp:setTrigger', async (_e, trigger) => {
  let triggers = {};
  try { triggers = JSON.parse(await fs.promises.readFile(triggersFile(), 'utf8')); } catch {}
  triggers[trigger.pipelineId] = trigger;
  await fs.promises.writeFile(triggersFile(), JSON.stringify(triggers, null, 2));
  activateTrigger(trigger);
  return { ok: true };
});

ipcMain.handle('bp:removeTrigger', async (_e, pipelineId) => {
  let triggers = {};
  try { triggers = JSON.parse(await fs.promises.readFile(triggersFile(), 'utf8')); } catch {}
  delete triggers[pipelineId];
  await fs.promises.writeFile(triggersFile(), JSON.stringify(triggers, null, 2));
  deactivateTrigger(pipelineId);
  return { ok: true };
});

// ── Variables store ───────────────────────────────────────────────────────────
ipcMain.handle('bp:listVars', async () => {
  try { return JSON.parse(await fs.promises.readFile(varsFile(), 'utf8')); } catch { return {}; }
});

ipcMain.handle('bp:setVar', async (_e, key, value) => {
  let vars = {};
  try { vars = JSON.parse(await fs.promises.readFile(varsFile(), 'utf8')); } catch {}
  vars[String(key).trim()] = String(value);
  await fs.promises.writeFile(varsFile(), JSON.stringify(vars, null, 2));
  return { ok: true };
});

ipcMain.handle('bp:deleteVar', async (_e, key) => {
  let vars = {};
  try { vars = JSON.parse(await fs.promises.readFile(varsFile(), 'utf8')); } catch {}
  delete vars[key];
  await fs.promises.writeFile(varsFile(), JSON.stringify(vars, null, 2));
  return { ok: true };
});

// ── Run history ───────────────────────────────────────────────────────────────
ipcMain.handle('bp:saveRun', async (_e, run) => {
  try {
    safeId(run.id);
    await fs.promises.mkdir(runsDir(), { recursive: true });
    await fs.promises.writeFile(path.join(runsDir(), `${run.id}.json`), JSON.stringify(run, null, 2), 'utf8');
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('bp:listRuns', async (_e, pipelineId) => {
  try {
    await fs.promises.mkdir(runsDir(), { recursive: true });
    const files = (await fs.promises.readdir(runsDir())).filter(f => f.endsWith('.json'));
    const all = [];
    for (const f of files) {
      try {
        const run = JSON.parse(await fs.promises.readFile(path.join(runsDir(), f), 'utf8'));
        if (!pipelineId || run.pipelineId === pipelineId) all.push(run);
      } catch {}
    }
    return all.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || '')).slice(0, 100);
  } catch { return []; }
});

ipcMain.handle('bp:getRun', async (_e, runId) => {
  try {
    safeId(runId);
    return JSON.parse(await fs.promises.readFile(path.join(runsDir(), `${runId}.json`), 'utf8'));
  } catch { return null; }
});

// ── Notifications ─────────────────────────────────────────────────────────────
ipcMain.handle('bp:notify', (_e, { title, body }) => {
  try {
    if (Notification.isSupported()) new Notification({ title: title || 'buildpipe', body: body || '' }).show();
  } catch {}
  return { ok: true, output: `Notification sent: ${title}` };
});
