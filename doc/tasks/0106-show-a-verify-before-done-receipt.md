# Task `0106`: Show a verify-before-done receipt

**Status:** proposed
**Created:** 2026-10-07
**Scope ref:** doc/product/PRD.md (Next tier, Optional Claude Code companion plugin)
**Evidence ref:** doc/research/0035-ground-claude-code-session-plugin.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

"Verify before claiming done" is one of the owner's core rules, and today
nothing on screen shows whether tests ran after the last edit. Two community
mods converge on a per-turn receipt (RESEARCH-0036 E5). A deterministic version
fits the kit: count file edits and test runs from tool calls, and show one quiet
row only when edits followed the last test run.

## Acceptance Criteria

- [ ] At the end of a main-loop turn in which files were edited after the last test command, the band shows one dim row naming the count of edited files and that tests have not run since; otherwise nothing is added.
- [ ] Test commands are recognized from a short configurable list with a sensible default (`npm test`, `npm run verify`, `node --test`, `pytest`, `go test`, `dotnet test`).
- [ ] Nothing is injected into the model's context; the row is display-only.
- [ ] Tests cover edit-then-test, test-then-edit, and no-edit turns.

## Plan

- [ ] Red, then green in `test/session-plugin.test.js` and the plugin's pure module.
- [ ] Live check; docs; `/ad-review`; `/ad-audit`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Planned with Task 0104 under ADR-0088 (proposed), from RESEARCH-0036's
shortlist; starts after Task 0104 lands.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
