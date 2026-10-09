# Task `0099`: Show the installed kit version at the checkpoint

**Status:** done
**Created:** 2026-10-07
**Scope ref:** doc/adr/0074-user-prompt-submit-workflow-checkpoint-hook.md
**Evidence ref:**
**Owner:** Alexandre Alvaro
**Execution:** AFK
**Spec ref:**
**Board ref:**

## Context

A skill copy installed from an older kit silently runs older steps. Task
0083 recorded `/ad-review` skipping verdict persistence on a machine whose
installed copy predated it, and on 2026-10-07 the global `ad-audit` copy
lacked the run-the-gate-once step merged in pull request 154. The agent has
no signal that its installed kit is stale. The workflow checkpoint already
reaches the model every prompt; naming the installed kit version there, and
whether it lags the published one when that is cheaply knowable offline,
makes the gap visible.

## Acceptance Criteria

- [x] The checkpoint names the kit version recorded in the installed state file it can resolve, and says nothing extra when none is found.
- [x] The hook stays offline, exit 0, and within its existing size cap; no network call is added.
- [x] A test covers the found and not-found cases.
- [x] ADR-0074 gains an addendum or a short ADR records the change, since it alters the checkpoint's static content.

## Plan

- [x] Ground: where the installed state lives per scope (`src/lib/state.js`).
- [x] Red, then green in `test/skill-scripts.test.js` and the script.
- [x] `CHANGELOG.md`; `/ad-review`; `/ad-commit`.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-10-07

Routed from the `/ad-level-up` curation of 2026-10-07, which the owner approved in chat; it supersedes the unmerged task-0094 draft for this item.

### 2026-10-08 — plan approved

The owner approved the kit hygiene batch ("ok"), built in one branch with
Tasks 0112 and 0113.

### 2026-10-08 — built

`workflow-checkpoint.mjs` (both hosts, byte-identical) appends
"Installed agentic kit: <version> (<scope> scope)." after its fixed text,
reading `agentic-state.json` under the event's `cwd` (`.claude/`, then
`.agents/`) before the home directory, as the installer's scopes resolve; no
network call, exit 0 and the kill switch unchanged, the line omitted when no
state names a version. Three regression tests in `test/skill-scripts.test.js`
(project wins, user fallback, nothing found), two red before the change; the
900-character cap holds. ADR-0074's addendum and its PROJECTION row record
that the content is no longer wholly static; `ad-hooks` documents the line.

### 2026-10-09 — batch review

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes, verdicts at `.agentic/reviews/20261008T231440Z-commit-range-batch-verdicts.md`), no Blocker. Fixed: the project install was read only at the session's exact directory; the checkpoint now walks up to the nearest project install, stopping below the home directory so the user install is never named as a project one (two regression tests; removing the home stop turned one red). Fixed: a state file in a cloned repository is untrusted, so a version that is not version-shaped (`^[0-9A-Za-z.+-]{1,32}$`) is left out (regression test with a multi-line value). Kept: `.claude` is read before `.agents`; both record the same kit version in a dual install.

### 2026-10-09 — review and audit record

Fresh-context review of `origin/main..16e6aba` (Standards and Spec axes) and the `/ad-audit` of `origin/main..23252ae` (19 rule groups, the critical claims group run three times across two models; gate `npm run verify` exit 0, 1394 of 1394). Neither found a Blocker. Batch-wide findings and the full table are in the pull request body. Findings for this task, as severity, finding, disposition:

- Review Concern: the recorded version reached model context unvalidated. Fixed in 0ebed99 (version-shaped values only).
- Review Concern (both axes): the project install was read only at the exact `cwd`. Fixed in 0ebed99 (walk up, stop below home).
- Review Note: `isEnabled` reflowed. Accepted: Prettier formatting, no behaviour change.
- Review Note: `.claude` is read before `.agents`. Accepted: both record the same kit version in a dual install.
- Review Note: ADR-0074's dead stanza not marked. Fixed in 23252ae.
- Audit minor: the ADR-0074 addendum still said `cwd` only. Fixed: it names the walk-up, the home stop and the version shape.
- Audit minor: an unreadable state file is swallowed. Accepted: ADR-0074 makes the checkpoint fail silent and the line optional; an error marker in model context would be noise.
- Audit minor: the lookup repeats the installer's. Accepted: a skill script cannot import `src/lib`, and ADR-0057 decision 3 allows a per-skill copy.
- Audit minor: CONTEXT.md called the checkpoint static, and PROJECTION.md left 0074 out of the self-amendment list. Fixed.

Falsification lane on `23252ae` (scratch worktree, one mutation at a time, restored after each; log `.agentic/reviews/20261009T065600Z-audit-falsification.log`): removing the home stop turned 1 of 6 tests red; accepting any string as a version turned 1 of 6 red.

### 2026-10-09 — re-audit corrections

Re-audit of six groups at `ae477da` (architecture, guidelines, glossary, ADR-0074, ADR-0049, and the claims group twice across two models): no Blocker. The earlier note's pointer to a batch-wide table "in the pull request body" named a body that does not exist yet; the batch-wide facts are: the first audit ran 19 rule groups at `23252ae` with the critical claims group three times across two models, neither audit found a Blocker, and the pull request body will repeat this once opened.

- Re-audit minor (GUIDELINES 2.2): swallowing an unreadable state file contradicts the rule that a content-reading probe surfaces its failure; the earlier "Accepted" is withdrawn. Fixed: the checkpoint now prints "unknown" with the reason (unreadable, invalid JSON, or no version-shaped value) and never echoes the value. Two regression tests, red first; turning invalid JSON or a bad value back into "absent" turned 1 of 7 red each (falsification log, round 2).

### 2026-10-09 — closed

Done. Fresh-context two-axis review at `16e6aba`; `/ad-audit` of 19 rule groups at `23252ae`; re-audit of six groups at `ae477da`; delta re-audit of the guidelines and claims groups at `548b44f`. None found a Blocker. The delta re-audit's last findings: ADR-0074 still said the line is omitted when no state file names a version (minor, fixed: omitted only when no state file exists); red-first claims lacked retained output (minor, fixed: the runner lines are quoted below where this task claims red first); the batch-wide findings table is in the pull request body. Gate `npm run verify` exit 0, 1396 of 1396.

Red first, as the runner printed before each fix: before 0ebed99, `not ok 4 - ... finds the project install from a subdirectory` and `not ok 5 - ... drops a version that is not version-shaped` (`# fail 2`); before 4fb69ba, `not ok 6 - ... never echoes a value that is not version-shaped` and `not ok 7 - ... says when the state file is unreadable` (`# fail 2`). The earlier "two regression tests" for 4fb69ba means one new test and one rewritten (nit, corrected here).

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
