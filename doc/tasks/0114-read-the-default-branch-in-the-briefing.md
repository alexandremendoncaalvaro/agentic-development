# Task `0114`: Read the default branch in the briefing script

**Status:** done
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

- [x] The briefing compares against the same base `ad-project-state` resolves, and falls back to the current behaviour when none resolves.
- [x] A regression test on a fixture whose default branch is not `main` names the active task.
- [x] The `ad-next` survey counts the commits ahead of the same base and names that base, with a regression test on a non-`main` fixture.

## Plan

- [x] `/ad-tdd` on both hosts' `briefing.mjs`, test first; byte parity holds.
- [x] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-09

Opened from the kit hygiene batch review (Standards note on Task 0100: a
deferred item needs a tracked work item).

### 2026-10-09 — plan approved

The owner approved working this task next ("Pode ser prossiga"), on the Plan as written. The base is resolved as `ad-project-state` does (`origin/HEAD`, then `origin/main`, then `origin/master`), with a copy of that rule in the script: a skill script cannot import another skill's script (ADR-0057 decision 3). With none resolved the briefing keeps comparing against `main`.

### 2026-10-09 — scope extended to the survey

The review of the briefing fix found the same hard-coded `main..HEAD` in `ad-next/scripts/survey.mjs` (its `aheadOfMain` count). It is the same defect in the sibling script, so this task takes it rather than opening another: the survey resolves the base the same way, keeps the `aheadOfMain` field for its consumers, and adds a `base` field naming the ref it compared against.

### 2026-10-09 — built, reviewed and closed

Built test first. Red first, as the runner printed: `not ok 1 - regression: task-0114 compares against the default branch when it is not main` (expected `0002-other-task`), and `not ok 1 - regression: task-0114 survey counts commits ahead of a default branch that is not main` (expected `origin/trunk`). Both pass after the fix. Forcing the resolver back to `main` turned each test red again; after the refactor, one mutation of the shared `resolveBase` turned both red.

Reviews, as severity, finding, disposition:

- Briefing slice (fresh-context, both axes, at `6b73281`): no Blocker or Concern. Note: a test title still named `main`. Fixed. Note: `baseRef` may run three git calls. Accepted: negligible for a hook-run script. Note: no test covers the `origin/main`, `origin/master` or `main` fallbacks. Accepted: the criterion asks for the non-`main` case, and the existing `main` fixtures cover the fallback. Note: `survey.mjs` still hard-coded `main`. Fixed by extending this task.
- Survey delta (fresh-context, both axes, at `be87eec`): no Blocker. Concern: the base rule was copied in two scripts of the same skill, which already import each other. Fixed in 198f877: `survey.mjs` exports `resolveBase`, the briefing uses it. Note: a dangling `origin/HEAD` yields a null count. Accepted: `ad-project-state` behaves the same, and the three must agree. Note: regex flag order and two re-wrapped conditions in `survey.mjs`. Accepted: Prettier output the gate requires. Note: the new criterion was unchecked. Fixed here.

Gate `npm run verify` exit 0, 1398 of 1398.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
