# Task `0057`: Shorten the handoff resume brief

**Status:** `done`
**Created:** `2026-08-19`
**Scope ref:** `doc/adr/0040-report-for-a-decision-maker-behavior.md`
**Evidence ref:** `doc/research/0003-ground-handoff-resume-brief.md`
**Owner:** `Codex`
**Execution:** `AFK`
**Spec ref:**
**Board ref:**

## Context

The handoff preserves enough context and working discipline for a fresh agent, but
the new session exposes too much of that internal preparation to the maintainer.
The maintainer needs a fast executive orientation: confidence that preparation
happened, the objective and roadmap, why this session is working on its current
step, the definition of done, and whether a real decision needs attention.

## Acceptance Criteria

- [x] A resumed agent still reads and applies the handoff, working rules,
      referenced artifacts, live repository state, and applicable method skills.
- [x] The new session prints a short preparation checklist instead of the full
      `ad-philosophy` applied-binding statement or a log of internal reads.
- [x] The visible brief explains the final objective, roadmap, current session
      focus and rationale, definition of done, and whether the maintainer must act.
- [x] Decision requests appear only for genuine judgment calls and present the
      recommendation plus only viable competing options and value-level trade-offs.
- [x] Claude Code and Codex source skills and handoff templates carry the same
      resume contract, with focused tests preventing regression.

## Plan

- [x] Ground the resume format in handover, situational-awareness, plain-language,
      public agent-handoff, repository, and git-history evidence.
- [x] Add a failing contract test for the concise resume experience.
- [x] Update both host skills and templates without weakening the durable handoff.
- [x] Refresh the dogfood installs and run the full verification suite.
- [x] Run maximum-gate review selected by the owner and resolve its findings.

## Notes

### 2026-08-19

The selected design separates the durable agent packet from the maintainer-facing
resume brief. The preparation remains exhaustive; its visible receipt is compact.

The contract test failed against the prior explicit-invocation opening and passed
after both host templates adopted the private preparation pass. `npm test` passed
655/655; `npm pack --dry-run`, source/install byte parity, the ground-record
validator, and `git diff --check` also passed. Fresh-context review remains the
landing gate.

The first maximum-gate audit found two major issues: stale C1/C2 line anchors in
the ground receipt and no regression assertion for the Claude chip path. The
anchors now point to the supporting working-rules and roadmap lines, and the
focused test now requires the chip to follow `Resume protocol` while rejecting
the old explicit `/ad-philosophy` instruction. Focused tests passed 308/308 and
the full suite passed 655/655 after the corrections.

The re-audit covered all 14 rule groups and all 16 changed files at worktree
manifest `8939e35e`; it found no remaining issue. The owner then directed the
commit, pull-request, merge, and npm publication flow, closing the review gate.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (owner-selected maximum-gate audit, no findings)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
