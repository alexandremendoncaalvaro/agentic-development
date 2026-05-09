# Architecture

System-level patterns and boundaries. Pair with ADRs in [`doc/adr/`](doc/adr/) for individual decisions.

## Overview

Single-binary Node CLI that scaffolds operational artifacts (`AGENTS.md`, `ARCHITECTURE.md`, ADRs, skills, subagents) for spec-driven LLM-assisted development. Phase 1 (this CLI) does filesystem and prompt rendering. Phase 2 (project-level skills, Tasks 0002/0003, not yet shipped) runs inside Claude Code and Codex CLI. Runtime deps: `commander` (arg parsing), `@clack/prompts` (TUI), `clipboardy` (clipboard write). Distributed on npm as `@alexandrealvaro/agentic` (current dist-tag: `beta`).

## Layers & Boundaries

Three execution layers under `src/`, plus kit content read at runtime:

* `bin/agentic.js` — shebang shim. Imports `run` from `src/index.js`, forwards `process.argv`. Catches errors, prints `agentic: <message>`, exits 1.
* `src/index.js` — Commander setup. Defines commands and options, dispatches to `src/commands/<name>.js`. No business logic.
* `src/commands/<name>.js` — command actions. `init.js` orchestrates: validate → detect → TUI (interactive only) → render → dispatch (clipboard / file / stdout).
* `src/lib/<name>.js` — pure functions. `detect.js` reads filesystem signals to pick a default mode; `render.js` assembles the prompt string from inlined kit templates.

Kit content lives outside `src/` and is read at runtime by `src/lib/render.js` only:

* `prompts/` — agent-facing instruction files.
* `templates/` — placeholder files inlined into prompts.
* `doc/adr/`, `doc/tasks/`, `WORKFLOW.md` — kit documentation. Not loaded at runtime.

Boundary rule: only `src/lib/render.js` resolves `KIT_ROOT`-rooted paths (`import.meta.url` → `..`). Layers above never read `prompts/` or `templates/` directly.

## Patterns

* **Mode detection:** filesystem-driven. `detectMode(dir)` in `src/lib/detect.js` returns `audit | greenfield | brownfield` based on presence of `AGENTS.md` and count of meaningful (non-trivial) entries. No flags, no env, no I/O beyond `readdirSync` + `existsSync`.
* **Prompt rendering:** single pure function `renderAgentsBootstrap({ mode })`. Reads kit files via `readKit(relativePath)`. Returns one string. Per-mode behaviour differentiated by two dictionaries (`MODE_CONTEXT`, `INSTRUCTIONS_BY_MODE`, `OUTPUT_INSTRUCTION_BY_MODE`) — not by branching inside instruction text. Required by the smoke test in `test/init-output.test.js`.
* **Interactive vs non-interactive:** `init` runs the TUI only when `process.stdout.isTTY` and no destination flag is set. `--copy`, `--stdout`, `--out` skip the TUI. `--mode` is validated and used directly when not `auto`.
* **Output dispatch:** three sinks — clipboard (`clipboardy`), file (`fs.writeFileSync` after `path.resolve`), stdout. Status messages go to stderr in non-interactive flows so stdout stays parseable.
* **Input validation:** Commander parses args; `init` enforces an enum guard on `--mode` via `VALID_MODES` in `src/commands/init.js`. No schema library — surface is one string enum and a few path strings, below the threshold where `zod` / `ajv` pay for themselves. The idiomatic next step when the option set grows is Commander's built-in `.choices()`.
* **Error handling:** thrown errors bubble to `bin/agentic.js`. No try/catch inside command logic. `@clack/prompts` cancellations are explicit (`p.isCancel(value)` → `p.cancel(...)` → return).

## Naming Conventions

* ES modules (`"type": "module"` in `package.json`). Built-in imports use the `node:` prefix (`node:fs`, `node:path`, `node:url`).
* Files: kebab-case (`init.js`, `detect.js`, `render.js`).
* Exports: camelCase functions (`renderAgentsBootstrap`, `detectMode`, `initCommand`).
* Mode values: lowercase strings (`'auto' | 'greenfield' | 'brownfield' | 'audit'`).

## Observability

* Logs: `process.stderr.write(...)` for status in non-interactive flows; `@clack/prompts` panels (`p.intro`, `p.note`, `p.outro`) interactively. No structured logging.
* Metrics: N/A — short-lived CLI.
* Traces: N/A.

## Deployment Topology

Published on npm as `@alexandrealvaro/agentic` (`beta` dist-tag at v0.1.0-beta.1). Consumers run `npx @alexandrealvaro/agentic@beta init` or install globally. No server, no daemon, no scheduled jobs. `engines.node = ">=18"`. Package contents declared by `package.json#files`: `bin/`, `src/`, `templates/`, `prompts/`, `WORKFLOW.md`, `README.md`, `LICENSE`. `prepublishOnly` runs `npm test` (CLI smoke + `test/init-output.test.js`).

## Active ADRs

Currently-binding decisions. Link each to `doc/adr/`.

* [ADR-0001](doc/adr/0001-skills-mode-for-claude-and-codex.md) — Skills mode for both Claude Code and Codex
* [ADR-0002](doc/adr/0002-two-phase-architecture.md) — Two-phase architecture (CLI install + agent skills)
* [ADR-0003](doc/adr/0003-tui-with-clack-prompts.md) — `@clack/prompts` as the CLI's TUI
* [ADR-0004](doc/adr/0004-file-based-task-tracking.md) — File-based per-task tracking with markdown checklists
* [ADR-0005](doc/adr/0005-universal-agent-behavior-as-skill.md) — Universal Agent Behavior lives in an `agentic-philosophy` skill, not in `AGENTS.md`

## Decisions to revisit (ADR candidates, not yet written)

Flagged here so they don't drift. Not yet ADRs.

* **Boundary rule** — `src/lib/render.js` as sole owner of `KIT_ROOT` reads. Becomes binding once a second `src/lib/*` module also needs kit access.
* **stdout = prompt, stderr = status** — observable contract for piping (`agentic init --stdout | <agent>`). Promote to ADR if/when external automation depends on it.
* **Mode-validation strategy** — current hand-rolled enum check vs. Commander's `.choices()`. Trivial migration; no ADR needed unless the option set grows beyond a single enum.
