import { stEl, escapeHtml } from './utils.js';

const DISMISS_KEY = 'bp_dismissed_update';

// Ask the main process whether a newer release exists and, if so (and the user
// hasn't already dismissed that exact version), show the update banner.
export async function initUpdateCheck() {
  let info;
  try {
    info = await window.buildpipe.checkForUpdate();
  } catch {
    return; // fail-silent — never let an update check disrupt the app
  }
  if (!info?.updateAvailable || !info.latest) return;

  // Defensive validation: only render a clean major.minor.patch string.
  if (!/^\d+\.\d+\.\d+$/.test(info.latest)) return;

  let dismissed = null;
  try { dismissed = localStorage.getItem(DISMISS_KEY); } catch {}
  if (dismissed === info.latest) return;

  showBanner(info.latest);
}

function showBanner(latest) {
  const banner = stEl('bpUpdateBanner');
  if (!banner) return;

  banner.innerHTML = `
    <span class="bp-update-icon">↑</span>
    <span class="bp-update-text">buildpipe <strong>v${escapeHtml(latest)}</strong> is available</span>
    <button class="bp-update-view" type="button">View</button>
    <button class="bp-update-dismiss" type="button" title="Dismiss">✕</button>`;
  banner.classList.remove('hidden');

  banner.querySelector('.bp-update-view').addEventListener('click', () => {
    window.buildpipe.openReleasesPage();
  });
  banner.querySelector('.bp-update-dismiss').addEventListener('click', () => {
    try { localStorage.setItem(DISMISS_KEY, latest); } catch {}
    banner.classList.add('hidden');
    banner.innerHTML = '';
  });
}
