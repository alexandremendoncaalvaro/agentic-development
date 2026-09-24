# GROUND-0029: Keep the live capture when the adapter fails

**Status:** recorded
**Decision:** In `runLive`, validate the case with `validateCase` before the version probe spawns anything, and make `validateCase` reject `request_kind: explicit` whose request does not start with a `/skill` or `$skill` mention, reusing the adapters' one mention pattern. When receipt assembly throws (an adapter normalizing a trial, or any other step of `buildLiveReceipt` and the digests and identity it is given, all of them harness defects), write every captured stream and its gate evidence to the capture directory (each already passed the leak gate), write no receipt and remove one a reused destination still holds, and rethrow an error that names the trial and the capture directory, with the adapter's error as `cause`.
**Decision ref:** doc/tasks/0085-keep-the-capture-when-the-adapter-fails.md (implements doc/adr/0082-capture-live-trials-through-a-supplied-runner.md decisions 3 and 6 under doc/specs/0007-evaluate-skill-trajectories.md R13)
**Confidence:** Strong

## Decision and confidence

The happy path is the one mature evaluation harnesses already take: keep the raw output before interpreting it, so an interpretation failure costs a re-parse, not a re-run. SWE-bench writes each instance's test output to disk before grading reads it (B2), and Inspect writes its log even when a task fails with an error, marks it `status: "error"`, and resumes from it (B1). Here the raw output is the captured stream, and ADR-0082 decision 3 already names re-running a corrected adapter against the original bytes as the reason streams are kept (C1). The lane loses them only because the one write step sits after receipt assembly (C2), so the change is an ordering fix, not a new mechanism. The receipt question in the task settles against writing none: ADR-0082 decision 6 classifies an unparseable line as a harness defect that aborts, and Spec 0007 R13 requires a result to distinguish integrity from fitness, which a receipt whose trial is the harness's own failure would blur, because every consumer of a live receipt reads its trials as model behavior (E2). The error keeps the adapter's message and stack through `cause`, which is the platform's chaining mechanism (A1). The case check moves the only authoring error the pilot hit to the one point before any spawn, in the validator the replay lane already runs on every tracked case (E3).

Axis-2 verdict: Strong. Every piece is reversible, local to the eval harness, credential-free, and testable with a stub runner; no live trial is needed to prove it.

## Evidence

### E1 — Normalization runs after every host has exited and before anything is written, so an adapter throw discards streams that already passed the leak gate

**Strength:** High
**Provenance:** C2, C3, D1

C2: in `runLive` the captures loop spawns every trial and runs `assertNoLeak` on each stream and its gate evidence; only then does `buildLiveReceipt` call `captureTrial`, which rethrows any adapter error other than `UnterminatedStreamError`, and the `writeFileSync` loop comes after it, so the throw skips every write. C3: Task 0084 Notes, trial 2 of the exploratory pilot: the case declared `request_kind: explicit` without a mention, `explicitSkill` threw at normalization, the gate's evidence file (written by the hook, outside the lane) survived, and the stream was lost. D1: the ordering and its comment "Nothing is written until every capture has passed the gate, so an abort leaves no partial evidence" arrived with the lane in `0ea2d0d`; the comment's reason is the leak gate, which this change keeps, since only already-gated bytes are written. High: read in code and observed on a paid trial.

### E2 — An adapter failure is a harness defect: the streams are kept, no receipt is written

**Strength:** High
**Provenance:** C1, C4, B1, B2

C1: ADR-0082 decision 3 ("it is what lets a future adapter correction be re-run against the original bytes rather than re-measured against a moved target") and decision 6 ("The harness only aborts on its own defects: a missing runner, a malformed invocation, an unparseable line, or a leak"). C4: Spec 0007 R13 ("Each result distinguishes verification of receipt integrity from validation of behavioral fitness") and the validator's live-receipt rules, which read every trial's `outcome` as the host's; a harness-failure trial would need a new outcome vocabulary the replay graders do not know. B1 keeps the raw record on error but marks the whole log `error` so no reader mistakes it for results; the lane's equivalent is the absence of a receipt beside streams that exist. B2 writes the raw output before grading so grading can fail without losing it. High: the binding ADR names both halves and two external harnesses take the same shape.

### E3 — The case validator is the place to reject an explicit request without a mention, and the lane never calls it today

**Strength:** High
**Provenance:** C5, C6, C7

