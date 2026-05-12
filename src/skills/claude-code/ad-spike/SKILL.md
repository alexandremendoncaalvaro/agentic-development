---
name: ad-spike
description: Scaffold a staged spike with golden fixtures per WORKFLOW.md §14, for cases where the spec is clear but the technique is uncertain across multiple plausible approaches. Four stages — discovery, golden fixture, pipeline with gates, two-layer evaluation. Use when the unknown is *how*, not *what*. Triggers on "spike", "uncertain technique", "which library", "CV pipeline", "evaluate approaches", "ground truth", "golden fixture", "staged pipeline", "debug per stage". Routes to `ad-ground` if the *how* is routine and a single happy path is obvious. Read-and-write — creates `spikes/NNNN-<slug>/` with fixtures, debug per-stage artifacts, eval results.
summary: Staged spike with golden fixtures per WORKFLOW §14. Discovery + fixture + pipeline-with-gates + two-layer evaluation, when the *technique* is uncertain across multiple plausible approaches.
allowed-tools: Read, Write, Glob, Grep, Bash, WebFetch, WebSearch
---

# /ad-spike

Implements WORKFLOW.md §14 (Staged Spikes With Golden Fixtures) end-to-end. The skill is for cases where the spec is clear but the *technique* is uncertain across multiple plausible approaches — library choice, CV approach, multi-stage transformation. WORKFLOW §9 (TDG) assumes the path is known and validates end-to-end; §14 assumes the path is unknown and validates per stage. Different uncertainty regimes; this skill is for the unknown one.

The skill creates a working directory under `spikes/NNNN-<slug>/` and fills it stage-by-stage. The directory is throwaway by design — when the spike concludes, an ADR records the decision (`/ad-adr`) and the spike directory is deleted. See ADR-0017 for the promote-or-delete lifecycle rationale.

## Step 0 — Confirm uncertainty

The skill is for *unknown technique* across multiple plausible approaches, not for *non-trivial work* in general. If a single happy path is obvious, **do not start a spike**. If the *how* is knowable from official docs / implementation references / in-repo patterns / git history, route to `ad-ground` and stop.

Concrete tests to run before starting:

* Could `ad-ground`'s four-source research surface a single happy path with a defensible deviation gate? If yes, run that instead.
* Are there ≥2 candidate techniques with materially different trade-offs that no source resolves? If no, this is not a spike.
* Is end-to-end validation against expected outputs feasible without per-stage debug? If yes, this is `ad-task` + `ad-philosophy` Goal-Driven Execution territory, not a spike.

If the spike is warranted, confirm with the user the *recortte* (the specific surface where uncertainty sits — not the whole feature) and proceed.

## Step 1 — Discovery

List canonical approaches grounded in **official docs and real examples**. Pick one (or a small set, ≤3) by an **explicit criterion**.

Candidate-listing process:

1. Search official documentation for the language / library / domain in question. Cite URL + version.
2. Search public implementation references (open-source repos, Stack Overflow / forum answers, blog posts, gists) for solutions to the same technical recortte. Cite `<source>:<locator>` — `<repo>:<path>:<line-range>` for repos, `<URL>` for Stack Overflow / blog / gist — and fetch via tools; never paraphrase from training memory.
3. Survey in-repo for analogous patterns the codebase already uses. Cite `<file>:<line>` or "no analog found".
4. Survey git history for prior attempts at the same problem. Cite `<commit-sha>` or "no prior attempt".

Output format:

```markdown
## Discovery — <recortte>

### Candidate techniques
1. **<name>** — <one-line description>. Source: <URL or repo:path>. Trade-offs: <pros / cons>.
2. **<name>** — ...
3. **<name>** — ...

### Selection criterion
<one-line criterion: latency / accuracy / readability / dependencies / etc>

### Picked
<technique X>, picked by criterion <Y>. Alternatives held in reserve: <list>.
```

The output of this step is **information, not code**. No spike directory is created yet. The user reviews the candidate list and confirms the picked approach (or revises) before Step 2.

## Step 2 — Golden fixture

Curate inputs with rich expected outputs. The fixture is the ground truth the staged pipeline validates against; richer fixtures catch more failure modes.

Create the spike directory:

```bash
mkdir -p spikes/NNNN-<slug>/{fixtures,debug,eval}
```

Where `NNNN` is the next available 4-digit number (mirrors ADR / task / spec numbering). List `spikes/` and pick the next slot.

The fixture format is JSON keyed by input path (recommended) or whatever shape the domain demands. For computer vision: bounding boxes, sizes, lighting condition, difficulty tag, edge case markers. For multi-stage transformations: intermediate states. For library choice: representative inputs covering typical and edge cases.

Example fixture file (`spikes/0001-detect-circles/fixtures/golden.json`):

```json
{
  "inputs/easy-01.jpg": {
    "expected": [
      { "bbox": [120, 80, 240, 200], "label": "circle", "size": "large", "lighting": "even" }
    ],
    "difficulty": "easy",
    "edge_cases": []
  },
  "inputs/hard-01.jpg": {
    "expected": [
      { "bbox": [50, 60, 90, 100], "label": "circle", "size": "small", "lighting": "low" },
      { "bbox": [200, 80, 260, 140], "label": "circle", "size": "medium", "lighting": "even", "occluded": true }
    ],
    "difficulty": "hard",
    "edge_cases": ["low-light", "partial-occlusion", "multiple-objects"]
  }
}
```

