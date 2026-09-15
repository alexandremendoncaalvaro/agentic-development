# Task `0052`: Upgrade GitHub Actions runtime

**Status:** in-progress
**Created:** 2026-08-12
**Scope ref:** AGENTS.md — Quality Gates
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The post-merge CI run for task 0051 passed on every operating-system and Node
matrix leg, but GitHub emitted an annotation that `actions/checkout@v4` and
`actions/setup-node@v4` use a deprecated Node 20 action runtime and are being
forced to Node 24. This is platform-maintenance work, not an application-test
failure. Capture it locally so the supported CI contract remains intentional
and the warning cannot be lost in a session transcript.

## Acceptance Criteria

- [x] The current supported action majors and their compatibility with this
      workflow are grounded in the publishers' documentation.
- [x] `.github/workflows/test.yml` uses supported action versions without
      changing its Ubuntu/Windows and Node 20/22 test matrix unexpectedly.
- [ ] Local gates and the full remote CI matrix pass after the update.
- [x] The changelog explains the consumer-relevant CI maintenance when the
      implementation ships.

## Plan

- [x] Research the official action migration notes and record any compatibility
      constraint before editing the workflow.
- [x] Update the workflow under ADR-0078's replacement Node matrix and composed
      verification command while preserving `npm ci`.
- [ ] Run local gates, review the diff, and confirm all remote matrix legs.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-12

Registered from GitHub Actions run 31601163995 after PR #102 merged. All four
jobs passed; the annotation is non-blocking and names only the action-runtime
deprecation. The task deliberately does not assume that an action-major bump
is compatible before the official migration notes are read.

### 2026-09-15

ADR-0078 absorbs this maintenance into the 1.0 compatibility boundary. Official
Node lifecycle evidence now marks Node 20 end-of-life, so preserving the old
20/22 matrix would no longer be intentional. The implementation moves to the
current checkout/setup-node action majors and a deliberate Node 22.13 / 24
Ubuntu/Windows matrix. Closure still waits for the full remote matrix.

The local `npm run verify` gate passes with 939 tests and a clean high-severity
dependency audit. The task's original preserve-the-matrix plan is superseded by
ADR-0078's grounded Node 20 end-of-life decision; the acceptance criterion's
"unexpectedly" qualifier is satisfied because the replacement matrix is now an
explicit compatibility contract. Remote matrix evidence is still pending.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
