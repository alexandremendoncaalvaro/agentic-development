---
name: ad-spike
description: Scaffold a staged spike with golden fixtures per WORKFLOW.md §14, for cases where the spec is clear but the technique is uncertain across multiple plausible approaches. Four stages — discovery, golden fixture, pipeline with gates, two-layer evaluation. Use when the unknown is *how*, not *what*. Triggers on "spike", "uncertain technique", "which library", "CV pipeline", "evaluate approaches", "ground truth", "golden fixture", "staged pipeline", "debug per stage". Routes to `ad-ground` if the *how* is routine and a single happy path is obvious.
summary: Staged spike with golden fixtures per WORKFLOW §14. Discovery + fixture + pipeline-with-gates + two-layer evaluation, when the *technique* is uncertain across multiple plausible approaches.
---

<background_information>
Implements WORKFLOW.md §14 (Staged Spikes With Golden Fixtures) end-to-end. The skill is for cases where the spec is clear but the technique is uncertain across multiple plausible approaches. WORKFLOW §9 (TDG) assumes the path is known and validates end-to-end; §14 assumes the path is unknown and validates per stage.

The skill creates `spikes/NNNN-<slug>/` and fills it stage-by-stage. The directory is throwaway by design — when the spike concludes, an ADR records the decision and the spike directory is deleted (promote-or-delete lifecycle).

Codex auto-trigger on description keywords is less mature than Claude Code's. If auto-invocation does not fire when the user mentions an uncertain technique or asks to evaluate approaches, invoke this skill manually.
</background_information>

<instructions>
Step 0 — confirm uncertainty. Skill is for unknown technique across multiple plausible approaches, not non-trivial work in general. If a single happy path is obvious, do NOT start a spike — route to `ad-ground` and stop.

Tests:
- Could `ad-ground`'s four-source research surface a single happy path with a defensible deviation gate? If yes, run that instead.
- Are there ≥2 candidate techniques with materially different trade-offs that no source resolves? If no, this is not a spike.
- Is end-to-end validation feasible without per-stage debug? If yes, this is `ad-task` + `ad-philosophy` Goal-Driven Execution territory.

If spike warranted, confirm the focus with the user and proceed.

Step 1 — discovery. List canonical approaches grounded in official docs and real examples. Pick one (or ≤3) by an explicit criterion.

Process:
- Search official documentation. Cite URL + version.
- Search public implementation references (open-source repos, Stack Overflow / forum answers, blog posts, gists) for solutions to the same focus. Cite `<source>:<locator>` — `<repo>:<path>:<line-range>` for repos, `<URL>` for Stack Overflow / blog / gist — and fetch via tools; never paraphrase from training memory.
- Survey in-repo for analogous patterns. Cite `<file>:<line>` or "no analog found".
- Survey git history for prior attempts. Cite `<commit-sha>` or "no prior attempt".

Output: candidate-list markdown with techniques, sources, trade-offs, selection criterion, picked technique. NO code yet. User reviews before Step 2.

Step 2 — golden fixture. Curate inputs with rich expected outputs. JSON keyed by input path (recommended). Include edge cases (low light, partial occlusion, malformed inputs, large inputs, empty inputs) and difficulty tags.

Create the spike directory:
```
mkdir -p spikes/NNNN-<slug>/{fixtures,debug,eval}
```
Get NNNN by running `node .agents/skills/ad-spike/scripts/next-number.mjs spikes` from the consumer root. Use JSON `next`; archived gaps stay unused. Stop until access is resolved when `unreadable` is non-empty, and stop for a numbering decision when `exhausted` is true. If loaded elsewhere, substitute the skill base path.

The fixture is the contract the pipeline validates against. Treat like spec text — should not change once the spike runs unless ground truth changes.

Step 3 — pipeline with gates. One technique per stage. Each stage emits a debug artifact making its output inspectable.

Layout — see the spike directory layout in [references/pipeline-layout.md](references/pipeline-layout.md).

Each stage takes (input, context), returns (output, debug-record). Debug-record written to `debug/NN-<stage>/`. Pipeline halts and reports stage on first divergence.

Step 4 — two-layer evaluation:
- End-to-end: pass rate against fixture inputs.
- Per-stage: for each input, where did pipeline diverge?

Output to `spikes/NNNN-<slug>/eval/results.json` — see the two-layer results shape in [references/eval-format.md](references/eval-format.md).

Per-stage layer is what makes the spike actionable.

Step 5 — conclude (promote or delete). When the spike concludes:
- Record outcome via `/ad-adr` (ADR is the persistent artifact).
- Delete the spike directory: `rm -rf spikes/NNNN-<slug>/`.

ADR captures: which technique picked, alternatives held in reserve, end-to-end pass rate, failures and root causes, mitigation. Inconclusive spikes get ADRs too — preserves framing, prevents re-litigation.
</instructions>

<output_contract>
A spike directory at `spikes/NNNN-<short-slug>/` with the four-stage layout (discovery README, fixtures, pipeline, debug per stage, eval results). The directory is throwaway by design — promote-or-delete lifecycle. No `Status: shipped` lifecycle; spikes conclude with an ADR.
</output_contract>

## Next

- After Step 1: proceed to Step 2, or abort if discovery surfaced a single happy path (route to `ad-ground`).
- After Step 4: `/ad-adr` to record the outcome, then delete the spike directory.
- If spike succeeds and production work follows: `/ad-task` for work units (Spec ref the original spec; cite the ADR in task Notes).
