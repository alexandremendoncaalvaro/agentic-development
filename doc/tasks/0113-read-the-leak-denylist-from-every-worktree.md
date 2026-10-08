# Task `0113`: Read the leak denylist from every worktree

**Status:** in-progress
**Created:** 2026-10-08
**Scope ref:** doc/adr/0033-house-ip-leak-guard.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The pre-commit leak-guard (ADR-0033) reads its markers from the gitignored
`.agentic/leak-denylist.txt` at the repository root of the working tree
(`src/leak-guard.js`, `DENYLIST_REL` joined to `repoRoot`). A gitignored file
is not shared by linked worktrees, so a commit made from a linked worktree
runs the guard with no markers and passes. On 2026-10-08 the company's name,
already a marker in the main checkout's denylist, reached three committed
files of this public repository through commits made from a linked worktree
(Task 0110 Notes, "company name redacted").

## Acceptance Criteria

- [ ] In a linked worktree without its own denylist, the guard reads the main worktree's `.agentic/leak-denylist.txt` (resolved through `git rev-parse --git-common-dir`) and blocks a staged marker.
- [ ] A worktree's own denylist, when present, is used together with the main worktree's, never silently instead of it.
- [ ] When no denylist is found anywhere, the guard says so once instead of passing silently.
- [ ] Tests cover a linked worktree with and without its own list, run with `GIT_DIR` stripped as AGENTS.md requires.

## Plan

- [ ] Red, then green (`/ad-tdd`) in `test/leak-guard.test.js` on a fixture repository with a linked worktree.
- [ ] Update ADR-0033's addendum or Notes only if the lookup rule changes what it binds; `npm run verify`; `/ad-review`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-08

Proposed after the company-name leak. As a stopgap, the linked worktree used
in this session links the main checkout's denylist.

### 2026-10-08 — plan approved

The owner approved starting the kit hygiene batch with this task ("ok").

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
