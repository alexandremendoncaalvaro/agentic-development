# Engineering Guidelines

Coding standards, complexity discipline, API rules, build system, testing strategy, and security policy for this project. Reference for contributors and reviewers. Companion to [`AGENTS.md`](AGENTS.md) (compressed rules read every session) and [`ARCHITECTURE.md`](ARCHITECTURE.md) (system structure).

**Scope:** *what rules code follows.* Not *what the system is* (ARCHITECTURE) or *who the product is for* (`doc/product/PRD.md`).

---

## 1. Design Principles

### 1.1 Clean Architecture (Martin, 2017)

The codebase follows a layered dependency direction. Lower layers do not depend on higher layers. External-library types do not appear in public/interface surfaces; they are wrapped at the boundary.

```
<adapter / UI / CLI / plugin>
        depends on
<application services / use cases>
        depends on
<domain / core logic>
        depends on
<external libraries — wrapped at the edge>
```

Rules:

- A lower layer never imports a higher layer.
- External library types never leak into public interfaces; they are wrapped at the seam.
- No circular dependencies.

### 1.2 SOLID Principles (Martin)

| Principle | Application in this project |
|-----------|-----------------------------|
| **S** — Single Responsibility | Each module/class has one reason to change. |
| **O** — Open / Closed | New capabilities slot in without modifying existing core code. |
| **L** — Liskov Substitution | Implementations of an interface are interchangeable through the abstraction. |
| **I** — Interface Segregation | Clients depend only on the methods they actually call. |
| **D** — Dependency Inversion | Core depends on abstractions, not concrete external types. |

### 1.3 Project Tradeoff Statement

State one explicit tradeoff that engineering decisions should reflect. Examples:

- *"Reliability over throughput."*
- *"Portability over peak performance."*
- *"Time-to-first-pixel over cache-hit ratio."*
- *"Operator observability over startup time."*

If you cannot name one, the project has not made the tradeoff yet — that is a smell.

> **This project:** `<state tradeoff here>`.

---

## 2. Code Standards

### 2.1 Naming Conventions

| Element | Convention |
|---------|-----------|
| Functions, variables, files | `<per-language>` |
| Types (classes, structs, enums) | `<per-language>` |
| Constants and macros | `<per-language>` |
| Private members | `<per-language>` |

No abbreviations except established domain terms (e.g. `rgb`, `fps`, `io`, `url`, `http`).

### 2.2 Error Handling

State the project's policy. Examples by stack:

- **C++:** `std::expected<T, Error>` or `Result<T>` return types. No exceptions across module boundaries where avoidable.
- **Rust:** `Result<T, E>` everywhere. `?` for propagation. `panic!` only on bugs, never on expected failures.
- **TypeScript/JavaScript:** discriminated unions (`{ ok: true, value } | { ok: false, error }`) at boundaries; thrown exceptions for programmer-error invariants only.
- **Python:** typed exceptions. Domain errors derive from a project-root `Error` class.
- **Go:** error returns. Wrap with `fmt.Errorf("...: %w", err)` at call sites.

> **This project:** `<state policy here>`.

### 2.3 Immutability and State

- Prefer immutable values. Document why each mutable surface is mutable.
- No global mutable state. Configuration is passed explicitly (dependency injection or function arguments).
- For systems languages: const-correctness everywhere; RAII for all resources; no raw owning pointers.

### 2.4 Forbidden Patterns

