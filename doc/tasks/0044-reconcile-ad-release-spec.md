# Task `0044`: Reconcile the `ad-release` specification status

**Status:** proposed
**Created:** 2026-08-11
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0001-ad-release-orchestrated-release.md
**Board ref:**

## Context

`ad-release` has dual-host source, deterministic release probes, and release
tests on `main`; version `0.20.0-beta.2` is also published and has a GitHub
Release. Its accepted feature specification still has no implementing task and
does not record whether every success criterion is satisfied. That leaves the
spec-to-task trace incomplete and makes the project survey report a false
planning gap.

## Acceptance Criteria

- [ ] Every success criterion in `doc/specs/0001-ad-release-orchestrated-release.md` is checked against current source, tests, and release evidence; any unmet criterion is recorded as a separate follow-up rather than inferred from file presence.
- [ ] If all criteria hold, the specification is marked `shipped` and links to this task; if not, it remains `accepted` with the remaining work precisely recorded.
- [ ] This task reciprocally links to the specification, so the survey no longer reports an untracked accepted or shipped spec.
- [ ] The local test gate passes and a fresh-context review covers the documentation reconciliation.

## Plan

- [ ] Map the specification's requirements and success criteria to source, tests, published npm metadata, and the GitHub Release.
- [ ] Run the local test gate and record any evidence gap that cannot be verified locally.
- [ ] Update the specification and this task only according to the observed evidence; create a follow-up task for an actual gap.
- [ ] Run a fresh-context review before closing the task.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered during backlog reconciliation. The task is a verification and
traceability closure, not a claim that the specification is already shipped.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
