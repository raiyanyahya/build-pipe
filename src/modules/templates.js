import { stUid, escapeHtml } from './utils.js';
import BP from './state.js';

const TEMPLATES = [
  // ── Originals (with stable IDs so chaining works) ───────────────────────────
  {
    name: 'Morning Dev Briefing',
    desc: 'GitHub trending + system info → AI briefing → save to file',
    icon: '🌅',
    tags: ['ai', 'http', 'file'],
    steps: [
      { id: 'fetch_trending_repos', type: 'http', label: 'Fetch trending repos', config: { method: 'GET', url: 'https://api.github.com/search/repositories?q=stars:>10000&sort=updated&per_page=5', body: '' } },
      { id: 'system_snapshot',      type: 'code', label: 'System snapshot',      config: { command: 'printf "Date: $(date)\\nHost: $(hostname)\\nUptime: $(uptime)"' } },
      { id: 'write_briefing',       type: 'ai',   label: 'Write briefing',       config: { prompt: 'Write a 100-word morning dev briefing.\n\nTrending repos:\n{{fetch_trending_repos.output}}\n\nSystem:\n{{system_snapshot.output}}', system: 'You are a sharp, no-fluff tech analyst.' } },
      { id: 'save_briefing',        type: 'file', label: 'Save briefing',        config: { operation: 'write', path: '~/.buildpipe/briefing.md', content: '# Morning Briefing — {{date}}\n\n{{write_briefing.output}}' } },
    ],
  },
  {
    name: 'HN Top Stories Digest',
    desc: 'Fetch HN top stories → summarise with AI → save digest',
    icon: '📰',
    tags: ['http', 'ai', 'file'],
    steps: [
      { id: 'fetch_hn',       type: 'http', label: 'Fetch HN top stories', config: { method: 'GET', url: 'https://hacker-news.firebaseio.com/v0/topstories.json', body: '' } },
      { id: 'get_ids',        type: 'code', label: 'Get first 5 IDs',      config: { command: "echo '{{fetch_hn.output}}' | node -e \"const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d).slice(0,5).join('\\n'))\"" } },
      { id: 'summarise',      type: 'ai',   label: 'Summarise digest',     config: { prompt: "Create a brief digest of today's HN top story IDs: {{get_ids.output}}. Write what kind of stories these likely are.", system: 'You are a concise tech journalist.' } },
      { id: 'save_digest',    type: 'file', label: 'Save digest',          config: { operation: 'write', path: '~/.buildpipe/hn-digest.md', content: '# HN Digest — {{date}}\n\n{{summarise.output}}' } },
    ],
  },
  {
    name: 'File Backup',
    desc: 'Read a source file → timestamp it → write to backup location',
    icon: '💾',
    tags: ['file', 'code'],
    steps: [
      { id: 'read_source',       type: 'file', label: 'Read source',       config: { operation: 'read', path: '~/.buildpipe/source.txt', content: '' } },
      { id: 'timestamp_content', type: 'code', label: 'Timestamp content', config: { command: 'echo "Backup at $(date): {{read_source.output}}"' } },
      { id: 'write_backup',      type: 'file', label: 'Write backup',      config: { operation: 'write', path: '~/.buildpipe/backup.txt', content: '{{timestamp_content.output}}' } },
    ],
  },
  {
    name: 'Weather Briefing',
    desc: 'Fetch weather data → AI summary → system notification',
    icon: '🌤',
    tags: ['http', 'ai', 'notify'],
    steps: [
      { id: 'fetch_weather',      type: 'http',   label: 'Fetch weather',      config: { method: 'GET', url: 'https://wttr.in/?format=j1', body: '' } },
      { id: 'write_weather_brief',type: 'ai',     label: 'Write weather brief', config: { prompt: 'Summarise this weather JSON in 2 sentences for a commuter:\n{{fetch_weather.output}}', system: 'Be concise and friendly.' } },
      { id: 'send_notification',  type: 'notify', label: 'Send notification',   config: { title: 'Weather Today', message: '{{write_weather_brief.output}}', channel: 'system' } },
    ],
  },
  {
    name: 'GitHub Notifications',
    desc: 'List your GitHub notifications and summarise with AI',
    icon: '🔔',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'fetch_notifications', type: 'code', label: 'Fetch notifications', config: { command: 'curl -s -H "Authorization: token {{vars.GITHUB_TOKEN}}" https://api.github.com/notifications | head -c 3000' } },
      { id: 'summarise_notifs',    type: 'ai',   label: 'Summarise',           config: { prompt: 'Summarise these GitHub notifications. What needs attention?\n\n{{fetch_notifications.output}}', system: 'Be brief and actionable.' } },
      { id: 'save_notif_summary',  type: 'file', label: 'Save summary',        config: { operation: 'write', path: '~/.buildpipe/gh-notifications.md', content: '# GitHub Notifications — {{date}}\n\n{{summarise_notifs.output}}' } },
    ],
  },
  {
    name: 'Error Log Monitor',
    desc: 'Read a log file → check for errors → notify if found',
    icon: '🔍',
    tags: ['file', 'if', 'notify'],
    steps: [
      { id: 'read_log',      type: 'file',   label: 'Read log file',    config: { operation: 'read', path: '~/.buildpipe/app.log', content: '' } },
      { id: 'extract_errors',type: 'code',   label: 'Extract errors',   config: { command: 'printf "%s" "{{read_log.output}}" | grep -i "error" | tail -10 || echo ""' } },
      { id: 'check_errors',  type: 'if',     label: 'Check for errors', config: { value: '{{extract_errors.output}}', operator: 'not-empty', against: '', on_false: 'stop' } },
      { id: 'alert_errors',  type: 'notify', label: 'Alert on errors',  config: { title: 'Errors detected!', message: '{{extract_errors.output}}', channel: 'system' } },
    ],
  },
  {
    name: 'Daily Code Stats',
    desc: 'Git activity stats → AI summary → append to journal',
    icon: '📊',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'git_today',      type: 'code', label: 'Git activity today',  config: { command: 'git -C ~ log --oneline --since="1 day ago" --author="$(git config user.name)" 2>/dev/null | head -20 || echo "No commits today"' } },
      { id: 'files_changed',  type: 'code', label: 'Files changed',       config: { command: 'git -C ~ diff --stat HEAD~5 2>/dev/null | tail -5 || echo "No recent changes"' } },
      { id: 'write_summary',  type: 'ai',   label: 'Write daily summary', config: { prompt: 'Write a 3-bullet developer journal entry for today.\n\nCommits:\n{{git_today.output}}\n\nChanges:\n{{files_changed.output}}', system: 'Be constructive and motivating.' } },
      { id: 'append_journal', type: 'file', label: 'Append to journal',   config: { operation: 'append', path: '~/.buildpipe/dev-journal.md', content: '\n## {{date}}\n\n{{write_summary.output}}' } },
    ],
  },
  {
    name: 'Batch URL Checker',
    desc: 'Loop through URLs, check each one, save status report',
    icon: '🔗',
    tags: ['loop', 'code', 'file'],
    steps: [
      { id: 'define_urls',    type: 'code', label: 'Define URLs',    config: { command: "printf '[\"https://github.com\",\"https://news.ycombinator.com\",\"https://example.com\"]'" } },
      { id: 'check_each_url', type: 'loop', label: 'Check each URL', config: { items: '{{define_urls.output}}', step_type: 'code', command: 'curl -o /dev/null -s -w "%{http_code} {{_item.output}}" {{_item.output}}', max_items: 10, continue_on_error: '1' } },
      { id: 'save_url_report',type: 'file', label: 'Save report',    config: { operation: 'write', path: '~/.buildpipe/url-report.txt', content: 'URL Check Report — {{date}}\n\n{{check_each_url.output}}' } },
    ],
  },

  // ── Developer Productivity ───────────────────────────────────────────────────
  {
    name: 'Daily Standup Generator',
    desc: "Today's git commits → AI standup → save to file",
    icon: '🗣️',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'todays_commits',  type: 'code', label: "Today's commits",      config: { command: 'git log --oneline --since="24 hours ago" --author="$(git config user.name)" 2>/dev/null || echo "No commits"' } },
      { id: 'yesterdays_work', type: 'code', label: 'Check open PRs',       config: { command: 'gh pr list --author "@me" --state open --json title,url 2>/dev/null | head -c 1000 || echo "gh CLI not available"' } },
      { id: 'write_standup',   type: 'ai',   label: 'Write standup',        config: { prompt: 'Write a concise daily standup in 3 bullets: Yesterday, Today, Blockers.\n\nCommits:\n{{todays_commits.output}}\n\nOpen PRs:\n{{yesterdays_work.output}}', system: 'Be brief and professional. Max 80 words.' } },
      { id: 'save_standup',    type: 'file', label: 'Save standup',         config: { operation: 'append', path: '~/.buildpipe/standups.md', content: '\n## {{date}}\n\n{{write_standup.output}}\n' } },
    ],
  },
  {
    name: 'Changelog Entry Generator',
    desc: 'Git log since last tag → AI formats release notes → append to CHANGELOG',
    icon: '📋',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'git_log_since_tag', type: 'code', label: 'Git log since last tag', config: { command: 'git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~20")..HEAD --oneline 2>/dev/null | head -40 || git log --oneline -20' } },
      { id: 'format_changelog',  type: 'ai',   label: 'Format changelog',       config: { prompt: 'Format these commits as a clean changelog entry grouped into Added, Changed, Fixed, Removed sections. Use bullet points.\n\nCommits:\n{{git_log_since_tag.output}}', system: 'Write concise, user-facing changelog entries. No implementation details.' } },
      { id: 'append_changelog',  type: 'file', label: 'Append to CHANGELOG',    config: { operation: 'append', path: '~/CHANGELOG.md', content: '\n## [Unreleased] — {{date}}\n\n{{format_changelog.output}}\n' } },
    ],
  },
  {
    name: 'Code TODO Hunter',
    desc: 'Scan project for TODOs and FIXMEs → AI prioritizes → save report',
    icon: '✅',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'find_todos',    type: 'code', label: 'Find TODOs & FIXMEs', config: { command: 'grep -rn "TODO\\|FIXME\\|HACK\\|XXX" --include="*.js" --include="*.ts" --include="*.py" --include="*.go" . 2>/dev/null | head -50 || echo "No TODOs found"' } },
      { id: 'prioritize',    type: 'ai',   label: 'Prioritize TODOs',    config: { prompt: 'Analyze these code TODOs and FIXMEs. Group by priority (Critical, High, Low) and estimate effort.\n\n{{find_todos.output}}', system: 'Be pragmatic. Flag anything security-related as Critical.' } },
      { id: 'save_todo_rpt', type: 'file', label: 'Save TODO report',    config: { operation: 'write', path: '~/.buildpipe/todo-report.md', content: '# TODO Report — {{date}}\n\n{{prioritize.output}}' } },
    ],
  },
  {
    name: 'PR Description Writer',
    desc: 'Git diff vs main → AI writes PR description → save as draft',
    icon: '📝',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'git_diff',      type: 'code', label: 'Git diff vs main',    config: { command: 'git diff main...HEAD --stat 2>/dev/null | head -30; echo "---"; git log main..HEAD --oneline 2>/dev/null | head -15' } },
      { id: 'write_pr_desc', type: 'ai',   label: 'Write PR description', config: { prompt: 'Write a clear GitHub PR description with: Summary (2-3 sentences), Changes (bullet list), Testing notes.\n\nDiff:\n{{git_diff.output}}', system: 'Be concise and technical. Focus on what changed and why.' } },
      { id: 'save_pr_draft', type: 'file', label: 'Save PR draft',        config: { operation: 'write', path: '~/.buildpipe/pr-draft.md', content: '{{write_pr_desc.output}}' } },
    ],
  },
  {
    name: 'NPM Security Audit',
    desc: 'npm audit → AI analyzes risks → notify if critical issues found',
    icon: '🔒',
    tags: ['code', 'ai', 'notify'],
    steps: [
      { id: 'run_audit',      type: 'code',   label: 'Run npm audit',        config: { command: 'npm audit --json 2>/dev/null | head -c 3000 || echo "npm audit failed"' } },
      { id: 'analyze_audit',  type: 'ai',     label: 'Analyze vulnerabilities', config: { prompt: 'Analyze this npm audit output. List critical/high vulnerabilities, affected packages, and recommended fixes.\n\n{{run_audit.output}}', system: 'Be specific about severity. Flag anything that needs immediate attention.' } },
      { id: 'check_critical', type: 'if',     label: 'Check for criticals',  config: { value: '{{analyze_audit.output}}', operator: 'contains', against: 'critical', on_false: 'continue' } },
      { id: 'audit_notify',   type: 'notify', label: 'Alert on criticals',   config: { title: '⚠️ Critical npm vulnerabilities!', message: 'Run npm audit fix immediately. Check ~/.buildpipe/audit.md', channel: 'system' } },
    ],
  },
  {
    name: 'Stale Branch Report',
    desc: 'List merged git branches → AI flags stale ones → save cleanup list',
    icon: '🌿',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'list_branches',   type: 'code', label: 'List merged branches', config: { command: 'git branch --merged main 2>/dev/null | grep -v "main\\|master\\|\\*" | head -30 || echo "No merged branches"' } },
      { id: 'list_remote',     type: 'code', label: 'List remote branches', config: { command: 'git branch -r --merged main 2>/dev/null | grep -v "HEAD\\|main\\|master" | head -20 || echo "None"' } },
      { id: 'analyze_branches',type: 'ai',   label: 'Analyze branches',     config: { prompt: 'List these branches that are safe to delete (already merged). Format as shell commands.\n\nLocal:\n{{list_branches.output}}\n\nRemote:\n{{list_remote.output}}', system: 'Be conservative. Only suggest branches clearly safe to delete.' } },
      { id: 'save_branch_rpt', type: 'file', label: 'Save branch report',   config: { operation: 'write', path: '~/.buildpipe/stale-branches.md', content: '# Stale Branches — {{date}}\n\n{{analyze_branches.output}}' } },
    ],
  },
  {
    name: 'Commit Message Suggester',
    desc: 'Staged git diff → AI suggests 3 commit message options',
    icon: '💬',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'staged_diff',      type: 'code', label: 'Get staged diff',        config: { command: 'git diff --staged --stat 2>/dev/null; echo "---"; git diff --staged 2>/dev/null | head -100' } },
      { id: 'suggest_messages', type: 'ai',   label: 'Suggest commit messages', config: { prompt: 'Suggest 3 commit messages for this staged diff. Use conventional commits format (feat/fix/chore/refactor/docs). Vary from brief to descriptive.\n\n{{staged_diff.output}}', system: 'Follow conventional commits. Be specific about what changed.' } },
      { id: 'save_suggestions', type: 'file', label: 'Save suggestions',       config: { operation: 'write', path: '~/.buildpipe/commit-suggestions.txt', content: '{{suggest_messages.output}}' } },
    ],
  },
  {
    name: 'Package Update Report',
    desc: 'npm outdated → AI assesses update risk → save update plan',
    icon: '📦',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'npm_outdated',   type: 'code', label: 'Check outdated packages', config: { command: 'npm outdated --json 2>/dev/null | head -c 2000 || echo "{}"' } },
      { id: 'assess_updates', type: 'ai',   label: 'Assess update risk',      config: { prompt: 'Analyze these outdated npm packages. Classify each as: Safe to update (patch), Review needed (minor), Breaking risk (major). Prioritize.\n\n{{npm_outdated.output}}', system: 'Focus on security-sensitive packages first.' } },
      { id: 'save_update_rpt',type: 'file', label: 'Save update report',      config: { operation: 'write', path: '~/.buildpipe/update-report.md', content: '# Package Updates — {{date}}\n\n{{assess_updates.output}}' } },
    ],
  },
  {
    name: 'Docker Health Check',
    desc: 'Inspect running containers → AI assesses health → notify on issues',
    icon: '🐳',
    tags: ['code', 'ai', 'notify'],
    steps: [
      { id: 'docker_ps',      type: 'code',   label: 'List containers',    config: { command: 'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}" 2>/dev/null || echo "Docker not running"' } },
      { id: 'docker_stats',   type: 'code',   label: 'Container stats',    config: { command: 'docker stats --no-stream --format "{{.Name}}: CPU={{.CPUPerc}} MEM={{.MemUsage}}" 2>/dev/null | head -10 || echo "No stats"' } },
      { id: 'assess_health',  type: 'ai',     label: 'Assess health',      config: { prompt: 'Review these Docker container statuses and resource stats. Flag any issues (restarting containers, high memory/cpu).\n\nContainers:\n{{docker_ps.output}}\n\nStats:\n{{docker_stats.output}}', system: 'Be concise. Flag anything unhealthy or suspicious.' } },
      { id: 'docker_notify',  type: 'notify', label: 'Notify if issues',   config: { title: 'Docker Health', message: '{{assess_health.output}}', channel: 'system' } },
    ],
  },

  // ── System & DevOps ─────────────────────────────────────────────────────────
  {
    name: 'Disk Space Alert',
    desc: 'Check disk usage → alert if any partition over 80%',
    icon: '💽',
    tags: ['code', 'if', 'notify'],
    steps: [
      { id: 'check_disk',    type: 'code',   label: 'Check disk usage',   config: { command: "df -h | awk 'NR>1 && $5+0 > 80 {print $0}'" } },
      { id: 'disk_critical', type: 'if',     label: 'Any partition full?', config: { value: '{{check_disk.output}}', operator: 'not-empty', against: '', on_false: 'stop' } },
      { id: 'disk_alert',    type: 'notify', label: 'Disk space alert',   config: { title: '⚠️ Disk space critical!', message: '{{check_disk.output}}', channel: 'system' } },
    ],
  },
  {
    name: 'System Resource Snapshot',
    desc: 'CPU, memory, disk stats → AI health assessment → save report',
    icon: '🖥️',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'cpu_mem',      type: 'code', label: 'CPU & memory',      config: { command: 'echo "=== CPU ==="; top -bn1 | grep "Cpu(s)" || uptime; echo "=== Memory ==="; free -h 2>/dev/null || vm_stat 2>/dev/null | head -10' } },
      { id: 'disk_usage',   type: 'code', label: 'Disk usage',        config: { command: 'df -h | grep -v tmpfs | head -10' } },
      { id: 'assess_system',type: 'ai',   label: 'Assess system health', config: { prompt: 'Assess this system health snapshot. Flag any concerns (high CPU, low memory, full disks). Rate overall health as Good/Warning/Critical.\n\n{{cpu_mem.output}}\n\nDisk:\n{{disk_usage.output}}', system: 'Be brief and actionable.' } },
      { id: 'save_sysrpt',  type: 'file', label: 'Save report',       config: { operation: 'write', path: '~/.buildpipe/system-health.md', content: '# System Health — {{date}}\n\n{{assess_system.output}}' } },
    ],
  },
  {
    name: 'Process Memory Monitor',
    desc: 'Find top memory-consuming processes → AI identifies hogs → save report',
    icon: '🧠',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'top_procs',    type: 'code', label: 'Top processes by memory', config: { command: 'ps aux --sort=-%mem 2>/dev/null | head -15 || ps -o pid,rss,comm -m | head -15' } },
      { id: 'analyze_procs',type: 'ai',   label: 'Analyze memory usage',   config: { prompt: 'Review these processes sorted by memory usage. Identify any memory hogs or suspicious processes that should be investigated.\n\n{{top_procs.output}}', system: 'Be brief. Flag anything using more than 500MB as worth investigating.' } },
      { id: 'save_proc_rpt',type: 'file', label: 'Save process report',    config: { operation: 'write', path: '~/.buildpipe/process-report.md', content: '# Process Memory Report — {{date}}\n\n{{analyze_procs.output}}' } },
    ],
  },
  {
    name: 'SSL Certificate Checker',
    desc: 'Check SSL cert expiry for your domain → notify if expiring soon',
    icon: '🔐',
    tags: ['code', 'if', 'notify'],
    steps: [
      { id: 'check_ssl',     type: 'code',   label: 'Check SSL expiry',      config: { command: 'echo | openssl s_client -servername {{vars.DOMAIN}} -connect {{vars.DOMAIN}}:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null || echo "Could not check SSL"' } },
      { id: 'days_left',     type: 'code',   label: 'Days until expiry',     config: { command: 'expiry=$(echo | openssl s_client -servername {{vars.DOMAIN}} -connect {{vars.DOMAIN}}:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2); echo $(( ( $(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry" +%s 2>/dev/null) - $(date +%s) ) / 86400 )) days' } },
      { id: 'expiring_soon', type: 'if',     label: 'Check if expiring < 30d',config: { value: '{{days_left.output}}', operator: 'contains', against: '-', on_false: 'stop' } },
      { id: 'ssl_alert',     type: 'notify', label: 'SSL expiry alert',      config: { title: '⚠️ SSL Certificate Expiring!', message: '{{vars.DOMAIN}} — {{days_left.output}} remaining. Renew now!', channel: 'system' } },
    ],
  },
  {
    name: 'Log Error Spike Detector',
    desc: 'Count recent log errors → alert if spike above threshold',
    icon: '📈',
    tags: ['code', 'if', 'notify'],
    steps: [
      { id: 'count_errors',   type: 'code',   label: 'Count recent errors',   config: { command: 'grep -c -i "error\\|exception\\|fatal" {{vars.LOG_PATH}} 2>/dev/null || echo "0"' } },
      { id: 'recent_errors',  type: 'code',   label: 'Get recent error lines', config: { command: 'grep -i "error\\|exception\\|fatal" {{vars.LOG_PATH}} 2>/dev/null | tail -5 || echo "None"' } },
      { id: 'check_spike',    type: 'if',     label: 'Error count > 10?',     config: { value: '{{count_errors.output}}', operator: 'not-equals', against: '0', on_false: 'stop' } },
      { id: 'error_alert',    type: 'notify', label: 'Alert on spike',        config: { title: '🔴 Error spike detected', message: '{{count_errors.output}} errors in log. Latest: {{recent_errors.output}}', channel: 'system' } },
    ],
  },
  {
    name: 'Cron Job Auditor',
    desc: 'List all cron jobs → AI describes each one → save audit',
    icon: '⏰',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'list_crons',   type: 'code', label: 'List cron jobs',     config: { command: '(crontab -l 2>/dev/null; cat /etc/cron* 2>/dev/null) | grep -v "^#" | grep -v "^$" | head -30 || echo "No cron jobs"' } },
      { id: 'describe_crons',type: 'ai',  label: 'Describe each job',  config: { prompt: 'Explain what each of these cron jobs does in plain English. Include the schedule frequency.\n\n{{list_crons.output}}', system: 'Be brief. One line per job.' } },
      { id: 'save_cron_audit',type: 'file',label: 'Save cron audit',   config: { operation: 'write', path: '~/.buildpipe/cron-audit.md', content: '# Cron Job Audit — {{date}}\n\n{{describe_crons.output}}' } },
    ],
  },
  {
    name: 'Environment Variable Inventory',
    desc: 'List env vars → AI flags anything sensitive or misconfigured → save',
    icon: '🔑',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'list_env',    type: 'code', label: 'List env variables',  config: { command: 'env | grep -v "^_\\|LS_COLORS\\|LESS_TERMCAP" | sort | head -50' } },
      { id: 'audit_env',   type: 'ai',   label: 'Audit env vars',      config: { prompt: 'Review these environment variables. Flag: (1) keys that might contain sensitive values exposed in plaintext, (2) common misconfigurations, (3) anything unexpected.\n\n{{list_env.output}}', system: 'Mask any actual secret values in your response. Focus on patterns and risks.' } },
      { id: 'save_env_inv',type: 'file', label: 'Save inventory',      config: { operation: 'write', path: '~/.buildpipe/env-audit.md', content: '# Env Var Audit — {{date}}\n\n{{audit_env.output}}' } },
    ],
  },

  // ── AI-Powered Writing ───────────────────────────────────────────────────────
  {
    name: 'Meeting Notes Structurer',
    desc: 'Read raw meeting notes → AI organizes into decisions/actions → save',
    icon: '🗒️',
    tags: ['file', 'ai'],
    steps: [
      { id: 'read_raw_notes',    type: 'file', label: 'Read raw notes',          config: { operation: 'read', path: '~/.buildpipe/raw-notes.txt', content: '' } },
      { id: 'structure_notes',   type: 'ai',   label: 'Structure meeting notes', config: { prompt: 'Organize these meeting notes into: Attendees, Agenda items discussed, Key decisions made, Action items (with owner if mentioned), and Next steps.\n\n{{read_raw_notes.output}}', system: 'Be concise. Use bullet points. Do not add information not in the notes.' } },
      { id: 'save_meeting_notes',type: 'file', label: 'Save structured notes',  config: { operation: 'write', path: '~/.buildpipe/meeting-notes.md', content: '# Meeting Notes — {{date}}\n\n{{structure_notes.output}}' } },
    ],
  },
  {
    name: 'Code File Explainer',
    desc: 'Read a source file → AI explains it in plain English → save docs',
    icon: '📖',
    tags: ['file', 'ai'],
    steps: [
      { id: 'read_source_file', type: 'file', label: 'Read source file',  config: { operation: 'read', path: '{{vars.SOURCE_FILE}}', content: '' } },
      { id: 'explain_code',     type: 'ai',   label: 'Explain the code',  config: { prompt: 'Explain this code file clearly:\n1. What it does (2-3 sentences)\n2. Key functions/classes and their purpose\n3. Important patterns or gotchas\n4. How to use it\n\n{{read_source_file.output}}', system: 'Write for a developer who is new to this codebase. Be specific, not generic.' } },
      { id: 'save_explanation', type: 'file', label: 'Save explanation',  config: { operation: 'write', path: '~/.buildpipe/code-explanation.md', content: '# Code Explanation — {{date}}\n\n{{explain_code.output}}' } },
    ],
  },
  {
    name: 'Bug Report Analyzer',
    desc: 'Read error log or stack trace → AI diagnoses root cause → save analysis',
    icon: '🐛',
    tags: ['file', 'ai', 'file'],
    steps: [
      { id: 'read_error_log',   type: 'file', label: 'Read error log',      config: { operation: 'read', path: '~/.buildpipe/error.log', content: '' } },
      { id: 'diagnose_bug',     type: 'ai',   label: 'Diagnose root cause', config: { prompt: 'Analyze this error log or stack trace:\n1. Root cause\n2. Likely trigger\n3. Suggested fix (with code if applicable)\n4. How to prevent recurrence\n\n{{read_error_log.output}}', system: 'Be specific and technical. If you see a stack trace, trace it to the actual source.' } },
      { id: 'save_bug_analysis',type: 'file', label: 'Save bug analysis',   config: { operation: 'write', path: '~/.buildpipe/bug-analysis.md', content: '# Bug Analysis — {{date}}\n\n{{diagnose_bug.output}}' } },
    ],
  },
  {
    name: 'Weekly Project Summary',
    desc: "This week's git activity → AI executive summary → save report",
    icon: '📅',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'weekly_commits',  type: 'code', label: "This week's commits", config: { command: 'git log --oneline --since="7 days ago" 2>/dev/null | head -30 || echo "No commits this week"' } },
      { id: 'weekly_files',    type: 'code', label: 'Files changed',       config: { command: 'git diff --name-only HEAD~20 2>/dev/null | sort -u | head -20 || echo "No changes"' } },
      { id: 'write_weekly',    type: 'ai',   label: 'Write weekly summary', config: { prompt: 'Write a concise weekly project summary for a team update:\n- What was accomplished\n- Key changes made\n- What is in progress\n\nCommits:\n{{weekly_commits.output}}\n\nFiles touched:\n{{weekly_files.output}}', system: 'Write for a non-technical stakeholder. Keep it under 150 words.' } },
      { id: 'save_weekly',     type: 'file', label: 'Save weekly summary',  config: { operation: 'append', path: '~/.buildpipe/weekly-summaries.md', content: '\n## Week of {{date}}\n\n{{write_weekly.output}}\n' } },
    ],
  },
  {
    name: 'README Auto-Generator',
    desc: 'Describe your project → AI writes a complete README → save',
    icon: '📄',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'project_structure', type: 'code', label: 'Scan project structure', config: { command: 'find . -maxdepth 2 -not -path "*/node_modules/*" -not -path "*/.git/*" | head -40; echo "---"; cat package.json 2>/dev/null | head -20 || cat pyproject.toml 2>/dev/null | head -20 || echo "No package file"' } },
      { id: 'write_readme',      type: 'ai',   label: 'Write README',           config: { prompt: 'Write a complete, professional README.md for this project. Include: title, description, features, installation, usage examples, configuration, and contributing section.\n\nProject structure:\n{{project_structure.output}}', system: 'Write clean markdown. Be specific based on what you see. Include realistic code examples.' } },
      { id: 'save_readme',       type: 'file', label: 'Save README',            config: { operation: 'write', path: '~/README.md', content: '{{write_readme.output}}' } },
    ],
  },
  {
    name: 'SQL Query Optimizer',
    desc: 'Read a SQL query file → AI optimizes it → save optimized version',
    icon: '🗃️',
    tags: ['file', 'ai'],
    steps: [
      { id: 'read_query',       type: 'file', label: 'Read SQL query',    config: { operation: 'read', path: '~/.buildpipe/query.sql', content: '' } },
      { id: 'optimize_query',   type: 'ai',   label: 'Optimize the query', config: { prompt: 'Analyze and optimize this SQL query:\n1. Identify performance issues\n2. Suggest indexes if applicable\n3. Rewrite the optimized query\n4. Explain what you changed and why\n\n{{read_query.output}}', system: 'Be specific about the optimization techniques. Show the rewritten query clearly.' } },
      { id: 'save_optimized',   type: 'file', label: 'Save optimized query', config: { operation: 'write', path: '~/.buildpipe/query-optimized.sql', content: '-- Optimized {{date}}\n-- {{optimize_query.output}}' } },
    ],
  },

  // ── Data & Files ─────────────────────────────────────────────────────────────
  {
    name: 'JSON Formatter',
    desc: 'Read a JSON file → pretty-print it → write back formatted',
    icon: '{ }',
    tags: ['file', 'code'],
    steps: [
      { id: 'read_json',    type: 'file', label: 'Read JSON file',      config: { operation: 'read', path: '~/.buildpipe/data.json', content: '' } },
      { id: 'format_json',  type: 'code', label: 'Format JSON',         config: { command: "echo '{{read_json.output}}' | python3 -m json.tool 2>/dev/null || echo '{{read_json.output}}' | node -e \"process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))\"" } },
      { id: 'write_formatted',type:'file', label: 'Write formatted JSON', config: { operation: 'write', path: '~/.buildpipe/data-formatted.json', content: '{{format_json.output}}' } },
    ],
  },
  {
    name: 'CSV Data Summarizer',
    desc: 'Read a CSV file → AI analyzes the data → save insights',
    icon: '📉',
    tags: ['file', 'ai'],
    steps: [
      { id: 'read_csv',       type: 'file', label: 'Read CSV',          config: { operation: 'read', path: '~/.buildpipe/data.csv', content: '' } },
      { id: 'summarize_csv',  type: 'ai',   label: 'Summarize data',    config: { prompt: 'Analyze this CSV data:\n1. Describe what the data contains\n2. Key statistics (count, ranges, patterns)\n3. Notable trends or anomalies\n4. Data quality issues if any\n\n{{read_csv.output}}', system: 'Be analytical and specific. Format numbers clearly.' } },
      { id: 'save_csv_summary',type: 'file',label: 'Save summary',      config: { operation: 'write', path: '~/.buildpipe/csv-summary.md', content: '# CSV Analysis — {{date}}\n\n{{summarize_csv.output}}' } },
    ],
  },
  {
    name: 'Large File Finder',
    desc: 'Find files over 100MB in home directory → save report',
    icon: '🗂️',
    tags: ['code', 'file'],
    steps: [
      { id: 'find_large',     type: 'code', label: 'Find large files',   config: { command: 'find ~ -not -path "*/.*" -size +100M -exec ls -lh {} \\; 2>/dev/null | sort -k5 -rh | head -20 || echo "No large files found"' } },
      { id: 'disk_top_dirs',  type: 'code', label: 'Top directories',    config: { command: 'du -sh ~/Documents ~/Downloads ~/Desktop ~/Movies ~/Pictures 2>/dev/null | sort -rh | head -10' } },
      { id: 'save_large_rpt', type: 'file', label: 'Save report',        config: { operation: 'write', path: '~/.buildpipe/large-files.md', content: '# Large Files Report — {{date}}\n\n## Files over 100MB\n{{find_large.output}}\n\n## Top Directories\n{{disk_top_dirs.output}}' } },
    ],
  },
  {
    name: 'Directory Size Report',
    desc: 'Measure key directory sizes → AI identifies storage hogs → save',
    icon: '📁',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'dir_sizes',       type: 'code', label: 'Measure directories', config: { command: 'du -sh ~/* 2>/dev/null | sort -rh | head -20' } },
      { id: 'analyze_storage', type: 'ai',   label: 'Analyze storage',    config: { prompt: 'Review these directory sizes. Identify the biggest consumers and suggest what might be safe to clean up (caches, old downloads, duplicates, etc.).\n\n{{dir_sizes.output}}', system: 'Be specific and practical. Rank suggestions by potential space savings.' } },
      { id: 'save_dir_rpt',    type: 'file', label: 'Save report',        config: { operation: 'write', path: '~/.buildpipe/storage-report.md', content: '# Storage Report — {{date}}\n\n{{analyze_storage.output}}' } },
    ],
  },

  // ── APIs & Web ───────────────────────────────────────────────────────────────
  {
    name: 'Bitcoin Price Alert',
    desc: 'Fetch BTC price → check against your threshold → notify',
    icon: '₿',
    tags: ['http', 'code', 'notify'],
    steps: [
      { id: 'fetch_btc',       type: 'http',   label: 'Fetch BTC price',     config: { method: 'GET', url: 'https://api.coindesk.com/v1/bpi/currentprice.json', body: '' } },
      { id: 'extract_price',   type: 'code',   label: 'Extract USD price',   config: { command: "echo '{{fetch_btc.output}}' | node -e \"const d=require('fs').readFileSync('/dev/stdin','utf8');const p=JSON.parse(d).bpi.USD.rate;console.log('BTC: $'+p)\" 2>/dev/null || echo 'Parse failed'" } },
      { id: 'btc_notify',      type: 'notify', label: 'Send price alert',    config: { title: '₿ Bitcoin Price', message: '{{extract_price.output}}', channel: 'system' } },
    ],
  },
  {
    name: 'Website Uptime Monitor',
    desc: 'HTTP check your site → alert immediately if it goes down',
    icon: '🌐',
    tags: ['http', 'if', 'notify'],
    steps: [
      { id: 'check_site',    type: 'http',   label: 'Check website',      config: { method: 'GET', url: '{{vars.SITE_URL}}', body: '' } },
      { id: 'site_is_up',    type: 'if',     label: 'Is site responding?', config: { value: '{{check_site.output}}', operator: 'not-empty', against: '', on_false: 'stop' } },
      { id: 'downtime_alert',type: 'notify', label: 'Downtime alert',     config: { title: '🔴 Site Down!', message: '{{vars.SITE_URL}} is not responding. Check immediately!', channel: 'system' } },
    ],
  },
  {
    name: 'GitHub Repo Stats Tracker',
    desc: 'Fetch repo metrics → AI writes growth summary → save report',
    icon: '⭐',
    tags: ['http', 'ai', 'file'],
    steps: [
      { id: 'fetch_repo',      type: 'http', label: 'Fetch repo stats',    config: { method: 'GET', url: 'https://api.github.com/repos/{{vars.GITHUB_REPO}}', body: '' } },
      { id: 'fetch_commits',   type: 'http', label: 'Fetch recent commits', config: { method: 'GET', url: 'https://api.github.com/repos/{{vars.GITHUB_REPO}}/commits?per_page=5', body: '' } },
      { id: 'write_stats',     type: 'ai',   label: 'Write stats summary', config: { prompt: 'Summarize this GitHub repo\'s health and activity. Highlight stars, forks, watchers, open issues, and recent commit activity.\n\nRepo:\n{{fetch_repo.output}}\n\nRecent commits:\n{{fetch_commits.output}}', system: 'Be data-driven. Format numbers clearly.' } },
      { id: 'save_stats_rpt',  type: 'file', label: 'Save stats report',   config: { operation: 'append', path: '~/.buildpipe/repo-stats.md', content: '\n## {{date}}\n\n{{write_stats.output}}\n' } },
    ],
  },
  {
    name: 'Public IP Change Detector',
    desc: 'Fetch current public IP → compare to last known → notify if changed',
    icon: '🌍',
    tags: ['http', 'code', 'notify'],
    steps: [
      { id: 'fetch_ip',       type: 'http',   label: 'Fetch current IP',   config: { method: 'GET', url: 'https://api.ipify.org?format=json', body: '' } },
      { id: 'compare_ip',     type: 'code',   label: 'Compare to last IP', config: { command: "CURR=$(echo '{{fetch_ip.output}}' | grep -o '\"ip\":\"[^\"]*\"' | cut -d'\"' -f4); LAST=$(cat ~/.buildpipe/last-ip.txt 2>/dev/null || echo ''); echo \"$CURR\" > ~/.buildpipe/last-ip.txt; if [ \"$CURR\" != \"$LAST\" ]; then echo \"IP changed: $LAST → $CURR\"; else echo \"same\"; fi" } },
      { id: 'ip_changed',     type: 'if',     label: 'Did IP change?',     config: { value: '{{compare_ip.output}}', operator: 'contains', against: 'changed', on_false: 'stop' } },
      { id: 'ip_notify',      type: 'notify', label: 'Notify IP change',   config: { title: '🌍 Public IP Changed', message: '{{compare_ip.output}}', channel: 'system' } },
    ],
  },
  {
    name: 'Reddit Subreddit Digest',
    desc: 'Fetch hot posts from a subreddit → AI summarizes → save digest',
    icon: '👾',
    tags: ['http', 'ai', 'file'],
    steps: [
      { id: 'fetch_reddit',   type: 'http', label: 'Fetch hot posts',     config: { method: 'GET', url: 'https://www.reddit.com/r/{{vars.SUBREDDIT}}/hot.json?limit=10', body: '' } },
      { id: 'summarize_posts',type: 'ai',   label: 'Summarize top posts', config: { prompt: "Summarize the top posts from this Reddit JSON. List each post title with a one-line description of what it's about.\n\n{{fetch_reddit.output}}", system: 'Be concise. Extract just the titles and scores from the JSON.' } },
      { id: 'save_reddit_digest',type:'file',label: 'Save digest',        config: { operation: 'write', path: '~/.buildpipe/reddit-digest.md', content: '# r/{{vars.SUBREDDIT}} Digest — {{date}}\n\n{{summarize_posts.output}}' } },
    ],
  },
  {
    name: 'Slack Daily Digest Poster',
    desc: 'Collect system + git info → AI formats → POST to Slack',
    icon: '💬',
    tags: ['code', 'ai', 'http'],
    steps: [
      { id: 'collect_info',   type: 'code', label: 'Collect daily info',  config: { command: 'echo "Commits today: $(git log --oneline --since=\\"today\\" 2>/dev/null | wc -l | tr -d \' \')"; echo "Disk free: $(df -h / | tail -1 | awk \'{print $4}\')"; echo "Uptime: $(uptime | sed \'s/.*up //;s/,.*//\')"' } },
      { id: 'format_slack',   type: 'ai',   label: 'Format Slack message', config: { prompt: 'Format this info as a brief, friendly Slack team update. Use emoji sparingly. Keep it under 100 words.\n\n{{collect_info.output}}', system: 'Sound like a helpful team bot, not a robot.' } },
      { id: 'post_to_slack',  type: 'http', label: 'Post to Slack',       config: { method: 'POST', url: '{{vars.SLACK_WEBHOOK}}', body: '{"text":"{{format_slack.output}}"}' } },
    ],
  },
  {
    name: 'OpenAI API Usage Checker',
    desc: 'Fetch OpenAI usage stats → AI summarizes spend → save report',
    icon: '🤖',
    tags: ['http', 'ai', 'file'],
    steps: [
      { id: 'fetch_usage',    type: 'http', label: 'Fetch usage data',    config: { method: 'GET', url: 'https://api.openai.com/v1/usage?date={{date}}', body: '' } },
      { id: 'analyze_usage',  type: 'ai',   label: 'Analyze usage',       config: { prompt: 'Summarize this OpenAI API usage data. Break down by model, token counts, and estimate cost if possible.\n\n{{fetch_usage.output}}', system: 'Be specific about numbers. Flag any unusually high usage.' } },
      { id: 'save_usage_rpt', type: 'file', label: 'Save usage report',   config: { operation: 'append', path: '~/.buildpipe/api-usage.md', content: '\n## {{date}}\n\n{{analyze_usage.output}}\n' } },
    ],
  },
  {
    name: 'GitHub Actions Status Check',
    desc: 'Fetch CI run status for your repo → notify on failures',
    icon: '⚙️',
    tags: ['http', 'if', 'notify'],
    steps: [
      { id: 'fetch_ci',       type: 'http',   label: 'Fetch CI runs',      config: { method: 'GET', url: 'https://api.github.com/repos/{{vars.GITHUB_REPO}}/actions/runs?per_page=3', body: '' } },
      { id: 'check_failure',  type: 'code',   label: 'Check for failures', config: { command: "echo '{{fetch_ci.output}}' | grep -o '\"conclusion\":\"[^\"]*\"' | grep -v '\"success\"\\|\"skipped\"' | head -3 || echo 'all good'" } },
      { id: 'has_failure',    type: 'if',     label: 'Any failures?',      config: { value: '{{check_failure.output}}', operator: 'not-equals', against: 'all good', on_false: 'stop' } },
      { id: 'ci_alert',       type: 'notify', label: 'CI failure alert',   config: { title: '❌ CI Failed', message: '{{vars.GITHUB_REPO}} — {{check_failure.output}}', channel: 'system' } },
    ],
  },
  {
    name: 'Network Port Scanner',
    desc: 'Check which local ports are in use → save report',
    icon: '📡',
    tags: ['code', 'file'],
    steps: [
      { id: 'open_ports',     type: 'code', label: 'List open ports',     config: { command: 'ss -tlnp 2>/dev/null | grep LISTEN || lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null | head -20 || netstat -tlnp 2>/dev/null | grep LISTEN | head -20' } },
      { id: 'interesting_ports',type:'code', label: 'Filter known ports',  config: { command: 'echo "Listening services:"; echo "{{open_ports.output}}" | grep -E "80|443|3000|4000|5000|5432|6379|8080|8443|27017|3306" || echo "No common dev ports in use"' } },
      { id: 'save_ports_rpt', type: 'file', label: 'Save port report',    config: { operation: 'write', path: '~/.buildpipe/ports.txt', content: 'Port Scan — {{date}}\n\n{{open_ports.output}}\n\n{{interesting_ports.output}}' } },
    ],
  },
  {
    name: 'API Endpoint Health Check',
    desc: 'Loop through your API endpoints → check each one → report failures',
    icon: '🏥',
    tags: ['loop', 'http', 'file'],
    steps: [
      { id: 'define_endpoints',type: 'code', label: 'Define endpoints',    config: { command: 'printf \'["https://httpbin.org/get","https://httpbin.org/status/200","https://httpbin.org/status/200"]\'' } },
      { id: 'check_endpoints', type: 'loop', label: 'Check each endpoint', config: { items: '{{define_endpoints.output}}', step_type: 'http', command: '{{_item.output}}', max_items: 20, continue_on_error: '1' } },
      { id: 'save_health_rpt', type: 'file', label: 'Save health report',  config: { operation: 'write', path: '~/.buildpipe/api-health.md', content: '# API Health Report — {{date}}\n\n{{check_endpoints.output}}' } },
    ],
  },
  {
    name: 'Dependency License Checker',
    desc: 'List npm package licenses → AI flags non-permissive ones → save report',
    icon: '⚖️',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'list_licenses',  type: 'code', label: 'List package licenses', config: { command: 'npx license-checker --summary 2>/dev/null | head -40 || cat node_modules/*/package.json 2>/dev/null | grep \'"license"\' | sort | uniq -c | sort -rn | head -20' } },
      { id: 'audit_licenses', type: 'ai',   label: 'Audit licenses',        config: { prompt: 'Review these npm package licenses. Flag any that might be problematic for commercial use (GPL, AGPL, LGPL, proprietary). Mark MIT/Apache/BSD as safe.\n\n{{list_licenses.output}}', system: 'Be practical. List any license that needs legal review.' } },
      { id: 'save_lic_rpt',   type: 'file', label: 'Save license report',   config: { operation: 'write', path: '~/.buildpipe/license-report.md', content: '# License Audit — {{date}}\n\n{{audit_licenses.output}}' } },
    ],
  },
  {
    name: 'AI Code Reviewer',
    desc: 'Git diff of recent commits → AI performs code review → save feedback',
    icon: '🔬',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'get_diff',       type: 'code', label: 'Get recent diff',      config: { command: 'git diff HEAD~3 HEAD -- "*.js" "*.ts" "*.py" "*.go" 2>/dev/null | head -200 || echo "No recent changes"' } },
      { id: 'review_code',    type: 'ai',   label: 'Review the code',      config: { prompt: 'Perform a code review of these changes. Check for:\n- Bugs or logic errors\n- Security vulnerabilities\n- Performance issues\n- Code style and maintainability\n- Missing error handling\n\nProvide specific, actionable feedback.\n\n{{get_diff.output}}', system: 'Be a rigorous but fair code reviewer. Be specific — reference line numbers where possible.' } },
      { id: 'save_review',    type: 'file', label: 'Save code review',     config: { operation: 'write', path: '~/.buildpipe/code-review.md', content: '# Code Review — {{date}}\n\n{{review_code.output}}' } },
    ],
  },
  {
    name: 'Markdown Blog Publisher',
    desc: 'Read draft post → AI polishes prose → save final version',
    icon: '✍️',
    tags: ['file', 'ai'],
    steps: [
      { id: 'read_draft',     type: 'file', label: 'Read blog draft',      config: { operation: 'read', path: '~/.buildpipe/blog-draft.md', content: '' } },
      { id: 'polish_post',    type: 'ai',   label: 'Polish the post',      config: { prompt: 'Polish this blog post draft:\n1. Fix grammar and flow\n2. Strengthen the opening hook\n3. Ensure clear structure with headers\n4. Add a strong conclusion with CTA\n5. Keep the author\'s voice intact\n\n{{read_draft.output}}', system: 'Improve without over-editing. Preserve the author\'s personality and technical accuracy.' } },
      { id: 'save_final_post',type: 'file', label: 'Save final post',      config: { operation: 'write', path: '~/.buildpipe/blog-final.md', content: '{{polish_post.output}}' } },
    ],
  },
  {
    name: 'Infrastructure Cost Estimator',
    desc: 'Describe your stack → AI estimates monthly cloud costs → save report',
    icon: '💰',
    tags: ['code', 'ai', 'file'],
    steps: [
      { id: 'collect_infra',  type: 'code', label: 'Collect infra info',   config: { command: 'echo "=== Docker Containers ==="; docker ps --format "{{.Names}} {{.Image}}" 2>/dev/null || echo "n/a"; echo "=== System ==="; nproc 2>/dev/null; free -h 2>/dev/null | head -2' } },
      { id: 'estimate_costs', type: 'ai',   label: 'Estimate cloud costs', config: { prompt: 'Based on this local infrastructure profile, estimate equivalent monthly AWS/GCP/Azure costs. Provide a cost breakdown by service (compute, storage, network).\n\n{{collect_infra.output}}', system: 'Use current cloud pricing. Give a range (low/high estimate). Be specific about which instance types you are pricing.' } },
      { id: 'save_cost_rpt',  type: 'file', label: 'Save cost estimate',   config: { operation: 'write', path: '~/.buildpipe/cost-estimate.md', content: '# Cloud Cost Estimate — {{date}}\n\n{{estimate_costs.output}}' } },
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
                <div class="bp-tmpl-name">${escapeHtml(t.name)}</div>
                <div class="bp-tmpl-desc">${escapeHtml(t.desc)}</div>
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
  // Build old→new ID map so intra-template {{id.output}} references stay valid
  const idMap = {};
  tmpl.steps.forEach(s => { if (s.id) idMap[s.id] = stUid(); });

  const steps = tmpl.steps.map(s => {
    const newId = idMap[s.id] || stUid();
    const config = {};
    for (const [k, v] of Object.entries(s.config || {})) {
      config[k] = typeof v === 'string'
        ? v.replace(/\{\{([^.}]+)\.output\}\}/g, (m, old) => idMap[old] ? `{{${idMap[old]}.output}}` : m)
        : v;
    }
    return { ...s, id: newId, config };
  });

  BP.stairsCurrent = {
    id: stUid(), name: tmpl.name, steps,
    status: 'draft', created: new Date().toISOString(),
    runCount: 0, successRuns: 0,
  };
  BP.stairsOutputs = {};

  await window.buildpipe.saveStaircase(BP.stairsCurrent);

  const { stLoadAll, stRenderCanvas } = await import('./render.js');
  const { showEditor } = await import('./utils.js');
  await stLoadAll();
  showEditor();

  const nameEl = document.getElementById('stName');
  if (nameEl) nameEl.value = BP.stairsCurrent.name;
  document.getElementById('stDraftBadge')?.classList.remove('hidden');
  document.getElementById('stPublishedBadge')?.classList.add('hidden');
  stRenderCanvas();
}
