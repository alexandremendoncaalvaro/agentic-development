---
name: ad-tdg
description: Outcome-based prompting per WORKFLOW.md §9. Give the agent the finish line first, not the path. Five steps — confirm regime, ground truth pair, Test Dependency Map, three approaches, pick by one criterion, implement and verify. Triggers on "outcome-based", "TDG", "ground truth", "expected output", "three approaches", "pick by criterion", "test dependency map", "TDM", "before modifying", "tests covering this file", "give the finish line". Routes to `ad-spike` if the technique itself is uncertain. No file written; output is the verified implementation that lands through normal commits.
summary: Outcome-based prompting per WORKFLOW §9. Ground truth pair + Test Dependency Map + three approaches + single-criterion selection, when the technique is known but the implementation strategy is uncertain.
---

<background_information>
Implements WORKFLOW.md §9 (Outcome-Based Prompting / Test Dependency Map) end-to-end. The skill is for the implementation phase when the canonical technique is known and multiple implementation strategies are plausible. WORKFLOW §14 (`ad-spike`) covers the technique-unknown regime; §9 (this skill) covers the implementation-strategy-uncertain regime.

No file is written. The output of the skill is the verified implementation that lands in the repo through normal commits. The ground-truth pair, candidate set, selection criterion, and TDM list go into the commit message body — or the task's `Notes` log when one exists — not into a separate `doc/` artifact.

Codex auto-trigger on description keywords is less mature than Claude Code's. If auto-invocation does not fire when the user mentions outcome-based prompting, ground truth, three approaches, or a Test Dependency Map, invoke this skill manually.
</background_information>

<instructions>
Step 0 — confirm regime. TDG is for the *technique-known, implementation-strategy-uncertain* regime. Run the skill only when the canonical approach is settled (via `ad-ground` or prior knowledge) AND multiple implementation strategies could produce the expected output with different trade-offs along readability / performance / testability axes.

Route elsewhere when:
- The *technique itself* is uncertain across multiple plausible approaches → `ad-spike` (WORKFLOW §14). Spike validates technique with golden fixture + per-stage debug; TDG validates implementation with ground-truth pair + TDM.
- The path is fully obvious (one-line fix, mechanical refactor, byte-for-byte port) → TDG is overkill; proceed directly without the skill.
- No tests cover the surface and the project does not yet have a test runner wired → consider `ad-hooks` for project gates first; TDG depends on a verifiable green baseline.

Step 1 — ground truth pair. State raw input + exact expected output before any code is written. Concrete, not aspirational. The pair is the contract the implementation must satisfy.

Format depends on the surface:
- For pure functions: input arguments + expected return value, as code-block or JSON.
- For data transformations: source data + transformed data, side-by-side.
- For CLI / API surfaces: request payload + response payload, as paste-ready examples.
- For UI changes: pre-state DOM / screenshot + post-state DOM / screenshot.

Example (pure function):
```
Input: parse('--agent claude-code --yes')
Expected output: { agent: 'claude-code', yes: true, dryRun: false, force: false }
```

The pair is small, explicit, and verifiable. Aspirational language ("loads fast", "handles all edge cases") is not ground truth — concrete examples are.

Step 2 — Test Dependency Map (TDM). List the tests covering the file(s) the change will touch. Run them to establish the green baseline. If no tests cover the surface, write one first that exercises the *current* behavior before any modification.

Process:
1. Grep for tests referencing the file by import path: `grep -r 'from.*<file>' test/ tests/`.
2. Grep for tests referencing the function or symbol: `grep -r '<symbol>' test/ tests/`.
3. Run the matched tests in isolation to confirm green: `npx node --test test/<matched>.test.js` or equivalent for the language.
4. If empty: write a test that asserts the current behavior. Run. Confirm green. *Then* proceed to Step 3.

The TDM is the verification surface — Step 5's "implement + verify" loop runs these tests, not the full suite, so the feedback loop stays under a few seconds. Full-suite runs happen at commit-time via the project's pre-push hook (`ad-hooks`).

Step 3 — three approaches. Generate three implementation candidates that produce the ground-truth pair. Each candidate names trade-offs along the §9 axes:

```
Approach A: <name / one-line description>
  - readability: <high / medium / low + reason>
  - performance: <O(...), bytes allocated, etc.>
  - testability: <surface area, mockability, isolation>

Approach B: <name / one-line description>
  - readability: ...
  - performance: ...
  - testability: ...

Approach C: <name / one-line description>
  - readability: ...
  - performance: ...
  - testability: ...
```

No premature optimization across all three axes — each candidate names its trade-offs honestly. A candidate that is "high on every axis" is suspect; surface what it actually trades against.

Three is a soft target. If the surface is small and only two approaches are plausible, two is fine. If the third candidate is contrived to fill a slot, drop it; the criterion-based selection in Step 4 handles two as easily as three.

Step 4 — pick by one criterion. The user names the criterion explicitly — readability *or* performance *or* testability, **not all three at once**. The skill commits to the selected candidate. Alternatives get one-line rejection notes for the commit message body or task `Notes`:

```
Criterion: testability
Picked: Approach B (smaller mock surface, no global state read)
Rejected:
  - Approach A — one fewer allocation but mocks four singletons (testability lower)
  - Approach C — clearer at the call site but writes shared state (testability lower)
```

The discipline: refuse "optimize for readability AND performance AND testability". Tradeoffs are real — naming the criterion makes them visible.

Step 5 — implement + verify. Modify the file. Run the TDM tests from Step 2. If green, the change is done — proceed to commit with the ground-truth pair + criterion + rejection notes in the commit message body. If red, iterate against the same ground-truth pair until green.

Verification rules:
- Do **not** edit the TDM tests to make them green. The tests are the verification surface; modifying them while implementing is the hidden form of "almost right" that WORKFLOW §12 names. If a test is wrong, fix the test first as a separate diff with its own ground-truth pair.
- Do **not** declare done before the TDM tests pass. Type-check passing is not the gate; the test gate is.
- If iteration loops past three attempts and the implementation still fails, **stop and re-examine the ground-truth pair**. The pair may be ambiguous, or the canonical approach may not actually map to the expected output. Routing back to `ad-ground` (re-research) or `ad-spike` (technique uncertain) is preferable to forcing a wrong implementation through.
</instructions>

<output_contract>
No file written. Output is structured conversation:

1. Confirmation of regime (Step 0 — TDG or routed elsewhere).
2. Ground-truth pair (Step 1).
3. TDM list with green-baseline confirmation (Step 2).
4. Three candidates with trade-off table (Step 3).
5. Selection by criterion + rejection notes (Step 4).
6. Implementation + verification result (Step 5).

When the change is committed, the ground-truth pair, criterion, and rejection notes go into the commit message body. When a task file exists, the same content also lands in the task's `Notes` log under a dated entry.
</output_contract>

## Next

- After Step 5 verification passes: commit the change with the ground-truth pair + criterion + rejection notes in the body.
- `/ad-review main..HEAD` (or current scope) before merge — WORKFLOW §10. The TDM tests verify the implementation matches ground truth; §10 review checks coupling, edge cases, spec drift the pair did not cover.
- If the work spans multiple sessions: `/ad-task` for explicit decomposition (Spec ref the original spec; cite this TDG run in the task `Notes`).
- If iteration stalled at Step 5 and routing back was needed: `/ad-ground` (re-research) or `/ad-spike` (technique uncertain).
