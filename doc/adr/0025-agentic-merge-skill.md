# ADR-0025: Workflow-operational skill `agentic-merge` for evaluating and merging pull requests

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

The kit has no skill that scaffolds the evaluate-then-merge step. Today the agent (or the user) calls `gh pr checks` and `gh pr merge` directly. The decisions that should land at this step — has CI passed? is there a fresh-context review on file per [WORKFLOW.md §10](../../WORKFLOW.md)? which merge mode (squash / rebase / merge-commit) does the repo allow? — are made ad-hoc.

The 2026-05-10 grilling session settled the evaluation bar (decision 5): **CI green is the hard gate; everything else is a warning the senior engineer judges.** The skill's purpose is to help, not to gate work — review, linked task, unresolved comments are surfaced as findings but do not block when the user authorizes.

The same `gh` CLI soft-warning rule from [ADR-0024](0024-agentic-pr-skill.md) applies. Profile placement matches `agentic-commit` and `agentic-pr` — `solo` / `team` / `mature`, not `poc`.

Per [ADR-0007](0007-workflow-operational-skills.md) §6, every workflow-operational skill ships with its own ADR.

## Decision

We introduce a workflow-operational skill, **`agentic-merge`**, that evaluates a PR's mergeability and performs the merge through `gh pr merge`.

1. **Skill name `agentic-merge`.** Workflow-operational. Universal in `solo`, `team`, `mature`; not installed at `poc`. Description triggers on "merge this PR", "evaluate the PR", "is it mergeable", "gh pr merge", "/agentic-merge".

2. **Four-phase body.**
   - **Phase 1 — Preflight.** Verify `gh` installed and authenticated. Resolve the target PR (from argument, current branch's open PR via `gh pr view --json number`, or user prompt).
   - **Phase 2 — Evaluate.** Run a structured check:
     - **CI status** — `gh pr checks <num>`. Pass / pending / failing.
     - **Fresh-context review** — look for `.agentic/reviews/*` covering the PR's commit range, or a `gh pr view --json reviews` entry. Surface presence / absence.
     - **Linked task / ADR / spec / issue** — scan PR body and commit messages for back-link markers.
     - **Unresolved review comments** — `gh api repos/<owner>/<repo>/pulls/<num>/comments` filtered for unresolved.
     - **Merge eligibility** — `gh pr view --json mergeable,mergeStateStatus`.

     Report each as a one-line finding with status (`pass` / `warn` / `fail`).
   - **Phase 3 — Decision.** Apply the bar:
     - **CI failing** → hard stop. Refuse to merge until CI is green or explicitly overridden by user (warn loudly when overridden — this *is* a "block" case, but the user can override; the skill helps, not locks per the helper-not-blocker rule).
     - **CI pending** → ask user to wait or proceed-anyway.
     - **CI green + warnings on review / linked-task / unresolved comments** → surface warnings, ask user to confirm merge, proceed on confirm.
     - **All green** → proceed.
   - **Phase 4 — Merge.** Detect repo's allowed merge modes via `gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed`. If exactly one is allowed, use it. If multiple are allowed, ask the user. Call `gh pr merge <num> --squash | --rebase | --merge` with `--delete-branch` when the source branch is a feature branch (matches the kit's branch hygiene). Surface the merge commit / squash commit URL.

3. **Helper, not blocker.** Per user decision 5 — the skill helps a senior engineer decide. CI green is the only hard gate (and even that yields to explicit user override). Other findings are warnings.

4. **Codex parity is symmetric.** Both Claude Code and Codex variants ship.

5. **No primary file output.** The output is a merged PR. The skill returns the merge commit URL.

## Consequences

**Positive.**
- Pre-merge sanity in one pass — CI / review / linked-task / unresolved comments — instead of forgetting one and re-merging via revert.
- Repo-aware merge mode (squash / rebase / merge-commit) eliminates the "wrong mode" mistake.
- Branch cleanup (`--delete-branch`) by default keeps the remote tidy.
- Pairs naturally with `agentic-review` — the review skill produces the artifact in `.agentic/reviews/`; the merge skill checks for it.

**Negative / trade-offs.**
- **Senior-engineer judgment is load-bearing.** The skill warns but does not refuse. A team that wants enforcement (no merge without review) needs the branch-protection rule on the GitHub side; this skill alone does not enforce. Mitigated: branch protection is the right enforcement primitive — the skill complements, not replaces.
- **`gh` CLI dependency.** Same as [ADR-0024](0024-agentic-pr-skill.md).
- **Auto-detection of merge mode can pick the wrong one.** When all three modes are allowed, the skill asks. When only one is allowed, the choice is forced — that is the repo's policy, not the skill's.

## Alternatives considered

- **Hard-gate on fresh-context review (decision 5 option b/c).** Rejected per user — "objetivo é ajudar, não travar". Senior engineers retain decision authority; the skill surfaces the gap.
- **Fold into `agentic-pr` (one open-and-merge skill).** Rejected — see [ADR-0024](0024-agentic-pr-skill.md) §Alternatives. Open and merge are separate decision points; collapsing them removes the review window.
- **Default merge mode regardless of repo policy.** Rejected — `gh pr merge` already errors when the chosen mode is disallowed. Asking the repo first is cheap and avoids the retry.
- **Universal across `poc`.** Rejected — same reasoning as `agentic-commit` and `agentic-pr`.

## References

- [GitHub CLI — `gh pr checks`](https://cli.github.com/manual/gh_pr_checks), [`gh pr merge`](https://cli.github.com/manual/gh_pr_merge), [`gh pr view`](https://cli.github.com/manual/gh_pr_view) — the underlying tools.
- [WORKFLOW.md §10](../../WORKFLOW.md) — the senior-reviewer / fresh-context-review practice.
- [ADR-0007](0007-workflow-operational-skills.md) — workflow-operational skill category and the per-skill-ADR rule.
- [ADR-0013](0013-project-maturity-profiles.md) — profile catalog and the `solo` / `team` / `mature` install scope.
- [ADR-0023](0023-agentic-commit-skill.md) — `agentic-commit`, the upstream commit-drafting phase.
- [ADR-0024](0024-agentic-pr-skill.md) — `agentic-pr`, the upstream PR-open phase.
- [task-0027](../tasks/0027-agentic-merge-skill.md) — implementing task.
