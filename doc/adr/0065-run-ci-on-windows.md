# ADR-0065: Run CI on Windows

**Status:** accepted
**Date:** 2026-08-11
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0032 — its CI OS matrix example and realized runner set.

## Context

The kit installs and runs deterministic Node scripts on a contributor's local
machine, including Windows. Task 0031 established that portability as a design
goal, but the test workflow runs only on Ubuntu for Node 20 and 22. The
Windows-specific code paths in the hook runner and skill scripts therefore
remain vulnerable to regression until CI exercises them.

The retired PR #90 first exposed the gap: its Windows lane caught both shell
dependent test discovery and Windows process-spawning defects. PR #92 has
already integrated those fixes on `main`, but the workflow still lacks the
recurring Windows execution that would protect them. The existing
`protect-main` ruleset requires only the two Ubuntu job names.

## Decision

We will run the `test` workflow on `ubuntu-latest` and `windows-latest` for
Node 20 and Node 22. After the first current-base pull request observes the
four unique matrix job names, `protect-main` will require all four checks.

The local pre-push command remains the same `npm test` gate. It is not a
Windows emulator; the CI matrix supplies the platform-specific execution and
`ad-hooks` reports that matrix difference as advisory drift per ADR-0032.

## Consequences

Positive:

- Windows-specific filesystem, path, shell-wrapper, and process-spawn behavior
  is exercised before merge for both supported Node versions.
- A future contributor on Windows receives the same protected-main signal as a
  Linux contributor instead of discovering an unsupported path after release.
- The OS example in ADR-0032 now reflects the actual protected matrix.

Negative / trade-offs:

- Each pull request runs two additional jobs, increasing CI wall-clock and
  runner usage.
- Required check names are coupled to the workflow's matrix labels; changing
  those labels requires a coordinated ruleset update.
- Local pre-push remains a single-machine check, so it cannot eliminate every
  OS-specific CI failure before push.

## Alternatives Considered

- **Keep Ubuntu-only CI.** Rejected: it leaves already-observed Windows
  regressions outside the protected path.
- **Run Windows as non-required advisory CI.** Rejected: an advisory lane can
  regress without blocking the merge it is intended to protect.
- **Add macOS before Windows.** Rejected: Windows has the concrete uncovered
  branches and observed failures; macOS has local execution evidence already.
