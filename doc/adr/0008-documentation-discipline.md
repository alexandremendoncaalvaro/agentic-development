# ADR-0008: Documentation discipline rules ship as a section of `agentic-philosophy`, not as a separate skill or `AGENTS.md` block

**Status:** accepted
**Date:** 2026-05-09
**Deciders:** Alexandre Alvaro

## Context

Alexandre brought eight prescriptive rules from another project to standardize across this kit and every project the kit bootstraps:

1. Documentation contains definitions and decisions, not speculation, history, or unfounded plans.
2. No dates, version stamps, `DRAFT` markers, or changelogs in docs.
3. No emoji anywhere — docs, code, commits.
4. Every document starts with business context (why) before technical details.
5. One scope per document; no content duplicated across documents.
6. Code is the primary documentation of behavior; comments explain *why*, not *what*.
7. No commented-out code and no orphan `TODO`/`FIXME` in source.
8. Tests are living documentation of behavior.

Coverage in the kit today is partial:

- Rules 5, 6 are stated in [`WORKFLOW.md` §1, §2](../../WORKFLOW.md) and reinforced in [`agentic-philosophy` Simplicity First](../../src/skills/claude-code/agentic-philosophy/SKILL.md).
- Rule 7 is stated in `agentic-philosophy` and `WORKFLOW.md` §2 — but loosely (`references issue, ADR, or follow-up`), without binding to a specific tracking surface.
- Rule 4 appears implicitly in the `Project Overview` / `Overview` / `Context` sections of [`agentic-bootstrap`](../../src/skills/claude-code/agentic-bootstrap/SKILL.md), [`agentic-architecture`](../../src/skills/claude-code/agentic-architecture/SKILL.md), [`agentic-adr`](../../src/skills/claude-code/agentic-adr/SKILL.md), [`agentic-task`](../../src/skills/claude-code/agentic-task/SKILL.md) — never as an explicit rule.
- Rules 1, 2, 3, 8 appear nowhere.

Two of the rules collide with explicit kit decisions:

- **Rule 2 vs. ADR/task tracking.** [`templates/adr.md`](../../templates/adr.md) carries `**Date:**` (Nygard format), [`templates/task.md`](../../templates/task.md) carries `**Created:**` and an append-only `Notes` log dated per entry. [ADR-0004](0004-file-based-task-tracking.md) institutes file-based task tracking with date-stamped notes. Stripping dates everywhere would break the Nygard supersession lifecycle (`superseded by ADR-NNNN` is meaningless without ordering) and undo the auditability ADR-0004 was selected for.
- **Rule 7 vs. ADR-0004.** Rule 7 as originally written said "use GitHub Issues". The kit explicitly chose file-based tracking (`doc/tasks/NNNN-*.md`) over an external board.

[ADR-0005](0005-universal-agent-behavior-as-skill.md) already settled where prescriptive, repository-agnostic rules belong: in the `agentic-philosophy` skill, lazy-loaded on non-trivial work, not bundled into `AGENTS.md`. The motivation there applies identically to documentation discipline — rules are universal, prescriptive, and pay no token cost on trivial turns.

[ADR-0007](0007-workflow-operational-skills.md) introduced a parallel `workflow-operational` category for skills that execute a process. Documentation discipline is neither a process nor an artifact generator — it is contract-of-quality applied across every artifact the kit produces. ADR-0007 explicitly cautions against category-bloat (each new workflow-operational skill needs its own ADR). A new top-level skill is not warranted.

## Decision

We will codify the eight documentation discipline rules as a four-layer change, mirroring [ADR-0005](0005-universal-agent-behavior-as-skill.md):

1. **Canonical source** in [`WORKFLOW.md`](../../WORKFLOW.md) §2. Expand the existing "Docs vs. Code" section with the eight rules and the two reconciliations below. `WORKFLOW.md` already ships in the npm package; no new file.

2. **Operational delivery** as a new `Documentation Discipline` section inside [`agentic-philosophy/SKILL.md`](../../src/skills/claude-code/agentic-philosophy/SKILL.md) (and the Codex twin). Frontmatter `description` gains triggers for documentation work: *writing docs*, *writing readme*, *writing architecture*, *writing adr*, *writing task*, *audit docs*. Same lazy-load mechanism as ADR-0005 — rules cost zero tokens on trivial turns, load when the task warrants them.

3. **Enforcement at generation time.** The `Output contract` of every spec-driven generator skill — [`agentic-bootstrap`](../../src/skills/claude-code/agentic-bootstrap/SKILL.md), [`agentic-architecture`](../../src/skills/claude-code/agentic-architecture/SKILL.md), [`agentic-adr`](../../src/skills/claude-code/agentic-adr/SKILL.md), [`agentic-task`](../../src/skills/claude-code/agentic-task/SKILL.md), [`agentic-design`](../../src/skills/claude-code/agentic-design/SKILL.md) — is amended to reject violations of the rules at write time.

4. **Drift checks in audit.** [`agentic-audit`](../../src/skills/claude-code/agentic-audit/SKILL.md) gains a `Documentation discipline drift` category covering emoji, version stamps in narrative prose, business-context-first ordering, scope duplication, and orphan `TODO`/`FIXME`.

