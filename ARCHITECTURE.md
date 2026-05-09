# Architecture

System-level patterns and boundaries. Pair with ADRs in [`doc/adr/`](doc/adr/) for individual decisions.

## Overview

Single-binary Node CLI that installs operational skills (`AGENTS.md` / `ARCHITECTURE.md` / ADR / task / `DESIGN.md` / skill / subagent / drift / fresh-context review) into a target project's agent surface (`.claude/skills/`, `.claude/agents/`, `.agents/skills/`). Phase 1 (this CLI) does filesystem work only — detect, copy, append. Phase 2 (the installed skills) runs inside Claude Code or Codex CLI and produces the actual artifacts via the agent's native conversational UI ([ADR-0002](doc/adr/0002-two-phase-architecture.md)). Runtime deps: `commander` (arg parsing), `@clack/prompts` (TUI). Distributed on npm as `@alexandrealvaro/agentic` (current dist-tag: `beta`, version `0.2.0-beta.1`).

## Layers & Boundaries

Three execution layers under `src/`, plus kit content read at runtime:

* `bin/agentic.js` — shebang shim. Imports `run` from `src/index.js`, forwards `process.argv`. Catches errors, prints `agentic: <message>`, exits 1.
* `src/index.js` — Commander setup. Defines commands and options, dispatches to `src/commands/<name>.js`. No business logic.
* `src/commands/<name>.js` — command actions. Currently only `init.js`: validate flags → detect (mode, agents, features) → TUI (interactive only) → install loop (per agent) → root doc append → result panel.
* `src/lib/<name>.js` — pure helpers. `detect.js` reads filesystem signals; `install.js` copies skill source to target with idempotency + manifest-based subagent routing; `rootdoc.js` appends or refreshes a managed `Skills installed by agentic` section in the project's root AGENTS.md or CLAUDE.md.

Kit content lives under `src/skills/<agent>/<skill>/` and is read at runtime by `src/lib/install.js` only:

* `src/skills/claude-code/<skill>/SKILL.md` — Markdown body, Anthropic Skills frontmatter, optional `manifest.json` declaring sibling-tree subagent files, optional `agents/<subagent>.md` files routed to `.claude/agents/`.
* `src/skills/codex/<skill>/SKILL.md` plus `agents/openai.yaml` — XML body + minimal frontmatter (cc-sdd convention), per [ADR-0001](doc/adr/0001-skills-mode-for-claude-and-codex.md).
* `templates/`, `prompts/` — kit-shipped baselines for the manual paste-into-agent flow. Not loaded at runtime by the installer; only mentioned by the README's `Manual prompts` section.
* `doc/adr/`, `doc/tasks/`, `WORKFLOW.md`, `AGENTS.md`, `ARCHITECTURE.md` — kit documentation. Not loaded at runtime.

Boundary rule: only `src/lib/install.js` resolves `KIT_ROOT`-rooted paths (`import.meta.url` → `..`). Layers above never read `src/skills/` directly. AGENTS.md gotcha §89 documents the fragility (moving `install.js` breaks the path).

## Patterns

* **Mode detection:** filesystem-driven. `detectMode(dir)` returns `audit | greenfield | brownfield` from presence of `AGENTS.md` and count of meaningful entries (filtered by `TRIVIAL_ENTRIES` + dotfile prefix). `detectAgents(dir)` returns `['claude-code'?, 'codex'?]` from `.claude/` and `.agents/`. `detectFeatures(dir)` returns `{ frontend, hasClaudeCode, hasCodex }` — frontend signal layered cheap-to-expensive (manifest deps → tailwind/tokens → bounded recursive jsx scan with skip-dir guards).
* **Skill installation:** `installSkills({ cwd, agents, skills, confirmReplace })` walks each skill source tree, byte-compares against the target file (idempotency), and copies if missing. Divergent target → `confirmReplace` callback decides; default is skip. An optional `manifest.json` at the skill root declares files that route to `<layout.agentsDir>/<basename>` instead of the default `<layout.skillsDir>/<skill>/<rel>` path; manifest itself is never installed; declared paths must exist in source or the installer throws. Codex layout has no `agentsDir` (no subagent primitive) — manifest-listed subagents are silently skipped on Codex.
* **Per-(skill, agent) selection:** `init.js` calls `installSkills` once per agent with the skills filtered to those whose source exists for that agent. `REQUIRED_SKILLS` is universal (always installed); `CONDITIONAL_SKILLS` carries `autoIf(features) → bool` predicates and per-skill `agents: [...]` availability. Non-interactive (`--yes` or `--agent`) installs auto-true conditionals. Interactive shows a multi-select pre-checked per the auto-true set; user toggles.
* **Root doc handling:** after the install loop, `updateRootDoc({ cwd, skills, confirmAppend })` looks for `AGENTS.md` (preferred) or `CLAUDE.md` (fallback). Absent → no-op. Section already present and fresh → unchanged. Section present and stale → rewritten in place; bytes outside the markers preserved. Section absent + `confirmAppend(path) === true` → appended at EOF. Markers: `<!-- agentic-managed-skills:start -->` / `:end -->`.
* **Interactive vs non-interactive:** `init` runs the TUI when `process.stdout.isTTY && !opts.yes && !opts.agent`. `--agent claude-code|codex|both` and `--yes` both bypass the TUI. Interactive cancellations are explicit (`p.isCancel(value)` → `p.cancel(...)` → return).
* **Output dispatch:** TUI uses `@clack/prompts` panels (`p.intro`, `p.note`, `p.outro`); non-interactive writes per-file action lines to `stderr` so `stdout` stays parseable.
* **Input validation:** Commander parses args; `init` enforces an enum guard on `--agent` via `AGENT_FLAG_VALUES`. No schema library — the option surface is a single string enum and a boolean.
* **Error handling:** thrown errors bubble to `bin/agentic.js`, which prints `agentic: <message>` and exits 1. No try/catch inside command logic, except `loadManifest` which wraps `JSON.parse` to give a useful message on malformed manifest.
* **Workflow-operational vs spec-driven skills:** ([ADR-0007](doc/adr/0007-workflow-operational-skills.md)) `agentic-philosophy` and `agentic-review` are workflow-operational (execute a process from `WORKFLOW.md`); the other eight are spec-driven (produce a documentation artifact). The category is informational; the install path is the same. `agentic-review` ships with a bundled subagent at `.claude/agents/fresh-context-reviewer.md` via the manifest mechanism.

