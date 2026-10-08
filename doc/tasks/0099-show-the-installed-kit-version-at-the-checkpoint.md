# Task `0099`: Show the installed kit version at the checkpoint

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** doc/adr/0074-user-prompt-submit-workflow-checkpoint-hook.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

A skill copy installed from an older kit silently runs older steps. Task
0083 recorded `/ad-review` skipping verdict persistence on a machine whose
installed copy predated it, and on 2026-10-07 the global `ad-audit` copy
lacked the run-the-gate-once step merged in pull request 154. The agent has
no signal that its installed kit is stale. The workflow checkpoint already
reaches the model every prompt; naming the installed kit version there, and
whether it lags the published one when that is cheaply knowable offline,
makes the gap visible.

## Acceptance Criteria

- [ ] The checkpoint names the kit version recorded in the installed state file it can resolve, and says nothing extra when none is found.
- [ ] The hook stays offline, exit 0, and within its existing size cap; no network call is added.
- [ ] A test covers the found and not-found cases.
- [ ] ADR-0074 gains an addendum or a short ADR records the change, since it alters the checkpoint's static content.

## Plan

- [ ] Ground: where the installed state lives per scope (`src/lib/state.js`).
- [ ] Red, then green in `test/skill-scripts.test.js` and the script.
- [ ] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Routed from the `/ad-level-up` curation of 2026-10-07, which the owner approved in chat; it supersedes the unmerged task-0094 draft for this item.

### 2026-10-08 — plan approved

The owner approved the kit hygiene batch ("ok"), built in one branch with
Tasks 0112 and 0113.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
