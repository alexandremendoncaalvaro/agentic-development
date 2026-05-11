# ADR-0029: Engineering Guidelines (`GUIDELINES.md`) as Layer 1 Constitution member and `ad-guidelines` skill

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

The kit's Layer 1 Constitution (`WORKFLOW.md` + `AGENTS.md`) covers universal philosophy and project-specific operational rules. Today, `AGENTS.md` is the only home for project-specific engineering guidelines — code style, error handling, naming, perf rules, testing strategy, security boundaries. That works while `AGENTS.md` stays small (≤150 lines, per [ADR-0011](0011-rootdoc-managed-section-pattern.md)). It does not scale to a real product: clean-architecture binding, SOLID application, object-calisthenics adoption, language idioms, build rules, static-analysis configuration, testing pyramid, and security policy collectively need more than a single 150-line file allows.

`mattpocock/skills` does not solve this; the gap is downstream of the patterns the kit absorbed. The working solution comes from a project the kit's author maintains: `CorridorKey-Runtime` ships `docs/GUIDELINES.md` (≈400 lines) sibling to `AGENTS.md` (≈150 lines). `AGENTS.md` carries the distilled, session-load rules; `GUIDELINES.md` carries the full reference. Each `AGENTS.md` section that has detail points to the corresponding `GUIDELINES.md` section ("see `docs/GUIDELINES.md` §2 for details"). The shape has shipped through multiple releases on that project; the engineer-author validates the pattern.

The pattern is independently validated across industry: Google Style Guides (per-language style separate from operational docs), Airbnb JavaScript Style Guide, Microsoft .NET Framework Design Guidelines, Linux kernel `Documentation/process/coding-style.rst`, CNCF style guides, OWASP secure coding practices. All separate engineering standards from architecture and operational guides.

The content canon is also stable:

- *Clean Architecture* (Martin, 2017) — Dependency Rule, boundaries.
- *Clean Code* (Martin, 2008) — naming, function size, comments-as-failure.
- "Object Calisthenics" (Bay, *ThoughtWorks Anthology*, 2008) — nine rules with adoption tiers.
- *Code Complete* 2nd ed (McConnell, 2004) — complexity, defensive programming.
- *Unit Testing Principles, Practices, and Patterns* (Khorikov, 2020) — behavior-vs-implementation tests.
- *The Pragmatic Programmer* (Hunt & Thomas, 1999/2019) — DRY, orthogonality.
- *The Twelve-Factor App* — https://12factor.net — config, dependencies, processes.

Placement question — *where in the artifact stack does it go?* — has three candidates:

- **Fold into Constitution (Layer 1) as a third member alongside WORKFLOW and AGENTS.** Constitution becomes a trinity. WORKFLOW = universal engineering philosophy (kit-shipped, every project). AGENTS = compressed project-specific rules (read every session). GUIDELINES = full project-specific engineering reference (read when an agent needs depth). All three answer "how is this project built" at different compression levels. **Accepted.**
- **New layer between Constitution and Domain.** Rejected: forces another renumber, and the artifact serves the same "how the project is built" question as AGENTS — different level of compression, not different concern.
- **Fold into Plan/Decisions (ARCHITECTURE + ADRs).** Rejected: ARCHITECTURE.md answers *what the system is* (structure, modules, dependencies); GUIDELINES answers *what rules code follows* (naming, error handling, complexity). Conflating them dilutes both, and the per-discipline categories (Performance / Static Analysis / Quality Gates / Testing / Documentation / Security) do not fit the architectural-decision shape of an ADR.

## Decision

1. **Add `GUIDELINES.md` to Layer 1 Constitution.** No new layer; no renumber. Trinity = WORKFLOW + AGENTS + GUIDELINES. WORKFLOW is universal (kit-shipped). AGENTS and GUIDELINES are project-specific (project-owned, kit-templated).

2. **File location.** `GUIDELINES.md` at repo root, joining `AGENTS.md`, `WORKFLOW.md`, `ARCHITECTURE.md`, `DESIGN.md` per [ADR-0006](0006-architecture-md-at-repo-root.md). Operational and standards documents cluster at root; per-feature/per-decision artifacts cluster under `doc/`.

