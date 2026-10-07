# GROUND-0035: Ship an opt-in Claude Code plugin with a threshold context band

**Status:** recorded
**Decision:** A plugin named `agentic-session` lives at `plugins/agentic-session/` and is listed by a marketplace file at `.claude-plugin/marketplace.json` in this repository; its one hooks module, plain ESM JavaScript, takes a context reading from `$.session.usage()` on `session.start` and on each main-loop `turn.complete`, and draws an `AbovePrompt` band with the fill percentage and a `Handoff` button that submits `/ad-handoff` only while the fill is at or above a `userConfig` number threshold.
**Decision ref:** doc/adr/0088-ship-an-optional-claude-code-companion-plugin.md
**Confidence:** Conditional

## Decision and confidence

Claude Code distributes a mod only as a plugin installed from a marketplace, and a repository becomes a marketplace with one `.claude-plugin/marketplace.json` whose entries point at plugin folders by relative path (A1, A2). Anthropic's own sample `token-weather` draws a context band above the prompt from the same API and with the same event pattern this plugin needs (B1), and its built-in `agents-md` mod shows a `userConfig` option read through `register(on, options)` (B2). The manifest schema accepts a `number` option with `min` and `max` (A3). The spike in RESEARCH-0033 observed every runtime call the plugin makes on this machine's desktop engine (C1). Axis-2: Conditional. The path is the documented one with a vendor reference, but the mod API is early access and moves between releases (A2), and a terminal older than 2.1.287 cannot load the plugin (A2, C2). Mitigation: the plugin is opt-in, carries no skill, touches no tool call, and is removed with one uninstall.

## Evidence

### E1 — A mod ships only as a plugin from a marketplace, and a repository becomes one with a single manifest

**Strength:** High
**Provenance:** A1, A2

A mod "installs as a plugin, from a marketplace" (A2). A marketplace is a directory or repository with `.claude-plugin/marketplace.json` listing each plugin's `name` and `source`; a relative `source` names a folder inside the repository, written from the repository root, and users add it with `claude plugin marketplace add <owner>/<repo>` (A1).

### E2 — The band is the vendor's own pattern

**Strength:** High
**Provenance:** B1, C1

`token-weather` reads `$.session.usage()` on `session.start` and on `turn.complete` (skipping subagent turns), keeps the reading in a module variable, calls `$.ui.invalidate('ui.render')`, and answers `ui.render` for `AbovePrompt` with a one-line band, falling back to `next(e)` when there is nothing to show (B1). The RESEARCH-0033 spike observed `context.percent` and an `AbovePrompt` band with a `Button` on this machine (C1).

### E3 — A numeric threshold is a supported user option

**Strength:** High
**Provenance:** A3, B2

`userConfig` options are strict objects with `type` one of `string`, `number`, `boolean`, `directory`, `file`, a required `title` and `description`, and optional `default`, `min` and `max` for numbers; every non-sensitive option is also a row in `/config` (A3). A mod receives the values as `register(on, options)` (B2).

### E4 — Version floor and early-access caveat

**Strength:** High
**Provenance:** A2, C2

Mods load from Claude Code 2.1.287 in the terminal and 2.1.286 in the desktop app, and the API is early access (A2). This machine's terminal is 2.1.227 and its `claude plugin validate` rejects a `modules` hooks file (C2).

### E5 — The kit has no plugin yet and its npm package would not carry one

**Strength:** High
**Provenance:** C3, D1

`package.json#files` lists `bin/`, `src/`, `WORKFLOW.md`, `WORKFLOW-FLOWS.md`, `README.md` and `LICENSE` (C3), so a root `.claude-plugin/` and a `plugins/` folder stay out of the npm tarball. ADR-0041 rejected plugin packaging and named its revisit trigger: marketplace distribution becoming a PRD-level goal, evaluated as a Claude-Code-additional channel in its own ADR (D1).

## Source register

- **A1:** Claude Code docs, "Create a marketplace", marketplace.json fields, relative sources, `claude plugin marketplace add`, https://code.claude.com/docs/en/plugin-marketplaces (accessed 2026-10-07 via WebFetch)
- **A2:** Claude Code docs, "Mods overview", install from a marketplace, version floors, trust and early access, https://code.claude.com/docs/en/plugins/mods/overview (accessed 2026-10-07 via WebFetch)
- **A3:** Claude Code docs, "Plugin manifest reference", `userConfig` fields and types, https://code.claude.com/docs/en/plugins/manifest-reference (accessed 2026-10-07 via WebFetch)
- **B1:** anthropics/claude-code-playground `claude-code/mods/token-weather/hooks/token-weather.mjs` and its marketplace at `claude-code/mods/.claude-plugin/marketplace.json`, commit e9ab132d4575390ecbadfc54649712432b1a3351 (accessed 2026-10-07 via gh api)
- **B2:** anthropics/claude-code `mods/agents-md/.claude-plugin/plugin.json`, a `userConfig` option with `default` and `options`, commit 2282079d6ac8824ec4b72a432a03e0c636e0512f (accessed 2026-10-07 via gh api)
- **C1:** `doc/research/0033-host-native-enforcement-layer.md`, Spike result E12 to E14 (accessed 2026-10-07 via Read)
- **C2:** `claude --version` reports 2.1.227 and `claude plugin validate` on a mod folder reports `hooks: Invalid input: expected record, received undefined`, recorded in this session's spike (accessed 2026-10-07 via Bash)
- **C3:** `package.json:9-16`, the `files` list (accessed 2026-10-07 via grep)
- **D1:** `doc/adr/0041-keep-ad-prefix-reject-plugin-packaging.md`, Decision and revisit trigger; `git log --oneline -- .claude-plugin plugins` is empty on `main`: no prior plugin attempt (accessed 2026-10-07 via Read and Bash)

## Limitations and reversal

Engine-level tests (`claude plugin test`) need a 2.1.287+ CLI this machine's terminal does not have, so automated coverage is the plugin's pure logic plus manifest checks, and the drawing is verified live in the desktop app. A release that renames or removes `session.usage`, `turn.complete`, the `AbovePrompt` site or `prompt.submit` would reverse the decision until the plugin is updated.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs <this-path>`, then reopen every source in the register. Structural validity proves the map, not the source content.
