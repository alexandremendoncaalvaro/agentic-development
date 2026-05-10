# Task `0008`: Codify documentation discipline rules across the kit

**Status:** done
**Created:** 2026-05-09
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

Eight prescriptive documentation-discipline rules brought from another project need to become standard for this kit and every project the kit bootstraps. Rules are universal and prescriptive, so they fit the loading mechanism [ADR-0005](../adr/0005-universal-agent-behavior-as-skill.md) chose for universal agent behavior — the `agentic-philosophy` skill, lazy-loaded on non-trivial work — extended with a `Documentation Discipline` section. Decision recorded in [ADR-0008](../adr/0008-documentation-discipline.md), including reconciliation of two collisions (Rule 2 with Nygard ADR/task date fields; Rule 7 with [ADR-0004](../adr/0004-file-based-task-tracking.md) file-based tracking) and the scope of "anywhere" for Rule 3 (emoji).

## Acceptance Criteria

- [x] [`doc/adr/0008-documentation-discipline.md`](../adr/0008-documentation-discipline.md) exists, status `accepted`, and reconciles Rules 2 and 7 against ADRs 0004 and 0005.
- [x] [`WORKFLOW.md`](../../WORKFLOW.md) §2 carries the eight rules with the narrative-doc-vs-decision-record exception called out for Rule 2 and the GitHub-Issue-or-`doc/tasks/` clarification for Rule 7.
- [x] [`src/skills/claude-code/agentic-philosophy/SKILL.md`](../../src/skills/claude-code/agentic-philosophy/SKILL.md) and [`src/skills/codex/agentic-philosophy/SKILL.md`](../../src/skills/codex/agentic-philosophy/SKILL.md) carry a `Documentation Discipline` section with the eight rules, both reconciliations, and triggers in the frontmatter `description` for documentation-writing turns.
- [x] Output contracts of [`agentic-bootstrap`](../../src/skills/claude-code/agentic-bootstrap/SKILL.md), [`agentic-architecture`](../../src/skills/claude-code/agentic-architecture/SKILL.md), [`agentic-adr`](../../src/skills/claude-code/agentic-adr/SKILL.md), [`agentic-task`](../../src/skills/claude-code/agentic-task/SKILL.md), [`agentic-design`](../../src/skills/claude-code/agentic-design/SKILL.md) reject violations of the rules at write time, with the narrative-versus-record exception preserved for ADR / task generators.
- [x] [`agentic-audit`](../../src/skills/claude-code/agentic-audit/SKILL.md) (both agents) reports a `Documentation discipline drift` category with the same scope rules.
- [x] No emoji in any kit-shipped file: `WORKFLOW.md`, `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `DESIGN.md` (if present), prompts, all skill bodies, all subagent files, all templates.
- [x] [`AGENTS.md`](../../AGENTS.md) §Architectural Principles lists ADR-0008 alongside the existing ADRs.
- [x] `npm test` passes (current 77/77).

## Plan

- [x] Branch `feat/0008-doc-discipline` cut from `cli`.
- [x] Write [`doc/adr/0008-documentation-discipline.md`](../adr/0008-documentation-discipline.md) in status `accepted`.
- [x] Write this task file.
- [x] Expand [`WORKFLOW.md`](../../WORKFLOW.md) §2 with the eight rules, the R1 narrative-vs-record exception, and the R2 tightening of `TODO`/`FIXME` references.
- [x] Add `Documentation Discipline` section to [`src/skills/claude-code/agentic-philosophy/SKILL.md`](../../src/skills/claude-code/agentic-philosophy/SKILL.md) and [`src/skills/codex/agentic-philosophy/SKILL.md`](../../src/skills/codex/agentic-philosophy/SKILL.md). Update frontmatter `description` triggers.
- [x] Update output contracts in [`agentic-bootstrap`](../../src/skills/claude-code/agentic-bootstrap/SKILL.md), [`agentic-architecture`](../../src/skills/claude-code/agentic-architecture/SKILL.md), [`agentic-adr`](../../src/skills/claude-code/agentic-adr/SKILL.md), [`agentic-task`](../../src/skills/claude-code/agentic-task/SKILL.md), [`agentic-design`](../../src/skills/claude-code/agentic-design/SKILL.md) — both Claude Code and Codex variants.
- [x] Add `Documentation discipline drift` checks to [`agentic-audit`](../../src/skills/claude-code/agentic-audit/SKILL.md) (both agents).
- [x] Sweep emoji from [`.claude/agents/fresh-context-reviewer.md`](../../.claude/agents/fresh-context-reviewer.md), [`src/skills/claude-code/agentic-review/agents/fresh-context-reviewer.md`](../../src/skills/claude-code/agentic-review/agents/fresh-context-reviewer.md), [`src/skills/codex/agentic-review/SKILL.md`](../../src/skills/codex/agentic-review/SKILL.md). Replace severity emoji with severity word only.
- [x] Reference ADR-0008 in [`AGENTS.md`](../../AGENTS.md) Architectural Principles list.
- [x] Run `npm test`. Fix anything that drifted.
- [x] Commit on the feature branch with Conventional Commits messages, one logical change per commit.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-05-09

Decision sequence with the user, captured before implementation:

- R1: ADRs and tasks are explicit exceptions to Rule 2; rule applies to narrative docs only.
- R2: tighten Rule 7 to accept either GitHub Issues or `doc/tasks/NNNN-*.md`, preserving [ADR-0004](../adr/0004-file-based-task-tracking.md).
- R3: emoji rule applies anywhere — docs, code, comments, commits, skill outputs.
- R4: when the user records a decision in this kit, that record is the fundamentação; "speculation" is what is *not* recorded.

Rule 3 sweep target inventory at task start: three severity-prefix emoji in the `agentic-review` skill and the bundled fresh-context-reviewer subagent (one per Blocker / Concern / Note line). No other emoji found in kit-shipped files.

### 2026-05-09 — close-out

All Acceptance Criteria checked. Implementation landed in seven commits on `feat/0008-doc-discipline`:

- `4b02745` — ADR-0008 + Task 0008.
- `4a5236d` — WORKFLOW.md §2 expansion.
- `9b57f13` — Documentation Discipline section in agentic-philosophy (both agents).
- `468918b` — Output contracts in five generator skills (both agents).
- `d65b871` — Documentation discipline drift category in agentic-audit (both agents).
- `8d4eb64` — Emoji severity tags removed from agentic-review skill + bundled subagent + Codex handoff.
- `9a3b23e` — AGENTS.md references ADR-0008.

`npm test` 77/77 green at HEAD. Fresh-context review (WORKFLOW §10) deferred — task closes pending dispatch via `caveman:cavecrew-reviewer` or natively once `/agentic-review` exercises the change.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
