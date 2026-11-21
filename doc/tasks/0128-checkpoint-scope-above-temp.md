# Task `0128`: Checkpoint script reads a user-level install above the temp directory as project scope

**Status:** todo
**Created:** 2026-11-21
**Scope ref:** doc/tasks/0099-show-the-installed-kit-version-at-the-checkpoint.md
**Evidence ref:** doc/tasks/0127-automatic-context-rollover.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

Found while building task 0127. The workflow checkpoint script walks up from the working directory looking for a kit install. On a machine whose user-level install sits above the operating system's temp directory (Windows: the home directory holds `AppData/Local/Temp`), a project under the temp directory is read as project scope. Two task-0099 tests were red on `main` for that reason; task 0127 made the tests build their own home and project, which hides the behaviour without fixing it.

## Acceptance Criteria

- [ ] A test reproduces it: a project below a directory that holds a user-level install is not reported as project scope.
- [ ] The script stops its walk at the home directory, or tells a user-level install from a project one, on both hosts' copies.

## Plan

- [ ] Reproduce with a fixture; decide the stop rule; fix; refresh the dogfood install.

## Notes

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
