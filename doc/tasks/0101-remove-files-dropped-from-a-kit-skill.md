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

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
