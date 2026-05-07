import { stEl } from './utils.js';
import BP from './state.js';

const THEME_MODELS = {
  openai: 'gpt-5.4-mini',
  anthropic: 'claude-sonnet-4-6',
};

const THEME_LIST = ['dark', 'ocean', 'forest', 'sunset', 'midnight', 'light', 'cream'];

function providerFor(model) {
  return /^claude-/.test(model) ? 'anthropic' : 'openai';
}

export function initSettings() {
  stEl('stSettingsBtn')?.addEventListener('click', () => {
    stEl('stSettingsPanel').classList.remove('hidden');
    loadSettings();
  });

  stEl('stSettingsClose')?.addEventListener('click', () => {
    stEl('stSettingsPanel').classList.add('hidden');
  });

  stEl('stSettingsOverlay')?.addEventListener('click', () => {
    stEl('stSettingsPanel').classList.add('hidden');
  });

  stEl('stAiProvider')?.addEventListener('change', () => {
    const provider = stEl('stAiProvider').value;
    const defaultModel = THEME_MODELS[provider] || 'gpt-5.4-mini';
    stEl('stDefaultModel').placeholder = defaultModel;
    stEl('stDefaultModel').value = defaultModel;
  });

  stEl('stApiKeyToggle')?.addEventListener('click', () => {
    const input = stEl('stApiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  stEl('stApiKeySave')?.addEventListener('click', async () => {
    const provider = stEl('stAiProvider').value;
    const key = stEl('stApiKey').value.trim();
    const model = stEl('stDefaultModel').value.trim() || (THEME_MODELS[provider] || 'gpt-5.4-mini');
    const status = stEl('stSettingsStatus');

    try {
      if (key) {
        await window.buildpipe.setApiKey(key, provider);
      }
      await window.buildpipe.setModelSetting(model);
      if (BP.theme) {
        await window.buildpipe.setThemeSetting(BP.theme);
      }
      status.textContent = 'Settings saved successfully.';
      status.className = 'st-settings-status success';
      status.classList.remove('hidden');
      stEl('stApiKey').value = '';
      setTimeout(() => status.classList.add('hidden'), 3000);
    } catch (e) {
      status.textContent = `Error: ${e.message}`;
      status.className = 'st-settings-status error';
      status.classList.remove('hidden');
    }
  });

  THEME_LIST.forEach(theme => {
    stEl(`stTheme-${theme}`)?.addEventListener('click', () => selectTheme(theme));
  });
}

function selectTheme(theme) {
  BP.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.st-theme-preset').forEach(el => el.classList.remove('active'));
  stEl(`stTheme-${theme}`)?.classList.add('active');
}

async function loadSettings() {
  const model = await window.buildpipe.getModelSetting();
  const provider = model ? providerFor(model) : 'openai';
  const defaultModel = THEME_MODELS[provider] || 'gpt-5.4-mini';
  const validModel = (model && Object.values(THEME_MODELS).includes(model)) ? model : defaultModel;

  stEl('stAiProvider').value = provider;

  const hasKey = await window.buildpipe.hasKey(provider);
  stEl('stApiKey').value = '';
  stEl('stApiKey').placeholder = hasKey ? `Key is set for ${provider}` : 'sk-...';

  stEl('stDefaultModel').placeholder = defaultModel;
  stEl('stDefaultModel').value = validModel;

  const theme = await window.buildpipe.getThemeSetting();
  if (theme && THEME_LIST.includes(theme)) {
    selectTheme(theme);
  }
}
