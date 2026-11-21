````markdown
# Handoff (automatic) — <repo path> — <branch> — <ISO date>

## Resume protocol

Before any work: read this file whole; read the global and repository instructions and every artifact named here; check the live state (branch, working tree, running jobs) against this file and trust the live state where they differ; then continue with `First action`, with no recap and no question this file already answers.

## Objective

<the request being served, in the owner's own words, and what done means>

## Roadmap

- [x] <landed item> — <the artifact that proves it>
- [ ] <open item> — <what blocks it>

## Asks that never landed

- <the owner's request, in their words> — <not started | stopped at X | dropped because Y>

(Write "none" when there are none.)

## Running

- <subagent, background job, server, worktree or lock> — <its state, and whether the clear orphans it>

(Write "none" when nothing runs.)

## Decisions and approvals

- <what the owner decided or approved, in their words> — <date> — <what it covers>
- <what still waits for the owner>

## Evidence

- <grounding, test, review or gate already done> — <its path, command or link>

## First action

<one imperative sentence>

<!-- ad-handoff:end -->
````
