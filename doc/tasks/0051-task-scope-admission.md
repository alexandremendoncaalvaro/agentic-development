# Task `0051`: Require local scope anchors for new tasks

**Status:** done
**Created:** 2026-08-12
**Scope ref:** doc/adr/0067-require-local-task-scope-anchors.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Two proposed tasks were created in this repository from a separate project's
workflow. The task creation surface did not require a repository-local source
to establish ownership, and the state survey treated completed historical tasks
without a board or specification as current orphan findings. This task applies
ADR-0067 and reconciles the active task ledger.

## Acceptance Criteria

- [x] `ad-task` on both hosts establishes the current repository and refuses
      to create a task without a repository-local `Scope ref`.
- [x] The task template records the required `Scope ref`; an external board
      ticket cannot substitute for it.
- [x] The state survey recognizes `Scope ref` and reports only unfinished
      unanchored tasks as navigation orphans.
- [x] Every remaining proposed task in this repository has a local scope
      anchor, and the two legacy completion records have truthful checkboxes.
- [x] Tests, dogfood refresh, and fresh-context review pass before closure.

## Plan

- [x] Audit every task against the product roadmap, specifications, ADRs,
      implementation, and Git history; remove the two out-of-scope records.
- [x] Add the dual-host admission rule and template field with regression
      coverage.
- [x] Reconcile active task scope references and historical completion boxes.
- [x] Refresh dogfood, run the full gate, and obtain a fresh-context review.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-12

The audit traced the publication/report contamination to one commit,
`85159b5`, and found no remaining task, product, spec, ADR, source, or test
reference to that work after PR #101 removed tasks 0041 and 0042. The lasting
failure was task admission without a local scope anchor; ADR-0067 records the
correction.

The completed correction adds a dual-host deterministic `scope-anchors.mjs`
preflight, a required `Scope ref` template field, and the matching state-survey
rule. Review caught and fixed a second loophole: an unfinished task with only a
`Board ref` remains an orphan, because a board is supplementary rather than a
repository-local source. The regression suite covers accepted-ADR discovery,
external-path rejection, unreadable content, local scope acceptance, and the
board-only case. Dogfood refresh and a scratch `init --agent both` installed
and ran the new script on both hosts. `npm test` passed 609/609; `npm pack
--dry-run`, `ad-next`, and `ad-drift` also passed cleanly. The two-axis review
recorded no remaining findings.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
