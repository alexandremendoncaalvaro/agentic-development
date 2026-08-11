# Task `0050`: Decide the release dist-tag contract

**Status:** proposed
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

- [ ] A maintainer decision records whether prereleases publish under `beta`
      or `latest`, and whether the current `latest` assignment is intentional
      historical state or needs an explicit registry correction.
- [ ] `package.json#publishConfig.tag`, the `ad-release` skill contract, the
      release specification, and tests express the selected policy without
      conflicting claims.
- [ ] Any npm dist-tag mutation is shown as a separate, explicitly approved
      external effect; no task automation silently changes registry state.
- [ ] The local test gate and a fresh-context review pass before the task
      closes.

## Plan

- [ ] Use `/ad-grill-me` to choose the prerelease distribution policy and the
      intended treatment of the already-published version.
- [ ] Record the durable policy in an ADR if the choice changes the release
      contract, then align the source, specification, and tests in a scoped
      implementation task or PR.
- [ ] If a registry mutation remains necessary, present its exact command and
      postcondition for explicit maintainer approval.
- [ ] Run the local gate and fresh-context review.

## Notes

Append-only log. Date each entry. Never rewrite past entries.

### 2026-08-11

Created by task-0044's evidence audit. Observed registry state via
`npm view @alexandrealvaro/agentic@0.20.0-beta.2 version dist-tags --json`:
the published version is `0.20.0-beta.2`, `latest` points to that version, and
`beta` points to `0.19.0-beta.1`. The source contract currently names `beta`.
No registry mutation occurred during this audit.

## Definition of Done

All Acceptance Criteria checked, plus:

- [ ] Local tests pass (or N/A documented in Notes)
- [ ] Code review completed (human or fresh-context reviewer per WORKFLOW §10)
- [ ] No orphan `TODO`/`FIXME` introduced
- [ ] Status updated to `done` and Notes log closes the task
