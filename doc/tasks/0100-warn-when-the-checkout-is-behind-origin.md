# Task `0100`: Warn when the checkout is behind origin

**Status:** in-progress
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

- [x] The project-state packet reports the checkout's branch or detached state and its ahead/behind counts against the default branch's remote-tracking ref, from local refs only.
- [x] A detached or behind checkout is surfaced as a confidence limit that `ad-roadmap`, `ad-next` and `ad-brief` pass on.
- [x] Tests cover detached, behind, and current checkouts with fixture repositories.

## Plan

- [x] Red in `test/skill-scripts.test.js`.
- [x] Green in `project-state.mjs` (both hosts, byte-identical) and the three consumers' text.
- [ ] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Routed from the `/ad-level-up` curation of 2026-10-07, which the owner approved in chat; it supersedes the unmerged task-0094 draft for this item.

### 2026-10-08 — plan approved

The owner approved the kit hygiene batch ("ok"), built in one branch with
Tasks 0112 and 0113.

### 2026-10-08 — built

`project-state.mjs` (both hosts, byte-identical) adds `checkout` to the
packet: `branch` or `detached`, the base from `refs/remotes/origin/HEAD` (or
`origin/main`, then `origin/master`), and `ahead`/`behind` from
`git rev-list --left-right --count`, all from local refs; null outside git.
`ad-project-state` documents the field, and `ad-next`, `ad-roadmap` and
`ad-brief` carry a detached or behind checkout as a confidence limit. Tests:
two regression tests on a cloned fixture (behind; current, detached and
non-git), red first; swapping `ahead` and `behind` turned both red; a static
test pins the confidence-limit sentence in the three consumers on both hosts.
The work-in-progress briefing script still compares against a hard-coded
`main`; reading this packet's base there is left for later.

### 2026-10-09 — batch review

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes, verdicts at `.agentic/reviews/20261008T231440Z-commit-range-batch-verdicts.md`), no Blocker. Refuted: a feature branch behind its default branch is a real confidence limit for `ad-next`, `ad-roadmap` and `ad-brief`, since tasks merged there are invisible in the checkout; the limit stays on any branch. Fixed: the deferred briefing base is now tracked as Task 0114.

### 2026-10-09 — review and audit record

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes) and the `/ad-audit` of `origin/main..23252ae` (19 rule groups, the critical claims group run three times across two models; gate `npm run verify` exit 0, 1394 of 1394). Neither found a Blocker. Batch-wide findings and the full table are in the pull request body. Findings for this task, as severity, finding, disposition:

- Review Note: `behind` fires on every feature branch. Refuted: tasks merged on the default branch are invisible in that checkout, so the confidence limit is real on any branch.
- Review Note: the briefing's hard-coded `main` was deferred untracked. Fixed: Task 0114.
- Audit minor: ADR-0079's packet list does not name `checkout`. Accepted: the field is additive within that decision; `ad-project-state` and CONTEXT.md now describe it.
- Audit minor: CONTEXT.md's packet entry omitted the field. Fixed.
- Audit nit: `ad-brief` names skills it never calls. Accepted: those are prohibitions and pointers.
- Audit minor: the changelog entry cited no ADR. Fixed (ADR-0079).

Falsification lane on `23252ae` (scratch worktree, one mutation at a time, restored after each; log `.agentic/reviews/20261009T065600Z-audit-falsification.log`): swapping `ahead` and `behind` turned 2 of 2 tests red.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
