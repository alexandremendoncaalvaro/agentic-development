# Task `0116`: Run the handoff from the band as a command

**Status:** done
**Created:** 2026-10-14
**Scope ref:** doc/adr/0088-ship-an-optional-claude-code-companion-plugin.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The owner reported that pressing "AD handoff" in the `agentic-session` band does nothing in the desktop app. The installed plugin matched `main`, and `/agentic-briefing` opened its pane, so the plugin loads; the defect is the press. It called `$.prompt.submit({ text: '/ad-handoff', asUser: true })`. The task-0115 spike showed that `$.command.run` runs a slash command as if typed, so the press now runs `/ad-handoff` that way.

## Acceptance Criteria

- [x] Pressing "AD handoff" runs `/ad-handoff` through `$.command.run`.
- [x] When the command cannot run, a toast tells the owner to run `/ad-handoff` by hand, and the reason goes to the debug log.

## Plan

- [x] Test first in `test/session-plugin.test.js`; then `register.mjs`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-14 — built

The owner asked for the fix ("o botão não funciona"); it is a defect fix, so it follows the bug path. Two tests turned red first (the press runs the command; a refused command shows a toast). Running the wrong command name turned one red. The live check is the owner's press once the plugin update reaches the desktop app.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
