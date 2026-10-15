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

- [x] The band's default threshold is 80% of the auto-compact point; the option still takes 1 to 99.
- [x] The band carries a "clear and continue" checkbox, off by default and remembered across sessions.
- [x] With the box on, pressing "AD handoff" runs `/ad-handoff`, then clears the session and submits a prompt that resumes from the handoff file it wrote; with the box off the button behaves as today.
- [x] If the clear or the resume cannot run, the band says so and leaves the session as it was after the handoff.
- [ ] Unit tests cover the pure logic; the owner checks the flow live in the desktop app.

## Plan

- [x] Spike: from a plugin, `$.command.run({ command: 'clear' })` and a `$.prompt.submit` after it; record the result.
- [x] Default threshold 60 to 80 (`band.mjs`, `plugin.json`).
- [x] Checkbox and flow (`register.mjs`, pure helpers in `band.mjs`), test first.
- [ ] ADR-0088 addendum; `/ad-review`; owner live check; PR with auto-merge.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-13 — plan approved

The owner approved this plan ("prossiga"). If the spike shows a plugin cannot run `/clear`, the fallback is to fill the prompt box with the resume prompt so the owner clears and presses Enter.

### 2026-10-13 — spike: a plugin can clear and resume

A throwaway plugin loaded with `--plugin-dir` into a headless Claude Code 2.1.289 run (the app's binary; the terminal's `claude` is 2.1.227, too old for module hooks). After the first turn it called `$.command.run({ command: 'clear' })`, which resolved `{"text":""}` while `session.end` fired with reason `clear`; the session id changed. A `$.prompt.submit({ asUser: true })` after it ran in the new session and the model answered `SPIKE-RESUMED`. The fallback (filling the prompt box) is not needed. Handoffs land in `${TMPDIR}/agentic-handoffs` on this machine, so the plugin lists that directory after the handoff turn, rather than hooking the Write call: ADR-0088 keeps the plugin from intercepting tool calls.

### 2026-10-13 — built

Test first: six regression tests in `test/session-plugin.test.js` (newest handoff since the press, the resume prompt, box on, box off, no file, the remembered toggle) plus the 80% default; red before the code except the box-off case, which is today's behaviour. Five mutations (ignore the press time, accept any file, clear without a file, ignore the box, skip the clear) each turned one test red. ADR-0088 gains a dated addendum, PROJECTION follows.

### 2026-10-15 — merged with main and tests completed

Merged `origin/main` (release 1.6.0) instead of rebasing: one conflict pass, no force-push. Task 0116 landed on main meanwhile and changed the press to `$.command.run({ command: 'ad-handoff' })`, because a plugin's `$.prompt.submit` of `/ad-handoff` did nothing in the desktop app; the clear-and-resume flow now arms on that command. The engine 2.1.295 typings say `prompt.submit` sends its text to the model as written, so a slash command through it is not expanded; the resume prompt is plain text, so it still goes through `$.prompt.submit`, which the 2.1.289 spike showed running in the cleared session. The desktop app is the owner's live check.

Eight tests added for the paths the WIP left uncovered: the directory list, a file older than the handoff turn, two new files, a refused clear, a refused resume prompt, a handoff command that could not start, a session that ends before the handoff turn, and an unreadable store. The code for those paths was already in the WIP commit, so each was shown to bite by a mutation instead: eight mutations (no dedupe, no time filter, no several-files check, no return after a refused clear, no reset when the command fails, no reset on session end, the store defaulting on, no turn-reason check) each turned its test red; 54 of 54 green after. "The band says so" is a toast from the band's plugin, the same channel task 0116 uses for a press that cannot start; ADR-0088's addendum records it.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
