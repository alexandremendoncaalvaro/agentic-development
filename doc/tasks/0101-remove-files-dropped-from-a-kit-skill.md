# Task `0101`: Remove files dropped from a kit skill on update

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** ARCHITECTURE.md (Skill installation pattern: `removeOrphanSkills`)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The installer removes whole skills that leave the kit but leaves a single
file that a kit skill dropped in a consumer's existing install: Task 0090
deleted `spike-adr-template.md` from `/ad-spike`, and consumers keep the stale
copy. The state file already records every installed file with its source
digest, so an unchanged file the kit no longer ships can be removed under the
same unchanged-file rule `removeOrphanSkills` applies.

## Acceptance Criteria

- [ ] `update` removes a file recorded in state that the kit no longer ships, when the file is unchanged from its recorded digest.
- [ ] A user-edited dropped file is kept and reported, never deleted silently.
- [ ] Tests in `test/update.test.js` cover both cases.

## Plan

- [ ] Red in `test/update.test.js`.
- [ ] Green in `src/lib/install.js`.
- [ ] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

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
