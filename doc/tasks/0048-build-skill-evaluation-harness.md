# Task `0048`: Build a skill trajectory evaluation harness

**Status:** proposed
**Created:** 2026-08-11
**Scope ref:** doc/product/PRD.md — Later tier: Skill eval harness
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** doc/specs/0007-evaluate-skill-trajectories.md
**Evidence ref:** doc/research/0021-ground-skill-trajectory-evaluation-harness.md; doc/research/0022-skill-trajectory-evaluation-contract.md
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

### 2026-09-16

Reconciled the task against the clean `origin/main` baseline and completed the
pre-spec `ad-grill-me`, four-source `ad-ground`, and `ad-prism` pass. The evidence
supports a provider-neutral contract with frozen fixtures and inputs,
outcome-first grading, retained trajectories, invocation-class-specific arms,
and separate deterministic versus judgment evidence. One owner decision remains
before `ad-spec`: accept credential-free replay in local/CI gates plus authorized
live dual-host trials at the HITL gate, or require live model generation in CI
and explicitly accept credentials, cost, and stochastic gate behavior. No
harness implementation or Task 0047 work started.

### 2026-09-16 — Owner decision

The owner accepted the recommended hybrid gate: credential-free deterministic
replay in normal local/CI verification, with newly generated dual-host behavior
evaluated through an explicitly authorized HITL runner. Drafted
`doc/specs/0007-evaluate-skill-trajectories.md` from that boundary. Framework
selection, pilot decision values, implementation, and Task 0047 remain unstarted.

### 2026-09-16 — Spec accepted

The owner accepted `doc/specs/0007-evaluate-skill-trajectories.md`. The next
session should de-risk the implementation mechanism before code: confirm whether
the framework question requires a staged spike, then build through test-first
vertical slices. No implementation or Task 0047 work started in this session.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
