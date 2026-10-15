# ADR-0096: Measure release effects in shadow

**Status:** accepted
**Date:** 2026-10-15
**Deciders:** Alexandre Alvaro
**Amends:** ADR-0089 — decision 2's list of checked actions gains `npm publish` and `<gh> release create`, checked against a release receipt that lives in the git directory every worktree shares instead of under `.agentic/`; every other decision binds unchanged.
**Related:** ADR-0063, ADR-0072 (the release plan and its digest-bound approval); ADR-0083 (no block before a measured false-block rate); ADR-0085 (skills gate their own effects)

## Context

`ad-release` publishes to npm and creates a GitHub Release behind one approval written in prose and carried as JSON. A hook in the skill's own frontmatter would fire only after the skill was invoked and would trust a receipt the agent writes, so it would not stop an agent that skips the skill. The npm one-time password is the barrier an agent cannot forge, and it covers a publish only when the account's two-factor mode is `auth-and-writes`. ADR-0083 and ADR-0089 require a measured false-block rate before any block, and ADR-0089 decision 6's criterion of 20 events in four weeks cannot be reached at the kit's release frequency (six release tags, v1.1.0 to v1.5.0, created 2026-09-16 to 2026-10-15 by `git tag --sort=creatordate`).

## Decision

1. An approved release plan, or a per-stage approval of `npm-publish` or `github-release`, makes `release-plan.mjs` append one receipt to `<git common dir>/agentic/release.jsonl`: package, version, plan digest (null for a per-stage approval), scope and time. An unchanged approval is not appended again, so a receipt keeps the time of the first approval; an approval without a package name and version, or outside a git repository, the planner reports the receipt as unavailable and still returns its command.
2. The `ad-hooks` receipt gate logs a `release` check before `npm publish`, `pnpm publish`, `yarn publish` and `<gh> release create`: `clear` when one of the newest 20 receipts names the `package.json` name and version, else `would-block`; a `package.json` that is missing or names no package name and version is `runtime-unavailable`. Shadow only, like every ADR-0089 check.
3. The receipt sits in the git directory every worktree shares because `ad-release` publishes from a disposable worktree at the tag, where a receipt under `.agentic/` of the checkout is not visible.
4. `ad-release` preflight reads `npm profile get --json` and warns when `tfa.mode` is not `auth-and-writes`.
5. No release check blocks. At release frequency the shadow log is read per release, as an audit trail, not against ADR-0089 decision 6.

## Consequences

Positive:

- Every publish and GitHub release leaves a logged answer to "did an approved plan cover this version?".
- The publish from the tag worktree and the planner in the checkout agree on one receipt.
- The owner learns before a release when the one-time password would not cover it.

Negative:

- The receipt is written by the agent that runs the planner, so it shows that the approval step ran, not that the owner approved; the one-time password remains the real barrier.
- A `--dry-run` publish is logged like a real one, and a publish written with options before the verb (`npm --workspace a publish`, `pnpm -r publish`) is not seen.

## Alternatives Considered

- **A hook in the skill frontmatter.** Rejected: it fires only after the skill is invoked, on one host, and trusts receipts the agent writes.
- **Block `npm publish` without a receipt.** Rejected: ADR-0083 requires a measured false-block rate first, and release frequency cannot produce one soon.
- **Ask the host for a second confirmation on publish.** Rejected: it repeats the one approval per delivery the owner set.
