# Task `0119`: Load the Constitution's summary, not its full text

**Status:** in-progress
**Created:** 2026-10-15
**Scope ref:** doc/adr/0092-load-the-constitution-summary-not-its-full-text.md
**Evidence ref:** doc/research/0044-ground-review-economy-and-context-budget.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The kit audit of 2026-10-15 measured 104,210 bytes of always-loaded instructions per session in this repository on the owner's machine (GROUND-0044 C8), 55 KB of it the imported `WORKFLOW.md`, and found that Codex receives the import line instead of the text. The owner approved this package on 2026-10-15. The kit part is the installer's managed block; the machine part edits the owner's own rule files, which the owner commits.

## Acceptance Criteria

- [x] `configureGlobalConstitution` writes the TL;DR of the kit's `WORKFLOW.md` inline with a digest line and the full text's path, for both hosts.
- [x] It replaces the earlier import-only block and an unedited managed block, and still skips a hand-edited one.
- [ ] `npm run verify` green.
- [ ] Machine: `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md` carry the new block; Codex's `@` lines become an explicit read instruction; the company-repository composition moves to its own file, read only in that repository; the duplicated memory entries are removed. The always-loaded total is measured before and after, and a Codex session started after the change shows the summary text in its injected instructions.

## Plan

- [x] Tests first in `test/global-rules.test.js`; then `src/lib/global-rules.js`; `test/init.test.js` unchanged, its marker assertion still holds.
- [ ] After merge: apply on this machine, measure, report the diff of the owner's files for his commit.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-15 — plan approved, block built

The owner approved this plan and ADR-0092 on 2026-10-15. Three tests in
`test/global-rules.test.js` went red (the block still imported the whole
file), then green with `configureGlobalConstitution` taking a `kitRoot`
seam: the TL;DR inline, a digest line, the earlier import block and an
unedited summary block refreshed, a hand-edited block skipped.

### 2026-10-15 — applied on the owner's machine

Applied from the branch head after the audit, with `configureGlobalConstitution`
for both hosts: `updated` on the first run, `unchanged` on the second.

- Claude Code, a session in this repository: the always-loaded stack went
  from 104,210 bytes (GROUND-0044 C8) to 53,124 bytes
  (`wc -c ~/.claude/CLAUDE.md /Users/ale/dev/ales-workflow/AGENTS.ale.md
  ~/.claude/RTK.md <memory>/MEMORY.md AGENTS.md`); `WORKFLOW.md` is no longer
  imported.
- Codex: `~/.codex/AGENTS.md` went from 619 to 6,666 bytes, now holding the
  summary text; with this repository's `AGENTS.md` that is 31,066 bytes of
  auto-injected instructions, under the 32 KiB default with little room.
  Its `@` lines became an explicit read instruction for `AGENTS.ale.md` and
  `RTK.md`.
- The owner's files: the company-repository composition moved to
  its own overlay file in `/Users/ale/dev/ales-workflow/`, read only in that
  repository, with the company AI-service documentation rule from
  `~/.claude/CLAUDE.md`; the "never `gh auth switch`" rule moved into both
  global files; two memory entries that repeated those rules were removed.
  The owner commits `ales-workflow`.
- Open: no Codex session has been observed after the change. The local Codex
  CLI under mise is broken (its package files are missing), so the check
  waits for the owner's next Codex session: its rollout file should contain
  "Context is the product" and no `@/Users/ale/.agentic/kit/WORKFLOW.md` line.
