# Task `0084`: Measure the artifact-validator gate through the live lane

**Status:** in-progress
**Created:** 2026-09-21
**Scope ref:** doc/adr/0083-bound-the-runtime-layer-to-feedback-gates.md (decision 7)
**Evidence ref:** doc/research/0028-ground-tracked-gate-measurement.md
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
- [x] A tracked fixture carries the gate wiring in `.claude/settings.json` through a path that resolves on any machine the lane runs on, and a tracked case family for the representative it exercises satisfies Spec 0007 R3 and the corpus gate.
- [x] A live receipt of that case on Claude Code grades through the existing graders, and the join between its evidence lines and its stream's hook records is written down as a reproducible procedure or a grader.
- [x] An on-versus-off comparison (gate wired versus `AD_ARTIFACT_GATE=0`) over the same case and trial count is recorded with wall-clock, turns, tool actions, and whether the artifact validated at turn end, without publishing a gain claim before the numbers exist.
- [x] The Codex leg of the same case runs once the operator's Codex CLI can start a trial, or its blocker is recorded with the CLI version and refusal message.

## Plan

- [x] `/ad-derisk`: register the unknowns (does the model act on the surfaced message; does the route grader's implicit-activation false negative, Task 0082, distort the comparison; how the fixture's hook path resolves on CI machines; the cost per trial) and retire each.
- [x] Run the exploratory scratch pilot and record its results in Notes with the exploratory label.
- [x] `/ad-ground`: the fixture path convention for a hook that must resolve on any machine, and the corpus rules for a new representative; write the ground record and set `Evidence ref`.
- [x] Build the tracked fixture and case family test-first; extend the adapter's event vocabulary or add a sidecar join, whichever the ground record settles.
- [x] Run the on-versus-off comparison; record the numbers.
- [ ] Propose or decline a second gate in a new record that checks ADR-0083 decision 7's stop criteria (waits on the owner's call on further paid trials; see the 2026-09-21 comparison entry).
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

### 2026-09-21 — De-risk register for the tracked measurement

Ordered by impact times uncertainty; each retired by GROUND-0028 unless noted.
Grades per `WORKFLOW.md` §17.

1. A fixture-carried hook path that resolves on any machine: the fixture's
   `.claude/settings.json` names `${CLAUDE_PROJECT_DIR}/.claude/skills/ad-hooks/scripts/artifact-gate.mjs`,
   and the lane installs the skills the case declares into each trial copy
   before spawning the host (E1, E2). High, Strong: the variable is the
   documented project root, the pilot measured a fixture-shipped
   `PostToolUse` hook firing in a `-p` session on a never-trusted temporary
   folder, and the permissions reference lists settings-file hooks as used
   in exactly that situation.
2. The operator's user-level configuration shadows the fixture: personal
   skills outrank project skills of the same name, so a project `ad-ground`
   would lose to `~/.claude/skills/ad-ground`, which the permission mode then
   refuses to read (pilot trials 1 and 3). Retired by `--setting-sources
   project` in the runner (E3): measured on Claude Code 2.1.227 with one
   Haiku turn (USD 0.04), the init record listed the fixture's project skill
   and the built-ins only, no user skill, no plugin, and no `SessionStart`
   hook record. High for skills, hooks, and plugins; the account's MCP
   connectors still connected (21 servers) and are recorded as a limitation.
3. The route grader's false negative (Task 0082) distorting the comparison:
   the pilot's `Skill` call was denied under `acceptEdits`, which is what
   pushed the model to read `SKILL.md`. Retired by `--allowedTools Skill` in
   the runner (E4), the documented bare rule that lets every skill run
   without a prompt, so a routed trial carries a native `skill_invoked`
   event and the grader needs no inference. Medium, Conditional: documented
   and used by a public skill-activation harness, not yet exercised here;
   the first tracked trial raises it.
4. Live receipts cannot grade today: `captureTrial` relativizes written
   paths against the tracked fixture root while the writes happen in the
   trial copy, so every `file_write` keeps an absolute temporary path and
   the effects grader reports `unauthorized_effect` for a permitted write
   (E5). Reproduced on the pilot receipt's path shape with the real grader.
   High, Strong; fixed test-first in this task because the criterion "a
   live receipt grades" cannot hold without it.
5. The evidence-to-stream join without a hook record in the stream: the
   lane points `AD_ARTIFACT_GATE_EVIDENCE_DIR` at a per-trial directory
   under its work root, hooks inherit the host's environment, and the join
   pairs evidence lines with `file_write` events by path and order (E6).
   High, Strong; a sidecar, not a receipt event kind, as Spec 0008 puts out
   of scope and ADR-0083 decision 4 leaves to the harness.
6. Corpus rules for the new representative: `ad-ground` is
   workflow-operational and model-invocable; three cases (positive,
   close-negative routing to `ad-research`, coexistence), each with a
   known-good and an intentionally broken synthetic receipt; no request may
   contain the representative's or the expected route's name or the quoted
   trigger phrases of their descriptions (E7). High, Strong; enforced by
   the existing corpus tests.
