# ADR-0023: Workflow-operational skill `agentic-commit` for atomic Conventional Commits with DCO sign-off

**Status:** accepted
**Date:** 2026-05-10
**Deciders:** Alexandre Alvaro

## Context

[`AGENTS.md`](../../AGENTS.md) "Commit & PR Conventions" states the kit's commit standard: Conventional Commits, imperative subject, body explains *why* when non-obvious. Existing commits across the kit have used a `Co-Authored-By:` trailer attributing LLM authorship. There is no operationalizing skill — the convention is documented but not scaffolded. Agents that draft commits today rely on the host's bash + `git` tools without a uniform shape, which produces inconsistent results: mixed-scope commits, drift from Conventional Commits, missing rationale, no DCO trail.

The 2026-05-10 grilling session ([conversation log, this branch](../tasks/0025-agentic-commit-skill.md)) settled five shape questions:

1. **Trailer policy** — `Signed-off-by` only (DCO); drop `Co-Authored-By`.
2. **Sign-off identity** — pulled live from `git config user.name` / `user.email`.
3. **Atomic-commit enforcement** — when the working tree mixes concerns, the skill stage-splits interactively, one commit per concern.
4. **Profile placement** — universal at `solo` / `team` / `mature` (skipped at `poc`).
5. **Helper, not blocker** — the skill helps the senior engineer; it does not refuse to commit when ambiguous.

This ADR captures the skill's shape. Pairs with [ADR-0024](0024-agentic-pr-skill.md) (`agentic-pr`) and [ADR-0025](0025-agentic-merge-skill.md) (`agentic-merge`), which extend the same single-author / atomic / DCO discipline through the PR-and-merge phase.

Per [ADR-0007](0007-workflow-operational-skills.md) §6, every workflow-operational skill ships with its own ADR; this is the one for `agentic-commit`.

## Decision

We introduce a workflow-operational skill, **`agentic-commit`**, that scaffolds atomic Conventional Commits with DCO sign-off.

1. **Skill name `agentic-commit`.** Workflow-operational. Universal in `solo`, `team`, `mature`; not installed at `poc` (commit discipline is a `solo`-and-up concern, matching the rest of the artifact-producing layer per [ADR-0013](0013-project-maturity-profiles.md)). Description triggers on "commit", "stage and commit", "atomic commit", "Conventional Commit", "sign off", "DCO", "split this commit", "/agentic-commit".

2. **Four-phase body.**
   - **Phase 1 — Scope intake.** Read `git status` + `git diff` (staged and unstaged). Detect whether the working tree mixes concerns (different commit types: `feat:` + `fix:` + `docs:`; or unrelated subsystems). If single-concern, proceed. If multi-concern, surface a numbered list of detected concerns and ask the user to confirm a stage-split plan (one commit per concern). Never silently bundle unrelated changes.
   - **Phase 2 — Stage-split (when needed).** Interactively walk concern-by-concern: stage the files (or hunks via `git add -p`) for the first concern, draft + write its commit, then move on. Each pass produces one atomic commit. Never use `git add -A` / `git add .` when concerns are mixed.
   - **Phase 3 — Draft message.** Apply Conventional Commits (v1.0.0) format: `type(scope?): subject` with type in `{feat, fix, chore, docs, refactor, test, build, ci, perf, style, revert}`. Subject ≤72 chars, imperative mood, no trailing period. Body explains *why* when non-obvious; reference the task / ADR / issue when one exists. No trailing summary of what the diff already shows.
   - **Phase 4 — Sign + write.** Resolve identity from `git config user.name` / `git config user.email` (fail loudly if either is unset — DCO requires real attribution). Append `Signed-off-by: <Name> <email>` trailer. No `Co-Authored-By` trailer (decision 1). No `--no-verify`. Write via `git commit -m "$(cat <<'EOF' ... EOF\n)"` HEREDOC pattern so the body is preserved verbatim. Pre-commit / pre-push hooks run; failures surface and the skill stops.

3. **Helper, not blocker.** When in genuine doubt about whether two changes are one concern or two, the skill presents the call to the user and proceeds with the user's judgment. Senior engineer keeps decision authority (decision 5).

4. **No primary file output.** The output is one or more atomic commits on the current branch. Commit messages embody the audit trail.

5. **Codex parity is symmetric.** Both Claude Code and Codex variants ship. Auto-trigger asymmetry per [ADR-0007](0007-workflow-operational-skills.md) applies — Codex variant invites manual invocation when auto-trigger does not fire.

## Consequences

**Positive.**
- Codifies the Conventional Commits + DCO standard the kit has documented but not operationalized.
- Atomic-commit discipline cleans `git log` / `git blame` and makes `git bisect` actually useful.
- Sign-off enables downstream consumers to assert DCO compliance without re-tooling.
- Stage-split phase makes "this PR has three concerns" impossible by construction — concerns split at commit time, not at review time.

**Negative / trade-offs.**
- **Extra ceremony at commit time.** Some flows (rapid spike iteration) prefer "WIP" commits over Conventional. Mitigated: `poc` profile excludes the skill; `solo` / `team` / `mature` users can still bypass by running raw `git commit` (the skill assists, does not lock).
- **No `Co-Authored-By` trailer means LLM authorship is no longer git-visible.** Mitigated: authorship intent is captured in the commit body when relevant ("Drafted by /agentic-commit; reviewed by human."), and the skill itself is the durable artifact of the assistance.
- **Sign-off requires real identity.** Anonymous / pseudonymous contributors will fail Phase 4. Mitigated: this is the DCO design intent, not a bug.

## Alternatives considered

- **Hard-refuse multi-concern diffs (decision 3 option c).** Rejected per user decision 5 ("ajudar, não travar"). A senior engineer occasionally has a legitimate mixed commit (mechanical rename + the test that follows from it); refusing it is paternalistic.
- **Both trailers, DCO + Co-Authored-By (decision 1 option a).** Rejected — user picked `Signed-off-by` only. Stacking trailers adds noise; the LLM authorship signal is not load-bearing.
- **Skip the skill, keep AGENTS.md as the only spec.** Rejected — documented-without-operationalization is the failure mode every workflow-operational skill exists to close. The kit's commit prose is followed inconsistently when there is no scaffold; this skill is that scaffold.
- **Universal across `poc` too.** Rejected — `poc` profile per [ADR-0013](0013-project-maturity-profiles.md) intentionally skips artifact-producing skills (bootstrap / spec / task / adr / architecture). Commit discipline belongs in the same maturity tier; a `poc` user with 200 lines of spike code does not need atomic commits.

## References

- [AGENTS.md](../../AGENTS.md) — "Commit & PR Conventions" section, the canonical commit standard.
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) — the format this skill enforces.
- [Developer Certificate of Origin 1.1](https://developercertificate.org/) — the DCO that `Signed-off-by` attests to.
- [ADR-0007](0007-workflow-operational-skills.md) — workflow-operational skill category and the per-skill-ADR rule.
- [ADR-0013](0013-project-maturity-profiles.md) — profile catalog and the `solo` / `team` / `mature` install scope.
- [ADR-0024](0024-agentic-pr-skill.md) — `agentic-pr`, the downstream PR-open phase.
- [ADR-0025](0025-agentic-merge-skill.md) — `agentic-merge`, the downstream PR-evaluation-and-merge phase.
- [task-0025](../tasks/0025-agentic-commit-skill.md) — implementing task.
