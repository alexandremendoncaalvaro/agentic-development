# task-0035: Installer detects a shared write target (ADR-0050)

**Status:** in-progress
**Date:** 2026-08-06

## Goal

Implement [ADR-0050](../adr/0050-installer-shared-write-target-detection.md). Today `agentic init` appends a managed section to a project's root `AGENTS.md` and copies the skill tree into the repo without knowing whether either is shared with other people, and without knowing the practitioner already has the kit installed at the user level where it serves every repo. The non-interactive path hard-codes consent for the root-doc write, so the write that reached an employer's tracked `AGENTS.md` printed no prompt at all and the cleanup was manual. This task makes the installer establish both facts before writing and refuse to guess when it cannot ask.

## Checklist

- [x] Read-only tracked-path probe (`src/lib/git.js`): returns tracked / untracked / unknown. Unresolvable git — no repository, no binary — yields `unknown` and never throws; detection must not be able to fail an install.
- [x] User-level install detection: `userLevelInstallPath` resolves a user-level state file (`~/.claude/agentic-state.json` / `~/.agents/agentic-state.json`); the install summary notes it. `home` is injectable for tests.
- [x] Interactive root-doc confirmation in `init.js` states that the file is version-controlled and that the section will be visible to everyone sharing the repository, and defaults to no when the path is tracked. The decision lives in the pure `rootDocAppendPrompt` in `src/lib/rootdoc.js` and is unit-tested; the suite has no TTY and cannot drive the prompt.
- [x] Same interactive confirmation in `update.js`, reusing `rootDocAppendPrompt`.
- [x] `init.js` non-interactive `confirmAppend` refuses a tracked root doc: skips that write, states the reason on stderr, completes the rest of the install.
- [x] `init.js` non-interactive `confirmReplace`: `init.js` never passed the callback at all, so `updateRootDoc`'s default — replace — silently rewrote a stale managed section in a tracked root doc. Both write paths now share one decision helper.
- [x] `update.js` equivalents for both callbacks — append and replace both refuse a tracked root doc unless `--force-root-doc`; the replace path keeps its pre-existing `--force` gate for an untracked doc.
- [x] Override flag on `init` — `--force-root-doc`, boolean, surfaced in `--help`, named separately from `update`'s existing `--force` because that one means "overwrite user-edited files on conflict". The release-blocking gap is closed for `init`.
- [x] Same override on `update` — `--force-root-doc`, now non-inert alongside update.js's refusal.
- [x] `.git/info/exclude` writer (`writeExcludeEntries` + `installedPathsToExclude` in `src/lib/git.js`): anchored by filename, never a directory, idempotent, `.gitignore` never touched, fail-open outside a repo. Offered via `offerKitExclude` (interactive) shared by init and update.
- [x] Install summary reports a user-level install. Note: it appears in the post-install summary (ADR-0050 Decision 2 names "the install summary"), not the pre-install confirmation, so "still decline" means decline to commit / uninstall rather than abort mid-run.
- [x] Tests for the first slice: non-interactive refusal on a tracked root doc, and `untracked`-inside-a-repository still appends. The pre-existing suite covers `unknown` incidentally, since its scratch directories are not repositories.
- [x] Test that the override flag reaches the write the refusal skips, driven through both failure modes (absent flag, then wrong behaviour).
- [x] Tests: exclude writer anchored/idempotent/fail-open; `installedPathsToExclude` drops a tracked file in a mixed-ownership dir; `offerKitExclude` non-interactive writes nothing; `userLevelInstallPath` found/absent; update.js append-refusal + `--force-root-doc` append + `--force-root-doc` replace.
- [x] Regression pin for the originating incident: a fixture repository with a tracked `AGENTS.md` where `init -y` leaves that file unmodified. This is the same test as the first-slice refusal above — the incident and the acceptance criterion are one assertion, not two.
- [x] `CHANGELOG.md` `[Unreleased]` entry per the ADR-0048 changelog gate, kept current on each slice rather than written once at the end.
- [x] `AGENTS.md` Gotchas and `ARCHITECTURE.md` patterns/helpers updated for the git-aware installer.
- [ ] `npm test` green at the end of the task; `node bin/agentic.js update --yes` only if skill source changed (it has not — this task is installer code); `/ad-review main..HEAD` before the PR.

