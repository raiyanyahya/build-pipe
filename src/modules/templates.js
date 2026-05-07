import { stUid } from './utils.js';
import BP from './state.js';

const TEMPLATES = [
  {
    name: 'Morning Dev Briefing',
    desc: 'GitHub trending + system info → AI briefing → save to file',
    icon: '🌅',
    tags: ['ai', 'http', 'file'],
    steps: [
      { type: 'http', label: 'Fetch trending repos', config: { method: 'GET', url: 'https://api.github.com/search/repositories?q=stars:>10000&sort=updated&per_page=5', body: '' } },
      { type: 'code', label: 'System snapshot', config: { command: 'printf "Date: $(date)\\nHost: $(hostname)\\nUptime: $(uptime)"' } },
      { type: 'ai',   label: 'Write briefing', config: { prompt: 'Write a 100-word morning dev briefing.\n\nTrending repos:\n{{fetch_trending_repos.output}}\n\nSystem:\n{{system_snapshot.output}}', system: 'You are a sharp, no-fluff tech analyst.' } },
      { type: 'file', label: 'Save briefing', config: { operation: 'write', path: '~/.buildpipe/briefing.md', content: '# Morning Briefing — {{date}}\n\n{{write_briefing.output}}' } },
    ],
  },
  {
    name: 'HN Top Stories Digest',
    desc: 'Fetch HN top stories → summarise with AI → save digest',
    icon: '📰',
    tags: ['http', 'ai', 'file'],
    steps: [
      { type: 'http', label: 'Fetch HN top stories', config: { method: 'GET', url: 'https://hacker-news.firebaseio.com/v0/topstories.json', body: '' } },
      { type: 'code', label: 'Get first 5 IDs', config: { command: 'echo \'{{fetch_hn_top_stories.output}}\' | node -e "const d=require(\'fs\').readFileSync(\'/dev/stdin\',\'utf8\');console.log(JSON.parse(d).slice(0,5).join(\'\\n\'))"' } },
      { type: 'ai',   label: 'Summarise digest', config: { prompt: 'Create a brief digest of today\'s HN top story IDs: {{get_first_5_ids.output}}. Write what kind of stories these likely are based on the ID range and timing.', system: 'You are a concise tech journalist.' } },
      { type: 'file', label: 'Save digest', config: { operation: 'write', path: '~/.buildpipe/hn-digest.md', content: '# HN Digest — {{date}}\n\n{{summarise_digest.output}}' } },
    ],
  },
  {
    name: 'File Backup',
    desc: 'Read a source file → transform → write to backup location',
    icon: '💾',
    tags: ['file', 'code'],
    steps: [
      { type: 'file', label: 'Read source', config: { operation: 'read', path: '~/.buildpipe/source.txt', content: '' } },
      { type: 'code', label: 'Timestamp content', config: { command: 'echo "Backup at $(date): {{read_source.output}}"' } },
      { type: 'file', label: 'Write backup', config: { operation: 'write', path: '~/.buildpipe/backup.txt', content: '{{timestamp_content.output}}' } },
    ],
  },
  {
    name: 'Weather Briefing',
    desc: 'Fetch weather data → generate morning briefing with AI',
    icon: '🌤',
    tags: ['http', 'ai', 'notify'],
    steps: [
      { type: 'http', label: 'Fetch weather', config: { method: 'GET', url: 'https://wttr.in/?format=j1', body: '' } },
      { type: 'ai',   label: 'Write weather brief', config: { prompt: 'Summarise this weather JSON in 2 sentences for a commuter:\n{{fetch_weather.output}}', system: 'Be concise and friendly.' } },
      { type: 'notify', label: 'Send notification', config: { title: 'Weather Today', message: '{{write_weather_brief.output}}', channel: 'system' } },
    ],
  },
  {
    name: 'GitHub Notifications',
    desc: 'List your GitHub notifications and summarise with AI',
    icon: '🔔',
    tags: ['code', 'ai', 'file'],
    steps: [
      { type: 'code', label: 'Fetch notifications', config: { command: 'curl -s -H "Authorization: token {{vars.GITHUB_TOKEN}}" https://api.github.com/notifications | head -c 3000' } },
      { type: 'ai',   label: 'Summarise', config: { prompt: 'Summarise these GitHub notifications. What needs attention?\n\n{{fetch_notifications.output}}', system: 'Be brief and actionable.' } },
      { type: 'file', label: 'Save summary', config: { operation: 'write', path: '~/.buildpipe/gh-notifications.md', content: '# GitHub Notifications — {{date}}\n\n{{summarise.output}}' } },
    ],
  },
  {
    name: 'Error Log Monitor',
    desc: 'Read a log file → check for errors → notify if found',
    icon: '🔍',
    tags: ['file', 'if', 'notify'],
    steps: [
      { type: 'file', label: 'Read log file', config: { operation: 'read', path: '~/.buildpipe/app.log', content: '' } },
      { type: 'code', label: 'Extract errors', config: { command: 'echo "{{read_log_file.output}}" | grep -i "error" | tail -10 || echo ""' } },
      { type: 'if',   label: 'Check for errors', config: { value: '{{extract_errors.output}}', operator: 'not-empty', against: '', on_false: 'stop' } },
      { type: 'notify', label: 'Alert on errors', config: { title: 'Errors detected!', message: '{{extract_errors.output}}', channel: 'system' } },
    ],
  },
  {
    name: 'Daily Code Stats',
    desc: 'Git activity stats → AI summary → append to journal',
    icon: '📊',
    tags: ['code', 'ai', 'file'],
    steps: [
      { type: 'code', label: 'Git activity today', config: { command: 'git -C ~ log --oneline --since="1 day ago" --author="$(git config user.name)" 2>/dev/null | head -20 || echo "No commits today"' } },
      { type: 'code', label: 'Files changed', config: { command: 'git -C ~ diff --stat HEAD~5 2>/dev/null | tail -5 || echo "No recent changes"' } },
      { type: 'ai',   label: 'Write daily summary', config: { prompt: 'Write a 3-bullet developer journal entry for today.\n\nCommits:\n{{git_activity_today.output}}\n\nChanges:\n{{files_changed.output}}', system: 'Be constructive and motivating.' } },
      { type: 'file', label: 'Append to journal', config: { operation: 'append', path: '~/.buildpipe/dev-journal.md', content: '\n## {{date}}\n\n{{write_daily_summary.output}}' } },
    ],
  },
  {
    name: 'Batch URL Checker',
    desc: 'Loop through URLs, check each one, report status',
    icon: '🔗',
    tags: ['loop', 'code', 'file'],
    steps: [
      { type: 'code', label: 'Define URLs', config: { command: 'printf \'["https://github.com","https://news.ycombinator.com","https://example.com"]\'' } },
      { type: 'loop', label: 'Check each URL', config: { items: '{{define_urls.output}}', step_type: 'code', command: 'curl -o /dev/null -s -w "%{http_code} {{_item.output}}" {{_item.output}}', max_items: 10, continue_on_error: '1' } },
      { type: 'file', label: 'Save report', config: { operation: 'write', path: '~/.buildpipe/url-report.txt', content: 'URL Check Report — {{date}}\n\n{{check_each_url.output}}' } },
    ],
  },
];

