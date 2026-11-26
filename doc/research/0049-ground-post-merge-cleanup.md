# GROUND-0049: Clean what a merged task left behind, removing only what is proved finished

**Status:** recorded
**Decision:** A new skill, `ad-5s`, runs by default at the end of `/ad-merge` and on demand as a sweep. A bundled script classifies each worktree, local branch, remote branch, untracked file and session-named temp path as CANDIDATE, ASK or KEEP. A branch is finished only when its tip is the exact head of a merged pull request (or behind it) or reachable from origin's default branch. Removal uses plain `git worktree remove`, the script's `delete-branch` (it re-checks the proved sha, then `git branch -D`), and a push with `--force-with-lease=refs/heads/<name>:<sha>` for a remote branch, which needs a merged pull request as proof; no `--force`. The after-merge run asks once before deleting, unless the repository records a standing approval (ADR-0085). Each removal is recorded with its sha and undo command.
**Decision ref:** doc/adr/0101-clean-up-after-a-merge-by-default.md
**Confidence:** Conditional
**Stakes:** high × irreversible

## Decision and confidence

The owner asked for cleanup as part of every flow, unless they say otherwise, after researching the safest way (E1). Git's own refusals already guard the worst cases: a dirty, untracked or locked worktree is not removed without `--force`, and a branch a worktree holds is not deleted (E2). The open problem is proving a squash merge: git alone cannot, and the pull request record can (E3). The owner's own manual cleanups give the checklist and the traps: unpushed work, live sessions, unique ignored files and name-pattern deletions (E4). Conditional: the proof depends on GitHub answering and on a fresh fetch, so with no answer a squash case becomes a question, and the script's checks are advice to the agent, not a sandbox (ADR-0085).

## Evidence

### E1 — The owner wants cleanup in every flow by default, researched, not assumed

**Tier:** Primary
**Strength:** design choice
**Provenance:** C1

The request: after a task's pull request is merged, clean the worktree, temp files and every leftover, and delete the merged branch; run it at the end of every flow unless the owner says otherwise; also run it on its own over the whole repository or a named path; research the safest way first.

### E2 — Git refuses the dangerous removals by itself

**Tier:** Primary
**Strength:** High
**Provenance:** A1, A2, D1
**Upgrade:** the documented behaviour was reproduced by measurement in a scratch repository (D1), two independent sources agreeing

`git worktree remove` removes only clean worktrees (no untracked files, no modified tracked files); an unclean or locked one needs `--force`, a locked one twice; the main worktree cannot be removed (A1). `git branch -d` requires the branch to be merged into its upstream or HEAD, and `-D` deletes regardless (A2). Measured in a scratch repository: a worktree with an untracked file exits 128, a locked worktree exits 128, a clean one exits 0; `git branch -D` on a branch a worktree holds exits 1 ("used by worktree"). So the order is worktree, then branch, and no force flag is ever needed for a finished item.

### E3 — A squash merge is invisible to git; the pull request record proves it

**Tier:** Primary
**Strength:** High
**Provenance:** A2, A3, B1, D1, C2
**Upgrade:** the git side was measured (D1), and an independent tool relies on the same pull request proof (B1)

After `git merge --squash`, `git branch -d` refuses ("not fully merged"), `git branch --merged main` omits the branch and `git cherry main feat` marks every commit `+` (D1). The kit's own `ad-handoff` already records this as a tested limit (C2). `gh pr view --json state,headRefOid,headRefName,isCrossRepository` returns the merge state and the exact head that merged (A3). A local tip equal to that head, or behind it, has nothing newer than what merged. An existing tool, gh-poi, proves squash merges the same way, through the pull request rather than git ancestry (B1).

### E4 — The owner's manual cleanups give the checklist and the traps

**Tier:** Primary
**Strength:** Medium
**Provenance:** C3

Nine cleanup receipts over two weeks recorded the checks used before each removal: clean tree, nothing outside the remote, pull request merged at the exact head, not locked or held by a live session or job, idle for a day by `logs/HEAD` (not the index, which `git status` touches), plain `git worktree remove` with no force, a receipt with an undo command per removal. They also recorded what went wrong or was kept: most stale worktrees held unpushed commits, another session's worktree looked idle, a squash merge could not be proved and was kept, gitignored files that a build does not regenerate, a name filter that matched the wrong process.

### E5 — `git clean` cannot tell a task's files from the owner's

**Tier:** Primary
**Strength:** High
**Provenance:** A4
**Upgrade:** the claim restates git's own documentation of its own flags; no indirection between source and claim

Without `-x`, ignored files are kept; `-x` removes all untracked files including build products, `-X` only ignored files (A4). Either way it cannot tell a session's scratch file from a local `.env` or config. So the sweep never uses it: temp paths are the ones the session names, and untracked files are asked about.

## Source register

- **A1:** git-worktree documentation, https://git-scm.com/docs/git-worktree (accessed 2026-11-25 via WebFetch subagent)
- **A2:** git-branch documentation, https://git-scm.com/docs/git-branch (accessed 2026-11-25 via WebFetch subagent)
- **A3:** GitHub CLI `gh pr view` and `gh pr merge` manual, https://cli.github.com/manual/gh_pr_view and https://cli.github.com/manual/gh_pr_merge (accessed 2026-11-25 via WebFetch subagent)
- **A4:** git-clean documentation, https://git-scm.com/docs/git-clean (accessed 2026-11-25 via WebFetch subagent)
- **B1:** gh-poi, a GitHub CLI extension that deletes merged local branches, matching squash merges through the pull request record rather than git ancestry and skipping a branch in a dirty or active worktree, https://github.com/seachicken/gh-poi (accessed 2026-11-25 via WebFetch subagent)
- **C1:** the owner's request in the session that started this work (accessed 2026-11-25 via session context)
- **C2:** `src/skills/claude-code/ad-handoff/SKILL.md`, "Repo hygiene" and its known squash-merge limit (accessed 2026-11-25 via Bash grep)
- **C3:** the owner's cleanup receipts in a private repository, 2026-11-11 to 2026-11-24, nine files (accessed 2026-11-25 via Read, summarized; not public)
- **D1:** scratch repository measurements of `worktree remove`, `branch -d/-D`, `--merged` and `cherry` after a squash merge (accessed 2026-11-25 via Bash git)

## Limitations and reversal

The checks run as a script the agent is told to obey; nothing stops an agent that ignores it (ADR-0085). A stale fetch or a GitHub outage weakens the proofs: a stale remote can make a remote item look finished, so the skill says when the fetch failed. A removed branch is restored from its receipt (`git branch <name> <sha>`) only while git still holds the commit; a deleted temp path is gone. Reverse by removing `/ad-merge`'s Phase 5 and the skill.

## Audit path

Run `node .claude/skills/ad-ground/scripts/validate-record.mjs doc/research/0049-ground-post-merge-cleanup.md`, then rerun `test/five-s.test.js`, which rebuilds each measured case (squash merge, dirty, locked, held branch, newer commit, open pull request, no GitHub) in a temporary repository.
