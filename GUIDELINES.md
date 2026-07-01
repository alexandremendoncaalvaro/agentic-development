# Engineering Guidelines

Coding standards, complexity discipline, API rules, build system, testing strategy, and security policy for `@alexandrealvaro/agentic`. Reference for contributors and reviewers. Companion to [`AGENTS.md`](AGENTS.md) (compressed rules read every session) and [`ARCHITECTURE.md`](ARCHITECTURE.md) (system structure).

**Scope:** *what rules code follows.* Not *what the system is* (ARCHITECTURE) or *who the product is for* (`doc/product/PRD.md`).

---

## 1. Design Principles

### 1.1 Clean Architecture

The codebase follows a strict two-phase split per [ADR-0002](doc/adr/0002-two-phase-architecture.md):

```
CLI (bin/agentic.js → src/index.js → src/commands/<verb>.js)
        depends on
src/lib/ (pure helpers: detect, install, profiles, rootdoc, state)
        depends on
src/skills/<agent>/<skill>/ (kit content — read at install time)
```

Rules:

- **CLI handles filesystem only.** It copies files, prompts for choices, writes state. CLI never interviews for content.
- **Skills handle content via agents.** Skills produce artifacts (`AGENTS.md`, `ARCHITECTURE.md`, ADRs, tasks) through agent conversations. Skills never set up filesystem.
- A higher layer never imports a lower layer in reverse. `src/lib/` never imports from `src/commands/`.
- No circular dependencies.

### 1.2 SOLID Principles

Functional JS adaptation:

| Principle | Application |
|-----------|-------------|
| **S** — Single Responsibility | Each `src/lib/<name>.js` and `src/commands/<verb>.js` has one job. `detect.js` detects; `install.js` installs; `state.js` reads/writes state. |
| **O** — Open / Closed | New CLI verbs slot in as `src/commands/<verb>.js` without modifying existing commands. New skills slot in as `src/skills/<agent>/<skill>/SKILL.md` without modifying `install.js`. |
| **L** — Liskov Substitution | The `agent` parameter (`'claude-code'` or `'codex'`) is interchangeable through the install path — skills install correctly for either agent. |
| **I** — Interface Segregation | Each command imports only the lib helpers it actually calls. No god-modules. |
| **D** — Dependency Inversion | Commands depend on lib abstractions (`installSkills`, `detectMode`), not directly on `fs`/`path` operations. |

### 1.3 Project Tradeoff Statement

**Simple, secure, mature — right-sized for a CLI, no over-engineering.** Engineering decisions favor:

- Fewer dependencies over more dependencies.
- Plain Node over framework code.
- Direct filesystem ops over abstraction layers.
- Readable single-file commands over distributed pattern code.

If a change adds complexity that doesn't directly serve the install/update/audit flow, it's the wrong size.

---

## 2. Code Standards

### 2.1 Naming Conventions

| Element | Convention |
|---------|-----------|
| Functions, variables | `camelCase` (`installSkills`, `detectMode`, `cwd`) |
| File names | `kebab-case.js` (`agentic-state.json`, `init.js`, `update.js`) |
| Constants | `UPPER_SNAKE_CASE` (`SCHEMA_VERSION`, `REQUIRED_SKILLS`, `KIT_ROOT`) |
| Module-internal helpers | leading-lowercase, not exported |
| Public API surface | named exports only — no default exports |

No abbreviations except established domain terms: `cli`, `cwd`, `fs`, `os`, `tty`, `pr`, `adr`, `ci`.

### 2.2 Error Handling

- **Throw `Error` (or subclass) at module boundaries.** No silent failures; no `null`/`undefined` return codes.
- **No exception swallowing.** `try` blocks must either re-throw, surface to the caller, or log with context. `catch (e) {}` is forbidden.
- **No `process.exit()` inside lib code.** Commands may call `process.exit(1)` on user-error paths; lib code returns / throws.
- **Validate at boundaries.** User input (`--agent`, `--profile`) validated in command; filesystem reads in lib check existence and throw with the path on miss.

### 2.3 Module Surface

- **ESM only** (`"type": "module"`). Never `require()`.
- **`node:` prefix for built-ins** — `node:fs`, `node:path`, `node:url`, `node:util`. Bare `fs` import is forbidden.
- **Named exports only.** No default exports. Imports use destructuring at the call site.
- **2-space indent, single quotes, semicolons.** Matches `src/index.js` and `src/commands/init.js` baseline.

### 2.4 Immutability and State

- **No global mutable state.** Configuration passed explicitly through function arguments; module-scope `const` only.
- **Pure helpers in `src/lib/`** — given the same arguments, return the same output. Side effects (file write, prompt) live in commands.
- **State files (`agentic-state.json`) are write-then-read.** Never mutate in place.

