# Bootstrap a Task

A per-task tracking file optimized for LLM editing: status changes via single checkbox toggles, append-only Notes log, no rewrites of large blocks.

## Where it lives

`doc/tasks/<NNNN>-<short-slug>.md` — sequential numbering, kebab-case slug, mirrors the ADR convention (`doc/adr/`).

## Why this format

Toggling a checkbox is a single-character `Edit` operation. Rewriting a paragraph is risky and expensive in tokens. Markdown checklists make the LLM's edits cheap, reviewable, and idempotent. Pattern documented in [spec-kit's tasks.md](https://github.com/github/spec-kit/blob/main/templates/commands/tasks.md), [taskmd](https://medium.com/@driangle/taskmd-task-management-for-the-ai-era-92d8b476e24e), [Backlog.md](https://github.com/MrLesk/Backlog.md), and [Claude Code's Tasks API](https://platform.claude.com/docs/en/agent-sdk/todo-tracking).

## Paste to your agent

> Use [`templates/task.md`](../templates/task.md) to draft `doc/tasks/<NNNN>-<short-slug>.md` (next available number) for the task: `<one-line task description>`.
>
> Interview me to fill:
> - Context: why this task, what problem it solves
> - Acceptance Criteria: measurable conditions per [WORKFLOW.md §1](../WORKFLOW.md), each as a checkbox — pass/fail must be observable, not aspirational ("loads in under 2s" not "fast enough")
> - Plan: concrete sequential steps with file paths where applicable, each as a checkbox
>
> Status starts at `proposed`. Created: today. Owner: ask me. Board ref: leave blank unless I provide one. Leave Notes empty (it gets filled during execution). Definition of Done section stays as in the template.
>
> **Do not invent values.** When I don't know something, leave `<TODO>` and ask. Stop after writing the file. Wait for me to start work.
>
> When working on the task later, edit the file by toggling checkboxes (`- [ ]` → `- [x]`) and appending to Notes — never rewrite existing sections.
