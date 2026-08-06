# task-0034: Installer detects a shared write target (ADR-0049)

**Status:** proposed
**Date:** 2026-08-06

## Goal

Implement [ADR-0049](../adr/0049-installer-shared-write-target-detection.md). Today `agentic init` appends a managed section to a project's root `AGENTS.md` and copies the skill tree into the repo without knowing whether either is shared with other people, and without knowing the practitioner already has the kit installed at the user level where it serves every repo. The non-interactive path hard-codes consent for the root-doc write, so the write that reached an employer's tracked `AGENTS.md` printed no prompt at all and the cleanup was manual. This task makes the installer establish both facts before writing and refuse to guess when it cannot ask.

## Checklist

- [ ] Read-only tracked-path probe (`src/lib/`): returns tracked / untracked / unknown. Unresolvable git — no repository, no binary — yields `unknown` and never throws; detection must not be able to fail an install.
- [ ] User-level install detection: resolve a user-level kit state file / skills directory and report it to the caller. Read-only.
- [ ] Interactive root-doc confirmation (`src/commands/init.js`, `src/commands/update.js`) states that the file is version-controlled and that the section will be visible to everyone sharing the repository; default answer is no when the path is tracked.
- [ ] Non-interactive no longer hard-codes `confirmAppend` / `confirmReplace` true for a tracked root doc: skip that write, state the reason on stderr, complete the rest of the install.
- [ ] Force flag on `init` and `update` permitting the tracked-root-doc write; enum-guarded in the same shape as `--agent`, surfaced in `--help`.
- [ ] `.git/info/exclude` writer, offered when kit files land untracked in a repository: entries enumerate installed files by path, a directory-level entry is never emitted, existing entries are not duplicated, `.gitignore` is never touched.
- [ ] Install summary reports when a user-level install already covers the skills being written locally, at the point the operator can still decline them.
- [ ] Tests: tracked / untracked / non-repository root doc; non-interactive refusal; force flag overrides the refusal; exclude writer emits filenames rather than directories and is idempotent across re-runs; a mixed-ownership agent directory keeps its tracked file visible to git.
- [ ] Regression pin for the originating incident: a fixture repository with a tracked `AGENTS.md` where `init -y` leaves that file unmodified.
- [ ] `AGENTS.md` Gotchas and `ARCHITECTURE.md` patterns updated for the new installer behavior; `CHANGELOG.md` `[Unreleased]` entry per the ADR-0048 changelog gate.
- [ ] `npm test` green; `node bin/agentic.js update --yes` to refresh the dogfood install; `/ad-review main..HEAD` before the PR.

## Notes

### 2026-08-06

Registered from ADR-0049, whose evidence was re-derived at source rather than inherited. A fixture run of `init --agent claude-code -y` against a tracked `AGENTS.md` wrote the managed section with no prompt and left 33 untracked kit files with no exclusion. Separately, the practitioner's machine already carries the full `ad-*` set at `~/.claude/skills/` with its own state file, so every skill file written into the employer repository duplicated one already in service.

The obvious rule — never write into a tracked file the installer did not create — is rejected in the ADR: this repository's own managed section is committed deliberately, as a personal project's would be. Consent, not tracked-ness, is the axis.

Directory-level exclusion is prohibited rather than discouraged. In the incident repository a team-authored subagent file is tracked in the same `.claude/agents/` directory where the kit installs its three bundled reviewers, so a directory-level entry would hide a team-owned file from git.
