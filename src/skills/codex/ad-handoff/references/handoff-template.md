````markdown
# Handoff — <slug> — <ISO date>

**Repo:** <repo path>
**Branch:** <current branch>
**Started from:** <PR # / task # / spec # if known, else "ad-hoc work">

## Resume protocol

Before doing any work, complete a private preparation pass within a resume budget: this turn adds at most about 10,000 tokens of tool output and reading to the context the host loads at startup. The handoff is the progress file; the session's working space is spent on the next move, not on re-reading the last session.

1. Read this handoff end to end, including `Working rules`, `Roadmap`, unresolved decisions, unlanded asks, errors, and the recommended next move. It is the only file read in full.
2. Apply the global and repository instructions already in context. References are pointers, loaded just in time: read a referenced task, spec, ADR, or research record only when the first move needs it, and then only the section it needs, bounded (`head -n 60`, a line range, or a search).
3. Apply all eight `ad-philosophy` behaviors privately. Select and follow every method skill the work requires; do not claim grounding, reproduction, testing, or review happened unless its evidence exists.
4. Reconcile the live state with two bounded inline probes only: `git status --short | head -n 20` and `git log --oneline -5`. Every other reconciliation (pull request or CI status, logs, other sessions, transcripts, directory listings, recent verification) goes to one subagent on the cheapest capable model, which returns a digest of at most 15 lines: what still matches the handoff, what changed, and what blocks the next move. Where the host has no subagent, run the same checks with the same bounds and keep only the digest, within the same 10,000-token budget; drop the checks that do not fit and name them under `Your attention`.

Every inline output is bounded: pipe commands through `head -n 20` or `tail -n 20`, cut long lines (`cut -c1-200`), and never print a whole log, transcript, or diff. Do not load deferred tool schemas, or a skill the next move does not use, during this pass.

Do not narrate that pass. Do not print the full applied-binding statement, rule excerpts, raw file inventory, or command log. If a rule changes the inherited plan, a source is unreadable, a prerequisite is unmet, or the subagent's digest contradicts the handoff, surface that consequence under `Your attention` instead of hiding it.

Then build a settled resume fact packet from the reconciled handoff state and pass it to `ad-brief`. Print only the following, in the user's language. Keep it to one screen and prefer a second plain sentence over compressed jargon:

### Preparation

- [x] **Rules:** <compact names of the global, repository, and handoff rule sources actually applied>
- [x] **Context:** <handoff plus any referenced section the first move needed>
- [x] **State:** <bounded probes and the subagent digest reconciled with the handoff>
- [x] **Method:** <applicable skills and grounding/testing/review status; use "not required" or "pending" honestly>

Use `[ ]` instead of `[x]` for anything not verified. Never turn an assumption into a checked box.

At resume time, print the decision-maker brief returned by `ad-brief` for the settled resume fact packet here.

After printing the returned brief, continue immediately with <one imperative sentence naming the concrete next move>, unless its `Your attention` field contains a decision that genuinely blocks it.

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
