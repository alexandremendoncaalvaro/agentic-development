````markdown
# Handoff — <slug> — <ISO date>

**Repo:** <repo path>
**Branch:** <current branch>
**Started from:** <PR # / task # / spec # if known, else "ad-hoc work">

## First action

Invoke `ad-philosophy` explicitly, then <one imperative sentence naming the concrete next move>. Per ADR-0044 the explicit invocation forces an applied-binding statement — each of `ad-philosophy`'s behaviors named against this task's files and commands before work starts. A fresh agent inheriting a mid-flight session is exactly where posture is assumed and then quietly dropped. This instruction stands in for the user's: treat it as an explicit invocation and produce the applied-binding statement, not as the auto-load path that skips it.

It binds posture, not method — grounding, hypothesis discipline, test-first discipline and fresh-context review live in their own skills and are not carried by that statement. The next section states them outright.

## Working rules

<Working rules — restated verbatim in the handoff; the skill keeps this block inline (a deliberate ephemeral-artifact restatement, not a reference). Copy the skill's "Working rules" block here unchanged.>

## Roadmap

- [x] <landed item> — <the artifact that proves it>
- [ ] <open item> — <blocking condition, owner>

**Priority alignment:** <how this order reflects the user's stated priorities and any course correction, or "no correction stated this session">

## State

- **Working tree:** <git status one-line summary>
- **Divergence:** <commits ahead/behind upstream, or "no remote tracked">
- **In-progress diff:** <line count + file count, or inline if small>

## Open artifacts

- Task: `doc/tasks/NNNN-<slug>.md` — <one-line status>
- Spec: `doc/specs/NNNN-<slug>.md` — <one-line status>
- ADR (drafting): `doc/adr/NNNN-<slug>.md` — <one-line status>
- Touched but uncommitted: <list of paths>

(Omit any subsection that does not apply. Do not invent references.)

## Unresolved decisions

- <question> — recommended: <answer>
- <question from user> — not yet answered

## Repo hygiene

- Deleted (merged, safe): <name>, <name> — removed with `git branch -d`; commits live on <default> and in the reflog. (or "none")
- Left for you: <name> (<unmerged | squash-merged — git cannot distinguish>) — `git branch -D <name>` (or "none")
- Worktrees: <path> — `git worktree remove <path>` (or "one, clean")
- Stray files at root: <path> — <gitignore it, or move it out> (or "none")

## Asks that never landed

- <the user's request, in their framing> — <not started | stopped at X | dropped deliberately because Y>

(Write "none" when the sweep is genuinely empty.)

## Recent errors

<verbatim last error + command, or "none">

## Suggested skills for the next session

- `ad-<skill>` — <why this is the natural next move>
- `ad-<skill>` — <why>

## Notes

<anything that doesn't fit above — keep tight, one paragraph max>
````
