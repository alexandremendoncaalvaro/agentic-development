# ADR-0024: Workflow-operational skill `agentic-pr` for opening pull requests

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

[`AGENTS.md`](../../AGENTS.md) "Commit & PR Conventions" requires PRs to carry a link to the task / ADR when applicable and pass green CI before merge. The kit has no skill that scaffolds the open-PR action — agents that draft PRs today shell out to `gh pr create` ad-hoc, with no uniform body shape. Bodies drift: some are commit-list summaries, some skip the test plan, some forget the spec / ADR back-link, some duplicate what the commit already said.

The 2026-05-10 grilling session settled four shape questions in addition to the trailer / sign-off / profile rules captured in [ADR-0023](0023-agentic-commit-skill.md):

1. **Single-author commits.** PRs inherit the `Signed-off-by`-only trailer policy from `agentic-commit`. PR bodies do not re-sign.
2. **Profile placement.** Same scope as `agentic-commit` — universal at `solo` / `team` / `mature`; not at `poc`.
3. **`gh` CLI is required.** The skill cannot scaffold a PR without GitHub CLI auth. When absent, surface a soft warning with the install / `gh auth login` hint rather than hard-fail.
4. **Helper, not blocker.** When CI is not yet green or the back-link is missing, the skill warns and proceeds with user authorization.

Per [ADR-0007](0007-workflow-operational-skills.md) §6, every workflow-operational skill ships with its own ADR.

## Decision

We introduce a workflow-operational skill, **`agentic-pr`**, that scaffolds opening a pull request through `gh pr create`.

1. **Skill name `agentic-pr`.** Workflow-operational. Universal in `solo`, `team`, `mature`; not installed at `poc`. Description triggers on "open a PR", "create a pull request", "submit a PR", "gh pr create", "/agentic-pr".

2. **Four-phase body.**
   - **Phase 1 — Preflight.** Verify `gh` is installed and authenticated (`gh auth status`). If absent, surface install + auth hints and stop (decision 3 — soft fail, not silent fallback to `git push` only). Verify the branch is pushed to origin (`git rev-parse @{u}` resolves) and is ahead of the base. If unpushed, prompt to `git push` first.
   - **Phase 2 — Scope assembly.** Read `git log <base>..HEAD` and `git diff <base>...HEAD`. Infer the dominant Conventional Commits type for the PR title (one type, one PR — same atomicity rule as `agentic-commit`). Detect linked task / spec / ADR slugs from commit message bodies and changed-file paths under `doc/tasks/` / `doc/specs/` / `doc/adr/`.
   - **Phase 3 — Draft body.** Apply this body template (mirrors the kit's existing PR bodies):

     ```
     ## Summary
     <1-3 bullets — the why, not the what>

     ## Test plan
     - [ ] <test 1>
     - [ ] <test 2>

     ## Links
     - <task / spec / ADR / issue back-links>
     ```

     Skip a section when there is nothing real to put under it. Never fabricate test-plan items or back-links.
   - **Phase 4 — Open + report.** Call `gh pr create --title "<title>" --body "$(cat <<'EOF' ... EOF\n)"` HEREDOC. Capture the returned PR URL and surface it to the user.

3. **Helper, not blocker.** When preflight surfaces a warning (no linked task / ADR; CI workflow file absent so CI will never go green; uncommitted changes in working tree), the skill states the warning, asks the user to confirm, and proceeds on confirm.

4. **Title format.** Conventional Commits-aligned: `<type>(<scope>?): <subject>`. Subject ≤70 chars. Type inferred from the dominant commit type in the range.

5. **Codex parity is symmetric.** Both Claude Code and Codex variants ship. The `gh` dependency applies equally — Codex variant warns the same way.

6. **No primary file output.** The output is an opened PR; the URL is returned to the user.

## Consequences

**Positive.**
- Uniform PR body shape across the kit. Reviewers stop hunting for the test plan or the back-link.
- Preflight catches the "branch not pushed" / "gh not authed" failure modes early, instead of mid-command.
- Inferring type / scope / back-links from commits + paths reduces user typing and keeps the title consistent with the merged commit history.

**Negative / trade-offs.**
- **`gh` CLI hard dependency.** GitLab / Bitbucket / Forgejo / Gitea users cannot use this skill. Mitigated: kit currently targets GitHub-hosted projects (the kit's own repo + the user's stated workflow); a future ADR can introduce `agentic-mr` for GitLab if demand surfaces.
- **Inference can be wrong.** When commits span multiple types (a `fix:` snuck into a mostly-`feat:` branch), the inferred PR type may not be the user's intent. Mitigated: Phase 3 surfaces the draft for user approval before opening.
- **CI-not-wired projects.** The skill cannot wait for green CI when no `.github/workflows/` exists. Mitigated: Phase 1 surfaces the gap as a warning; user proceeds with eyes open.

## Alternatives considered

- **Block on `gh` absence (decision 3 option opposite).** Rejected per user decision — soft warning is the helper posture.
- **Auto-merge after open (fold `agentic-pr` and `agentic-merge` into one skill).** Rejected — open and merge are separate decision points; collapsing them removes the review window. Kept as paired skills per [ADR-0025](0025-agentic-merge-skill.md).
- **Generate test plan from commit bodies via a template heuristic.** Rejected — heuristic-generated test plans tend to be either fabrications or commit-message echoes. Better to leave the section empty and prompt the user than to invent steps.
- **Universal across `poc`.** Rejected — `poc` profile skips artifact-producing layers (per [ADR-0013](0013-project-maturity-profiles.md)); PR ceremony belongs with the same maturity tier.

## References

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) — title format.
- [GitHub CLI docs — `gh pr create`](https://cli.github.com/manual/gh_pr_create) — the underlying tool this skill drives.
- [ADR-0007](0007-workflow-operational-skills.md) — workflow-operational skill category and the per-skill-ADR rule.
- [ADR-0013](0013-project-maturity-profiles.md) — profile catalog and the `solo` / `team` / `mature` install scope.
- [ADR-0023](0023-agentic-commit-skill.md) — `agentic-commit`, the upstream commit-drafting phase.
- [ADR-0025](0025-agentic-merge-skill.md) — `agentic-merge`, the downstream merge phase.
- [task-0026](../tasks/0026-agentic-pr-skill.md) — implementing task.
