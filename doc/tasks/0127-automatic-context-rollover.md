# Task `0127`: Roll the context over with a handoff instead of a compaction

**Status:** in-progress
**Created:** 2026-11-21
**Scope ref:** doc/adr/0098-roll-the-context-over-with-a-handoff.md
**Evidence ref:** doc/research/0047-ground-automatic-context-rollover.md
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

The owner asked on 2026-11-21 that the point where automatic compaction happens today become a handoff, a clear and a resume in the same session, working headless too, with `ad-handoff` updated to that form and the kit update published if it succeeds. Task 0115 delivered the clear-and-continue only behind a button press, off by default, and its file lookup assumes POSIX paths, so it does nothing on Windows and nothing in `claude -p`.

## Acceptance Criteria

- [x] Near the auto-compact point the `agentic-session` plugin, with no keypress, asks for a handoff, waits for the whole file, runs `/clear` and submits the resume prompt in the same window. It is on by default; the plugin option `autoHandoff` or `AGENTIC_AUTO_HANDOFF=off` turns it off. No hook blocks a tool call or a prompt.
- [x] The automatic handoff goes under the home directory (`<home>/.agentic/handoffs/`), with no POSIX `/tmp` and no `TMPDIR`; proven on Windows 11.
- [x] It works in `claude -p`: a long single turn is asked mid-turn, and the clear and resume are awaited inside the turn-end hook. What a long `-p` does at the limit without the cycle is measured and recorded.
- [x] `ad-handoff` has an automatic mode on both hosts: given or stable path, end marker, compact template, no question, no deletion; its "never auto-clear" line agrees with ADR-0098.
- [x] Unit tests cover the cycle's rules and failure cases; one real headless run shows `/clear` and the resume happening, with no compaction.
- [x] Pull request opened with the local gate green and `ad-review` without a Blocker.
- [x] Merged and released through the repository's release process, or the reason for not publishing recorded here.

## Plan

- [x] Spike the engine in `claude -p`; ground and record (GROUND-0047).
- [x] Pure rules in `hooks/auto.mjs`, wiring in `hooks/register.mjs`, test first.
- [x] Skill mode and template on both hosts; dogfood install refreshed.
- [x] Real headless runs; fix what they show; ADR-0098.
- [ ] Review, pull request, merge, release.

## Notes

### 2026-11-21 — built and proven headless

Three real runs of `claude -p` on Windows 11, Claude Code 2.1.327, shaped the design (GROUND-0047 E5 to E8). The first rolled over once, then a time-based rest let the engine compact and a stale file caused a needless second clear; the rest became "a session resumed already past the start point rests", and a main-loop compaction now drops the pending handoff. In the second the model refused the mid-turn request as a prompt injection; the plugin now adds a system-prompt section that vouches for the labelled request and bounds what it may ask. The third, on the final code with the start point at 55, rolled over three times with no compaction and ended with the task's answer and exit code 0.

Two task-0099 checkpoint tests were red on this machine on `main` too: the test's project sat under the operating system's temp directory, below a user-level kit install, so it was read as project scope. The test now builds its own home and project; without that the pre-push gate could not pass.

Limits recorded, not fixed here: the manual button's file lookup stays POSIX-only (task 0115); Codex, and Claude Code without the plugin, have the skill's `--auto` mode and the Stop nudge but nothing that clears; plain-text `-p` output was not measured, and the stream prints one result per turn, the `handoff written` turns included.

### 2026-11-21 — fresh-context review, both axes

`ad-review` on `origin/main..d8e9826` found no Blocker on either axis. Its Concerns and what was done with each:

- "a refused `/clear` triggers a fresh handoff on every later turn": fixed, a refused clear starts the ten-minute rest (test first).
- "no exclusion between the automatic cycle and the manual button flow": fixed, the mid-turn note is not added while a button press waits for its handoff (test first).
- "handoffs now persist in a permanent home directory with no cleanup": recorded as an accepted trade-off in ADR-0098 and stated in `CONTEXT.md`; no pruning, because deleting a file the owner may resume from is worse.
- "three binding docs now contradict ADR-0098": `ARCHITECTURE.md`, `CONTEXT.md` and `AGENTS.md` updated.
- "The README states a proven result the record does not support": reworded to headless proven, interactive unmeasured.
- "Each tier asks once" against note-then-prompt: ADR-0098 item 2 now says once per channel.
- Minimum builds unverified: ADR-0098 and the README say only 2.1.327 was measured.

Notes taken: the heading check now needs each heading on a line of its own; the wrong record reference in a comment is fixed; `on|true` is documented; the changelog warns that an installed plugin changes behaviour on update. Left open and recorded in ADR-0098: a per-session label, and the stream captures not kept in the repository (GROUND-0047 Limitations). The checkpoint script reading a user-level install above the temp directory as project scope is task 0128. Not verified: whether `$.fs.write` creates the missing parent directory in the refused-`Write` fallback; a failure there is caught, logged and clears nothing.

### 2026-11-21 — delta review of the fixes

`ad-review` on `d8e9826..e1bde87` found no Blocker and one Concern: "the button/auto exclusion works only when the clear-and-continue box is on". Fixed test first: every press now owns the handoff until its turn ends, box on or off, and the automatic cycle adds no note and submits no request meanwhile. `CONTEXT.md` no longer calls the automatic file ephemeral.

### 2026-11-21 — second delta review

`ad-review` on `e1bde87..d7ffc71` found no Blocker and confirmed the exclusion. Its Concern: "`state.pending` can now stay stuck for box-off users", which would leave the automatic cycle silent. Fixed test first: a subagent turn no longer takes the press, and the hold lasts ten minutes at most.

### 2026-11-21 — third delta review, clean

`ad-review` on `d7ffc71..a176b2c` found no Blocker and no Concern on either axis. Notes left as they are: the hold is ten minutes from the press and ten more from the start of the turn that takes it; a press that waits more than ten minutes behind a running turn is dropped, so a clear-and-continue asked with the box on is then not performed and no toast says so; the hold reuses the rest rule's constant. The local gate (`npm run verify`) is green on this state: 1684 tests pass.

The real headless run was repeated on this final code (`a176b2c`, start point 55, Windows 11, Claude Code 2.1.327): three rollovers, each a clear and a resume from its own file, no compaction, exit code 0 and the task's answer last.

### 2026-11-21 — merged, release not published

Merged as pull request #195 (merge commit `bffe105`), with the CI matrix green on Ubuntu and Windows for Node 22.13 and 24. The plugin ships from `main`, so its part is live for installed users.

The npm release was not published. `npm run release -- minor --dry-run` passes and would cut 1.7.0, but npm on this machine is not logged in (`npm whoami` answers `ENEEDAUTH`), and a headless agent cannot log in. No release commit, tag or release pull request was made, so nothing is half done. To finish: `npm login`, then `/ad-release minor` from a clean checkout of `main`. On Windows the release script needs `npm run release --script-shell <path to bash.exe> -- minor`, because `./scripts/release.sh` does not run under `cmd`.

The task stays `in-progress` until 1.7.0 is on npm.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