3. **New skill `ad-guidelines`.** Spec-driven category per [ADR-0007](0007-workflow-operational-skills.md). Lazy lifecycle — the file does not exist until the project needs engineering standards. Scan-first like `ad-bootstrap` per [Task 0006](../tasks/0006-bootstrap-flow-and-agents-md-bloat-fix.md): reads language toolchain, existing test/lint/format configuration, existing `AGENTS.md` Code Style and Architectural Principles sections, then pre-fills every placeholder it can verify before asking the user.

4. **Pre-suggested content.** The template ships substantial defaults derived from the canonical sources above plus the CorridorKey-Runtime working pattern, so the skill does not start from a blank page. Defaults that depend on detected signals (language, test framework, lint/format toolchain, architecture pattern) get filled by the scan; defaults that depend on user preference (Object Calisthenics tier, perf budget, security posture) get asked once, then the relevant rules are committed to the file. Sections the user does not need are skipped, not left as `<TODO>` clutter.

5. **Template sections (twelve).**
   1. **Design Principles** — Clean Architecture Dependency Rule; SOLID with project-specific application; explicit project tradeoff statement (e.g., "reliability over throughput").
   2. **Code Standards** — naming convention table per language, error-handling idiom, immutability/const-correctness, no global mutable state, no commented-out code, no orphan `TODO`/`FIXME`.
   3. **Complexity Discipline** — Object Calisthenics tier (loose / moderate / strict); cognitive-complexity limit per function (default 15); function/file size guidelines; indentation-depth budget.
   4. **API / Interface Rules** — public-surface stability, error type contract, documentation requirement, version policy.
   5. **Performance Standards** — optional; hot-path rules, memory locality, profiling baseline. Skipped when no perf budget exists.
   6. **Build System** — toolchain, dependency manager, reproducible builds.
   7. **Static Analysis & Formatting** — linter, formatter, naming enforcement. Wired to pre-commit per [ADR-0007](0007-workflow-operational-skills.md) §6 (ad-hooks).
   8. **Quality Gates** — pre-commit (fast); pre-push (thorough); CI mirror. References `ad-hooks` for scaffold.
   9. **Testing Strategy** — pyramid (unit / integration / e2e); regression discipline; TDD when behavior is test-expressible (per [WORKFLOW §16](../../WORKFLOW.md)); tag taxonomy; fixture size limit; naming convention.
   10. **Git Workflow** — branch strategy; Conventional Commits + DCO sign-off (per `ad-commit`); PR shape (per `ad-pr`); merge mode (per `ad-merge`); no `--no-verify`.
   11. **Documentation Standards** — references [WORKFLOW.md §2](../../WORKFLOW.md) + `ad-philosophy`; project-specific extensions only.
   12. **Security** — boundaries, input validation, dependency audit, secret handling.

6. **Object Calisthenics adoption tiers.** Ask once. Map tier → rules (Bay 2008):
   - **Loose** (3 of 9): small entities, no abbreviations, single-level indentation as guideline.
   - **Moderate** (6 of 9): adds no `else` chains, wrap primitives, first-class collections.
   - **Strict** (9 of 9): adds one dot per line, ≤2 instance variables per class, no getters/setters.

   Tier is editable in `GUIDELINES.md` §3 over time. The template lists all nine rules with the adopted subset checked.

7. **AGENTS.md ↔ GUIDELINES.md reciprocity.** When `GUIDELINES.md` exists, `ad-bootstrap` writes pointers in `AGENTS.md` rather than duplicating rules: "Code Standards — see [`GUIDELINES.md`](GUIDELINES.md) §2 for details." `ad-audit` flags AGENTS sections that duplicate GUIDELINES sections as drift. The pattern preserves the kit's anti-duplication rule ([WORKFLOW.md §2](../../WORKFLOW.md) rule #5).

8. **Profile coverage.** Mirrors PRD posture per [ADR-0027](0027-product-layer.md):
   - **`poc`:** blocked. A spike or experiment does not need full engineering guidelines — ceremony that does not change agent behavior.
   - **`solo`:** universal. A solo developer shipping a real product benefits as much as a team (CorridorKey-Runtime is the existence proof — solo project, full GUIDELINES.md).
   - **`team`:** universal.
   - **`mature`:** universal.

9. **Coupling.** The `ad-guidelines` skill, `templates/guidelines.md`, `profiles.js` registration, the WORKFLOW §1 trinity update, and the README / AGENTS table updates land together. The kit must never reference Layer 1 trinity without the skill that owns the third member.

