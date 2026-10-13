# Task `0115`: Hand off, clear and continue from the band

**Status:** in-progress
**Created:** 2026-10-13
**Scope ref:** doc/adr/0088-ship-an-optional-claude-code-companion-plugin.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

The `agentic-session` band shows the context reading and an "AD handoff"
button from 60% of the way to the auto-compact point. The owner finds it on
screen too often and wants it from about 80%. After pressing the button, the
owner still clears the session and pastes a resume prompt by hand; they want
an opt-in checkbox that does both: run `/ad-handoff`, wait for it, clear the
session and submit the resume prompt into the same window.

The plugin API offers `$.prompt.submit` (a prompt as the person's own words),
`turn.complete`, and `$.command.run` (a slash command as if typed). It does
not say whether `$.command.run` accepts the built-in `/clear`, nor whether
the plugin can submit after a clear, so a spike settles that before code.

## Acceptance Criteria

- [ ] The band's default threshold is 80% of the auto-compact point; the option still takes 1 to 99.
- [ ] The band carries a "clear and continue" checkbox, off by default and remembered across sessions.
- [ ] With the box on, pressing "AD handoff" runs `/ad-handoff`, then clears the session and submits a prompt that resumes from the handoff file it wrote; with the box off the button behaves as today.
- [ ] If the clear or the resume cannot run, the band says so and leaves the session as it was after the handoff.
- [ ] Unit tests cover the pure logic; the owner checks the flow live in the desktop app.

## Plan

- [ ] Spike: from a plugin, `$.command.run({ command: 'clear' })` and a `$.prompt.submit` after it; record the result.
- [ ] Default threshold 60 to 80 (`band.mjs`, `plugin.json`).
- [ ] Checkbox and flow (`register.mjs`, pure helpers in `band.mjs`), test first.
- [ ] ADR-0088 addendum; `/ad-review`; owner live check; PR with auto-merge.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-13 — plan approved

The owner approved this plan ("prossiga"). If the spike shows a plugin cannot run `/clear`, the fallback is to fill the prompt box with the resume prompt so the owner clears and presses Enter.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
