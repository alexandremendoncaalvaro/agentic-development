# task-0034: Installer detects a shared write target (ADR-0049)

**Status:** in-progress
**Date:** 2026-08-06

## Goal

Implement [ADR-0049](../adr/0049-installer-shared-write-target-detection.md). Today `agentic init` appends a managed section to a project's root `AGENTS.md` and copies the skill tree into the repo without knowing whether either is shared with other people, and without knowing the practitioner already has the kit installed at the user level where it serves every repo. The non-interactive path hard-codes consent for the root-doc write, so the write that reached an employer's tracked `AGENTS.md` printed no prompt at all and the cleanup was manual. This task makes the installer establish both facts before writing and refuse to guess when it cannot ask.

## Checklist

- [x] Read-only tracked-path probe (`src/lib/git.js`): returns tracked / untracked / unknown. Unresolvable git — no repository, no binary — yields `unknown` and never throws; detection must not be able to fail an install.
- [ ] User-level install detection: resolve a user-level kit state file / skills directory and report it to the caller. Read-only.
- [x] Interactive root-doc confirmation in `init.js` states that the file is version-controlled and that the section will be visible to everyone sharing the repository, and defaults to no when the path is tracked. The decision lives in the pure `rootDocAppendPrompt` in `src/lib/rootdoc.js` and is unit-tested; the suite has no TTY and cannot drive the prompt.
- [ ] Same interactive confirmation in `update.js`, reusing `rootDocAppendPrompt`.
- [x] `init.js` non-interactive `confirmAppend` refuses a tracked root doc: skips that write, states the reason on stderr, completes the rest of the install.
- [x] `init.js` non-interactive `confirmReplace`: `init.js` never passed the callback at all, so `updateRootDoc`'s default — replace — silently rewrote a stale managed section in a tracked root doc. Both write paths now share one decision helper.
- [ ] `update.js` equivalents for both callbacks.
- [x] Override flag on `init` — `--force-root-doc`, boolean, surfaced in `--help`, named separately from `update`'s existing `--force` because that one means "overwrite user-edited files on conflict". The release-blocking gap is closed for `init`.
- [ ] Same override on `update`, to land together with `update.js`'s refusal — the flag would be inert there today, so `--help` would be advertising a no-op.
- [ ] `.git/info/exclude` writer, offered when kit files land untracked in a repository: entries enumerate installed files by path, a directory-level entry is never emitted, existing entries are not duplicated, `.gitignore` is never touched.
- [ ] Install summary reports when a user-level install already covers the skills being written locally, at the point the operator can still decline them.
- [x] Tests for the first slice: non-interactive refusal on a tracked root doc, and `untracked`-inside-a-repository still appends. The pre-existing suite covers `unknown` incidentally, since its scratch directories are not repositories.
- [x] Test that the override flag reaches the write the refusal skips, driven through both failure modes (absent flag, then wrong behaviour).
- [ ] Remaining tests: exclude writer emits filenames rather than directories and is idempotent across re-runs; a mixed-ownership agent directory keeps its tracked file visible to git.
- [x] Regression pin for the originating incident: a fixture repository with a tracked `AGENTS.md` where `init -y` leaves that file unmodified. This is the same test as the first-slice refusal above — the incident and the acceptance criterion are one assertion, not two.
- [x] `CHANGELOG.md` `[Unreleased]` entry per the ADR-0048 changelog gate, kept current on each slice rather than written once at the end.
- [ ] `AGENTS.md` Gotchas and `ARCHITECTURE.md` patterns updated for the new installer behaviour.
- [ ] `npm test` green at the end of the task; `node bin/agentic.js update --yes` only if skill source changed (it has not — this task is installer code); `/ad-review main..HEAD` before the PR.

## Notes

### 2026-08-06

Registered from ADR-0049, whose evidence was re-derived at source rather than inherited. A fixture run of `init --agent claude-code -y` against a tracked `AGENTS.md` wrote the managed section with no prompt and left 33 untracked kit files with no exclusion. Separately, the practitioner's machine already carries the full `ad-*` set at `~/.claude/skills/` with its own state file, so every skill file written into the employer repository duplicated one already in service.

The obvious rule — never write into a tracked file the installer did not create — is rejected in the ADR: this repository's own managed section is committed deliberately, as a personal project's would be. Consent, not tracked-ness, is the axis.

Directory-level exclusion is prohibited rather than discouraged. In the incident repository a team-authored subagent file is tracked in the same `.claude/agents/` directory where the kit installs its three bundled reviewers, so a directory-level entry would hide a team-owned file from git.

First slice landed: the probe plus the non-interactive refusal, chosen as the tracer bullet because it is the incident itself. The failing test reproduced the incident before the fix (the managed section appended to a committed `AGENTS.md`), so the regression is pinned rather than described.

Two findings from the slice, both new:

- `init.js` never passes `confirmReplace` to `updateRootDoc`, so the library default — replace — applies. An existing stale managed section in a tracked root doc is therefore still rewritten unattended. The refusal landed here covers the append path only; the replace path is a separate checklist item now.
- Nothing in the suite exercised a git repository before this slice. Every scratch directory is a bare temp dir, which resolves to `unknown`, so `untracked` and `tracked` were both uncovered. `mkGitScratch` in `test/init.test.js` is the new fixture shape for the rest of the task.

The probe is fail-open by design and diverges from `src/leak-guard.js`, which is fail-closed on the same git surface. The divergence is deliberate and documented at the helper: a guard that cannot resolve the repository must block, an installer that cannot resolve it must still install.