export function stShowTemplatesModal() {
  const existing = document.querySelector('.bp-templates-modal');
  if (existing) { existing.remove(); return; }

  const modal = document.createElement('div');
  modal.className = 'bp-templates-modal';
  modal.innerHTML = `
    <div class="bp-modal-backdrop"></div>
    <div class="bp-modal-card bp-templates-card">
      <div class="bp-modal-hdr">
        <div class="bp-modal-icon type-template">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </div>
        <div class="bp-modal-title">Pipeline Templates</div>
        <button class="bp-modal-close">✕</button>
      </div>
      <div class="bp-modal-body bp-templates-body">
        <div class="bp-templates-grid">
          ${TEMPLATES.map((t, i) => `
            <button class="bp-template-card" data-idx="${i}">
              <div class="bp-tmpl-icon">${t.icon}</div>
              <div class="bp-tmpl-body">
                <div class="bp-tmpl-name">${t.name}</div>
                <div class="bp-tmpl-desc">${t.desc}</div>
                <div class="bp-tmpl-tags">${t.tags.map(tag => `<span class="bp-tmpl-tag type-${tag}">${tag}</span>`).join('')}</div>
              </div>
              <div class="bp-tmpl-steps">${t.steps.length} steps</div>
            </button>`).join('')}
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  const close = () => { modal.classList.remove('visible'); setTimeout(() => modal.remove(), 200); };
  modal.querySelector('.bp-modal-backdrop').addEventListener('click', close);
  modal.querySelector('.bp-modal-close').addEventListener('click', close);

  modal.querySelectorAll('.bp-template-card').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tmpl = TEMPLATES[parseInt(btn.dataset.idx)];
      if (!tmpl) return;
      await cloneTemplate(tmpl);
      close();
    });
  });
}

async function cloneTemplate(tmpl) {
  const ids = {};
  const steps = tmpl.steps.map(s => {
    const id = stUid();
    ids[s.label.toLowerCase().replace(/\s+/g, '_')] = id;
    return { ...s, id, config: { ...s.config } };
  });

  BP.stairsCurrent = {
    id: stUid(), name: tmpl.name, steps,
    status: 'draft', created: new Date().toISOString(),
    runCount: 0, successRuns: 0,
  };
  BP.stairsOutputs = {};

  await window.buildpipe.saveStaircase(BP.stairsCurrent);

  const { stLoadAll, stRenderCanvas } = await import('./render.js');
  const { showEditor } = await import('./dashboard.js');
  await stLoadAll();
  showEditor();

  const nameEl = document.getElementById('stName');
  if (nameEl) nameEl.value = BP.stairsCurrent.name;
  document.getElementById('stDraftBadge')?.classList.remove('hidden');
  document.getElementById('stPublishedBadge')?.classList.add('hidden');
  stRenderCanvas();
}
