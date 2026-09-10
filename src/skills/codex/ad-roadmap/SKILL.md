---
name: ad-roadmap
description: Read-only roadmap report — reconciles roadmap tiers against specs and tasks, then explains the main delivery front, current work, next front, blockers, and progress as a plain-language Markdown checklist. Use on "how much is done", "are we on track", "progress report", "percent complete", "what's shipped".
summary: Read-only roadmap report with a thirty-second plain-language overview, focused current-front explanation, and checklist of delivered and remaining work backed by specs and tasks.
---

<background_information>
Read-only progress report for a decision-maker or newcomer. It answers: what are we delivering, what is happening now, what comes next, how much is done, and what is blocked? It reconciles the product roadmap against specs and tasks, then translates that evidence into plain language and a standard Markdown checklist. It writes nothing.

`ad-next` answers a different question: what the practitioner should do next. `ad-prd` authors or changes the roadmap. Do not absorb either responsibility.

Codex auto-trigger on description keywords is less mature than Claude Code's. If auto-invocation does not fire for a roadmap-progress question, invoke this skill manually.
</background_information>

<instructions>
Rules (read first):
- Read-only. Write no file and mutate no state.
- Project-wide scope is the default for `/ad-roadmap` and any unqualified roadmap request.
- Task scope activates only on an explicit task-roadmap request, such as a task id, task path, or “this/current task.” Resolve a named task directly. For “this/current task,” prefer a task changed in the working tree, then one touched by the most recent commit. If that still leaves multiple candidates, ask one concise question before reading deeply.
- Never mix scopes. Project scope reports the whole delivery plan; task scope reports only the selected task.
- Use plain language that someone joining the project can understand without opening another file. Translate artifact labels into outcomes; explain an acronym on first use; do not paste source prose.
- Use standard Markdown task-list syntax only: `- [x]` means delivered and `- [ ]` means work remains. Both scopes show tasks and their meaningful subtasks as nested checklist items. An in-progress parent stays open. Do not invent a third checkbox state.
- No emoji (WORKFLOW §2 / ADR-0008). Write status words where needed: `in progress`, `blocked`, `remaining`.
- Degrade gracefully. A missing PRD, `doc/specs/`, or `doc/tasks/` directory is reported, never treated as an error. An empty or absent PRD roadmap produces `N/A (no roadmap lines)`, falls back to the task ledger, and computes no roadmap percentage.
- Produce one report, not a menu. Read `references/output-templates.md` and apply exactly one template for the selected scope.

Project scope — load the plan.
- Keep the broad scan bounded: read roadmap sections, frontmatter, artifact references, and checkbox lines. Do not read full document bodies.
- Read `Status:` and `## Roadmap` from `doc/product/PRD.md`. MVP / Next / Later tiers are the spine; each roadmap line is one item to classify.
- In a multi-product repo, use `doc/product/PRODUCT-MAP.md` and each product file, then combine their rollups.
- With no PRD, use `doc/tasks/` as the plan, label the result task-based, and recommend `/ad-prd`.

Project scope — gather implementation evidence.
- From `doc/tasks/*.md`, collect `**Status:**`, `**Spec ref:**`, and checkbox lines. Count checked and open boxes for task progress.
- From `doc/specs/*.md`, collect `Status:` and child-task references. If there are no specs, say so and reconcile from tasks.
- From `doc/adr/*.md`, collect proposed decisions that actually gate a roadmap item. Read `doc/adr/PROJECTION.md`, when present, to distinguish what still binds.
- After the broad scan identifies tasks marked `in-progress`, read only each in-progress task's `## Context` and `## Acceptance Criteria` for the active-front explanation. Do not read its Plan, Notes, or unrelated sections. Use Context for what and why; use acceptance checkboxes for done and remaining subtasks.

Project scope — reconcile the roadmap.
Map each roadmap item to its specs and tasks by feature name and `Spec ref`, then classify it:
- `done` — the implementing spec is `shipped`, or every implementing task is `done`.
- `in progress` — a task is `in-progress`, some but not all tasks are done, or the spec is accepted with tasks open.
- `blocked` — a blocked task or proposed ADR gates the item.
- `remaining` — work has not started. With no matching artifact, write `remaining, untracked` and recommend `/ad-task`.
When code and tracking plainly disagree, use the strongest artifact evidence and flag the gap. Never silently upgrade an item.

Choose the report's fronts in roadmap order:
1. Main delivery front: the earliest unfinished item with active or blocked work; otherwise the first remaining item. Explain the outcome, not merely its task title.
2. Current front: choose among tasks explicitly marked `in-progress`. If several qualify, prefer one changed in the working tree, then one touched by the most recent commit. If that still ties, say that several tasks are marked in progress, name them, and explain the earliest one in roadmap order; never hide the ambiguity.
3. Next front: the first unfinished item after the current front. When no task is in progress, say so and use the first remaining roadmap item as the next front. If everything is done, say the roadmap is complete and there is no next front.
4. Blocker: the blocker that most directly gates the main or next front. If none is recorded, say `No blocker recorded`.

Project scope — compute supporting evidence.
- Overall: done roadmap items divided by total roadmap items, plus counts for in progress, blocked, and remaining.
- Per tier: the same done / total count and percentage.
- Risk: `at risk` when an MVP item is blocked or remaining while a later tier has progress, or a blocked task or proposed ADR gates a roadmap item. Otherwise `on track`.

Task scope — build the selected task roadmap.
- Read the selected task's frontmatter, `## Context`, `## Plan`, `## Acceptance Criteria`, and `## Definition of Done`. Read a blocker from `## Notes` only when the task status or open steps indicate one but do not name it elsewhere.
- Explain the task's outcome and why it matters from Context. Keep parent project, spec, and ADR references as supporting evidence only.
- Use `## Plan` as the checklist spine. If Plan is absent, use Acceptance Criteria. Preserve recorded dependency order, and nest recorded subtasks beneath their parent task steps.
- Count checked versus total items from that one spine for progress. Do not combine Plan, Acceptance Criteria, and Definition of Done into one percentage.
- `Now` is the first open in-progress step, or the first open step for an in-progress task. `Next` is the following open step. A proposed task has not started; a blocked task names its blocking condition; a done task has no current or next step.
- Use Definition of Done only for distinct completion gates not already represented by the checklist spine. Flag contradictions or missing decomposition as tracking gaps; do not invent subtasks.
</instructions>

<output_contract>
Read `references/output-templates.md`, select the project or task template from the request, and return one Markdown message in that exact heading order. Replace every placeholder with evidence-backed, plain-language text.

Both templates start with `30-second overview`, followed by the scope's current work and nested checklist.

For project scope, lead with the main delivery front and next front, then show every roadmap task with meaningful tracked subtasks nested beneath it. When no task is in progress, omit `Current front`, write `No task is currently marked in progress` under `Now`, and use the first remaining item as `Next`.

For task scope, lead with the task goal, current step, next step, progress, and blocker, then show the task's steps and subtasks in dependency order. Stay within the selected task. In both scopes, checked means evidence-backed completion and open means unfinished. No file is written and no state is mutated.
</output_contract>

## Next

- To act on what is left: `/ad-next`.
- To change the plan itself: `/ad-prd`.
- To backfill an untracked item: `/ad-task`.
- To reconcile documentation against code: `/ad-drift`.
