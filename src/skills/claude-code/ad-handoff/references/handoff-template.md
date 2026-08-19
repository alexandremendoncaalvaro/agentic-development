````markdown
# Handoff — <slug> — <ISO date>

**Repo:** <repo path>
**Branch:** <current branch>
**Started from:** <PR # / task # / spec # if known, else "ad-hoc work">

## Resume protocol

Before doing any work, complete a private preparation pass:

1. Read this handoff end to end, including `Working rules`, `Roadmap`, unresolved decisions, unlanded asks, errors, and the recommended next move.
2. Read and apply the global and repository instructions plus every task, spec, ADR, research record, or other artifact referenced by this handoff. References are reading obligations, not decoration.
3. Apply all eight `ad-philosophy` behaviors privately. Select and follow every method skill the work requires; do not claim grounding, reproduction, testing, or review happened unless its evidence exists.
4. Reconcile the handoff with the live branch, working tree, diff, and recent verification so stale claims cannot silently direct the session.

Do not narrate that pass. Do not print the full applied-binding statement, rule excerpts, raw file inventory, or command log. If a rule changes the inherited plan, a source is unreadable, or a prerequisite is unmet, surface that consequence under `Your attention` instead of hiding it.

Then print only the following, in the user's language. Keep it to one screen and prefer a second plain sentence over compressed jargon:

### Preparation

- [x] **Rules:** <compact names of the global, repository, and handoff rule sources actually applied>
- [x] **Context:** <handoff plus the task/spec/ADR/research artifacts actually read>
- [x] **State:** <live branch, diff, errors, and verification reconciled>
- [x] **Method:** <applicable skills and grounding/testing/review status; use "not required" or "pending" honestly>

Use `[ ]` instead of `[x]` for anything not verified. Never turn an assumption into a checked box.

### Brief

- **Final objective:** <the end outcome and why it matters, in product or business terms>
- **Roadmap:** <Done — the meaningful progress; Now — the current phase; Next — the remaining arc. Summarize the whole front in at most three short lines, not the full checklist.>
- **This session:** <what you are doing now and why this is the right next move>
- **Done when:** <the governing acceptance criteria, definition of done, or scope boundary translated into one plain outcome>
- **Your attention:** <"None now" when no judgment call remains, otherwise one decision with the recommendation first, only viable competing options, and value-level trade-offs>

Do not manufacture a decision to make the brief look complete. Exclude dominated options; if grounding leaves one clear winner, choose it and report `None now`. After printing the brief, continue immediately with <one imperative sentence naming the concrete next move>, unless `Your attention` contains a decision that genuinely blocks it.

## Working rules

<Working rules — restated verbatim in the handoff; the skill keeps this block inline (a deliberate ephemeral-artifact restatement, not a reference). Copy the skill's "Working rules" block here unchanged.>

## Roadmap

- [x] <landed item> — <the artifact that proves it>
- [ ] <open item> — <blocking condition, owner>

**Priority alignment:** <how this order reflects the user's stated priorities and any course correction they made, or "no correction stated this session">

## State

- **Working tree:** <git status one-line summary>
- **Divergence:** <commits ahead/behind upstream, or "no remote tracked">
- **In-progress diff:** <line count + file count, or inline if small>

## Repo hygiene

- **Deleted (merged, safe):** <name>, <name> — removed with `git branch -d`; commits live on <default> and in the reflog. (or "none")
- **Left for you:** <name> (<unmerged | squash-merged — git cannot distinguish>) — `git branch -D <name>` (or "none")
- **Worktrees:** <path> — `git worktree remove <path>` (or "one, clean")
- **Stray files at root:** <path> — <gitignore it, or move it out> (or "none")

## Open artifacts

- Task: `doc/tasks/NNNN-<slug>.md` — <one-line status>
- Spec: `doc/specs/NNNN-<slug>.md` — <one-line status>
- ADR (drafting): `doc/adr/NNNN-<slug>.md` — <one-line status>
- Touched but uncommitted: <list of paths>

(Omit any subsection that does not apply. Do not invent references.)

## Unresolved decisions

- <question> — recommended: <answer>
- <question from user> — not yet answered

## Asks that never landed

- <the user's request, in their framing> — <not started | stopped at X | dropped deliberately because Y>

(Write "none" when the sweep is genuinely empty.)

## Recent errors

<verbatim last error + command, or "none">

## Suggested skills for the next session

- `/ad-<skill>` — <why this is the natural next move>
- `/ad-<skill>` — <why>

## Notes

<anything that doesn't fit above — keep tight, one paragraph max>
````
