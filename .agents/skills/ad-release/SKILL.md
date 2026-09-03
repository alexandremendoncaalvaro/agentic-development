---
name: ad-release
description: Safely orchestrate a single npm package release through its configured local release script, release PR, tag, npm publish, and GitHub Release. Uses one digest-bound plan approval with per-stage fallback and state-aware recovery; preserves the tagged release commit with release-only merge mode. Use when preparing, resuming, publishing, or creating a GitHub Release for an npm package; triggers on "release this package", "publish to npm", "prepare a release", "resume release", "GitHub Release", or "/ad-release".
summary: Safely orchestrate a single npm package release through its configured release script, PR, tag, npm publish, and GitHub Release with one digest-bound approval and state-aware recovery.
---

<background_information>
Implements ADR-0063 as amended by ADR-0072 and amends ADR-0048's manually performed external tail. The configured root `npm run release -- <kind>` script remains the only path that mutates the version, changelog, DCO-signed release commit, and annotated tag. This skill orchestrates the surrounding state checks and explicitly approved external effects.

Only one root npm package released through GitHub is supported. It never switches GitHub authentication, reads credential files, surfaces tokens or OTP values, changes npm dist-tags, or retries an irreversible operation blindly.
</background_information>

<instructions>
Step 0 — confirm regime. Run for a release-ready root npm package when the user asks to prepare a release, publish a tagged version, create its GitHub Release, or resume a partial release.

Stop without mutation when the repository lacks `package.json`, `package-lock.json`, `CHANGELOG.md`, a GitHub remote, `package.json#scripts.release`, or explicit `package.json#publishConfig.tag`. The configured script must accept `patch`, `minor`, `major`, or `prerelease` and `--dry-run`. Route a repository without that contract to its maintainer; do not invent a release script.

New release: require exactly one bump kind. Resume: require exactly one explicit existing release tag, never a bump kind. Read deterministic state with `node <skill-dir>/scripts/release-state.mjs [--tag <tag>]` from the consumer root. Surface its `unreadable[]` entries and stop when a required input is unreadable.

Construct the exact release PR draft before the first effect. Feed the verified facts into `node <skill-dir>/scripts/release-plan.mjs` as JSON with `releaseKind` for a new release (omit it when resuming), `packageName`, `packageVersion`, `publishTag`, `branch`, `baseBranch`, `tag`, `prTitle`, `prBody`, `prerelease`, ordered `completed` direct stages, `merged`, and the current `confirmation`. The planner never runs the command it returns.

Before the first effect, call the planner without `confirmation`. Surface its complete `planApproval.target`, seven direct or delegated `planApproval.effects`, postconditions, and digest in one compact plan. Ask once whether the owner approves that complete plan. A yes becomes `{ "scope": "release-plan", "digest": "<digest>", "approved": true }` on every later planner call. `execution` is allowed while the recomputed digest matches; `planAuthorized` becomes true and `next.requiresConfirmation` becomes false. Do not ask again for an unchanged approved plan. If the owner declines plan-wide approval, retain the prior per-stage form `{ "stage": "<stage>", "approved": true }` and ask only at each direct effect.

A changed target or effect yields a digest mismatch and is a hard no-run boundary. After a failed or interrupted command, inspect external state first. Reuse the same plan approval when the effect did not occur and the recomputed digest still matches; never turn a retry into another content-free approval prompt. Ambiguous irreversible state still stops for diagnosis.

Phase 1 — plan. Before every effect, report the current branch and worktree state, package name and configured publish tag, `[Unreleased]` readiness, release-script dry-run result for a new release, local/remote tag state, merged-base reachability, npm package version state, and GitHub Release state. Run `npm pack --dry-run` to show the publish surface. For a resume, verify the named tag is annotated and identify its release commit and package version; refuse an ambiguous or mismatched tag.

Phase 2 — local release. Show the exact command and its postcondition. Run it when the planner returns it under the plan-wide receipt; otherwise request the per-stage confirmation:

```
npm run release -- <patch|minor|major|prerelease>
```

When authorized, run it once. Verify one DCO-signed release commit and one annotated local tag. Do not reimplement version calculation or changelog rotation.

Phase 3 — release branch and PR. Show the release-branch push command without the tag. Run it when authorized by the matching plan receipt or request the per-stage fallback. Verify the remote branch resolves at the expected release commit. Hand PR creation to `ad-pr` and merge evaluation to `ad-merge --release`; pass the matching release-plan receipt and current planner output with `planAuthorized: true` to both. They surface their draft or decision but do not request duplicate approval. Their local-gate, CI, review, mergeability, and merge-commit requirements remain authoritative.

Phase 4 — remote tag. After the release commit is reachable from the merged base branch, show the exact tag-push command. Run it under the matching plan receipt or request the per-stage fallback. Verify that the remote tag resolves to the expected release commit. Do not publish until both the remote tag and base-branch reachability hold.

Phase 5 — publish exact tagged content. Create a disposable detached worktree at the annotated tag. Within it, run `npm ci`, verify the tag's package version, the package test gate, and `npm pack --dry-run`. If any check fails, do not publish; report the worktree path if cleanup cannot complete. Query the registry first and stop if the name-and-version already exists.

Show the exact `npm publish` command, effect, configured dist-tag, and postcondition. Run it under the matching plan receipt or request the per-stage fallback. Let npm request its own OTP. If authentication stops before mutation, inspect the registry and reuse the unchanged plan receipt rather than asking again. Verify the exact name-and-version and report its configured dist-tag; never change any tag. Then run `node <skill-dir>/scripts/verify-published-package.mjs <package-name> <version>`: it places a stale global binary on `PATH` and proves that `npx --yes <package-name>@latest --version` still resolves the release. Remove the disposable worktree after a verified result.

Phase 6 — GitHub Release. Use the repository's documented GitHub frontend; in this repository use `ghp`, never `gh auth switch`. Show the exact command and run it under the matching plan receipt, or request the per-stage fallback:

```
ghp release create <tag> --verify-tag --notes-from-tag
```

Add `--prerelease` only when the target version is a SemVer prerelease. When authorized, create the release once and report its URL.

Recovery. On every rerun, inspect the explicit tag, remote tag, merged release commit, registry version, and GitHub Release. Report the next unfinished safe step only. Never recalculate a new release from a resume tag, republish an immutable name-and-version, recreate a tag, or recreate a GitHub Release blindly.
</instructions>

<output_contract>
The output is either a checked release plan with no side effect, or the next plan-wide or per-stage authorized effect and its verified postcondition. A completed release has a DCO-signed release commit preserved as an ancestor of the base branch, an annotated remote tag, an npm package built from that tag under its configured dist-tag, and a GitHub Release whose notes come from that tag.
</output_contract>