C5: `explicitSkill` in `eval/lib/adapters/common.mjs` owns the rule ("an explicit request must start with a /skill or $skill mention") through `SKILL_MENTION`, and applies it only at normalization, after the host ran. C6: `validateCase` in `eval/lib/validate.mjs` checks `request_kind` membership only, and `evaluateReplay` in `eval/lib/replay.mjs` calls it for every tracked case, so a stricter check is exercised by the corpus gate; the three tracked explicit cases (`/ad-bootstrap`, `/ad-pr`, `/ad-hooks`) all pass it. C7: `runLive` parses the case with `JSON.parse` and never validates it before `probeHostVersion` spawns the runner. High: read in code and enumerated over `eval/cases/*.json`.

### E4 — `Error` chaining through `cause` keeps the adapter's error while the message names the trial

**Strength:** High
**Provenance:** A1, C8

A1: "If the `cause` option is provided, it is assigned to the `error.cause` property", which "allows for error chaining, where you can associate a new error with the original error that triggered it". C8: `eval/run.mjs` prints an uncaught error's message and exits non-zero, so the message is what the operator reads; it must carry the trial identifier and the capture directory itself. High: primary documentation for the supported Node versions.

## Source register

- **A1:** Node.js API documentation, "Errors", `new Error(message[, options])` and `error.cause`, https://nodejs.org/api/errors.html (accessed 2026-09-22 via WebFetch)
- **B1:** Inspect AI documentation, "Log Files", section "Eval Retries": "When an evaluation task fails due to an error or is otherwise interrupted (e.g. by a Ctrl+C), an evaluation log is still written", with `status` values `started`, `success`, `error`, https://inspect.aisi.org.uk/eval-logs.html (accessed 2026-09-22 via WebFetch)
- **B2:** SWE-bench, `swebench/harness/run_evaluation.py`, `run_instance`: `with open(test_output_path, "w") as f: f.write(test_output)` before `get_eval_report(..., test_log_path=test_output_path, ...)`, https://github.com/SWE-bench/SWE-bench/blob/main/swebench/harness/run_evaluation.py (accessed 2026-09-22 via WebFetch of the raw file)
- **C1:** `doc/adr/0082-capture-live-trials-through-a-supplied-runner.md`, decisions 3 and 6 (accessed 2026-09-22 via repository read)
- **C2:** `eval/lib/live.mjs` `runLive` (captures loop with `assertNoLeak`, then `buildLiveReceipt`, then the `writeFileSync` loop) and `captureTrial` (rethrow of non-`UnterminatedStreamError` errors) at 4059661 (accessed 2026-09-22 via repository read)
- **C3:** `doc/tasks/0084-measure-the-gate-through-the-live-lane.md`, Notes, exploratory pilot trial 2 (accessed 2026-09-22 via repository read)
- **C4:** `doc/specs/0007-evaluate-skill-trajectories.md` R13 and `eval/lib/validate.mjs` `validateTrials` and `validateOrigin` (accessed 2026-09-22 via repository read)
- **C5:** `eval/lib/adapters/common.mjs` `SKILL_MENTION` and `explicitSkill` (accessed 2026-09-22 via repository read)
- **C6:** `eval/lib/validate.mjs` `validateCaseIdentity`, `eval/lib/replay.mjs` `evaluateReplay` calling `validateCase`, and the explicit requests enumerated with `node -e` over `eval/cases/*.json` (accessed 2026-09-22 via repository read and `node` from the repository root)
- **C7:** `eval/lib/live.mjs` `runLive` first lines: `JSON.parse(readFileSync(...))` then `probeHostVersion` (accessed 2026-09-22 via repository read)
- **C8:** `eval/run.mjs` `runLiveLane` and its top-level error handling (accessed 2026-09-22 via repository read)
- **D1:** `git log --oneline main -- eval/lib/live.mjs` lists `e634762`, `66dfbf5`, `a3c9467`, `9873a0d`, `d5baf81`, `6f15b62`, `0ea2d0d`; `git log --all --oneline -S"adapter failed" -S"keep the capture" -- eval test` finds no prior attempt (accessed 2026-09-22 via git in the `lagos` worktree)

## Limitations and reversal

The record does not add a way to rebuild a receipt from kept streams; re-running a corrected adapter over them stays a manual step, which Task 0084's machine-local re-derive script already performed once. With an explicit `--out` that holds a previous run's `receipt.json`, the failed run would otherwise leave that receipt beside the new streams, where it reads as theirs; the lane already overwrites that file name on success, so on failure it removes it, and only a reused destination is affected, because the default capture directory is fresh per run. Reversal evidence: a consumer that needs a receipt for every run, including harness failures, would reverse E2 and call for a receipt-level `status` field in the schema, as B1 has.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0029-ground-keep-capture-on-adapter-failure.md`, then reopen every source in the register. Structural validity proves the map, not the source content.
