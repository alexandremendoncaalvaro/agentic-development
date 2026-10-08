# Task `0098`: Write review handoffs without shell interpolation

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** doc/adr/0045-review-calibration-by-handoff-fidelity.md (review handoffs); applies to `ad-review` Step 4 and `ad-audit` Step 3
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`/ad-review` and `/ad-audit` persist handoffs to `.agentic/reviews/` but do
not say how to write them. Assembled through the shell, the text is
mangled: zsh `echo` turned a `\b` in a probe into a backspace, so a reviewer
reported a missing word boundary the code had (Task 0092), and an unquoted
heredoc on 2026-10-07 executed the backtick spans inside an embedded diff as
commands while building a review handoff. The skills should name a write
path that cannot interpret the content.

## Acceptance Criteria

- [ ] Both skills, on both hosts, say to write a handoff with the host's file-write tool or a program that writes the bytes as given, never with `echo` or an unquoted heredoc.
- [ ] A test locks the instruction on both hosts.
- [ ] The dogfood installs are refreshed and `npm run verify` passes.

## Plan

- [ ] Red: a test in `test/skills.test.js`.
- [ ] Green: edit both hosts' `ad-review` Step 4 and `ad-audit` Step 3.
- [ ] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Routed from the `/ad-level-up` curation of 2026-10-07, which the owner approved in chat; it supersedes the unmerged task-0094 draft for this item.

### 2026-10-08 — plan approved

The owner approved the kit hygiene batch ("ok"), built in one branch with
Tasks 0112 and 0113.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
