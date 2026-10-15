# Task `0124`: Close the formatting gap and deepen the install flow

**Status:** proposed
**Created:** 2026-10-15
**Scope ref:** GUIDELINES.md §2.4, §7; ARCHITECTURE.md
**Evidence ref:** kit audit lens 5
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

`format:check` misses the 84 `.mjs` skill scripts (56 fail); `initCommand` and `updateCommand` duplicate the root-doc, exclude and report flow; the docs call `src/lib` pure while it does file I/O; two skill-script validators run 180 to 280 lines.

## Acceptance Criteria

- [ ] `src/**/*.mjs` is in `format:check` and formatted in one commit listed in `.git-blame-ignore-revs`.
- [ ] `src/lib/install-flow.js` holds the shared root-doc confirmers, exclude offer and report formatting with prompts injected; `src/commands/kit-exclude.js` is gone; `init` and `update` output is unchanged (existing tests) and the new module has its own tests.
- [ ] GUIDELINES and ARCHITECTURE state that decision cores are pure and `src/lib` does file and git I/O through injected seams, never prompting or printing.
- [ ] `validateProfile` and `validateTemplate` are split into per-sub-object validators with identical messages and order, after a coverage run fills any untested branch.

## Plan

- [ ] PR: formatting gate.
- [ ] PR: install flow and docs.
- [ ] PR: validator split.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15.
