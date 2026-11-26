---
name: ad-5s
description: 'Clean what a merged task left behind (worktree, branch, remote branch, temp files), or sweep a repo or path for leftovers. Use after a merge, or on "5S", "clean up", "tidy the repo".'
summary: Post-merge cleanup by default, plus an on-demand repo or path sweep. Proves each worktree, branch and temp path finished before removing it, re-checks before each deletion, records an undo per removal, asks what it cannot prove.
---

<background_information>
Leaves the repository as clean as the task found it. 5S is the workshop habit of sorting, setting in order and shining after the work, not once a quarter. Here it means: after a pull request merges, its worktree, its local and remote branch and the temp files the session made go away; on demand, the same checks sweep the whole repository or one path.

## Rationale

Leftovers pile up fast: dozens of stale worktrees, hundreds of merged branches, gigabytes of build output in worktrees nobody opens again. Most of it was safe to remove; some of it was the only copy of unpushed work, a file another session was editing, or a `.env` nobody else had. Cleanup that guesses deletes real work; cleanup that never runs leaves the pile. This skill proves finished before it removes anything (ADR-0101):

- **Merged is proved, never guessed.** A branch is finished when its tip is the exact head of a merged pull request, or reachable from origin's default branch. A squash merge leaves no git-only trace (`git branch -d`, `--merged` and `git cherry` all miss it), so the proof is the pull request record. With no GitHub answer, a squash case is a question, not a deletion.
- **The proof guards the work; git guards the worktree.** `git branch -D` deletes an unmerged branch too, so what protects unmerged work is the script's proof, and its `delete-branch` re-checks that the branch still points at the proved commit right before deleting it. A remote branch is deleted with a lease: the push fails if it moved since it was classified. `git worktree remove` refuses a worktree with modified, untracked or locked state. The skill never adds `--force`, and a refusal stops that item.
- **Clean up only your own mess** (`ad-philosophy`). After a merge, only that pull request's worktree, branches and the temp paths this session made are in scope. A sweep looks wider, but everything it cannot prove is the owner's call.
- **Every removal can be undone.** Each one is recorded with the commit it pointed at and the command that restores it.
  </background_information>

<instructions>
## Step 0 - Scope

Two modes:

- **After a merge (default).** `ad-merge` ends by running this for the pull request it merged, unless the owner said in this session not to clean up. Deleting a branch, local or on origin, cannot be undone from a receipt alone once git collects the commit, and a remote deletion leaves the machine, so it needs approval (ADR-0085): show the slate once and ask, recommending yes for the CANDIDATEs, together with the ASK items. When the repository's binding docs record a standing approval for this cleanup, that is the approval for the CANDIDATEs and only the ASK items are asked. Also runs on `ad-5s <PR number>`: an argument of digits only (or `#` and digits) is a pull request number; anything else is a path.
- **Sweep.** `ad-5s` with no pull request, or `ad-5s <path>`, looks at every worktree, branch, remote branch and untracked file in the repository, or only those under the path. It always shows the slate first and removes only what the owner picks.

Not for:

- Finished task, spec or ADR files: `ad-archive`.
- Processes, scheduled tasks, tool caches and anything outside the repository and the OS temp directory: report what you saw; this skill does not touch them.

## Step 1 - Refresh, from the right place

Run from the main worktree, never from inside the worktree about to go: the first `worktree` line of `git worktree list --porcelain` is its path. Change directory there (do not switch its branch; other sessions may share it) and call the script by its absolute path in this skill's base directory, since a worktree about to go may be where the skill loaded from. Then refresh what the proofs read:

```bash
git fetch origin --prune
```

Plain `--prune`, never `--prune-tags`. If the fetch fails (offline, no auth), say so: the proofs then read a stale remote, and the script's remote items are not to be acted on.

## Step 2 - Classify

The checks are a bundled script (ADR-0057); execute it, do not re-derive its rules:

```bash
node <base>/scripts/sweep.mjs after-merge --pr <n> [--branch <head>] [--temp <path>]...
node <base>/scripts/sweep.mjs sweep [--path <dir>] [--temp <path>]...
```

`<base>` is this skill's base directory, as an absolute path (`.agents/skills/ad-5s` in a project install). It must not lie inside a worktree about to be removed: the commands the script prints call it again later, so use the main worktree's copy or the user-level one. When the repository's binding docs name an approved GitHub CLI wrapper, set `AGENTIC_GH=<wrapper>` as `ad-pr` does. Pass `--branch` with the merged head branch when you know it: if GitHub cannot be asked, the script needs it and exits with an error otherwise, rather than reporting an empty slate.

