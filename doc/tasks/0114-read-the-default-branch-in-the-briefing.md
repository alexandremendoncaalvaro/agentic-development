# Task `0114`: Read the default branch in the briefing script

**Status:** in-progress
**Created:** 2026-10-09
**Scope ref:** doc/adr/0090-show-the-work-in-progress-briefing-in-the-session-plugin.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`ad-next/scripts/briefing.mjs` lists the commits ahead of a hard-coded `main`
(`main..HEAD`) to pick the active task and to order the plan approval against
the first implementing commit. In a repository whose default branch is not
`main`, or whose local `main` lags `origin`, those answers come out wrong or as
"cannot tell". Task 0100 gave `ad-project-state` a base resolved from local
refs (`origin/HEAD`, then `origin/main`, then `origin/master`) and left the
briefing on `main` (Task 0100 Notes).

## Acceptance Criteria

- [ ] The briefing compares against the same base `ad-project-state` resolves, and falls back to the current behaviour when none resolves.
- [ ] A regression test on a fixture whose default branch is not `main` names the active task.
- [ ] The `ad-next` survey counts the commits ahead of the same base and names that base, with a regression test on a non-`main` fixture.

## Plan

- [ ] `/ad-tdd` on both hosts' `briefing.mjs`, test first; byte parity holds.
- [ ] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-09

Opened from the kit hygiene batch review (Standards note on Task 0100: a
deferred item needs a tracked work item).

### 2026-10-09 — plan approved

The owner approved working this task next ("Pode ser prossiga"), on the Plan as written. The base is resolved as `ad-project-state` does (`origin/HEAD`, then `origin/main`, then `origin/master`), with a copy of that rule in the script: a skill script cannot import another skill's script (ADR-0057 decision 3). With none resolved the briefing keeps comparing against `main`.

### 2026-10-09 — scope extended to the survey

The review of the briefing fix found the same hard-coded `main..HEAD` in `ad-next/scripts/survey.mjs` (its `aheadOfMain` count). It is the same defect in the sibling script, so this task takes it rather than opening another: the survey resolves the base the same way, keeps the `aheadOfMain` field for its consumers, and adds a `base` field naming the ref it compared against.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
