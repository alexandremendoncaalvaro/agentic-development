---
name: ad-roadmap
description: Read-only progress rollup for a decision-maker — reconciles the product roadmap (MVP / Next / Later tiers) against its implementing specs and tasks to report how much of the plan is done, how much is left, and whether the project is on track, as an overall percentage plus a per-tier done / in progress / blocked / remaining breakdown. Use when the user asks "how much is done", "how much is left", "how much remains", "are we on track", "roadmap status", "progress report", "percent complete", "what's shipped vs pending", or "/ad-roadmap". Read-only — writes nothing. Complements `ad-next`, which recommends what to do next (a different question), and `ad-prd`, which authors the roadmap; routes to them instead of duplicating either.
summary: Read-only completion rollup that reconciles the product roadmap against implementing specs and tasks into an overall percentage plus a per-tier done / in progress / blocked / remaining breakdown for a decision-maker.
allowed-tools: Read, Glob, Grep, Bash
---

# /ad-roadmap

Read-only completion rollup for a decision-maker. Answers one question: how much of the plan is done, how much is left, and are we on track. Reconciles the product roadmap against its implementing specs and tasks, then returns a scannable percentage plus a per-tier breakdown. Writes nothing.

Complements `ad-next`, a different question: `ad-next` answers "what should I do next" (a forward-looking action list for the practitioner); `ad-roadmap` answers "how much is done vs left" (a completion rollup for the boss). Do not reimplement either — route to `ad-next` for next actions and to `ad-prd` for authoring or changing the roadmap.

## Rules (read first)

- Read-only. Write no file, mutate no state. `allowed-tools` omits Write by design.
- Read ONLY frontmatter and the `## Roadmap` section. Never read full document bodies — the rollup is fast and broad.
- No emoji anywhere (WORKFLOW §2 / ADR-0008). Status is words: `done`, `in progress`, `blocked`, `remaining`.
- Degrade gracefully. PRD, `doc/specs/`, and `doc/tasks/` may each be absent. Never error on a missing directory — report what is missing and roll up what exists. An empty or absent `## Roadmap` with a PRD present → headline is `N/A (no roadmap lines)`; do not compute a percentage (no divide-by-zero) — fall back to the task-based rollup and say so.
- One rollup, not a menu. The headline percentage is `done roadmap lines / total roadmap lines`.

## Step 1 — Load the plan (the spine)

- `doc/product/PRD.md` → read `Status:` and the `## Roadmap` section only. The roadmap tiers (MVP / Next / Later) are the spine: each line is one feature to classify.
- Multi-product repo: `doc/product/PRODUCT-MAP.md` plus per-product `<slug>.md` — roll up each product's roadmap, then combine into one headline.
- No PRD → there is no product-framed plan. Fall back to `doc/tasks/` as the plan and say so: the rollup is task-based, not roadmap-based. Recommend `/ad-prd` to frame one.

## Step 2 — Gather implementation evidence (frontmatter only)

- `doc/tasks/*.md` → `**Status:**` per task (`done` vs `proposed` / `in-progress` / `blocked`). Within a task, count `- [x]` against `- [ ]` for a per-task percentage. Read `**Spec ref:**` to tie a task to its spec.
- `doc/specs/*.md` → `Status:` (`draft` / `accepted` / `shipped` / `superseded`) plus its child-task rollup. Defensive: this directory often does not exist — if so, report "no specs" and reconcile straight from tasks. Never treat its absence as an error.
- `doc/adr/*.md` → `proposed` ADRs are open decisions that can block a roadmap line; surface them by slug. Read `doc/adr/PROJECTION.md` (if present) for which ADRs still bind.

## Step 3 — Reconcile each roadmap line

Map each roadmap line to its implementing specs/tasks (by feature name and `Spec ref`), then classify:

- `done` — the implementing spec is `shipped`, or every implementing task is `done`.
- `in progress` — at least one implementing task is `in-progress`, or some but not all tasks are `done`, or the spec is `accepted` with tasks still open.
- `blocked` — an implementing task is `blocked`, or a `proposed` ADR gates the line.
- `remaining` — no implementing work started. A line with no matching artifact is `remaining (untracked)`; note it and recommend `/ad-task` to backfill tracking.

When repo state plainly contradicts the tracking (a feature clearly shipped but no task records it), report the line by its artifact evidence and flag the gap — do not silently upgrade it.

## Step 4 — Compute the rollup

- Headline: `done / total` roadmap lines as a percentage. State in-progress, blocked, and remaining as counts.
- On-track vs at-risk: `at-risk` when any MVP-tier line is `blocked` or `remaining` while later tiers show progress, or when any `proposed` ADR or `blocked` task gates a line. Otherwise `on-track`.

## Output contract

One Markdown message: a BLUF line (overall percentage + on-track / at-risk), then the per-tier breakdown, then a two-line "so what". Words for status, no emoji. Example:

```
## ad-roadmap — @acme/widget

**Overall:** 4 of 11 roadmap items done (36%) — at-risk
**Plan:** PRD accepted · 8 tasks (5 done, 2 in progress, 1 blocked) · no specs

### MVP tier — 3 of 5 done (60%)
- done — Layer 1 Constitution trinity (tasks 0001, 0002 done)
- done — Layer 2 Domain
- done — Layer 3 Product
- in progress — Layer 4 Spec (task 0007 in-progress, 2 of 4 steps)
- blocked — Workflow core (task 0009 blocked on proposed ADR-0012)

### Next tier — 1 of 3 done (33%)
- done — Reciprocity automation
- remaining — Release skill (untracked — no task; /ad-task to plan)
- remaining — Community docs

### Later tier — 0 of 3 done (0%)
- remaining — Per-language presets, eval harness, 1.0 promotion

**So what:** MVP is one blocked line and one in-progress line from complete — clearing proposed ADR-0012 unblocks task 0009. The Later tier is unstarted and not yet at risk.
```

No file written. No state mutation.

## Next

- To act on what is left: `/ad-next` (prioritized next actions — a different question).
- To change the plan itself: `/ad-prd` (roadmap authoring).
- To backfill tracking for an untracked line: `/ad-task`.
- To reconcile docs against code: `/ad-drift`.
