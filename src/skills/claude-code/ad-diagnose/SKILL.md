---
name: ad-diagnose
description: Disciplined diagnosis loop for hard bugs and performance regressions per WORKFLOW §15. Five phases — build a feedback loop, reproduce, hypothesise (3-5 ranked falsifiable), instrument, fix + regression-test. The feedback loop is the skill; everything else is mechanical. Triggers on "diagnose this", "debug this", "this is broken", "this is throwing", "performance regression", "find the bug", "build a repro", "feedback loop", "ranked hypotheses", "falsifiable", "/ad-diagnose". Routes to `ad-spike` when the technique is uncertain across approaches, `ad-grill-me` when the spec is unclear, `ad-tdg` when the bug is a clean ground-truth-pair regression.
summary: Disciplined diagnosis loop for hard bugs and performance regressions per WORKFLOW §15. Five phases — build a feedback loop (the skill itself), reproduce, hypothesise (3-5 ranked falsifiable), instrument (one variable at a time), fix + regression-test.
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

# /ad-diagnose

Implements WORKFLOW.md §15 per ADR-0021. Disciplined diagnosis for hard bugs and performance regressions. Process scaffold; the output is the verified fix + regression test landing through normal commits.

The shape is grounded in Kernighan & Pike, *The Practice of Programming* (1999, ch. 5–6) and Karl Popper's falsifiability framing. The Phase-1 framing ("the loop is the skill — everything else is mechanical") is borrowed from [`mattpocock/skills`](https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnose/SKILL.md) with attribution.

## Step 0 — Confirm regime

Diagnose is for *hard bugs and performance regressions where the cause is unclear*. Run when at least one holds:

- A test is failing and the cause is not obvious from the diff.
- A symptom is reproducible but the chain of causes is not.
- A performance regression appeared between two known-good states.
- The user says "this is broken" / "this is throwing" / "this is slow" without a localized cause.

Route elsewhere when:

- The bug is one-line obvious (typo, off-by-one) — fix it directly; the skill is overkill.
- The bug is a clean ground-truth-pair regression (test was passing, output unchanged, now failing) → `/ad-tdg` (WORKFLOW §9). TDG handles it with the existing pair as the verification surface.
- The technique itself is uncertain across multiple plausible approaches → `/ad-spike` (WORKFLOW §14).
- The spec or expected behavior is unclear → `/ad-grill-me`. Sharpen the question before diagnosing.

## Phase 1 — Build a feedback loop

**This is the skill. Everything else is mechanical.** A fast, deterministic, agent-runnable pass/fail signal for the bug is what enables every later phase. Without a loop, no amount of staring at code finds the cause.

Spend disproportionate effort here. Be aggressive. Refuse to give up.

### Loop construction

Work through the loop-construction recipes in [references/loop-recipes.md](references/loop-recipes.md) — tried in roughly the order listed, from a failing test at the seam closest to the bug down to a last-resort human-in-the-loop script. Build the right loop, and the bug is 90% fixed.

### Iterate on the loop itself

Once you have *a* loop, treat it as a product:

- **Faster?** Cache setup, skip unrelated init, narrow the test scope.
- **Sharper signal?** Assert on the specific symptom, not "didn't crash".
- **More deterministic?** Pin time, seed RNG, isolate filesystem, freeze network.

A 30-second flaky loop is barely better than no loop. A 2-second deterministic loop is a debugging superpower.

### Non-deterministic bugs

Goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelize, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it is.

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for one of: (a) access to whatever environment reproduces it, (b) a captured artifact (HAR file, log dump, core dump, screen recording with timestamps), (c) permission to add temporary production instrumentation. **Do not proceed to Phase 3 without a loop.**

## Phase 2 — Reproduce

Run the loop. Watch the bug appear.

Confirm:

- The loop produces the failure mode the **user** described — not a different failure that happens to be nearby. Wrong bug = wrong fix.
- The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against).
- You captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix actually addresses it.

