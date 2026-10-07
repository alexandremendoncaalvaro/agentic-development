# Task `0100`: Warn when the checkout is behind origin

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** doc/specs/0006-configurable-project-evidence-sources.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

On 2026-10-07 `/ad-roadmap` read a checkout detached at an old commit while
`origin/main` was 37 merges ahead, and nearly reported a stale roadmap. The
state skills read the local tree without checking it against the upstream
they describe. The project-state resolver is the shared entry point, so it
can report how far the checkout is from its upstream from refs already
fetched, without a network call.

## Acceptance Criteria

- [ ] The project-state packet reports the checkout's branch or detached state and its ahead/behind counts against the default branch's remote-tracking ref, from local refs only.
- [ ] A detached or behind checkout is surfaced as a confidence limit that `ad-roadmap`, `ad-next` and `ad-brief` pass on.
- [ ] Tests cover detached, behind, and current checkouts with fixture repositories.

## Plan

- [ ] Red in `test/skill-scripts.test.js`.
- [ ] Green in `project-state.mjs` (both hosts, byte-identical) and the three consumers' text.
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
