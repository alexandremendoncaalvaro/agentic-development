# Task `0086`: Name the expected shape in the record validator's messages

**Status:** done
**Created:** 2026-09-21
**Scope ref:** doc/specs/0008-surface-validator-failures-during-the-turn.md (R3, actionable feedback surfaced to the model)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:** doc/specs/0008-surface-validator-failures-during-the-turn.md
**Board ref:**

## Context

`validate-record.mjs` is the deterministic checker behind ADR-0070: it proves
that a ground receipt maps every claim to a registered source. The artifact
validator gate of Spec 0008 now returns that checker's messages to the model
inside the turn (R3, R10: the gate adds no second implementation and no
judgment, so the validator's own text is the only feedback the model gets).

The Task 0084 pilot showed the consequence. In every trial the model acted on
the surfaced message and never converged: "source register has no A source"
and "evidence has no claim" name the rule that failed but not the line shape
that satisfies it, so the model wrote a source table, an `**A** —` list, and
probe files trying to discover the format, while the permission mode denied a
read of the template outside the working directory. Twelve firings in one
trial, three in another, all `validator-failed`, with structurally reasonable
records that the checker could not see.

The fix belongs in the validator, not in the gate: the validator is the single
source of truth for the record contract, and its messages also serve the skill
step and the commit-time reader. A message that states the expected line shape
lets a model or a human correct the record from the message alone, which is
what Spec 0008 R3 calls actionable feedback. Whether the gate should also point
at the owning skill's template is judged after this lands.

## Acceptance Criteria

- [x] When the source register lacks a group, the message names the group and the exact line shape that registers one, `- **A1:** <citation> (accessed <YYYY-MM-DD> via <method>)`, with the group letter substituted.
- [x] When a source lacks access provenance, the message names the source id and the `(accessed <YYYY-MM-DD> via <method>)` suffix it must end with.
- [x] When the evidence section has no claim, the message names the `### E1 — <claim>` heading shape and the `**Strength:**` and `**Provenance:**` lines a claim carries.
- [x] When a claim lacks a valid strength or provenance, the message names the exact line shape and the allowed strength values.
- [x] When a required metadata line or section is missing, the message names the exact `**Label:** <value>` line or `## Heading` it expects.
- [x] Every message stays one line, so the gate's surfaced text and its evidence line keep their current shape, and the JSON report's `errors` array keeps one entry per defect.
- [x] Each changed message is locked by a test that asserts the shape appears in the message, and the existing tests that assert exact messages are updated to the new text rather than loosened.
- [x] `validate-record.mjs` stays byte-identical across the Claude Code and Codex skill trees and the dogfood copies are refreshed.
- [x] `CHANGELOG.md` records the change under `[Unreleased]`.

## Plan

- [x] Red: one test per changed message in `test/skill-scripts.test.js`, driven through the script's public interface (spawn and parse the JSON report).
- [x] Green: rewrite the messages in `src/skills/claude-code/ad-ground/scripts/validate-record.mjs`; copy to `src/skills/codex/ad-ground/scripts/`; refresh the dogfood install.
- [x] Re-run the gate's contract tests, whose assertions quote the first and last validator message, and update any exact-text expectation.
- [x] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-21

Opened from Task 0084's exploratory pilot, whose retained final records
(`.agentic/reviews/evidence/task-0084-pilot-t{2,3}-final-record.md`,
machine-local) show what the model wrote when the message did not name the
shape. Sequenced ahead of the tracked measurement of Task 0084 so the
on-versus-off comparison measures a gate whose feedback can be acted on.

### 2026-09-21 — Built, reviewed, landed

TDD through the script's public interface: tracer bullet was the missing
source group message (red on the assertion, then green), then one test per
message: empty evidence, invalid strength, missing provenance, missing
metadata and section, wrong title and status, unknown source, and a
one-line invariant over a bare record. The three existing exact-message
tests were updated to the new text. Twelve validator tests, thirteen gate
tests, and the wiring and parity suites pass; the four copies of the script
are byte-identical; the dogfood install was refreshed. No ground record: the
contract the messages describe is the bundled template and ADR-0070, both
in-repo, and the change is wording on a settled rule.

Fresh two-axis review (handoffs and verdicts at
`.agentic/reviews/2026-09-21T21-28-51Z-task-0086-working-tree-*.md`,
machine-local). Standards: no Blocker, one Concern, applied: the date
placeholder read `YYYY-MM-DD` while every other fill-in and the template use
angle brackets, so a model copying the shape literally would fail the
provenance regex; it is now `(accessed <YYYY-MM-DD> via <method>)`. Spec: no
Blocker, no Concern, one Note: the title and `Status` messages also name
their line although the criteria list five families; intentional, since the
task's purpose is that every rule message names the line that satisfies it.
Both reviewers flagged edits to `eval/lib/live.mjs` and `test/eval-live.test.js`
appearing during the review; those are this session's Task 0084 slice on
disjoint files, not a foreign writer (same disposition as Task 0083's audit;
the fan-out freeze rule-gap is already recorded there).

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