## Consequences

**Positive.**
- AGENTS.md stays compressed (per [Task 0006](../tasks/0006-bootstrap-flow-and-agents-md-bloat-fix.md)'s anti-bloat goal); engineering depth scales separately in GUIDELINES.md.
- Pre-suggested template content cuts interview cost — agent fills detected fields, asks only the preference questions (Object Calisthenics tier, perf budget, security posture).
- Object Calisthenics adoption explicit, not implicit — the kit no longer assumes one tier.
- AGENTS↔GUIDELINES reciprocity makes the distillation pattern auditable: ad-audit flags duplicated content.

**Negative.**
- One more file at the repo root. Mitigated by lazy creation and the explicit poc exclusion.
- Skill template is large surface (twelve sections); mitigated by section-by-section lazy fill — sections the user skips do not land in the file.
- AGENTS↔GUIDELINES drift risk if `ad-bootstrap` does not write pointers correctly. Mitigated by `ad-audit` detection and by the documented reciprocity rule in this ADR.

**Neutral.**
- Industry parity. The kit now matches Google / Airbnb / Linux-kernel / CNCF separation of engineering standards from operational docs.

## Alternatives considered

- **Expand `AGENTS.md` to host all engineering rules.** Rejected: violates the kit's own anti-bloat rule for `AGENTS.md` ([Task 0006](../tasks/0006-bootstrap-flow-and-agents-md-bloat-fix.md)); the file is meant to load every session, and bloating it taxes every conversation in the project.

- **Fold engineering guidelines into `WORKFLOW.md`.** Rejected: WORKFLOW is universal kit-shipped philosophy; project-specific rules belong in project-owned files.

- **One skill per discipline (separate skills for `ad-code-style`, `ad-testing-strategy`, `ad-security`).** Rejected: the disciplines reference each other (testing references quality gates references static analysis references code standards); splitting them forces N skill invocations to write content that naturally lives in one file.

- **Adopt object calisthenics as a binding kit-wide default (always strict).** Rejected: rule tier should match project maturity and language idiom — a Python micro-service does not benefit from the same rigor a C++ library does. Tier selection per project preserves the discipline-scales-with-maturity principle ([WORKFLOW.md §1 TL;DR #19](../../WORKFLOW.md)).

## References

- *Clean Architecture* (Martin, 2017) — Dependency Rule.
- *Clean Code* (Martin, 2008) — naming, function size, comments-as-failure.
- "Object Calisthenics" (Bay, *ThoughtWorks Anthology*, 2008) — nine rules.
- *Code Complete* 2nd ed (McConnell, 2004) — complexity, defensive programming.
- *Unit Testing Principles, Practices, and Patterns* (Khorikov, 2020) — behavior-vs-implementation.
- *The Pragmatic Programmer* (Hunt & Thomas, 1999/2019) — DRY, orthogonality.
- *The Twelve-Factor App* — https://12factor.net.
- [Google Style Guides](https://google.github.io/styleguide/) — per-language style precedent.
- [Linux kernel coding-style](https://www.kernel.org/doc/html/latest/process/coding-style.html) — engineering-guidelines-as-separate-document precedent.
- [`CorridorKey-Runtime/docs/GUIDELINES.md`](https://github.com/) — working pattern; 400-line eng guidelines sibling to 150-line AGENTS.md.
- [ADR-0006](0006-architecture-md-at-repo-root.md) — operational/standards docs at root.
- [ADR-0007](0007-workflow-operational-skills.md) — spec-driven skill category.
- [ADR-0008](0008-documentation-discipline.md) — eight rules that GUIDELINES.md inherits.
- [ADR-0011](0011-rootdoc-managed-section-pattern.md) — AGENTS.md size constraint.
- [ADR-0013](0013-project-maturity-profiles.md) — profile catalog.
- [ADR-0019](0019-domain-language-layer.md) — Layer-1-extension precedent (Domain).
- [ADR-0027](0027-product-layer.md) — solo+ universal profile pattern.
- [Task 0006](../tasks/0006-bootstrap-flow-and-agents-md-bloat-fix.md) — AGENTS.md anti-bloat goal.
- [`WORKFLOW.md`](../../WORKFLOW.md) §1 — Layer 1 trinity updated by this ADR.