**Reconciliations the rules require:**

- **R1 — narrative-doc scope.** Rule 2 (no dates / version stamps / `DRAFT` markers / changelogs) applies to **narrative documents**: `README.md`, `AGENTS.md` / `CLAUDE.md`, `ARCHITECTURE.md`, `DESIGN.md`, specs, prose pages. **Decision-record artifacts** — ADRs under `doc/adr/` and tasks under `doc/tasks/` — are exempt. Rationale: ADR Status lifecycle (`proposed | accepted | deprecated | superseded by ADR-NNNN`) and the append-only `Notes` log are themselves the auditability primitive; they require dates by definition. The rule was written against narrative drift (READMEs that read as changelogs, architecture docs that mix decisions with timeline), which the exception preserves. Authority for this reconciliation: this ADR, accepted by the deciders below, per the kit's own working pattern that user decisions count as fundamentação when explicitly recorded.

- **R2 — `TODO`/`FIXME` in source.** The original rule said "use GitHub Issues". Kit binding from [ADR-0004](0004-file-based-task-tracking.md) is file-based task tracking. We tighten Rule 7 to: *every deferred item in source must reference either a GitHub Issue or a `doc/tasks/NNNN-*.md` task*. Both surfaces satisfy the spirit of the rule (an out-of-source, durable, addressable record) and the kit stays usable for solo work without a GitHub remote.

- **R3 — emoji scope.** "Anywhere" — docs, code, source comments, commit messages, PR bodies, skill outputs. The agentic-review severity emoji prefixes (one per Blocker / Concern / Note line) are dropped in favor of plain severity words (`Blocker / Concern / Note`), which already accompany them.

- **R4 — speculation vs. roadmap.** Rule 1 forbids speculation and unfounded plans; it does not forbid recorded decisions to defer. Concretely: "we will defer X to v0.3" backed by an ADR or accepted task is a decision and stays in scope; "we might add X later" without a record is speculation and is cut.

## Consequences

Positive:

- One coherent place to change documentation rules — `WORKFLOW.md` §2 — with mechanical delivery via the philosophy skill, the same pattern users already learn from [ADR-0005](0005-universal-agent-behavior-as-skill.md).
- Generator skills enforce the rules at write time, so violations do not need a separate audit pass to catch on first authorship.
- Audit gains a discipline category, so existing project docs surface drift on demand without the user re-reading every file.
- The kit dogfoods the rules across its own narrative docs (`README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `WORKFLOW.md`) and drops the emoji severity tags from `agentic-review`, removing the only standing rule-3 violation in the source tree.
- Solo users keep file-based task tracking; teams using GitHub Issues are equally valid; the rule no longer forces a backend choice that conflicts with [ADR-0004](0004-file-based-task-tracking.md).

Negative / trade-offs:

- The narrative-doc-versus-record-artifact distinction has to be taught; users may apply Rule 2 too aggressively and strip dates from ADRs. Mitigation: the Documentation Discipline section in `agentic-philosophy` and the `Output contract` in `agentic-adr` / `agentic-task` state the exemption explicitly.
- The philosophy skill grows by one section. Acceptable — single skill stays cheaper than splitting and avoids the category-bloat ADR-0007 cautioned against.
- Existing kit docs need a one-time sweep for emoji and version stamps. Mitigation: included in [Task 0008](../tasks/0008-documentation-discipline.md).
- Audit surface widens; more lines to scan per run. Mitigation: greps are cheap; checks are bounded to the four artifact types the kit already audits.

## Alternatives Considered

- **Bundle the rules into every generated `AGENTS.md`.** Rejected. Repeats the exact failure mode [ADR-0005](0005-universal-agent-behavior-as-skill.md) was written to fix — universal prescriptive content paying recurring token cost on every turn, inflating the per-project file the industry analysis specifically flags as the #1 anti-pattern.
- **Create a new skill `agentic-doc-discipline`.** Rejected. Two reasons: (i) `agentic-philosophy` is already the home for universal prescriptive rules per ADR-0005, splitting fragments the surface; (ii) the candidate is neither a process (workflow-operational) nor an artifact generator (spec-driven), so it does not fit either established category — adding a third risks the category-bloat [ADR-0007](0007-workflow-operational-skills.md) cautions against.
- **Document the rules only in `WORKFLOW.md`, no skill or generator changes.** Rejected. Same anti-pattern [ADR-0007](0007-workflow-operational-skills.md) §1 calls out: documenting a practice without delivering automation produces inconsistency between what the kit obligates and what it ships.
- **Apply Rule 2 strictly — strip dates from ADRs and tasks.** Rejected per R1 above. Breaks Nygard supersession semantics and the auditability rationale of [ADR-0004](0004-file-based-task-tracking.md).
- **Apply Rule 7 strictly — mandate GitHub Issues.** Rejected per R2 above. Kits a single backend choice into the philosophy skill, contradicting [ADR-0004](0004-file-based-task-tracking.md) and excluding solo users without a GitHub remote.
- **Keep the agentic-review emoji severity tags.** Rejected per R3 above. Rule 3 says "anywhere" and the severity word already carries the meaning the emoji marks.
