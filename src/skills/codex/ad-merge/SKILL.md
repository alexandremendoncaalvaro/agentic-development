---
name: ad-merge
description: Evaluate and merge a GitHub pull request. Four phases — preflight (`gh` auth + PR resolution), evaluate (CI / fresh-context review / linked task / unresolved comments / mergeability), decision (CI green = hard gate; others = warnings yielding to user), merge via `gh pr merge` with auto-detected mode (squash / rebase / merge) and `--delete-branch`. Helper posture — surfaces warnings, does not block on the senior engineer's judgment. Triggers on "merge this PR", "evaluate the PR", "is it mergeable", "gh pr merge", "/ad-merge".
summary: Evaluate and merge a GitHub pull request. Four phases — preflight, evaluate (CI / fresh-context review / linked task / unresolved comments / mergeability), decision (CI green = hard gate; others = warnings), merge with auto-detected mode + `--delete-branch`.
---

<background_information>
Implements ADR-0025. Evaluates a PR's mergeability and performs the merge via `gh pr merge`. CI green is the only hard gate; everything else surfaces as a warning the senior engineer decides on.

Codex auto-trigger on description keywords is less mature than Claude Code's. If auto-invocation does not fire when the user mentions merging a PR or evaluating mergeability, invoke this skill manually.
</background_information>

<instructions>
Step 0 — confirm regime. Run when a PR is open against the repo and the user wants to land it, or the user asks "merge this PR", "evaluate the PR", "is it mergeable".

Route elsewhere when:
- No PR exists yet → `ad-pr` first.
- Commits are not on the branch yet → `ad-commit` first.

Release-only mode. `ad-release` first invokes `ad-merge --release --preflight` before opening its release PR. This preflight requires a repository that allows merge commits; reject a repository that permits only squash or rebase, because its tagged release commit would not remain an ancestor of the base branch. After the PR exists, `ad-release` invokes `ad-merge --release <PR>`; that mode forces `--merge` and never offers a merge-mode choice.

When release-only mode receives a valid `release-plan` approval receipt, require
the current `release-plan.mjs` output to carry the same digest and
`planAuthorized: true`. The receipt satisfies the merge confirmation
for that release only. It never authorizes a failing-CI override or bypasses any
preflight, review, mergeability, or merge-commit requirement.

Phase 1 — preflight. Resolve the target first: if the user passed a PR number / URL, preserve it; otherwise omit the optional argument. Then run the deterministic probe from the consumer repository root:

```
node .agents/skills/ad-merge/scripts/gh-preflight.mjs merge [number-or-url]
```

If this skill was loaded from another base directory, substitute that base. Execute it; do not re-derive its probes in prose. Its JSON reports `github` (`command`, `installed`, `authenticated`), `git` (`branch`, `upstream`, `aheadOfUpstream`), `baseBranch`, `pullRequest`, `pullRequestState` (`present` / `absent` / `unavailable`), `targetRepository`, `checks`, `mergeMethods`, and structured `errors`. It performs read-only `gh` / `git` probes and never switches GitHub accounts. Before execution, consult the repository's binding docs: if they name an approved **executable** frontend wrapper, run `AGENTIC_GH=<wrapper> node .agents/skills/ad-merge/scripts/gh-preflight.mjs merge [number-or-url]`; otherwise run the command above. Never use `gh auth switch`.

Let `<github-command>` be the returned `github.command`. Use exactly `<github-command>` for every later GitHub read or write in this workflow; never substitute bare `gh`, which could select a different account than the preflight.

If `github.installed` is false, distinguish the failure before offering recovery: when `github.command` is not `gh`, surface: "The configured wrapper `<github-command>` is unavailable. Restore the approved executable wrapper, then rerun this skill." Do not fall back to a different frontend. Otherwise surface the GitHub CLI install hint. Stop. If `github.authenticated` is false, surface: "Run `<github-command> auth login`, then rerun this skill." Stop afterward (same soft-fail rule as `ad-pr`). Surface every `errors` entry; a failed probe is not a passing fact. If `pullRequestState` is `unavailable`, report that the PR probe failed and stop. Only when it is `absent` may you say: "No PR found for branch `<branch>`. Open one with `ad-pr` first."

