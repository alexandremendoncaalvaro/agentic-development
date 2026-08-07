---
name: ad-roadmap
description: Read-only progress rollup for a decision-maker — reconciles the product roadmap (MVP / Next / Later tiers) against its implementing specs and tasks to report how much of the plan is done, how much is left, and whether the project is on track, as an overall percentage plus a per-tier done / in progress / blocked / remaining breakdown. Use when the user asks "how much is done", "how much is left", "how much remains", "are we on track", "roadmap status", "progress report", "percent complete", "what's shipped vs pending", or "/ad-roadmap". Read-only — writes nothing. Complements `ad-next`, which recommends what to do next (a different question), and `ad-prd`, which authors the roadmap; routes to them instead of duplicating either.
summary: Read-only completion rollup that reconciles the product roadmap against implementing specs and tasks into an overall percentage plus a per-tier done / in progress / blocked / remaining breakdown for a decision-maker.
---

<background_information>
Read-only completion rollup for a decision-maker. Answers one question: how much of the plan is done, how much is left, and are we on track. Reconciles the product roadmap against its implementing specs and tasks, returns a scannable percentage plus a per-tier breakdown. Writes nothing.

Complements `ad-next`, a different question: `ad-next` answers "what should I do next" (a forward-looking action list for the practitioner); `ad-roadmap` answers "how much is done vs left" (a completion rollup for the boss). Route to `ad-next` for next actions and `ad-prd` for authoring or changing the roadmap — never reimplement either.

Codex auto-trigger on description keywords is less mature than Claude Code's. If auto-invocation does not fire when the user asks about roadmap progress, invoke this skill manually.
</background_information>

<instructions>
Rules (read first):
- Read-only. Write no file, mutate no state.
- Read ONLY frontmatter and the `## Roadmap` section. Never read full document bodies.
- No emoji anywhere (WORKFLOW §2 / ADR-0008). Status is words: `done`, `in progress`, `blocked`, `remaining`.
- Degrade gracefully. PRD, `doc/specs/`, and `doc/tasks/` may each be absent — never error on a missing directory; report what is missing and roll up what exists. An empty or absent `## Roadmap` with a PRD present → headline `N/A (no roadmap lines)`; compute no percentage (no divide-by-zero) — fall back to the task-based rollup and say so.
- One rollup, not a menu. Headline percentage = `done roadmap lines / total roadmap lines`.

Step 1 — load the plan (the spine).
- `doc/product/PRD.md` → read `Status:` and the `## Roadmap` section only. The tiers (MVP / Next / Later) are the spine: each line is one feature to classify.
- Multi-product: `doc/product/PRODUCT-MAP.md` plus per-product `<slug>.md` — roll up each, then combine.
- No PRD → no product-framed plan. Fall back to `doc/tasks/` and say so (task-based, not roadmap-based); recommend `/ad-prd`.

Step 2 — gather implementation evidence (frontmatter only).
- `doc/tasks/*.md` → `**Status:**` per task (`done` vs `proposed` / `in-progress` / `blocked`); within a task, count `- [x]` vs `- [ ]` for a per-task percentage; read `**Spec ref:**` to tie a task to its spec.
- `doc/specs/*.md` → `Status:` (`draft` / `accepted` / `shipped` / `superseded`) plus child-task rollup. Defensive: this directory often does not exist — report "no specs" and reconcile from tasks.
- `doc/adr/*.md` → `proposed` ADRs are open decisions that can block a line; surface by slug. Read `doc/adr/PROJECTION.md` (if present) for what still binds.

Step 3 — reconcile each roadmap line. Map it to implementing specs/tasks (by feature name and `Spec ref`), then classify:
- `done` — implementing spec `shipped`, or every implementing task `done`.
- `in progress` — a task is `in-progress`, or some but not all tasks are `done`, or the spec is `accepted` with tasks open.
- `blocked` — a task is `blocked`, or a `proposed` ADR gates the line.
- `remaining` — no work started. No matching artifact → `remaining (untracked)`; recommend `/ad-task` to backfill.
When repo state plainly contradicts the tracking, report by artifact evidence and flag the gap — do not silently upgrade.

Step 4 — compute the rollup.
- Headline: `done / total` roadmap lines as a percentage; state in-progress, blocked, remaining as counts.
- On-track vs at-risk: `at-risk` when any MVP-tier line is `blocked` or `remaining` while later tiers show progress, or any `proposed` ADR / `blocked` task gates a line. Otherwise `on-track`.
</instructions>

<output_contract>
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
</output_contract>

## Next

- To act on what is left: `/ad-next` (prioritized next actions — a different question).
- To change the plan itself: `/ad-prd` (roadmap authoring).
- To backfill tracking for an untracked line: `/ad-task`.
- To reconcile docs against code: `/ad-drift`.