Do not proceed until the bug reproduces.

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea — this is the most common debugging failure mode after no-loop.

Each hypothesis must be **falsifiable** — state the prediction it makes:

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

If you cannot state the prediction, the hypothesis is a vibe — discard or sharpen.

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly ("we just deployed a change to #3"), or know hypotheses they have already ruled out. Cheap checkpoint, big time saver. Don't block on it — proceed with your ranking if the user is AFK.

Read [`CONTEXT.md`](CONTEXT.md) if it exists and ADRs in `doc/adr/` covering the surface — domain vocabulary and prior decisions sharpen the hypotheses.

## Phase 4 — Instrument

Each probe maps to a specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:

1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single `grep`. Untagged logs survive; tagged logs die.

**Perf branch.** For performance regressions, logs are usually wrong. Establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

If a probe falsifies its hypothesis, cross it off and move to the next-ranked one. Do not adapt the hypothesis to fit the probe — that is hindsight bias.

## Phase 5 — Fix + regression-test

Write the regression test **before the fix** — but only if there is a **correct seam** for it.

A correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that cannot replicate the chain that triggered the bug), a regression test there gives false confidence.

**If no correct seam exists, that itself is the finding.** Note it. The codebase architecture is preventing the bug from being locked down.

To pick the right routing branch below, run from the consumer repo root:

```bash
node .claude/skills/ad-diagnose/scripts/project-signals.mjs AGENTS.md
```

Use `mode` and `stacks` only to choose relevant repo evidence and test infrastructure. Surface every `unreadable[]` entry as a diagnosis constraint rather than silently assuming the file is absent.

- If the missing seam exposes load-bearing design friction: hand off to `/ad-deepen` (ADR-0020) with the specifics — the "test surface impact" line in the candidate template was made for this case.
- If the code is a one-off with no callers: capture the seam gap in the commit message body and the task `Notes` log; do not force an architectural refactor.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.

Cleanup before declaring done:

- Original repro no longer reproduces (re-run Phase 1 loop).
- Regression test passes (or absence of correct seam is documented as a finding for `/ad-deepen`).
- All `[DEBUG-...]` instrumentation removed (`grep` the prefix to verify zero hits).
- Throwaway prototypes deleted (or moved to a clearly-marked debug location).
- The hypothesis that turned out correct is stated in the commit / PR message — so the next debugger learns.

## Output contract

No primary file written. The output is the verified fix + regression test that lands through normal commits. Loop construction notes, ranked hypotheses, falsified ones, and the winning hypothesis go into the commit message body or the task's `Notes` log when one exists.

Each session produces:

1. The loop (Phase 1) — described in the commit message; a failing test if one was added.
2. The captured symptom (Phase 2) — quoted in the commit message.
3. The ranked hypothesis list (Phase 3) — listed in the commit message body with the winner marked.
4. The fix (Phase 5).
5. The regression test (Phase 5) — or the explicit finding that no correct seam exists.

## Next

- After fix + regression test land: `/ad-review main..HEAD` (or current scope) before merge — WORKFLOW §10. Diagnose verifies the symptom is gone; §10 review checks coupling, edge cases, spec drift the fix did not cover.
- If Phase 5 found no correct seam for the regression test and the missing seam is load-bearing: `/ad-deepen` to surface the opportunity that would create one. For a one-off with no callers, capture the gap in the commit message and task Notes instead of forcing a refactor.
- If Phase 1 could not build a loop and the user provided a captured artifact: re-enter Phase 1 with the artifact as the loop seed.
- If the bug turned out to be a vocabulary drift (the term in code did not match the term in the spec): `/ad-domain` to update `CONTEXT.md` and `/ad-drift` to scan for further drift.
- If the bug is one of several in a related cluster: `/ad-task` to capture the cluster as a tracked task with this diagnose run cited in the Notes.
