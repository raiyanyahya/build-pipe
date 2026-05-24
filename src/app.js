import BP from './modules/state.js';
import { stLoadAll } from './modules/render.js';
import { initEvents } from './modules/events.js';
import { initSettings } from './modules/settings.js';
import { stInitLog } from './modules/log.js';
import { stRenderDashboard } from './modules/dashboard.js';
import { initUpdateCheck } from './modules/update.js';

function initTitlebar() {
  document.getElementById('winMinimize')?.addEventListener('click', () => window.buildpipe.winMinimize());
  document.getElementById('winMaximize')?.addEventListener('click', () => window.buildpipe.winMaximize());
  document.getElementById('winClose')?.addEventListener('click', () => window.buildpipe.winClose());

  const maxBtn = document.getElementById('winMaximize');
  if (maxBtn) {
    window.buildpipe.onMaximizeChange(state => {
      maxBtn.innerHTML = state
        ? '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0" y="0" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="3.5" y="3.5" width="6" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="1 0.5"/></svg>'
        : '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
    });
  }
}

async function applySavedTheme() {
  try {
    const theme = await window.buildpipe.getThemeSetting();
    if (theme) {
      BP.theme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      document.querySelectorAll('.st-theme-preset').forEach(el => el.classList.remove('active'));
      document.getElementById(`stTheme-${theme}`)?.classList.add('active');
    }
  } catch {}
}

document.addEventListener('DOMContentLoaded', async () => {
  await applySavedTheme();
  initTitlebar();
  initEvents();
  initSettings();
  stInitLog();
  await stLoadAll();
  stRenderDashboard();
  // Check for a newer release shortly after launch, off the critical path.
  setTimeout(() => initUpdateCheck(), 3000);
});