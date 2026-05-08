<p align="center">
  <img src="icon.png" width="80" alt="buildpipe logo" />
</p>

<h1 align="center">buildpipe</h1>

<p align="center">
  A local-first pipeline automation app for developers — powered by AI, running natively on your machine.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/built%20with-Electron-47848f?style=flat-square&logo=electron" />
  <img src="https://img.shields.io/badge/AI-OpenAI%20%7C%20Anthropic-8b5cf6?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-22c55e?style=flat-square" />
  <img src="https://img.shields.io/badge/version-1.0.0-f59e0b?style=flat-square" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js" />
  <a href="https://github.com/raiyanyahya/buildpipe/actions/workflows/ci.yml"><img src="https://github.com/raiyanyahya/buildpipe/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

---

## What is buildpipe?

**buildpipe** is a standalone desktop app that lets you compose, run, and automate multi-step developer workflows — without a cloud subscription, without YAML configs, and without leaving your machine.

Think of it as a local Zapier or n8n, built specifically for developers who want to chain shell commands, AI calls, HTTP requests, and file operations into reusable pipelines — then trigger them on a schedule, on a file change, or via webhook.

---

## Features

### Pipeline Editor

Build pipelines visually in either **List view** or **Flow (canvas) view**.

- Drag-and-drop step reordering in list view
- Free-form node positioning in canvas view with pan and zoom
- Inline editing of every step's configuration
- Undo / redo (Ctrl/⌘+Z)
- Draft and Published states
- Auto-save with debounce

---

### Step Types

Each step in a pipeline is one of the following types:

#### `CODE` — Shell command
Run any shell command on your machine. Output is captured and available to downstream steps.
```
command: curl https://api.github.com/events | head -5
```

#### `AI` — Language model call
Send a prompt to OpenAI or Anthropic and use the response downstream. Supports a system prompt.
```
prompt:  Summarise this: {{fetch_data.output}}
system:  You are a concise technical analyst.
```

#### `HTTP` — HTTP request
Make GET, POST, PUT, PATCH, or DELETE requests to any public URL.
```
method:  POST
url:     https://api.example.com/process
body:    {"input": "{{prev_step.output}}"}
```

#### `FILE` — File read / write / append
Read or write files anywhere in your home directory.
```
operation: write
path:      ~/notes/briefing.md
content:   {{ai_summary.output}}
```

#### `IF` — Conditional branch
Check the output of any previous step against a condition. Stop the pipeline or continue based on the result.

| Operator | Description |
|---|---|
| `contains` | Value includes the string |
| `not-contains` | Value does not include the string |
| `equals` | Exact match |
| `not-equals` | Not an exact match |
| `not-empty` | Value has content |
| `empty` | Value is blank |

On false: **Stop pipeline** or **Continue anyway**.

#### `LOOP` — Iterate over a list
Parse a JSON array (or newline-separated list) from a previous step and run a sub-step once per item. Use `{{_item.output}}` to reference the current item.
```
items:     {{fetch_urls.output}}
step_type: code
command:   curl -o /dev/null -s -w "%{http_code}" {{_item.output}}
max_items: 20
```

#### `NOTIFY` — Send a notification
Send a macOS/Linux system notification, or POST to a webhook (Slack, Discord, etc.).
```
channel: system
title:   Pipeline done
message: {{ai_summary.output}}
```
```
channel:     webhook
webhook_url: https://hooks.slack.com/...
message:     {{ai_summary.output}}
```

---

### Step Chaining

Any field in any step can reference the output of a previous step using `{{step_id.output}}`. The step ID is derived from the step's label.

```
{{fetch_repos.output}}     ← output of a step labelled "Fetch repos"
{{ai_summary.output}}      ← output of a step labelled "AI Summary"
{{_item.output}}           ← current loop item (inside a Loop step)
```

Built-in template variables:
```
{{date}}       ← today's date (YYYY-MM-DD)
{{timestamp}}  ← Unix timestamp
{{vars.KEY}}   ← a stored variable (see Variables)
```

---

### Error Handling

Every step has an **Error handling** section (collapsed by default):

| Option | Values |
|---|---|
| **Retry on error** | None · 1× · 2× · 3× (with exponential back-off) |
| **On failure** | Stop pipeline · Continue |

Retries use increasing delays (1s, 2s, 3s). The pipeline halts at the first failing step unless **Continue** is set.

---

### Triggers

Each pipeline can have one trigger that runs it automatically. Configure via **⚡ Triggers** in the editor.

#### Schedule (cron)
Run the pipeline every N minutes or daily. No external daemon required — the trigger lives inside the app.

| Option | Interval |
|---|---|
| Every 5 minutes | 5 min |
| Every 15 minutes | 15 min |
| Every 30 minutes | 30 min |
| Every hour | 60 min |
| Every 6 hours | 360 min |
| Daily | 1440 min |

#### File watch
Watch a file or directory. The pipeline runs 500ms after any change is detected (debounced).
```
path: ~/Documents/inbox/input.txt
```

