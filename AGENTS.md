# AGENTS.md

## Project Overview

`@alexandrealvaro/agentic` — a CLI + manual-prompt kit that bootstraps and audits AGENTS.md, ARCHITECTURE.md, ADRs, tasks, skills, and subagents for engineering production code with LLMs. Status: v0.2 in development on `cli` (skill installer); v0.1.0-beta on npm (prompt printer).

**Quality bar:** docs read primarily by agents must be agent-comprehensible (terse, structured, no fluff); docs read by humans must be readable. Code: simple, secure, mature — right-sized for a CLI, no over-engineering.

**Stack:** Node.js ≥18, ESM, plain JavaScript. Deps: `commander` (CLI), `@clack/prompts` (TUI). No DB, no build step, no framework.
**Entry points:** `bin/agentic.js` (npm bin) → `src/index.js` (commander wiring) → `src/commands/<verb>.js`. Today: only `init`. Skill source under `src/skills/<agent>/<skill>/`, copied into the target's `.claude/skills/` or `.agents/skills/` at install time.

## Setup, Build, Test

```bash
npm install
node bin/agentic.js init                  # or: npm start
node bin/agentic.js init --agent both -y  # non-interactive
npm test                                  # CLI --help smoke + node:test suite under test/
```

Lint, formatter, CI: not yet wired.

## Quality Gates

Deterministic gates today: `npm test` (CLI `--help` smoke + `test/lib.test.js` unit + `test/init.test.js` integration via `node --test`). Lint, format, CI hooks not yet wired.

## Code Style

* ESM only (`"type": "module"`). Never `require()`.
* Named exports, no default exports.
* 2-space indent, single quotes, semicolons (matches `src/index.js`, `src/commands/init.js`).
* `node:` prefix for Node built-ins (`node:fs`, `node:path`, `node:url`).

## Architectural Principles

Binding decisions — see `doc/adr/`. Do not reinvent.

