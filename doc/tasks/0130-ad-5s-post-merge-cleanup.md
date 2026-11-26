# Task `0130`: `ad-5s` — clean what a merged task left behind, and sweep on demand

**Status:** in-progress
**Created:** 2026-11-25
**Scope ref:** doc/adr/0101-clean-up-after-a-merge-by-default.md
**Evidence ref:** doc/research/0049-ground-post-merge-cleanup.md
**Owner:** Alexandre Alvaro
**Execution:** HITL
**Spec ref:**
**Board ref:**

## Context

After `/ad-merge`, worktrees, squash-merged branches and temp files stayed behind; `ad-handoff`'s hygiene only reports them. The owner asked for cleanup at the end of every flow by default and for an on-demand sweep of the repository or a path, researched for the safest method.

## Acceptance Criteria

- [x] `sweep.mjs after-merge --pr <n>` proves a squash-merged pull request's worktree, branch and remote branch finished and orders them; a newer local commit, a dirty, locked or current worktree, an open pull request and an unreachable GitHub each keep or ask.
- [x] `sweep.mjs sweep [--path]` proves by ancestry or a merged pull request, asks for the rest, never lists the default branch, asks about recently touched worktrees and untracked files.
- [x] Temp paths: only session-named, untracked, inside the repository or the OS temp directory, not a link, not a repository; `remove-temp` re-checks before deleting; `record` writes a receipt line.
- [x] Byte-identical script on both hosts; skill on both hosts; `/ad-merge` Phase 5 runs it by default; `ad-handoff` points to it; guide row.
- [x] Fresh-context review (two reviewers; findings fixed), local gate, local commit.
- [ ] PR with the owner's OK.

## Plan

- [x] Ground (GROUND-0049).
- [x] TDD the classifier (`test/five-s.test.js`).
- [x] Skill, wiring, ADR-0101, CHANGELOG.
- [ ] Review, gate, PR.
