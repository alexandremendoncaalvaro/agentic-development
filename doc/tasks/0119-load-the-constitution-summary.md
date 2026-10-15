# Task `0119`: Load the Constitution's summary, not its full text

**Status:** proposed
**Created:** 2026-10-15
**Scope ref:** doc/adr/0092-load-the-constitution-summary-not-its-full-text.md
**Evidence ref:** doc/research/0044-ground-review-economy-and-context-budget.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit audit of 2026-10-15 measured about 104 KB of always-loaded instructions per session on the owner's machine, 55 KB of it the imported `WORKFLOW.md`, and found that Codex receives the import line instead of the text. The owner approved this package on 2026-10-15. The kit part is the installer's managed block; the machine part edits the owner's own rule files, which the owner commits.

## Acceptance Criteria

- [ ] `configureGlobalConstitution` writes the TL;DR of the kit's `WORKFLOW.md` inline with a digest line and the full text's path, for both hosts.
- [ ] It replaces the earlier import-only block and an unedited managed block, and still skips a hand-edited one.
- [ ] `npm run verify` green.
- [ ] Machine: `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md` carry the new block; Codex's `@` lines become an explicit read instruction; the company-repository composition moves to its own file, read only in that repository; the duplicated memory entries are removed. The always-loaded total is measured before and after.

## Plan

- [ ] Tests first in `test/global-rules.test.js`; then `src/lib/global-rules.js`; `test/init.test.js` expectation.
- [ ] After merge: apply on this machine, measure, report the diff of the owner's files for his commit.

## Notes

Append-only log. Date each entry. Never rewrite past entries.
