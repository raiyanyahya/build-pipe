import BP from './state.js';

export function initDragDrop({ onSave, onRender }) {
  const steps = document.querySelectorAll('.st-step');
  let draggedIndex = -1;

  steps.forEach((step, idx) => {
    step.addEventListener('dragstart', e => {
      draggedIndex = idx;
      step.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    });

    step.addEventListener('dragend', () => {
      step.classList.remove('dragging');
      document.querySelectorAll('.st-step').forEach(s => s.classList.remove('drag-over'));
      draggedIndex = -1;
    });

    step.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex !== idx) {
        step.classList.add('drag-over');
      }
    });

    step.addEventListener('dragleave', () => {
      step.classList.remove('drag-over');
    });

    step.addEventListener('drop', e => {
      e.preventDefault();
      step.classList.remove('drag-over');
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(fromIndex) && fromIndex !== idx) {
        moveStep(fromIndex, idx, onSave, onRender);
      }
    });
  });
}

function moveStep(fromIndex, toIndex, onSave, onRender) {
  const steps = BP.stairsCurrent.steps;
  if (fromIndex < 0 || fromIndex >= steps.length || toIndex < 0 || toIndex >= steps.length) return;
  BP.pushUndo();
  const [moved] = steps.splice(fromIndex, 1);
  steps.splice(toIndex, 0, moved);
  onSave();
  onRender();
}
