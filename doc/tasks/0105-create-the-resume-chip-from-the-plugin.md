# Task `0105`: Create the resume chip from the plugin

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** doc/product/PRD.md (Next tier, Optional Claude Code companion plugin)
**Evidence ref:** doc/research/0035-ground-claude-code-session-plugin.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

The ADR-0087 reminder asks the model to offer the resume chip when a session
handoff is written; the model still has to act. RESEARCH-0033 E14 showed a mod
reaches the desktop task server that owns `spawn_task`, so the
`agentic-session` plugin can create the chip itself on the write, making every
handoff resumable in one click whether or not the model remembers.

The hook acts after the write succeeds: it never blocks, denies or rewrites the
tool call, and adds only a note to the result's context. That keeps it inside
ADR-0088 item 3, which excludes members that block work, and outside ADR-0083's
gate rules. The live check needs the owner, so the task is HITL.

## Acceptance Criteria

- [ ] After a `Write` or `Edit` to a Markdown file directly under `agentic-handoffs/` succeeds, the plugin creates one resume chip through the desktop task server, whose prompt names the handoff path and tells the next session to read it first and follow its Resume protocol.
- [ ] Where the task server is unreachable (terminal, other hosts), the plugin does nothing and the ADR-0087 reminder stands.
- [ ] The model is told, through the tool result's context, that the chip already exists, so it does not offer a second one; a test covers the duplicate case.
- [ ] A live check on the desktop app shows exactly one chip for one handoff write; the owner confirms.

## Plan

- [ ] Ground the `spawn_task` arguments and the duplicate-suppression wording.
- [ ] Red, then green; live check; docs; `/ad-review`; `/ad-audit`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with Task 0104 under ADR-0088 (proposed), from RESEARCH-0036's
shortlist; starts after Task 0104 lands.

### 2026-10-07 — ADR status

ADR-0088 was accepted before Task 0104's implementation (commit c6e3ea7); this
task now plans under the accepted decision, unchanged.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
