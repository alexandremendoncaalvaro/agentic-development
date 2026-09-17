# AGENTS.md

## Project Overview

`@alexandrealvaro/agentic` — a CLI + Agent Skills kit that bootstraps and audits AGENTS.md, ARCHITECTURE.md, ADRs, tasks, skills, and subagents for engineering production code with LLMs.

**Quality bar:** docs read primarily by agents must be agent-comprehensible (terse, structured, no fluff); docs read by humans must be readable. Code: simple, secure, mature — right-sized for a CLI, no over-engineering.

**Stack:** Node.js ≥22.13.0, ESM, plain JavaScript. Runtime deps: `commander` (CLI), `@clack/prompts` (TUI). No DB, no build step, no framework.
**Entry points:** `bin/agentic.js` (npm bin) → `src/index.js` (commander wiring) → `src/commands/<verb>.js` (`init`, `update`, `menu`). Skill source under `src/skills/<agent>/<skill>/`, copied into the target's `.claude/skills/` or `.agents/skills/` at install time.

## Setup, Build, Test

```bash
npm install
node bin/agentic.js init                  # or: npm start
node bin/agentic.js init --agent both -y  # non-interactive
npm test                                  # CLI --help smoke + node:test suite under test/
```

`npm run verify` composes ESLint, Prettier check mode, `npm test`, and the high-severity dependency audit. CI runs it on Ubuntu and Windows across Node 22.13 / 24 for every push and PR targeting `main` ([`.github/workflows/test.yml`](.github/workflows/test.yml)).

## Quality Gates

See [`GUIDELINES.md`](GUIDELINES.md) §8 for the full reference. Non-negotiable subset:

* Pre-commit (`lefthook`): `leak-guard` (ADR-0033, blocks) and `changelog-gate` (ADR-0048, warn-only changelog reminder). Lint and format run in the composed pre-push gate, not pre-commit.
* Commit-msg: `subject-check` (ADR-0048) blocks a subject over 72 chars; imperative-mood heuristics warn only.
* Pre-push: `branch-guard` (ADR-0048) refuses a push updating `main`, then `npm run verify`; CI (`.github/workflows/test.yml`) mirrors the same command across Node 22.13 / 24.
* Never bypass: no `--no-verify`, no skipped hooks, no deleted failing tests.
* CI failure is a local gate gap (WORKFLOW.md §11, TL;DR #22). Pre-push and CI run the same effective command (`npm run verify`; locally via the env-stripping runner `scripts/hook-npm-test.js`). ADR-0065 records the explicit limitation: local pre-push is a single-machine gate and cannot emulate the required Ubuntu/Windows matrix, so every remote matrix leg remains required. `/ad-pr` refuses to open a PR when local gates are red; `/ad-hooks` reports matrix drift. If CI catches a gap, close it locally where reproducible; don't iterate red CI runs.

## Code Style

See [`GUIDELINES.md`](GUIDELINES.md) §2 for the full reference. Non-negotiable subset:

* ESM only (`"type": "module"`); `node:` prefix for built-ins.
* Named exports, no default exports.
* 2-space indent, single quotes, semicolons.

## Architectural Principles

Binding decisions live in [`doc/adr/`](doc/adr/). Do not reinvent.

## Repository Layout

```
bin/agentic.js                       npm bin entry (#!/usr/bin/env node)
src/index.js                         commander program wiring
src/commands/<verb>.js               one file per CLI command (init, update, menu)
src/lib/                             pure helpers (detect.js, install.js)
src/leak-guard.js                    pre-commit house-IP leak-guard (ADR-0033), wired in lefthook.yml
src/skills/<agent>/<skill>/          skill source — copied into target's
                                     .claude/skills/ or .agents/skills/ at install
scripts/                             repo-only release + hook tooling (ADR-0048);
                                     never shipped to npm
test/*.test.js                       unit + integration suite (node:test)
eval/                                repo-only skill trajectory evaluation harness
                                     (Spec 0007): cases, sanitized fixtures, frozen
                                     receipts, `run.mjs replay|corpus` (`npm run eval`);
                                     never shipped to npm
CHANGELOG.md                         release record (Keep a Changelog), rotated
                                     only by scripts/release.sh
WORKFLOW.md                          Layer 1 Constitution — philosophy doc, shipped to npm
GUIDELINES.md                        Layer 1 Constitution — full engineering reference
ARCHITECTURE.md                      Layer 1 — system-level patterns (pairs with ADRs)
CONTEXT.md                           Layer 2 Domain — canonical project nouns and aliases-to-avoid (lazy; only when terms have been resolved)
doc/product/PRD.md                   Layer 3 Product — product-level scope (target user, problem, success metrics, roadmap)
doc/research/NNNN-<slug>.md          Evidence records — studies and grounded implementation receipts
doc/specs/NNNN-<slug>.md             Layer 4 Spec — feature-level specifications
doc/adr/NNNN-<slug>.md               Layer 5 Plans / Decisions — binding ADRs (Nygard format)
doc/tasks/NNNN-<slug>.md             Layer 5 Plans / Decisions — task tracking with checkbox AC + append-only Notes
```

Binding ADRs: see [`doc/adr/`](doc/adr/); [`doc/adr/PROJECTION.md`](doc/adr/PROJECTION.md) names which parts still bind. Skill source lives under `src/skills/`; the repo also self-installs the kit into its own `.claude/skills/` and `.agents/skills/` for dogfood, so contributors get the same agent surface (`/ad-bootstrap`, `/ad-spec`, `/ad-task`, `/ad-ground`, `/ad-review`, etc.) when working on the kit itself. Source under `src/skills/` is canonical; the installed copies under `.claude/skills/` and `.agents/skills/` are kept in sync via `node bin/agentic.js update`.

## Commit & PR Conventions

See [`GUIDELINES.md`](GUIDELINES.md) §10 for the full reference. Non-negotiable subset:

* Conventional Commits format. Use `/ad-commit` for the disciplined flow.
* DCO `Signed-off-by` trailer on every commit (no `Co-Authored-By`).
* Never push directly to `main` — always open a PR via `/ad-pr`.

## Security & Privacy

See [`GUIDELINES.md`](GUIDELINES.md) §12 for the full reference. Non-negotiable subset:

* `.env`, `.env.local`, `.npmrc`, `node_modules/` — agent never reads or modifies.
* No user data, no PII, no telemetry. CLI is offline.
* Pre-approved commands (no prompt): `node bin/agentic.js *`, `npm test|start|install`, `git status|diff|log|show`, `gh pr|issue view`.
* No MCP servers approved.

## Gotchas

Real traps confirmed in code or ADRs.

* **Kit content ships via `package.json#files`.** Adding a directory under `src/skills/` does nothing for npm consumers unless its top-level dir is listed. Verify with `npm pack --dry-run` after touching the file list.
* **ESM only.** `"type": "module"` — `require()` will crash. Use `import`. Built-ins via `node:` prefix.
* **Skill source is read at install time** from disk via `src/lib/install.js` (`KIT_ROOT` resolves up two from `src/lib/`). Moving `src/lib/install.js` breaks that path.
* **`detectMode` ignores dotfiles + a fixed `TRIVIAL_ENTRIES` set** (`src/lib/detect.js`). Adding a new "trivial" file (e.g., `.editorconfig`) without updating that set will misclassify a project as `brownfield`.
* **Non-TTY bypasses TUI** (`src/commands/init.js`). `--agent` and `--yes` also force non-interactive. Don't add a prompt that runs unconditionally.
* **The installer is git-aware for shared files (ADR-0051).** A non-interactive `init`/`update` will NOT write the managed skills section into a root doc that `git` tracks — it skips and needs `--force-root-doc`. `src/lib/git.js` probes are fail-open (an unresolvable repo returns `unknown`, never blocks), the opposite of `leak-guard.js`. `.git/info/exclude` entries are written by filename, never by directory, because `.claude/agents/` mixes kit and team-owned files.
* **Skill set:** every directory under `src/skills/<agent>/` installs for the selected host. The materialized install set per project is listed in the managed `Skills installed by agentic` table below.
* **Idempotency contract:** `installSkills` byte-compares existing target files. A user-edited skill file diverges → `confirmReplace` callback decides. Default (non-interactive) skips. Don't break this default by silently overwriting.
* **Subagent install target:** a skill's `manifest.json` (optional) lists files that route to `.claude/agents/<basename>` for Claude Code or `.codex/agents/<basename>` for Codex instead of the default skill path. `manifest.json` itself is never installed. Currently used by `ad-review` (`fresh-context-reviewer`), `ad-audit` (`audit-group-reviewer`) and `ad-level-up` (`rule-candidate-reviewer`) — each shipping a `.md` for Claude Code and a `.toml` for Codex.
* **Per-host install routing:** `init.js` calls `installSkills` once per agent with every directory under `src/skills/<agent>/`. Add every kit skill to both host source trees; the static parity tests enforce the shared skill names and bundled-script bytes.
* **Full self-install for dogfood.** This repo ships installed copies of every skill at `.claude/skills/<skill>/` and `.agents/skills/<skill>/`, the three bundled review subagents at `.claude/agents/{fresh-context,audit-group,rule-candidate}-reviewer.md` and `.codex/agents/*.toml`, and per-agent state files at `.claude/agentic-state.json` and `.agents/agentic-state.json`. Claude Code dispatches by `subagent_type: 'fresh-context-reviewer'`; Codex uses the `.codex/agents/*.toml` custom-agent surface; slash commands resolve from the installed `SKILL.md` files. Source under `src/skills/` is canonical — installed copies must stay byte-identical. After editing any skill source, run `node bin/agentic.js update --scope project --agent both --yes` to refresh the dogfood install (a bare `update` targets the user-level install, not this repo). The state files record the kit version and per-file SHA, so the three-way diff in `installSkills` keeps the dogfood tree honest across edits.
* **Every skill declares its invocation class (ADR-0073).** User-invocable skills (outward-facing or setup human verbs: pr, merge, release, publish, bootstrap, guidelines, ...; `ad-commit` stays model-invocable because a commit is local and reversible) carry `disable-model-invocation: true` on Claude Code and `policy.allow_implicit_invocation: false` in the Codex `agents/openai.yaml`; model-invocable skills carry neither flag and `true`. Model-invocable `description:` text is capped at 350 chars and 8,000 chars in total per host (the smallest documented listing budget), every description at the 1,024-char spec maximum; `test/skills.test.js` names the class list and fails on any drift. A dot-directory under `src/skills/<host>/` is never a skill — `bundledSkills` and the test enumerator skip it (a plugin once dropped `.slim/` there and 14 tests went red).
* **Skill frontmatter carries two description fields.** Anthropic-spec `description:` is trigger-keyword-rich (drives skill-router auto-load); kit-specific `summary:` is the compressed ≤320-char cell that `rootdoc.js` reads at section-build time into the managed `Skills installed by agentic` table in downstream AGENTS.md. Adding a new skill requires both fields in `src/skills/<agent>/<skill>/SKILL.md`; `test/skills.test.js` enforces presence + ≤320-char cap.
* **A new lefthook stage needs `lefthook install` re-run.** Declaring a stage in `lefthook.yml` (e.g. `commit-msg`) does nothing until its stub exists under `.git/hooks/` — re-run `lefthook install` after adding or removing a stage, or the gate silently never fires.
* **The pre-push verification gate runs via `scripts/hook-npm-test.js`, not bare `npm run verify`.** git exports `GIT_DIR` into hook processes; in a linked git worktree that env leaks into the suite's child processes and points their git calls at THIS repo — 13 tests turn red and a leaked `git config` write can even rewrite the real repo's committer identity (observed, task-0033). The runner strips `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE` before spawning the same `npm run verify` CI runs; bypassing it reopens the leak (a wiring test blocks that). Never run the suite with those vars manually set against the real repo — use a disposable clone for such diagnostics.
* **Historical naming.** The slash-command prefix renamed from `agentic-` to `ad-`. Live skills, dirs, frontmatter, wiring, and narrative docs use `ad-`. ADRs 0001-0025 and tasks 0001-0027 retain pre-rename `agentic-X` references in their bodies as intentional historical records. The `agentic` brand (CLI binary, npm package, repo, state files, managed-doc marker) is preserved.

<!-- agentic-managed-skills:start -->

## Skills installed by `agentic`

Generated by `@alexandrealvaro/agentic init`. Do not edit this section by hand — re-running the installer regenerates it. Edit the kit instead: https://github.com/alexandremendoncaalvaro/agentic-development.

| Skill | Invoke | Notes |
| --- | --- | --- |
| `ad-adr` | `/ad-adr` | Draft a new ADR at `doc/adr/NNNN-<slug>.md`. |
| `ad-architecture` | `/ad-architecture` | Generate or audit `ARCHITECTURE.md` at the repo root. |
| `ad-archive` | `/ad-archive` | Hard-delete completed plan files (tasks / specs / PRDs / superseded ADRs) into git history. ADR-accepted requires absorption proof. |
| `ad-audit` | `/ad-audit` | Maximum-gate rules-anchored audit. Fans out one fresh-context reviewer per rule-group, exhaustive per-rule verdicts (coverage matrix), cross-model on critical groups via the dual-host split, evidence-gated, never approves. Heavier than ad-review; hands rule gaps to ad-level-up. |
| `ad-bootstrap` | `/ad-bootstrap` | Generate or audit `AGENTS.md` at the repo root. |
| `ad-brief` | `/ad-brief` | Read-only decision-maker briefing from live project/session evidence or facts supplied by another skill. Restores context, meaning, direction, completion conditions, blockers, and genuine owner decisions in plain language. |
| `ad-commit` | `/ad-commit` | Atomic Conventional Commits with DCO `Signed-off-by` sign-off. Four phases — scope intake, stage-split when concerns mix, draft message in Conventional Commits format, sign + write. Helper posture, not blocker. |
| `ad-community-docs` | `/ad-community-docs` | Scaffold or audit `CONTRIBUTING.md` and `SECURITY.md` without overwriting local policy. |
| `ad-deepen` | `/ad-deepen` | Surface deepening opportunities using WORKFLOW §8 vocabulary (Module / Interface / Depth / Seam / Adapter / Leverage / Locality). Three phases — explore, present numbered candidates with deletion-test framing, grill the chosen one. Pairs with `ad-drift`. |
| `ad-derisk` | `/ad-derisk` | Pre-construction de-risking — enumerate a task's unknowns, retire each with the right skill (ad-ground / ad-spike / ad-tdg / ad-grill-me), grade per WORKFLOW §17, and stop when residual technical risk falls below the non-technical risks. Orchestrates existing skills; hands a de-risked design to ad-tdd. |
| `ad-design` | `/ad-design` | Bootstrap `DESIGN.md` from existing tokens (frontend projects). |
| `ad-diagnose` | `/ad-diagnose` | Disciplined diagnosis loop for hard bugs and performance regressions per WORKFLOW §15. Five phases — build a feedback loop (the skill itself), reproduce, hypothesise (3-5 ranked falsifiable), instrument (one variable at a time), fix + regression-test. |
| `ad-domain` | `/ad-domain` | Lazy lifecycle owner of `CONTEXT.md` (Layer 2 — ubiquitous language per Evans 2003). Captures canonical project-specific nouns with aliases-to-avoid, relationships, and flagged ambiguities. Single-context or `CONTEXT-MAP.md` multi-context. |
| `ad-drift` | `/ad-drift` | Read-only drift report comparing AGENTS.md / ARCHITECTURE.md / ADRs against the code. |
| `ad-grill-me` | `/ad-grill-me` | Interview-before-research grilling session — one question at a time with recommendation, codebase-first, sharpens vocabulary against `CONTEXT.md`, captures terms via `ad-domain` and decisions via `ad-adr` (three-criteria rule). Upstream of `ad-ground`. |
| `ad-ground` | `/ad-ground` | Four-source pre-implementation research + versioned claim-to-source evidence record, happy-path synthesis, deviation gate, and proportional evidence grading. WORKFLOW §4 + §5 + §17. |
| `ad-guidelines` | `/ad-guidelines` | Lazy lifecycle owner of `GUIDELINES.md` (Layer 1 Constitution, full engineering reference). Twelve sections — design principles, code standards, complexity, API, performance, build, static analysis, quality gates, testing, git, documentation, security. Pre-suggested defaults from canon + scan-first detection. |
| `ad-handoff` | `/ad-handoff` | Compact the session into a temporary handoff. Preserves resumable state while the next session opens with a preparation receipt and canonical brief; retains roadmap, lost asks, hygiene, references, and redaction. Never commits. |
| `ad-hooks` | `/ad-hooks` | Scaffold deterministic quality gates per WORKFLOW §11 — pre-commit + pre-push, runner detected from stack signals — plus a Claude Code session-lifecycle tier (a Stop handoff nudge and a UserPromptSubmit workflow checkpoint). |
| `ad-level-up` | `/ad-level-up` | Human-gated rule-set curation, companion to ad-audit. Four anti-overfitting gates + effectiveness pass + adversarial multi-lens review of each candidate, then a HARD human-approval gate — never writes unprompted, one item at a time. Writes to the ADR-0035 machine store or the ADR-0043 project layer (.agentic/rules/). |
| `ad-merge` | `/ad-merge` | Evaluate and merge a GitHub pull request. Four phases — preflight, evaluate (CI / fresh-context review / linked task / unresolved comments / mergeability), decision (CI green = hard gate; others = warnings), merge with auto-detected mode + `--delete-branch`. |
| `ad-next` | `/ad-next` | State survey + prioritized next-action recommendations across the six-layer artifact stack. Read-only navigation aid (`flutter doctor` pattern). |
| `ad-philosophy` | `/ad-philosophy` _(also implicit)_ | Universal agent guardrails (think, decide when grounded, verify done, report for a decision-maker). Auto-loads as posture on non-trivial work; an explicit `/ad-philosophy` additionally forces a binding statement applying all eight behaviors to the current task. |
| `ad-pr` | `/ad-pr` | Open a GitHub pull request with a uniform body shape (Summary / Test plan / Links). Four phases — preflight (`gh` auth + branch pushed), scope assembly, draft body, open + report URL. Title format = Conventional Commits. |
| `ad-prd` | `/ad-prd` | Lazy lifecycle owner of `doc/product/PRD.md` (or `doc/product/<slug>.md` multi-product). Layer 3 — product-level scope (target user, problem, success metrics, multi-feature roadmap) that feature specs inherit from. Distinct from `ad-spec` (feature-level). |
| `ad-prism` | `/ad-prism` | Decision-focused evaluation design, interpretation, refinement, and methodology audit with an optional project domain adapter. |
| `ad-project-state` | `/ad-project-state` | Shared read-only source resolver for state-reading skills. Combines the repository baseline with configured GitHub issue and pull-request metadata, preserving precedence, provenance, freshness, and partial failures. |
| `ad-publish` | `/ad-publish` | Draft or review collaboration publications from approved templates and authorized evidence. Preserves facts, composes existing skills, and gates every outward action. |
| `ad-question-me` | `/ad-question-me` | Value-first challenger — absorbs the value intended, then raises only questions that are the owner's call or genuinely un-groundable, resolving anything answerable from code / docs itself. Ranked questions, killer first, why-it-matters, no verdict. Complements ad-grill-me; feeds ad-review. |
| `ad-release` | `/ad-release` | Safely orchestrate a single npm package release through its configured release script, PR, tag, npm publish, and GitHub Release with one digest-bound approval and state-aware recovery. |
| `ad-report` | `/ad-report` | Draft or review standalone analytical reports from approved templates, then compose the available renderer and its visual and accessibility verification workflow. |
| `ad-research` | `/ad-research` | Research-to-conclusion — turn an open question into an evidence-graded study at doc/research/NNNN-<slug>.md via the Evidence-Based loop + WORKFLOW §17 grading + the scientific method when measurable. Reuses ad-ground for Acquire; graduates a binding conclusion to an ADR. WORKFLOW §17 + §4-5. |
| `ad-review` | `/ad-review` | Two-axis code review per WORKFLOW §10. Claude Code uses fresh-context subagents; Codex writes an audit trail, reviews inline by default, and ships a reviewer subagent for explicit escalation. |
| `ad-roadmap` | `/ad-roadmap` | Read-only roadmap report that reconciles specs and tasks, composes the canonical decision-maker brief, then adds a project- or task-scoped checklist of delivered and remaining work. |
| `ad-rules` | `/ad-rules` | Resolve global, repository, and kit rules using two read-only modes. Inventory lists their topics; correction reapplies the existing philosophy commitment, repairs a conflicting active plan, and returns a decision-maker brief. |
| `ad-skill` | `/ad-skill` | Draft a new Claude Code or Codex skill at the appropriate path. |
| `ad-spec` | `/ad-spec` | Draft a feature spec at `doc/specs/NNNN-<slug>.md` (Spec Kit-aligned mandatory sections). Layer 4 of the six-layer artifact stack. References parent PRD (`ad-prd`, Layer 3) for product-scope inheritance. |
| `ad-spike` | `/ad-spike` | Staged spike with golden fixtures per WORKFLOW §14. Discovery + fixture + pipeline-with-gates + two-layer evaluation, when the *technique* is uncertain across multiple plausible approaches. |
| `ad-subagent` | `/ad-subagent` | Draft a Claude Code custom subagent for bounded delegated work at `.claude/agents/<name>.md`. |
| `ad-task` | `/ad-task` | Draft a new task at `doc/tasks/NNNN-<slug>.md`. |
| `ad-tdd` | `/ad-tdd` | Test-Driven Development per WORKFLOW §16. Red-green-refactor as deterministic LLM guardrail. Five phases — confirm regime, plan, tracer bullet, incremental loop, refactor. Tests verify behavior through public interfaces. Horizontal slicing rejected. |
| `ad-tdg` | `/ad-tdg` | Outcome-based prompting per WORKFLOW §9. Ground truth pair + Test Dependency Map + three approaches + single-criterion selection, when the technique is known but the implementation strategy is uncertain. |
| `ad-template-tune` | `/ad-template-tune` | Curate publication and report templates from authorized evidence. Keeps author classes separate and writes one explicitly approved, validated delta at a time. |
| `ad-update` | `/ad-update` | Preview and safely apply the current machine-global Agentic Development kit update, preserving local skill edits by default. |
| `ad-voice` | `/ad-voice` | Draft, rewrite, or translate through a confirmed local personal-voice profile. Preserves facts; layers owner identity, community accommodation, and context; never changes the profile. Falls back honestly when evidence is missing. |
| `ad-voice-tune` | `/ad-voice-tune` | Calibrate the local personal-voice profile from authorized owner and community evidence. Separates identity from accommodation, retains derived patterns by default, and writes one explicitly approved delta at a time. |

<!-- agentic-managed-skills:end -->