7. Turning the gate off for the second arm: `AD_ARTIFACT_GATE=0` in the
   shell that runs the lane reaches the hook through environment
   inheritance (E6), and an empty evidence directory proves the arm. Low.
8. Cost: the pilot's trials cost USD 1.46 and 1.90 and ran 3 to 6 minutes;
   two arms at one trial each is about USD 4. Accepted; one trial per arm
   until a result is ambiguous.
9. The Codex leg: project hooks load only when the `.codex/` layer is
   trusted and the CLI refuses the account's models (GROUND-0025 addendum);
   the fixture ships `.codex/hooks.json` with a session-cwd-relative path
   and the wiring is exercised offline only. Accepted, recorded.

Stop criterion met: every critical unknown is Strong or Conditional with a
named mitigation, and the residual technical risk is below the non-technical
one, which is measuring a gate whose feedback the model cannot act on; Task
0086 lands the validator messages ahead of the first paid trial for that
reason.

### 2026-09-21 — Tracked measurement: fixture, case family, lane, and the first on-versus-off comparison

Built test-first under GROUND-0028. The tracked fixture
`eval/fixtures/research-gated-repo` wires the gate for both hosts
(`${CLAUDE_PROJECT_DIR}/.claude/skills/ad-hooks/...` on Claude Code, a
session-cwd-relative `.agents/skills/ad-hooks/...` on Codex); a case may
declare `fixture_skills`, which the lane installs from `src/skills/<host>/`
into each trial copy and freezes by digest in `run_parameters`; the lane
points `AD_ARTIFACT_GATE_EVIDENCE_DIR` at a per-trial directory under its
work root and keeps the lines beside the capture as
`<trial>.gate-evidence.jsonl`; `eval/lib/gate-evidence.mjs` joins evidence
lines with `file_write` events by path and order and reads the comparison
metrics from the host's `result` record; `node eval/run.mjs join <capture-dir>`
re-derives both from a capture directory. The `ad-ground` family
(`research-before-implementing-{positive,close-negative,coexistence}`) passes
the corpus gate and the trigger-phrase test. Two lane defects fixed on the way,
each with a regression test: paths were relativized against the tracked
fixture instead of the trial copy (GROUND-0028 E5), and then against the
unresolved temporary root while the host reports the resolved one (macOS
`/private/var`), which the first trial exposed. Fresh two-axis review at
`.agentic/reviews/2026-09-21T21-42-05Z-task-0084-slice-*.md` (machine-local):
no Blocker; three Concerns and one Note applied (skill digests recorded once
per run, a malformed evidence line kept as data instead of aborting the
capture, the join ordered by the gate's timestamp across evidence files,
`tool_actions` restricted to host tool calls with every kind under `events`).

Trials: one per arm, `research-before-implementing-positive`, Claude Code
2.1.227, `claude-opus-5`, runner
`claude -p {request} --output-format stream-json --verbose --permission-mode acceptEdits --setting-sources project --allowedTools Skill`,
46 skills installed in the copy, no plugin, no user hook, no MCP server in the
session (init record). The off arm exported `AD_ARTIFACT_GATE=0` in the
lane's shell; its evidence directory stayed empty, which is the proof the arm
ran off. Captures, evidence, and receipts are retained under
`.agentic/reviews/evidence/task-0084-{on,off}/` (machine-local); capture
digests `b62c4cdef8fc1f5a...` (on) and `b7ef2f944367778b...` (off).

| Arm | Wall-clock | Turns | Cost (USD) | Tool actions | Denials | Writes | Record valid at turn end |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gate on | 375.1 s | 52 | 1.95 | 11 commands, 2 writes | 19 | task, record | yes; one evidence line, `validator-passed`, joined to write event 28 |
| Gate off | 387.0 s | 55 | 2.24 | 9 commands, 2 writes | 18 | task, record | yes (validated by hand from the trial copy); no evidence line |

Both arms invoked `ad-ground` through the `Skill` tool (native
`skill_invoked`, so the route grader graded without Task 0082), read the
record template from the installed skill, and wrote a record that validated
on its first write. The gate therefore surfaced nothing in the on arm: its one
firing was a pass. The pilot's non-convergence came from the template being
unreadable outside the working directory, which installing the skill into the
copy removes; the validator messages of Task 0086 were never exercised live.
No gain claim: one trial per arm, differences within what one run varies.
Both receipts verify and grade `pass` (route, effects, outcome) after one
case correction, disclosed here: the fixture's `AGENTS.md` asks that every
planned change be recorded under `doc/tasks/`, and both arms did so before
writing the record, which the positive case's `allowed_effects`
(`doc/research/*.md` only) graded as `unauthorized_effect`. The case now
permits `doc/tasks/*.md` without requiring it, its synthetic receipts were
re-frozen, and both live receipts were re-derived from their unchanged
captured bytes with the corrected lane and case
(`.agentic/reviews/evidence/rederive-receipt.mjs`); the pre-correction grading
is stated above rather than hidden. Every denial was a `Bash` command
(script runs, `git`), `WebSearch`, or `WebFetch` under `acceptEdits`, the
same in both arms; both records therefore carry a `B1` source marked not
obtained.

