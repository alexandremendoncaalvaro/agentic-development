# Task `0084`: Measure the artifact-validator gate through the live lane

**Status:** in-progress
**Created:** 2026-09-21
**Scope ref:** doc/adr/0083-bound-the-runtime-layer-to-feedback-gates.md (decision 7)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** doc/specs/0008-surface-validator-failures-during-the-turn.md
**Board ref:**

## Context

ADR-0083 decision 7 forbids a second runtime gate until the first has run on
the live lane with a recorded on-versus-off comparison, and Spec 0008
Scenario 7 asks that a gate firing in the evidence file be joinable with a
hook record in the captured host stream. Task 0083 shipped the gate and
observed it live through the host directly; it left the lane-captured
measurement open because it needs an evaluation case whose fixture carries
the gate wiring, and the tracked corpus requires a case family per
representative (Spec 0007 R3), which is harness work of its own.

Two facts settle the design. In a `-p` session Claude Code treats the folder
as trusted and runs hooks committed in the repository's `.claude/settings.json`
without a dialog, so a fixture that ships the wiring fires the gate under the
lane. The lane copies the fixture per trial and spawns the supplied runner
with the copy as its working directory, so the wiring travels with the copy
and the evidence lands wherever `AD_ARTIFACT_GATE_EVIDENCE_DIR` points.

The measurement proceeds in two steps so the expensive part is bounded: an
exploratory scratch pilot outside the tree, labeled as such, that shows the
join is real and whether the model corrects a record after the gate's
feedback; then a tracked case family whose fixture carries the wiring, whose
receipts the corpus gate accepts, and whose on-versus-off comparison is what
a second gate's proposal cites.

## Acceptance Criteria

- [x] An exploratory scratch pilot (fixture and case outside the tree, Claude Code) shows the gate's evidence lines joined one-to-one with the captured stream's `file_write` events for the same session, records that the host stream carries no `PostToolUse` hook record or hook text on this host version, and records whether the model corrected the artifact after the surfaced message; its quoted results carry the exploratory label and stay out of Axis-2 confidence claims.
- [ ] A tracked fixture carries the gate wiring in `.claude/settings.json` through a path that resolves on any machine the lane runs on, and a tracked case family for the representative it exercises satisfies Spec 0007 R3 and the corpus gate.
- [ ] A live receipt of that case on Claude Code grades through the existing graders, and the join between its evidence lines and its stream's hook records is written down as a reproducible procedure or a grader.
- [ ] An on-versus-off comparison (gate wired versus `AD_ARTIFACT_GATE=0`) over the same case and trial count is recorded with wall-clock, turns, tool actions, and whether the artifact validated at turn end, without publishing a gain claim before the numbers exist.
- [ ] The Codex leg of the same case runs once the operator's Codex CLI can start a trial, or its blocker is recorded with the CLI version and refusal message.

## Plan

- [ ] `/ad-derisk`: register the unknowns (does the model act on the surfaced message; does the route grader's implicit-activation false negative, Task 0082, distort the comparison; how the fixture's hook path resolves on CI machines; the cost per trial) and retire each.
- [ ] Run the exploratory scratch pilot and record its results in Notes with the exploratory label.
- [ ] `/ad-ground`: the fixture path convention for a hook that must resolve on any machine, and the corpus rules for a new representative; write the ground record and set `Evidence ref`.
- [ ] Build the tracked fixture and case family test-first; extend the adapter's event vocabulary or add a sidecar join, whichever the ground record settles.
- [ ] Run the on-versus-off comparison; record the numbers; propose or decline a second gate in a new record that checks ADR-0083 decision 7's stop criteria.
- [ ] `/ad-review`; `/ad-audit`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-21

Task created when Task 0083 closed its build with two live criteria still
open. Every trial here is a real model invocation billed to the owner, so
scale is chosen against cost: one trial per arm until a result is ambiguous.

