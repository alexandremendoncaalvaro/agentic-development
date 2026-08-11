# Spec `0001`: Orchestrate a safe npm package release

**Status:** accepted
**Created:** 2026-08-10
**Owner:** Alexandre Alvaro

## Context

The kit already makes the local half of a release deterministic: its `scripts/release.sh` validates the tree, bumps the version, rotates `CHANGELOG.md`, creates a DCO-signed-off release commit and an annotated tag. The maintainer must still remember the cross-system sequence after that local step: open and merge the release PR, publish the exact package to npm, verify its dist-tag, and create the matching GitHub Release. Missing or reordering one of those steps risks an unrecoverable npm version, a published package without an auditable GitHub release, or an accidental external write.

`ad-release` turns that fragmented runbook into one workflow-operational skill for maintainers of a single npm package released through GitHub. It invokes the root package's configured `release` script as the only implementation of version, changelog, commit, and tag mutation; for this kit, that script is `scripts/release.sh`. The skill orchestrates the surrounding checks and handoffs. The user remains the explicit authorizer for every effect the skill performs.

## User Scenarios

- **Scenario 1: Prepare a release safely**
  - Given a maintainer has a release-ready npm package with an intentional non-empty `[Unreleased]` section
  - When they invoke `/ad-release` with a requested bump kind
  - Then the skill validates prerequisites, shows the computed version and release plan, and requires confirmation before it runs the local release script.

- **Scenario 2: Land the release commit through review**
  - Given the local release script created its commit and annotated tag on a release branch
  - When the maintainer confirms the release-branch push
  - Then the skill pushes that branch, hands it to `/ad-pr`, and waits for `/ad-merge` to land it on the base branch; those two skills retain their own confirmation gates.

- **Scenario 3: Publish the merged version and create its release record**
  - Given the release commit is reachable from the merged base branch
  - When the maintainer separately confirms the post-merge tag push, npm publication, and GitHub Release creation
  - Then the skill pushes the exact annotated tag, creates a disposable checkout pinned to that tag, tests and publishes the verified package content from that checkout, verifies the expected npm dist-tag, and creates one GitHub Release from that remote tag.

- **Scenario 4: Recover from a partial external release**
  - Given npm publication succeeds but a later verification or GitHub Release step fails
  - When the maintainer reruns `/ad-release` with the explicit release tag
  - Then the skill detects the published version and existing tag, never republishes that immutable version, and presents only the remaining safe recovery action.

## Requirements

### Functional

- R1: `ad-release` is a dual-host workflow-operational skill installed for every selected host; its applicability is determined by the repository's release contract.
- R2: The skill supports one root npm package with GitHub as its release host. It refuses to proceed when `package.json`, `package-lock.json`, `CHANGELOG.md`, the repository remote, `package.json#scripts.release`, or an explicit `package.json#publishConfig.tag` is absent. The configured script must accept one of `patch | minor | major | prerelease` plus `--dry-run`; a repository without that contract is out of scope. For this kit, implementation adds `"release": "./scripts/release.sh"` as a thin wrapper around ADR-0048's only release path.
- R3: A new release starts from one requested bump kind; a resume starts from an explicit existing release tag, never a bump kind. Before any mutation, the skill reports the current branch, working-tree state, computed version from `npm run release -- <kind> --dry-run` for a new release, `[Unreleased]` readiness, local tag collision, npm package name, configured publish tag, and remote release/tag state. It invokes `npm pack --dry-run` to show the publish surface. For a resume, it verifies that the explicit tag is annotated and identifies the release commit and its package version; it refuses an ambiguous or mismatched tag instead of calculating another version.
- R4: The only path that mutates the local version, changelog, release commit, and annotated tag is the configured `npm run release -- <kind>` script. That script is an allowed wrapper only when it delegates solely to the repository's existing release path; in this kit it delegates to `scripts/release.sh`. The skill first runs its dry-run, then requires explicit confirmation before the real invocation. It never reimplements version calculation or changelog rotation.
- R5: The skill has exactly five direct confirmation boundaries. Before each it shows the exact command, effect, and postcondition, then awaits explicit user approval:

  | Confirmation | Effect | Required postcondition |
  | --- | --- | --- |
  | Local release | Run the configured release script | One DCO-signed-off release commit and one annotated local tag |
  | Release-branch push | Push the release branch without its tag | Remote branch resolves at the expected release commit |
  | Post-merge tag push | Push the exact annotated tag after its commit is reachable from the base branch | Remote tag resolves at the expected annotated release commit |
  | npm publish | Run `npm publish` from a disposable checkout pinned to the annotated tag | Registry reports the tag's exact name-and-version and its configured dist-tag |
  | GitHub Release | Create the release from the remote annotated tag | One release URL with notes from that tag, marked prerelease only for a prerelease version |

  `ad-release` never directly opens or merges a PR: it hands those actions to `ad-pr` and `ad-merge`, whose existing confirmation gates remain authoritative. It never changes global GitHub authentication, runs `gh auth switch`, reads credential files, or exposes tokens or OTP values.
