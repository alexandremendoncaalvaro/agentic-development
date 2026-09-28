# Task `0089`: Plan stateful units as state x event tables and check measure sources

**Status:** done
**Created:** 2026-09-28
**Scope ref:** WORKFLOW.md §16 (TDD) and the `/ad-prism` methodology chain
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

A post-merge retrospective on a change that added a stateful tracker found
two load-bearing gaps.

The tracker passed a first local review, the CI review bot and a human
review, and then spent seven more local rounds surfacing one missing
transition at a time: a candidate that reopened and counted the same moment
twice, a verdict lost when a candidate expired on the chunk that opened
another, and same-instant and boundary cases. What converged was
enumeration, a systematic operator-mutation sweep over the file. An earlier
change had the same class of escape: state latched after a slow call. Three
survivors of that sweep were called equivalent without a distinguishing-input
search, and all three were wrong. TDD's plan step lists behaviors but has no
step that enumerates the transitions of a unit that keeps state, so the gap
recurs across changes.

The same change pre-registered an evaluation measure that the telemetry
already in place could not compute, because the emitted tags lacked the field
the measure needed; only a human reviewer caught it. The `/ad-prism`
methodology names the measure -> data source link but does not ask that the
source be read.

Considered and rejected: a new claim-grounding rule for `/ad-publish` (its
Step 3 already requires it; the retrospective's claim errors came from drafts
written outside the skill, an enforcement gap, not a rule gap).

## Acceptance Criteria

- [x] `/ad-tdd` Step 1 asks, for a unit that keeps state between calls, for a state x event table that includes the same-instant, tie and inclusive/exclusive boundary variant of each event, each cell a behavior or an explicit N/A with its reason.
- [x] `/ad-tdd` Step 4 asks, for such a unit, for an operator-mutation sweep before its first publication, closes each survivor through the Step 3 loop one at a time, and treats a survivor as a missing test until a distinguishing input has been searched for and recorded.
- [x] WORKFLOW.md §16 Phase 1 and Phase 4 carry the same two items, so the skill still implements the section it names.
- [x] The `/ad-prism` methodology asks that a measure drawn from an already-emitted instrument be computable from the fields that instrument actually carries, else recorded as an open gap.
- [x] Claude Code and Codex skill trees carry the same meaning; dogfood copies are refreshed and byte-identical to source.
- [x] `CHANGELOG.md` records the change under `[Unreleased]` and names this task.

## Plan

- [x] Edit both host sources of `/ad-tdd` and `/ad-prism` `references/methodology.md`; mirror the `/ad-tdd` items into WORKFLOW.md §16.
- [x] Refresh the dogfood install with `node bin/agentic.js update --scope project --agent both --yes`.
- [x] `npm run verify`; `/ad-review` on both axes; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-28

Fresh-context review on the first commit found the WORKFLOW.md §16 lists no
longer matched the skill (fixed by mirroring both items), the survivor
wording open to a bulk-write reading that Step 3 rejects (fixed: one at a
time through the Step 3 loop), and a CHANGELOG entry without a task
reference (fixed by this task).

The WORKFLOW.md edit changes its hash, so the current development copy is
registered in `LEGACY_KIT_DOC_SHAS` (`src/lib/legacy-project-migration.js`),
as the file's own comment prescribes; the legacy-migration test caught it.
