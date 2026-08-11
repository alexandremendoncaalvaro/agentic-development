# Task `0048`: Build a skill trajectory evaluation harness

**Status:** proposed
**Created:** 2026-08-11
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

The kit has structural and deterministic-script tests, but it does not yet
measure whether a skill guides an agent through a useful end-to-end trajectory
on representative repositories. The accepted PRD's Later tier calls for an
evaluation harness aligned with `WORKFLOW.md` §13 and a fixture corpus. The
evaluation contract must distinguish deterministic assertions from model
judgment and must not optimize a skill against a single hand-picked example.

## Acceptance Criteria

- [ ] A feature specification defines the fixture corpus, evaluation inputs, ground-truth outcomes, scoring, and what can run deterministically in CI.
- [ ] The harness evaluates at least one representative trajectory for every shipped skill category without requiring credentials or hidden local state.
- [ ] Results make failures actionable by naming the fixture, expected outcome, observed outcome, and whether the gap is deterministic or judgment-based.
- [ ] The harness is documented, tested, dual-host-aware where relevant, and passes the local gate plus fresh-context review.

## Plan

- [ ] Use `/ad-grill-me`, `/ad-ground`, and `/ad-spec` to define a measurable evaluation contract before selecting a framework.
- [ ] Build a small, versioned fixture corpus and prove the harness distinguishes a passing trajectory from an intentionally broken one.
- [ ] Extend coverage incrementally by skill category, avoiding scores that cannot be reproduced from declared inputs.
- [ ] Run the local gate and fresh-context review.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Registered from the accepted PRD's Later-tier roadmap. The feature remains
HITL because the evaluation measure itself is a product and quality decision.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
