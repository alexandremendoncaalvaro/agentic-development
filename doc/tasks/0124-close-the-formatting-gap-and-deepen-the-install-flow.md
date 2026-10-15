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
- [x] `init` and `update` share one tested library module for root-doc confirmation, the exclude offer and the report, with prompts injected and no prompting in the library; their output is unchanged (existing tests).
- [x] GUIDELINES and ARCHITECTURE state that decision cores are pure and `src/lib` does file and git I/O through injected seams, never prompting or printing.
- [ ] The voice-profile and template validators are split into per-sub-object validators with identical messages and order, after a coverage run fills any untested branch.

## Plan

- [x] PR: formatting gate.
- [x] PR: `src/lib/install-flow.js` (with `kit-exclude` moved from `src/commands/`) and docs.
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

### 2026-10-15 — install flow

Five tests in `test/install-flow.test.js` went red (module missing), then
green: the root-doc confirmation matrix (tracked and untracked, attended and
unattended, `--force` and `--force-root-doc`, init's regenerate and update's
gated diverged section), the exclude offer (note when unattended, default
yes when asked, written on yes) and the report. `src/commands/kit-exclude.js`
moved into `src/lib/install-flow.js` with the prompt and the warning
injected; init and update now share it, and their integration tests pass
unchanged. One difference by design: an action type init did not know now
prints `?` instead of `undefined`, as update already did. GUIDELINES §1.1,
§2.4 and §9.3, ARCHITECTURE and AGENTS now say the library's decision cores
are pure and its file and git I/O goes through injected paths.

### 2026-10-15 — review of 2a7876f

Two-axis review, no blocker. Concern, the new prompt split a doc comment from
`trackedRootDocSkipNotice`: fixed, and that comment no longer says the guard
stays in each command. Notes accepted: init prints `?` for an unknown action
type, as update does; the existing exclude test adapted to the injected
`ask` and `warn`.
