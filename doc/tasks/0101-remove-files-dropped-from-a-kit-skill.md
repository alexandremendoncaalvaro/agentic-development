# Task `0101`: Remove files dropped from a kit skill on update

**Status:** in-progress
**Created:** 2026-10-07
**Scope ref:** ARCHITECTURE.md (Skill installation pattern: `removeOrphanSkills`)
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The installer removes whole skills that leave the kit but leaves a single
file that a kit skill dropped in a consumer's existing install: Task 0090
deleted `spike-adr-template.md` from `/ad-spike`, and consumers keep the stale
copy. The state file already records every installed file with its source
digest, so an unchanged file the kit no longer ships can be removed under the
same unchanged-file rule `removeOrphanSkills` applies.

## Acceptance Criteria

- [x] `update` removes a file recorded in state that the kit no longer ships, when the file is unchanged from its recorded digest.
- [x] A user-edited dropped file is kept and reported, never deleted silently.
- [x] Tests in `test/update.test.js` cover both cases.

## Plan

- [x] Red in `test/update.test.js`.
- [x] Green in `src/lib/install.js`.
- [ ] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Routed from the `/ad-level-up` curation of 2026-10-07, which the owner approved in chat; it supersedes the unmerged task-0094 draft for this item.

### 2026-10-08 — plan approved

The owner approved the kit hygiene batch ("ok"), built in one branch with
Tasks 0112 and 0113.

### 2026-10-08 — built

`installSkills` now compares each skill's previously recorded files with the
files it ships: a dropped file that still matches its recorded digest is
removed (`-`), an edited one is kept and reported as `dropped-kept` (`!`),
and both leave the state. `update` and `init` both print the two actions;
`init` lacked the symbols and would have printed "undefined", caught by a
regression test that spawns the CLI. Three regression tests in
`test/update.test.js`; flipping the digest comparison turned both
`installSkills` tests red, and removing `init`'s symbols turned the CLI test
red. The fix needs the dropped file in the previous state, and each update
rewrites the state with shipped files only, so a file dropped before this fix
is no longer recorded and stays. The owner's user-scope Claude Code install
still had `ad-spike/references/spike-adr-template.md`, unrecorded and
byte-identical to the kit's copy before 86ab36d dropped it; it was deleted
by hand on 2026-10-08. Other consumers with such a leftover keep it until a
named migration removes it by fingerprint, which is not part of this task.

### 2026-10-09 — batch review

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes, verdicts at `.agentic/reviews/20261008T231440Z-commit-range-batch-verdicts.md`), no Blocker. Fixed: the dropped-file pass ran per skill, so a file that moved to another skill was removed or falsely reported; it now runs once per agent after every skill is written, against the paths all skills ship (regression test, red first). Fixed: a recorded path that is not a regular file, or resolves outside the install root, is skipped instead of aborting the update or unlinking outside it.

### 2026-10-09 — review and audit record

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes) and the `/ad-audit` of `origin/main..23252ae` (19 rule groups, the critical claims group run three times across two models; gate `npm run verify` exit 0, 1394 of 1394). Neither found a Blocker. Batch-wide findings and the full table are in the pull request body. Findings for this task, as severity, finding, disposition:

- Review Concern: the dropped-file pass ran per skill, so a file moved to another skill was removed or falsely reported. Fixed in d8b1d23.
- Review Note: a recorded path that is a directory or escapes the root could abort or unlink outside. Fixed in d8b1d23.
- Review Note: the `init` symbols are outside the criteria. Accepted as in scope (an `undefined` print).
- Review Note: files dropped before this fix are no longer in state and stay. Accepted, as the criterion is limited to recorded files.
- Audit major: ARCHITECTURE.md's Skill installation pattern did not say `update` removes dropped files. Fixed.
- Audit minor: `installSkills` past the ~100-line threshold. Partly fixed: the removal pass is now `removeDroppedFiles`, leaving `installSkills` at 127 lines against 123 on `origin/main`; the rest is the per-file decision loop, one cohesive seam.
- Audit minor: a non-interactive `update` deletes an unchanged kit file that git tracks. Accepted: the installer already rewrites unchanged tracked kit files non-interactively, and ADR-0051 scopes its refusal to the root doc.
- Audit nit: the name `abs`. Fixed (`installedPath`).
- Audit nit: the containment check is lexical. Accepted: the state file is local and trusted.
- Audit minor: the hand deletion of `spike-adr-template.md` is a machine-local observation; read it as author-observed.

Falsification lane on `23252ae` (scratch worktree, one mutation at a time, restored after each; log `.agentic/reviews/20261009T065600Z-audit-falsification.log`): inverting the digest comparison turned 3 of 4 tests red; dropping the shipped-path check turned 1 of 4 red.

### 2026-10-09 — re-audit corrections

Re-audit of six groups at `ae477da` (architecture, guidelines, glossary, ADR-0074, ADR-0049, and the claims group twice across two models): no Blocker. The earlier note's pointer to a batch-wide table "in the pull request body" named a body that does not exist yet; the batch-wide facts are: the first audit ran 19 rule groups at `23252ae` with the critical claims group three times across two models, neither audit found a Blocker, and the pull request body will repeat this once opened.

- Re-audit minor (CV.8): "127 lines against 123" mixed counting bases. Measured inclusively from the `export async function` line to its closing brace, `installSkills` is 128 lines at this branch's head against 123 on `origin/main`.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
