# Task `0091`: Restate the file-size ceiling as a review threshold

**Status:** done
**Created:** 2026-09-29
**Scope ref:** GUIDELINES.md §3.3 (Size Guidelines)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

GUIDELINES.md §3.3 called ~400 lines a "hard ceiling" for files. Nothing
enforces it (the ESLint config carries no `max-lines` rule), and the tree does
not follow it: on 2026-09-29, 12 of 29 `test/*.test.js` files and 13 `.js`
and `.mjs` files under `src/` exceeded 400 lines (counted per file with
`wc -l`; largest `test/skill-scripts.test.js` at 4631, `src/lib/install.js` at
540, each bundled `template-store.mjs` at 683). The rule has been applied
where a cohesive seam existed: `eval/lib/replay.mjs` was split at 526 lines
(Task 0048) and `eval/lib/capture-trial.mjs` extracted from `live.mjs`
(Task 0085). For `test/` and the larger `src/` files it is flagged by fresh
audit reviewers and refuted as repository idiom: Task 0084 (Notes, 2026-09-21
re-audit) and Task 0085 (audit disposition, `test/eval-live.test.js`). A
"hard" limit that is refuted more often than applied costs review time and
teaches reviewers to discount the section.

A `test/`-only exemption was considered and rejected: `src/` breaks the
ceiling too, so it would leave the section untrue. Splitting the 25 files was
rejected: no defect has been traced to their size.

## Acceptance Criteria

- [x] §3.3 states the file limit as a review threshold whose crossing needs a stated reason, with a split preferred when a cohesive seam exists.
- [x] §3.3 records why it is a heuristic and not a gate, so a reviewer does not raise a line count alone as a defect.
- [x] The function-size and complexity lines of §3.3 are unchanged.
- [x] The kit's downstream `guidelines-template.md` is unchanged (its "hard ceiling negotiable per language idiom" wording already fits).
- [x] `npm run verify` passes through the hook runner.

## Plan

- [x] Edit §3.3; append the rationale paragraph.
- [x] `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-09-29

Opened from the `/ad-level-up` pass (item C2); the owner approved proceeding.
Not a rule-set line: the convention lives in this repository's binding
GUIDELINES.md. HITL because it changes a repository standard; the owner
approves the wording on the pull request. GUIDELINES.md is not in
`package.json#files`, so no `CHANGELOG.md` entry.

### 2026-09-29 — Built, reviewed, landed

§3.3 edited and the rationale appended. Fresh two-axis review (handoffs and
verdicts at `.agentic/reviews/2026-09-29T20-26-27Z-working-tree-*.md`,
machine-local): no Blocker on either axis. Both raised the same Concern,
applied: the test count was 12 of 29, not 13 (the first count included the
`wc -l` total line), so the total is 25, not 26. Standards also found the
Context overstated "never applied": the rule was applied twice in `eval/`
(Tasks 0048 and 0085), and the Context now says so. Left open, not claimed: the
function line's "100 hard" is equally unenforced; this task kept it unchanged
by its own criterion, and it becomes a follow-up only if a review raises it.
`npm run verify` through `scripts/hook-npm-test.js` passes.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
