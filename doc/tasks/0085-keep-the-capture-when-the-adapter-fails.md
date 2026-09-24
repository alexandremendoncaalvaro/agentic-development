# Task `0085`: Keep the live capture when the adapter fails

**Status:** done
**Created:** 2026-09-21
**Scope ref:** doc/adr/0082-capture-live-trials-through-a-supplied-runner.md (decision 6)
**Evidence ref:** doc/research/0029-ground-keep-capture-on-adapter-failure.md
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

- [x] When an adapter throws while normalizing a captured stream, the lane still writes every captured stream to the capture directory, after the leak gate, and then reports the adapter error with the trial it came from.
- [x] The receipt is not written in that case, or is written with the failing trial marked as a harness failure, whichever the ground record settles against Spec 0007 R13's replayed-versus-generated distinction.
- [x] A test drives the lane with a runner stub whose stream the adapter rejects and observes the stream on disk plus the reported error.
- [x] The case validator rejects `request_kind: explicit` without a `/skill` or `$skill` mention before any host is spawned, so the authoring error surfaces for free.

## Plan

- [x] `/ad-ground`: the current `runLive` ordering and the validator's case checks; write the ground record and set `Evidence ref`.
- [x] Red, then green, for the two behaviors above; keep `eval/run.mjs live` out of every gate as today.
- [x] `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-21

Opened from Task 0084's pilot, which lost one paid trial's stream to this gap.

### 2026-09-22

Grounded in `doc/research/0029-ground-keep-capture-on-adapter-failure.md`
(valid): the receipt question settles against writing one, because ADR-0082
decision 6 classifies an unparseable line as a harness defect and every reader
of a live receipt takes its trials as the host's behavior (Spec 0007 R13).
Three regression tests, each red first for the named reason: a two-trial run
whose first stream the adapter rejects keeps both streams and the first
trial's gate evidence, writes no receipt, and throws an error naming `t1` and
the capture directory with the adapter error as its cause; a reused
destination loses its previous `receipt.json` on such a failure; an explicit
case whose request names no skill is refused before the version probe spawns.
`runLive` now validates its case with the replay lane's `validateCase`, which
shares the adapters' one mention rule through `mentionedSkill`. Refactor:
`live.mjs` crossed the GUIDELINES 3.3 ceiling (409 lines), so trial
normalization moved to `eval/lib/capture-trial.mjs` (re-exported from
`live.mjs`), and `runLive` gave its spawn and write steps to two helpers
(346 lines). `npm run verify` green, 1091 tests. No live trial was run.

Fresh two-axis review (`/ad-review`, working tree): Spec found every
criterion implemented and tested, one Note (the `try` covers all of receipt
assembly, not only normalization, which GROUND-0029 decides deliberately).
Standards raised one Concern, applied: the recovery write inside the `catch`
could itself throw and replace the adapter error unchained (GUIDELINES 2); the
lane now reports "could not be kept" with the adapter error still as cause,
driven by a fourth regression test whose destination is a file.

### 2026-09-23

Correction from the maximum-gate audit (CV.1, both CV passes and the
GUIDELINES reviewer): the sizes in the entry above are not the shipped file.
`eval/lib/live.mjs` is 365 lines on `origin/main` and 362 at the commit;
409 was the working tree with the change applied before the extraction, and
346 predates the double-fault fix, which added 16 lines back. The extraction
was still needed, since the change alone took the file past the 400-line
ceiling. GROUND-0029 D1 also omitted `6f15b62` from the file's history
(seven commits, not six); corrected in place before merge.

Audit disposition: nine groups, seven dispatched (AGENTS, ARCHITECTURE,
GUIDELINES, CONTEXT, ADR-0080 and ADR-0082, HK, CV critical under two models)
and two N/A (NET, GH). No blocker. Refuted: "leak gate" as new vocabulary (on
`origin/main` in ARCHITECTURE.md, Task 0081, and the live suite before this
change); `test/eval-live.test.js` over the 3.3 ceiling (855 lines before this
change; the standing `/ad-level-up` candidate for a `test/` carve-out).
Reviewers who could not finish `npm run verify` hit contention from parallel
suite runs in this worktree; the CV reviewer's clean `npm test` and
`scripts/hook-npm-test.js` runs exited 0.

Closed: every criterion and Definition of Done item checked; the change
lands through the pull request opened from this branch.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
