# Task `0124`: Close the formatting gap and deepen the install flow

**Status:** in-progress
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

- [x] Every executable script under `src/` is checked by the formatting gate, and the one formatting commit is skipped by blame.
- [ ] `init` and `update` share one tested library module for root-doc confirmation, the exclude offer and the report, with prompts injected and no prompting in the library; their output is unchanged (existing tests).
- [ ] GUIDELINES and ARCHITECTURE state that decision cores are pure and `src/lib` does file and git I/O through injected seams, never prompting or printing.
- [ ] The voice-profile and template validators are split into per-sub-object validators with identical messages and order, after a coverage run fills any untested branch.

## Plan

- [x] PR: formatting gate.
- [ ] PR: `src/lib/install-flow.js` (with `kit-exclude` moved from `src/commands/`) and docs.
- [ ] PR: validator split.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — planned

Planned from the kit audit of 2026-10-15 after a read-only verification of
its claims against the code. The owner approved doing every remaining
package on 2026-10-15.

### 2026-10-15 — formatting gate

Adding `src/**/*.mjs` to `format:check` turned it red (exit 1, 56 files);
`prettier --write` turned it green; `npm run verify` 1410 of 1410. The
format commit is fc1699b988d4723476fed4ec4c9751af70a563f8, listed in `.git-blame-ignore-revs`.
