# Task `0103`: Restate the function size limit as a review threshold

**Status:** done
**Created:** 2026-10-07
**Scope ref:** AGENTS.md (Code Style, pointing to GUIDELINES.md §3.3)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

GUIDELINES §3.3 calls the function limit "100 hard" while no tool enforces
it; Task 0091 already restated the file-size ceiling as a review threshold for
the same reason. A "hard" limit nothing checks teaches readers that hard
limits are optional.

## Acceptance Criteria

- [x] §3.3 states the function size as a review threshold, or a lint rule enforces it and the text says so.
- [x] `npm run verify` passes.

## Plan

- [x] Decide threshold text versus lint rule against Task 0091's precedent.
- [x] Edit §3.3; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Routed from the `/ad-level-up` curation of 2026-10-07, which the owner approved in chat; it supersedes the unmerged task-0094 draft for this item.

### 2026-10-08 — plan approved

The owner approved the kit hygiene batch ("ok"), built in one branch with
Tasks 0112 and 0113.

### 2026-10-08 — built

Text, not a lint rule, on Task 0091's precedent for the file ceiling:
GUIDELINES §3.3 now reads "~100 review threshold" with the same "states its
reason in review" wording. Left as is: `ad-guidelines`' consumer default "~50
lines target / 100 hard" is a value each project confirms or overrides when
it writes its own GUIDELINES and may enforce with a lint rule, so it is not
this repository asserting an unchecked limit.

### 2026-10-09 — review and audit record

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes) and the `/ad-audit` of `origin/main..23252ae` (19 rule groups, the critical claims group run three times across two models; gate `npm run verify` exit 0, 1394 of 1394). Neither found a Blocker. Batch-wide findings and the full table are in the pull request body. Findings for this task, as severity, finding, disposition:

- Review Note: no changelog entry. Accepted: GUIDELINES.md is not shipped.
- Audit nit: the "(Task 0103 ...)" reference was decoration. Fixed: removed.

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
