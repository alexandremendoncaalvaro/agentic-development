# Task `0098`: Write review handoffs without shell interpolation

**Status:** done
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

- [x] Both skills, on both hosts, say to write a handoff with the host's file-write tool or a program that writes the bytes as given, never with `echo` or an unquoted heredoc.
- [x] A test locks the instruction on both hosts.
- [x] The dogfood installs are refreshed and `npm run verify` passes.

## Plan

- [x] Red: a test in `test/skills.test.js`.
- [x] Green: edit both hosts' `ad-review` Step 4 and `ad-audit` Step 3.
- [x] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Routed from the `/ad-level-up` curation of 2026-10-07, which the owner approved in chat; it supersedes the unmerged task-0094 draft for this item.

### 2026-10-08 — plan approved

The owner approved the kit hygiene batch ("ok"), built in one branch with
Tasks 0112 and 0113.

### 2026-10-08 — built

Both hosts' `ad-review` Step 4 and `ad-audit` handoff step now say to write
each handoff with the host's file-write tool or a program that writes the
bytes as given, never with `echo` or an unquoted heredoc. A regression test
in `test/skills.test.js` locks the sentence in all four files; it was red
before the edit.

### 2026-10-09 — review and audit record

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes) and the `/ad-audit` of `origin/main..23252ae` (19 rule groups, the critical claims group run three times across two models; gate `npm run verify` exit 0, 1394 of 1394). Neither found a Blocker. Batch-wide findings and the full table are in the pull request body. Findings for this task, as severity, finding, disposition:

- Review Note (Standards and Spec): status and Plan boxes still open. Fixed when this task closes.
- Audit minor: the changelog entry cited no ADR. Fixed (ADR-0036).

### 2026-10-09 — re-audit corrections

Re-audit of six groups at `ae477da` (architecture, guidelines, glossary, ADR-0074, ADR-0049, and the claims group twice across two models): no Blocker. The earlier note's pointer to a batch-wide table "in the pull request body" named a body that does not exist yet; the batch-wide facts are: the first audit ran 19 rule groups at `23252ae` with the critical claims group three times across two models, neither audit found a Blocker, and the pull request body will repeat this once opened.

### 2026-10-09 — closed

Done. Fresh-context two-axis review at `16e6aba`; `/ad-audit` of 19 rule groups at `23252ae`; re-audit of six groups at `ae477da`; delta re-audit of the guidelines and claims groups at `548b44f`. None found a Blocker. The delta re-audit's last findings: ADR-0074 still said the line is omitted when no state file names a version (minor, fixed: omitted only when no state file exists); red-first claims lacked retained output (minor, fixed: the runner lines are quoted below where this task claims red first); the batch-wide findings table is in the pull request body. Gate `npm run verify` exit 0, 1396 of 1396.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
