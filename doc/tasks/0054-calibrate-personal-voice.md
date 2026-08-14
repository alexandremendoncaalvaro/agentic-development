# Task `0054`: Calibrate and validate the personal voice

**Status:** proposed
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

- [ ] Before any private source read, the owner approves the exact sources, date
      range, author filter, intended evidence role, profile scope, and retention.
- [ ] A confirmed profile outside every Git repository validates successfully and
      contains only individually approved derived deltas, with no raw samples,
      third-party phrases, or unapproved exact examples retained.
- [ ] A held-out evaluation spans Portuguese and English plus at least three
      materially different audience or channel contexts, with owner fidelity and
      target-language fit judged separately.
- [ ] Every held-out draft preserves the marked facts, identifiers, commitments,
      uncertainty, and requested actions; only aggregate evaluation results enter
      this task's Notes.

## Plan

- [ ] Invoke `ad-voice-tune` and approve one bounded source authorization record.
- [ ] Review one proposed profile delta at a time until the owner stops or the
      evidence no longer supports a useful change.
- [ ] Run the Spec 0004 held-out evaluation against the confirmed profile and the
      generic baseline.
- [ ] Record aggregate results and limitations here without profile content,
      source excerpts, names, or private message metadata.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
