# Task `0050`: Decide the release dist-tag contract

**Status:** done
**Created:** 2026-08-11
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:** doc/specs/0001-ad-release-orchestrated-release.md
**Board ref:**

## Context

The release contract requires an explicit `package.json#publishConfig.tag` and
the `ad-release` skill reports, but never changes, that configured dist-tag.
The current source configures `beta`, while registry evidence shows
`@alexandrealvaro/agentic@0.20.0-beta.2` under `latest` and the `beta` tag
still points to `0.19.0-beta.1`. This makes the declared future-release policy
and the public package state disagree. The published version is immutable, so
reconciliation must begin with a maintainer decision rather than an automated
tag mutation.

## Acceptance Criteria

- [x] A maintainer decision records whether prereleases publish under `beta`
      or `latest`, and whether the current `latest` assignment is intentional
      historical state or needs an explicit registry correction.
- [x] `package.json#publishConfig.tag`, the `ad-release` skill contract, the
      release specification, and tests express the selected policy without
      conflicting claims.
- [x] Any npm dist-tag mutation is shown as a separate, explicitly approved
      external effect; no task automation silently changes registry state.
- [x] The local test gate and a fresh-context review pass before the task
      closes.

## Plan

- [x] Establish the prerelease distribution policy from the maintainer's
      explicit `latest` instruction; no grilling session was needed because
      the product choice was already resolved.
- [x] Record the durable policy in an ADR and align the source, specification,
      and tests in this scoped implementation task.
- [x] No registry mutation is necessary: `latest` already resolves to the
      intended published version, so no external command is presented or run.
- [x] Run the local gate and fresh-context review.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Created by task-0044's evidence audit. Observed registry state via
`npm view @alexandrealvaro/agentic@0.20.0-beta.2 version dist-tags --json`:
the published version is `0.20.0-beta.2`, `latest` points to that version, and
`beta` points to `0.19.0-beta.1`. The source contract currently names `beta`.
No registry mutation occurred during this audit.

### 2026-08-11 — maintainer decision and implementation

The maintainer selected `latest` as the installation channel for the kit's
pre-1.0 `-beta.N` releases. ADR-0066 records that the version suffix carries
the maturity signal while `latest` keeps ordinary installation simple. Registry
evidence confirms `latest` already points to `0.20.0-beta.2`; no dist-tag
mutation is needed or performed. `package.json`, the local release instruction,
the release specification, and the contract test now agree.

Grounding used the [npm dist-tag documentation](https://docs.npmjs.com/cli/dist-tag/),
which establishes `latest` as npm's default install tag, and the current
[`npm/cli` dist-tag implementation](https://github.com/npm/cli/blob/latest/lib/commands/dist-tag.js),
which shows a tag change is a separate authenticated registry write. The live
registry response confirmed `latest: 0.20.0-beta.2` and `beta: 0.19.0-beta.1`.

### 2026-08-11 — verification and review

The full local gate passed with 603 tests, and `npm pack --dry-run` confirmed
the publish surface while the inspected manifest reported `publishConfig.tag`
as `latest`. A fresh-context review first found two Standards concerns: the
release-flow wording incorrectly implied direct publication from `main`, and
the local release handoff hard-coded `latest`. The guideline now describes the
tag-pinned publish flow; the script reads its tag from `package.json`, and an
end-to-end fixture proves a distinct `canary` configuration is reported.
The reviewer rechecked both fixes with no remaining issue. No npm mutation
occurred.

## Definition of Done

All Acceptance Criteria checked, plus:

- [x] Local tests pass (or N/A documented in Notes)
- [x] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [x] No orphan `TODO`/`FIXME` introduced
- [x] Status updated to `done` and Notes log closes the task