* **Two-phase architecture** ([ADR-0002](doc/adr/0002-two-phase-architecture.md)): CLI handles filesystem only; agents handle content via skills. CLI never interviews for content; skills never set up filesystem.
* **Skills, not slash commands** ([ADR-0001](doc/adr/0001-skills-mode-for-claude-and-codex.md)): `.claude/skills/agentic-<name>/SKILL.md` for Claude Code; `.agents/skills/agentic-<name>/SKILL.md` + `agents/openai.yaml` for Codex.
* **TUI = `@clack/prompts` only** ([ADR-0003](doc/adr/0003-tui-with-clack-prompts.md)). Always check `isCancel` after each prompt. Bypass TUI when `!process.stdout.isTTY`, or when `--agent` or `--yes` is passed.
* **Per-task markdown files** ([ADR-0004](doc/adr/0004-file-based-task-tracking.md)): `doc/tasks/NNNN-<slug>.md`. LLM edits = checkbox toggles + append-only Notes. Never rewrite existing sections.
* **Universal Agent Behavior lives in `agentic-philosophy` skill, not in `AGENTS.md`** ([ADR-0005](doc/adr/0005-universal-agent-behavior-as-skill.md)). Do not bundle generic agent advice into per-project output.
* **Bootstrap flow is scan-first, not interview-first** ([Task 0006](doc/tasks/0006-bootstrap-flow-and-agents-md-bloat-fix.md)): pre-fill from repo signals, ask only the gaps.
* **Idempotent on re-run** for filesystem ops (ADR-0002).
* **Operational docs at repo root** ([ADR-0006](doc/adr/0006-architecture-md-at-repo-root.md)): `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `WORKFLOW.md` at root. ADRs and tasks under `doc/`.
* **Workflow-operational skill category** ([ADR-0007](doc/adr/0007-workflow-operational-skills.md)): skills come in two categories — `spec-driven` (produces an artifact) and `workflow-operational` (executes a process from `WORKFLOW.md`). First workflow-operational skill: `agentic-review`. Each new workflow-operational skill needs its own ADR.

## Repository Layout

```
bin/agentic.js                       npm bin entry (#!/usr/bin/env node)
src/index.js                         commander program wiring
src/commands/<verb>.js               one file per CLI command (today: init.js)
src/lib/                             pure helpers (detect.js, install.js)
src/skills/<agent>/<skill>/          skill source — copied into target's
                                     .claude/skills/ or .agents/skills/ at install
templates/                           manual templates shipped to npm
prompts/                             manual paste-into-agent prompts shipped to npm
test/*.test.js                       unit + integration suite (node:test)
doc/adr/NNNN-<slug>.md               binding ADRs (Nygard format)
doc/tasks/NNNN-<slug>.md             task tracking (ADR-0004)
ARCHITECTURE.md                      system-level patterns (pairs with ADRs)
WORKFLOW.md                          philosophy doc, shipped to npm
```

Binding ADRs: 0001-0007, all accepted. Skill source lives under `src/skills/`; the kit does not self-install into its own `.claude/skills/` (would duplicate the source). The full skill set lands across [Task 0002](doc/tasks/0002-foundation-and-bootstrap-skill.md) (bootstrap), [Task 0003](doc/tasks/0003-universal-skills.md) (universal spec-driven skills), [Task 0007](doc/tasks/0007-workflow-operational-skills-and-agentic-review.md) (`agentic-review` + workflow-operational category), and [Task 0004](doc/tasks/0004-conditional-skills-and-discovery.md) (`agentic-design`, `agentic-subagent`, `agentic-skill` + `detectFeatures()`).

## Commit & PR Conventions

* **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `build:`, `ci:`). Imperative subject. Body explains *why* when non-obvious.
* **Branches:** `main` = stable promotion target. `cli` = active dev (functions like `develop`); beta releases publish from here. Feature branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`.
* **PRs require:** green CI (once wired), self-review, link to task/ADR when applicable.
* **Never push directly to `main` or `cli`.** Always PR.

## Security & Privacy

* **Secrets:** `.env` (gitignored, never committed). Currently holds `NPMJS_TOKEN` consumed manually for `npm publish`.
* **Files agent must not read or modify:** `.env`, `.env.local`, `.npmrc`, `node_modules/`.
* **Data classification:** no user data, no PII. CLI is offline, no network calls, no telemetry.
* **Pre-approved commands (no prompt):** `node bin/agentic.js *`, `npm test`, `npm start`, `npm install`, `git status|diff|log|show`, `gh pr|issue view`.
* **MCP servers approved:** none.
* **Never bypass quality gates** (`--no-verify`, deleted failing tests, hooks skipped) once wired.

## Gotchas

Real traps confirmed in code or ADRs.

* **Kit content ships via `package.json#files`.** Adding a directory under `src/skills/`, `templates/`, or `prompts/` does nothing for npm consumers unless its top-level dir is listed. Verify with `npm pack --dry-run` after touching the file list.
* **ESM only.** `"type": "module"` — `require()` will crash. Use `import`. Built-ins via `node:` prefix.
* **Skill source is read at install time** from disk via `src/lib/install.js` (`KIT_ROOT` resolves up two from `src/lib/`). Moving `src/lib/install.js` breaks that path.
* **`detectMode` ignores dotfiles + a fixed `TRIVIAL_ENTRIES` set** (`src/lib/detect.js`). Adding a new "trivial" file (e.g., `.editorconfig`) without updating that set will misclassify a project as `brownfield`.
* **Non-TTY bypasses TUI** (`src/commands/init.js`). `--agent` and `--yes` also force non-interactive. Don't add a prompt that runs unconditionally.
* **Chunk 3 scope:** the full skill set is wired — seven universal (`agentic-bootstrap`, `agentic-philosophy`, `agentic-architecture`, `agentic-adr`, `agentic-task`, `agentic-audit`, `agentic-review`) plus three conditional (`agentic-design` auto-installs when `detectFeatures().frontend` is true, `agentic-subagent` auto-installs for Claude Code targets, `agentic-skill` is opt-in only). Polish + npm publish in Chunk 4.
* **Idempotency contract:** `installSkills` byte-compares existing target files. A user-edited skill file diverges → `confirmReplace` callback decides. Default (non-interactive) skips. Don't break this default by silently overwriting.
* **Subagent install target:** a skill's `manifest.json` (optional) lists files that route to `.claude/agents/<basename>` instead of the default `.claude/skills/<skill>/...` path. `manifest.json` itself is never installed. Codex layout has no `agentsDir`; manifest-listed subagents are silently skipped on Codex (no subagent primitive). Currently used only by `agentic-review` (`agents/fresh-context-reviewer.md`).
* **Per-(skill, agent) install routing:** `init.js` calls `installSkills` once per agent with the skills that have source under `src/skills/<agent>/`. Don't add a skill to `CONDITIONAL_SKILLS` declaring `agents: ['claude-code', 'codex']` without confirming both source trees exist — `installSkills` throws on missing source by design (catches typos), so the per-agent filter in `init.js` is the safety net.
* **`.claude/agents/fresh-context-reviewer.md` is dogfood for ADR-0007.** This repo ships a *copy* of the subagent at `.claude/agents/` so the kit can use it on itself (Task tool dispatches by `subagent_type: 'fresh-context-reviewer'`). The skill source at `src/skills/claude-code/agentic-review/` is canonical — the `.claude/agents/` copy must stay byte-identical. If you edit the subagent, edit both.
