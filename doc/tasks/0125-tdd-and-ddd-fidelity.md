# Task `0125`: Keep TDD and the domain glossary faithful to their sources

**Status:** in-progress
**Created:** 2026-10-15
**Scope ref:** WORKFLOW.md §16, §1
**Evidence ref:** Kent Beck, Canon TDD; Evans, DDD Reference
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`ad-tdd` and WORKFLOW §16 refactor only after every planned test passes, where Canon TDD refactors after each green and adds discovered tests to the list; `ad-domain` promises a glossary drift check that `ad-drift` does not run; 46 tests named for behaviour only match prose; CONTEXT.md breaks its own ordering and length rules.

## Acceptance Criteria

- [x] `ad-tdd` (both hosts) and WORKFLOW §16 refactor inside each cycle, treat duplication as a hint, and add discovered tests to the list (tests); the "survive renames" line and the `_Avoid_` attribution are corrected.
- [ ] `ad-drift` reports glossary drift: multi-word or backticked aliases used in tracked code and canonical terms used nowhere, reading per-context files of a CONTEXT-MAP (tests through the CLI); it stays advisory.
- [x] Tests that only match a skill's text say so in their names, and GUIDELINES names that tier.
- [x] `ad-domain` drops the alphabetical rule and allows a lead sentence plus up to two sentences of scope; the four longest CONTEXT.md definitions are trimmed.

## Plan

- [x] PR: test renames.
- [ ] PR (with the catalog text diet): TDD and glossary text.
- [ ] PR: glossary drift check.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15. CONTEXT.md stays one bounded context.

### 2026-10-15 — static contract names

The planner's classifier gave 49 candidates; 3 run code (an `installSkills`
unit test, a plugin rendering test, the tag matcher) and keep their names.
The other 46 now start `static contract:` (after `regression:` where
present); GUIDELINES §9.5a names the tier.

### 2026-10-15 — Canon TDD and glossary rules

A static-contract test for both `ad-tdd` hosts and WORKFLOW §16 went red,
then green after the loop gained an optional refactor on green, duplication
as a hint and the growing test list, with Step 4 renamed close-out. The
"survive renames" line now says a changed term means renamed tests, and §1
marks `_Avoid_` as a kit convention. `ad-domain` groups terms by relation
and allows a lead sentence plus two of scope; the five longest CONTEXT.md
definitions were trimmed (the "Review verdicts" one now names `Base-SHA:`).
The changed WORKFLOW.md hash joins the legacy-migration list, as the
current development copy, so the migration test keeps recognizing it.
