# ADR-0004: File-based per-task tracking with markdown checklists

**Status:** accepted
**Date:** 2026-05-08
**Deciders:** Alexandre Alvaro

## Context

While planning v0.2, it became clear that the kit needs a way to track the scope and progress of individual tasks during development — both for the kit's own implementation work (dogfooding) and for users applying the kit to their projects.

The author has practiced this pattern for years, predating the formal documentation: a single markdown file per task, with acceptance criteria and execution steps as checkboxes the LLM can toggle as it works. The file persists between sessions, lets the human resume where the agent left off, and scopes "what done means" explicitly.

In 2026, this pattern has converged across the agentic coding ecosystem:

- [`spec-kit` `tasks.md`](https://github.com/github/spec-kit/blob/main/templates/commands/tasks.md): canonical format `- [ ] [TaskID] [P?] [Story?] Description`. Issue [#181](https://github.com/github/spec-kit/issues/181) flags lack of automatic completion as the gap users want closed — exactly the case for explicit per-task files.
- [`taskmd`](https://medium.com/@driangle/taskmd-task-management-for-the-ai-era-92d8b476e24e): "local-first, Markdown-based task system for AI agents… every editor can open them and every AI agent can read and write them without needing custom API integrations."
- [`Backlog.md`](https://github.com/MrLesk/Backlog.md): task management between humans and AI agents in a git ecosystem.
- [Claude Code Tasks API + TodoWrite](https://platform.claude.com/docs/en/agent-sdk/todo-tracking) (v2.1.16, January 2026): file-based persistence is the recommended pattern for cross-session work.
- [planning-with-files](https://github.com/othmanadi/planning-with-files): explicitly the Manus-style persistent markdown planning workflow.

The technical reason behind the convergence is **diff cost**. Toggling a checkbox is a one-character `Edit` operation; rewriting a paragraph is risky and expensive in tokens. The format makes the LLM's edits cheap, reviewable, and idempotent.

Board integrations (Azure DevOps, Linear, Jira, GitHub Projects) via MCP also exist as of 2026 — the author originally built one for Azure DevOps before official MCPs were available. These belong in a follow-up phase: detect a configured MCP and offer sync. They are not in scope for v0.2.

## Decision

Add a task-tracking artifact to v0.2 of the kit:

- **Template:** `templates/task.md` — structured file with `Context`, `Acceptance Criteria` (checkboxes), `Plan` (checkboxes), `Notes` (append-only log), `Definition of Done` (closing checkboxes).
- **Prompt:** `prompts/task.md` — agent interview that produces a filled task file.
- **Skill:** `agentic-task` (Claude Code and Codex), invoked as `/agentic-task "title"`, writes to `doc/tasks/<NNNN>-<slug>.md`.
- **Path convention:** `doc/tasks/<NNNN>-<slug>.md` mirrors the ADR pattern (`doc/adr/<NNNN>-<slug>.md`). Sequential numbering, kebab-case slug.
- **LLM editing rules** documented in the prompt: toggle checkboxes, append to Notes, never rewrite existing sections.

Board integration (MCP-based sync) is deferred to v0.3 as `agentic-task-sync`. The local file remains the source of truth for solo work in v0.2.

## Consequences

Positive:

- The kit's own v0.2 implementation can be tracked with this artifact starting immediately — dogfooding from day zero, validates the format before publish.
- Aligns with the dominant 2026 pattern across spec-kit, taskmd, Backlog.md, planning-with-files, and Claude Code's own Tasks API.
- LLM edits are cheap (single-character checkbox toggles) and safe (no large block rewrites). Git diffs stay readable.
- Resumable across sessions: the file is the persistent state.

Negative / trade-offs:

- v0.2 scope grows by one skill (`agentic-task`) and the template/prompt artifacts. Mitigated by reusing the same skill structure as the other artifacts; no new mechanism.
- Without board sync, teams using Azure DevOps/Linear/Jira have to maintain two sources of truth temporarily (local task file plus the board). v0.3 closes this. For solo projects, no such duplication.

## Alternatives Considered

- **Defer entirely to v0.3 (with board sync).** Rejected. The author's stated need is *now* — tracking the v0.2 work itself benefits immediately. Waiting until v0.3 means the v0.2 sprint runs without the very tool we are building.
- **Single shared `tasks.md` file** (spec-kit style with all tasks in one document). Rejected for our use case. Per-task files give richer context per task (Context, AC, Plan, Notes, DoD) and allow concurrent work on multiple tasks without merge conflicts on a single file.
- **Embed task tracking inside ADRs.** Rejected. ADRs are decisions; tasks are work units. Conflating them dilutes both.
- **External tool only (e.g., GitHub Issues from day one).** Rejected for v0.2. Setting up board integration is its own complexity. Local files cover solo and small-team cases without setup. v0.3 adds the integration without breaking the local-first default.
