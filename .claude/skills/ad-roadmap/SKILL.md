---
name: ad-roadmap
description: Read-only roadmap report — reconciles roadmap tiers against specs and tasks, then explains the main delivery front, current work, next front, blockers, and progress as a plain-language Markdown checklist. Use on "how much is done", "are we on track", "progress report", "percent complete", "what's shipped".
summary: Read-only roadmap report with a thirty-second plain-language overview, focused current-front explanation, and checklist of delivered and remaining work backed by specs and tasks.
allowed-tools: Read, Glob, Grep, Bash
---

# /ad-roadmap

Read-only progress report for a decision-maker or newcomer. It answers: what are we delivering, what is happening now, what comes next, how much is done, and what is blocked? It reconciles the product roadmap against specs and tasks, then translates that evidence into plain language and a standard Markdown checklist. It writes nothing.

`ad-next` answers a different question: what the practitioner should do next. `ad-prd` authors or changes the roadmap. Do not absorb either responsibility.

## Rules (read first)

- Read-only. Write no file and mutate no state. `allowed-tools` omits Write by design.
- Keep the broad scan bounded: read roadmap sections, frontmatter, artifact references, and checkbox lines. Do not read full document bodies.
- Only for a task marked `in-progress`, read its `## Context` and `## Acceptance Criteria` to explain the active front. Do not read its Plan, Notes, or unrelated sections.
- Use plain language that someone joining the project can understand without opening another file. Translate artifact labels into outcomes; explain an acronym on first use; do not paste source prose.
- Use standard Markdown task-list syntax only: `- [x]` means delivered and `- [ ]` means work remains. An in-progress parent stays open and uses nested checked and open steps. Do not invent a third checkbox state.
- No emoji (WORKFLOW §2 / ADR-0008). Write status words where needed: `in progress`, `blocked`, `remaining`.
- Degrade gracefully. A missing PRD, `doc/specs/`, or `doc/tasks/` directory is reported, never treated as an error. An empty or absent PRD roadmap produces `N/A (no roadmap lines)`, falls back to the task ledger, and computes no roadmap percentage.
- Produce one report, not a menu. Overall percentage remains `done roadmap lines / total roadmap lines`.

## Step 1 — Load the plan

- Read `Status:` and `## Roadmap` from `doc/product/PRD.md`. MVP / Next / Later tiers are the spine; each roadmap line is one item to classify.
- In a multi-product repo, use `doc/product/PRODUCT-MAP.md` and each product file, then combine their rollups.
- With no PRD, use `doc/tasks/` as the plan, label the result task-based, and recommend `/ad-prd`.

## Step 2 — Gather implementation evidence

- From `doc/tasks/*.md`, collect `**Status:**`, `**Spec ref:**`, and checkbox lines. Count checked and open boxes for task progress.
- From `doc/specs/*.md`, collect `Status:` and child-task references. If there are no specs, say so and reconcile from tasks.
- From `doc/adr/*.md`, collect proposed decisions that actually gate a roadmap item. Read `doc/adr/PROJECTION.md`, when present, to distinguish what still binds.
- After the broad scan identifies tasks marked `in-progress`, make the focused exception: read only their `## Context` and `## Acceptance Criteria`. Use Context for what and why; use acceptance checkboxes for done and remaining steps.

## Step 3 — Reconcile the roadmap

Map each roadmap item to its specs and tasks by feature name and `Spec ref`, then classify it:

- `done` — the implementing spec is `shipped`, or every implementing task is `done`.
- `in progress` — a task is `in-progress`, some but not all tasks are done, or the spec is accepted with tasks open.
- `blocked` — a blocked task or proposed ADR gates the item.
- `remaining` — work has not started. With no matching artifact, write `remaining, untracked` and recommend `/ad-task`.

When code and tracking plainly disagree, use the strongest artifact evidence and flag the gap. Never silently upgrade an item.

Choose the report's fronts in roadmap order:

1. **Main delivery front:** the earliest unfinished item with active or blocked work; otherwise the first remaining item. Explain the outcome, not merely its task title.
2. **Current front:** choose among tasks explicitly marked `in-progress`. If several qualify, prefer one changed in the working tree, then one touched by the most recent commit. If that still ties, say that several tasks are marked in progress, name them, and explain the earliest one in roadmap order; never hide the ambiguity.
3. **Next front:** the first unfinished item after the current front. When no task is in progress, say so and use the first remaining roadmap item as the next front. If everything is done, say the roadmap is complete and there is no next front.
4. **Blocker:** the blocker that most directly gates the main or next front. If none is recorded, say `No blocker recorded`.

## Step 4 — Compute supporting evidence

- Overall: done roadmap items divided by total roadmap items, plus counts for in progress, blocked, and remaining.
- Per tier: the same done / total count and percentage.
- Risk: `at risk` when an MVP item is blocked or remaining while a later tier has progress, or a blocked task or proposed ADR gates a roadmap item. Otherwise `on track`.

## Output contract

Return one Markdown message in this order:

1. `30-second overview` — main delivery, now, next, progress, and blocker in plain sentences.
2. `Current front` — only when an explicit in-progress task exists; one short what-and-why paragraph plus its checked and open acceptance steps.
3. `Roadmap checklist` — every roadmap item, grouped by tier. Checked means delivered; open means unfinished. An in-progress item has nested checked and open steps.
4. `Supporting evidence` — plan status, task/spec counts, percentages, risk, and identifiers. These support the story; they do not lead it.

Example:

```markdown
## Roadmap — @acme/widget

### 30-second overview

- **Main delivery:** Make the core workflow safe enough for the first release.
- **Now:** The team is connecting feature decisions to tested implementation work.
- **Next:** Package the release flow so a maintainer can ship without manual guesswork.
- **Progress:** 4 of 11 roadmap items are delivered (36%); the plan is at risk.
- **Blocker:** The team still needs to decide how failed workflow runs recover.

### Current front — Connect decisions to implementation

This work turns an accepted feature decision into small, testable delivery steps so contributors can build it consistently.

- [x] Define the feature outcome and acceptance checks.
- [ ] Implement the first end-to-end behavior.
- [ ] Verify the remaining edge cases.

### Roadmap checklist

#### MVP — 3 of 5 delivered (60%)

- [x] Give every project a clear engineering foundation. (tasks 0001–0003)
- [ ] In progress — Connect feature decisions to tested implementation. (task 0007)
  - [x] Define the feature outcome and acceptance checks.
  - [ ] Implement and verify the behavior.
- [ ] Blocked — Make workflow failures recoverable. (task 0009; proposed ADR-0012)

#### Next — 1 of 3 delivered (33%)

- [x] Automate contribution hand-offs.
- [ ] Add a repeatable release flow. (untracked; use `/ad-task`)
- [ ] Add contributor-facing project docs.

#### Later — 0 of 3 delivered (0%)

- [ ] Add language presets.
- [ ] Add an evaluation harness.
- [ ] Prepare the 1.0 release.

### Supporting evidence

- **Plan:** PRD accepted; 8 tasks (5 done, 2 in progress, 1 blocked); no specs.
- **Risk:** At risk because proposed ADR-0012 blocks an MVP item.
```

When no explicit in-progress task exists, omit `Current front` and write `No task is currently marked in progress` under `Now`; the first remaining item becomes `Next`. No file is written and no state is mutated.

## Next

- To act on what is left: `/ad-next`.
- To change the plan itself: `/ad-prd`.
- To backfill an untracked item: `/ad-task`.
- To reconcile documentation against code: `/ad-drift`.
