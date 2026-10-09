# Task `0113`: Read the leak denylist from every worktree

**Status:** in-progress
**Created:** 2026-10-08
**Scope ref:** doc/adr/0033-house-ip-leak-guard.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The pre-commit leak-guard (ADR-0033) reads its markers from the gitignored
`.agentic/leak-denylist.txt` at the repository root of the working tree
(`src/leak-guard.js`, `DENYLIST_REL` joined to `repoRoot`). A gitignored file
is not shared by linked worktrees, so a commit made from a linked worktree
runs the guard with no markers and passes. On 2026-10-08 the company's name,
already a marker in the main checkout's denylist, reached three committed
files of this public repository through commits made from a linked worktree
(Task 0110 Notes, "company name redacted").

## Acceptance Criteria

- [x] In a linked worktree without its own denylist, the guard reads the main worktree's `.agentic/leak-denylist.txt` (resolved through `git rev-parse --git-common-dir`) and blocks a staged marker.
- [x] A worktree's own denylist, when present, is used together with the main worktree's, never silently instead of it.
- [x] When no denylist is found anywhere, the guard says so once instead of passing silently.
- [x] Tests cover a linked worktree with and without its own list, run with `GIT_DIR` stripped as AGENTS.md requires.

## Plan

- [x] Red, then green (`/ad-tdd`) in `test/leak-guard.test.js` on a fixture repository with a linked worktree.
- [x] Update ADR-0033's addendum or Notes only if the lookup rule changes what it binds; `npm run verify`; `/ad-review`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-08

Proposed after the company-name leak. As a stopgap, the linked worktree used
in this session links the main checkout's denylist.

### 2026-10-08 — plan approved

The owner approved starting the kit hygiene batch with this task ("ok").

### 2026-10-08 — built and reviewed

`src/leak-guard.js` reads the denylist from the working tree's root and the
main worktree's root (`git rev-parse --git-common-dir`, resolved against the
root, a path ending in `.git` on either slash) and applies both lists; with
none found it prints one line. Three regression tests in
`test/leak-guard.test.js` (a linked worktree reads the main list; its own list
adds and never replaces, proven by a mutation that kept only the first list
and turned that test red; the no-list warning). Live check in this session's
linked worktree with its stopgap link removed: a staged file naming a real
marker was blocked (exit 1), then unstaged and deleted.

`/ad-review`, both axes with fresh context: no Blockers. Accepted and fixed:
Standards, `--path-format` needs git 2.31 and its failure would have blocked
every commit; the lookup now uses plain `--git-common-dir` and falls back to
the working tree's own list on any error. Both axes, ADR-0033 still bound the
local list alone and called a missing list a no-op; its addendum of
2026-10-08 and a PROJECTION row record the change. Spec, the tests did not
strip `GIT_DIR`; the new tests now run git and `main()` with the git
variables removed. Notes kept as is: a bare repository's worktree reads only
its own list (stated in the addendum); a symlinked temporary directory can
read one file twice, harmless since the patterns are de-duplicated; the
warning prints on every commit in a clone without a list, which is the
intended signal.

### 2026-10-09 — batch review

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes, verdicts at `.agentic/reviews/20261008T231440Z-commit-range-batch-verdicts.md`), no Blocker. Fixed: the same-root check compared a forward-slash `--show-toplevel` path with a `resolve`d one, which never matches on Windows; both sides are resolved now. The ADR-0033 addendum names the submodule and `--separate-git-dir` layouts that read only their own list, and the dead Consequences line is marked in place.

### 2026-10-09 — review and audit record

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes) and the `/ad-audit` of `origin/main..23252ae` (19 rule groups, the critical claims group run three times across two models; gate `npm run verify` exit 0, 1394 of 1394). Neither found a Blocker. Batch-wide findings and the full table are in the pull request body. Findings for this task, as severity, finding, disposition:

- Review Note: the same-root check never matched on Windows. Fixed in 6a26b1d. The forward-slash behaviour is the reviewer's reading, not observed here; the remote Windows CI leg is its evidence.
- Review Note: submodule and `--separate-git-dir` layouts read only their own list. Fixed: the ADR-0033 addendum names them.
- Review Note: no changelog entry. Fixed.
- Audit minor: a failing `--git-common-dir` falls back silently. Accepted: it runs only after `--show-toplevel` succeeded in the same repository, and the none-found line still fires.
- Audit minor: the live check in the linked worktree ("blocked, exit 1") is a session observation; read it as author-observed.
- The earlier "built and reviewed" entry reviewed the task's own commits before 16e6aba; its findings are the two it names.

Falsification lane on `23252ae` (scratch worktree, one mutation at a time, restored after each; log `.agentic/reviews/20261009T065600Z-audit-falsification.log`): keeping only the first list turned 2 of 3 tests red; comparing unresolved roots survived on macOS, as expected, since only Windows separators differ.

### 2026-10-09 — re-audit corrections

Re-audit of six groups at `ae477da` (architecture, guidelines, glossary, ADR-0074, ADR-0049, and the claims group twice across two models): no Blocker. The earlier note's pointer to a batch-wide table "in the pull request body" named a body that does not exist yet; the batch-wide facts are: the first audit ran 19 rule groups at `23252ae` with the critical claims group three times across two models, neither audit found a Blocker, and the pull request body will repeat this once opened.

- Re-audit minor (CV.1): the commit message of 6a26b1d and the first line of this task's record state the Windows forward-slash behaviour as fact; it is the reviewer's reading, not observed here. The resolved comparison is harmless on every platform, and the remote Windows CI leg of the pull request is its evidence.
- Re-audit minor (GUIDELINES 2.2/2.5): the silent fallback when `--git-common-dir` fails contradicts the rule; the earlier "Accepted" is withdrawn. Fixed: the guard says on stderr that it could not locate the main worktree. Regression test with a git shim (skipped on Windows, where the shim is a POSIX script), red first; removing the message turned 1 of 4 red (falsification log, round 2).

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
