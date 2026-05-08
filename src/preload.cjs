const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('buildpipe', {
  setApiKey: (key, provider) => ipcRenderer.invoke('bp:setApiKey', key, provider || 'openai'),
  hasKey: (provider) => ipcRenderer.invoke('bp:hasKey', provider),
  clearKey: (provider) => ipcRenderer.invoke('bp:clearKey', provider),

  getModelSetting: () => ipcRenderer.invoke('bp:getModelSetting'),
  setModelSetting: (model) => ipcRenderer.invoke('bp:setModelSetting', model),
  getThemeSetting: () => ipcRenderer.invoke('bp:getThemeSetting'),
  setThemeSetting: (t) => ipcRenderer.invoke('bp:setThemeSetting', t),

  aiRequest: (payload) => ipcRenderer.invoke('bp:aiRequest', payload),

  listStaircases: () => ipcRenderer.invoke('bp:listStaircases'),
  saveStaircase: (s) => ipcRenderer.invoke('bp:saveStaircase', s),
  deleteStaircase: (id) => ipcRenderer.invoke('bp:deleteStaircase', id),

  runCode: (cmd) => ipcRenderer.invoke('bp:runCode', cmd),
  runHttp: (opts) => ipcRenderer.invoke('bp:runHttp', opts),
  fileRead: (p) => ipcRenderer.invoke('bp:fileRead', p),
  fileWrite: (p, c) => ipcRenderer.invoke('bp:fileWrite', { path: p, content: c }),

  saveLog: (staircaseId, logText) => ipcRenderer.invoke('bp:saveLog', { staircaseId, logText }),
  loadLog: (staircaseId) => ipcRenderer.invoke('bp:loadLog', staircaseId),

  listTriggers: () => ipcRenderer.invoke('bp:listTriggers'),
  setTrigger: (trigger) => ipcRenderer.invoke('bp:setTrigger', trigger),
  removeTrigger: (pipelineId) => ipcRenderer.invoke('bp:removeTrigger', pipelineId),
  onTriggerFired: (cb) => { ipcRenderer.removeAllListeners('bp:triggerFired'); ipcRenderer.on('bp:triggerFired', (_e, pipelineId) => cb(pipelineId)); },

  listVars: () => ipcRenderer.invoke('bp:listVars'),
  setVar: (key, value) => ipcRenderer.invoke('bp:setVar', key, value),
  deleteVar: (key) => ipcRenderer.invoke('bp:deleteVar', key),

  saveRun: (run) => ipcRenderer.invoke('bp:saveRun', run),
  listRuns: (pipelineId) => ipcRenderer.invoke('bp:listRuns', pipelineId),
  getRun: (runId) => ipcRenderer.invoke('bp:getRun', runId),

  notify: (opts) => ipcRenderer.invoke('bp:notify', opts),

  exportPipeline: (pipeline) => ipcRenderer.invoke('bp:exportPipeline', pipeline),
  importPipeline: () => ipcRenderer.invoke('bp:importPipeline'),

  winMinimize: () => ipcRenderer.invoke('bp:winMinimize'),
  winMaximize: () => ipcRenderer.invoke('bp:winMaximize'),
  winClose: () => ipcRenderer.invoke('bp:winClose'),
  winIsMaximized: () => ipcRenderer.invoke('bp:winIsMaximized'),
  onMaximizeChange: (cb) => {
    ipcRenderer.on('bp:maximizeChange', (_e, state) => cb(state));
  },
});
