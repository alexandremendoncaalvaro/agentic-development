# AGENTS.md

## Project Overview

`@alexandrealvaro/agentic` — a CLI + manual-prompt kit that bootstraps and audits AGENTS.md, ARCHITECTURE.md, ADRs, tasks, skills, and subagents for engineering production code with LLMs.

**Quality bar:** docs read primarily by agents must be agent-comprehensible (terse, structured, no fluff); docs read by humans must be readable. Code: simple, secure, mature — right-sized for a CLI, no over-engineering.

**Stack:** Node.js ≥20, ESM, plain JavaScript. Deps: `commander` (CLI), `@clack/prompts` (TUI — requires `node:util` `styleText`, Node 20+). No DB, no build step, no framework.
**Entry points:** `bin/agentic.js` (npm bin) → `src/index.js` (commander wiring) → `src/commands/<verb>.js`. Today: only `init`. Skill source under `src/skills/<agent>/<skill>/`, copied into the target's `.claude/skills/` or `.agents/skills/` at install time.

## Setup, Build, Test

```bash
npm install
node bin/agentic.js init                  # or: npm start
node bin/agentic.js init --agent both -y  # non-interactive
npm test                                  # CLI --help smoke + node:test suite under test/
```

Lint, formatter: not yet wired. CI runs `npm test` across Node 20 / 22 on every push and PR targeting `main` or `cli` ([`.github/workflows/test.yml`](.github/workflows/test.yml)).

## Quality Gates

Deterministic enforcement — agent cannot skip. WORKFLOW §11 binding for the `team` profile this repo runs under.

* **Pre-push hook (lefthook):** `npm test` runs the full unit + integration suite. Bootstrap: `lefthook install` after clone. Config: [`lefthook.yml`](lefthook.yml).
* **Pre-commit hook:** intentionally absent — kit has no lint or formatter wired today. Adding lint/format gates is a separate decision (own ADR + Task per ADR-0007 §6).
* **CI:** GitHub Actions workflow at [`.github/workflows/test.yml`](.github/workflows/test.yml) runs `npm test` across Node 20 / 22 on every push and PR targeting `main` or `cli`. Redundant with the local pre-push hook; both stay wired so a missing local install does not skip the gate.
* **Never bypass:** no `--no-verify`, no skipped hooks, no deleted failing tests. WORKFLOW §11 binding.

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
* **Universal Agent Behavior lives in `ad-philosophy` skill, not in `AGENTS.md`** ([ADR-0005](doc/adr/0005-universal-agent-behavior-as-skill.md)). Do not bundle generic agent advice into per-project output.
* **Bootstrap flow is scan-first, not interview-first** ([Task 0006](doc/tasks/0006-bootstrap-flow-and-agents-md-bloat-fix.md)): pre-fill from repo signals, ask only the gaps.
* **Idempotent on re-run** for filesystem ops (ADR-0002).
* **Operational docs at repo root** ([ADR-0006](doc/adr/0006-architecture-md-at-repo-root.md)): `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md`, `WORKFLOW.md` at root. ADRs and tasks under `doc/`.
* **Workflow-operational skill category** ([ADR-0007](doc/adr/0007-workflow-operational-skills.md)): skills come in two categories — `spec-driven` (produces an artifact) and `workflow-operational` (executes a process from `WORKFLOW.md`). Each new workflow-operational skill needs its own ADR.
* **Documentation discipline** ([ADR-0008](doc/adr/0008-documentation-discipline.md)): eight rules govern every document (canonical source `WORKFLOW.md` §2; operational delivery via the `ad-philosophy` skill). Narrative documents — `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md` — carry no dates, version stamps, `DRAFT` markers, changelog blocks, or emoji. Decision-record artifacts under `doc/adr/` and `doc/tasks/` are exempt from the no-dates rule. Orphan `TODO`/`FIXME` references either a GitHub Issue or a `doc/tasks/NNNN-*.md` file.

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

