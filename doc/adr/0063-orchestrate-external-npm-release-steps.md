# ADR-0063: Orchestrate external npm release steps safely

**Status:** accepted
**Date:** 2026-08-10
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0048 — its manually performed post-local-release tail steps.
**Amended by:** ADR-0072 — replaces five mandatory confirmations with one digest-bound plan approval while retaining per-stage fallback.

## Context

ADR-0048 makes the local release deterministic: `scripts/release.sh` validates the release, updates the version and changelog, creates a DCO-signed-off commit, and creates an annotated tag. Its deliberately manual tail still requires the maintainer to correctly sequence a release-branch push and PR, a merged tagged commit, tag publication, npm publication, dist-tag verification, and a GitHub Release.

The npm name-and-version is immutable once published. Publishing the base branch after other work lands would produce a package different from the annotated release commit. Squash and rebase merging a release PR would make that tagged commit unreachable from the base branch. A partial failure after publication must be recoverable without guessing whether an irreversible action succeeded.

## Decision

We will add `ad-release` as a dual-host, explicitly confirmed workflow that orchestrates the external steps around the configured local release script. The script remains the sole implementation of version, changelog, release-commit, and annotated-tag mutation.

`ad-release` will require five direct confirmations: local release, release-branch push without its tag, post-merge tag push, npm publication, and GitHub Release creation. It will delegate PR creation and merge evaluation to `ad-pr` and a release-only mode of `ad-merge` that forces a merge commit and rejects squash or rebase. It will publish only from a disposable detached worktree pinned to the remote annotated tag, after installing the committed lockfile dependencies and passing the package test and pack gates.

The workflow will require an explicit tag to resume a partial release, inspect completed external state, and offer only unfinished safe actions. It will never republish an existing name-and-version, recreate an existing tag or GitHub Release blindly, change a dist-tag, switch GitHub authentication, or expose credentials or OTP values.

## Consequences

Positive:

- The maintainer receives one checked, state-aware workflow for the post-local-release sequence while retaining explicit authority at every external write.
- The npm tarball is built from the annotated release tag rather than an evolving base branch.
- A release commit remains auditable as an ancestor of the base branch, and a partial release can be resumed without retrying an immutable publish.

Negative / trade-offs:

- `ad-merge` gains a narrowly scoped release mode and repositories that permit only squash or rebase cannot use this release workflow.
- The release requires a committed `package-lock.json` and creates a disposable worktree, which adds a short-lived checkout and installation step.
- This changes ADR-0048's manual post-local-release tail into an explicitly confirmed, agent-orchestrated path; its local mutation boundary remains unchanged.

## Alternatives Considered

- **Keep the post-local-release runbook manual.** Rejected: it leaves the ordering and recovery of irreversible external writes to memory.
- **Reimplement versioning and changelog rotation in the skill.** Rejected: it would duplicate and drift from ADR-0048's tested release script.
- **Publish after checking out the merged base branch.** Rejected: later base-branch changes could enter the published tarball.
- **Allow squash or rebase for a release PR.** Rejected: the annotated release commit would not be preserved as a base-branch ancestor.
- **Automatically run all external writes without confirmations.** Rejected: push, publish, and release creation are independently consequential operations.