### 2.5 Forbidden Patterns

- No commented-out code. Delete; version control keeps history.
- No orphan `TODO` / `FIXME`. Reference a GitHub Issue or a `doc/tasks/NNNN-*.md` file.
- No `--no-verify` to bypass hooks.
- No `--no-gpg-sign`. DCO `Signed-off-by` is non-negotiable.
- No `try` block that loses error context. Re-throw with `cause:`.

---

## 3. Complexity Discipline

### 3.1 Object Calisthenics (Bay, *ThoughtWorks Anthology*, 2008)

**Tier: Loose.** Functional JS doesn't map cleanly to several OC rules (instance-variable counts, getter/setter bans, wrap-primitives are OOP-shaped).

**Adopted rules:**

- **Rule 1** — One level of indentation per function (guideline). Refactor deeper paths into named helpers.
- **Rule 6** — Don't abbreviate. Established domain terms exempt (`cli`, `cwd`, `fs`).
- **Rule 7** — Keep entities small. Function ~50 lines target; file ~200 lines target.

**Skipped rules and rationale:**

- **Rule 2** (no `else`) — early returns preferred but not enforced.
- **Rule 3** (wrap primitives) — JS lacks zero-cost newtypes.
- **Rule 4** (first-class collections) — arrays + `Set` are idiomatic.
- **Rule 5** (one dot per line / Law of Demeter) — not class-heavy codebase.
- **Rule 8** (≤2 instance variables) — N/A; not class-heavy.
- **Rule 9** (no getters / setters) — N/A.

Tier is editable as the project matures (append a rationale paragraph; do not delete the prior tier statement).

### 3.2 Cognitive Complexity

- Max cognitive complexity per function: **15** (no tool wired today; manual review per PR).
- Functions exceeding this threshold must be refactored before merge.

### 3.3 Size Guidelines

- Files: ~200 lines target; ~400 hard ceiling.
- Functions: ~50 lines target; 100 hard.
- Cyclomatic complexity: ≤10 per function (informational).

### 3.4 Indentation Depth

- Max 3 levels of nested control flow. Refactor deeper paths into named helpers.
- Prefer early returns over nested `if`/`else` chains.

---

## 4. API / Interface Rules

### 4.1 Stability

- **CLI surface** (`agentic init`, `agentic update`, `agentic profile`) is versioned. Breaking changes require a major-version bump and a migration note in the release.
- **`src/lib/` surface** is internal — change freely; downstream consumers do not depend on it.
- **Skill SKILL.md frontmatter** (`name`, `description`, `summary`, `allowed-tools`) is a public contract — `test/skills.test.js` enforces presence and size caps.

### 4.2 Error Surfaces

- Every CLI command documents its failure modes in `--help` (one line per non-zero exit code).
- Commands exit `0` on success, `1` on user error (bad flag, missing repo), `2` on internal error (filesystem failure, malformed state file).

### 4.3 Documentation Requirement

- Public surfaces: JSDoc on exported functions in `src/lib/` (purpose, parameters, return value, throws).
- Internal helpers: comments explain *why* a non-obvious choice was made, never *what*.

### 4.4 Versioning

