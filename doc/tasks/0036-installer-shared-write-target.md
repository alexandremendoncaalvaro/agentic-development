# task-0036: Installer detects a shared write target (ADR-0051)

**Status:** done
**Date:** 2026-08-06

## Goal

Implement [ADR-0051](../adr/0051-installer-shared-write-target-detection.md). Today `agentic init` appends a managed section to a project's root `AGENTS.md` and copies the skill tree into the repo without knowing whether either is shared with other people, and without knowing the practitioner already has the kit installed at the user level where it serves every repo. The non-interactive path hard-codes consent for the root-doc write, so the write that reached an employer's tracked `AGENTS.md` printed no prompt at all and the cleanup was manual. This task makes the installer establish both facts before writing and refuse to guess when it cannot ask.

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
- [x] Install summary reports a user-level install. Note: it appears in the post-install summary (ADR-0051 Decision 2 names "the install summary"), not the pre-install confirmation, so "still decline" means decline to commit / uninstall rather than abort mid-run.
- [x] Tests for the first slice: non-interactive refusal on a tracked root doc, and `untracked`-inside-a-repository still appends. The pre-existing suite covers `unknown` incidentally, since its scratch directories are not repositories.
- [x] Test that the override flag reaches the write the refusal skips, driven through both failure modes (absent flag, then wrong behaviour).
- [x] Tests: exclude writer anchored/idempotent/fail-open; `installedPathsToExclude` drops a tracked file in a mixed-ownership dir; `offerKitExclude` non-interactive writes nothing; `userLevelInstallPath` found/absent; update.js append-refusal + `--force-root-doc` append + `--force-root-doc` replace.
- [x] Regression pin for the originating incident: a fixture repository with a tracked `AGENTS.md` where `init -y` leaves that file unmodified. This is the same test as the first-slice refusal above — the incident and the acceptance criterion are one assertion, not two.
- [x] `CHANGELOG.md` `[Unreleased]` entry per the ADR-0048 changelog gate, kept current on each slice rather than written once at the end.
- [x] `AGENTS.md` Gotchas and `ARCHITECTURE.md` patterns/helpers updated for the git-aware installer.
- [x] `npm test` green at the end of the task; `node bin/agentic.js update --yes` only if skill source changed (it has not — this task is installer code); `/ad-review main..HEAD` before the PR.

## Notes

### 2026-08-06

Registered from ADR-0051, whose evidence was re-derived at source rather than inherited. A fixture run of `init --agent claude-code -y` against a tracked `AGENTS.md` wrote the managed section with no prompt and left 33 untracked kit files with no exclusion. Separately, the practitioner's machine already carries the full `ad-*` set at `~/.claude/skills/` with its own state file, so every skill file written into the employer repository duplicated one already in service.

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

### 2026-08-06 — frozen pending the parallel-merge burst (Alê's coordination call)

`origin/main` advanced three times during this work — a state-projection / read-contract feature, its follow-ups, and a `0.20.0-beta.1` release (`7570f31`) — and kept moving faster than each integration attempt. Alê's decision: freeze C1 and integrate **once** when the burst settles, rather than race a moving target. Waiting on his signal that the parallel front has stopped.

Frozen state: branch `claude/sharp-goldberg-b19c79`, tip is merge `851bbf2` (integrates `origin/main` at `f4420cf`), full suite 404/402/0. The installer-overlap resolution (their `installKitDocs` for the WORKFLOW.md install + this branch's `offerKitExclude` / tracked-root-doc guard) is already done and committed in `851bbf2` — reuse it, do not redo it.

One-shot integration checklist for when main is stable:
- [x] Renumber this task 0035 → next free (main now holds `0035-windows-ci-matrix-decision.md`); likely `task-0036`. ADR-0051 was still free at last check — reconfirm before assuming.
- [x] Re-resolve `CHANGELOG.md`: the 0.20.0-beta.1 release rotated `[Unreleased]`; C1's entries were NOT in that release, so they belong under the new `[Unreleased]`.
- [x] Re-run the full gate and `/ad-review` against the stabilized base (the earlier review ran against the pre-merge tree; the merged result — especially the `installKitDocs` × `offerKitExclude` interaction below — has not had a fresh-context pass).
- [x] Open the PR via **`ghp`** (never `gh`, never `gh auth switch`).

Open interaction for that re-review: `installKitDocs` writes `WORKFLOW.md` / `WORKFLOW-FLOWS.md` to the target root, so `offerKitExclude` now also offers to exclude them (it sweeps all untracked installed files). Harmless (interactive offer, file stays on disk) but unanticipated — decide at re-review whether root kit-docs belong in the exclude offer or only the agent-surface files.

### 2026-08-06 — post-integration re-review, and the scope fix it produced

Integrated onto the stabilized `main` (renumber ADR-0051 / task-0036, CHANGELOG entries moved to `[Unreleased]` off the released section, PROJECTION.md count 26→27). A fresh-context re-review of the *merged* changeset confirmed both prior Blockers are cleared and test-pinned, and returned a verdict on the open interaction: the exclude offer's scope was **wrong** — `offerKitExclude` swept root kit-docs (`WORKFLOW.md` / `WORKFLOW-FLOWS.md`) under the same default-yes framing as agent-surface files, contradicting ADR-0051's two-surface scope and the kit's own convention of committing those docs (a Concern, not a Blocker: interactive-only, reversible, no data loss).

Fixed here: `kitExcludeCandidates` (new, exported, unit-tested) scopes the offer to the agent surface (`.claude/`, `.agents/`, `.codex/`) via `AGENT_SURFACE_PREFIXES`; root kit-docs are outside the sweep, guarded instead by `installKitDocs`'s own report-and-skip. `ARCHITECTURE.md` corrected to state the scope. Suite 405/403/0.

Re-review Notes not fixed (recorded, not lost): `cwd === homedir()` strict-string compare could misfire on a symlinked home (cosmetic — suppresses one summary line, no data safety); the `offerKitExclude` doc-comment's "freshly-installed" wording was tightened. The C5b coupling (`offerKitExclude` in `init.js`, imported by `update.js`) remains the deferred follow-up.

### 2026-08-10 — reconciliation

This task's implementation was already merged by PR #75 (`a129b01`, `feat(installer): detect shared write targets and refuse to guess (ADR-0051)`). Its deferred C5b extraction then merged separately in PR #76, as this task's Notes anticipated. The missing task closure was clerical: the tracked-root-doc guard, the bounded exclude offer, and their regression tests are present on `main`; the current full suite passed 572/572. The reviewed implementation and its accepted ADR therefore meet this task's completion criteria.

### 2026-08-12

Task-ledger audit checked the four frozen integration steps that the following
post-integration Notes already describe as complete. The task status was
correct; the unchecked historical checklist was not.
