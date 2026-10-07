# Task `0102`: Name the scope in the scratch install check

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** doc/adr/0057-skills-deterministic-steps-as-scripts.md (Decision 4)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

ADR-0057 Decision 4 asks for "a scratch `init`" to verify that a new script
installs, without naming `--scope project`. A bare `init` targets the user
scope, and on 2026-09-30 it rewrote the owner's machine-global skill installs
with an unmerged branch's kit (Task 0092). The check must say where it
installs.

## Acceptance Criteria

- [ ] ADR-0057 carries an addendum that names `--scope project` in a disposable directory for the scratch check.
- [ ] Every skill or doc that repeats the scratch-init step names the scope too.
- [ ] `npm run verify` passes.

## Plan

- [ ] Grep for the scratch-init instruction across `doc/` and `src/skills/`.
- [ ] Addendum plus the textual fixes.
- [ ] `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Routed from the `/ad-level-up` curation of 2026-10-07, which the owner approved in chat; it supersedes the unmerged task-0094 draft for this item.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
