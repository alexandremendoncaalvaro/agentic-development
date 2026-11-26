# ADR-0101: Clean up after a merge by default, removing only what is proved finished

**Status:** accepted
**Date:** 2026-11-25
**Deciders:** Alexandre Alvaro
**Related:** ADR-0085 (effect gates: an irreversible effect runs after an approval step or the owner's explicit request), ADR-0057 (deterministic steps as bundled scripts), GROUND-0049 (evidence)

## Context

The flow ended at `/ad-merge`, whose `gh pr merge --delete-branch` deletes the local and remote branch but leaves the worktree, the temp files and any branch a worktree holds. `ad-handoff`'s repo hygiene deletes only branches `git branch -d` accepts and reports the rest, so squash-merged branches and finished worktrees piled up. The owner asked for cleanup at the end of every flow unless they say otherwise, and for an on-demand sweep of the repository or a path, done the safest way the evidence supports (GROUND-0049).

## Decision

1. **A skill, `ad-5s`, cleans up; `/ad-merge` Phase 5 runs it by default** for the merged pull request, unless the owner said in the session not to. It also runs on demand as a sweep of the repository or one path.
2. **A bundled script proves each item before anything is removed.** `scripts/sweep.mjs` classifies worktrees, local branches, remote branches, stale worktree records, untracked files and session-named temp paths as CANDIDATE, ASK or KEEP, with a reason, and gives each CANDIDATE its command and undo command. A branch is finished when its tip is the exact head of a merged, same-repository pull request, or behind it with at least one of its commits, or reachable from origin's default branch with commits of its own (a branch sitting at the default branch's tip may be new work and is ASK), and no open pull request is on it or targets it. Without a full GitHub answer nothing is a CANDIDATE, since an open pull request may be on it; a GitHub list as long as the request's limit may be cut short, so it proves nothing. A branch behind the merged head whose fork point cannot be computed is ASK. A remote branch also needs a merged pull request as its proof, a GitHub answer, and to be unmoved on origin since the fetch; one proved only by ancestry is ASK, since it may be shared. Protected names (`main`, `master`, `develop`, `dev`, `trunk`, `staging`, `production`, `prod`, `gh-pages`, `release/*`, the default branch) are never listed. Gitignored files a build does not regenerate are listed by name as ASK. A worktree is a CANDIDATE only when its branch is, it is not the main worktree, the current directory or locked, it has no modified or untracked file, and its gitignored files are build output; a sweep also requires it untouched for 24 h.
3. **The after-merge run asks once, with the slate, before deleting** (ADR-0085): deleting a branch is irreversible once git collects the commit, and a remote deletion leaves the machine. The recommended answer is yes for the CANDIDATEs, and the ASK items are asked in the same question. A kit consumer never made the request that started this work, so the request cannot be its approval; a repository whose binding docs record a standing approval for this cleanup skips the question for the CANDIDATEs. A sweep always shows the slate and removes only what the owner picks.
4. **Removal never forces, and re-checks right before it deletes.** Plain `git worktree remove`; then the script's `delete-branch`, which deletes the local branch with `git branch -D` only while it still points at the proved commit; then `git push --force-with-lease=refs/heads/<name>:<sha> origin :refs/heads/<name>`, which deletes the remote branch only while it is still at that commit. A temp path goes through the script's `remove-temp`, which re-checks it. A refused command stops that item. `git clean -x/-X/-fd`, name-pattern deletion, disk-wide searches and process kills are out of scope.
5. **Every removal is recorded** in `.agentic/receipts/5s.jsonl` under the main worktree, with its sha, proof and undo command, and also where the repository's `AGENTS.md` asks for cleanup receipts.

## Consequences

- A merged task leaves no worktree, branch or session temp file behind, squash merges included, after one question (or none, under a recorded standing approval).
- With no GitHub answer, a squash-merged branch is ASK, not deleted; with a failed fetch the skill says the remote proofs are stale.
- A deleted branch can be restored from its receipt while git keeps the commit; a deleted temp path cannot, which is why only session-named paths inside the repository or the OS temp directory qualify.
- Temp discovery is limited to the paths the session names and git's own untracked and ignored listing: no disk search.
- `ad-handoff` keeps its report-only hygiene and points to `ad-5s` for the removals.
- The checks guide the agent; they do not sandbox it (ADR-0085's consequence stands).

## Alternatives Considered

- **A hook that cleans after a merge.** Rejected: a hook cannot ask, and an ASK item needs the owner.
- **Delete squash-merged branches by heuristic (patch comparison, same name on the remote).** Rejected: git cannot tell them from unmerged work (GROUND-0049 E3); the pull request record can.
- **`git clean` as the sweep.** Rejected: it cannot tell a task's scratch file from the owner's `.env` (GROUND-0049 E5).
- **No question after a merge, the owner's request being the approval.** Rejected: the request was one owner's, and the public kit's consumers made none (ADR-0085).
- **Ask before every removal, one by one.** Rejected: one question over the whole slate is enough, and the proofs make each removal safe and recorded.
- **Require the pull request to have merged into the default branch.** Rejected: GitHub's own `--delete-branch` deletes the head after a merge into any base, and a branch whose exact head merged has nothing newer either way.