## Notes

### 2026-08-06

Registered from ADR-0050, whose evidence was re-derived at source rather than inherited. A fixture run of `init --agent claude-code -y` against a tracked `AGENTS.md` wrote the managed section with no prompt and left 33 untracked kit files with no exclusion. Separately, the practitioner's machine already carries the full `ad-*` set at `~/.claude/skills/` with its own state file, so every skill file written into the employer repository duplicated one already in service.

The obvious rule — never write into a tracked file the installer did not create — is rejected in the ADR: this repository's own managed section is committed deliberately, as a personal project's would be. Consent, not tracked-ness, is the axis.

Directory-level exclusion is prohibited rather than discouraged. In the incident repository a team-authored subagent file is tracked in the same `.claude/agents/` directory where the kit installs its three bundled reviewers, so a directory-level entry would hide a team-owned file from git.

First slice landed: the probe plus the non-interactive refusal, chosen as the tracer bullet because it is the incident itself. The failing test reproduced the incident before the fix (the managed section appended to a committed `AGENTS.md`), so the regression is pinned rather than described.

Two findings from the slice, both new:

- `init.js` never passes `confirmReplace` to `updateRootDoc`, so the library default — replace — applies. An existing stale managed section in a tracked root doc is therefore still rewritten unattended. The refusal landed here covers the append path only; the replace path is a separate checklist item now.
- Nothing in the suite exercised a git repository before this slice. Every scratch directory is a bare temp dir, which resolves to `unknown`, so `untracked` and `tracked` were both uncovered. `mkGitScratch` in `test/init.test.js` is the new fixture shape for the rest of the task.

The probe is fail-open by design and diverges from `src/leak-guard.js`, which is fail-closed on the same git surface. The divergence is deliberate and documented at the helper: a guard that cannot resolve the repository must block, an installer that cannot resolve it must still install.

### 2026-08-06 — fresh-context `/ad-review` and its fixes

Two-axis review (Standards + Spec) on `origin/main..HEAD` returned two Blockers, both fixed here:

- **Blocker A (both axes):** `init.js` interactive `confirmRootDocReplace` was `async () => true` — regenerated a stale section in a tracked root doc with no prompt, the append-path fix's mirror-image gap. Fixed: a tracked doc now prompts via the new pure `rootDocReplacePrompt` (default no), untracked keeps the silent regenerate. `update.js`'s interactive replace was fixed the same way (it previously named only the lost-edits risk, not the sharing risk — Standards + Spec Concern).
- **Blocker B (Standards, data-loss):** `update.js` non-interactive replace checked `forceRootDoc` before tracked-state, so `--force-root-doc` overwrote a hand-edited section on an *untracked* doc — a flag scoped to the tracked case destroying a local edit. Fixed by checking tracked-state first; regression test `update -y --force-root-doc preserves a hand-edit in an UNTRACKED root doc` would fail on the old ordering.

Concerns also resolved: `git.js` path built with `join` not string concat (portability); `installedPathsToExclude` batched to one `ls-files` instead of two subprocesses per file (leak-guard precedent); `userLevelInstallPath` moved to `state.js` (SRP, reuses STATE_DIRS/STATE_FILE); ARCHITECTURE.md + CHANGELOG corrected to match the code. Test matrix filled: `init` `--force-root-doc`-reaches-replace, `update` plain-refusal-on-replace. Suite 388/386/0.

**Deferred (Standards Concern C5b):** `offerKitExclude` still lives in `init.js` and is imported by `update.js`, making `init.js` a shared-helper grab-bag. Relocating it needs a command-shared module (it depends on `@clack/prompts`, so it cannot go in a pure lib); low-urgency pure refactor with existing precedent (`update.js` already imports `CONDITIONAL_SKILLS`/`REQUIRED_SKILLS` from `init.js`). Left as a follow-up rather than expanding this PR.

- [x] `/ad-review main..HEAD` before the PR — done; both Blockers resolved, one Concern deferred with rationale.
