# Task `0054`: Calibrate and validate the personal voice

**Status:** done
**Created:** 2026-08-13
**Scope ref:** doc/specs/0004-personal-voice-layer.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** doc/specs/0004-personal-voice-layer.md
**Board ref:**

## Context

Task 0053 delivers the profile contract and the two skill workflows, but the
layered design has not yet demonstrated a voice-fidelity gain after the initial
blinded candidate tied in Portuguese and lost both English comparisons. This task
owns the private, human-judged calibration that cannot be completed or claimed by
repository tests. It stores only aggregate outcomes in the repository.

## Acceptance Criteria

- [x] Before any private source read, the owner approves the exact sources, date
      range, author filter, intended evidence role, profile scope, and retention.
- [x] A confirmed profile outside every Git repository validates successfully and
      contains only individually approved derived deltas, with no raw samples,
      third-party phrases, or unapproved exact examples retained.
- [x] A held-out evaluation spans Portuguese and English plus at least three
      materially different audience or channel contexts, with owner fidelity and
      target-language fit judged separately.
- [x] Every held-out draft preserves the marked facts, identifiers, commitments,
      uncertainty, and requested actions; only aggregate evaluation results enter
      this task's Notes.

## Plan

- [x] Invoke `ad-voice-tune` and approve one bounded source authorization record.
- [x] Review one proposed profile delta at a time until the owner stops or the
      evidence no longer supports a useful change.
- [x] Run the Spec 0004 held-out evaluation against the confirmed profile and the
      generic baseline.
- [x] Record aggregate results and limitations here without profile content,
      source excerpts, names, or private message metadata.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-17

Closed as a tracking reconciliation. The machine-local profile at
`~/.agentic/voice/profile.md` validates successfully outside every Git
repository:

- profile status: confirmed
- retention: derived-only
- raw samples retained: false
- retained exact examples: 0
- approved derived patterns: 8
- validator errors: 0

Aggregate coverage spans Portuguese and English across owner identity, contextual
Portuguese writing/chat behavior, English Slack accommodation, and English
GitHub issue-comment accommodation. The owner confirmed the calibration work is
complete and that the practical evaluation already happened outside the
repository. No raw samples, profile content, source excerpts, third-party
phrases, private message metadata, or per-draft evaluation records are stored in
this repository.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (N/A: this is repository-only tracking
      reconciliation for already-completed private calibration; no code or
      behavior changed)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
