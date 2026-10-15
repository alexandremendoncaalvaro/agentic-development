# Task `0125`: Keep TDD and the domain glossary faithful to their sources

**Status:** proposed
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

- [ ] `ad-tdd` (both hosts) and WORKFLOW §16 refactor inside each cycle, treat duplication as a hint, and add discovered tests to the list (tests); the "survive renames" line and the `_Avoid_` attribution are corrected.
- [ ] `ad-drift` reports glossary drift: multi-word or backticked aliases used in tracked code and canonical terms used nowhere, reading per-context files of a CONTEXT-MAP (tests through the CLI); it stays advisory.
- [ ] The 46 prose-only tests are renamed "<skill> SKILL.md declares X"; GUIDELINES §9 names this static-contract tier.
- [ ] `ad-domain` drops the alphabetical rule and allows a lead sentence plus up to two sentences of scope; the four longest CONTEXT.md definitions are trimmed.

## Plan

- [ ] PR: test renames.
- [ ] PR (with the catalog text diet): TDD and glossary text.
- [ ] PR: glossary drift check.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15. CONTEXT.md stays one bounded context.