Codex leg: not run. `codex --version` reports `codex-cli 0.139.0`, which
refuses the account's default model `gpt-6-astra` as requiring a newer CLI and
`gpt-5-codex` as unsupported for a ChatGPT account (GROUND-0025 addendum);
the fixture's `.codex/hooks.json` wiring is exercised offline in
`test/agent-hooks-wiring.test.js`.

Disposition for ADR-0083 decision 7: the first gate has run on the live lane
with a recorded on-versus-off comparison, and in this comparison it surfaced
nothing, which is the ADR's own revisit trigger and not evidence for a second
gate. The record that proposes or declines a second gate needs a case where
the record fails at first write; that costs further paid trials and is the
owner's call. Total spend this entry: USD 4.19 (plus USD 0.04 for the
`--setting-sources` probe).

### 2026-09-21 — Audit dispositions and the durable record of the comparison

Maximum-gate audit over the three commits (trail at
`.agentic/reviews/2026-09-21T22-17-14Z-audit-*.md`, machine-local): seven
groups dispatched, the critical claims group run three times under two
models. Two findings change this record.

First, provenance order (CV.7, three of three passes): GROUND-0028 was
written in the working tree before the lane code and validated then, but
its commit lands after the commit that implements it. The record is
therefore recorded alongside the code, not before it; the feat commit's
message now says so, and the earlier "built test-first under GROUND-0028"
in these Notes is to be read the same way.

Second, durability of the comparison (CV.5, unresolved by swap-and-agree):
the streams, receipts, and evidence file live only under the gitignored
`.agentic/reviews/evidence/`, as ADR-0082 decision 4 requires for captures
that carry operator configuration. The load-bearing observations are
therefore quoted here verbatim as the tracked record, and the comparison
is read as informing, not closing, ADR-0083 decision 7: a decision-grade
record needs its per-observation artifacts in a durable, governed channel,
which this repository does not yet have for live captures.

Gate evidence line, on arm (the whole file):

```json
{"seq":1,"at":"2026-09-21T21:46:58.831Z","gate":"artifact-gate","state":"validator-passed","host_tool":"Write","path":"doc/research/0001-ground-download-retry.md","owner":"ground-record","validator":"ad-ground/scripts/validate-record.mjs","output":"","surfaced":"","reproduction":"node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0001-ground-download-retry.md"}
```

Result records (fields quoted from the last line of each captured stream):

```json
{"subtype": "success", "is_error": false, "duration_ms": 375131, "num_turns": 52, "total_cost_usd": 1.94936225, "session_id": "2525be66-052b-46d7-a65d-c091ffcc47c0"}
{"subtype": "success", "is_error": false, "duration_ms": 386976, "num_turns": 55, "total_cost_usd": 2.2420782499999996, "session_id": "ec49c167-4be1-4857-b936-48830ba2c045"}
```

Capture digests (SHA-256 of `t1.jsonl`, frozen in each receipt): on
`b62c4cdef8fc1f5aabed3bf95b4c71676a0289bb0d950e22ae714cfe6b0e8a00`, off
`b7ef2f944367778bc9beb2910a691d85198354fb1f27cc0098030c6737f99ec7`.

Also applied from the audit: `runLive` strips `GIT_DIR`, `GIT_WORK_TREE`,
and `GIT_INDEX_FILE` from the host's environment (HK.2, the kit's own
idiom); `installFixtureSkills` moved to `eval/lib/fixture-skills.mjs` and
`readGateEvidence` to `eval/lib/gate-evidence.mjs` so `live.mjs` returns
under the size ceiling; the two relativization tests carry the
`regression:` prefix; ARCHITECTURE.md's boundary rule names the third
`eval/`-to-`src/` import and its guard; CONTEXT.md gains "Trial copy" and
the `fixture_skills` field; GROUND-0028's C1 line references were corrected
to the audited tree. Refuted: a note on the DCO address, which is the
repository's committer identity on every commit.

### 2026-09-21 — Re-audit over the final tree and rule-gap candidates

Two fresh reviewers re-audited the final tree (274e81b) carrying every prior
finding: all ten resolved or refuted with observed evidence, the critical
claims group clean on a fresh walk, two minor judgement-calls left as
repository idiom (a silent skip of a non-JSON stream line in the host
environment and metrics readers, which predates this work; test files above
the file-size ceiling, which the repository has never applied to `test/`).
Rule-gap candidates for `/ad-level-up`: GUIDELINES §3.3 needs either a
`test/` carve-out or split suites; `/ad-commit` could check that a cited
`GROUND-NNNN` record is already committed or require the "recorded
alongside" wording, since this task broke CV.7 by commit order alone while
the record existed first in the working tree.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