`--temp` names each temp file or directory this session created and can point to: a scratch directory, a log the task wrote, a throwaway clone. Name only paths you made; never search the disk for candidates. The script keeps a path that git tracks, that is a link or junction, or that lies outside the repository and the OS temp directory, and asks about a directory holding a git repository.

The JSON carries `defaultBranch`, `github` (`ok`, and `error` when GitHub could not be asked) and `items`, already in the order to act on: worktrees, local branches, remote branches, stale worktree records, untracked files, ignored files, temp paths. Each item has `kind`, `target`, `verdict` and `reason`, and `in` when the file lies in a worktree other than the current one; a CANDIDATE, and an ASK the owner may approve, adds `command` and `undo` (argv arrays), `sha` where a commit is involved, and `after` when it must wait for a worktree removal. A local branch's command is the script's own `delete-branch <name> <sha>`; a remote branch's is a push with `--force-with-lease=refs/heads/<name>:<sha>`, which deletes it only while it is still at that commit. What the verdicts mean:

- **CANDIDATE**: every check passed. For a worktree: not the main one, not the current directory, not locked, no modified or untracked file, its branch proved finished, and (in a sweep) untouched for 24 h, since another session may be in it. For a branch: proved finished, not protected (`main`, `master`, `develop`, `dev`, `trunk`, `staging`, `production`, `prod`, `gh-pages`, `release/*`, the default branch), no open pull request on it or targeting it, and (in a sweep) not moved in 24 h. A remote branch also needs a merged pull request as its proof, a GitHub answer, and to be unmoved on origin since the fetch.
- **ASK**: not provable either way. Typical: no merged pull request and not in the default branch, a squash merge with GitHub unreachable, a branch at the default branch's tip with no commits of its own (it may be new work), a remote branch proved only by ancestry (it may be shared), a worktree or branch touched recently, a gitignored file a build does not regenerate (names only), an untracked file.
- **KEEP**: a check refused, and `reason` says which: a newer local commit, an open pull request, a dirty or locked worktree, a tracked path.

## Step 3 - Show the slate

One block per kind, one line per item, with its verdict and reason, and `(none)` for an empty kind. For a CANDIDATE, show the undo command too. Do not open an ignored file to judge it, and never print a secret's content: a `.env` is listed by name only.

## Step 4 - Act

**After a merge:** once approved (Step 0), run each CANDIDATE's `command`, one at a time, in the order given. For a temp path the command is the script's own `remove-temp`, which re-checks the path before deleting it.

**Sweep:** ask which items to remove, recommending the CANDIDATEs, then run only those.

For both modes:

- Run a `command` as its argv: each element one argument, quoted for the shell, nothing joined or re-split. A `delete-branch` or `remove-temp` that answers `"removed": false` stops that item: report its `reason` (the branch moved, the path changed) and move on.

- After each removal succeeds, record it:

  ```bash
  node <base>/scripts/sweep.mjs record --kind <kind> --target <target> --sha <sha> --proof "<reason>" --undo "<undo command>"
  ```

  This appends a line to `.agentic/receipts/5s.jsonl` in the main worktree. When the repository's `AGENTS.md` names another place for cleanup receipts, write the receipt there as well.

- A command that fails stops that item: report git's message verbatim and move on. Never retry with `--force`, `-f -f`, or a different command that gets around the refusal.
- An ASK item is asked once, all together, with a recommendation each; one the owner approves runs its own `command`, never one you write. For a worktree with unique ignored files, the options are: copy them out first, remove them with the worktree, or keep the worktree. Unpushed work is never removed; the owner can bundle it (`git bundle create`, then `git bundle verify`) if they want it gone.
- After the last removal: `git worktree prune` when a worktree record went stale.

Never, in either mode: `git clean -x`, `-X` or `-fd` as a way to clean (it cannot tell the task's files from the owner's), deleting by name pattern, a disk-wide search, killing a process by name, or touching a worktree another session holds.

## Step 5 - Report

Say what was removed, each with its undo command, then what stayed and why, in the order of the slate. Undo runs in reverse order: a branch is restored before the worktree that held it. A rerun with nothing left prints `Nothing left to clean.` and stops. If the fetch failed or GitHub could not be asked, say which proofs that weakened.

## Output contract

Removes only items the script classified as CANDIDATE, or ASK items the owner chose, each through plain git or the script's `delete-branch` and `remove-temp`, never with `--force` (a remote branch goes only through its lease). Each removal gets one receipt line with its sha and undo. Never commits, never pushes anything but a remote branch deletion, and never changes the main worktree's branch.

## Next

- `ad-next` to pick the next task now that the tree is clean.
- A removal to undo: run the `undo` command from its receipt line.
- Many ASK items in a sweep, all with the same cause: a project rule may settle them. Record it with `ad-rules`.
</instructions>