Binding ADRs: see [`doc/adr/`](doc/adr/) (all accepted). Skill source lives under `src/skills/`; the repo also self-installs the kit into its own `.claude/skills/` and `.agents/skills/` for dogfood, so contributors get the same agent surface (`/ad-bootstrap`, `/ad-spec`, `/ad-task`, `/ad-ground`, `/ad-review`, etc.) when working on the kit itself. Source under `src/skills/` is canonical; the installed copies under `.claude/skills/` and `.agents/skills/` are kept in sync via `node bin/agentic.js update` (see [ADR-0009](doc/adr/0009-update-mechanism.md)).

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
* **Skill set:** twenty-two universal at `team` / `mature` profile — `ad-bootstrap`, `ad-philosophy`, `ad-architecture`, `ad-adr`, `ad-prd`, `ad-guidelines`, `ad-spec`, `ad-task`, `ad-audit`, `ad-review`, `ad-ground`, `ad-next`, `ad-spike`, `ad-tdg`, `ad-tdd`, `ad-domain`, `ad-grill`, `ad-deepen`, `ad-diagnose`, `ad-commit`, `ad-pr`, `ad-merge`. `solo`-and-up only: `ad-prd`, `ad-guidelines`, `ad-commit`, `ad-pr`, `ad-merge`. `team`-and-up only: `ad-deepen`. Plus four conditional: `ad-design` (auto if `detectFeatures().frontend`), `ad-subagent` (auto for Claude Code), `ad-skill` (opt-in), `ad-hooks` (opt-in / recommended at `mature`). Profile-specific install sets: `poc` = 10, `solo` = 19, `team` / `mature` = 22. Source under `src/lib/profiles.js`.
* **Idempotency contract:** `installSkills` byte-compares existing target files. A user-edited skill file diverges → `confirmReplace` callback decides. Default (non-interactive) skips. Don't break this default by silently overwriting.
* **Subagent install target:** a skill's `manifest.json` (optional) lists files that route to `.claude/agents/<basename>` instead of the default `.claude/skills/<skill>/...` path. `manifest.json` itself is never installed. Codex layout has no `agentsDir`; manifest-listed subagents are silently skipped on Codex (no subagent primitive). Currently used only by `ad-review` (`agents/fresh-context-reviewer.md`).
* **Per-(skill, agent) install routing:** `init.js` calls `installSkills` once per agent with the skills that have source under `src/skills/<agent>/`. Don't add a skill to `CONDITIONAL_SKILLS` declaring `agents: ['claude-code', 'codex']` without confirming both source trees exist — `installSkills` throws on missing source by design (catches typos), so the per-agent filter in `init.js` is the safety net.
* **Full self-install for dogfood.** This repo ships installed copies of every skill at `.claude/skills/<skill>/` and `.agents/skills/<skill>/`, the bundled subagent at `.claude/agents/fresh-context-reviewer.md`, and per-agent state files at `.claude/agentic-state.json` and `.agents/agentic-state.json`. The Task tool dispatches by `subagent_type: 'fresh-context-reviewer'`; slash commands resolve from the installed `SKILL.md` files. Source under `src/skills/` is canonical — installed copies must stay byte-identical. After editing any skill source, run `node bin/agentic.js update --yes` to refresh the dogfood install (or re-run `init`). The state files record the kit version and per-file SHA, so the three-way diff in `installSkills` keeps the dogfood tree honest across edits.
* **Skill frontmatter carries two description fields.** Anthropic-spec `description:` is trigger-keyword-rich (drives skill-router auto-load); kit-specific `summary:` is the compressed ≤320-char cell that `rootdoc.js` reads at section-build time into the managed `Skills installed by agentic` table in downstream AGENTS.md (per [task-0029](doc/tasks/0029-skill-summary-frontmatter.md)). Adding a new skill requires both fields in `src/skills/<agent>/<skill>/SKILL.md`; `test/skills.test.js` enforces presence + ≤320-char cap.
* **Historical naming.** Per [ADR-0026](doc/adr/0026-slash-command-rename-ad-prefix.md) the slash-command prefix renamed from `agentic-` to `ad-`. Live skills, dirs, frontmatter, wiring, and narrative docs use `ad-`. ADRs 0001-0025 and tasks 0001-0027 retain pre-rename `agentic-X` references in their bodies as intentional historical records (ADR-0004 binds tasks append-only; ADRs preserve decision-language at acceptance). ADR-0026 §Decision 4 carries the canonical 23-skill mapping table. The `agentic` brand (CLI binary, npm package, repo, state files, managed-doc marker) is preserved.

<!-- agentic-managed-skills:start -->

## Skills installed by `agentic`

Generated by `@alexandrealvaro/agentic init`. Do not edit this section by hand — re-running the installer regenerates it. Edit the kit instead: https://github.com/alexandremendoncaalvaro/agentic-development.