## Naming Conventions

* ES modules (`"type": "module"` in `package.json`). Built-in imports use the `node:` prefix (`node:fs`, `node:path`, `node:url`).
* Files: kebab-case (`init.js`, `detect.js`, `install.js`, `rootdoc.js`).
* Exports: camelCase functions (`detectMode`, `detectAgents`, `detectFeatures`, `installSkills`, `updateRootDoc`, `initCommand`).
* Skill names: `agentic-<verb-or-noun>` (`agentic-bootstrap`, `agentic-architecture`, `agentic-review`).
* Agent values: lowercase strings (`'claude-code' | 'codex' | 'both'`).

## Observability

* Logs: `process.stderr.write(...)` for per-file action lines in non-interactive flows; `@clack/prompts` panels interactively. No structured logging.
* Metrics: N/A — short-lived CLI, no telemetry ([Open question §200 in `doc/v0.2-cli-plan.md`](doc/v0.2-cli-plan.md)).
* Traces: N/A.

## Deployment Topology

Published on npm as `@alexandrealvaro/agentic` (`beta` dist-tag, version `0.2.0-beta.1` after Task 0005 publish). Consumers run `npx @alexandrealvaro/agentic@beta init` or install globally. No server, no daemon, no scheduled jobs. `engines.node = ">=18"`. Package contents declared by `package.json#files`: `bin/`, `src/`, `templates/`, `prompts/`, `WORKFLOW.md`, `README.md`, `LICENSE`. `prepublishOnly` runs `npm test` (CLI `--help` smoke + `node --test test/*.test.js`).

Test layout: `test/lib.test.js` (unit — `detectMode`, `detectAgents`, `detectFeatures`, `installSkills`, `updateRootDoc`), `test/init.test.js` (integration — spawns the CLI in `mktemp` directories), `test/skills.test.js` (static — parses every `SKILL.md` frontmatter, every Codex `agents/openai.yaml`, every manifest-listed subagent file). 74 tests at v0.2.0-beta.1.

## Active ADRs

Currently-binding decisions. Link each to `doc/adr/`.

* [ADR-0001](doc/adr/0001-skills-mode-for-claude-and-codex.md) — Skills mode for both Claude Code and Codex
* [ADR-0002](doc/adr/0002-two-phase-architecture.md) — Two-phase architecture (CLI install + agent skills)
* [ADR-0003](doc/adr/0003-tui-with-clack-prompts.md) — `@clack/prompts` as the CLI's TUI
* [ADR-0004](doc/adr/0004-file-based-task-tracking.md) — File-based per-task tracking with markdown checklists
* [ADR-0005](doc/adr/0005-universal-agent-behavior-as-skill.md) — Universal Agent Behavior lives in an `agentic-philosophy` skill, not in `AGENTS.md`
* [ADR-0006](doc/adr/0006-architecture-md-at-repo-root.md) — `ARCHITECTURE.md` lives at the repo root (matklad convention)
* [ADR-0007](doc/adr/0007-workflow-operational-skills.md) — Workflow-operational skills as a parallel category to spec-driven skills

## Decisions to revisit (ADR candidates, not yet written)

Flagged here so they don't drift. Not yet ADRs.

* **Boundary rule** — `src/lib/install.js` as sole owner of `KIT_ROOT` reads. Becomes binding once a second `src/lib/*` module also needs kit access.
* **stderr = action log** — observable contract for piping (`agentic init --agent both --yes 2> install.log`). Promote to ADR if external automation depends on the format.
* **Manifest schema** — `manifest.json` currently carries only `subagents: string[]`. If future workflow-operational skills need additional sibling-tree targets (hooks, templates, etc.), the schema grows. Keep the addition in a single ADR rather than ad-hoc fields.
