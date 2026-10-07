# Task `0103`: Restate the function size limit as a review threshold

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** AGENTS.md (Code Style, pointing to GUIDELINES.md §3.3)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

GUIDELINES §3.3 calls the function limit "100 hard" while no tool enforces
it; Task 0091 already restated the file-size ceiling as a review threshold for
the same reason. A "hard" limit nothing checks teaches readers that hard
limits are optional.

## Acceptance Criteria

- [ ] §3.3 states the function size as a review threshold, or a lint rule enforces it and the text says so.
- [ ] `npm run verify` passes.

## Plan

- [ ] Decide threshold text versus lint rule against Task 0091's precedent.
- [ ] Edit §3.3; `/ad-review`; `/ad-commit`.

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
