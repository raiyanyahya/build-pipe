let transform = { x: 0, y: 80, scale: 0.85 };
let container = null;
let isPanning = false;
let start = { x: 0, y: 0 };
let startTransform = { x: 0, y: 0 };

function applyTransform() {
  if (!container) return;
  const nodes = container.querySelector('.st-canvas-nodes');
  const svg = container.querySelector('.st-canvas-svg');
  const t = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
  if (nodes) nodes.style.transform = t;
  if (svg) svg.style.transform = t;
}

export function initCanvas(ct) {
  if (container) {
    container.removeEventListener('mousedown', onMouseDown);
    container.removeEventListener('wheel', onWheel);
  }
  container = ct;
  container.addEventListener('mousedown', onMouseDown);
  container.addEventListener('wheel', onWheel, { passive: false });
  applyTransform();
}

function onMouseDown(e) {
  if (e.target.closest('.st-node')) return;
  isPanning = true;
  start = { x: e.clientX, y: e.clientY };
  startTransform = { x: transform.x, y: transform.y };
  if (container) container.style.cursor = 'grabbing';
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onMouseUp);
}

function onMouseMove(e) {
  if (!isPanning) return;
  transform.x = startTransform.x + (e.clientX - start.x);
  transform.y = startTransform.y + (e.clientY - start.y);
  applyTransform();
}

function onMouseUp() {
  isPanning = false;
  if (container) container.style.cursor = '';
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('blur', onMouseUp);
}

function onWheel(e) {
  e.preventDefault();
  const rect = container.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const zoom = e.deltaY < 0 ? 1.08 : 1 / 1.08;
  const ns = Math.min(2.2, Math.max(0.35, transform.scale * zoom));
  transform.x = mx - (mx - transform.x) * (ns / transform.scale);
  transform.y = my - (my - transform.y) * (ns / transform.scale);
  transform.scale = ns;
  applyTransform();
}

export function destroyCanvas() {
  if (container) {
    container.removeEventListener('mousedown', onMouseDown);
    container.removeEventListener('wheel', onWheel);
    container.style.cursor = '';
  }
  container = null;
  isPanning = false;
  transform = { x: 0, y: 80, scale: 0.85 };
}

export function zoomIn() {
  transform.scale = Math.min(2.2, transform.scale * 1.15);
  applyTransform();
}

export function zoomOut() {
  transform.scale = Math.max(0.35, transform.scale / 1.15);
  applyTransform();
}

export function fitToView(nodeElements) {
  if (!container || !nodeElements || !nodeElements.length) return;
  const rects = Array.from(nodeElements).map(n => {
    const r = n.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    return { left: r.left - cr.left, top: r.top - cr.top, width: r.width, height: r.height };
  });
  const minX = Math.min(...rects.map(r => r.left));
  const maxX = Math.max(...rects.map(r => r.left + r.width));
  const minY = Math.min(...rects.map(r => r.top));
  const maxY = Math.max(...rects.map(r => r.top + r.height));
  const cw = container.offsetWidth;
  const ch = container.offsetHeight;
  const cWidth = maxX - minX + 120;
  const cHeight = maxY - minY + 120;
  transform.scale = Math.min(1, cw / cWidth, ch / cHeight);
  transform.x = (cw / 2) - ((minX + (cWidth - 120) / 2) * transform.scale);
  transform.y = (ch / 2) - ((minY + (cHeight - 120) / 2) * transform.scale);
  applyTransform();
}

