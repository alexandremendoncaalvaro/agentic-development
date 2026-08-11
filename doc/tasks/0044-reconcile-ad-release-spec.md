# Task `0044`: Reconcile the `ad-release` specification status

**Status:** done
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

- [x] Every success criterion in `doc/specs/0001-ad-release-orchestrated-release.md` is checked against current source, tests, and release evidence; any unmet criterion is recorded as a separate follow-up rather than inferred from file presence.
- [x] If all criteria hold, the specification is marked `shipped` and links to this task; if not, it remains `accepted` with the remaining work precisely recorded.
- [x] This task reciprocally links to the specification, so the survey no longer reports an untracked accepted or shipped spec.
- [x] The local test gate passes and a fresh-context review covers the documentation reconciliation.

## Plan

- [x] Map the specification's requirements and success criteria to source, tests, published npm metadata, and the GitHub Release.
- [x] Run the local test gate and record any evidence gap that cannot be verified locally.
- [x] Update the specification and this task only according to the observed evidence; create a follow-up task for an actual gap.
- [x] Run a fresh-context review before closing the task.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered during backlog reconciliation. The task is a verification and
traceability closure, not a claim that the specification is already shipped.

### 2026-08-11 — evidence audit

The dual-host `ad-release` sources and byte-identical deterministic scripts
are present; the planner tests pin all five refusal boundaries, exact branch
and tag refs, merged-base refusal, and post-publish recovery. The release
state probe reports no unreadable inputs for this repository. The complete
local gate passed: 579 tests, 0 failures. The release evidence is also real:
`v0.20.0-beta.2` is annotated, its DCO-signed release commit is an ancestor
of `main`, and its GitHub Release exists as a prerelease.

The specification remains `accepted`, not `shipped`. Registry evidence shows
`0.20.0-beta.2` at `latest` while the configured `publishConfig.tag` is
`beta` and that tag still names `0.19.0-beta.1`. Task-0050 owns the required
maintainer decision and any explicitly approved registry action. This task
does not mutate npm state.

Success-criterion mapping: (1) `test/release-e2e.test.js` proves the release
script dry-run leaves its fixture tree and tags unchanged, while the state
probe and planner only inspect or describe external steps; (2) and (4)
`test/skill-scripts.test.js` prove every refused direct stage has
`execution: null`, with PR and merge delegated by the skill text; (3) the
live release proves the DCO commit, merged ancestry, annotated tag, package
version, and GitHub Release, but its configured-dist-tag clause remains the
task-0050 gap; (5) the post-publish resume fixture offers only GitHub Release
recovery and the unmerged fixture offers no publish command; (6) source
parity tests and the complete 579-pass suite cover both host copies. No
criterion is inferred from source-file presence alone.

### 2026-08-11 — closure

The local gate passed with 579 tests and 0 failures. The final two-axis
`ad-review` found no Standards or Spec findings; its ephemeral audit trail is
`.agentic/reviews/20260811T233746Z-working-tree.md`. Task-0050 remains
proposed for the maintainer-owned dist-tag decision, so this closure does not
claim the release specification is shipped.

### 2026-08-11 — merged

Merged through [PR #96](https://github.com/alexandremendoncaalvaro/agentic-development/pull/96)
as commit [`6d8bd72`](https://github.com/alexandremendoncaalvaro/agentic-development/commit/6d8bd72d54e71bd166d30f8aee371cb983ebb483).

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