- [Semantic Versioning 2.0](https://semver.org). Major.Minor.Patch.
- Pre-1.0: minor bumps may break CLI flags; document in release notes.

---

## 6. Build System

### 6.1 Toolchain

- **Language:** JavaScript, ESM (`"type": "module"`).
- **Node:** ≥20 (Node 18 EOL; `@clack/prompts` 1.x requires `node:util` `styleText` from Node 20+).
- **Build step:** **none.** Source is what ships; no transpilation, no bundling.
- **Source of truth for scripts:** `package.json` `scripts` field.

### 6.2 Dependencies

- **Manifest:** `package.json` (npm) — minimal runtime deps. Two only: `commander` (CLI), `@clack/prompts` (TUI).
- **Justification rule:** every dependency must justify its inclusion. New dep requires a comment in the PR explaining *why* the kit cannot do without it.
- **No dev framework.** No webpack, no babel, no typescript at the kit layer.

### 6.3 Compiler / Lint Settings

- **Strict mode:** ESM is strict by default; no `"use strict"` boilerplate.
- **Node-style imports:** `import { foo } from 'node:fs'` — `node:` prefix required.

---

## 7. Static Analysis and Formatting

**Current state: none wired.** This is a known gap.

| Tool | Status | Action |
|------|--------|--------|
| Formatter (Prettier / Biome) | not yet wired | `/ad-hooks` to scaffold; choose Prettier or Biome based on team preference |
| Linter (ESLint / Biome) | not yet wired | same |
| Type checker (TypeScript / JSDoc) | not yet wired | optional — JSDoc preferred for kit minimality |

Until tooling is wired, manual review per PR enforces §2 Code Standards. Adding lint/format gates is a separate decision per [ADR-0007](doc/adr/0007-workflow-operational-skills.md) §6.

---

## 8. Quality Gates

Deterministic enforcement per [WORKFLOW.md §11](WORKFLOW.md). Wired by `lefthook` and GitHub Actions.

```
Developer commits
        |
  pre-commit              intentionally absent (no lint/format wired)
        |
  Developer pushes
        |
  pre-push (lefthook)     npm test (full unit + integration suite)
                          Bootstrap: `lefthook install` after clone.
                          Config: lefthook.yml
        |
  GitHub Actions CI       npm test across Node 20 / 22
                          .github/workflows/test.yml
```

- **Pre-commit hook:** intentionally absent today. Adding lint/format gates is a separate decision (own ADR + Task per [ADR-0007](doc/adr/0007-workflow-operational-skills.md) §6).
- **Pre-push hook:** `npm test` runs the full suite. Mandatory before push.
- **CI:** mirrors pre-push across Node 20 / 22 matrix. Redundant with the local hook; both stay wired so a missing local install does not skip the gate.
- **Never bypass.** No `--no-verify`, no skipped hooks, no deleted failing tests.
- **CI failure is a local gate gap** ([WORKFLOW.md §11](WORKFLOW.md), TL;DR #22, [ADR-0032](doc/adr/0032-ci-failure-is-local-gate-gap.md)). Pre-push mirrors what CI runs — same commands, same matrix when it changes the failure surface. If CI catches something pre-push did not, close the gate locally; do not iterate red CI runs. `/ad-pr` refuses to open a PR on local red; `/ad-hooks` diffs pre-push against the CI config and warns on drift.

---

## 9. Testing Strategy

### 9.1 Pyramid

```
        E2E (none today)         Full CLI execution against a tmp repo
      Integration (most)         install / update / profile across tmp repos
    Unit (some)                  Pure helpers (detect, profiles, rootdoc)
```

The kit's nature (filesystem operations) means most tests are integration-style — they spin up a tmp dir, run the CLI, assert on resulting files.

### 9.2 Framework

`node:test` (built-in Node test runner). No jest, no vitest, no mocha. Runs via `npm test`.

### 9.3 Unit Tests

Pure helpers in `src/lib/` — `detect.js`, `profiles.js`, `rootdoc.js`, `state.js`. No filesystem, no subprocess. Each test under one second.

### 9.4 Integration Tests

Run `node bin/agentic.js init` / `update` / `profile` against a tmp directory. Assert on the resulting file tree, state file contents, AGENTS.md managed-section markers.

Fixtures live under `test/fixtures/`. Keep total fixture size minimal — under 100 KB. Generate brownfield state inline in tests when possible.

### 9.5 Regression Tests

Per [WORKFLOW.md §15](WORKFLOW.md) Phase 5. Every fixed bug gets a permanent test. Naming: `regression: <issue ref> <short description>` inside a `test()` call.

Regression tests are never deleted.

### 9.6 E2E Tests

Currently none. Add when the CLI grows surfaces that integration tests cannot exercise (e.g., interactive TTY flows, real npm publish dry-run).

### 9.7 TDD vs TDG

- **TDD** ([WORKFLOW §16](WORKFLOW.md), `/ad-tdd`) — when the behavior is test-expressible up front (new command, new lib helper with clear input/output). Red-green-refactor as deterministic guardrail.
- **TDG** ([WORKFLOW §9](WORKFLOW.md), `/ad-tdg`) — when the outcome is known but the implementation strategy has multiple plausible paths.

The Test Dependency Map (TDM) — list which tests cover a file before modifying it — is a pre-flight that pairs with either.

---

## 10. Git Workflow

### 10.1 Branch Strategy

- `main` — stable promotion target. Releases tagged from here.
- `cli` — active dev (functions like `develop`). Beta releases publish from this branch.
- Feature branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `refactor/<slug>`, `docs/<slug>`, `test/<slug>`, `perf/<slug>`.

**Never push directly to `main` or `cli`.** Always open a PR.

### 10.2 Commit Messages

[Conventional Commits 1.0](https://www.conventionalcommits.org/). Use `/ad-commit` for the disciplined flow.

- Subject: imperative, ≤72 chars, no trailing period.
- Body explains *why* when non-obvious. References `Closes task-NNNN`, `Per ADR-NNNN`, `Fixes #N`.
- **DCO sign-off:** every commit carries `Signed-off-by: <Name> <email>`. Use `git commit --signoff` or `/ad-commit`.
- **No `Co-Authored-By` trailer**.

### 10.3 Pull Requests

Open via `/ad-pr`. Uniform body shape:

```
## Summary
- <1-3 bullets — the WHY>

## Test plan
- [ ] <concrete test steps>

## Links
- task / spec / ADR / issue back-links
```

PR title format: Conventional Commits (type inferred from dominant commit type in the range).

### 10.4 Merge

Evaluate + merge via `/ad-merge`. CI green = hard gate. Fresh-context review, linked task, unresolved comments, mergeability surface as warnings.

Merge mode: merge commits (preserves atomic commit history). `--delete-branch` by default.

### 10.5 Never Bypass

No `--no-verify`, no skipped hooks, no deleted failing tests (per [WORKFLOW.md §11](WORKFLOW.md)).

---

## 11. Documentation Standards

Every document in this repo follows these rules:

1. **Definitions and decisions only.** No speculation, history, or unfounded plans.
2. **No dates, version stamps, `DRAFT` markers, or changelogs in narrative documents.** Decision-record artifacts under `doc/adr/`, `doc/tasks/`, `doc/specs/`, `doc/product/` are exempt — their lifecycle fields are the auditability primitive.
3. **No emoji anywhere.** Docs, code, comments, commits, PR bodies.
4. **Business context first.** Open every document with *why* — the problem, the constraint, the user.
5. **One scope per document. No duplication.** Canonical location owns the content; cross-references load-bearing only.
6. **Code is the primary documentation of behavior.** Comments justify *why* a non-obvious choice was made.
7. **No commented-out code; no orphan `TODO`/`FIXME` in source.** Every deferred item references a GitHub Issue or a `doc/tasks/NNNN-*.md` task.
8. **Tests are living documentation of behavior.** Test names read as the spec they enforce.
9. **Single responsibility per document.** Definition / decision-record / tracking — one role per document; no per-item tracking UI in definition docs.
10. **Each layer owns its directory index.** `doc/adr/`, `doc/tasks/`, `doc/specs/`, `doc/product/` are canonical indices; no digest of those indices in other documents.
11. **Cross-references must be load-bearing.** If removing a reference leaves the surrounding statement intact, the reference was decoration — drop it.

### 11.1 Document Scope

| Document | Scope | Audience |
|----------|-------|----------|
| `README.md` | What the kit is, how to install, how to use | Users |
| `AGENTS.md` (+ `CLAUDE.md` mirror) | Distilled non-negotiable rules read every session | AI agents, contributors |
| `WORKFLOW.md` | Universal engineering philosophy (kit-shipped to downstream installs) | Engineers |
| `GUIDELINES.md` (this document) | Project-specific engineering standards | Engineers |
| `ARCHITECTURE.md` | Source structure and dependency rules | Engineers |
| `doc/product/PRD.md` | Product-level scope (target user, success metrics, roadmap) | Product + engineering |
| `doc/specs/NNNN-*.md` | Feature-level specifications | Engineers |
| `doc/adr/NNNN-*.md` | Binding architectural decisions (Nygard format) | Engineers, future maintainers |
| `doc/tasks/NNNN-*.md` | Per-work-unit plan + acceptance criteria | Engineers |

### 11.2 AGENTS ↔ GUIDELINES reciprocity

`AGENTS.md` engineering sections (Code Style, Architectural Principles, Quality Gates, Security & Privacy) **point to** the corresponding GUIDELINES section rather than duplicating rules. The kit's `ad-audit` flags duplicated content as drift.

---

## 12. Security

### 12.1 Data Classification

- **No user data.** CLI is offline; no telemetry; no PII; no network calls from kit code.

### 12.2 Secret Handling

- **`.env` is gitignored.** Currently holds `NPMJS_TOKEN` consumed manually for `npm publish`.
- **No secrets in source control.** Credentials, tokens, API keys never committed.
- **No secret-scan hook wired today.** Gap — adding `gitleaks` or equivalent is tracked.

### 12.3 Files Agents Must Not Read or Modify

- `.env`, `.env.local`
- `.npmrc`
- `node_modules/`

### 12.4 Pre-approved Commands

The following do not require permission prompts when invoked by an agent:

- `node bin/agentic.js *`
- `npm test`, `npm start`, `npm install`
- `git status | diff | log | show`
- `gh pr|issue view`

### 12.5 Shell Execution

- No shell command execution from kit code with user-controlled arguments. The CLI does not exec arbitrary commands; it spawns `git`/`npm` with fixed argument lists.

### 12.6 Dependency Audit

- `npm audit` not wired into CI today. Gap — pre-1.0 acceptable; pre-release blocker.
- Manual audit on dependency bumps.

### 12.7 MCP Servers

- None approved for this kit.
