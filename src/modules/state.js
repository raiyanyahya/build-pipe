import { stEl } from './utils.js';

const BP = {};
export default BP;

BP.stairsCurrent = null;
BP.stairsRunning = false;
BP.stairsStop = false;
BP.stairsOutputs = {};
BP.viewMode = 'vertical';
BP.theme = 'dark';

let undoStack = [];
let redoStack = [];

BP.pushUndo = () => {
  if (!BP.stairsCurrent) return;
  undoStack.push(JSON.parse(JSON.stringify(BP.stairsCurrent)));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  BP.updateUndoButtons();
};

BP.undo = async () => {
  if (!undoStack.length) return;
  redoStack.push(JSON.parse(JSON.stringify(BP.stairsCurrent)));
  BP.stairsCurrent = undoStack.pop();
  BP.stairsOutputs = {};
  BP.updateUndoButtons();
  stEl('stName').value = BP.stairsCurrent.name || '';
  const published = BP.stairsCurrent.status === 'published';
  stEl('stDraftBadge').classList.toggle('hidden', published);
  stEl('stPublishedBadge').classList.toggle('hidden', !published);
  const { stRenderCanvas, stSave } = await import('./render.js');
  stRenderCanvas();
  stSave();
};

BP.redo = async () => {
  if (!redoStack.length) return;
  undoStack.push(JSON.parse(JSON.stringify(BP.stairsCurrent)));
  BP.stairsCurrent = redoStack.pop();
  BP.stairsOutputs = {};
  BP.updateUndoButtons();
  stEl('stName').value = BP.stairsCurrent.name || '';
  const published = BP.stairsCurrent.status === 'published';
  stEl('stDraftBadge').classList.toggle('hidden', published);
  stEl('stPublishedBadge').classList.toggle('hidden', !published);
  const { stRenderCanvas, stSave } = await import('./render.js');
  stRenderCanvas();
  stSave();
};

BP.setViewMode = async (mode) => {
  BP.viewMode = mode;
  document.querySelectorAll('.st-btn-view').forEach(b => b.classList.toggle('active', b.dataset.view === mode));
  const { stRenderCanvas } = await import('./render.js');
  stRenderCanvas();
};

BP.updateUndoButtons = () => {
  stEl('stUndoBtn')?.classList.toggle('hidden', !undoStack.length);
  stEl('stRedoBtn')?.classList.toggle('hidden', !redoStack.length);
};