Curation principles:

* Include **edge cases** (low light, partial occlusion, malformed inputs, large inputs, empty inputs) — not just "happy path" examples. The fixture's job is to surface *where* a technique fails, not just whether it succeeds on easy cases.
* Include **difficulty tags** so per-stage evaluation can report performance segmented by difficulty.
* Keep the fixture as data, not code. JSON / YAML / CSV — anything that diffs cleanly and survives a refactor.

The fixture is the contract the pipeline validates against. Treat it like spec text — it should not change once the spike runs unless ground truth itself changes.

## Step 3 — Pipeline with gates

One technique per stage. Each stage emits a **debug artifact** that makes its output inspectable.

Pipeline structure:

```
spikes/NNNN-<slug>/
├── README.md          # spike framing (Step 1 output)
├── fixtures/          # golden inputs + expected outputs
│   └── golden.json
├── pipeline/          # one file per stage
│   ├── 01-preprocess.<ext>
│   ├── 02-detect.<ext>
│   └── 03-postprocess.<ext>
├── debug/             # per-stage debug artifacts
│   ├── 01-preprocess/
│   ├── 02-detect/
│   └── 03-postprocess/
└── eval/              # evaluation results (Step 4)
```

Each stage's debug artifact format depends on the domain:

* CV pipelines: image saved to `debug/NN-<stage>/<input-name>.png` showing the stage's output.
* Multi-stage transformations: intermediate JSON saved to `debug/NN-<stage>/<input-name>.json`.
* Library evaluation: log row per (input, library) saved to `debug/NN-<stage>/log.csv`.

The discipline: **each stage's output must be inspectable independently**. End-to-end output alone tells you *that* it failed; per-stage debug tells you *where*.

Implementation pattern (any language):

* Stage takes (input, context) and returns (output, debug-record). Debug-record is written to `debug/NN-<stage>/`.
* Pipeline runs stages sequentially. Failure at any stage halts the pipeline and reports the stage where divergence happened.

## Step 4 — Two-layer evaluation

Run the pipeline against the fixture and emit two layers of results:

* **End-to-end:** how many fixture inputs produced expected outputs? Reported as pass / fail per input, plus aggregate pass rate.
* **Per-stage:** for each fixture input, where did the pipeline diverge? Stage NN's output vs the expected intermediate. Reported as pass / fail per (input, stage).

Output to `spikes/NNNN-<slug>/eval/results.json`:

```json
{
  "fixture": "fixtures/golden.json",
  "pipeline_version": "<commit-sha or timestamp>",
  "end_to_end": {
    "total": 10,
    "passed": 7,
    "failed": 3
  },
  "per_stage": {
    "01-preprocess": { "passed": 10, "failed": 0 },
    "02-detect": { "passed": 8, "failed": 2 },
    "03-postprocess": { "passed": 7, "failed": 1 }
  },
  "failures": [
    {
      "input": "inputs/hard-02.jpg",
      "diverged_at": "02-detect",
      "expected": [...],
      "actual": [...],
      "debug_artifact": "debug/02-detect/hard-02.png"
    }
  ]
}
```

The per-stage layer is what makes the spike actionable. End-to-end says *that* it failed; per-stage + debug artifact says *where* and *why*.

## Step 5 — Conclude (promote or delete)

When the spike concludes — either the picked technique works or it does not — record the outcome via `/ad-adr` and delete the spike directory. The ADR is the persistent artifact; the spike code is throwaway.

ADR template for spike outcomes:

```markdown
# ADR-NNNN: We will use technique X for <recortte>

## Context

<why the spike was needed — what was uncertain>

## Decision

We will use technique X. The spike at `spikes/NNNN-<slug>/` (now deleted) showed:
- End-to-end pass rate: <%>
- Failures concentrated at stage <NN>, root cause <Y>
- Mitigation: <Z>

Alternatives held in reserve and rejected:
- Technique A: rejected because <reason from spike eval>
- Technique B: rejected because <reason from spike eval>

## Consequences

<follow-on work this decision unblocks; rails to maintain>
```

Then:

```bash
rm -rf spikes/NNNN-<slug>/
git add doc/adr/NNNN-<slug>.md
git commit -m "feat: adopt technique X for <recortte> per spike NNNN"
```

Spikes that conclude inconclusively get an ADR too — `Decision: defer; the spike at NNNN inconclusive because Y` — and the directory is deleted. Inconclusive spikes are real signal; preserving the framing in an ADR prevents re-litigation.

## Output contract

A spike directory at `spikes/NNNN-<short-slug>/` with the four-stage layout above (discovery README, fixtures, pipeline, debug per stage, eval results). The directory is throwaway by design — promote-or-delete lifecycle' ' No `Status: shipped` lifecycle; spikes do not "ship" — they conclude with an ADR.

When the host exposes `AskUserQuestion`, use it for the Step 1 selection criterion confirmation and the Step 5 promote/delete decision.

## Next

- After Step 1 (discovery output reviewed): proceed to Step 2 to create the spike directory + fixture, or abort if the discovery surfaced a single happy path (route to `ad-ground`).
- After Step 4 (eval results): `/ad-adr` to record the outcome, then delete the spike directory.
- If the spike succeeds and production work follows: `/ad-task` for the work units to apply the spike's findings to production code (Spec ref the original spec if applicable; cite the ADR in the task `Notes`).
