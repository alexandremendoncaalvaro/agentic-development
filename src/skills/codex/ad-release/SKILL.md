---
name: ad-release
description: Safely orchestrate a single npm package release through its configured local release script, release PR, tag, npm publish, and GitHub Release. Uses five explicit confirmation boundaries and state-aware recovery; preserves the tagged release commit with release-only merge mode. Use when preparing, resuming, publishing, or creating a GitHub Release for an npm package; triggers on "release this package", "publish to npm", "prepare a release", "resume release", "GitHub Release", or "/ad-release".
summary: Safely orchestrate a single npm package release through its configured release script, PR, tag, npm publish, and GitHub Release with five explicit confirmations and state-aware recovery.
---

<background_information>
Implements ADR-0063 and amends ADR-0048's manually performed external tail. The configured root `npm run release -- <kind>` script remains the only path that mutates the version, changelog, DCO-signed release commit, and annotated tag. This skill orchestrates the surrounding state checks and explicitly approved external effects.

Only one root npm package released through GitHub is supported. The skill is unavailable to the `poc` profile. It never switches GitHub authentication, reads credential files, surfaces tokens or OTP values, changes npm dist-tags, or retries an irreversible operation blindly.
</background_information>

<instructions>
Step 0 — confirm regime. Run for a release-ready root npm package when the user asks to prepare a release, publish a tagged version, create its GitHub Release, or resume a partial release.

Stop without mutation when the repository lacks `package.json`, `package-lock.json`, `CHANGELOG.md`, a GitHub remote, `package.json#scripts.release`, or explicit `package.json#publishConfig.tag`. The configured script must accept `patch`, `minor`, `major`, or `prerelease` and `--dry-run`. Route a repository without that contract to its maintainer; do not invent a release script.

New release: require exactly one bump kind. Resume: require exactly one explicit existing release tag, never a bump kind. Read deterministic state with `node <skill-dir>/scripts/release-state.mjs [--tag <tag>]` from the consumer root. Surface its `unreadable[]` entries and stop when a required input is unreadable.

Feed the verified facts into `node <skill-dir>/scripts/release-plan.mjs` as JSON with `releaseKind`, `branch`, `tag`, `prerelease`, ordered `completed` direct stages, `merged`, and the current `confirmation`. It emits `execution` only after that stage's approval; `execution: null` is a hard no-run boundary. The planner never runs the command it returns.

Phase 1 — plan. Before every effect, report the current branch and worktree state, package name and configured publish tag, `[Unreleased]` readiness, release-script dry-run result for a new release, local/remote tag state, merged-base reachability, npm package version state, and GitHub Release state. Run `npm pack --dry-run` to show the publish surface. For a resume, verify the named tag is annotated and identify its release commit and package version; refuse an ambiguous or mismatched tag.

Phase 2 — local release. Show the exact command and its postcondition, then request the first direct confirmation:

```
npm run release -- <patch|minor|major|prerelease>
```

On approval, run it once. Verify one DCO-signed release commit and one annotated local tag. Do not reimplement version calculation or changelog rotation.

Phase 3 — release branch and PR. Show the release-branch push command without the tag and request the second direct confirmation. On approval, push only that branch and verify the remote branch resolves at the expected release commit. Hand PR creation to `ad-pr`; do not open a PR directly. Hand merge evaluation to `ad-merge` in its release-only mode. That mode must verify merge-commit permission before opening the PR and force `--merge`, rejecting squash and rebase. Its own confirmation gates remain authoritative.

Phase 4 — remote tag. After the release commit is reachable from the merged base branch, show the exact tag-push command and request the third direct confirmation. On approval, push the exact annotated tag and verify that the remote tag resolves to the expected release commit. Do not publish until both the remote tag and base-branch reachability hold.

Phase 5 — publish exact tagged content. Create a disposable detached worktree at the annotated tag. Within it, run `npm ci`, verify the tag's package version, the package test gate, and `npm pack --dry-run`. If any check fails, do not publish; report the worktree path if cleanup cannot complete. Query the registry first and stop if the name-and-version already exists.

Show the exact `npm publish` command, effect, configured dist-tag, and postcondition. Request the fourth direct confirmation. On approval, run `npm publish` once from the tag-pinned worktree and let npm request its own OTP. Verify the exact name-and-version and report its configured dist-tag; never change any tag. Remove the disposable worktree after a verified result.

Phase 6 — GitHub Release. Use the repository's documented GitHub frontend; in this repository use `ghp`, never `gh auth switch`. Show the exact command and request the fifth direct confirmation:

```
ghp release create <tag> --verify-tag --notes-from-tag
```

Add `--prerelease` only when the target version is a SemVer prerelease. On approval, create the release once and report its URL.

Recovery. On every rerun, inspect the explicit tag, remote tag, merged release commit, registry version, and GitHub Release. Report the next unfinished safe step only. Never recalculate a new release from a resume tag, republish an immutable name-and-version, recreate a tag, or recreate a GitHub Release blindly.
</instructions>

<output_contract>
The output is either a checked release plan with no side effect, or one explicitly confirmed next effect and its verified postcondition. A completed release has a DCO-signed release commit preserved as an ancestor of the base branch, an annotated remote tag, an npm package built from that tag under its configured dist-tag, and a GitHub Release whose notes come from that tag.
</output_contract>
