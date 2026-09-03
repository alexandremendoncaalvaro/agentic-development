# Task `0064`: Streamline release approval

**Status:** done
**Created:** 2026-09-02
**Scope ref:** doc/specs/0001-ad-release-orchestrated-release.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0001-ad-release-orchestrated-release.md
**Board ref:**

## Context

The first `0.20.0-beta.9` release through `ad-release` required repeated approval
for the local release, branch push, PR creation, merge, tag push, npm publish,
and GitHub Release. The owner explicitly approved all remaining actions, but the
workflow still required a new confirmation at each boundary. This preserved
authority while making the safe path needlessly interruptive.

The release already has deterministic state checks and exact commands. One
approval can therefore bind the complete target and effect list without removing
any technical gate.

## Acceptance Criteria

- [x] The planner emits a digest over the complete package, version, dist-tag,
      base and release branches, tag, exact PR draft, prerelease flag, and release
      effect list.
- [x] One explicit approval of that digest authorizes every unchanged release
      effect, including delegated PR creation and release-only merge.
- [x] A changed target or effect invalidates the approval before execution.
- [x] CI, mergeability, ancestry, registry, tag, package, and release checks remain
      mandatory and stop the workflow on failure.
- [x] A non-mutating authentication interruption retains the same approval after
      state inspection proves the target is unchanged and unpublished.
- [x] Per-stage approval remains available when the owner does not approve the
      complete plan.
- [x] Both hosts, dogfood copies, tests, changelog, spec, and ADR projection remain
      synchronized.

## Plan

- [x] Reproduce the repeated-confirmation behavior during the beta.9 release.
- [x] Add failing planner tests for plan-wide approval and target drift.
- [x] Implement the digest-bound approval receipt.
- [x] Amend the release, PR, and merge skill contracts on both hosts.
- [x] Refresh dogfood and run focused, full-suite, pack, and audit gates.
- [x] Prepare the verified change for the repository publication workflow.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-02

The beta.9 release exposed the usability failure directly. Seven outward-action
interruptions were requested even after the owner said to approve all remaining
steps. The npm publish then stopped before mutation on interactive 2FA, proving
that technical state inspection, rather than another content-free approval, is
the useful recovery boundary.

The implementation binds the exact PR title and body as well as the release
target. Audit found and closed two pre-merge gaps: resume plans no longer require
a new bump kind, and the domain definition now names every bound artifact. The
focused planner suite passed 9/9, the full suite passed 711/711, package dry-run
completed, and canonical, host, and dogfood script copies matched byte-for-byte.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