- No commented-out code. Delete it; version control keeps history.
- No orphan `TODO` / `FIXME`. Reference a GitHub Issue or a `doc/tasks/NNNN-*.md` file (per [WORKFLOW §2](WORKFLOW.md) rule #7).
- No `--no-verify` to bypass hooks.
- No `std::exit` / `abort` / `process.exit()` / `os.Exit()` inside library code — return errors and let callers decide.

---

## 3. Complexity Discipline

### 3.1 Object Calisthenics (Bay, *ThoughtWorks Anthology*, 2008)

Definitional. State the tier the project adopts. Tier is editable as the project matures (append a rationale paragraph; do not delete the prior tier statement).

**Tier:** `<loose | moderate | strict>`.

**Tier definitions:**

- **Loose** — Rule 6 (no abbreviations), Rule 7 (small entities, relaxed targets), Rule 1 (one level of indentation as a guideline).
- **Moderate** — Loose + Rule 2 (no `else`), Rule 3 (wrap primitives), Rule 4 (first-class collections).
- **Strict** — All nine: Loose + Moderate + Rule 5 (one dot per line / Law of Demeter), Rule 8 (≤2 instance variables per class), Rule 9 (no getters / setters / properties — tell, don't ask).

**Full rule reference (Bay 2008):**

1. One level of indentation per method.
2. Don't use the `else` keyword.
3. Wrap all primitives and strings that carry domain meaning.
4. First-class collections.
5. One dot per line (Law of Demeter).
6. Don't abbreviate.
7. Keep all entities small.
8. No classes with more than two instance variables.
9. No getters / setters / properties.

### 3.2 Cognitive Complexity

- Max cognitive complexity per function: **15** (configure SonarQube / `clippy::cognitive_complexity` / equivalent).
- Functions exceeding this threshold must be refactored before merge.

### 3.3 Size Guidelines

- Files: ~200 lines target, hard ceiling negotiable per language idiom.
- Functions: ~50 lines target, hard ceiling 100.
- Cyclomatic complexity: ≤10 per function (informational).

### 3.4 Indentation Depth

- Max 3 levels of nested control flow. Refactor deeper paths into named helpers.
- Prefer early returns over nested `if`/`else` chains.

---

## 4. API / Interface Rules

### 4.1 Stability

- Public surfaces (anything callers depend on) are versioned. Breaking changes require a major-version bump and a migration note.
- Internal surfaces can change freely.

### 4.2 Error Contracts

- Every public function documents its error modes.
- Errors carry a descriptive code and a message usable in any UI.

### 4.3 Documentation Requirement

- Public API: doc-comment on every exported function/class (states purpose, parameters, return value, preconditions, error conditions).
- Internal code: comments explain *why* a non-obvious choice was made, never *what* the line does (per [WORKFLOW §2](WORKFLOW.md) rule #6).

### 4.4 Versioning

- [Semantic Versioning 2.0](https://semver.org). Major.Minor.Patch.
- Pre-1.0 minor bumps may break public surfaces; document explicitly.

---

## 5. Performance Standards

*Optional. Skip this section when the project has no perf budget.*

### 5.1 Hot-Path Rules

- No heap allocation inside hot loops.
- No expensive math (`pow`, `exp`, `log`) inside per-pixel / per-row / per-iteration loops; precompute or use lookup tables.
- Branchless hot paths where the data shape allows.

### 5.2 Memory Locality

- Sequential access patterns; pre-allocate working buffers at lifecycle creation, not per-call.
- Alignment requirements: `<state if SIMD / cache-line constraints apply>`.

### 5.3 Profiling Baseline

- Baseline measurement captured in `<doc/perf/baseline.md or equivalent>`.
- Regressions over `<X>`% on the named benchmark block the change.

---

## 6. Build System

### 6.1 Toolchain

- Language: `<language + version>`.
- Build: `<build system + version>`.
- Source of truth for build configurations: `<file>` (e.g. `CMakePresets.json`, `package.json` scripts, `Cargo.toml`, `pyproject.toml`).

### 6.2 Dependencies

- Manifest manager: `<vcpkg | npm | cargo | pip | go modules | …>`.
- Every dependency must justify its inclusion. Comment in the manifest (or a `DEPENDENCIES.md`) explaining *why* the dependency exists.
- No new dependency without that justification.

### 6.3 Compiler / Linter Settings

- Strict warnings as errors (e.g., `-Wall -Wextra -Wpedantic -Werror`, `clippy::all`, `eslint --max-warnings 0`, `mypy --strict`).
- Sanitizers enabled in debug builds where supported (AddressSanitizer, UBSan, `cargo test --features=sanitize`).

---

## 7. Static Analysis and Formatting

| Tool | Purpose | Config file |
|------|---------|-------------|
| `<formatter>` | Code formatting | `<config path>` |
| `<linter>` | Static analysis | `<config path>` |
| `<naming/idiom checker>` | Naming enforcement | `<config path>` |

The authoritative configuration is the config file at the project root. Do not override per-file unless absolutely necessary.

---

## 8. Quality Gates

Deterministic enforcement per [WORKFLOW.md §11](WORKFLOW.md). Wired by `ad-hooks`.

```
Developer commits
        |
  pre-commit (< 30s)        Fast — staged files only
                            <formatter | secret-scan | file hygiene>
        |
  Developer pushes
        |
  pre-push (< 5min)         Thorough — full codebase
                            <build | unit + integration tests>
        |
  Repository CI             <cross-platform / multi-version matrix>
```

- **Pre-commit hook:** Fast checks. Format, lint, secrets, doc consistency.
- **Pre-push hook:** Full build + tests. Mandatory before merge.
- **CI:** Mirror of pre-push across the supported matrix.
- **Never bypass.** No `--no-verify`. Failing tests means not ready (per [WORKFLOW.md §11](WORKFLOW.md)).

---

## 9. Testing Strategy

### 9.1 Pyramid

```
        E2E (few)               Full binary, real environment
      Integration (some)        Multiple modules, real files, no external services
    Unit (many)                 Single function/class in isolation, < 1 second
```

### 9.2 Unit Tests

Single function or class, no I/O, no network, no external services. Each test completes under one second. Framework: `<framework name>`.

Test: pure logic, edge cases, value-type validation, error paths.

Do not unit test: thin wrappers around external libraries, trivial constructors, private implementation details.

### 9.3 Integration Tests

Multiple modules together. May use real files from `tests/fixtures/` (keep fixture total under `<size>` MB).

### 9.4 End-to-End Tests

Full binary execution with real dependencies. Slow; run locally on demand, nightly in CI, mandatory before release.

### 9.5 Regression Tests

Prevent specific bugs from reoccurring per [WORKFLOW.md §15](WORKFLOW.md) Phase 5. Process:

1. Write a failing test that reproduces the bug.
2. Fix the bug.
3. Keep the test permanently. **Regression tests are never deleted.**

Naming: `test_regression_<issue_or_task_ref>_<short_description>`.

### 9.6 Tag Taxonomy

| Tag | Scope | Schedule |
|-----|-------|----------|
| `[unit]` | No I/O, no external services | Every commit |
| `[integration]` | May use disk, no external services | Every push, CI |
| `[e2e]` | Real dependencies | Nightly, before release |
| `[regression]` | Bug reproductions | Same as parent level |
| `[benchmark]` | Performance tracking | Nightly |

Domain tags (`[<area>]`) combine with level tags.

### 9.7 TDD vs TDG

- **TDD** ([WORKFLOW §16](WORKFLOW.md)) — when the behavior is test-expressible up front. Red-green-refactor as deterministic guardrail.
- **TDG** ([WORKFLOW §9](WORKFLOW.md)) — when the outcome is known but the implementation strategy has multiple plausible paths. Ground-truth pair + three approaches + criterion.

The Test Dependency Map (TDM) — list which tests cover a file before modifying it — is a pre-flight that pairs with either.

---

## 10. Git Workflow

### 10.1 Branch Strategy

`main` is the integration branch and stays releasable. Merge only after local quality gates pass and review is complete. Do not commit directly to `main`.

Branch prefixes: `feat/`, `fix/`, `chore/`, `test/`, `refactor/`, `docs/`, `perf/`.

### 10.2 Commit Messages

[Conventional Commits 1.0](https://www.conventionalcommits.org/). Prefixes: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `perf`.

Subject: imperative, ≤72 chars, no trailing period.
Body (optional): explains *why*, not *what*. References `Closes task-NNNN`, `Per ADR-NNNN`, or `Fixes #N` when applicable.

### 10.3 DCO Sign-off

Every commit carries a `Signed-off-by: <Name> <email>` trailer. Use `git commit --signoff` or invoke `/ad-commit` (kit-internal).

### 10.4 Pull Requests

Open via `/ad-pr` (uniform Summary / Test plan / Links body shape).

### 10.5 Merge

Evaluate + merge via `/ad-merge` (CI hard gate; fresh-context review, linked task, unresolved comments, mergeability as warnings).

### 10.6 Never Bypass

No `--no-verify`, no skipped hooks, no deleted failing tests (per [WORKFLOW.md §11](WORKFLOW.md)).

---

## 11. Documentation Standards

The eight-rule discipline from [WORKFLOW.md §2](WORKFLOW.md) (operationalized by `ad-philosophy`) binds every document. Summary:

1. Definitions and decisions only. No speculation, history, or unfounded plans.
2. No dates, version stamps, `DRAFT` markers, or changelogs in narrative documents. Decision-record artifacts under `doc/adr/`, `doc/tasks/`, `doc/specs/`, `doc/product/` are exempt.
3. No emoji anywhere.
4. Business context first.
5. One scope per document. No duplication.
6. Code is the primary documentation of behavior.
7. No commented-out code; no orphan `TODO`/`FIXME` in source.
8. Tests are living documentation of behavior.

### 11.1 Document Scope

| Document | Scope | Audience |
|----------|-------|----------|
| `README.md` | What this is, how to install, how to use | Users |
| `AGENTS.md` (+ `CLAUDE.md` mirror) | Distilled non-negotiable rules read every session | AI agents, contributors |
| `WORKFLOW.md` | Universal engineering philosophy (kit-shipped) | Engineers |
| `GUIDELINES.md` (this document) | Project-specific engineering standards | Engineers |
| `ARCHITECTURE.md` | Source structure and dependency rules | Engineers |
| `doc/product/PRD.md` | Product-level scope (target user, success metrics, roadmap) | Product + engineering |
| `doc/specs/NNNN-*.md` | Feature-level specifications | Engineers |
| `doc/adr/NNNN-*.md` | Binding architectural decisions | Engineers, future maintainers |
| `doc/tasks/NNNN-*.md` | Per-work-unit plan + acceptance criteria | Engineers |
| `CONTRIBUTING.md` | Dev environment setup, PR process | Contributors |

---

## 12. Security

### 12.1 Boundaries

- Input validation at every system boundary (user input, external APIs, file headers, untrusted data).
- No trust in upstream data without explicit validation.

### 12.2 Secret Handling

- No secrets in source control. `.env`, credentials files, tokens — all in `.gitignore`.
- Secrets are provisioned per-environment (env vars / secret manager / vault).
- Pre-commit secret-scan hook required when the project handles credentials.

### 12.3 Dependency Audit

- Vulnerability scanning in CI (`npm audit`, `cargo audit`, `pip-audit`, `vcpkg audit`, etc.).
- Critical vulnerabilities block release.

### 12.4 Shell Execution

- No shell command execution from library code with user-controlled arguments. Use parameterized APIs.

### 12.5 Untrusted Input

- File-format parsers (image, video, archive) treat input as adversarial. Use built-in limits where the library supports them.