#### Webhook
Expose a local HTTP endpoint. Send a `POST` request to fire the pipeline — useful for CI hooks, scripts, or other apps.
```
POST http://127.0.0.1:9876/run/<pipeline-id>
```
The port is configurable (default: `9876`). Listens on `127.0.0.1` only.

All triggers are persisted in `~/.buildpipe/triggers.json` and re-activated on each app launch.

---

### Variables Store

Store reusable values (API tokens, endpoints, usernames) and reference them in any step field with `{{vars.KEY}}`.

Manage variables in **Settings → Variables**. Stored as plain text in `~/.buildpipe/vars.json`.

```
{{vars.GITHUB_TOKEN}}    ← a stored token
{{vars.SLACK_WEBHOOK}}   ← a stored URL
{{vars.MY_USERNAME}}     ← any value
```

---

### Run History

Every pipeline run is saved to `~/.buildpipe/runs/` as a JSON file. Open the **⏱ History** panel in the editor to see:

- Run timestamp, status, and total duration
- Per-step: label, type, success/failure, output preview, and duration
- Up to 100 recent runs kept per pipeline

Click any run to expand the step-by-step breakdown.

---

### AI Build

Describe a pipeline in plain English and let the AI generate all the steps for you.

Click **✦ Build with AI** on the dashboard or in the editor. Type what the pipeline should do, or pick one of the built-in examples:

- Fetch top HN stories, summarise with AI, save to file
- Check GitHub notifications and draft a daily summary
- Pull weather data and generate a morning briefing
- Read a CSV, analyse trends with AI, export a report

The AI generates a structured JSON pipeline (name + steps with configs), which is immediately loaded into the editor ready to run.

---

### Pipeline Templates

Eight ready-made pipelines you can clone and customise in one click. Open **Templates** from the dashboard.

| Template | Description |
|---|---|
| 🌅 Morning Dev Briefing | GitHub trending repos + system info → AI briefing → file |
| 📰 HN Top Stories Digest | Hacker News top stories → AI summary → file |
| 💾 File Backup | Read → transform → write to backup path |
| 🌤 Weather Briefing | Fetch weather JSON → AI summary → system notification |
| 🔔 GitHub Notifications | `gh` notifications → AI summary → file |
| 🔍 Error Log Monitor | Read log file → check for errors (IF step) → notify |
| 📊 Daily Code Stats | Git log → git diff → AI journal entry → append |
| 🔗 Batch URL Checker | Loop over URL list → curl each → save report |

---

### AI Providers

buildpipe supports two AI providers, switchable in **Settings**.

| Provider | Default Model |
|---|---|
| OpenAI | `gpt-4o-mini` |
| Anthropic | `claude-sonnet-4-6` |

API keys are stored encrypted on disk using Electron's `safeStorage` (OS keychain-backed). Keys are never sent anywhere except the provider's own API.

The dashboard shows the current model and a green/amber indicator for whether a key is active.

---

### Themes

Seven built-in colour themes: **Dark** · **Ocean** · **Forest** · **Sunset** · **Midnight** · **Light** · **Cream**. Switch in Settings. Theme is persisted across sessions.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Install and run

```bash
git clone https://github.com/raiyanyahya/buildpipe.git
cd buildpipe
npm install
npm run dev
```

### Build a distributable

```bash
# macOS (DMG — x64 + arm64)
npm run dist:mac

# Linux (AppImage + .deb)
npm run dist:linux
```

Outputs land in the `dist/` directory.

---

## Data & Privacy

All data stays on your machine:

| Path | Contents |
|---|---|
| `~/.buildpipe/staircases/` | Pipeline JSON files |
| `~/.buildpipe/runs/` | Run history (one JSON per run) |
| `~/.buildpipe/logs/` | Run log text files |
| `~/.buildpipe/triggers.json` | Active trigger configuration |
| `~/.buildpipe/vars.json` | Global variables |
| `~/.buildpipe/settings.json` | Theme and model preference |
| `~/.buildpipe/openai_key.enc` | Encrypted OpenAI key |
| `~/.buildpipe/anthropic_key.enc` | Encrypted Anthropic key |

No telemetry. No cloud sync. No accounts.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘/Ctrl + Z` | Undo |
| `⌘/Ctrl + Shift + Z` | Redo |
| `⌘/Ctrl + Shift + R` | Run pipeline |
| `⌘/Ctrl + N` | New pipeline |
| `⌘/Ctrl + B` | Toggle AI Build bar |
| `⌘/Ctrl + Enter` | Submit in AI Build modal |

---

## Tech Stack

- **[Electron](https://electronjs.org)** — Native desktop shell
- **Vanilla JS (ES Modules)** — No framework, no bundler
- **CSS Custom Properties** — Theming system
- **Node.js built-ins** — `fs`, `http`, `child_process` for all I/O
- **Electron safeStorage** — OS-level key encryption

---

## License

MIT © [raiyanyahya](https://github.com/raiyanyahya)
