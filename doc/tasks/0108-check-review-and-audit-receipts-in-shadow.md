# Task `0108`: Check review and audit receipts before PR actions, in shadow

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** doc/adr/0089-check-workflow-receipts-in-shadow-before-landing.md (decisions 1 and 2, review and audit check)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The check that answers the owner's most repeated question (RESEARCH-0037 E1):
was this exact state reviewed and audited before the pull request is opened,
readied or merged. `ad-audit` already writes the target SHA; `ad-review` does
not, and no single file summarizes an audit.

## Acceptance Criteria

- [ ] `ad-review` writes the reviewed target SHA into its verdicts file, on both hosts.
- [ ] `ad-audit` writes one summary file per audit with the target SHA and each finding's severity and disposition.
- [ ] `sequence-gate.mjs` logs "would block" before `gh pr create`, `gh pr ready` and `gh pr merge` when a fresh review or audit receipt for `HEAD` is missing, naming which, under the same freshness rule as Task 0107.
- [ ] `.agentic/gates.json` can turn the review or audit requirement off per repository; a repository whose review is done by a bot reads that evidence on the head SHA only when a local command does so within the hook's time budget.
- [ ] Tests cover each receipt present, missing and stale, and the per-repository switches.

## Plan

- [ ] Red, then green in the skill scripts and the gate (`/ad-tdd`); byte parity across both hosts.
- [ ] Skill text for `ad-review` and `ad-audit`; CHANGELOG.
- [ ] `/ad-review`; `/ad-audit`; `/ad-commit`; PR on the owner's approval.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with ADR-0089 (proposed) from RESEARCH-0037. Implementation waits for
the owner's acceptance of ADR-0089 and approval of this plan.

### 2026-10-07 — plan approved

The owner accepted ADR-0089 and approved this plan.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
