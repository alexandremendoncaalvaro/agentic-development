# Task `0085`: Keep the live capture when the adapter fails

**Status:** proposed
**Created:** 2026-09-21
**Scope ref:** doc/adr/0082-capture-live-trials-through-a-supplied-runner.md (decision 6)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0007-evaluate-skill-trajectories.md
**Board ref:**

## Context

ADR-0082 decision 6 says a failing host is data, not a harness error, and the
lane keeps the receipt. The lane does not extend that to its own adapter: when
normalization throws after the host ran, `runLive` propagates the error and
writes nothing, so the captured stream, the one artifact that cost a real model
invocation, is lost. Task 0084's second pilot trial hit this with a case that
declared `request_kind: explicit` without a `/skill` mention; the host ran for
about nine minutes, the gate's evidence file survived, and the stream did not.
An adapter defect or an authoring error in the case should leave the raw bytes
on disk so the mapping can be corrected and re-run against the original
capture, which is the reason ADR-0082 decision 3 keeps streams at all.

## Acceptance Criteria

- [ ] When an adapter throws while normalizing a captured stream, the lane still writes every captured stream to the capture directory, after the leak gate, and then reports the adapter error with the trial it came from.
- [ ] The receipt is not written in that case, or is written with the failing trial marked as a harness failure, whichever the ground record settles against Spec 0007 R13's replayed-versus-generated distinction.
- [ ] A test drives the lane with a runner stub whose stream the adapter rejects and observes the stream on disk plus the reported error.
- [ ] The case validator rejects `request_kind: explicit` without a `/skill` or `$skill` mention before any host is spawned, so the authoring error surfaces for free.

## Plan

- [ ] `/ad-ground`: the current `runLive` ordering and the validator's case checks; write the ground record and set `Evidence ref`.
- [ ] Red, then green, for the two behaviors above; keep `eval/run.mjs live` out of every gate as today.
- [ ] `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-21

Opened from Task 0084's pilot, which lost one paid trial's stream to this gap.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