- R6: The skill delegates PR creation to `ad-pr` and merge evaluation to `ad-merge`. A release-only mode in `ad-merge` must force `--merge` and reject squash or rebase, preserving the tagged release commit as an ancestor of the base branch; `ad-release` invokes that mode for a release PR. The skill checks that merge commits are allowed before the PR opens and stops if the repository permits only squash or rebase. For its release-specific GitHub checks and release creation, it uses the repository's documented GitHub CLI frontend; in this repository that is `ghp`. It never assumes or switches a machine-global account.
- R7: Before npm publication, the skill verifies that the release tag is already remote and that the tagged release commit is reachable from the merged base branch. It creates a disposable detached worktree at that exact annotated tag; within that checkout it runs `npm ci` from the committed lockfile, verifies the package version named by the tag, runs the package test gate and `npm pack --dry-run`, and runs `npm publish`. It removes the disposable worktree after a verified result or reports it for recovery after an interrupted run. It stops if the registry already contains the target name-and-version.
- R8: The skill runs `npm publish` only after explicit confirmation and lets npm request its own OTP. After success, it verifies the exact published version and reports the package's configured dist-tag. Changing any dist-tag, including `latest`, is out of scope.
- R9: The skill creates the GitHub Release only after its tag is remote, using the annotated tag as release notes (`ghp release create <tag> --verify-tag --notes-from-tag` in this repository). It adds `--prerelease` only when the target version is a SemVer prerelease. It requires a distinct explicit confirmation and reports the resulting URL.
- R10: A rerun is state-aware: it detects an existing local or remote tag, merged release commit, published npm version, and GitHub Release, then reports the next unfinished step. It never retries an already-successful irreversible operation.

### Non-functional

- N1: Every command in a plan is copyable, names its effect, and has a checked postcondition; failure output is surfaced without blind retry.
- N2: The skill adds no package dependency, network service, telemetry, or credential storage. It is orchestration prose plus narrowly deterministic probes only where a probe removes judgment. Its tag-pinned publish worktree is disposable and never modifies the maintainer's active checkout.
- N3: The release workflow preserves ADR-0048's release branch and DCO requirements, local quality gates, and prohibition on direct pushes to `main`.

## Success Criteria

- A dry-run on a fixture release branch reports the same target version as the configured release script's `--dry-run` and leaves the working tree, index, tags, remote, registry, and GitHub state unchanged.
- The skill cannot start its local release, remote-sync, npm-publish, or GitHub-Release action without that action's preceding confirmation; PR creation and merge remain delegated to the independently confirmation-gated `ad-pr` and `ad-merge` workflows.
- A successful release has one DCO-signed-off release commit preserved as an ancestor of the base branch, one annotated remote tag, one matching npm package version built from that tag under its configured dist-tag, and one GitHub Release whose notes come from that tag.
- A fixture proves the five direct confirmation boundaries independently: refusing each confirmation leaves the corresponding local release, release-branch push, post-merge tag push, npm publish, or GitHub Release action unstarted; PR creation and merge remain delegated to the separately gated `ad-pr` and `ad-merge` workflows.
- A rerun after each injected partial-failure boundary names the already-complete steps and offers no command that republishes the same npm version or recreates a tag/release blindly.
- Both hosts install the same release contract and all skill, script, and fixture tests pass.

## Edge Cases

- The working tree is dirty, `[Unreleased]` is empty, the release script rejects the bump, or the target tag already exists locally: stop before a local mutation.
- The release branch or tag has not reached the remote, the release PR is unmerged, or the tagged commit is not an ancestor of the base branch: do not publish.
- The repository permits only squash or rebase merges for the release PR: stop before opening it, because that would make the tagged release commit unreachable from the base branch.
- The tag-pinned disposable worktree cannot be created, `npm ci` fails, its package version differs from the tag, or its test/pack gate fails: do not publish; report the worktree path for recovery if cleanup cannot complete.
- npm authentication needs OTP, the target version already exists, or the publish response is interrupted: do not infer success; inspect the registry and present recovery without retrying publication blindly.
- The GitHub Release already exists, the remote tag is absent, or Release creation fails after npm publication: preserve the published state and offer only the missing GitHub-side recovery.
- The repository is not a single npm package or does not use GitHub: state the unsupported shape and stop without guessing an alternative release system.

## Out of Scope

- Replacing the configured release script, defining one for a repository that lacks it, changing its versioning convention, or automating a version bump from commit semantics.
- Monorepos, workspaces, non-npm registries, non-GitHub forges, release assets, and CI trusted publishing.
- Changing repository merge policy or supporting a release PR merged by squash or rebase.
- Changing any npm dist-tag, npm access/ownership, or package permissions.
- Automatically pushing, merging, publishing, tagging, or creating a GitHub Release without an explicit user approval at that step.

## Open Questions

- Resolved — [ADR-0063](../adr/0063-orchestrate-external-npm-release-steps.md) accepts the five separately confirmed effects and the state-aware recovery contract.
- Unresolved — [`task-0050`](../tasks/0050-decide-release-dist-tag-contract.md)
  owns reconciliation of the configured `beta` dist-tag with the observed
  `latest` assignment of `0.20.0-beta.2`. Until that maintainer decision is
  recorded, this specification remains `accepted`.

## Related

- ADRs: [ADR-0048](../adr/0048-kit-release-discipline-gates.md) (existing local release path); [ADR-0063](../adr/0063-orchestrate-external-npm-release-steps.md) (external release contract).
- Tasks: [`task-0044`](../tasks/0044-reconcile-ad-release-spec.md),
  [`task-0050`](../tasks/0050-decide-release-dist-tag-contract.md).
- Sources: [npm publish documentation](https://docs.npmjs.com/cli/v10/commands/npm-publish/), [GitHub CLI `gh release create` manual](https://cli.github.com/manual/gh_release_create), [semantic-release npm plugin](https://github.com/semantic-release/npm).
- Supersedes / Depends on: depends on the existing `scripts/release.sh` contract.
