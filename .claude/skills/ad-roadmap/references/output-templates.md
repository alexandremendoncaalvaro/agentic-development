# `ad-roadmap` output templates

Use exactly one template per response. Keep the headings and order; replace every placeholder with plain project language. A checklist line may represent a task, feature, or delivery step. When it contains meaningful internal work, show its subtasks indented beneath it. Use `[x]` only for evidence-backed completion and `[ ]` for everything unfinished.

## Project roadmap template

```markdown
## Project roadmap — <project name>

<decision-maker brief returned by `ad-brief`>

### Roadmap checklist

#### MVP — <done of total delivered and percentage>

- [x] <delivered roadmap task>
  - [x] <delivered subtask, when useful>
- [ ] In progress — <active roadmap task>
  - [x] <completed subtask>
  - [ ] <remaining subtask>
- [ ] Blocked — <blocked roadmap task>
  - [x] <completed subtask>
  - [ ] <blocked or remaining subtask and reason>

#### Next — <done of total delivered and percentage>

- [x] <delivered roadmap task>
- [ ] <remaining roadmap task>
  - [ ] <first planned subtask>
  - [ ] <second planned subtask>

#### Later — <done of total delivered and percentage>

- [ ] <later roadmap task>
  - [ ] <known subtask, when tracked>

### Supporting evidence

- **Plan:** <PRD status; task and spec counts>
- **Risk:** <on track or at risk, with the evidence-backed reason>
- **Tracking gaps:** <untracked roadmap items, or “None recorded”>
```

Project-scope rules:

- Keep every product-roadmap item visible, grouped by its source tier.
- Tasks and subtasks are both checklist items. Nest subtasks whenever a roadmap item has tracked internal steps; do not flatten meaningful decomposition into prose.
- If several tasks are marked `in-progress`, use live repository evidence to choose the current-front fact passed to `ad-brief` and disclose unresolved ambiguity.
- When no task is in progress, pass that fact to `ad-brief` and make the first remaining roadmap item the next front.
- Percentages, tiers, and identifiers support the explanation; they do not replace it.

## Task roadmap template

```markdown
## Task roadmap — <plain task outcome> (task <id>)

<decision-maker brief returned by `ad-brief`>

### Task checklist

- [x] <completed task step>
  - [x] <completed subtask>
- [ ] In progress — <current task step>
  - [x] <completed subtask>
  - [ ] <remaining subtask>
- [ ] <remaining task step>
  - [ ] <first planned subtask>
  - [ ] <second planned subtask>

### Done when

- [x] <acceptance outcome already satisfied>
- [ ] <acceptance outcome still required>

### Supporting evidence

- **Task:** <id and status>
- **Scope:** <scope/spec/ADR references>
- **Tracking gaps:** <missing or contradictory task evidence, or “None recorded”>
```

Task-scope rules:

- Stay inside the selected task. Mention the parent project or spec only as supporting evidence.
- Tasks and subtasks are both checklist items. Preserve the task's dependency order and nest its recorded internal steps; do not turn the task view into a flat acceptance-criteria dump.
- Use the task `## Plan` as the checklist spine. If it is absent, use `## Acceptance Criteria`. Use `## Definition of Done` under `Done when` only when it adds a distinct remaining gate.
- Count one checklist spine for progress; do not add Plan, Acceptance Criteria, and Definition of Done percentages together.
- A blocked task names the blocking condition. A done task has no current or next step.