| Skill | Invoke | Notes |
| --- | --- | --- |
| `ad-bootstrap` | `/ad-bootstrap` | Generate or audit `AGENTS.md` at the repo root. |
| `ad-philosophy` | _(implicit)_ | Universal agent guardrails (think before coding, verify before claiming done). Auto-loads on non-trivial work. |
| `ad-architecture` | `/ad-architecture` | Generate or audit `ARCHITECTURE.md` at the repo root. |
| `ad-adr` | `/ad-adr` | Draft a new ADR at `doc/adr/NNNN-<slug>.md`. |
| `ad-prd` | `/ad-prd` | Lazy lifecycle owner of `doc/product/PRD.md` (or `doc/product/<slug>.md` multi-product). Layer 3 — product-level scope (target user, problem, success metrics, multi-feature roadmap) that feature specs inherit from. Distinct from `ad-spec` (feature-level). |
| `ad-guidelines` | `/ad-guidelines` | Lazy lifecycle owner of `GUIDELINES.md` (Layer 1 Constitution, full engineering reference). Twelve sections — design principles, code standards, complexity, API, performance, build, static analysis, quality gates, testing, git, documentation, security. Pre-suggested defaults from canon + scan-first detection. |
| `ad-spec` | `/ad-spec` | Draft a feature spec at `doc/specs/NNNN-<slug>.md` (Spec Kit-aligned mandatory sections). Layer 4 of the six-layer artifact stack. References parent PRD (`ad-prd`, Layer 3) for product-scope inheritance. |
| `ad-task` | `/ad-task` | Draft a new task at `doc/tasks/NNNN-<slug>.md`. |
| `ad-audit` | `/ad-audit` | Read-only drift report comparing AGENTS.md / ARCHITECTURE.md / ADRs against the code. |
| `ad-review` | `/ad-review` | Fresh-context code review per WORKFLOW §10 — assemble handoff, return structured findings. |
| `ad-ground` | `/ad-ground` | Four-source pre-implementation research (docs / OSS / in-repo / git history) + happy-path synthesis + deviation gate. WORKFLOW §4 + §5. |
| `ad-next` | `/ad-next` | State survey + prioritized next-action recommendations across the six-layer artifact stack. Read-only navigation aid (`flutter doctor` pattern). |
| `ad-spike` | `/ad-spike` | Staged spike with golden fixtures per WORKFLOW §14. Discovery + fixture + pipeline-with-gates + two-layer evaluation, when the *technique* is uncertain across multiple plausible approaches. |
| `ad-tdg` | `/ad-tdg` | Outcome-based prompting per WORKFLOW §9. Ground truth pair + Test Dependency Map + three approaches + single-criterion selection, when the technique is known but the implementation strategy is uncertain. |
| `ad-tdd` | `/ad-tdd` | Test-Driven Development per WORKFLOW §16. Red-green-refactor as deterministic LLM guardrail. Five phases — confirm regime, plan, tracer bullet, incremental loop, refactor. Tests verify behavior through public interfaces. Horizontal slicing rejected. |
| `ad-domain` | `/ad-domain` | Lazy lifecycle owner of `CONTEXT.md` (Layer 2 — ubiquitous language per Evans 2003). Captures canonical project-specific nouns with aliases-to-avoid, relationships, and flagged ambiguities. Single-context or `CONTEXT-MAP.md` multi-context. |
| `ad-grill` | `/ad-grill` | Interview-before-research grilling session — one question at a time with recommendation, codebase-first, sharpens vocabulary against `CONTEXT.md`, captures terms via `ad-domain` and decisions via `ad-adr` (three-criteria rule). Upstream of `ad-ground`. |
| `ad-deepen` | `/ad-deepen` | Surface deepening opportunities using WORKFLOW §8 vocabulary (Module / Interface / Depth / Seam / Adapter / Leverage / Locality). Three phases — explore, present numbered candidates with deletion-test framing, grill the chosen one. Pairs with `ad-audit`. Profile-scoped to `team` and `mature` only. |
| `ad-diagnose` | `/ad-diagnose` | Disciplined diagnosis loop for hard bugs and performance regressions per WORKFLOW §15. Five phases — build a feedback loop (the skill itself), reproduce, hypothesise (3-5 ranked falsifiable), instrument (one variable at a time), fix + regression-test. |
| `ad-commit` | `/ad-commit` | Atomic Conventional Commits with DCO `Signed-off-by` sign-off per ADR-0023. Four phases — scope intake, stage-split when concerns mix, draft message in Conventional Commits format, sign + write. Helper posture, not blocker. |
| `ad-pr` | `/ad-pr` | Open a GitHub pull request with a uniform body shape (Summary / Test plan / Links) per ADR-0024. Four phases — preflight (`gh` auth + branch pushed), scope assembly, draft body, open + report URL. Title format = Conventional Commits. |
| `ad-merge` | `/ad-merge` | Evaluate and merge a GitHub pull request per ADR-0025. Four phases — preflight, evaluate (CI / fresh-context review / linked task / unresolved comments / mergeability), decision (CI green = hard gate; others = warnings), merge with auto-detected mode + `--delete-branch`. |
| `ad-subagent` | `/ad-subagent` | Draft a new Claude Code subagent at `.claude/agents/<name>.md`. |

<!-- agentic-managed-skills:end -->