### 2026-09-21 — Exploratory scratch pilot, three trials on Claude Code

Exploratory: fixture and cases lived under the OS temporary directory, the
gate wiring named the user-level install `~/.claude/skills/ad-hooks/scripts/artifact-gate.mjs`
by absolute path, and the host loaded the operator's global configuration
(31 tools, the SLIM plugin's hooks), so nothing here is decision-grade
measurement. Runner for every trial:
`claude -p {request} --output-format stream-json --verbose --permission-mode acceptEdits`
on Claude Code 2.1.227, model `claude-opus-5[1m]`, one trial each, through
`node eval/run.mjs live`. Captures, receipts, gate evidence files, and the
final records are retained under `.agentic/reviews/evidence/task-0084-pilot-*`
(ignored, machine-local); the load-bearing numbers are quoted here.

Trial 1, natural request ("do the pre-implementation research the team
requires ... persist its evidence record under doc/research"): 21 turns,
179 s, USD 1.46. The `Skill` tool call for `ad-ground` was denied by the
permission mode; the model then read `~/.claude/skills/ad-ground/SKILL.md`
and followed it (the Task 0082 activation shape). It wrote
`doc/research/0001-git-hooks-lefthook-vs-husky.md` with the heading
`# 0001 — Git hooks: ...`, outside the `GROUND-NNNN` and `-ground-`
conventions. The gate treated it as unowned: no output, no evidence line.
Finding: when the agent skips the record convention entirely, a heading-keyed
owner map cannot see it; the gate's blind spot is the shape it was built to
recognize.

Trial 2, request naming the shape (a `GROUND-0001` record at a `-ground-`
path): the lane threw at normalization because the case declared
`request_kind: explicit` without a `/skill` mention (an authoring error here),
and the captured stream was lost with it; the gate's evidence file survived.
Twelve firings in one session, all `validator-failed`: the record three
times, then seven writes of probe files (`0002-probe-format.md`,
`0002-ground-probe.md`) as the model tried to discover the expected shape,
then the record again. The first surfaced message listed nine missing
sections; the last listed "source register has no A source" through "D" and
"evidence has no claim". The final record was structurally reasonable, with a
source register as a table and sources A and B marked unverified, but the
validator wants the exact `- **A1:** ... (accessed ... via ...)` lines and
`### E1 —` claim headings, and its messages do not say so. A `Read` of the
template outside the working directory was denied by the permission mode.

Trial 3, the same request as a natural case: 22 turns, 334 s, USD 1.90.
Three writes of `doc/research/0001-ground-git-hooks-runner.md`, three gate
evidence lines (`seq` 1 to 3, `validator-failed`) whose timestamps and paths
join one-to-one with the receipt's three `file_write` events for session
`7a80a2d4`. The model reacted to the feedback (it also asked to read the
gate script, which the permission mode denied) and did not converge: the
final record fails the same register and claim rules. The captured stream
carries no `PostToolUse` hook record and none of the gate's text: the only
`hook_started` / `hook_response` records are the operator's `SessionStart`
plugin hook, and a `Stop` hook's feedback appears as user text, so the host
serializes `Stop` feedback but not `PostToolUse` stderr in `stream-json` on
this version. The join therefore anchors on the evidence file plus the
stream's `file_write` events, not on hook records; Spec 0008 Scenario 7 is
amended by its open question.

What the pilot says about the hypothesis of RESEARCH-0026: the gate surfaces
failures inside the turn and the model acts on them; convergence depends on
the validator's message naming the expected shape and on the template being
readable. Three follow-ups: `validate-record.mjs` messages that state the
expected line shape; the gate's surfaced text pointing at the owning skill's
template path; and Task 0085 for the lane losing a capture when an adapter
throws. No on-versus-off comparison was run; the tracked case family and
that comparison remain this task's open criteria. Total pilot spend: USD 3.36
on the two trials that returned a result record, plus the unrecorded second
trial.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