Phase 2 — evaluate. The preflight already returned deterministic `checks`, `pullRequest`, and `targetRepository` fields. Use them rather than running `gh pr checks` / `gh pr view` again. Derive `<base-owner>/<base-repo>` from `targetRepository`, never from the consumer checkout. Run the remaining comments probe and report it alongside them:

```
<github-command> api repos/<base-owner>/<base-repo>/pulls/<num>/comments
```

Findings format (pass / warn / fail):

```
CI status:           <pass | pending | fail>
Fresh-context review: <pass | warn — none found>
Linked task / ADR:   <pass | warn — none>
Unresolved comments: <pass | warn — N unresolved>
Mergeability:        <pass | dirty | blocked | behind>
```

Fresh-context review check — scan for either a file under `.agentic/reviews/*` whose name references the PR's commit range or number, or a preflight `pullRequest.reviews` entry with `state: APPROVED`.

Linked task / ADR — scan the PR body for `task-NNNN`, `ADR-NNNN`, `spec-NNNN`, `#<issue>`, `Closes`, `Fixes`. Scan local `<base>..HEAD` commit bodies only when `targetRepository` is the consumer repository and the local branch is `pullRequest.headRefName`; otherwise say that local history is not evidence for this PR.

Unresolved comments — count entries from `gh api` that lack a `resolved` flag or carry an in-progress thread state.

Phase 3 — decision. Apply the bar:

- CI failing → hard stop. Refuse to merge until CI is green, unless the user explicitly overrides ("merge anyway"). On override, log a loud warning that this is a deliberate CI-failing merge and the responsibility is the user's. Per ADR-0025 §3, even the hard gate yields to explicit user authorization, but the override is surfaced visibly.
- CI pending → wait by default. Ask whether to proceed only when no valid release-plan receipt exists and the user requests a decision before CI finishes.
- CI green + warnings (no fresh-context review / no linked task / unresolved comments) → surface each warning. Ask the user to confirm under the normal flow; under a valid release-plan receipt, continue without another question unless a warning changes the approved release target or effect.
- All green → proceed.

State the decision back to the user before Phase 4 so they can interject.

Phase 4 — merge. Use `mergeMethods` from the preflight to detect the repo's allowed merge modes. Re-run the read-only preflight if the report is stale.

When invoked with `--release --preflight`, stop after this check: require `mergeCommitAllowed: true` and report whether the release PR may be opened. When invoked with `--release <PR>`, repeat the check immediately before merging. If merge commits are no longer allowed, stop; never substitute squash or rebase.

Decision tree:
- Release-only mode → use `<github-command> pr merge <num> --merge --delete-branch`. Do not ask for a mode, and reject a request for `--squash` or `--rebase`.
- Exactly one mode allowed → use it.
- Multiple modes allowed → ask the user: "Repo allows squash / rebase / merge-commit. Pick one." Wait for their choice.
- None allowed (rare) → surface the policy error and stop.

Run the merge:

```
<github-command> pr merge <pullRequest.url> --squash --delete-branch
```

(replace `--squash` with `--rebase` or `--merge` per the chosen mode).

`--delete-branch` by default for feature branches (`feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`). Skip `--delete-branch` if the source branch is a long-lived integration branch (e.g., `cli`, `develop`, `release/*`).

Capture and report the merge commit URL.
</instructions>

<output_contract>
The output is a merged PR. The skill returns:
- The merge commit URL.
- A one-line summary (`<count> commits merged into <base> via <mode>`).
- The list of warnings the user proceeded past (if any), for the audit trail.
</output_contract>

## Next

- After merge: pull the latest base locally (`git checkout <base> && git pull`).
- If the merge surfaced a recurring drift: `ad-drift` for systemic gaps, or update `WORKFLOW.md` §10 / §11.
- If the merge closed a task: confirm the task file's Status is `done` and the Notes log captures the merge commit URL.
- If the merge shipped a binding decision worth recording: `ad-adr` (three-criteria rule).
