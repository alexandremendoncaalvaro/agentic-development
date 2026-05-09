# Task 0003: Add `agentic-architecture`, `agentic-adr`, `agentic-task`, `agentic-audit`

**Status:** proposed
**Created:** 2026-05-08
**Owner:** Alexandre Alvaro
**Board ref:**

## Context

Chunk 2 of v0.2 (per [doc/v0.2-cli-plan.md](../v0.2-cli-plan.md)). Extends the skill set to the full universal group: the four skills installed for every project regardless of stack. After this task, `agentic init` produces a complete kit for any greenfield/brownfield project; the only thing missing for a full release is the conditional skills (Chunk 3) and polish (Chunk 4).

`agentic-task` is included here per [ADR-0004](../adr/0004-file-based-task-tracking.md). Board sync stays out of scope (deferred to v0.3 as `agentic-task-sync`).

## Acceptance Criteria

- [ ] All 4 skills exist for both Claude Code and Codex (8 `SKILL.md` files plus 4 `agents/openai.yaml` files for Codex)
- [ ] Each skill embeds the relevant template content inline (no external file fetch needed at invocation time)
- [ ] Each skill's body matches the agent's idiomatic style: Markdown headings for Claude Code, XML tags for Codex
- [ ] `agentic init` installs all 4 by default when no overrides are passed
- [ ] Integration tests cover the full universal set install
- [ ] Manual e2e: each skill invokable in both agents, produces the expected artifact at the documented path

## Plan

- [ ] Write `agentic-architecture` for Claude Code (template inlined: `templates/architecture.md`)
- [ ] Write `agentic-architecture` for Codex
- [ ] Write `agentic-adr` for Claude Code (template inlined: `templates/adr.md`)
- [ ] Write `agentic-adr` for Codex
- [ ] Write `agentic-task` for Claude Code (template inlined: `templates/task.md`)
- [ ] Write `agentic-task` for Codex
- [ ] Write `agentic-audit` for Claude Code (read-only drift report, no file written; embeds the audit prompt)
- [ ] Write `agentic-audit` for Codex
- [ ] Update install logic in `src/commands/init.js` to copy all universal skills by default
- [ ] Extend `test/init.test.js` to cover all-universal install
- [ ] Manual e2e per skill in both agents, log results in Notes
- [ ] Commit on `cli` branch

## Notes

### 2026-05-08

While auditing kit-shared docs after ADR-0004 introduced task tracking, several drifts were caught only by manual inspection (Task row missing from main README, file tree omitting `doc/tasks/`, etc.). This kind of structural consistency check — pure filesystem + grep, no LLM required — is a natural extension of `agentic-audit`. Possible scope addition for this skill or a sibling `agentic-audit-docs`:

- Every `templates/X.md` has a matching `prompts/X.md`
- README reference table includes every artifact in `templates/`
- WORKFLOW.md mentions every artifact category
- Internal cross-refs (ADR-NNNN, §N, file paths) resolve

Defer the exact spec for v0.2 implementation; flag here so it does not get lost.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
